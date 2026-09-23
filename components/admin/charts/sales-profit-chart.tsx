'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/admin/charts/chart-tooltip'
import { VIZ_GRID, seriesColor } from '@/components/admin/charts/chart-tokens'
import { bucketLabel, compactMnt } from '@/components/admin/charts/format'

export type SalesProfitPoint = {
  bucket: string
  revenue: number
  grossProfit: number
}

/**
 * Two measures, one axis: both are MNT, so they share a scale. A second y-axis
 * would let the shapes lie about each other.
 */
export function SalesProfitChart({
  data,
  grouping,
}: {
  data: SalesProfitPoint[]
  grouping: 'day' | 'week' | 'month'
}) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Өгөгдөл алга.</p>
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: seriesColor(0) }}
          />
          Борлуулалт
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: seriesColor(1) }}
          />
          Бохир ашиг
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={VIZ_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickFormatter={(value: string) => bucketLabel(value, grouping)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            minTickGap={16}
          />
          <YAxis
            tickFormatter={compactMnt}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            width={56}
          />
          <Tooltip
            cursor={{ stroke: VIZ_GRID, strokeWidth: 1 }}
            content={
              <ChartTooltip labelFormatter={(value) => bucketLabel(String(value), grouping)} />
            }
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Борлуулалт"
            stroke={seriesColor(0)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="grossProfit"
            name="Бохир ашиг"
            stroke={seriesColor(1)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  )
}
