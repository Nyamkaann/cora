import 'server-only'

import Decimal from 'decimal.js'

import { formatMNT } from '@/lib/money'
import { normalizeLayout, type PosterLayout } from '@/lib/poster/layout'
import { createClient } from '@/lib/supabase/server'

const PRODUCT_IMAGES_BUCKET = 'product-images'
const POSTERS_BUCKET = 'posters'

/**
 * The cron worker publishes without a session, so it hands its own client in.
 * Left out, these queries use the request's cookies as everything else does.
 */
export type PosterDb = Awaited<ReturnType<typeof createClient>>

export type PosterTemplate = {
  id: string
  name: string
  backgroundPath: string | null
  backgroundUrl: string | null
  layout: PosterLayout
  isDefault: boolean
  isActive: boolean
}

export type PosterProductOption = {
  id: string
  name: string
  hasTransparentImage: boolean
}

export type PosterRenderInput = {
  productId: string
  templateId: string
  variantId: string | null
  title: string
  price: string
  productImageUrl: string | null
  backgroundUrl: string | null
  logoUrl: string | null
  layout: PosterLayout
}

function storageUrl(bucket: string, storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${baseUrl}/storage/v1/object/public/${bucket}/${storagePath}`
}

export function posterCachePath(
  productId: string,
  templateId: string,
  variantId: string | null,
): string {
  return `${productId}/${templateId}/${variantId ?? 'all'}.png`
}

export function posterPublicUrl(path: string): string {
  return storageUrl(POSTERS_BUCKET, path)
}

type RawTemplate = {
  id: string
  name: string
  background_path: string | null
  layout: unknown
  is_default: boolean
  is_active: boolean
}

function toTemplate(row: RawTemplate): PosterTemplate {
  return {
    id: row.id,
    name: row.name,
    backgroundPath: row.background_path,
    backgroundUrl: row.background_path ? storageUrl(POSTERS_BUCKET, row.background_path) : null,
    layout: normalizeLayout(row.layout),
    isDefault: row.is_default,
    isActive: row.is_active,
  }
}

export async function getPosterTemplates(db?: PosterDb): Promise<PosterTemplate[]> {
  const supabase = db ?? (await createClient())

  const { data, error } = await supabase
    .from('poster_templates')
    .select('id, name, background_path, layout, is_default, is_active')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return ((data ?? []) as RawTemplate[]).map(toTemplate)
}

/** Products that can be rendered, with a hint about a poster ready cutout. */
export async function getPosterProducts(): Promise<PosterProductOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, images:product_images ( is_transparent )')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name')

  if (error) throw new Error(error.message)

  type Raw = { id: string; name: string; images: { is_transparent: boolean }[] }

  return ((data ?? []) as Raw[]).map((product) => ({
    id: product.id,
    name: product.name,
    hasTransparentImage: (product.images ?? []).some((image) => image.is_transparent),
  }))
}

/**
 * Everything renderPoster needs for one product. Picks the transparent image
 * first, because that is what a poster background expects.
 */
export async function getPosterRenderInput(
  productId: string,
  variantId?: string | null,
  templateId?: string | null,
  db?: PosterDb,
): Promise<PosterRenderInput | null> {
  const supabase = db ?? (await createClient())

  const { data, error } = await supabase
    .from('products')
    .select(
      `id, name,
       brand:brands ( logo_url ),
       variants:product_variants ( id, sale_price, attributes, deleted_at, is_active ),
       images:product_images ( storage_path, sort_order, is_primary, is_transparent )`,
    )
    .eq('id', productId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  type RawVariant = {
    id: string
    sale_price: string
    attributes: Record<string, string>
    deleted_at: string | null
    is_active: boolean
  }
  type RawImage = {
    storage_path: string
    sort_order: number
    is_primary: boolean
    is_transparent: boolean
  }
  type RawProduct = {
    id: string
    name: string
    brand: { logo_url: string | null } | { logo_url: string | null }[] | null
    variants: RawVariant[]
    images: RawImage[]
  }

  const product = data as RawProduct
  const brand = Array.isArray(product.brand) ? product.brand[0] : product.brand

  const variants = (product.variants ?? []).filter(
    (variant) => variant.deleted_at === null && variant.is_active,
  )

  const chosen = variantId ? variants.find((variant) => variant.id === variantId) : undefined
  const prices = variants.map((variant) => new Decimal(variant.sale_price))

  const price = chosen
    ? new Decimal(chosen.sale_price)
    : prices.length > 0
      ? Decimal.min(...prices)
      : new Decimal(0)

  const images = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const picked =
    images.find((image) => image.is_transparent && image.is_primary) ??
    images.find((image) => image.is_transparent) ??
    images.find((image) => image.is_primary) ??
    images[0]

  const templates = await getPosterTemplates(supabase)
  const template =
    (templateId ? templates.find((candidate) => candidate.id === templateId) : undefined) ??
    templates.find((candidate) => candidate.isDefault && candidate.isActive) ??
    templates.find((candidate) => candidate.isActive) ??
    templates[0]

  if (!template) return null

  const variantLabel = chosen ? Object.values(chosen.attributes ?? {}).join(' / ') : ''

  return {
    productId: product.id,
    templateId: template.id,
    variantId: chosen?.id ?? null,
    title: variantLabel ? `${product.name} · ${variantLabel}` : product.name,
    price: formatMNT(price),
    productImageUrl: picked ? storageUrl(PRODUCT_IMAGES_BUCKET, picked.storage_path) : null,
    backgroundUrl: template.backgroundUrl,
    logoUrl: brand?.logo_url ?? null,
    layout: template.layout,
  }
}
