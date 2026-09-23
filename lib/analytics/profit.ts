import Decimal from 'decimal.js'

import { parseMoney, type MoneyInput } from '@/lib/money'

/**
 * Calculation rules for every report. The aggregation itself runs in Postgres
 * (see supabase/migrations/*_analytics.sql); these pure functions derive the
 * numbers on top of it.
 *
 * Rules the SQL and this module both hold to:
 *   - COGS comes from order_items.unit_cost, the snapshot taken at save time,
 *     never from the variant's current cost
 *   - only confirmed, delivered and returned orders count; cancelled and
 *     pending never do, and returned counts negatively
 *   - expenses belong to the period of their expense_date
 *   - every number is decimal.js, never a float
 *   - dividing by zero yields zero, never NaN or Infinity
 */

/** One row as fn_profit_report / fn_profit_by_month returns it. */
export type ProfitReportRow = {
  revenue: MoneyInput
  cogs: MoneyInput
  gross_profit?: MoneyInput
  expenses: MoneyInput
  net_profit?: MoneyInput
  order_count?: number
  unit_count?: number
}

export type ProfitSummary = {
  revenue: Decimal
  cogs: Decimal
  grossProfit: Decimal
  expenses: Decimal
  netProfit: Decimal
  /** grossProfit / revenue x 100 */
  grossMarginPct: Decimal
  /** netProfit / revenue x 100 */
  netMarginPct: Decimal
  orderCount: number
  unitCount: number
  /** revenue / orderCount */
  averageOrderValue: Decimal
}

const ZERO = new Decimal(0)

/** Division that returns 0 instead of NaN or Infinity. */
function ratioPct(part: Decimal, whole: Decimal): Decimal {
  if (whole.isZero()) return ZERO
  return part.div(whole).times(100)
}

export function buildSummary(row: ProfitReportRow): ProfitSummary {
  const revenue = parseMoney(row.revenue)
  const cogs = parseMoney(row.cogs)
  const expenses = parseMoney(row.expenses)

  const grossProfit =
    row.gross_profit === undefined ? revenue.minus(cogs) : parseMoney(row.gross_profit)
  const netProfit =
    row.net_profit === undefined ? grossProfit.minus(expenses) : parseMoney(row.net_profit)

  const orderCount = Number.isFinite(row.order_count) ? Number(row.order_count) : 0
  const unitCount = Number.isFinite(row.unit_count) ? Number(row.unit_count) : 0

  return {
    revenue,
    cogs,
    grossProfit,
    expenses,
    netProfit,
    grossMarginPct: ratioPct(grossProfit, revenue),
    netMarginPct: ratioPct(netProfit, revenue),
    orderCount,
    unitCount,
    averageOrderValue: orderCount === 0 ? ZERO : revenue.div(orderCount),
  }
}

export const EMPTY_SUMMARY: ProfitSummary = buildSummary({
  revenue: 0,
  cogs: 0,
  expenses: 0,
  order_count: 0,
  unit_count: 0,
})

/** Total column of a month by month report. */
export function sumPeriods(rows: ProfitReportRow[]): ProfitSummary {
  type Totals = {
    revenue: Decimal
    cogs: Decimal
    expenses: Decimal
    orderCount: number
    unitCount: number
  }

  const totals = rows.reduce<Totals>(
    (accumulator, row) => {
      const summary = buildSummary(row)
      return {
        revenue: accumulator.revenue.plus(summary.revenue),
        cogs: accumulator.cogs.plus(summary.cogs),
        expenses: accumulator.expenses.plus(summary.expenses),
        orderCount: accumulator.orderCount + summary.orderCount,
        unitCount: accumulator.unitCount + summary.unitCount,
      }
    },
    { revenue: ZERO, cogs: ZERO, expenses: ZERO, orderCount: 0, unitCount: 0 },
  )

  return buildSummary({
    revenue: totals.revenue,
    cogs: totals.cogs,
    expenses: totals.expenses,
    order_count: totals.orderCount,
    unit_count: totals.unitCount,
  })
}

/**
 * Change against the previous period, in percent. Returns null when there is no
 * baseline to compare against, so the UI can leave the arrow out entirely
 * instead of showing a meaningless +100%.
 */
export function percentChange(current: MoneyInput, previous: MoneyInput): number | null {
  const now = parseMoney(current)
  const before = parseMoney(previous)

  if (before.isZero()) return now.isZero() ? 0 : null

  return now.minus(before).div(before.abs()).times(100).toDecimalPlaces(1).toNumber()
}
