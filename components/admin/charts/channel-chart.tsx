'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartTooltip } from '@/components/admin/charts/chart-tooltip'
import { VIZ_GRID, seriesColor } from '@/components/admin/charts/chart-tokens'
import { compactMnt } from '@/components/admin/charts/format'

export type ChannelPoint = {
  channel: string
  revenue: number
}

/** One measure per bar, so identity comes from the axis, not from colour. */
export function ChannelChart({ data }: { data: ChannelPoint[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Өгөгдөл алга.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={VIZ_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="channel"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis
          tickFormatter={compactMnt}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          width={56}
        />
        <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
        <Bar dataKey="revenue" name="Борлуулалт" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.channel} fill={seriesColor(0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
