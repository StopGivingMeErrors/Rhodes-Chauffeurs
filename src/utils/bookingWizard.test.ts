import { describe, expect, it } from 'vitest'
import type { Booking } from '@/types/booking'
import type { TransportRoute } from '@/types/route'
import {
  buildCustomRouteDraft,
  buildFixedRouteDraft,
  draftMatchesBooking,
  fingerprintFromDraft,
  toPickupIso,
} from '@/utils/bookingWizard'

const route: TransportRoute = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Airport → Town',
  subtitle: null,
  pickupAddress: 'Airport',
  dropoffAddress: 'Town',
  pickupLat: null,
  pickupLng: null,
  dropoffLat: null,
  dropoffLng: null,
  price: 99.99,
  price1to4: 80,
  price5to8: 120,
  pricingUnit: 'trip',
  active: true,
  sortOrder: 1,
}

describe('toPickupIso', () => {
  it('builds ISO string from date and time in local timezone', () => {
    const iso = toPickupIso('2030-01-15', '14:30')
    const d = new Date(iso)
    expect(d.getFullYear()).toBe(2030)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
  })
})

describe('buildFixedRouteDraft', () => {
  it('locks route price to two decimals', () => {
    const draft = buildFixedRouteDraft({
      route: { ...route, price: 99.999 },
      pickupDatetime: '2030-01-01T10:00:00.000Z',
      passengers: 2,
      flightNumber: null,
      specialRequests: null,
    })
    expect(draft.estimatedPrice).toBe(80)
    expect(draft.bookingType).toBe('fixed')
    expect(draft.pricingMode).toBe('fixed_route')
  })

  it('uses 5–8 guest tier when passengers >= 5', () => {
    const draft = buildFixedRouteDraft({
      route,
      pickupDatetime: '2030-01-01T10:00:00.000Z',
      passengers: 6,
      flightNumber: null,
      specialRequests: null,
    })
    expect(draft.estimatedPrice).toBe(120)
  })
})

describe('fingerprintFromDraft', () => {
  it('is stable for the same draft fields', () => {
    const draft = buildFixedRouteDraft({
      route,
      pickupDatetime: '2030-01-01T10:00:00.000Z',
      passengers: 1,
      flightNumber: 'LH123',
      specialRequests: 'VIP',
    })
    expect(fingerprintFromDraft(draft)).toBe(fingerprintFromDraft(draft))
  })
})

describe('draftMatchesBooking', () => {
  const draft = buildFixedRouteDraft({
    route,
    pickupDatetime: '2030-01-01T10:00:00.000Z',
    passengers: 2,
    flightNumber: null,
    specialRequests: null,
  })

  const booking: Booking = {
    id: 'b1',
    clientId: 'c1',
    bookingType: 'fixed',
    routeId: route.id,
    vehicleId: null,
    driverId: null,
    pickupAddress: 'Airport',
    dropoffAddress: 'Town',
    pickupDatetime: '2030-01-01T10:00:00.000Z',
    passengers: 2,
    flightNumber: null,
    specialRequests: null,
    status: 'pending',
    estimatedPrice: 80,
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
  }

  it('matches equivalent pending stripe booking', () => {
    expect(draftMatchesBooking(draft, booking)).toBe(true)
  })

  it('rejects confirmed booking', () => {
    expect(draftMatchesBooking(draft, { ...booking, status: 'confirmed' })).toBe(false)
  })
})

describe('buildCustomRouteDraft', () => {
  it('has no online price — cash to driver', () => {
    const draft = buildCustomRouteDraft({
      pickupDatetime: '2030-01-01T10:00:00.000Z',
      pickupAddress: 'A',
      dropoffAddress: 'B',
      passengers: 2,
      flightNumber: null,
      specialRequests: null,
      pickupLat: null,
      pickupLng: null,
      dropoffLat: null,
      dropoffLng: null,
    })
    expect(draft.estimatedPrice).toBeNull()
    expect(draft.bookingType).toBe('custom')
    expect(draft.pricingMode).toBe('custom_route')
  })
})
