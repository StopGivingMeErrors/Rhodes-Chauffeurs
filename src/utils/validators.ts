import { z } from 'zod'
import { buildPickupDateTimeLocal, minPickupInstantMs } from '@/utils/bookingPickupValidation'
import { FIELD_LIMITS, sanitizePhone, sanitizeText } from '@/utils/sanitize'

const cleanText = (max: number) => z.string().transform((v) => sanitizeText(v, max))
const cleanPhone = () => z.string().transform((v) => sanitizePhone(v))

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    fullName: cleanText(FIELD_LIMITS.fullName).pipe(z.string().min(2, 'Enter your full name')),
    phone: cleanPhone().pipe(z.string().min(7, 'Enter a valid phone number')),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export const profileEditSchema = z.object({
  fullName: cleanText(FIELD_LIMITS.fullName).pipe(z.string().min(2, 'Enter your full name')),
  phone: cleanPhone().pipe(z.string().min(7, 'Enter a valid phone number')),
})

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

/** Quarter-hour slots 00:00 … 23:45 (more options to avoid vehicle overlap collisions). */
export const PICKUP_TIME_SLOTS = (() => {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
})()

export function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const journeyStepSchema = z
  .object({
    pickupAddress: cleanText(FIELD_LIMITS.address).pipe(z.string().min(3, 'Enter a pickup address')),
    dropoffAddress: cleanText(FIELD_LIMITS.address).pipe(z.string().min(3, 'Enter a destination')),
    pickupDate: z.string().min(1, 'Choose a date'),
    pickupTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Choose a time')
      .refine((t) => PICKUP_TIME_SLOTS.includes(t), 'Time must be on a 15-minute interval'),
    passengers: z.number().int().min(1, 'At least one passenger').max(12, 'Maximum 12 passengers'),
    flightNumber: cleanText(FIELD_LIMITS.flightNumber)
      .pipe(z.string().max(FIELD_LIMITS.flightNumber))
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      const minD = todayIsoDate()
      return data.pickupDate >= minD
    },
    { message: 'Date cannot be in the past', path: ['pickupDate'] },
  )
  .refine(
    (data) => {
      const when = buildPickupDateTimeLocal(data.pickupDate, data.pickupTime)
      return when.getTime() >= minPickupInstantMs()
    },
    { message: 'Pickup must be at least 30 minutes from now', path: ['pickupTime'] },
  )

export type JourneyStepValues = z.infer<typeof journeyStepSchema>

export const vehicleStepSchema = z.object({
  vehicleId: z.string().uuid('Select a vehicle'),
})

export type VehicleStepValues = z.infer<typeof vehicleStepSchema>

/** Contact step for logged-in users booking a ride (no account creation here). */
export const bookingContactSchema = z.object({
  fullName: cleanText(FIELD_LIMITS.fullName).pipe(z.string().min(2, 'Enter your full name')),
  email: z.email('Enter a valid email'),
  phone: cleanPhone().pipe(z.string().min(7, 'Enter a valid phone number')),
  specialRequests: cleanText(FIELD_LIMITS.specialRequests)
    .pipe(z.string().max(FIELD_LIMITS.specialRequests))
    .optional()
    .or(z.literal('')),
  saveToProfile: z.boolean(),
})

export type BookingContactValues = z.infer<typeof bookingContactSchema>

/** Legacy single-form booking (admin / simple flows). */
export const bookingFormSchema = z.object({
  vehicleId: z.string().uuid('Select a vehicle'),
  pickupDatetime: z.string().min(1, 'Choose a pickup time'),
  pickupAddress: cleanText(FIELD_LIMITS.address).pipe(z.string().min(3, 'Enter a pickup address')),
  dropoffAddress: cleanText(FIELD_LIMITS.address).pipe(z.string().min(3, 'Enter a destination')),
  passengers: z.number().int().min(1).max(12),
  flightNumber: cleanText(FIELD_LIMITS.flightNumber)
    .pipe(z.string().max(FIELD_LIMITS.flightNumber))
    .optional()
    .or(z.literal('')),
  specialRequests: cleanText(FIELD_LIMITS.specialRequests)
    .pipe(z.string().max(FIELD_LIMITS.specialRequests))
    .optional()
    .or(z.literal('')),
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>
