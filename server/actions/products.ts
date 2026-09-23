'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { toDbNumeric } from '@/lib/money'
import { slugify } from '@/lib/slug'
import { createClient } from '@/lib/supabase/server'

const PRODUCT_IMAGES_BUCKET = 'product-images'

const attributesSchema = z.record(z.string().min(1), z.string().min(1))

const variantInputSchema = z.object({
  id: z.uuid().optional(),
  sku: z.string().trim().max(80).nullish(),
  attributes: attributesSchema,
  cost_price: z.union([z.string(), z.number()]),
  sale_price: z.union([z.string(), z.number()]),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  /** Only used for brand new variants: opens the stock ledger. */
  initial_stock: z.number().int().min(0).default(0),
})

const productInputSchema = z.object({
  name: z.string().trim().min(1, 'Барааны нэрээ оруулна уу'),
  slug: z.string().trim().min(1, 'Slug хоосон байна'),
  description: z.string().trim().nullish(),
  brand_id: z.uuid().nullish(),
  category_id: z.uuid().nullish(),
  option_types: z.array(z.string().trim().min(1)).max(1).default([]),
  status: z.enum(['active', 'archived']).default('active'),
  is_featured: z.boolean().default(false),
  variants: z.array(variantInputSchema).min(1, 'Хамгийн багадаа нэг хувилбар шаардлагатай'),
})

type VariantInput = z.infer<typeof variantInputSchema>

const imageInputSchema = z.object({
  storage_path: z.string().min(1),
  is_primary: z.boolean().default(false),
  is_transparent: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
})

function attributeKey(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('|')
}

/** Two variants of the same product may never carry the same attributes. */
function findDuplicateAttributes(variants: VariantInput[]): string | null {
  const seen = new Set<string>()
  for (const variant of variants) {
    const key = attributeKey(variant.attributes)
    if (seen.has(key)) {
      return key === '' ? 'Хувилбаргүй бараанд ганц мөр байна.' : `«${key}» хувилбар давхардаж байна.`
    }
    seen.add(key)
  }
  return null
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Мэдээлэл буруу байна'
}

function variantRow(productId: string, variant: VariantInput) {
  return {
    product_id: productId,
    sku: variant.sku?.trim() ? variant.sku.trim() : null,
    attributes: variant.attributes,
    cost_price: toDbNumeric(variant.cost_price),
    sale_price: toDbNumeric(variant.sale_price),
    is_active: variant.is_active,
    sort_order: variant.sort_order,
  }
}

export async function createProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = productInputSchema.safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const duplicate = findDuplicateAttributes(parsed.data.variants)
  if (duplicate) return actionError(duplicate)

  const supabase = await createClient()

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      brand_id: parsed.data.brand_id ?? null,
      category_id: parsed.data.category_id ?? null,
      option_types: parsed.data.option_types,
      status: parsed.data.status,
      is_featured: parsed.data.is_featured,
    })
    .select('id')
    .single()

  if (productError || !product) {
    return actionError(friendlyDbError(productError ?? { message: 'Бараа үүсгэж чадсангүй' }))
  }

  const productId: string = product.id

  const { data: variants, error: variantError } = await supabase
    .from('product_variants')
    .insert(parsed.data.variants.map((variant) => variantRow(productId, variant)))
    .select('id, attributes, cost_price')

  if (variantError || !variants) {
    // No cross table transaction over PostgREST: undo the orphan product.
    await supabase.from('products').delete().eq('id', productId)
    return actionError(friendlyDbError(variantError ?? { message: 'Хувилбар үүсгэж чадсангүй' }))
  }

  await insertOpeningStock(supabase, parsed.data.variants, variants, user.id)

  revalidatePath('/admin/products')
  return { ok: true, data: { id: productId } }
}

export async function updateProduct(
  productId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireUser()

  const idCheck = z.uuid().safeParse(productId)
  if (!idCheck.success) return actionError('Барааны ID буруу байна')

  const parsed = productInputSchema.safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const duplicate = findDuplicateAttributes(parsed.data.variants)
  if (duplicate) return actionError(duplicate)

  const supabase = await createClient()

  const { error: productError } = await supabase
    .from('products')
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      brand_id: parsed.data.brand_id ?? null,
      category_id: parsed.data.category_id ?? null,
      option_types: parsed.data.option_types,
      status: parsed.data.status,
      is_featured: parsed.data.is_featured,
    })
    .eq('id', productId)

  if (productError) return actionError(friendlyDbError(productError))

  const variantResult = await upsertVariants(productId, parsed.data.variants)
  if (!variantResult.ok) return variantResult

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}`)
  return { ok: true, data: { id: productId } }
}

export async function upsertVariants(
  productId: string,
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  const user = await requireUser()

  const idCheck = z.uuid().safeParse(productId)
  if (!idCheck.success) return actionError('Барааны ID буруу байна')

  const parsed = z.array(variantInputSchema).min(1).safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const duplicate = findDuplicateAttributes(parsed.data)
  if (duplicate) return actionError(duplicate)

  const supabase = await createClient()

  const existing = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
    .is('deleted_at', null)

  if (existing.error) return actionError(friendlyDbError(existing.error))

  const keptIds = new Set(parsed.data.map((variant) => variant.id).filter(Boolean))
  const removedIds: string[] = (existing.data ?? [])
    .map((row: { id: string }) => row.id)
    .filter((id: string) => !keptIds.has(id))

  const toUpdate = parsed.data.filter((variant) => variant.id)
  const toCreate = parsed.data.filter((variant) => !variant.id)

  for (const variant of toUpdate) {
    const { error } = await supabase
      .from('product_variants')
      .update(variantRow(productId, variant))
      .eq('id', variant.id as string)
      .eq('product_id', productId)

    if (error) return actionError(friendlyDbError(error))
  }

  if (toCreate.length > 0) {
    const { data: created, error } = await supabase
      .from('product_variants')
      .insert(toCreate.map((variant) => variantRow(productId, variant)))
      .select('id, attributes, cost_price')

    if (error || !created) {
      return actionError(friendlyDbError(error ?? { message: 'Хувилбар нэмж чадсангүй' }))
    }

    await insertOpeningStock(supabase, toCreate, created, user.id)
  }

  // Variants dropped from the form: keep them if they were ever sold.
  for (const variantId of removedIds) {
    const removal = await retireVariant(supabase, variantId)
    if (!removal.ok) return removal
  }

  revalidatePath(`/admin/products/${productId}`)
  return { ok: true, data: { count: parsed.data.length } }
}

export async function deleteVariant(variantId: string): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(variantId)
  if (!idCheck.success) return actionError('Хувилбарын ID буруу байна')

  const supabase = await createClient()

  const { count, error: countError } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('variant_id', variantId)

  if (countError) return actionError(friendlyDbError(countError))

  if ((count ?? 0) > 0) {
    return actionError(
      'Энэ хувилбар захиалгад орсон тул устгах боломжгүй. Оронд нь идэвхгүй болгоно уу.',
    )
  }

  const { error } = await supabase
    .from('product_variants')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', variantId)

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/products')
  return { ok: true, data: undefined }
}

export async function archiveProduct(
  productId: string,
  archived: boolean,
): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(productId)
  if (!idCheck.success) return actionError('Барааны ID буруу байна')

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ status: archived ? 'archived' : 'active' })
    .eq('id', productId)

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/products')
  return { ok: true, data: undefined }
}

export async function duplicateProduct(
  productId: string,
): Promise<ActionResult<{ id: string }>> {
  await requireUser()

  const idCheck = z.uuid().safeParse(productId)
  if (!idCheck.success) return actionError('Барааны ID буруу байна')

  const supabase = await createClient()

  const { data: source, error: sourceError } = await supabase
    .from('products')
    .select(
      'name, slug, description, brand_id, category_id, option_types, status, variants:product_variants(sku, attributes, cost_price, sale_price, is_active, sort_order, deleted_at)',
    )
    .eq('id', productId)
    .single()

  if (sourceError || !source) {
    return actionError(friendlyDbError(sourceError ?? { message: 'Бараа олдсонгүй' }))
  }

  const name = `${source.name} (хуулбар)`
  const slug = await uniqueSlug(supabase, slugify(name) || `${source.slug}-copy`)

  const { data: copy, error: copyError } = await supabase
    .from('products')
    .insert({
      name,
      slug,
      description: source.description,
      brand_id: source.brand_id,
      category_id: source.category_id,
      option_types: source.option_types,
      status: 'active',
      is_featured: false,
    })
    .select('id')
    .single()

  if (copyError || !copy) {
    return actionError(friendlyDbError(copyError ?? { message: 'Хуулбар үүсгэж чадсангүй' }))
  }

  type SourceVariant = {
    sku: string | null
    attributes: Record<string, string>
    cost_price: string
    sale_price: string
    is_active: boolean
    sort_order: number
    deleted_at: string | null
  }

  const sourceVariants: SourceVariant[] = (source.variants ?? []).filter(
    (variant: SourceVariant) => variant.deleted_at === null,
  )

  if (sourceVariants.length > 0) {
    const { error: variantError } = await supabase.from('product_variants').insert(
      sourceVariants.map((variant, index) => ({
        product_id: copy.id,
        // SKU is unique across the table, so the copy gets its own suffix.
        sku: variant.sku ? `${variant.sku}-COPY${index + 1}` : null,
        attributes: variant.attributes,
        cost_price: variant.cost_price,
        sale_price: variant.sale_price,
        is_active: variant.is_active,
        sort_order: variant.sort_order,
      })),
    )

    if (variantError) {
      await supabase.from('products').delete().eq('id', copy.id)
      return actionError(friendlyDbError(variantError))
    }
  }

  revalidatePath('/admin/products')
  return { ok: true, data: { id: copy.id } }
}

export async function addProductImages(
  productId: string,
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  await requireUser()

  const idCheck = z.uuid().safeParse(productId)
  if (!idCheck.success) return actionError('Барааны ID буруу байна')

  const parsed = z.array(imageInputSchema).safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))
  if (parsed.data.length === 0) return { ok: true, data: { count: 0 } }

  const supabase = await createClient()

  const { error } = await supabase.from('product_images').insert(
    parsed.data.map((image) => ({
      product_id: productId,
      storage_path: image.storage_path,
      sort_order: image.sort_order,
      is_primary: false,
      is_transparent: image.is_transparent,
    })),
  )

  if (error) return actionError(friendlyDbError(error))

  const primary = parsed.data.find((image) => image.is_primary)
  if (primary) {
    const { data: inserted } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .eq('storage_path', primary.storage_path)
      .maybeSingle()

    if (inserted) await setPrimaryImage(productId, inserted.id)
  } else {
    await ensurePrimaryImage(supabase, productId)
  }

  revalidatePath(`/admin/products/${productId}`)
  return { ok: true, data: { count: parsed.data.length } }
}

export async function reorderImages(
  productId: string,
  imageIds: unknown,
): Promise<ActionResult> {
  await requireUser()

  const parsed = z.array(z.uuid()).safeParse(imageIds)
  if (!parsed.success) return actionError('Зургийн дараалал буруу байна')

  const supabase = await createClient()

  for (const [index, imageId] of parsed.data.entries()) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: index })
      .eq('id', imageId)
      .eq('product_id', productId)

    if (error) return actionError(friendlyDbError(error))
  }

  revalidatePath(`/admin/products/${productId}`)
  return { ok: true, data: undefined }
}

export async function setPrimaryImage(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  await requireUser()

  const supabase = await createClient()

  const { error: clearError } = await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId)

  if (clearError) return actionError(friendlyDbError(clearError))

  const { error } = await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('product_id', productId)

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}`)
  return { ok: true, data: undefined }
}

export async function setImageTransparent(
  imageId: string,
  isTransparent: boolean,
): Promise<ActionResult> {
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_images')
    .update({ is_transparent: isTransparent })
    .eq('id', imageId)
    .select('product_id')
    .single()

  if (error) return actionError(friendlyDbError(error))

  revalidatePath(`/admin/products/${data.product_id}`)
  return { ok: true, data: undefined }
}

export async function deleteImage(imageId: string): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(imageId)
  if (!idCheck.success) return actionError('Зургийн ID буруу байна')

  const supabase = await createClient()

  const { data: image, error: readError } = await supabase
    .from('product_images')
    .select('id, product_id, storage_path')
    .eq('id', imageId)
    .single()

  if (readError || !image) {
    return actionError(friendlyDbError(readError ?? { message: 'Зураг олдсонгүй' }))
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  if (error) return actionError(friendlyDbError(error))

  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([image.storage_path])
  await ensurePrimaryImage(supabase, image.product_id)

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${image.product_id}`)
  return { ok: true, data: undefined }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Opening stock always goes through the ledger, never a direct update. */
async function insertOpeningStock(
  supabase: SupabaseServerClient,
  inputs: VariantInput[],
  created: { id: string; attributes: Record<string, string>; cost_price: string }[],
  userId: string,
) {
  const rows = created
    .map((variant) => {
      const match = inputs.find(
        (input) => attributeKey(input.attributes) === attributeKey(variant.attributes),
      )
      const qty = match?.initial_stock ?? 0
      if (qty <= 0) return null

      return {
        variant_id: variant.id,
        qty,
        reason: 'stock_in' as const,
        unit_cost: variant.cost_price,
        note: 'Эхний үлдэгдэл',
        created_by: userId,
      }
    })
    .filter((row) => row !== null)

  if (rows.length > 0) {
    await supabase.from('stock_movements').insert(rows)
  }
}

/** Soft deletes a variant, or just deactivates it when it has sales history. */
async function retireVariant(
  supabase: SupabaseServerClient,
  variantId: string,
): Promise<ActionResult> {
  const { count, error: countError } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('variant_id', variantId)

  if (countError) return actionError(friendlyDbError(countError))

  const patch =
    (count ?? 0) > 0
      ? { is_active: false }
      : { deleted_at: new Date().toISOString(), is_active: false }

  const { error } = await supabase.from('product_variants').update(patch).eq('id', variantId)
  if (error) return actionError(friendlyDbError(error))

  return { ok: true, data: undefined }
}

/** Keeps exactly one primary image per product. */
async function ensurePrimaryImage(supabase: SupabaseServerClient, productId: string) {
  const { data } = await supabase
    .from('product_images')
    .select('id, is_primary')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  const images: { id: string; is_primary: boolean }[] = data ?? []
  if (images.length === 0) return
  if (images.some((image) => image.is_primary)) return

  const first = images[0]
  if (!first) return

  await supabase.from('product_images').update({ is_primary: true }).eq('id', first.id)
}

async function uniqueSlug(supabase: SupabaseServerClient, base: string): Promise<string> {
  let candidate = base
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const { data } = await supabase.from('products').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${attempt}`
  }
  return `${base}-${Date.now()}`
}
