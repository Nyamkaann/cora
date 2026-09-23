import 'server-only'

import Decimal from 'decimal.js'

import { marginPct } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'
import type {
  BrandOption,
  CategoryOption,
  ProductDetail,
  ProductImageRow,
  ProductListRow,
  ProductStatus,
  VariantAttributes,
} from '@/types/catalog'

const PRODUCT_IMAGES_BUCKET = 'product-images'

/** PostgREST embeds arrive as an object or a single element array. */
type MaybeOne<T> = T | T[] | null

function one<T>(value: MaybeOne<T> | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

type RawVariant = {
  id: string
  sku: string | null
  attributes: VariantAttributes
  cost_price: string
  sale_price: string
  is_active: boolean
  sort_order: number
  deleted_at: string | null
}

type RawImage = {
  id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
  is_transparent: boolean
}

type RawProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  brand_id: string | null
  category_id: string | null
  option_types: string[]
  status: ProductStatus
  brand: MaybeOne<{ id: string; name: string }>
  category: MaybeOne<{ id: string; name: string }>
  variants: RawVariant[]
  images: RawImage[]
}

const PRODUCT_SELECT = `
  id, name, slug, description, brand_id, category_id, option_types, status,
  brand:brands ( id, name ),
  category:categories ( id, name ),
  variants:product_variants ( id, sku, attributes, cost_price, sale_price, is_active, sort_order, deleted_at ),
  images:product_images ( id, storage_path, sort_order, is_primary, is_transparent )
`

function publicUrl(baseUrl: string, storagePath: string): string {
  return `${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${storagePath}`
}

function sortImages(images: RawImage[]): RawImage[] {
  return [...images].sort((a, b) => a.sort_order - b.sort_order)
}

function liveVariants(variants: RawVariant[]): RawVariant[] {
  return variants
    .filter((variant) => variant.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
}

async function variantStockMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantIds: string[],
): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map()

  const { data } = await supabase
    .from('v_variant_stock')
    .select('variant_id, current_stock')
    .in('variant_id', variantIds)

  const rows: { variant_id: string; current_stock: number }[] = data ?? []
  return new Map(rows.map((row) => [row.variant_id, row.current_stock]))
}

/**
 * List rows for /admin/products. Cost prices stay on the server: only the
 * averaged margin is handed to the client.
 */
export async function getProductList(): Promise<ProductListRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const products: RawProduct[] = data ?? []
  const allVariantIds = products.flatMap((product) =>
    liveVariants(product.variants ?? []).map((variant) => variant.id),
  )
  const stockByVariant = await variantStockMap(supabase, allVariantIds)
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  return products.map((product) => {
    const variants = liveVariants(product.variants ?? [])
    const prices = variants.map((variant) => new Decimal(variant.sale_price))
    const margins = variants.map((variant) => marginPct(variant.cost_price, variant.sale_price))
    const images = sortImages(product.images ?? [])
    const primary = images.find((image) => image.is_primary) ?? images[0]

    const avgMargin = margins.length
      ? margins.reduce((total, value) => total.plus(value), new Decimal(0)).div(margins.length)
      : new Decimal(0)

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      brandId: one(product.brand)?.id ?? null,
      brandName: one(product.brand)?.name ?? null,
      categoryId: one(product.category)?.id ?? null,
      categoryName: one(product.category)?.name ?? null,
      imageUrl: primary ? publicUrl(baseUrl, primary.storage_path) : null,
      variantCount: variants.length,
      minPrice: prices.length ? Decimal.min(...prices).toFixed(2) : '0.00',
      maxPrice: prices.length ? Decimal.max(...prices).toFixed(2) : '0.00',
      totalStock: variants.reduce(
        (total, variant) => total + (stockByVariant.get(variant.id) ?? 0),
        0,
      ),
      avgMarginPct: avgMargin.toDecimalPlaces(1).toNumber(),
    }
  })
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', productId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const product: RawProduct = data
  const variants = liveVariants(product.variants ?? [])
  const stockByVariant = await variantStockMap(
    supabase,
    variants.map((variant) => variant.id),
  )
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const images: ProductImageRow[] = sortImages(product.images ?? []).map((image) => ({
    id: image.id,
    storage_path: image.storage_path,
    url: publicUrl(baseUrl, image.storage_path),
    sort_order: image.sort_order,
    is_primary: image.is_primary,
    is_transparent: image.is_transparent,
  }))

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand_id: product.brand_id,
    category_id: product.category_id,
    option_types: product.option_types ?? [],
    status: product.status,
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      attributes: variant.attributes ?? {},
      cost_price: variant.cost_price,
      sale_price: variant.sale_price,
      is_active: variant.is_active,
      sort_order: variant.sort_order,
      current_stock: stockByVariant.get(variant.id) ?? 0,
    })),
    images,
  }
}

export async function getBrandOptions(): Promise<BrandOption[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('brands').select('id, name').order('name')
  return data ?? []
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('sort_order')
    .order('name')
  return data ?? []
}
