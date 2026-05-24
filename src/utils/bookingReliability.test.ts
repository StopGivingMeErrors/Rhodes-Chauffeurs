import { describe, expect, it } from 'vitest'
import type { BookingDraft } from '@/types/booking'
import { bookingMatchesAdminStatusFilter } from '@/utils/adminBookingStatus'
import { assertDraftPersistable } from '@/utils/bookingValidation'
import { isPickupDatetimeInFuture } from '@/utils/bookingPickupValidation'
import { findSchedulingConflict } from '@/utils/bookingSchedule'

const validDraft = (): BookingDraft => ({
  bookingType: 'fixed',
  routeId: '00000000-0000-4000-8000-000000000001',
  pickupDatetime: '2030-06-15T10:00:00.000Z',
  pickupAddress: 'Lindos',
  dropoffAddress: 'Airport',
  passengers: 2,
  flightNumber: null,
  specialRequests: null,
  estimatedPrice: 120,
  quotedPrice: null,
  currency: 'eur',
  pricingMode: 'fixed_route',
})

describe('booking reliability guards', () => {
  it('rejects drafts with past pickup', () => {
    expect(() =>
      assertDraftPersistable({ ...validDraft(), pickupDatetime: '2020-01-01T10:00:00.000Z' }),
    ).toThrow(/30 minutes/)
  })

  it('rejects invalid pickup ISO', () => {
    expect(() => assertDraftPersistable({ ...validDraft(), pickupDatetime: 'not-a-date' })).toThrow(/invalid/)
  })

  it('rejects zero passengers and zero price', () => {
    expect(() => assertDraftPersistable({ ...validDraft(), passengers: 0 })).toThrow(/Passenger/)
    expect(() => assertDraftPersistable({ ...validDraft(), estimatedPrice: 0 })).toThrow(/price/)
  })

  it('accepts a valid future draft', () => {
    expect(() => assertDraftPersistable(validDraft())).not.toThrow()
    expect(isPickupDatetimeInFuture(validDraft().pickupDatetime)).toBe(true)
  })

  it('blocks overlapping fleet windows', () => {
    expect(
      findSchedulingConflict('2030-06-01T10:30:00.000Z', 120, [
        { pickupDatetime: '2030-06-01T10:00:00.000Z', serviceDurationMinutes: 120 },
      ]),
    ).toBe(true)
  })

  it('admin status filters only expose pending, confirmed, cancelled buckets', () => {
    expect(bookingMatchesAdminStatusFilter('pending', 'pending')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('confirmed', 'confirmed')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('assigned', 'confirmed')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('cancelled', 'cancelled')).toBe(true)
    expect(bookingMatchesAdminStatusFilter('pending', 'cancelled')).toBe(false)
  })
})
