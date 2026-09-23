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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/admin/page-header'
import { RangePicker } from '@/components/admin/dashboard/range-picker'
import { BucketToggle } from '@/components/admin/analytics/bucket-toggle'
import { CsvButton } from '@/components/admin/analytics/csv-button'
import { VariantReportTable } from '@/components/admin/analytics/variant-report-table'
import { ChartShell } from '@/components/admin/charts/chart-shell'
import { SalesProfitChart } from '@/components/admin/charts/sales-profit-chart'
import { buildSummary, sumPeriods } from '@/lib/analytics/profit'
import { bucketFor, resolveRange } from '@/lib/analytics/ranges'
import { formatMNT } from '@/lib/money'
import { exportProfitCsv, exportSeriesCsv, exportVariantCsv } from '@/server/actions/reports'
import {
  getExpensesByCategoryMonth,
  getProfitByMonth,
  getSalesSeries,
  getVariantReport,
} from '@/server/queries/analytics'

export const metadata = { title: 'Ашиг орлого — Cora' }

function monthLabel(month: string): string {
  return month.slice(0, 7)
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; bucket?: string }>
}) {
  const params = await searchParams
  const range = resolveRange(params.preset, params.from, params.to)
  const bucket =
    params.bucket === 'day' || params.bucket === 'week' || params.bucket === 'month'
      ? params.bucket
      : bucketFor(range)

  const [months, expenseByMonth, variants, series] = await Promise.all([
    getProfitByMonth(range),
    getExpensesByCategoryMonth(range),
    getVariantReport(range),
    getSalesSeries(range, bucket),
  ])

  const summaries = months.map((month) => ({ month: month.month, summary: buildSummary(month) }))
  const total = sumPeriods(months)

  const categories = [...new Set(expenseByMonth.map((row) => row.category))].sort()
  const expenseLookup = new Map(
    expenseByMonth.map((row) => [`${row.month}|${row.category}`, row.total]),
  )

  const seriesPoints = series.map((point) => ({
    bucket: point.bucket,
    revenue: Number(point.revenue),
    grossProfit: Number(point.gross_profit),
  }))

  const csvRange = { from: range.from, to: range.to }

  return (
    <>
      <PageHeader title="Ашиг орлого" description={`${range.from} — ${range.to}`} />
      <RangePicker />

      <Tabs defaultValue="profit">
        <TabsList>
          <TabsTrigger value="profit">Ашгийн тайлан</TabsTrigger>
          <TabsTrigger value="products">Бараагаар</TabsTrigger>
          <TabsTrigger value="time">Хугацаагаар</TabsTrigger>
        </TabsList>

        <TabsContent value="profit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Ашгийн тайлан</CardTitle>
              <CsvButton action={exportProfitCsv.bind(null, csvRange)} />
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Үзүүлэлт</TableHead>
                    {summaries.map((entry) => (
                      <TableHead key={entry.month} className="text-right">
                        {monthLabel(entry.month)}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Нийт</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Борлуулалтын орлого</TableCell>
                    {summaries.map((entry) => (
                      <TableCell key={entry.month} className="text-right tabular-nums">
                        {formatMNT(entry.summary.revenue)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMNT(total.revenue)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>− Борлуулсан барааны өртөг</TableCell>
                    {summaries.map((entry) => (
                      <TableCell key={entry.month} className="text-right tabular-nums">
                        {formatMNT(entry.summary.cogs)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMNT(total.cogs)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-t-2">
                    <TableCell className="font-medium">= Бохир ашиг</TableCell>
                    {summaries.map((entry) => (
                      <TableCell key={entry.month} className="text-right font-medium tabular-nums">
                        {formatMNT(entry.summary.grossProfit)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({entry.summary.grossMarginPct.toDecimalPlaces(1).toString()}%)
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMNT(total.grossProfit)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({total.grossMarginPct.toDecimalPlaces(1).toString()}%)
                      </span>
                    </TableCell>
                  </TableRow>

                  {categories.map((category) => (
                    <TableRow key={category}>
                      <TableCell className="pl-8 text-muted-foreground">− {category}</TableCell>
                      {summaries.map((entry) => (
                        <TableCell
                          key={entry.month}
                          className="text-right text-muted-foreground tabular-nums"
                        >
                          {formatMNT(expenseLookup.get(`${entry.month}|${category}`) ?? '0')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatMNT(
                          expenseByMonth
                            .filter((row) => row.category === category)
                            .reduce((sum, row) => sum.plus(new Decimal(row.total)), new Decimal(0)),
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow>
                    <TableCell>− Үйл ажиллагааны зардал</TableCell>
                    {summaries.map((entry) => (
                      <TableCell key={entry.month} className="text-right tabular-nums">
                        {formatMNT(entry.summary.expenses)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMNT(total.expenses)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">= Цэвэр ашиг</TableCell>
                    {summaries.map((entry) => (
                      <TableCell
                        key={entry.month}
                        className="text-right font-semibold tabular-nums"
                      >
                        {formatMNT(entry.summary.netProfit)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({entry.summary.netMarginPct.toDecimalPlaces(1).toString()}%)
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMNT(total.netProfit)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({total.netMarginPct.toDecimalPlaces(1).toString()}%)
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Бараа, хувилбараар</CardTitle>
              <CsvButton action={exportVariantCsv.bind(null, csvRange)} />
            </CardHeader>
            <CardContent>
              <VariantReportTable rows={variants} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BucketToggle current={bucket} />
              <CsvButton action={exportSeriesCsv.bind(null, { ...csvRange, bucket })} />
            </div>

            <ChartShell title="Борлуулалт ба бохир ашиг">
              <SalesProfitChart data={seriesPoints} grouping={bucket} />
            </ChartShell>

            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Огноо</TableHead>
                      <TableHead className="text-right">Орлого</TableHead>
                      <TableHead className="text-right">Өртөг</TableHead>
                      <TableHead className="text-right">Бохир ашиг</TableHead>
                      <TableHead className="text-right">Захиалга</TableHead>
                      <TableHead className="text-right">Ширхэг</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {series.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                          Энэ хугацаанд борлуулалт алга.
                        </TableCell>
                      </TableRow>
                    ) : (
                      series.map((point) => (
                        <TableRow key={point.bucket}>
                          <TableCell>{point.bucket}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMNT(point.revenue)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMNT(point.cogs)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMNT(point.gross_profit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {point.order_count}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {point.unit_count}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
