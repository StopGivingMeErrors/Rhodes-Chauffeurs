import { describe, expect, it } from 'vitest'
import type { BookingWithVehicle } from '@/types/booking'
import {
  filterBookingsByPickupWindow,
  getPickupBoundsForTimePreset,
} from '@/utils/adminBookingFilters'

function booking(pickupDatetime: string): BookingWithVehicle {
  return {
    id: '1',
    clientId: 'c1',
    bookingType: 'fixed',
    routeId: null,
    vehicleId: null,
    driverId: null,
    pickupAddress: 'A',
    dropoffAddress: 'B',
    pickupDatetime,
    passengers: 1,
    flightNumber: null,
    specialRequests: null,
    status: 'pending',
    estimatedPrice: 10,
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
    createdAt: pickupDatetime,
    updatedAt: pickupDatetime,
    vehicleName: null,
    routeTitle: null,
    clientEmail: null,
    clientFullName: null,
    clientPhone: null,
  }
}

describe('getPickupBoundsForTimePreset', () => {
  const now = new Date('2026-05-19T14:00:00')

  it('returns empty bounds for all time', () => {
    expect(getPickupBoundsForTimePreset('all', now)).toEqual({ from: '', to: '' })
  })

  it('returns from today for upcoming', () => {
    expect(getPickupBoundsForTimePreset('upcoming', now)).toEqual({
      from: '2026-05-19',
      to: '',
    })
  })

  it('returns today bounds', () => {
    expect(getPickupBoundsForTimePreset('today', now)).toEqual({
      from: '2026-05-19',
      to: '2026-05-19',
    })
  })

  it('returns recent window including today', () => {
    const bounds = getPickupBoundsForTimePreset('recent', now)
    expect(bounds.from).toBe('2026-05-13')
    expect(bounds.to).toBe('2026-05-19')
  })
})

describe('filterBookingsByPickupWindow', () => {
  const rows = [
    booking('2026-05-19T10:00:00.000Z'),
    booking('2026-05-10T10:00:00.000Z'),
  ]

  it('returns all when no bounds', () => {
    expect(filterBookingsByPickupWindow(rows, '', '')).toHaveLength(2)
  })

  it('filters by from date', () => {
    const out = filterBookingsByPickupWindow(rows, '2026-05-19', '')
    expect(out).toHaveLength(1)
    expect(out[0]?.pickupDatetime).toContain('2026-05-19')
  })
})
