import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

export const TIME_ZONE = 'Asia/Ulaanbaatar'

export const RANGE_PRESETS = [
  'today',
  '7d',
  '30d',
  'this_month',
  'last_month',
  'custom',
] as const

export type RangePreset = (typeof RANGE_PRESETS)[number]

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  today: 'Өнөөдөр',
  '7d': '7 хоног',
  '30d': '30 хоног',
  this_month: 'Энэ сар',
  last_month: 'Өнгөрсөн сар',
  custom: 'Захиалгат',
}

export type DateRange = {
  /** yyyy-MM-dd, inclusive. */
  from: string
  /** yyyy-MM-dd, inclusive. */
  to: string
  preset: RangePreset
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isRangePreset(value: string): value is RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(value)
}

function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Today by the Ulaanbaatar calendar, not the server's. */
export function todayInTimeZone(): string {
  return formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd')
}

export function resolveRange(
  preset: string | undefined,
  from?: string,
  to?: string,
): DateRange {
  const today = parseISO(todayInTimeZone())
  const chosen: RangePreset = preset && isRangePreset(preset) ? preset : '30d'

  if (chosen === 'custom') {
    const validFrom = from && ISO_DATE.test(from) ? from : toIso(subDays(today, 29))
    const validTo = to && ISO_DATE.test(to) ? to : toIso(today)

    // Guard against a range the user typed backwards.
    return validFrom <= validTo
      ? { from: validFrom, to: validTo, preset: 'custom' }
      : { from: validTo, to: validFrom, preset: 'custom' }
  }

  switch (chosen) {
    case 'today':
      return { from: toIso(today), to: toIso(today), preset: chosen }
    case '7d':
      return { from: toIso(subDays(today, 6)), to: toIso(today), preset: chosen }
    case 'this_month':
      return { from: toIso(startOfMonth(today)), to: toIso(today), preset: chosen }
    case 'last_month': {
      const lastMonth = subMonths(today, 1)
      return {
        from: toIso(startOfMonth(lastMonth)),
        to: toIso(endOfMonth(lastMonth)),
        preset: chosen,
      }
    }
    default:
      return { from: toIso(subDays(today, 29)), to: toIso(today), preset: '30d' }
  }
}

/** The equally long window ending the day before this one starts. */
export function previousRange(range: DateRange): { from: string; to: string } {
  const from = parseISO(range.from)
  const to = parseISO(range.to)
  const length = differenceInCalendarDays(to, from) + 1

  const previousTo = subDays(from, 1)
  const previousFrom = addDays(previousTo, -(length - 1))

  return { from: toIso(previousFrom), to: toIso(previousTo) }
}

export function rangeLengthDays(range: { from: string; to: string }): number {
  return differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1
}

/** 'day' for short windows, 'week' up to a quarter, 'month' beyond. */
export function bucketFor(range: { from: string; to: string }): 'day' | 'week' | 'month' {
  const days = rangeLengthDays(range)
  if (days <= 62) return 'day'
  if (days <= 186) return 'week'
  return 'month'
}
