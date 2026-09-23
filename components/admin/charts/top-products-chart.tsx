'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartTooltip } from '@/components/admin/charts/chart-tooltip'
import { VIZ_GRID, seriesColor } from '@/components/admin/charts/chart-tokens'
import { compactMnt } from '@/components/admin/charts/format'

export type TopProductPoint = {
  name: string
  grossProfit: number
}

/** Ranked magnitude reads best horizontally: the long names get room. */
export function TopProductsChart({ data }: { data: TopProductPoint[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Өгөгдөл алга.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke={VIZ_GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={compactMnt}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          width={140}
        />
        <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
        <Bar
          dataKey="grossProfit"
          name="Бохир ашиг"
          fill={seriesColor(0)}
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
