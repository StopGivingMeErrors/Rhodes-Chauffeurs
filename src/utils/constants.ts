/** App-wide constants — no secrets (use import.meta.env for configuration). */

export const APP_NAME = 'Rhodes Chauffeurs'

/** Production site (domain uses “rodos”; brand copy uses “Rhodes”). */
export const APP_SITE_HOST = 'rodoschauffeurs.gr'
export const APP_SITE_URL = `https://${APP_SITE_HOST}`

export const APP_TAGLINE = 'VIP Transfers & Chauffeur Services in Rhodes'

/** Guest places in the VIP van (7 seats total including the driver). */
export const MAX_BOOKING_PASSENGERS = 6

/** Passenger capacity from vehicle seat count (driver occupies one seat). */
export function vehiclePassengerCapacity(totalSeats: number): number {
  return Math.max(1, Math.min(MAX_BOOKING_PASSENGERS, totalSeats - 1))
}

export const DEFAULT_META_DESCRIPTION = `${APP_NAME} — ${APP_TAGLINE}. Book fixed routes online with secure card payment, or request a custom itinerary (cash to your chauffeur).`

export const ROUTES = {
  home: '/',
  book: '/book',
  confirmation: '/confirmation',
  confirmationBooking: (id: string) => `/confirmation/${encodeURIComponent(id)}`,
  dashboard: '/dashboard',
  admin: '/admin',
  login: '/login',
  privacy: '/privacy',
  terms: '/terms',
} as const

export const QUERY_KEYS = {
  auth: ['auth'] as const,
  bookings: ['bookings'] as const,
  booking: (id: string) => ['bookings', id] as const,
  vehicles: ['vehicles'] as const,
  adminBookings: ['admin', 'bookings'] as const,
  adminDrivers: ['admin', 'drivers'] as const,
  adminKpis: ['admin', 'kpis'] as const,
  adminVehicles: ['admin', 'vehicles'] as const,
} as const
