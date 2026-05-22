import { describe, expect, it } from 'vitest'
import { sanitizeOptionalText, sanitizePhone, sanitizeText } from '@/utils/sanitize'
import { sanitizeBookingDraftFields } from '@/utils/sanitizeBookingDraft'

describe('sanitizeText', () => {
  it('strips tags and control characters', () => {
    expect(sanitizeText('<b>Hello</b>\x00world', 50)).toBe('Helloworld')
  })

  it('caps length', () => {
    expect(sanitizeText('abcdef', 3)).toBe('abc')
  })
})

describe('sanitizePhone', () => {
  it('keeps digits and phone punctuation', () => {
    expect(sanitizePhone('+30 (69) 123-4567')).toBe('+30 (69) 123-4567')
    expect(sanitizePhone('abc+3069')).toBe('+3069')
  })
})

describe('sanitizeOptionalText', () => {
  it('returns null for blank after trim', () => {
    expect(sanitizeOptionalText('   ', 10)).toBeNull()
  })
})

describe('sanitizeBookingDraftFields', () => {
  it('sanitizes route and optional fields', () => {
    const out = sanitizeBookingDraftFields({
      bookingType: 'fixed',
      routeId: '00000000-0000-4000-8000-000000000001',
      pickupDatetime: '2026-06-01T10:00:00.000Z',
      pickupAddress: '<script>x</script> Athens',
      dropoffAddress: 'Airport',
      passengers: 2,
      flightNumber: ' OA123 ',
      specialRequests: null,
      estimatedPrice: 120,
      quotedPrice: null,
      currency: 'eur',
      pricingMode: 'fixed_route',
    })
    expect(out.pickupAddress).toBe('x Athens')
    expect(out.flightNumber).toBe('OA123')
  })
})
