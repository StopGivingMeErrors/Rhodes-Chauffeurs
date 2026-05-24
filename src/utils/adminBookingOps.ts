import type { BookingStatus, BookingWithVehicle } from '@/types/booking'

export type AdminBookingOpsAction = '' | 'confirm' | 'cancel'

/** Labels shown in the admin bookings “Confirm / cancel” control. */
export function adminBookingOpsActionOptions(
  current: BookingStatus,
): { value: AdminBookingOpsAction; label: string }[] {
  if (current === 'cancelled' || current === 'completed') {
    return []
  }
  return [
    { value: '', label: '— Confirm or cancel —' },
    { value: 'confirm', label: 'Confirm booking' },
    { value: 'cancel', label: 'Cancel booking' },
  ]
}

export function bookingStatusFromOpsAction(action: AdminBookingOpsAction): BookingStatus | null {
  if (action === 'confirm') {
    return 'confirmed'
  }
  if (action === 'cancel') {
    return 'cancelled'
  }
  return null
}

/** Route label for admin list (catalogue title or custom itinerary summary). */
export function bookingRouteLabel(b: BookingWithVehicle): string {
  if (b.routeTitle?.trim()) {
    return b.routeTitle.trim()
  }
  if (b.bookingType === 'custom') {
    return `Ειδική · ${b.pickupAddress} → ${b.dropoffAddress}`
  }
  return `${b.pickupAddress} → ${b.dropoffAddress}`
}

export function adminBookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    pending: 'Εκκρεμεί',
    confirmed: 'Επιβεβαιωμένη',
    assigned: 'Ανατέθηκε',
    in_progress: 'Σε εξέλιξη',
    completed: 'Ολοκληρώθηκε',
    cancelled: 'Ακυρωμένη',
  }
  return labels[status]
}
