import Link from 'next/link'
import Decimal from 'decimal.js'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import { RangePicker } from '@/components/admin/dashboard/range-picker'
import { ChartShell } from '@/components/admin/charts/chart-shell'
import { ChannelChart } from '@/components/admin/charts/channel-chart'
import { ExpenseDonut } from '@/components/admin/charts/expense-donut'
import { SalesProfitChart } from '@/components/admin/charts/sales-profit-chart'
import { TopProductsChart } from '@/components/admin/charts/top-products-chart'
import { buildSummary, percentChange } from '@/lib/analytics/profit'
import { bucketFor, previousRange, resolveRange } from '@/lib/analytics/ranges'
import { formatMNT } from '@/lib/money'
import { ORDER_CHANNEL_LABELS, isOrderChannel } from '@/lib/orders'
import {
  getExpensesByCategory,
  getLowStock,
  getProfitReport,
  getSalesByChannel,
  getSalesSeries,
  getTopProducts,
} from '@/server/queries/analytics'

export const metadata = { title: 'Хяналтын самбар — Cora' }

/** Slot 9 is never a new hue: the tail folds into one "Бусад" slice. */
const MAX_DONUT_SLICES = 7

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const range = resolveRange(params.preset, params.from, params.to)
  const previous = previousRange(range)
  const grouping = bucketFor(range)

  const [report, previousReport, series, channels, topProducts, expenses, lowStock] =
    await Promise.all([
      getProfitReport(range),
      getProfitReport(previous),
      getSalesSeries(range, grouping),
      getSalesByChannel(range),
      getTopProducts(range, 10),
      getExpensesByCategory(range),
      getLowStock(5),
    ])

  const current = buildSummary(report)
  const before = buildSummary(previousReport)

  const seriesPoints = series.map((point) => ({
    bucket: point.bucket,
    revenue: Number(point.revenue),
    grossProfit: Number(point.gross_profit),
  }))

  const channelPoints = channels.map((row) => ({
    channel: isOrderChannel(row.channel) ? ORDER_CHANNEL_LABELS[row.channel] : row.channel,
    revenue: Number(row.revenue),
  }))

  const topProductPoints = topProducts
    .filter((row) => Number(row.gross_profit) !== 0)
    .map((row) => ({ name: row.product_name, grossProfit: Number(row.gross_profit) }))

  const head = expenses.slice(0, MAX_DONUT_SLICES)
  const tail = expenses.slice(MAX_DONUT_SLICES)
  const expenseSlices = [
    ...head.map((row) => ({ category: row.category, total: Number(row.total) })),
    ...(tail.length > 0
      ? [
          {
            category: 'Бусад',
            total: tail
              .reduce((total, row) => total.plus(new Decimal(row.total)), new Decimal(0))
              .toNumber(),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Хяналтын самбар"
        description={`${range.from} — ${range.to} · өмнөх ${previous.from} — ${previous.to}-тай харьцуулав`}
      />

      <RangePicker />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Нийт борлуулалт"
          value={formatMNT(current.revenue)}
          changePct={percentChange(current.revenue, before.revenue)}
          hint="өмнөх хугацаанаас"
        />
        <StatCard
          label="Бохир ашиг"
          value={formatMNT(current.grossProfit)}
          changePct={percentChange(current.grossProfit, before.grossProfit)}
          hint={`ашгийн ${current.grossMarginPct.toDecimalPlaces(1).toString()}%`}
        />
        <StatCard
          label="Цэвэр ашиг"
          value={formatMNT(current.netProfit)}
          changePct={percentChange(current.netProfit, before.netProfit)}
          hint={`зардал ${formatMNT(current.expenses)}`}
        />
        <StatCard
          label="Захиалгын тоо"
          value={String(current.orderCount)}
          changePct={percentChange(current.orderCount, before.orderCount)}
          hint={`дундаж ${formatMNT(current.averageOrderValue)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ChartShell
            title="Борлуулалт ба бохир ашиг"
            note={grouping === 'day' ? 'Өдрөөр' : grouping === 'week' ? '7 хоногоор' : 'Сараар'}
          >
            <SalesProfitChart data={seriesPoints} grouping={grouping} />
          </ChartShell>
        </div>

        <ChartShell title="Суваг тус бүрийн борлуулалт">
          <ChannelChart data={channelPoints} />
        </ChartShell>

        <ChartShell title="Зардал ангиллаар">
          <ExpenseDonut data={expenseSlices} />
        </ChartShell>

        <div className="lg:col-span-2">
          <ChartShell title="Хамгийн ашигтай 10 бараа" note="Бохир ашгаар эрэмбэлсэн">
            <TopProductsChart data={topProductPoints} />
          </ChartShell>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Бага нөөцтэй бараа</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Бараа</TableHead>
                <TableHead>Хувилбар</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Нөөц</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    Бага нөөцтэй бараа алга.
                  </TableCell>
                </TableRow>
              ) : (
                lowStock.map((row) => (
                  <TableRow key={row.variant_id}>
                    <TableCell>
                      <Link
                        href={`/admin/inventory/${row.variant_id}`}
                        className="font-medium hover:underline"
                      >
                        {row.product_name}
                      </Link>
                    </TableCell>
                    <TableCell>{row.variant_label || 'Үндсэн'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.sku ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium text-destructive tabular-nums">
                      {row.current_stock}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
