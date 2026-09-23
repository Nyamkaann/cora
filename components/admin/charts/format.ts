import { formatMNT } from '@/lib/money'

/** Axis ticks: "1.2сая" / "450мян", so long MNT numbers stay readable. */
export function compactMnt(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}сая`
  if (absolute >= 1_000) return `${Math.round(value / 1_000)}мян`
  return String(Math.round(value))
}

export function tooltipMnt(value: number | string): string {
  return formatMNT(typeof value === 'number' ? value : String(value))
}

/** "09-22" for daily buckets, "2026-09" for monthly ones. */
export function bucketLabel(bucket: string, grouping: 'day' | 'week' | 'month'): string {
  if (grouping === 'month') return bucket.slice(0, 7)
  return bucket.slice(5)
}
