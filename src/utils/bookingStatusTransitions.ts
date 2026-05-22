import type { BookingStatus } from '@/types/booking'

const ACTIVE: BookingStatus[] = ['pending', 'confirmed', 'assigned', 'in_progress']

/** Statuses an admin may select from the current booking status. */
export function adminSelectableStatuses(current: BookingStatus): BookingStatus[] {
  if (current === 'cancelled') {
    return ['cancelled']
  }
  if (current === 'completed') {
    return ['completed']
  }
  return ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']
}

export function canAdminSetBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) {
    return true
  }
  if (from === 'cancelled') {
    return false
  }
  if (from === 'completed') {
    return to === 'completed'
  }
  if (to === 'cancelled') {
    return true
  }
  if (ACTIVE.includes(from) && ACTIVE.includes(to)) {
    return true
  }
  if (ACTIVE.includes(from) && to === 'completed') {
    return true
  }
  return false
}

export function bookingStatusTransitionError(from: BookingStatus, to: BookingStatus): string {
  if (from === 'cancelled') {
    return 'This reservation was cancelled by the client (or operations). It cannot be confirmed or reassigned — create a new booking if they still need a ride.'
  }
  if (from === 'completed') {
    return 'Completed bookings cannot change status.'
  }
  return `Cannot change booking status from "${from}" to "${to}".`
}

export function isBookingMutableForAssignment(status: BookingStatus): boolean {
  return status !== 'cancelled' && status !== 'completed'
}
