import { describe, expect, it, vi } from 'vitest'
import {
  availablePickupTimesForDate,
  isPickupDatetimeInFuture,
  snapPickupSchedule,
  validatePickupSchedule,
} from '@/utils/bookingPickupValidation'
import { todayIsoDate } from '@/utils/validators'

describe('validatePickupSchedule', () => {
  it('rejects a time earlier today when now is late evening', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22, 23, 0, 0))
    const today = todayIsoDate()
    expect(validatePickupSchedule(today, '10:00')).toMatch(/30 minutes/)
    vi.useRealTimers()
  })

  it('accepts a slot at least 30 minutes ahead today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22, 10, 0, 0))
    const today = todayIsoDate()
    expect(validatePickupSchedule(today, '10:30')).toBeNull()
    vi.useRealTimers()
  })
})

describe('availablePickupTimesForDate', () => {
  it('omits past slots on today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22, 23, 0, 0))
    const today = todayIsoDate()
    const slots = availablePickupTimesForDate(today)
    expect(slots).not.toContain('10:00')
    expect(slots.length).toBeGreaterThan(0)
    vi.useRealTimers()
  })
})

describe('snapPickupSchedule', () => {
  it('bumps an invalid past time to the next allowed slot', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 22, 23, 0, 0))
    const today = todayIsoDate()
    const snapped = snapPickupSchedule(today, '10:00')
    expect(snapped.error).toBeNull()
    expect(snapped.pickupTime).not.toBe('10:00')
    vi.useRealTimers()
  })
})

describe('isPickupDatetimeInFuture', () => {
  it('rejects ISO datetimes in the past', () => {
    expect(isPickupDatetimeInFuture('2020-01-01T10:00:00.000Z')).toBe(false)
  })
})
