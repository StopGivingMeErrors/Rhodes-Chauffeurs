import type { BookingStatus } from '@/types/booking'

/** Statuses that block a new booking at the same pickup time for the same client. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'assigned',
  'in_progress',
]

export type AdminBookingStatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled'

export const ADMIN_BOOKING_STATUS_FILTERS: { value: AdminBookingStatusFilter; label: string }[] = [
  { value: 'all', label: 'Όλες' },
  { value: 'pending', label: 'Εκκρεμεί' },
  { value: 'confirmed', label: 'Επιβεβαιωμένη' },
  { value: 'cancelled', label: 'Ακυρωμένη' },
]

/** Admin list filter: confirmed includes assigned / in progress / completed trips. */
export function bookingMatchesAdminStatusFilter(
  status: BookingStatus,
  filter: AdminBookingStatusFilter,
): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'pending') {
    return status === 'pending'
  }
  if (filter === 'cancelled') {
    return status === 'cancelled'
  }
  return (
    status === 'confirmed' ||
    status === 'assigned' ||
    status === 'in_progress' ||
    status === 'completed'
  )
}

/** Simplified status label for agency staff (pending / confirmed / cancelled). */
export function adminSimplifiedStatusLabel(status: BookingStatus): string {
  if (status === 'cancelled') {
    return 'Ακυρωμένη'
  }
  if (status === 'pending') {
    return 'Εκκρεμεί'
  }
  return 'Επιβεβαιωμένη'
}
