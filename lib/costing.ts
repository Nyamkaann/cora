import Decimal from 'decimal.js'

import { parseMoney, type MoneyInput } from '@/lib/money'

export type WeightedAverageInput = {
  /** Stock on hand before this intake. */
  currentStock: number
  /** Cost currently stored on the variant. */
  currentCost: MoneyInput
  /** Quantity being received. */
  incomingQty: number
  /** Unit cost of the goods being received. */
  incomingCost: MoneyInput
}

/**
 * Weighted average cost after a stock intake:
 *   (old stock x old cost + new qty x new cost) / (old stock + new qty)
 *
 * Empty or negative stock on hand means the incoming cost simply wins, and a
 * zero intake leaves the stored cost untouched.
 */
export function weightedAverageCost({
  currentStock,
  currentCost,
  incomingQty,
  incomingCost,
}: WeightedAverageInput): Decimal {
  const oldQty = Number.isFinite(currentStock) ? Math.max(0, Math.trunc(currentStock)) : 0
  const newQty = Number.isFinite(incomingQty) ? Math.max(0, Math.trunc(incomingQty)) : 0

  const oldCost = parseMoney(currentCost)
  const newCost = parseMoney(incomingCost)

  if (newQty === 0) return oldCost
  if (oldQty === 0) return newCost

  const totalQty = oldQty + newQty
  const totalValue = oldCost.times(oldQty).plus(newCost.times(newQty))

  return totalValue.div(totalQty)
}
