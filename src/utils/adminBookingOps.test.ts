import { describe, expect, it } from 'vitest'
import type { BookingWithVehicle } from '@/types/booking'
import {
  adminBookingOpsActionOptions,
  bookingRouteLabel,
  bookingStatusFromOpsAction,
} from '@/utils/adminBookingOps'

function row(partial: Partial<BookingWithVehicle>): BookingWithVehicle {
  return {
    id: '1',
    clientId: 'c1',
    bookingType: 'fixed',
    routeId: null,
    vehicleId: null,
    driverId: null,
    pickupAddress: 'Lindos',
    dropoffAddress: 'Airport',
    pickupDatetime: '2030-06-01T10:00:00.000Z',
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
    vehicleName: null,
    routeTitle: null,
    clientEmail: 'guest@example.com',
    clientFullName: 'Guest',
    clientPhone: '+30 6912345678',
    ...partial,
  }
}

describe('adminBookingOpsActionOptions', () => {
  it('offers confirm and cancel for pending bookings', () => {
    const opts = adminBookingOpsActionOptions('pending')
    expect(opts.map((o) => o.value)).toEqual(['', 'confirm', 'cancel'])
    expect(opts.find((o) => o.value === 'confirm')?.label).toBe('Confirm booking')
  })

  it('offers no actions when cancelled', () => {
    expect(adminBookingOpsActionOptions('cancelled')).toEqual([])
  })
})

describe('bookingStatusFromOpsAction', () => {
  it('maps confirm and cancel', () => {
    expect(bookingStatusFromOpsAction('confirm')).toBe('confirmed')
    expect(bookingStatusFromOpsAction('cancel')).toBe('cancelled')
    expect(bookingStatusFromOpsAction('')).toBeNull()
  })
})

describe('bookingRouteLabel', () => {
  it('uses catalogue route title when present', () => {
    expect(bookingRouteLabel(row({ routeTitle: 'Lindos → Airport' }))).toBe('Lindos → Airport')
  })

  it('summarises custom routes', () => {
    expect(
      bookingRouteLabel(
        row({
          bookingType: 'custom',
          routeTitle: null,
          pickupAddress: 'Hotel A',
          dropoffAddress: 'Port',
        }),
      ),
    ).toContain('Ειδική')
  })
})
