import { describe, expect, it } from 'vitest'
import { filterBookingsTodayAndLater, isPickupBeforeToday } from '@/utils/bookingPickupWindow'

describe('isPickupBeforeToday', () => {
  const now = new Date('2030-06-15T12:00:00')

  it('returns true for yesterday', () => {
    expect(isPickupBeforeToday('2030-06-14T18:00:00', now)).toBe(true)
  })

  it('returns false for later today', () => {
    expect(isPickupBeforeToday('2030-06-15T18:00:00', now)).toBe(false)
  })
})

describe('filterBookingsTodayAndLater', () => {
  it('drops past pickup days', () => {
    const now = new Date('2030-06-15T12:00:00')
    const rows = [
      { id: '1', pickupDatetime: '2030-06-14T10:00:00' },
      { id: '2', pickupDatetime: '2030-06-15T10:00:00' },
      { id: '3', pickupDatetime: '2030-06-20T10:00:00' },
    ]
    expect(filterBookingsTodayAndLater(rows, now).map((r) => r.id)).toEqual(['2', '3'])
  })
})
