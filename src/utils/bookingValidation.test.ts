import { describe, expect, it } from 'vitest'
import type { BookingDraft } from '@/types/booking'
import { assertDraftPersistable, formatPostgrestError } from '@/utils/bookingValidation'

const baseDraft = (): BookingDraft => ({
  bookingType: 'fixed',
  routeId: '00000000-0000-4000-8000-000000000001',
  pickupDatetime: '2030-06-15T10:00:00.000Z',
  pickupAddress: 'Airport',
  dropoffAddress: 'Hotel',
  passengers: 2,
  flightNumber: null,
  specialRequests: null,
  estimatedPrice: 120,
  quotedPrice: null,
  currency: 'eur',
  pricingMode: 'fixed_route',
})

describe('formatPostgrestError', () => {
  it('joins message, details, hint, and code', () => {
    const msg = formatPostgrestError({
      message: 'duplicate key',
      details: 'Key already exists',
      hint: null,
      code: '23505',
    })
    expect(msg).toContain('duplicate key')
    expect(msg).toContain('23505')
  })
})

describe('assertDraftPersistable', () => {
  it('accepts a valid fixed draft', () => {
    expect(() => assertDraftPersistable(baseDraft())).not.toThrow()
  })

  it('rejects empty addresses', () => {
    expect(() => assertDraftPersistable({ ...baseDraft(), pickupAddress: '  ' })).toThrow(/addresses/)
  })

  it('rejects invalid pickup datetime', () => {
    expect(() => assertDraftPersistable({ ...baseDraft(), pickupDatetime: 'not-a-date' })).toThrow(/invalid/)
  })

  it('rejects pickup in the past', () => {
    expect(() =>
      assertDraftPersistable({ ...baseDraft(), pickupDatetime: '2020-01-01T10:00:00.000Z' }),
    ).toThrow(/30 minutes/)
  })

  it('rejects zero or negative fixed price', () => {
    expect(() => assertDraftPersistable({ ...baseDraft(), estimatedPrice: 0 })).toThrow(/price/)
    expect(() => assertDraftPersistable({ ...baseDraft(), estimatedPrice: -10 })).toThrow(/price/)
  })

  it('rejects zero passengers', () => {
    expect(() => assertDraftPersistable({ ...baseDraft(), passengers: 0 })).toThrow(/Passenger/)
  })
})
