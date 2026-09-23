'use server'

import { z } from 'zod'

import { actionError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { toCsv } from '@/lib/analytics/csv'
import { buildSummary, sumPeriods } from '@/lib/analytics/profit'
import {
  getProfitByMonth,
  getSalesSeries,
  getVariantReport,
} from '@/server/queries/analytics'

const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const bucketSchema = z.enum(['day', 'week', 'month'])

export type CsvPayload = { csv: string; filename: string }

/** Profit and loss, one column per month plus a total. */
export async function exportProfitCsv(input: unknown): Promise<ActionResult<CsvPayload>> {
  await requireUser()

  const parsed = rangeSchema.safeParse(input)
  if (!parsed.success) return actionError('Хугацааны муж буруу байна')

  const months = await getProfitByMonth(parsed.data)
  const total = sumPeriods(months)

  const rows = months.map((month) => {
    const summary = buildSummary(month)
    return [
      month.month.slice(0, 7),
      summary.revenue.toFixed(2),
      summary.cogs.toFixed(2),
      summary.grossProfit.toFixed(2),
      summary.grossMarginPct.toDecimalPlaces(1).toString(),
      summary.expenses.toFixed(2),
      summary.netProfit.toFixed(2),
      summary.netMarginPct.toDecimalPlaces(1).toString(),
      summary.orderCount,
    ]
  })

  rows.push([
    'Нийт',
    total.revenue.toFixed(2),
    total.cogs.toFixed(2),
    total.grossProfit.toFixed(2),
    total.grossMarginPct.toDecimalPlaces(1).toString(),
    total.expenses.toFixed(2),
    total.netProfit.toFixed(2),
    total.netMarginPct.toDecimalPlaces(1).toString(),
    total.orderCount,
  ])

  return {
    ok: true,
    data: {
      csv: toCsv(
        [
          'Сар',
          'Борлуулалтын орлого',
          'Борлуулсан барааны өртөг',
          'Бохир ашиг',
          'Бохир ашгийн %',
          'Үйл ажиллагааны зардал',
          'Цэвэр ашиг',
          'Цэвэр ашгийн %',
          'Захиалгын тоо',
        ],
        rows,
      ),
      filename: `cora-ashgiin-tailan-${parsed.data.from}-${parsed.data.to}.csv`,
    },
  }
}

export async function exportVariantCsv(input: unknown): Promise<ActionResult<CsvPayload>> {
  await requireUser()

  const parsed = rangeSchema.safeParse(input)
  if (!parsed.success) return actionError('Хугацааны муж буруу байна')

  const rows = await getVariantReport(parsed.data)

  return {
    ok: true,
    data: {
      csv: toCsv(
        ['Бараа', 'Хувилбар', 'SKU', 'Зарагдсан', 'Орлого', 'Өртөг', 'Бохир ашиг', 'Ашгийн %'],
        rows.map((row) => [
          row.product_name,
          row.variant_label,
          row.sku ?? '',
          row.units_sold,
          row.revenue,
          row.cogs,
          row.gross_profit,
          row.margin_pct,
        ]),
      ),
      filename: `cora-baraagaar-${parsed.data.from}-${parsed.data.to}.csv`,
    },
  }
}

export async function exportSeriesCsv(input: unknown): Promise<ActionResult<CsvPayload>> {
  await requireUser()

  const parsed = rangeSchema.extend({ bucket: bucketSchema }).safeParse(input)
  if (!parsed.success) return actionError('Хугацааны муж буруу байна')

  const rows = await getSalesSeries(
    { from: parsed.data.from, to: parsed.data.to },
    parsed.data.bucket,
  )

  return {
    ok: true,
    data: {
      csv: toCsv(
        ['Огноо', 'Орлого', 'Өртөг', 'Бохир ашиг', 'Захиалга', 'Ширхэг'],
        rows.map((row) => [
          row.bucket,
          row.revenue,
          row.cogs,
          row.gross_profit,
          row.order_count,
          row.unit_count,
        ]),
      ),
      filename: `cora-hugatsaagaar-${parsed.data.from}-${parsed.data.to}.csv`,
    },
  }
}
