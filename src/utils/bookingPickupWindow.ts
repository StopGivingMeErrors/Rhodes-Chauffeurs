import { startOfDay } from 'date-fns'

/** ISO timestamp for start of today (local calendar day). */
export function startOfTodayIso(now = new Date()): string {
  return startOfDay(now).toISOString()
}

export function isPickupBeforeToday(pickupDatetime: string, now = new Date()): boolean {
  const pickup = new Date(pickupDatetime).getTime()
  if (Number.isNaN(pickup)) {
    return true
  }
  return pickup < startOfDay(now).getTime()
}

export function filterBookingsTodayAndLater<T extends { pickupDatetime: string }>(
  rows: T[],
  now = new Date(),
): T[] {
  const cutoff = startOfDay(now).getTime()
  return rows.filter((b) => {
    const t = new Date(b.pickupDatetime).getTime()
    return !Number.isNaN(t) && t >= cutoff
  })
}
