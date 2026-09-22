import Decimal from 'decimal.js'

// Money is stored as numeric(14,2) in Postgres and never handled as a float.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export type MoneyInput = string | number | Decimal | null | undefined

export const MONEY_SCALE = 2
export const CURRENCY_SYMBOL = '₮'

/**
 * Turns any supported input into a Decimal. Invalid or empty input becomes 0
 * so that form fields never blow up the calculation chain.
 */
export function parseMoney(input: MoneyInput): Decimal {
  if (input === null || input === undefined) return new Decimal(0)
  if (input instanceof Decimal) return input.isFinite() ? input : new Decimal(0)

  if (typeof input === 'number') {
    return Number.isFinite(input) ? new Decimal(input) : new Decimal(0)
  }

  // Accept "125,000.50", "₮ 125 000", "(1000)" style input from the money field.
  const normalized = input
    .replace(/ /g, ' ')
    .replace(CURRENCY_SYMBOL, '')
    .replace(/\s/g, '')
    .replace(/,/g, '')
    .trim()

  if (normalized === '' || normalized === '-' || normalized === '.') return new Decimal(0)

  try {
    const value = new Decimal(normalized)
    return value.isFinite() ? value : new Decimal(0)
  } catch {
    return new Decimal(0)
  }
}

export function add(a: MoneyInput, b: MoneyInput): Decimal {
  return parseMoney(a).plus(parseMoney(b))
}

export function sub(a: MoneyInput, b: MoneyInput): Decimal {
  return parseMoney(a).minus(parseMoney(b))
}

export function mul(a: MoneyInput, b: MoneyInput): Decimal {
  return parseMoney(a).times(parseMoney(b))
}

/** Division by zero returns 0 instead of Infinity or NaN. */
export function div(a: MoneyInput, b: MoneyInput): Decimal {
  const divisor = parseMoney(b)
  if (divisor.isZero()) return new Decimal(0)
  return parseMoney(a).div(divisor)
}

/** part / whole as a percentage. Zero whole returns 0. */
export function percentage(part: MoneyInput, whole: MoneyInput): Decimal {
  const total = parseMoney(whole)
  if (total.isZero()) return new Decimal(0)
  return parseMoney(part).div(total).times(100)
}

/** Profit margin on the sale price: (price - cost) / price * 100. */
export function marginPct(cost: MoneyInput, price: MoneyInput): Decimal {
  const salePrice = parseMoney(price)
  if (salePrice.isZero()) return new Decimal(0)
  return salePrice.minus(parseMoney(cost)).div(salePrice).times(100)
}

/** Value ready for a numeric(14,2) column: a plain string, always 2 decimals. */
export function toDbNumeric(value: MoneyInput): string {
  return parseMoney(value).toFixed(MONEY_SCALE, Decimal.ROUND_HALF_UP)
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * "₮ 125,000" for whole amounts, "₮ 125,000.50" when there are cents.
 * Negative amounts render as "-₮ 125,000".
 */
export function formatMNT(value: MoneyInput, options?: { forceDecimals?: boolean }): string {
  const amount = parseMoney(value)
  const rounded = new Decimal(amount.toFixed(MONEY_SCALE, Decimal.ROUND_HALF_UP))
  const isNegative = rounded.isNegative() && !rounded.isZero()
  const absolute = rounded.abs()

  const fixed = absolute.toFixed(MONEY_SCALE)
  const [whole = '0', cents = '00'] = fixed.split('.')
  const showCents = options?.forceDecimals === true || cents !== '00'
  const body = showCents ? `${groupThousands(whole)}.${cents}` : groupThousands(whole)

  return `${isNegative ? '-' : ''}${CURRENCY_SYMBOL} ${body}`
}

/** "42.5%" for margin and share labels. */
export function formatPct(value: MoneyInput, fractionDigits = 1): string {
  return `${parseMoney(value).toFixed(fractionDigits, Decimal.ROUND_HALF_UP)}%`
}

export { Decimal }
