import { describe, expect, it } from 'vitest'

import {
  Decimal,
  add,
  div,
  formatMNT,
  formatPct,
  marginPct,
  mul,
  parseMoney,
  percentage,
  sub,
  toDbNumeric,
} from './money'

describe('parseMoney', () => {
  it('handles zero and empty input', () => {
    expect(parseMoney(0).toString()).toBe('0')
    expect(parseMoney('').toString()).toBe('0')
    expect(parseMoney(null).toString()).toBe('0')
    expect(parseMoney(undefined).toString()).toBe('0')
    expect(parseMoney('-').toString()).toBe('0')
  })

  it('strips grouping, spaces and the currency symbol', () => {
    expect(parseMoney('125,000').toString()).toBe('125000')
    expect(parseMoney('₮ 125 000.50').toString()).toBe('125000.5')
  })

  it('handles negative values', () => {
    expect(parseMoney('-45000').toString()).toBe('-45000')
    expect(parseMoney(-45000.25).toString()).toBe('-45000.25')
  })

  it('handles billions without precision loss', () => {
    expect(parseMoney('1,234,567,890.12').toString()).toBe('1234567890.12')
  })

  it('falls back to zero on garbage input', () => {
    expect(parseMoney('abc').toString()).toBe('0')
    expect(parseMoney(Number.NaN).toString()).toBe('0')
    expect(parseMoney(Number.POSITIVE_INFINITY).toString()).toBe('0')
  })
})

describe('arithmetic', () => {
  it('adds without float drift', () => {
    expect(add('0.1', '0.2').toString()).toBe('0.3')
  })

  it('subtracts into negatives', () => {
    expect(sub('45000', '80000').toString()).toBe('-35000')
  })

  it('multiplies fractional quantities', () => {
    expect(mul('49000', 3).toString()).toBe('147000')
    expect(mul('0.1', '0.2').toString()).toBe('0.02')
  })

  it('divides and guards against zero', () => {
    expect(div('150000', 3).toString()).toBe('50000')
    expect(div('150000', 0).toString()).toBe('0')
    expect(div('150000', '').toString()).toBe('0')
  })

  it('keeps billion scale exact', () => {
    expect(add('1000000000', '234567890.12').toString()).toBe('1234567890.12')
  })
})

describe('percentage', () => {
  it('computes a share', () => {
    expect(percentage('25000', '100000').toString()).toBe('25')
  })

  it('returns zero when the whole is zero', () => {
    expect(percentage('25000', 0).toString()).toBe('0')
  })

  it('handles negative parts', () => {
    expect(percentage('-25000', '100000').toString()).toBe('-25')
  })
})

describe('marginPct', () => {
  it('computes margin on the sale price', () => {
    expect(marginPct('60000', '150000').toString()).toBe('60')
    expect(marginPct('80000', '100000').toString()).toBe('20')
  })

  it('returns zero when the sale price is zero', () => {
    expect(marginPct('60000', 0).toString()).toBe('0')
  })

  it('goes negative when selling below cost', () => {
    expect(marginPct('150000', '100000').toString()).toBe('-50')
  })
})

describe('toDbNumeric', () => {
  it('always emits two decimals', () => {
    expect(toDbNumeric('125000')).toBe('125000.00')
    expect(toDbNumeric(0)).toBe('0.00')
    expect(toDbNumeric('-45000.5')).toBe('-45000.50')
  })

  it('rounds half up', () => {
    expect(toDbNumeric('10.005')).toBe('10.01')
    expect(toDbNumeric('10.004')).toBe('10.00')
  })

  it('keeps billions intact', () => {
    expect(toDbNumeric('1234567890.129')).toBe('1234567890.13')
  })
})

describe('formatMNT', () => {
  it('formats whole amounts without decimals', () => {
    expect(formatMNT('125000')).toBe('₮ 125,000')
    expect(formatMNT(0)).toBe('₮ 0')
  })

  it('shows cents only when they exist', () => {
    expect(formatMNT('125000.5')).toBe('₮ 125,000.50')
    expect(formatMNT('125000', { forceDecimals: true })).toBe('₮ 125,000.00')
  })

  it('prefixes negative amounts', () => {
    expect(formatMNT('-125000')).toBe('-₮ 125,000')
  })

  it('formats billions with grouping', () => {
    expect(formatMNT('1234567890.12')).toBe('₮ 1,234,567,890.12')
  })

  it('accepts a Decimal instance', () => {
    expect(formatMNT(new Decimal('45000'))).toBe('₮ 45,000')
  })
})

describe('formatPct', () => {
  it('renders one fraction digit by default', () => {
    expect(formatPct(marginPct('60000', '150000'))).toBe('60.0%')
    expect(formatPct(0)).toBe('0.0%')
  })
})
