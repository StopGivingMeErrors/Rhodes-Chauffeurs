import type { BookingDraft } from '@/types/booking'
import { FIELD_LIMITS, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize'

/** Returns a copy with sanitized free-text fields (addresses, flight, notes). */
export function sanitizeBookingDraftFields(draft: BookingDraft): BookingDraft {
  return {
    ...draft,
    pickupAddress: sanitizeText(draft.pickupAddress, FIELD_LIMITS.address),
    dropoffAddress: sanitizeText(draft.dropoffAddress, FIELD_LIMITS.address),
    flightNumber: sanitizeOptionalText(draft.flightNumber, FIELD_LIMITS.flightNumber),
    specialRequests: sanitizeOptionalText(draft.specialRequests, FIELD_LIMITS.specialRequests),
  }
}
