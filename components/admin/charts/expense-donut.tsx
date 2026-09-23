'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { ChartTooltip } from '@/components/admin/charts/chart-tooltip'
import { seriesColor } from '@/components/admin/charts/chart-tokens'
import { formatMNT, percentage } from '@/lib/money'

export type ExpenseSlice = {
  category: string
  total: number
}

/**
 * Categories in fixed slot order. The legend carries the values in text ink,
 * which is the relief the palette's contrast warning requires.
 */
export function ExpenseDonut({ data }: { data: ExpenseSlice[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Зардал бүртгэгдээгүй.</p>
  }

  const total = data.reduce((sum, slice) => sum + slice.total, 0)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius={52}
            outerRadius={84}
            paddingAngle={2}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {data.map((slice, index) => (
              <Cell key={slice.category} fill={seriesColor(index)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="flex-1 space-y-1.5 text-sm">
        {data.map((slice, index) => (
          <li key={slice.category} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seriesColor(index) }}
            />
            <span className="min-w-0 truncate text-muted-foreground">{slice.category}</span>
            <span className="ml-auto shrink-0 tabular-nums">{formatMNT(slice.total)}</span>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {percentage(slice.total, total).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
