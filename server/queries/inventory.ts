import 'server-only'

import Decimal from 'decimal.js'

import { createClient } from '@/lib/supabase/server'
import type { InventoryRow, MovementRow } from '@/types/inventory'

type RawVariant = {
  id: string
  sku: string | null
  attributes: Record<string, string>
  cost_price: string
  product_id: string
  product: { name: string; deleted_at: string | null } | { name: string; deleted_at: string | null }[] | null
}

export async function getInventoryRows(search?: string): Promise<InventoryRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, sku, attributes, cost_price, product_id, product:products ( name, deleted_at )')
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  const variants: RawVariant[] = data ?? []
  const ids = variants.map((variant) => variant.id)

  const [{ data: stockData }, { data: movementData }] = await Promise.all([
    supabase
      .from('v_variant_stock')
      .select('variant_id, current_stock')
      .in('variant_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('stock_movements')
      .select('variant_id, created_at')
      .in('variant_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false }),
  ])

  const stock = new Map<string, number>(
    ((stockData ?? []) as { variant_id: string; current_stock: number }[]).map((row) => [
      row.variant_id,
      row.current_stock,
    ]),
  )

  const lastMovement = new Map<string, string>()
  for (const row of (movementData ?? []) as { variant_id: string; created_at: string }[]) {
    if (!lastMovement.has(row.variant_id)) lastMovement.set(row.variant_id, row.created_at)
  }

  const needle = search?.trim().toLowerCase() ?? ''

  return variants
    .map((variant) => ({
      variant,
      product: Array.isArray(variant.product) ? variant.product[0] : variant.product,
    }))
    .filter(({ product }) => product && product.deleted_at === null)
    .map(({ variant, product }) => {
      const currentStock = stock.get(variant.id) ?? 0

      return {
        variantId: variant.id,
        productId: variant.product_id,
        productName: product?.name ?? '—',
        variantLabel: Object.values(variant.attributes ?? {}).join(' / ') || 'Үндсэн',
        sku: variant.sku,
        currentStock,
        costPrice: variant.cost_price,
        stockValue: new Decimal(variant.cost_price).times(currentStock).toFixed(2),
        lastMovementAt: lastMovement.get(variant.id) ?? null,
      }
    })
    .filter((row) => {
      if (needle === '') return true
      return (
        row.productName.toLowerCase().includes(needle) ||
        row.variantLabel.toLowerCase().includes(needle) ||
        (row.sku ?? '').toLowerCase().includes(needle)
      )
    })
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.variantLabel.localeCompare(b.variantLabel))
}

export async function getVariantMovements(variantId: string): Promise<MovementRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_movements')
    .select('id, created_at, qty, reason, unit_cost, note')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  type Raw = {
    id: string
    created_at: string
    qty: number
    reason: string
    unit_cost: string | null
    note: string | null
  }

  return ((data ?? []) as Raw[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    qty: row.qty,
    reason: row.reason,
    unitCost: row.unit_cost,
    note: row.note,
  }))
}

export async function getVariantSummary(variantId: string): Promise<InventoryRow | null> {
  const rows = await getInventoryRows()
  return rows.find((row) => row.variantId === variantId) ?? null
}
