import type { BookingStatus } from '@/types/booking'
import { ACTIVE_BOOKING_STATUSES } from '@/utils/adminBookingStatus'

export const DEFAULT_SERVICE_DURATION_MINUTES = 120

export type BookingTimeWindow = {
  startMs: number
  endMs: number
}

export function bookingTimeWindow(
  pickupDatetime: string,
  serviceDurationMinutes = DEFAULT_SERVICE_DURATION_MINUTES,
): BookingTimeWindow {
  const startMs = Date.parse(pickupDatetime)
  if (Number.isNaN(startMs)) {
    throw new Error('Invalid pickup datetime')
  }
  const mins = Number.isFinite(serviceDurationMinutes) && serviceDurationMinutes > 0
    ? serviceDurationMinutes
    : DEFAULT_SERVICE_DURATION_MINUTES
  return { startMs, endMs: startMs + mins * 60_000 }
}

/** Half-open interval overlap: [aStart, aEnd) intersects [bStart, bEnd). */
export function timeWindowsOverlap(a: BookingTimeWindow, b: BookingTimeWindow): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs
}

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status)
}

export type BookingWindowRow = {
  pickupDatetime: string
  serviceDurationMinutes?: number | null
}

export function findSchedulingConflict(
  candidatePickup: string,
  candidateDurationMinutes: number,
  existing: BookingWindowRow[],
): boolean {
  const candidate = bookingTimeWindow(candidatePickup, candidateDurationMinutes)
  for (const row of existing) {
    const other = bookingTimeWindow(
      row.pickupDatetime,
      row.serviceDurationMinutes ?? DEFAULT_SERVICE_DURATION_MINUTES,
    )
    if (timeWindowsOverlap(candidate, other)) {
      return true
    }
  }
  return false
}
