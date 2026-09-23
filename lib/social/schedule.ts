import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

import { TIME_ZONE } from '@/lib/analytics/ranges'

/** Facebook refuses a scheduled time closer than ten minutes. */
export const MIN_SCHEDULE_LEAD_MS = 10 * 60 * 1000
/** …or further out than six months. */
export const MAX_SCHEDULE_LEAD_MS = 180 * 24 * 60 * 60 * 1000

/**
 * The admin picks a date and time in Ulaanbaatar; Meta wants unix seconds UTC.
 * Doing this by hand is where scheduling bugs come from, so it lives here.
 */
export function ulaanbaatarToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date} ${time}`, TIME_ZONE)
}

export function utcToUlaanbaatarFields(value: Date | string): { date: string; time: string } {
  const zoned = toZonedTime(typeof value === 'string' ? new Date(value) : value, TIME_ZONE)
  return { date: format(zoned, 'yyyy-MM-dd'), time: format(zoned, 'HH:mm') }
}

export function toUnixSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000)
}

export type ScheduleCheck = { ok: true } | { ok: false; reason: string }

/** Meta's own window, checked before we bother calling the API. */
export function checkScheduleWindow(scheduledAt: Date, now: Date = new Date()): ScheduleCheck {
  const lead = scheduledAt.getTime() - now.getTime()

  if (Number.isNaN(lead)) return { ok: false, reason: 'Огноо буруу байна' }
  if (lead < MIN_SCHEDULE_LEAD_MS) {
    return { ok: false, reason: 'Товлосон цаг одооноос хамгийн багадаа 10 минутын дараа байх ёстой' }
  }
  if (lead > MAX_SCHEDULE_LEAD_MS) {
    return { ok: false, reason: 'Товлосон цаг одооноос 6 сараас хол байж болохгүй' }
  }

  return { ok: true }
}
