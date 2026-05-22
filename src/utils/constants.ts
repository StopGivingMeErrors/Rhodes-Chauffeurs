/** App-wide constants — no secrets (use import.meta.env for configuration). */

export const APP_NAME = 'Velox VIP'

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
