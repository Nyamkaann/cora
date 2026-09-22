import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  hint,
  changePct,
}: {
  label: string
  value: string
  hint?: string
  /** Change against the previous period, already computed on the server. */
  changePct?: number | null
}) {
  const hasChange = typeof changePct === 'number' && Number.isFinite(changePct)
  const isUp = hasChange && changePct >= 0

  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {hasChange ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                isUp ? 'text-emerald-600' : 'text-destructive',
              )}
            >
              {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(changePct).toFixed(1)}%
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
