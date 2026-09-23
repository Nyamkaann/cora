'use client'

import { formatMNT } from '@/lib/money'

type Entry = {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

/**
 * Shared tooltip. Values wear text tokens; the colored dot beside a row is what
 * carries series identity.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean
  payload?: Entry[]
  label?: string | number
  labelFormatter?: (value: string | number) => string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined ? (
        <p className="mb-1 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, index) => (
          <li key={`${entry.dataKey ?? index}`} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {formatMNT(typeof entry.value === 'number' ? entry.value : String(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
