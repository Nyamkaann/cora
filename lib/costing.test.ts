import { describe, expect, it } from 'vitest'

import { weightedAverageCost } from './costing'

describe('weightedAverageCost', () => {
  it('blends the old and the new cost by quantity', () => {
    // 10 x 25,000 + 10 x 35,000 = 600,000 / 20 = 30,000
    expect(
      weightedAverageCost({
        currentStock: 10,
        currentCost: '25000',
        incomingQty: 10,
        incomingCost: '35000',
      }).toString(),
    ).toBe('30000')
  })

  it('weights by the larger side', () => {
    // 40 x 25,000 + 10 x 50,000 = 1,500,000 / 50 = 30,000
    expect(
      weightedAverageCost({
        currentStock: 40,
        currentCost: '25000',
        incomingQty: 10,
        incomingCost: '50000',
      }).toString(),
    ).toBe('30000')
  })

  it('takes the incoming cost when there is no stock on hand', () => {
    expect(
      weightedAverageCost({
        currentStock: 0,
        currentCost: '25000',
        incomingQty: 5,
        incomingCost: '41000',
      }).toString(),
    ).toBe('41000')
  })

  it('treats negative stock as empty', () => {
    expect(
      weightedAverageCost({
        currentStock: -3,
        currentCost: '25000',
        incomingQty: 5,
        incomingCost: '41000',
      }).toString(),
    ).toBe('41000')
  })

  it('keeps the stored cost when nothing is received', () => {
    expect(
      weightedAverageCost({
        currentStock: 10,
        currentCost: '25000',
        incomingQty: 0,
        incomingCost: '99000',
      }).toString(),
    ).toBe('25000')
  })

  it('keeps the same cost when both sides match', () => {
    expect(
      weightedAverageCost({
        currentStock: 7,
        currentCost: '68000',
        incomingQty: 13,
        incomingCost: '68000',
      }).toString(),
    ).toBe('68000')
  })

  it('does not drift on fractional results', () => {
    // 3 x 10,000 + 1 x 10,001 = 40,001 / 4 = 10,000.25
    expect(
      weightedAverageCost({
        currentStock: 3,
        currentCost: '10000',
        incomingQty: 1,
        incomingCost: '10001',
      }).toString(),
    ).toBe('10000.25')
  })
})
