import { endOfDay, format, startOfDay, subDays } from 'date-fns'
import type { BookingWithVehicle } from '@/types/booking'

export type AdminBookingsTimePreset = 'upcoming' | 'all' | 'today' | 'recent' | 'custom'

/** Pickups in the last N calendar days including today. */
export const ADMIN_RECENT_BOOKINGS_DAYS = 7

export function getPickupBoundsForTimePreset(
  preset: Exclude<AdminBookingsTimePreset, 'custom'>,
  now = new Date(),
): { from: string; to: string } {
  if (preset === 'all') {
    return { from: '', to: '' }
  }
  if (preset === 'upcoming') {
    return {
      from: format(startOfDay(now), 'yyyy-MM-dd'),
      to: '',
    }
  }
  if (preset === 'today') {
    return {
      from: format(startOfDay(now), 'yyyy-MM-dd'),
      to: format(endOfDay(now), 'yyyy-MM-dd'),
    }
  }
  const fromDay = subDays(startOfDay(now), ADMIN_RECENT_BOOKINGS_DAYS - 1)
  return {
    from: format(fromDay, 'yyyy-MM-dd'),
    to: format(endOfDay(now), 'yyyy-MM-dd'),
  }
}

export function filterBookingsByPickupWindow(
  rows: BookingWithVehicle[],
  dateFrom: string,
  dateTo: string,
): BookingWithVehicle[] {
  if (!dateFrom && !dateTo) {
    return rows
  }

  return rows.filter((b) => {
    const pickup = new Date(b.pickupDatetime)
    if (Number.isNaN(pickup.getTime())) {
      return false
    }
    if (dateFrom) {
      const from = startOfDay(new Date(`${dateFrom}T00:00:00`))
      if (pickup < from) {
        return false
      }
    }
    if (dateTo) {
      const to = endOfDay(new Date(`${dateTo}T00:00:00`))
      if (pickup > to) {
        return false
      }
    }
    return true
  })
}
