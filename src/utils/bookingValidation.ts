import type { BookingDraft } from '@/types/booking'
import { isPickupDatetimeInFuture, pickupMustBeFutureMessage } from '@/utils/bookingPickupValidation'
import { sanitizeBookingDraftFields } from '@/utils/sanitizeBookingDraft'

/** Human-readable PostgREST / Supabase error for UI. */
export function formatPostgrestError(err: {
  message: string
  details?: string | null
  hint?: string | null
  code?: string | null
}): string {
  const parts = [err.message, err.details, err.hint].filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
  if (err.code && !parts.some((p) => p.includes(err.code!))) {
    parts.push(`(${err.code})`)
  }
  return parts.join(' — ')
}

/** Validates a booking draft before INSERT/UPDATE (shared by booking service). */
export function assertDraftPersistable(draft: BookingDraft): void {
  const clean = sanitizeBookingDraftFields(draft)
  Object.assign(draft, clean)

  if (!draft.pickupAddress.trim() || !draft.dropoffAddress.trim()) {
    throw new Error('Pickup and drop-off addresses are required. Go back to step 1 and complete your route.')
  }
  const t = Date.parse(draft.pickupDatetime)
  if (!draft.pickupDatetime.trim() || Number.isNaN(t)) {
    throw new Error('Pickup date and time are invalid. Go back to step 1 and choose when you need the vehicle.')
  }
  if (!isPickupDatetimeInFuture(draft.pickupDatetime)) {
    throw new Error(pickupMustBeFutureMessage())
  }
  if (draft.passengers < 1) {
    throw new Error('Passenger count must be at least 1.')
  }

  if (draft.bookingType === 'fixed') {
    if (!draft.routeId) {
      throw new Error('Select a fixed route to continue.')
    }
    if (!Number.isFinite(draft.estimatedPrice) || (draft.estimatedPrice ?? 0) <= 0) {
      throw new Error('This route has no price yet. Ask your concierge to set it in admin Routes.')
    }
    return
  }

  if (draft.bookingType === 'custom') {
    return
  }

  throw new Error('Invalid booking type.')
}
