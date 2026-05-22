import type { Booking, BookingDraft } from '@/types/booking'
import type { TransportRoute } from '@/types/route'
import { routePriceForPassengers } from '@/utils/routePricing'

/** Build ISO pickup time from local date + HH:mm (browser local timezone). */
export function toPickupIso(pickupDate: string, pickupTime: string): string {
  const [y, m, d] = pickupDate.split('-').map(Number)
  const [hh, mm] = pickupTime.split(':').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).toISOString()
}

export function buildFixedRouteDraft(input: {
  route: TransportRoute
  pickupDatetime: string
  passengers: number
  flightNumber: string | null
  specialRequests: string | null
  serviceDurationMinutes?: number
}): BookingDraft {
  const price = Math.round(routePriceForPassengers(input.route, input.passengers) * 100) / 100

  return {
    bookingType: 'fixed',
    routeId: input.route.id,
    pickupDatetime: input.pickupDatetime,
    pickupAddress: input.route.pickupAddress.trim(),
    dropoffAddress: input.route.dropoffAddress.trim(),
    passengers: input.passengers,
    flightNumber: input.flightNumber,
    specialRequests: input.specialRequests,
    estimatedPrice: price,
    quotedPrice: null,
    currency: 'eur',
    pricingMode: 'fixed_route',
    distanceKm: null,
    pickupLat: input.route.pickupLat,
    pickupLng: input.route.pickupLng,
    dropoffLat: input.route.dropoffLat,
    dropoffLng: input.route.dropoffLng,
    serviceDurationMinutes: input.serviceDurationMinutes,
  }
}

export function buildCustomRouteDraft(input: {
  pickupDatetime: string
  pickupAddress: string
  dropoffAddress: string
  passengers: number
  flightNumber: string | null
  specialRequests: string | null
  pickupLat: number | null
  pickupLng: number | null
  dropoffLat: number | null
  dropoffLng: number | null
  serviceDurationMinutes?: number
}): BookingDraft {
  return {
    bookingType: 'custom',
    routeId: null,
    pickupDatetime: input.pickupDatetime,
    pickupAddress: input.pickupAddress.trim(),
    dropoffAddress: input.dropoffAddress.trim(),
    passengers: input.passengers,
    flightNumber: input.flightNumber,
    specialRequests: input.specialRequests,
    estimatedPrice: null,
    quotedPrice: null,
    currency: 'eur',
    pricingMode: 'custom_route',
    distanceKm: null,
    pickupLat: input.pickupLat,
    pickupLng: input.pickupLng,
    dropoffLat: input.dropoffLat,
    dropoffLng: input.dropoffLng,
    serviceDurationMinutes: input.serviceDurationMinutes,
  }
}

export function fingerprintFromDraft(d: BookingDraft): string {
  return JSON.stringify({
    bookingType: d.bookingType,
    routeId: d.routeId,
    pickupDatetime: d.pickupDatetime,
    pickupAddress: d.pickupAddress,
    dropoffAddress: d.dropoffAddress,
    passengers: d.passengers,
    flightNumber: d.flightNumber,
    specialRequests: d.specialRequests,
    estimatedPrice: d.estimatedPrice,
    quotedPrice: d.quotedPrice,
  })
}

/** True when an existing pending row matches the wizard draft (reuse instead of INSERT). */
export function draftMatchesBooking(draft: BookingDraft, b: Booking): boolean {
  const draftCharge = draft.estimatedPrice ?? draft.quotedPrice
  const bookingCharge = b.estimatedPrice ?? b.quotedPrice
  const priceOk =
    draftCharge == null && bookingCharge == null
      ? true
      : draftCharge != null &&
        bookingCharge != null &&
        Math.abs(bookingCharge - draftCharge) < 0.02

  return (
    b.bookingType === draft.bookingType &&
    b.routeId === draft.routeId &&
    b.pickupDatetime === draft.pickupDatetime &&
    b.pickupAddress.trim() === draft.pickupAddress.trim() &&
    b.dropoffAddress.trim() === draft.dropoffAddress.trim() &&
    b.passengers === draft.passengers &&
    (b.flightNumber ?? '') === (draft.flightNumber ?? '') &&
    (b.specialRequests ?? '') === (draft.specialRequests ?? '') &&
    b.status === 'pending' &&
    (draft.bookingType === 'custom'
      ? b.paymentMethod === 'cash'
      : b.paymentMethod === 'stripe') &&
    priceOk
  )
}

/** @deprecated Use buildFixedRouteDraft / buildCustomRouteDraft */
export function buildBookingDraft(): never {
  throw new Error('buildBookingDraft(vehicle) removed — use route-based draft builders.')
}
