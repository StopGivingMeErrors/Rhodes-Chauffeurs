import type { Booking, BookingStatus } from '@/types/booking'

export type ClientBookingSegment = 'upcoming' | 'in_progress' | 'past'

const PRE_PICKUP: BookingStatus[] = ['pending', 'confirmed', 'assigned']

/**
 * Upcoming: pre-trip statuses with pickup in the future.
 * In progress: active leg.
 * Past: completed, cancelled, or missed / finished pre-trip statuses after pickup time.
 */
export function segmentClientBooking(booking: Booking, nowMs: number = Date.now()): ClientBookingSegment {
  if (booking.status === 'completed' || booking.status === 'cancelled') {
    return 'past'
  }
  if (booking.status === 'in_progress') {
    return 'in_progress'
  }
  const pickupMs = new Date(booking.pickupDatetime).getTime()
  if (PRE_PICKUP.includes(booking.status)) {
    return pickupMs >= nowMs ? 'upcoming' : 'past'
  }
  return 'past'
}

export function groupBookingsBySegment<T extends Booking>(bookings: T[], nowMs?: number) {
  const upcoming: T[] = []
  const inProgress: T[] = []
  const past: T[] = []
  for (const b of bookings) {
    const seg = segmentClientBooking(b, nowMs)
    if (seg === 'upcoming') {
      upcoming.push(b)
    } else if (seg === 'in_progress') {
      inProgress.push(b)
    } else {
      past.push(b)
    }
  }
  return { upcoming, inProgress, past }
}
