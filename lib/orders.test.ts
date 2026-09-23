import { describe, expect, it } from 'vitest'

import { calculateOrderTotals, movementsForStatusChange } from './orders'

describe('calculateOrderTotals', () => {
  it('computes revenue, cost and profit for a plain order', () => {
    const totals = calculateOrderTotals([
      { qty: 2, unitPrice: '135000', unitCost: '68000' },
      { qty: 1, unitPrice: '49000', unitCost: '25000' },
    ])

    expect(totals.subtotal.toString()).toBe('319000')
    expect(totals.cost.toString()).toBe('161000')
    expect(totals.grossProfit.toString()).toBe('158000')
    expect(totals.total.toString()).toBe('319000')
    expect(totals.unitCount).toBe(3)
  })

  it('takes the discount off profit but leaves delivery out of it', () => {
    const totals = calculateOrderTotals(
      [{ qty: 2, unitPrice: '135000', unitCost: '68000' }],
      '10000',
      '5000',
    )

    // 270,000 - 10,000 = 260,000 revenue, 136,000 cost
    expect(totals.revenue.toString()).toBe('260000')
    expect(totals.grossProfit.toString()).toBe('124000')
    // Delivery is collected from the customer, not earned.
    expect(totals.total.toString()).toBe('265000')
  })

  it('reports the margin against revenue', () => {
    const totals = calculateOrderTotals(
      [{ qty: 1, unitPrice: '150000', unitCost: '60000' }],
      '50000',
    )

    // revenue 100,000, cost 60,000 -> 40%
    expect(totals.marginPct.toString()).toBe('40')
  })

  it('handles an empty order without dividing by zero', () => {
    const totals = calculateOrderTotals([], '0', '0')

    expect(totals.revenue.toString()).toBe('0')
    expect(totals.grossProfit.toString()).toBe('0')
    expect(totals.marginPct.toString()).toBe('0')
  })

  it('goes negative when the discount eats the margin', () => {
    const totals = calculateOrderTotals(
      [{ qty: 1, unitPrice: '100000', unitCost: '80000' }],
      '30000',
    )

    expect(totals.revenue.toString()).toBe('70000')
    expect(totals.grossProfit.toString()).toBe('-10000')
  })

  it('ignores zero quantity lines', () => {
    const totals = calculateOrderTotals([
      { qty: 0, unitPrice: '135000', unitCost: '68000' },
      { qty: 1, unitPrice: '49000', unitCost: '25000' },
    ])

    expect(totals.subtotal.toString()).toBe('49000')
    expect(totals.unitCount).toBe(1)
  })
})

describe('movementsForStatusChange', () => {
  const lines = [
    { variantId: 'v1', qty: 2 },
    { variantId: 'v2', qty: 1 },
  ]

  it('takes stock out when an order is confirmed', () => {
    expect(movementsForStatusChange('pending', 'confirmed', lines)).toEqual([
      { variantId: 'v1', qty: -2, reason: 'sale' },
      { variantId: 'v2', qty: -1, reason: 'sale' },
    ])
  })

  it('puts stock back on a return', () => {
    expect(movementsForStatusChange('delivered', 'returned', lines)).toEqual([
      { variantId: 'v1', qty: 2, reason: 'return' },
      { variantId: 'v2', qty: 1, reason: 'return' },
    ])
  })

  it('puts stock back when a confirmed order is cancelled', () => {
    expect(movementsForStatusChange('confirmed', 'cancelled', lines)).toEqual([
      { variantId: 'v1', qty: 2, reason: 'return' },
      { variantId: 'v2', qty: 1, reason: 'return' },
    ])
  })

  it('moves nothing between two committed states', () => {
    expect(movementsForStatusChange('confirmed', 'delivered', lines)).toEqual([])
  })

  it('moves nothing when a pending order is cancelled', () => {
    expect(movementsForStatusChange('pending', 'cancelled', lines)).toEqual([])
  })

  it('moves nothing when the status does not change', () => {
    expect(movementsForStatusChange('confirmed', 'confirmed', lines)).toEqual([])
  })
})
