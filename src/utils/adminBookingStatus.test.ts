import { describe, expect, it } from 'vitest'
import {
  ACTIVE_BOOKING_STATUSES,
  adminSimplifiedStatusLabel,
  bookingMatchesAdminStatusFilter,
} from '@/utils/adminBookingStatus'

describe('bookingMatchesAdminStatusFilter', () => {
  it('maps operational statuses into confirmed bucket', () => {
    expect(bookingMatchesAdminStatusFilter('assigned', 'confirmed')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('in_progress', 'confirmed')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('completed', 'confirmed')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('pending', 'confirmed')).toBe(false)
  })

  it('only matches pending and cancelled directly', () => {
    expect(bookingMatchesAdminStatusFilter('pending', 'pending')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('cancelled', 'cancelled')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('confirmed', 'pending')).toBe(false)
  })
})

describe('adminSimplifiedStatusLabel', () => {
  it('collapses assigned trips to Confirmed', () => {
    expect(adminSimplifiedStatusLabel('assigned')).toBe('Επιβεβαιωμένη')
    expect(adminSimplifiedStatusLabel('pending')).toBe('Εκκρεμεί')
    expect(adminSimplifiedStatusLabel('cancelled')).toBe('Ακυρωμένη')
  })
})

describe('ACTIVE_BOOKING_STATUSES', () => {
  it('excludes terminal statuses', () => {
    expect(ACTIVE_BOOKING_STATUSES).not.toContain('cancelled')
    expect(ACTIVE_BOOKING_STATUSES).not.toContain('completed')
  })
})
