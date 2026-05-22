import { describe, expect, it } from 'vitest'
import type { Booking } from '@/types/booking'
import { groupBookingsBySegment, segmentClientBooking } from '@/utils/segmentClientBooking'

const now = new Date('2030-06-01T12:00:00.000Z').getTime()

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: '1',
    clientId: 'c',
    bookingType: 'fixed',
    routeId: null,
    vehicleId: null,
    driverId: null,
    pickupAddress: 'A',
    dropoffAddress: 'B',
    pickupDatetime: '2030-07-01T10:00:00.000Z',
    passengers: 2,
    flightNumber: null,
    specialRequests: null,
    status: 'pending',
    estimatedPrice: 100,
    quotedPrice: null,
    finalPrice: null,
    distanceKm: null,
    currency: 'eur',
    paymentMethod: 'stripe',
    pricingMode: 'fixed_route',
    serviceDurationMinutes: 120,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    paidAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('segmentClientBooking', () => {
  it('puts cancelled in past', () => {
    expect(segmentClientBooking(booking({ status: 'cancelled' }), now)).toBe('past')
  })

  it('puts in_progress in in_progress', () => {
    expect(segmentClientBooking(booking({ status: 'in_progress' }), now)).toBe('in_progress')
  })

  it('puts future pending in upcoming', () => {
    expect(segmentClientBooking(booking({ status: 'pending' }), now)).toBe('upcoming')
  })

  it('puts past pickup pending in past', () => {
    expect(
      segmentClientBooking(
        booking({ status: 'pending', pickupDatetime: '2020-01-01T10:00:00.000Z' }),
        now,
      ),
    ).toBe('past')
  })
})

describe('groupBookingsBySegment', () => {
  it('partitions bookings into three buckets', () => {
    const rows = [
      booking({ id: '1', status: 'cancelled' }),
      booking({ id: '2', status: 'in_progress' }),
      booking({ id: '3', status: 'confirmed', pickupDatetime: '2030-12-01T10:00:00.000Z' }),
    ]
    const { upcoming, inProgress, past } = groupBookingsBySegment(rows, now)
    expect(past).toHaveLength(1)
    expect(inProgress).toHaveLength(1)
    expect(upcoming).toHaveLength(1)
  })
})
