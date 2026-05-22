/** Strip control chars / HTML tags and cap length for user-supplied text. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g
const HTML_TAGS = /<[^>]*>/g

export const FIELD_LIMITS = {
  address: 500,
  flightNumber: 32,
  specialRequests: 500,
  fullName: 120,
  phone: 32,
  email: 254,
} as const

export function sanitizeText(input: string, maxLen: number): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAGS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

export function sanitizeOptionalText(input: string | null | undefined, maxLen: number): string | null {
  if (input == null) {
    return null
  }
  const s = sanitizeText(String(input), maxLen)
  return s.length > 0 ? s : null
}

/** Keep digits and common phone punctuation only. */
export function sanitizePhone(input: string, maxLen: number = FIELD_LIMITS.phone): string {
  return sanitizeText(input, maxLen).replace(/[^\d+\s().-]/g, '')
}
