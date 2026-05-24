import { describe, expect, it } from 'vitest'
import {
  bookingTimeWindow,
  findSchedulingConflict,
  timeWindowsOverlap,
} from '@/utils/bookingSchedule'

describe('timeWindowsOverlap', () => {
  it('detects overlapping service windows', () => {
    const a = bookingTimeWindow('2030-06-01T10:00:00.000Z', 120)
    const b = bookingTimeWindow('2030-06-01T11:00:00.000Z', 120)
    expect(timeWindowsOverlap(a, b)).toBe(true)
  })

  it('allows back-to-back windows that only touch at the end', () => {
    const a = bookingTimeWindow('2030-06-01T10:00:00.000Z', 60)
    const b = bookingTimeWindow('2030-06-01T11:00:00.000Z', 60)
    expect(timeWindowsOverlap(a, b)).toBe(false)
  })
})

describe('findSchedulingConflict', () => {
  it('finds a conflict with an existing trip', () => {
    const conflict = findSchedulingConflict(
      '2030-06-01T10:30:00.000Z',
      120,
      [{ pickupDatetime: '2030-06-01T10:00:00.000Z', serviceDurationMinutes: 120 }],
    )
    expect(conflict).toBe(true)
  })

  it('returns false when windows are separate', () => {
    const conflict = findSchedulingConflict(
      '2030-06-01T14:00:00.000Z',
      120,
      [{ pickupDatetime: '2030-06-01T10:00:00.000Z', serviceDurationMinutes: 120 }],
    )
    expect(conflict).toBe(false)
  })
})
