import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

function resolveCorsHeaders(req: Request): Record<string, string> {
  const allowOrigin = Deno.env.get('ACCESS_CONTROL_ALLOW_ORIGIN')?.trim()
  const origin = req.headers.get('Origin')
  const header =
    allowOrigin && allowOrigin !== '*'
      ? allowOrigin
      : origin && /^https?:\/\//i.test(origin)
        ? origin
        : '*'
  return {
    'Access-Control-Allow-Origin': header,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(body: unknown, status = 200, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function toStripeMinorUnits(amountMajor: number, currency: string): number {
  const c = currency.toLowerCase()
  const zeroDecimal = new Set([
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
  ])
  if (zeroDecimal.has(c)) {
    return Math.round(amountMajor)
  }
  return Math.round(amountMajor * 100)
}

function sanitizeAppOrigin(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null
  }
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null
    }
    if (u.username || u.password) {
      return null
    }
    return u.origin
  } catch {
    return null
  }
}

type Body = {
  bookingId?: string
  customerEmail?: string
  currency?: string
  appOrigin?: string
}

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    return await handleCreateCheckoutSession(req, corsHeaders)
  } catch (e) {
    console.error('[create-checkout-session] unhandled', e)
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500, corsHeaders)
  }
})

async function handleCreateCheckoutSession(req: Request, corsHeaders: Record<string, string>): Promise<Response> {

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeSecret || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    const missing: string[] = []
    if (!stripeSecret) missing.push('STRIPE_SECRET_KEY')
    if (!supabaseUrl) missing.push('SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY')
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    console.error('[create-checkout-session] Missing secrets (set in Dashboard → Edge Functions → Secrets):', missing.join(', '))
    return jsonResponse(
      {
        error:
          'Server misconfiguration: missing Edge secrets. Set STRIPE_SECRET_KEY in Supabase (SUPABASE_* are usually auto-injected).',
      },
      500,
      corsHeaders,
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401, corsHeaders)
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders)
  }

  const { bookingId, currency = 'eur', customerEmail } = body
  const appBase = sanitizeAppOrigin(body.appOrigin)

  if (!bookingId || typeof bookingId !== 'string') {
    return jsonResponse({ error: 'bookingId is required' }, 400, corsHeaders)
  }
  if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
    return jsonResponse({ error: 'customerEmail is required' }, 400, corsHeaders)
  }
  if (!appBase) {
    return jsonResponse({ error: 'appOrigin must be a valid http(s) origin (e.g. https://yourdomain.com)' }, 400, corsHeaders)
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select(
      'id, client_id, status, booking_type, estimated_price, quoted_price, payment_method, paid_at, pickup_datetime',
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError) {
    console.error('[create-checkout-session] booking read', bookingError)
    return jsonResponse({ error: 'Failed to load booking' }, 500, corsHeaders)
  }

  if (!booking) {
    return jsonResponse({ error: 'Booking not found' }, 404, corsHeaders)
  }

  if (booking.payment_method === 'cash') {
    return jsonResponse({ error: 'This booking is not payable by card' }, 409, corsHeaders)
  }

  if (booking.client_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders)
  }

  if (booking.status !== 'pending') {
    return jsonResponse(
      {
        error:
          'This booking is no longer awaiting payment. Refresh the page. Card checkout only works while the trip is still pending.',
      },
      409,
      corsHeaders,
    )
  }

  if (booking.paid_at) {
    return jsonResponse({ error: 'This booking is already paid.' }, 409, corsHeaders)
  }

  const pickupRaw = booking.pickup_datetime
  if (typeof pickupRaw === 'string') {
    const pickupMs = Date.parse(pickupRaw)
    if (!Number.isNaN(pickupMs) && pickupMs < Date.now() + 30 * 60 * 1000) {
      return jsonResponse(
        { error: 'Pickup must be at least 30 minutes from now. Update your schedule before paying.' },
        409,
        corsHeaders,
      )
    }
  }

  const estimated = booking.estimated_price != null ? Number(booking.estimated_price) : null
  const quoted = booking.quoted_price != null ? Number(booking.quoted_price) : null
  const chargeRaw =
    estimated != null && Number.isFinite(estimated) && estimated > 0
      ? estimated
      : quoted != null && Number.isFinite(quoted) && quoted > 0
        ? quoted
        : null

  if (chargeRaw == null) {
    return jsonResponse({ error: 'Booking has no price set' }, 400, corsHeaders)
  }

  const amount = Number(chargeRaw)
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ error: 'Booking has an invalid price' }, 400, corsHeaders)
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  const { data: succeededPay } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('status', 'succeeded')
    .maybeSingle()

  if (succeededPay) {
    return jsonResponse({ error: 'This booking is already paid.' }, 409, corsHeaders)
  }

  const { data: pendingPay } = await supabaseAdmin
    .from('payments')
    .select('id, stripe_payment_intent_id, amount')
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .maybeSingle()

  if (pendingPay) {
    const stalePiId = pendingPay.stripe_payment_intent_id
    if (typeof stalePiId === 'string' && stalePiId.length > 0) {
      // Do not block checkout on Stripe round-trips; cancel stale intents in the background.
      void stripe.paymentIntents.cancel(stalePiId).catch((e) => {
        console.warn('[create-checkout-session] cancel stale PI (background)', stalePiId, e)
      })
    }
    const { error: failErr } = await supabaseAdmin
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', pendingPay.id)
    if (failErr) {
      console.error('[create-checkout-session] mark stale payment failed', failErr)
      return jsonResponse({ error: 'Could not reset payment state' }, 500, corsHeaders)
    }
  }

  const amountMinor = toStripeMinorUnits(amount, currency)
  const successUrl = `${appBase}/confirmation/${encodeURIComponent(bookingId)}?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${appBase}/book`

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: customerEmail,
        client_reference_id: bookingId,
        metadata: { booking_id: bookingId },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: amountMinor,
              product_data: {
                name: 'Velox VIP private transfer',
                description: `Reservation ${bookingId.slice(0, 8)}`,
              },
            },
          },
        ],
        payment_intent_data: {
          metadata: { bookingId, booking_id: bookingId },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { idempotencyKey: `checkout-${bookingId}-${amount}` },
    )
  } catch (err) {
    console.error('[create-checkout-session] Stripe session create failed', err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return jsonResponse({ error: message }, 502, corsHeaders)
  }

  if (!session.url) {
    return jsonResponse({ error: 'Stripe did not return a checkout URL' }, 500, corsHeaders)
  }

  const { error: sessErr } = await supabaseAdmin
    .from('bookings')
    .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (sessErr) {
    console.error('[create-checkout-session] store stripe_session_id', sessErr)
  }

  /**
   * Hosted Checkout often returns `payment_intent: null` while the session is still `open`
   * (Stripe creates / links the PI as the customer progresses). We do not insert `payments`
   * here — `stripe-webhook` records the row on `payment_intent.succeeded` using PI metadata.
   */
  return jsonResponse({ url: session.url }, 200, corsHeaders)
}
