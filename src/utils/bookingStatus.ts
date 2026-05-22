import type { BookingStatus } from '@/types/booking'

export const ALL_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
]
