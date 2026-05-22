import { PICKUP_TIME_SLOTS, todayIsoDate } from '@/utils/validators'

/** Minimum time between now and pickup (allows a little booking prep time). */
export const MIN_PICKUP_LEAD_MS = 30 * 60 * 1000

export function buildPickupDateTimeLocal(pickupDate: string, pickupTime: string): Date {
  const [yy, mm, dd] = pickupDate.split('-').map(Number)
  const [hh, min] = pickupTime.split(':').map(Number)
  return new Date(yy, (mm ?? 1) - 1, dd ?? 1, hh ?? 0, min ?? 0, 0, 0)
}

export function pickupDatetimeToIso(pickupDate: string, pickupTime: string): string {
  return buildPickupDateTimeLocal(pickupDate, pickupTime).toISOString()
}

export function minPickupInstantMs(now = Date.now()): number {
  return now + MIN_PICKUP_LEAD_MS
}

export function isPickupInstantInFuture(pickupMs: number, now = Date.now()): boolean {
  return pickupMs >= minPickupInstantMs(now)
}

export function isPickupDatetimeInFuture(pickupDatetime: string, now = Date.now()): boolean {
  const t = Date.parse(pickupDatetime)
  if (Number.isNaN(t)) {
    return false
  }
  return isPickupInstantInFuture(t, now)
}

export function pickupMustBeFutureMessage(): string {
  return 'Pickup must be at least 30 minutes from now. Choose a later time or another day.'
}

export function validatePickupSchedule(
  pickupDate: string,
  pickupTime: string,
  now = Date.now(),
): string | null {
  if (!pickupDate.trim() || !pickupTime.trim()) {
    return 'Choose a pickup date and time.'
  }
  const minD = todayIsoDate()
  if (pickupDate < minD) {
    return 'Date cannot be in the past.'
  }
  if (!PICKUP_TIME_SLOTS.includes(pickupTime)) {
    return 'Choose a valid pickup time.'
  }
  const when = buildPickupDateTimeLocal(pickupDate, pickupTime)
  if (!isPickupInstantInFuture(when.getTime(), now)) {
    return pickupMustBeFutureMessage()
  }
  return null
}

/** Time slots still bookable for the given calendar day (local). */
export function availablePickupTimesForDate(pickupDate: string, now = Date.now()): string[] {
  const minD = todayIsoDate()
  if (pickupDate > minD) {
    return [...PICKUP_TIME_SLOTS]
  }
  if (pickupDate < minD) {
    return []
  }
  const cutoff = minPickupInstantMs(now)
  return PICKUP_TIME_SLOTS.filter((slot) => buildPickupDateTimeLocal(pickupDate, slot).getTime() >= cutoff)
}

export function snapPickupSchedule(
  pickupDate: string,
  pickupTime: string,
  now = Date.now(),
): { pickupDate: string; pickupTime: string; error: string | null } {
  const minD = todayIsoDate()
  let date = pickupDate
  if (date < minD) {
    date = minD
  }
  const slots = availablePickupTimesForDate(date, now)
  if (slots.length === 0) {
    return {
      pickupDate: date,
      pickupTime: pickupTime,
      error: 'No pickup times left today. Please choose tomorrow or a later date.',
    }
  }
  const time = slots.includes(pickupTime) ? pickupTime : slots[0]!
  return { pickupDate: date, pickupTime: time, error: null }
}

export function formatSchedulingError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/already reserved|time window/i.test(msg)) {
    return 'That time is no longer available — another trip is already reserved. Pick a different slot or day.'
  }
  if (/already has a trip on that day|one trip per day/i.test(msg)) {
    return 'Our vehicle is already reserved on that day. Please choose another date.'
  }
  if (/pickup must be|30 minutes|in the future/i.test(msg)) {
    return pickupMustBeFutureMessage()
  }
  return msg
}
