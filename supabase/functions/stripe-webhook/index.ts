import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

const BRAND_NAME = 'Rhodes Chauffeurs'
const SITE_URL = 'https://rodoschauffeurs.gr'

function resolveResendFrom(): string {
  const fallback = `${BRAND_NAME} <onboarding@resend.dev>`
  const raw = Deno.env.get('RESEND_FROM')?.trim()
  if (!raw) {
    return fallback
  }
  if (/velox\s*vip|rodos\s*chauffeurs/i.test(raw)) {
    return raw.replace(/velox\s*vip/gi, BRAND_NAME).replace(/rodos\s*chauffeurs/gi, BRAND_NAME)
  }
  return raw
}

// ---------------------------------------------------------------------------
// Resend + receipt HTML (inlined: Supabase deploy bundles only index.ts)
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function emailLayout(inner: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(BRAND_NAME)}</title>
</head>
<body style="margin:0;background:#0a0a0f;color:#e8e4dc;font-family:Georgia,'Times New Roman',serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0f;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:560px;border:1px solid rgba(201,168,76,0.35);border-radius:16px;background:linear-gradient(165deg,rgba(255,255,255,0.06),rgba(10,10,15,0.95));overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 8px 28px;border-bottom:1px solid rgba(201,168,76,0.25);">
            <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(232,201,122,0.95);">${escapeHtml(BRAND_NAME)}</p>
            <p style="margin:8px 0 0 0;font-size:22px;color:#f5f0e6;">Chauffeured excellence</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 32px 28px;font-size:15px;line-height:1.55;color:rgba(245,240,230,0.92);">
            ${inner}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-size:11px;color:rgba(245,240,230,0.45);">
            This message was sent because of activity on your ${escapeHtml(BRAND_NAME)} reservation. If you did not expect it, you can ignore this email.
            <br /><br />
            <a href="${escapeHtml(SITE_URL)}" style="color:rgba(232,201,122,0.95);text-decoration:none;">rodoschauffeurs.gr</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function buildPaymentReceiptHtml(data: {
  reference: string
  amountLabel: string
  paidAtLabel: string
}): { subject: string; html: string; preheader: string } {
  const preheader = `Payment received for ${data.reference}.`
  const inner = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#e8c97a;">Payment receipt</p>
    <p style="margin:0 0 20px 0;">We have successfully processed your payment for the following reservation.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);width:38%;">Booking</td><td style="padding:8px 0;color:#f5f0e6;font-weight:600;">${escapeHtml(data.reference)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Amount</td><td style="padding:8px 0;color:#e8c97a;font-size:18px;font-weight:600;">${escapeHtml(data.amountLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Date</td><td style="padding:8px 0;">${escapeHtml(data.paidAtLabel)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;">Your booking is confirmed. Retain this email for your records.</p>
  `
  return {
    subject: `Receipt · ${data.reference}`,
    html: emailLayout(inner, preheader),
    preheader,
  }
}

async function sendResendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }
  const from = resolveResendFrom()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
}

const zeroDecimalCurrencies = new Set([
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

function majorFromStripeAmount(amountMinor: number, currency: string): number {
  const c = currency.toLowerCase()
  if (zeroDecimalCurrencies.has(c)) {
    return amountMinor
  }
  return amountMinor / 100
}

/** Confirm pending Stripe booking and send receipt (shared by normal + Checkout-without-prior-row flows). */
async function confirmBookingStripePaid(
  supabaseAdmin: SupabaseClient,
  bookingId: string,
  pi: Stripe.PaymentIntent,
  paidAt: string,
): Promise<void> {
  const amountMinor = Number(pi.amount_received ?? pi.amount ?? 0)
  const amountMajor = majorFromStripeAmount(amountMinor, pi.currency)
  const { data: bookingRow, error: bookErr } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed', final_price: amountMajor, updated_at: paidAt })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .eq('payment_method', 'stripe')
    .select('id')
    .maybeSingle()

  if (bookErr) {
    throw bookErr
  }
  if (!bookingRow) {
    const { data: bState } = await supabaseAdmin.from('bookings').select('status').eq('id', bookingId).maybeSingle()
    if (bState?.status === 'confirmed' || bState?.status === 'assigned' || bState?.status === 'in_progress') {
      console.log('[stripe-webhook] idempotent: booking already past pending', bookingId)
      return
    }
    throw new Error(`[stripe-webhook] booking ${bookingId} not confirmed after payment`)
  }

  await sendPaymentReceiptEmail(supabaseAdmin, bookingId, pi, paidAt)
}

function formatPaidAmount(amountMinor: number, currency: string): string {
  const major = majorFromStripeAmount(amountMinor, currency)
  const cur = currency.toUpperCase()
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: cur }).format(major)
  } catch {
    return `${major} ${cur}`
  }
}

async function sendPaymentReceiptEmail(
  supabaseAdmin: SupabaseClient,
  bookingId: string,
  pi: Stripe.PaymentIntent,
  paidAt: string,
) {
  try {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('client_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking?.client_id) {
      console.warn('[stripe-webhook] could not load booking for receipt', bErr)
      return
    }

    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', booking.client_id)
      .maybeSingle()

    if (pErr || !profile?.email) {
      console.warn('[stripe-webhook] could not load profile for receipt', pErr)
      return
    }

    const reference = bookingId.slice(0, 8).toUpperCase()
    const amountMinor = Number(pi.amount_received ?? pi.amount ?? 0)
    const amountLabel = formatPaidAmount(amountMinor, pi.currency)
    const paidAtLabel = new Date(paidAt).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const { subject, html } = buildPaymentReceiptHtml({
      reference,
      amountLabel,
      paidAtLabel,
    })
    await sendResendEmail({ to: String(profile.email), subject, html })
    console.log('[stripe-webhook] payment_receipt sent', bookingId)
  } catch (e) {
    console.error('[stripe-webhook] payment_receipt failed', e)
  }
}

async function handleStripeEvent(event: Stripe.Event, supabaseAdmin: SupabaseClient) {
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const paidAt = new Date().toISOString()

    const { data: payRow, error: payErr } = await supabaseAdmin
      .from('payments')
      .update({ status: 'succeeded', paid_at: paidAt })
      .eq('stripe_payment_intent_id', pi.id)
      .eq('status', 'pending')
      .select('id, booking_id')
      .maybeSingle()

    if (payErr) {
      throw payErr
    }

    if (!payRow) {
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('status, booking_id')
        .eq('stripe_payment_intent_id', pi.id)
        .maybeSingle()

      if (!existing) {
        const meta = (pi.metadata ?? {}) as Record<string, string | undefined>
        const bookingId =
          typeof meta.bookingId === 'string' && meta.bookingId.trim()
            ? meta.bookingId.trim()
            : typeof meta.booking_id === 'string' && meta.booking_id.trim()
              ? meta.booking_id.trim()
              : ''
        if (!bookingId) {
          console.warn('[stripe-webhook] no payment row and PI missing bookingId metadata', pi.id)
          return
        }

        const { data: bRow, error: bErr } = await supabaseAdmin
          .from('bookings')
          .select('id, status, payment_method')
          .eq('id', bookingId)
          .maybeSingle()
        if (bErr) {
          throw bErr
        }
        if (!bRow || bRow.payment_method !== 'stripe') {
          console.warn('[stripe-webhook] checkout PI: booking missing or not stripe', bookingId)
          return
        }
        if (bRow.status !== 'pending') {
          console.log('[stripe-webhook] checkout PI: booking already non-pending', bookingId, bRow.status)
          return
        }

        const amountMinorIns = Number(pi.amount_received ?? pi.amount ?? 0)
        const amountMajorIns = majorFromStripeAmount(amountMinorIns, pi.currency)
        const { error: insErr } = await supabaseAdmin.from('payments').insert({
          booking_id: bookingId,
          stripe_payment_intent_id: pi.id,
          stripe_customer_id: null,
          amount: amountMajorIns,
          currency: String(pi.currency ?? 'eur').toLowerCase(),
          status: 'succeeded',
          paid_at: paidAt,
        })

        if (insErr) {
          if (insErr.code === '23505') {
            const { data: byPi } = await supabaseAdmin
              .from('payments')
              .select('booking_id')
              .eq('stripe_payment_intent_id', pi.id)
              .maybeSingle()
            if (byPi?.booking_id) {
              await confirmBookingStripePaid(supabaseAdmin, String(byPi.booking_id), pi, paidAt)
            }
            return
          }
          throw insErr
        }

        await confirmBookingStripePaid(supabaseAdmin, bookingId, pi, paidAt)
        return
      }

      if (existing.status !== 'succeeded') {
        console.warn('[stripe-webhook] no pending payment row for PI', pi.id, existing.status)
        return
      }

      await confirmBookingStripePaid(supabaseAdmin, String(existing.booking_id), pi, paidAt)
      return
    }

    const bookingId = payRow.booking_id
    const metaBid = pi.metadata?.bookingId
    if (metaBid && metaBid !== bookingId) {
      console.error('[stripe-webhook] metadata bookingId mismatch vs payments row', metaBid, bookingId)
    }

    await confirmBookingStripePaid(supabaseAdmin, bookingId, pi, paidAt)
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { error } = await supabaseAdmin
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id)
      .eq('status', 'pending')

    if (error) {
      console.error('[stripe-webhook] payments failed update', error)
      throw error
    }
  }
}

Deno.serve(async (req) => {
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('[stripe-webhook] Missing environment variables')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    await handleStripeEvent(event, supabaseAdmin)
  } catch (err) {
    console.error('[stripe-webhook] handler error', err)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
