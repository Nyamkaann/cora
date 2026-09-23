import Decimal from 'decimal.js'

import { marginPct, parseMoney, type MoneyInput } from '@/lib/money'

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'delivered',
  'cancelled',
  'returned',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Statuses where the goods have left the shelf. */
export const COMMITTED_STATUSES: OrderStatus[] = ['confirmed', 'delivered']

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Хүлээгдэж буй',
  confirmed: 'Баталгаажсан',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцлагдсан',
  returned: 'Буцаагдсан',
}

export const ORDER_CHANNELS = ['facebook', 'instagram', 'offline', 'other'] as const
export type OrderChannel = (typeof ORDER_CHANNELS)[number]

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  offline: 'Биечлэн',
  other: 'Бусад',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Төлөгдөөгүй',
  partial: 'Хэсэгчилсэн',
  paid: 'Төлөгдсөн',
}

export type OrderLine = {
  qty: number
  unitPrice: MoneyInput
  unitCost: MoneyInput
}

export type OrderTotals = {
  /** Sum of qty x unit price, before the discount. */
  subtotal: Decimal
  /** Revenue that counts towards profit: subtotal minus the discount. */
  revenue: Decimal
  /** Sum of qty x snapshotted unit cost. */
  cost: Decimal
  /** revenue - cost. The delivery fee is not part of profit. */
  grossProfit: Decimal
  /** grossProfit / revenue x 100, 0 when there is no revenue. */
  marginPct: Decimal
  /** What the customer pays: revenue plus delivery. */
  total: Decimal
  unitCount: number
}

/**
 * Order level money. Discount lowers revenue, the delivery fee is passed
 * through to the customer and never counted as profit.
 */
export function calculateOrderTotals(
  lines: OrderLine[],
  discountAmount: MoneyInput = 0,
  deliveryFee: MoneyInput = 0,
): OrderTotals {
  let subtotal = new Decimal(0)
  let cost = new Decimal(0)
  let unitCount = 0

  for (const line of lines) {
    const qty = Number.isFinite(line.qty) ? Math.trunc(line.qty) : 0
    if (qty === 0) continue

    subtotal = subtotal.plus(parseMoney(line.unitPrice).times(qty))
    cost = cost.plus(parseMoney(line.unitCost).times(qty))
    unitCount += qty
  }

  const discount = parseMoney(discountAmount)
  const delivery = parseMoney(deliveryFee)
  const revenue = subtotal.minus(discount)
  const grossProfit = revenue.minus(cost)

  return {
    subtotal,
    revenue,
    cost,
    grossProfit,
    marginPct: marginPct(cost, revenue),
    total: revenue.plus(delivery),
    unitCount,
  }
}

export type StockDelta = {
  variantId: string
  /** Negative when goods leave, positive when they come back. */
  qty: number
  reason: 'sale' | 'return'
}

/**
 * Ledger rows a status change has to write. Mirrors fn_set_order_status, which
 * is what actually performs the change atomically; this runs first so the admin
 * gets a readable warning instead of a Postgres exception.
 */
export function movementsForStatusChange(
  from: OrderStatus,
  to: OrderStatus,
  lines: { variantId: string; qty: number }[],
): StockDelta[] {
  if (from === to) return []

  const wasCommitted = COMMITTED_STATUSES.includes(from)
  const willCommit = COMMITTED_STATUSES.includes(to)

  if (willCommit && !wasCommitted) {
    return lines.map((line) => ({ variantId: line.variantId, qty: -line.qty, reason: 'sale' }))
  }

  if (wasCommitted && !willCommit) {
    return lines.map((line) => ({ variantId: line.variantId, qty: line.qty, reason: 'return' }))
  }

  return []
}

/** Order number for display when the trigger has not run yet. */
export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value)
}

export function isOrderChannel(value: string): value is OrderChannel {
  return (ORDER_CHANNELS as readonly string[]).includes(value)
}
