import { describe, expect, it } from 'vitest'
import {
  bookingContactSchema,
  journeyStepSchema,
  loginSchema,
  PICKUP_TIME_SLOTS,
  signupSchema,
} from '@/utils/validators'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: 'password1' })
    expect(r.success).toBe(true)
  })

  it('rejects short password', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: 'short' })
    expect(r.success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('requires matching passwords', () => {
    const r = signupSchema.safeParse({
      fullName: 'Jane Doe',
      phone: '+30 6912345678',
      email: 'jane@example.com',
      password: 'password1',
      confirmPassword: 'password2',
    })
    expect(r.success).toBe(false)
  })
})

describe('journeyStepSchema', () => {
  const futureDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  it('accepts a valid future journey', () => {
    const r = journeyStepSchema.safeParse({
      pickupAddress: 'Rhodes Airport',
      dropoffAddress: 'Lindos',
      pickupDate: futureDate(),
      pickupTime: PICKUP_TIME_SLOTS[40]!,
      passengers: 2,
      flightNumber: '',
    })
    expect(r.success).toBe(true)
  })

  it('rejects past dates', () => {
    const r = journeyStepSchema.safeParse({
      pickupAddress: 'A',
      dropoffAddress: 'B',
      pickupDate: '2020-01-01',
      pickupTime: '10:00',
      passengers: 2,
    })
    expect(r.success).toBe(false)
  })
})

describe('bookingContactSchema', () => {
  it('accepts contact with optional empty special requests', () => {
    const r = bookingContactSchema.safeParse({
      fullName: 'Guest',
      email: 'guest@example.com',
      phone: '+1234567890',
      specialRequests: '',
      saveToProfile: false,
    })
    expect(r.success).toBe(true)
  })
})
