// Row shapes used by the catalog screens. Replace with the generated types
// from `pnpm db:types` once the Supabase project is linked.

export type ProductStatus = 'active' | 'archived'

export type VariantAttributes = Record<string, string>

export type BrandOption = { id: string; name: string }
export type CategoryOption = { id: string; name: string }

export type VariantRow = {
  id: string
  sku: string | null
  attributes: VariantAttributes
  cost_price: string
  sale_price: string
  is_active: boolean
  sort_order: number
  current_stock: number
}

export type ProductImageRow = {
  id: string
  storage_path: string
  url: string
  sort_order: number
  is_primary: boolean
  is_transparent: boolean
}

/** Everything the edit form needs. */
export type ProductDetail = {
  id: string
  name: string
  slug: string
  description: string | null
  brand_id: string | null
  category_id: string | null
  option_types: string[]
  status: ProductStatus
  variants: VariantRow[]
  images: ProductImageRow[]
}

/**
 * List row. Cost never reaches the client: only the margin computed on the
 * server is exposed.
 */
export type ProductListRow = {
  id: string
  name: string
  slug: string
  status: ProductStatus
  brandId: string | null
  brandName: string | null
  categoryId: string | null
  categoryName: string | null
  imageUrl: string | null
  variantCount: number
  minPrice: string
  maxPrice: string
  totalStock: number
  avgMarginPct: number
}
