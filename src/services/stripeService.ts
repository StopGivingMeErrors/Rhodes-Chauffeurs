import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'
import { ensureSessionReadyForEdgeFunctions } from '@/services/authService'
import { assertSupabaseConfigured, supabase } from '@/services/supabase'
import { withTimeout } from '@/utils/async'
import type { BookingPaymentStatus, PaymentRow } from '@/types/payment'

const CHECKOUT_INVOKE_TIMEOUT_MS = 30_000
const CHECKOUT_SESSION_READY_MS = 15_000
const CHECKOUT_MAX_ATTEMPTS = 2

type CheckoutSessionPayload = {
  bookingId: string
  customerEmail: string
  currency: string
  appOrigin: string
}

async function parseFunctionsErrorMessage(error: unknown, data: unknown): Promise<string> {
  let message = error instanceof Error ? error.message : 'Could not start checkout.'

  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; detail?: string }
      if (typeof body?.error === 'string' && body.error.trim()) {
        message = body.error
      }
      if (typeof body?.detail === 'string' && body.detail.trim()) {
        message = `${message} (${body.detail})`
      }
    } catch {
      /* keep message */
    }
  }

  if (error instanceof FunctionsRelayError) {
    message = 'Payment service is temporarily unavailable. Please try again in a moment.'
  }

  if (error instanceof FunctionsFetchError) {
    const cause = (error as Error & { cause?: unknown }).cause
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      message = 'Checkout timed out. Check your connection and try again.'
    } else {
      message = 'Could not reach the payment service. Check your connection and try again.'
    }
  }

  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const e = (data as { error: unknown }).error
    if (typeof e === 'string' && e.trim()) {
      message = e
    }
  }

  return message
}

function isRetryableCheckoutAuthError(error: unknown, message: string): boolean {
  if (error instanceof FunctionsHttpError) {
    return error.context.status === 401 || error.context.status === 403
  }
  const lower = message.toLowerCase()
  return lower.includes('unauthorized') || lower.includes('jwt') || lower.includes('session')
}

async function invokeCreateCheckoutSession(
  payload: CheckoutSessionPayload,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: payload,
    timeout: CHECKOUT_INVOKE_TIMEOUT_MS,
  })

  if (error) {
    const message = await parseFunctionsErrorMessage(error, data)
    const err = new Error(message || 'Could not start checkout.')
    ;(err as Error & { retryableAuth?: boolean }).retryableAuth = isRetryableCheckoutAuthError(
      error,
      message,
    )
    throw err
  }

  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const e = (data as { error: unknown }).error
    if (typeof e === 'string' && e.trim()) {
      throw new Error(e)
    }
  }

  if (!data || typeof data !== 'object' || !('url' in data) || typeof (data as { url: unknown }).url !== 'string') {
    throw new Error('Checkout did not return a payment link. Try again.')
  }

  const url = (data as { url: string }).url.trim()
  if (!url.startsWith('https://')) {
    throw new Error('Checkout returned an invalid payment link.')
  }

  return url
}

/**
 * Creates a Stripe Hosted Checkout session and returns its URL.
 */
export async function createCheckoutSessionUrl(
  bookingId: string,
  customerEmail: string,
  currency = 'eur',
): Promise<string> {
  assertSupabaseConfigured()
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  if (!appOrigin) {
    throw new Error('Cannot start checkout outside a browser.')
  }

  const trimmedEmail = customerEmail.trim()
  if (!trimmedEmail.includes('@')) {
    throw new Error('A valid email is required for card payment.')
  }

  const payload: CheckoutSessionPayload = {
    bookingId,
    customerEmail: trimmedEmail,
    currency,
    appOrigin,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < CHECKOUT_MAX_ATTEMPTS; attempt++) {
    if (attempt === 0) {
      await withTimeout(
        ensureSessionReadyForEdgeFunctions(),
        CHECKOUT_SESSION_READY_MS,
        'Session check timed out. Refresh the page or sign in again, then try payment.',
      )
    } else {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) {
        throw new Error('Your session expired. Sign in again, then try payment.')
      }
    }
    try {
      return await invokeCreateCheckoutSession(payload)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Could not start checkout.')
      lastError = err
      const retryable = (err as Error & { retryableAuth?: boolean }).retryableAuth === true
      if (retryable && attempt + 1 < CHECKOUT_MAX_ATTEMPTS) {
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('Could not start checkout.')
}

/**
 * Opens Stripe-hosted Checkout in the same tab. After payment, Stripe redirects to
 * `/confirmation/:bookingId` and the existing webhook confirms the booking from the PaymentIntent.
 */
export async function startHostedStripeCheckout(
  bookingId: string,
  customerEmail: string,
  currency = 'eur',
): Promise<void> {
  const url = await createCheckoutSessionUrl(bookingId, customerEmail, currency)
  window.location.href = url
}

export async function getBookingPaymentStatus(bookingId: string): Promise<BookingPaymentStatus> {
  const { data, error } = await supabase
    .from('payments')
    .select('status')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || typeof data !== 'object' || !('status' in data)) {
    return 'none'
  }

  const status = (data as { status: string }).status
  if (status === 'pending' || status === 'succeeded' || status === 'failed' || status === 'refunded') {
    return status
  }

  return 'none'
}

export async function getLatestPayment(bookingId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapPaymentRow(data as Record<string, unknown>)
}

function mapPaymentRow(row: Record<string, unknown>): PaymentRow {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    stripePaymentIntentId: String(row.stripe_payment_intent_id),
    stripeCustomerId: row.stripe_customer_id == null ? null : String(row.stripe_customer_id),
    amount: Number(row.amount),
    currency: String(row.currency),
    status: row.status as PaymentRow['status'],
    paidAt: row.paid_at == null ? null : String(row.paid_at),
    createdAt: String(row.created_at),
  }
}
