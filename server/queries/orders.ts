import 'server-only'

import { calculateOrderTotals, isOrderChannel, isOrderStatus, type OrderStatus } from '@/lib/orders'
import { createClient } from '@/lib/supabase/server'
import type {
  OrderDetail,
  OrderItemRow,
  OrderListRow,
  OrderMovementRow,
  VariantOption,
} from '@/types/orders'

type RawOrderItem = {
  id: string
  variant_id: string
  qty: number
  unit_price: string
  unit_cost: string
  product_name_snapshot: string
  variant_label_snapshot: string | null
}

type RawOrder = {
  id: string
  order_no: string | null
  ordered_at: string
  created_at: string
  updated_at: string
  channel: string
  status: string
  payment_status: string
  customer_name: string | null
  customer_phone: string | null
  delivery_address: string | null
  note: string | null
  delivery_fee: string
  discount_amount: string
  items: RawOrderItem[]
}

const ORDER_SELECT = `
  id, order_no, ordered_at, created_at, updated_at, channel, status, payment_status,
  customer_name, customer_phone, delivery_address, note, delivery_fee, discount_amount,
  items:order_items ( id, variant_id, qty, unit_price, unit_cost, product_name_snapshot, variant_label_snapshot )
`

function lines(items: RawOrderItem[]) {
  return items.map((item) => ({
    qty: item.qty,
    unitPrice: item.unit_price,
    unitCost: item.unit_cost,
  }))
}

function safeStatus(value: string): OrderStatus {
  return isOrderStatus(value) ? value : 'pending'
}

function safeChannel(value: string) {
  return isOrderChannel(value) ? value : 'other'
}

export type OrderListFilters = {
  from?: string
  to?: string
  channel?: string
  status?: string
}

export async function getOrderList(filters: OrderListFilters = {}): Promise<OrderListRow[]> {
  const supabase = await createClient()

  let query = supabase.from('orders').select(ORDER_SELECT).order('ordered_at', { ascending: false })

  if (filters.from) query = query.gte('ordered_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('ordered_at', `${filters.to}T23:59:59`)
  if (filters.channel && filters.channel !== 'all') query = query.eq('channel', filters.channel)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const orders: RawOrder[] = data ?? []

  return orders.map((order) => {
    const totals = calculateOrderTotals(
      lines(order.items ?? []),
      order.discount_amount,
      order.delivery_fee,
    )

    return {
      id: order.id,
      orderNo: order.order_no,
      orderedAt: order.ordered_at,
      channel: safeChannel(order.channel),
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      status: safeStatus(order.status),
      paymentStatus: order.payment_status,
      revenue: totals.revenue.toFixed(2),
      grossProfit: totals.grossProfit.toFixed(2),
      marginPct: totals.marginPct.toDecimalPlaces(1).toNumber(),
      total: totals.total.toFixed(2),
    }
  })
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const order: RawOrder = data
  const items = order.items ?? []
  const totals = calculateOrderTotals(lines(items), order.discount_amount, order.delivery_fee)

  const { data: movementData } = await supabase
    .from('stock_movements')
    .select(
      'id, created_at, qty, reason, note, variant:product_variants ( attributes, product:products ( name ) )',
    )
    .eq('reference_id', orderId)
    .order('created_at', { ascending: true })

  type RawMovement = {
    id: string
    created_at: string
    qty: number
    reason: string
    note: string | null
    variant:
      | { attributes: Record<string, string>; product: { name: string } | { name: string }[] | null }
      | { attributes: Record<string, string>; product: { name: string } | { name: string }[] | null }[]
      | null
  }

  const movements: OrderMovementRow[] = ((movementData ?? []) as RawMovement[]).map((movement) => {
    const variant = Array.isArray(movement.variant) ? movement.variant[0] : movement.variant
    const product = Array.isArray(variant?.product) ? variant?.product[0] : variant?.product

    return {
      id: movement.id,
      createdAt: movement.created_at,
      qty: movement.qty,
      reason: movement.reason,
      note: movement.note,
      productName: product?.name ?? '—',
      variantLabel: Object.values(variant?.attributes ?? {}).join(' / '),
    }
  })

  const itemRows: OrderItemRow[] = items.map((item) => {
    const lineTotals = calculateOrderTotals([
      { qty: item.qty, unitPrice: item.unit_price, unitCost: item.unit_cost },
    ])

    return {
      id: item.id,
      variantId: item.variant_id,
      productName: item.product_name_snapshot,
      variantLabel: item.variant_label_snapshot,
      qty: item.qty,
      unitPrice: item.unit_price,
      lineRevenue: lineTotals.revenue.toFixed(2),
      lineProfit: lineTotals.grossProfit.toFixed(2),
    }
  })

  return {
    id: order.id,
    orderNo: order.order_no,
    orderedAt: order.ordered_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    channel: safeChannel(order.channel),
    status: safeStatus(order.status),
    paymentStatus: order.payment_status,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    deliveryAddress: order.delivery_address,
    note: order.note,
    deliveryFee: order.delivery_fee,
    discountAmount: order.discount_amount,
    items: itemRows,
    movements,
    subtotal: totals.subtotal.toFixed(2),
    revenue: totals.revenue.toFixed(2),
    cost: totals.cost.toFixed(2),
    grossProfit: totals.grossProfit.toFixed(2),
    marginPct: totals.marginPct.toDecimalPlaces(1).toNumber(),
    total: totals.total.toFixed(2),
  }
}

/** Options for the order form combobox. Sale price and stock only, never cost. */
export async function getVariantOptions(): Promise<VariantOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, sku, attributes, sale_price, is_active, product:products ( name, status, deleted_at )')
    .is('deleted_at', null)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  type RawVariant = {
    id: string
    sku: string | null
    attributes: Record<string, string>
    sale_price: string
    product:
      | { name: string; status: string; deleted_at: string | null }
      | { name: string; status: string; deleted_at: string | null }[]
      | null
  }

  const variants: RawVariant[] = data ?? []
  const ids = variants.map((variant) => variant.id)

  const { data: stockData } = await supabase
    .from('v_variant_stock')
    .select('variant_id, current_stock')
    .in('variant_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])

  const stock = new Map<string, number>(
    ((stockData ?? []) as { variant_id: string; current_stock: number }[]).map((row) => [
      row.variant_id,
      row.current_stock,
    ]),
  )

  return variants
    .map((variant) => {
      const product = Array.isArray(variant.product) ? variant.product[0] : variant.product
      return { variant, product }
    })
    .filter(({ product }) => product && product.deleted_at === null && product.status === 'active')
    .map(({ variant, product }) => ({
      variantId: variant.id,
      productName: product?.name ?? '—',
      variantLabel: Object.values(variant.attributes ?? {}).join(' / '),
      sku: variant.sku,
      salePrice: variant.sale_price,
      currentStock: stock.get(variant.id) ?? 0,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName))
}
