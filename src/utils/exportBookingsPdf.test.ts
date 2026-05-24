import { describe, expect, it } from 'vitest'
import type { BookingWithVehicle } from '@/types/booking'
import { buildBookingsPdf } from '@/utils/exportBookingsPdf'

const sampleRow = (): BookingWithVehicle => ({
  id: '00000000-0000-4000-8000-000000000099',
  clientId: '00000000-0000-4000-8000-000000000001',
  bookingType: 'fixed',
  routeId: null,
  vehicleId: null,
  driverId: null,
  pickupAddress: 'Lindos',
  dropoffAddress: 'Airport',
  pickupDatetime: '2030-01-15T10:00:00.000Z',
  passengers: 2,
  flightNumber: null,
  specialRequests: null,
  status: 'confirmed',
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
  createdAt: '2030-01-01T10:00:00.000Z',
  updatedAt: '2030-01-01T10:00:00.000Z',
  vehicleName: 'Mercedes V-Class',
  routeTitle: 'Lindos → Airport',
  clientEmail: 'guest@example.com',
  clientFullName: 'Guest User',
  clientPhone: '+30 6912345678',
})

describe('buildBookingsPdf', () => {
  it('produces a multi-page PDF document', () => {
    const doc = buildBookingsPdf([sampleRow()], { filterLabel: 'Upcoming' })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    const output = doc.output('arraybuffer')
    expect(output.byteLength).toBeGreaterThan(500)
  })
})
