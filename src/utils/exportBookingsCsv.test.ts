import { describe, expect, it } from 'vitest'
import type { BookingWithVehicle } from '@/types/booking'
import { buildBookingsCsv, formatPickupForCsv } from '@/utils/exportBookingsCsv'

const row: BookingWithVehicle = {
  id: '00000000-0000-4000-8000-000000000099',
  clientId: '00000000-0000-4000-8000-000000000001',
  bookingType: 'fixed',
  routeId: null,
  vehicleId: null,
  driverId: null,
  pickupAddress: 'Line one, with comma',
  dropoffAddress: 'Hotel',
  pickupDatetime: '2030-01-15T10:00:00.000Z',
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
  vehicleName: null,
  routeTitle: 'Airport',
}

describe('buildBookingsCsv', () => {
  it('includes header row', () => {
    const csv = buildBookingsCsv([row])
    expect(csv.split('\n')[0]).toContain('pickup_address')
  })

  it('escapes commas in addresses', () => {
    const csv = buildBookingsCsv([row], { separator: ',' })
    expect(csv).toContain('"Line one, with comma"')
  })

  it('uses semicolon separator when requested', () => {
    const csv = buildBookingsCsv([row], { separator: ';' })
    expect(csv.split('\r\n')[0]).toContain('pickup_address')
    expect(csv).toContain(';')
  })

  it('formats pickup without special unicode characters', () => {
    expect(formatPickupForCsv('2030-01-15T10:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})
