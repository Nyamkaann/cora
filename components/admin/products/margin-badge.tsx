import { cn } from '@/lib/utils'

/** Red below 20%, amber 20-40%, green above 40%. */
export function marginTone(marginPct: number): string {
  if (marginPct < 20) return 'text-red-600'
  if (marginPct <= 40) return 'text-amber-600'
  return 'text-emerald-600'
}

export function MarginBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('font-medium tabular-nums', marginTone(value), className)}>
      {value.toFixed(1)}%
    </span>
  )
}
