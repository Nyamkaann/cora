import { describe, expect, it } from 'vitest'

import { buildSummary, percentChange, sumPeriods } from './profit'

describe('buildSummary', () => {
  it('handles an empty period without dividing by zero', () => {
    const summary = buildSummary({ revenue: 0, cogs: 0, expenses: 0 })

    expect(summary.revenue.toString()).toBe('0')
    expect(summary.grossProfit.toString()).toBe('0')
    expect(summary.netProfit.toString()).toBe('0')
    expect(summary.grossMarginPct.toString()).toBe('0')
    expect(summary.netMarginPct.toString()).toBe('0')
    expect(summary.averageOrderValue.toString()).toBe('0')
  })

  it('derives gross and net profit', () => {
    const summary = buildSummary({
      revenue: '1000000',
      cogs: '600000',
      expenses: '250000',
      order_count: 8,
      unit_count: 14,
    })

    expect(summary.grossProfit.toString()).toBe('400000')
    expect(summary.netProfit.toString()).toBe('150000')
    expect(summary.grossMarginPct.toString()).toBe('40')
    expect(summary.netMarginPct.toString()).toBe('15')
    expect(summary.averageOrderValue.toString()).toBe('125000')
  })

  it('reads a discounted period off the revenue already net of the discount', () => {
    // 1,000,000 sold, 100,000 discounted -> 900,000 revenue against 600,000 cost
    const summary = buildSummary({ revenue: '900000', cogs: '600000', expenses: 0 })

    expect(summary.grossProfit.toString()).toBe('300000')
    expect(summary.grossMarginPct.toDecimalPlaces(2).toString()).toBe('33.33')
  })

  it('lets returns pull the period down', () => {
    // 5 sold at 100,000 (cost 60,000), 1 returned: 400,000 revenue, 240,000 cost
    const summary = buildSummary({
      revenue: '400000',
      cogs: '240000',
      expenses: 0,
      order_count: 4,
      unit_count: 4,
    })

    expect(summary.grossProfit.toString()).toBe('160000')
    expect(summary.grossMarginPct.toString()).toBe('40')
  })

  it('handles a period that is entirely returns', () => {
    const summary = buildSummary({ revenue: '-100000', cogs: '-60000', expenses: '50000' })

    expect(summary.grossProfit.toString()).toBe('-40000')
    expect(summary.netProfit.toString()).toBe('-90000')
    // Margin against negative revenue stays defined.
    expect(summary.grossMarginPct.toString()).toBe('40')
  })

  it('reports a loss when there are no sales but there are costs', () => {
    const summary = buildSummary({ revenue: 0, cogs: 0, expenses: '800000', order_count: 0 })

    expect(summary.netProfit.toString()).toBe('-800000')
    expect(summary.netMarginPct.toString()).toBe('0')
    expect(summary.averageOrderValue.toString()).toBe('0')
  })

  it('prefers the values the database already computed', () => {
    const summary = buildSummary({
      revenue: '1000000',
      cogs: '600000',
      gross_profit: '399999',
      expenses: '100000',
      net_profit: '299999',
    })

    expect(summary.grossProfit.toString()).toBe('399999')
    expect(summary.netProfit.toString()).toBe('299999')
  })
})

describe('sumPeriods', () => {
  it('totals a month by month report', () => {
    const summary = sumPeriods([
      { revenue: '1000000', cogs: '600000', expenses: '200000', order_count: 5, unit_count: 9 },
      { revenue: '500000', cogs: '300000', expenses: '100000', order_count: 3, unit_count: 4 },
    ])

    expect(summary.revenue.toString()).toBe('1500000')
    expect(summary.cogs.toString()).toBe('900000')
    expect(summary.grossProfit.toString()).toBe('600000')
    expect(summary.expenses.toString()).toBe('300000')
    expect(summary.netProfit.toString()).toBe('300000')
    expect(summary.orderCount).toBe(8)
    expect(summary.unitCount).toBe(13)
  })

  it('returns zeros for an empty report', () => {
    const summary = sumPeriods([])

    expect(summary.revenue.toString()).toBe('0')
    expect(summary.netMarginPct.toString()).toBe('0')
  })

  it('nets a returning month against a selling one', () => {
    const summary = sumPeriods([
      { revenue: '1000000', cogs: '600000', expenses: 0 },
      { revenue: '-200000', cogs: '-120000', expenses: 0 },
    ])

    expect(summary.revenue.toString()).toBe('800000')
    expect(summary.grossProfit.toString()).toBe('320000')
  })
})

describe('percentChange', () => {
  it('computes growth and decline', () => {
    expect(percentChange('120', '100')).toBe(20)
    expect(percentChange('80', '100')).toBe(-20)
  })

  it('has no baseline to compare against when the previous period was zero', () => {
    expect(percentChange('120', '0')).toBeNull()
  })

  it('calls two empty periods unchanged', () => {
    expect(percentChange(0, 0)).toBe(0)
  })

  it('keeps the direction right when the baseline was a loss', () => {
    // -100,000 -> -50,000 is an improvement of 50%
    expect(percentChange('-50000', '-100000')).toBe(50)
  })
})
