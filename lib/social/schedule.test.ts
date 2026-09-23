import { describe, expect, it } from 'vitest'

import {
  checkScheduleWindow,
  toUnixSeconds,
  ulaanbaatarToUtc,
  utcToUlaanbaatarFields,
} from './schedule'

describe('ulaanbaatarToUtc', () => {
  it('shifts Ulaanbaatar time back by eight hours', () => {
    // Mongolia is UTC+8 and has not observed DST since 2016.
    const utc = ulaanbaatarToUtc('2026-09-23', '18:00')
    expect(utc.toISOString()).toBe('2026-09-23T10:00:00.000Z')
  })

  it('rolls back to the previous day before 08:00', () => {
    const utc = ulaanbaatarToUtc('2026-09-23', '07:30')
    expect(utc.toISOString()).toBe('2026-09-22T23:30:00.000Z')
  })

  it('handles midnight', () => {
    expect(ulaanbaatarToUtc('2026-01-01', '00:00').toISOString()).toBe('2025-12-31T16:00:00.000Z')
  })

  it('round trips back to the same local fields', () => {
    const utc = ulaanbaatarToUtc('2026-09-23', '18:45')
    expect(utcToUlaanbaatarFields(utc)).toEqual({ date: '2026-09-23', time: '18:45' })
  })
})

describe('toUnixSeconds', () => {
  it('drops milliseconds', () => {
    expect(toUnixSeconds(new Date('2026-09-23T10:00:00.750Z'))).toBe(1790157600)
  })
})

describe('checkScheduleWindow', () => {
  const now = new Date('2026-09-23T10:00:00.000Z')

  it('accepts a time comfortably inside the window', () => {
    expect(checkScheduleWindow(new Date('2026-09-23T12:00:00.000Z'), now)).toEqual({ ok: true })
  })

  it('rejects a time less than ten minutes away', () => {
    const result = checkScheduleWindow(new Date('2026-09-23T10:05:00.000Z'), now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('10 минут')
  })

  it('rejects a time in the past', () => {
    expect(checkScheduleWindow(new Date('2026-09-23T09:00:00.000Z'), now).ok).toBe(false)
  })

  it('accepts exactly ten minutes out', () => {
    expect(checkScheduleWindow(new Date('2026-09-23T10:10:00.000Z'), now)).toEqual({ ok: true })
  })

  it('rejects a time beyond six months', () => {
    const result = checkScheduleWindow(new Date('2027-09-23T10:00:00.000Z'), now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('6 сар')
  })

  it('rejects an invalid date', () => {
    expect(checkScheduleWindow(new Date('nonsense'), now).ok).toBe(false)
  })
})
