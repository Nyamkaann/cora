import type { OrderChannel, OrderStatus } from '@/lib/orders'

/** One selectable variant in the order form. Cost never travels to the client. */
export type VariantOption = {
  variantId: string
  productName: string
  variantLabel: string
  sku: string | null
  salePrice: string
  currentStock: number
}

export type OrderListRow = {
  id: string
  orderNo: string | null
  orderedAt: string
  channel: OrderChannel
  customerName: string | null
  customerPhone: string | null
  status: OrderStatus
  paymentStatus: string
  /** Revenue after discount, delivery excluded. */
  revenue: string
  /** Computed on the server from the cost snapshots. */
  grossProfit: string
  marginPct: number
  total: string
}

export type OrderItemRow = {
  id: string
  variantId: string
  productName: string
  variantLabel: string | null
  qty: number
  unitPrice: string
  /** Snapshot taken when the order was saved. */
  lineRevenue: string
  lineProfit: string
}

export type OrderMovementRow = {
  id: string
  createdAt: string
  qty: number
  reason: string
  note: string | null
  productName: string
  variantLabel: string
}

export type OrderDetail = {
  id: string
  orderNo: string | null
  orderedAt: string
  createdAt: string
  updatedAt: string
  channel: OrderChannel
  status: OrderStatus
  paymentStatus: string
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  note: string | null
  deliveryFee: string
  discountAmount: string
  items: OrderItemRow[]
  movements: OrderMovementRow[]
  subtotal: string
  revenue: string
  cost: string
  grossProfit: string
  marginPct: number
  total: string
}
