'use server'

import ExcelJS from 'exceljs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { parseProductRows, type ProductDraft, type RowIssue } from '@/lib/excel/product-sheet'
import {
  addGuideSheet,
  addProductSheet,
  buildTemplateWorkbook,
  createWorkbook,
  readProductSheet,
  workbookFromBase64,
  workbookToBase64,
} from '@/lib/excel/workbook'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slug'

export type XlsxPayload = { base64: string; filename: string }

async function workbookToPayload(
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<XlsxPayload> {
  return { base64: await workbookToBase64(workbook), filename }
}

/** Empty sheet with headers, a few example rows and a guide tab. */
export async function downloadProductTemplate(): Promise<ActionResult<XlsxPayload>> {
  await requireUser()

  return {
    ok: true,
    data: await workbookToPayload(buildTemplateWorkbook(), 'cora-baraa-zagvar.xlsx'),
  }
}

type ExportVariant = {
  sku: string | null
  attributes: Record<string, string>
  cost_price: string
  sale_price: string
  is_active: boolean
  deleted_at: string | null
  sort_order: number
}

type ExportProduct = {
  name: string
  description: string | null
  status: string
  option_types: string[]
  brand: { name: string } | { name: string }[] | null
  category: { name: string } | { name: string }[] | null
  variants: ExportVariant[]
}

function one<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/** Every product and variant, in the same shape the importer accepts. */
export async function exportProductsXlsx(): Promise<ActionResult<XlsxPayload>> {
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `name, description, status, option_types,
       brand:brands ( name ),
       category:categories ( name ),
       variants:product_variants ( sku, attributes, cost_price, sale_price, is_active, deleted_at, sort_order )`,
    )
    .is('deleted_at', null)
    .order('name')

  if (error) return actionError(friendlyDbError(error))

  const products: ExportProduct[] = data ?? []

  const workbook = createWorkbook()
  const sheet = addProductSheet(workbook)

  for (const product of products) {
    const optionName = product.option_types?.[0] ?? ''
    const variants = (product.variants ?? [])
      .filter((variant) => variant.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order)

    for (const variant of variants) {
      sheet.addRow({
        name: product.name,
        brand: one(product.brand)?.name ?? '',
        category: one(product.category)?.name ?? '',
        description: product.description ?? '',
        optionName,
        optionValue: optionName === '' ? '' : (variant.attributes?.[optionName] ?? ''),
        sku: variant.sku ?? '',
        costPrice: Number(variant.cost_price),
        salePrice: Number(variant.sale_price),
        // Stock is a ledger, not a column: re-importing must not move it.
        stock: '',
        status: product.status === 'archived' ? 'Архивласан' : 'Идэвхтэй',
        isActive: variant.is_active ? 'Тийм' : 'Үгүй',
      })
    }
  }

  addGuideSheet(workbook)

  const stamp = new Date().toISOString().slice(0, 10)
  return { ok: true, data: await workbookToPayload(workbook, `cora-baraa-${stamp}.xlsx`) }
}

export type ImportSummary = {
  createdProducts: number
  updatedProducts: number
  createdVariants: number
  updatedVariants: number
  stockRows: number
  issues: RowIssue[]
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Finds a brand or category by name, creating it when it is new. */
async function resolveLookup(
  supabase: SupabaseServerClient,
  table: 'brands' | 'categories',
  name: string | null,
  cache: Map<string, string>,
): Promise<string | null> {
  if (!name) return null

  const key = name.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (existing) {
    cache.set(key, existing.id)
    return existing.id
  }

  const { data: created, error } = await supabase
    .from(table)
    .insert({ name, slug: slugify(name) || key })
    .select('id')
    .single()

  if (error || !created) return null

  cache.set(key, created.id)
  return created.id
}

function attributesFor(draft: ProductDraft, optionValue: string): Record<string, string> {
  return draft.optionName === '' ? {} : { [draft.optionName]: optionValue }
}

function sameAttributes(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => a[key] === b[key])
}

export async function importProductsXlsx(input: unknown): Promise<ActionResult<ImportSummary>> {
  const user = await requireUser()

  const parsed = z.object({ base64: z.string().min(1) }).safeParse(input)
  if (!parsed.success) return actionError('Файл уншигдсангүй')

  let workbook: ExcelJS.Workbook
  try {
    workbook = await workbookFromBase64(parsed.data.base64)
  } catch {
    return actionError('Excel файлыг задалж чадсангүй. .xlsx өргөтгөлтэй файл сонгоно уу.')
  }

  const { rows, matchedColumns } = readProductSheet(workbook)

  if (matchedColumns === 0) {
    return actionError('Толгой мөр таарахгүй байна. Загвар файлыг татаж ашиглана уу.')
  }

  const { products, issues } = parseProductRows(rows)

  if (products.length === 0) {
    return { ok: true, data: { createdProducts: 0, updatedProducts: 0, createdVariants: 0, updatedVariants: 0, stockRows: 0, issues } }
  }

  const supabase = await createClient()
  const brandCache = new Map<string, string>()
  const categoryCache = new Map<string, string>()

  const summary: ImportSummary = {
    createdProducts: 0,
    updatedProducts: 0,
    createdVariants: 0,
    updatedVariants: 0,
    stockRows: 0,
    issues,
  }

  for (const draft of products) {
    const brandId = await resolveLookup(supabase, 'brands', draft.brand, brandCache)
    const categoryId = await resolveLookup(supabase, 'categories', draft.category, categoryCache)

    const { data: existing } = await supabase
      .from('products')
      .select('id, variants:product_variants ( id, attributes, deleted_at )')
      .eq('slug', draft.slug)
      .is('deleted_at', null)
      .maybeSingle()

    const fields = {
      name: draft.name,
      slug: draft.slug,
      description: draft.description,
      brand_id: brandId,
      category_id: categoryId,
      option_types: draft.optionName === '' ? [] : [draft.optionName],
      status: draft.status,
    }

    let productId: string

    if (existing) {
      const { error } = await supabase.from('products').update(fields).eq('id', existing.id)
      if (error) {
        summary.issues.push({ row: 0, message: `«${draft.name}»: ${friendlyDbError(error)}` })
        continue
      }
      productId = existing.id
      summary.updatedProducts += 1
    } else {
      const { data: created, error } = await supabase
        .from('products')
        .insert({ ...fields, is_featured: false })
        .select('id')
        .single()

      if (error || !created) {
        summary.issues.push({
          row: 0,
          message: `«${draft.name}»: ${friendlyDbError(error ?? { message: 'үүсгэж чадсангүй' })}`,
        })
        continue
      }
      productId = created.id
      summary.createdProducts += 1
    }

    type ExistingVariant = { id: string; attributes: Record<string, string>; deleted_at: string | null }
    const existingVariants: ExistingVariant[] = (existing?.variants ?? []).filter(
      (variant: ExistingVariant) => variant.deleted_at === null,
    )

    for (const [index, variant] of draft.variants.entries()) {
      const attributes = attributesFor(draft, variant.optionValue)
      const match = existingVariants.find((candidate) =>
        sameAttributes(candidate.attributes ?? {}, attributes),
      )

      const variantFields = {
        product_id: productId,
        sku: variant.sku,
        attributes,
        cost_price: variant.costPrice,
        sale_price: variant.salePrice,
        is_active: variant.isActive,
        sort_order: index,
      }

      if (match) {
        const { error } = await supabase
          .from('product_variants')
          .update(variantFields)
          .eq('id', match.id)

        if (error) {
          summary.issues.push({ row: 0, message: `«${draft.name}»: ${friendlyDbError(error)}` })
          continue
        }
        summary.updatedVariants += 1
        continue
      }

      const { data: createdVariant, error } = await supabase
        .from('product_variants')
        .insert(variantFields)
        .select('id')
        .single()

      if (error || !createdVariant) {
        summary.issues.push({
          row: 0,
          message: `«${draft.name}»: ${friendlyDbError(error ?? { message: 'хувилбар нэмэгдсэнгүй' })}`,
        })
        continue
      }

      summary.createdVariants += 1

      // Opening stock only for brand new variants, so a repeat import never
      // doubles the ledger.
      if (variant.stock > 0) {
        await supabase.from('stock_movements').insert({
          variant_id: createdVariant.id,
          qty: variant.stock,
          reason: 'stock_in',
          unit_cost: variant.costPrice,
          note: 'Excel импорт',
          created_by: user.id,
        })
        summary.stockRows += 1
      }
    }
  }

  revalidatePath('/admin/products')
  revalidatePath('/admin/inventory')

  return { ok: true, data: summary }
}
