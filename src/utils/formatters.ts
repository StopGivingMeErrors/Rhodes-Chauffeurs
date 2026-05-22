import { format, formatDistanceToNow, intervalToDuration } from 'date-fns'

export function formatDateTime(iso: string, pattern = "EEE d MMM yyyy '·' HH:mm") {
  return format(new Date(iso), pattern)
}

export function formatRelativeFromNow(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

/** Amount in minor units (e.g. cents). */
export function formatCurrencyMinor(cents: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/** Amount in major units (e.g. EUR as stored in Postgres numeric). */
export function formatCurrencyMajor(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDurationMinutes(totalMinutes: number) {
  const d = intervalToDuration({ start: 0, end: totalMinutes * 60_000 })
  const hours = d.hours ?? 0
  const minutes = d.minutes ?? 0
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
