export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type BookingType = 'fixed' | 'custom'

/** How the trip price was determined. */
export type PricingMode = 'fixed_route' | 'custom_route' | 'custom_quote' | 'standard_vehicle'

/** stripe: card checkout; cash: pay driver / on arrival (no PaymentIntent). */
export type PaymentMethod = 'stripe' | 'cash'

export type Booking = {
  id: string
  clientId: string
  bookingType: BookingType
  routeId: string | null
  vehicleId: string | null
  driverId: string | null
  pickupAddress: string
  dropoffAddress: string
  pickupDatetime: string
  passengers: number
  flightNumber: string | null
  specialRequests: string | null
  status: BookingStatus
  /** Locked trip price at booking creation (fixed and custom routes). */
  estimatedPrice: number | null
  /** Legacy; unused for new custom routes. */
  quotedPrice: number | null
  finalPrice: number | null
  distanceKm: number | null
  currency: string
  paymentMethod: PaymentMethod
  pricingMode: PricingMode
  serviceDurationMinutes: number
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  /** Hydrated for display when loading a single booking */
  routeTitle?: string | null
}

/** Amount to display and send to Stripe. */
export function bookingChargeAmount(
  b: Pick<Booking, 'bookingType' | 'estimatedPrice' | 'quotedPrice'>,
): number | null {
  if (b.estimatedPrice != null && b.estimatedPrice > 0) {
    return b.estimatedPrice
  }
  if (b.bookingType === 'custom' && b.quotedPrice != null && b.quotedPrice > 0) {
    return b.quotedPrice
  }
  return b.estimatedPrice
}

/** Chauffeur contact shown to the client after ops assigns a driver. */
export type AssignedDriver = {
  fullName: string
  phone: string | null
}

/** Booking row joined with route title for lists. */
export type BookingWithVehicle = Booking & {
  vehicleName: string | null
  routeTitle: string | null
  driver?: AssignedDriver | null
}

export type BookingDraft = {
  bookingType: BookingType
  routeId: string | null
  pickupDatetime: string
  pickupAddress: string
  dropoffAddress: string
  passengers: number
  flightNumber: string | null
  specialRequests: string | null
  estimatedPrice: number | null
  quotedPrice: number | null
  currency: string
  pricingMode: PricingMode
  distanceKm?: number | null
  pickupLat?: number | null
  pickupLng?: number | null
  dropoffLat?: number | null
  dropoffLng?: number | null
  serviceDurationMinutes?: number
}
