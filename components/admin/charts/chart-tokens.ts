/**
 * Categorical slots in fixed order, never cycled. Values come from the
 * validated palette in app/globals.css.
 */
export const VIZ_SERIES = [
  'var(--viz-1)',
  'var(--viz-2)',
  'var(--viz-3)',
  'var(--viz-4)',
  'var(--viz-5)',
  'var(--viz-6)',
  'var(--viz-7)',
  'var(--viz-8)',
] as const

export const VIZ_GRID = 'var(--viz-grid)'
export const VIZ_AXIS_TEXT = 'var(--muted-foreground)'

/** A ninth category is never a new hue: it folds into "Бусад". */
export function seriesColor(index: number): string {
  return VIZ_SERIES[Math.min(index, VIZ_SERIES.length - 1)] as string
}
