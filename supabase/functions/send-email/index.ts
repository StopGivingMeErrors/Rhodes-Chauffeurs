import { createClient } from 'npm:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Resend + HTML (Velox VIP client notifications)
// ---------------------------------------------------------------------------
// Two entry points:
// 1) Database webhook: Authorization: Bearer BOOKING_EMAIL_WEBHOOK_SECRET, body = Supabase webhook payload
// 2) Admin invoke: Authorization: Bearer <user JWT>, body = { mode: 'admin_notify', bookingId, reason }
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
<title>Velox VIP</title>
</head>
<body style="margin:0;background:#0a0a0f;color:#e8e4dc;font-family:Georgia,'Times New Roman',serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0f;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:560px;border:1px solid rgba(201,168,76,0.35);border-radius:16px;background:linear-gradient(165deg,rgba(255,255,255,0.06),rgba(10,10,15,0.95));overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 8px 28px;border-bottom:1px solid rgba(201,168,76,0.25);">
            <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(232,201,122,0.95);">Velox VIP</p>
            <p style="margin:8px 0 0 0;font-size:22px;color:#f5f0e6;">Your ride is confirmed</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 32px 28px;font-size:15px;line-height:1.55;color:rgba(245,240,230,0.92);">
            ${inner}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-size:11px;color:rgba(245,240,230,0.45);">
            This message was sent because your Velox VIP reservation was updated. If you did not expect it, contact support.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function buildBookingCancelledHtml(data: {
  reference: string
  pickupLabel: string
  pickupAddress: string
  dropoffAddress: string
}): { subject: string; html: string; preheader: string } {
  const preheader = `Your reservation ${data.reference} has been cancelled.`
  const inner = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#e8c97a;">We are sorry</p>
    <p style="margin:0 0 20px 0;">We had to cancel your Velox VIP reservation. If you have already been charged, our team will follow up regarding any refund according to your booking terms.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);width:38%;">Reference</td><td style="padding:8px 0;color:#f5f0e6;font-weight:600;">${escapeHtml(data.reference)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Scheduled pickup</td><td style="padding:8px 0;">${escapeHtml(data.pickupLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);vertical-align:top;">Route</td><td style="padding:8px 0;">${escapeHtml(data.pickupAddress)} → ${escapeHtml(data.dropoffAddress)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;font-size:14px;color:rgba(245,240,230,0.78);">Questions? Reply to this email or contact concierge through your Velox VIP account.</p>
  `
  return {
    subject: `Reservation cancelled · ${data.reference}`,
    html: emailLayout(inner, preheader),
    preheader,
  }
}

function buildAdminNewBookingHtml(data: {
  reference: string
  clientName: string
  clientEmail: string
  pickupLabel: string
  pickupAddress: string
  dropoffAddress: string
  vehicleName: string
  passengers: number
  estimatedPrice: string
}): { subject: string; html: string; preheader: string } {
  const preheader = `New reservation ${data.reference} — ${data.pickupLabel}`
  const inner = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#e8c97a;">New guest reservation</p>
    <p style="margin:0 0 20px 0;">A client just submitted a booking through Velox VIP. Review it in the admin command center.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);width:38%;">Reference</td><td style="padding:8px 0;color:#f5f0e6;font-weight:600;">${escapeHtml(data.reference)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Guest</td><td style="padding:8px 0;">${escapeHtml(data.clientName)} · ${escapeHtml(data.clientEmail)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Pickup</td><td style="padding:8px 0;">${escapeHtml(data.pickupLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);vertical-align:top;">Route</td><td style="padding:8px 0;">${escapeHtml(data.pickupAddress)} → ${escapeHtml(data.dropoffAddress)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Vehicle</td><td style="padding:8px 0;">${escapeHtml(data.vehicleName)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Passengers</td><td style="padding:8px 0;">${escapeHtml(String(data.passengers))}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Estimate</td><td style="padding:8px 0;">${escapeHtml(data.estimatedPrice)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;font-size:14px;color:rgba(245,240,230,0.78);">Open the admin dashboard to assign a chauffeur and confirm the trip.</p>
  `
  return {
    subject: `New booking · ${data.reference}`,
    html: emailLayout(inner, preheader),
    preheader,
  }
}

function buildRideConfirmedByTeamHtml(data: {
  reference: string
  pickupLabel: string
  pickupAddress: string
  dropoffAddress: string
  vehicleName: string
  driverName: string
  driverPhone: string
}): { subject: string; html: string; preheader: string } {
  const preheader = `Pickup ${data.pickupLabel} — ${data.pickupAddress.slice(0, 40)}…`
  const phoneLine =
    data.driverPhone.trim().length > 0
      ? `<tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Chauffeur phone</td><td style="padding:8px 0;"><a href="tel:${escapeHtml(data.driverPhone.replace(/\s/g, ''))}" style="color:#e8c97a;font-weight:600;">${escapeHtml(data.driverPhone)}</a></td></tr>`
      : `<tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Chauffeur phone</td><td style="padding:8px 0;color:rgba(245,240,230,0.75);">We will share a direct number shortly.</td></tr>`

  const inner = `
    <p style="margin:0 0 16px 0;">Your team has confirmed this reservation and assigned your chauffeur.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);width:38%;">Reference</td><td style="padding:8px 0;color:#f5f0e6;font-weight:600;">${escapeHtml(data.reference)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Pickup time</td><td style="padding:8px 0;">${escapeHtml(data.pickupLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);vertical-align:top;">Pickup</td><td style="padding:8px 0;">${escapeHtml(data.pickupAddress)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);vertical-align:top;">Destination</td><td style="padding:8px 0;">${escapeHtml(data.dropoffAddress)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Vehicle</td><td style="padding:8px 0;">${escapeHtml(data.vehicleName)}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(245,240,230,0.55);">Chauffeur</td><td style="padding:8px 0;font-weight:600;color:#f5f0e6;">${escapeHtml(data.driverName)}</td></tr>
      ${phoneLine}
    </table>
    <p style="margin:24px 0 0 0;font-size:14px;color:rgba(245,240,230,0.78);">If anything changes, reply to your concierge or manage the trip from your Velox VIP account.</p>
  `
  return {
    subject: `Your ride is confirmed · ${data.reference}`,
    html: emailLayout(inner, preheader),
    preheader,
  }
}

function requireResendConfig(): { apiKey: string; from: string } {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set on this project. Add it under Supabase → Edge Functions → Secrets, then redeploy send-email.',
    )
  }
  const from = Deno.env.get('RESEND_FROM')?.trim() || 'Velox VIP <onboarding@resend.dev>'
  return { apiKey, from }
}

async function sendResendEmail(params: { to: string | string[]; subject: string; html: string }): Promise<void> {
  const { apiKey, from } = requireResendConfig()
  const recipients = (Array.isArray(params.to) ? params.to : [params.to]).filter((e) => e.trim().length > 0)
  if (recipients.length === 0) {
    throw new Error('No recipient email addresses')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
}

const corsHeadersBase: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

function resolveCorsHeaders(req: Request): Record<string, string> {
  const allowOrigin = Deno.env.get('ACCESS_CONTROL_ALLOW_ORIGIN')?.trim()
  const origin = req.headers.get('Origin')
  const header =
    allowOrigin && allowOrigin !== '*'
      ? allowOrigin
      : origin && /^https?:\/\//i.test(origin)
        ? origin
        : '*'
  return { ...corsHeadersBase, 'Access-Control-Allow-Origin': header }
}

function json(body: unknown, status = 200, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

type DbWebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: Record<string, unknown>
  old_record?: Record<string, unknown> | null
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null
  }
  return String(v)
}

function formatPickup(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

async function loadBookingContext(
  admin: ReturnType<typeof createClient>,
  bookingId: string,
): Promise<{
  to: string
  reference: string
  pickupLabel: string
  pickupAddr: string
  dropAddr: string
  vehicleName: string
  driverName: string
  driverPhone: string
} | null> {
  const { data: booking, error: bErr } = await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle()
  if (bErr || !booking) {
    console.error('[send-email] booking load', bErr)
    return null
  }
  const row = booking as Record<string, unknown>
  const clientId = str(row.client_id)
  if (!clientId) {
    return null
  }
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('email')
    .eq('id', clientId)
    .maybeSingle()

  let clientEmail = profileErr ? null : profile?.email ? String(profile.email) : null
  if (!clientEmail) {
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(clientId)
    if (authErr) {
      console.error('[send-email] profile and auth user fetch', profileErr, authErr)
      return null
    }
    clientEmail = authData.user?.email?.trim() || null
  }
  if (!clientEmail) {
    console.error('[send-email] no client email for', clientId)
    return null
  }

  let vehicleName = 'Your vehicle'
  const vid = str(row.vehicle_id)
  if (vid) {
    const { data: v } = await admin.from('vehicles').select('name').eq('id', vid).maybeSingle()
    if (v?.name) {
      vehicleName = String(v.name)
    }
  }

  let driverName = 'Your chauffeur'
  let driverPhone = ''
  const driverId = str(row.driver_id)
  if (driverId) {
    const { data: d } = await admin.from('company_drivers').select('full_name, phone').eq('id', driverId).maybeSingle()
    if (d) {
      const dr = d as { full_name?: string; phone?: string | null }
      if (dr.full_name) {
        driverName = String(dr.full_name)
      }
      if (dr.phone) {
        driverPhone = String(dr.phone)
      }
    }
  }

  const bookingIdStr = str(row.id) ?? bookingId
  const reference = bookingIdStr.slice(0, 8).toUpperCase()
  const pickupLabel = formatPickup(str(row.pickup_datetime))
  const pickupAddr = str(row.pickup_address) ?? ''
  const dropAddr = str(row.dropoff_address) ?? ''

  return {
    to: clientEmail,
    reference,
    pickupLabel,
    pickupAddr,
    dropAddr,
    vehicleName,
    driverName,
    driverPhone,
  }
}

async function sendBookingCancelled(
  admin: ReturnType<typeof createClient>,
  bookingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await loadBookingContext(admin, bookingId)
  if (!ctx) {
    return { ok: false, error: 'booking_or_client_missing' }
  }
  const { subject, html } = buildBookingCancelledHtml({
    reference: ctx.reference,
    pickupLabel: ctx.pickupLabel,
    pickupAddress: ctx.pickupAddr,
    dropoffAddress: ctx.dropAddr,
  })
  await sendResendEmail({ to: ctx.to, subject, html })
  console.log('[send-email] booking_cancelled email sent', bookingId)
  return { ok: true }
}

async function sendRideConfirmedIfAssigned(
  admin: ReturnType<typeof createClient>,
  bookingId: string,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const ctx = await loadBookingContext(admin, bookingId)
  if (!ctx) {
    return { ok: false, error: 'booking_or_client_missing' }
  }
  const { data: booking } = await admin.from('bookings').select('status, driver_id').eq('id', bookingId).maybeSingle()
  const b = booking as { status?: string; driver_id?: string | null } | null
  if (!b || b.status !== 'assigned' || !b.driver_id) {
    return { ok: true, skipped: 'not_assigned_or_no_driver' }
  }

  const { subject, html } = buildRideConfirmedByTeamHtml({
    reference: ctx.reference,
    pickupLabel: ctx.pickupLabel,
    pickupAddress: ctx.pickupAddr,
    dropoffAddress: ctx.dropAddr,
    vehicleName: ctx.vehicleName,
    driverName: ctx.driverName,
    driverPhone: ctx.driverPhone,
  })
  await sendResendEmail({ to: ctx.to, subject, html })
  console.log('[send-email] ride_confirmed email sent', bookingId)
  return { ok: true }
}

async function loadAdminNotifyEmails(admin: ReturnType<typeof createClient>): Promise<string[]> {
  const fromEnv =
    Deno.env
      .get('ADMIN_NOTIFY_EMAILS')
      ?.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 3 && e.includes('@')) ?? []

  const { data: admins, error } = await admin.from('profiles').select('email').eq('role', 'admin')
  if (error) {
    console.warn('[send-email] admin profile emails', error)
  }
  const fromDb = (admins ?? [])
    .map((row) => {
      const e = (row as { email?: string | null }).email
      return typeof e === 'string' ? e.trim().toLowerCase() : ''
    })
    .filter((e) => e.length > 3 && e.includes('@'))

  return [...new Set([...fromEnv, ...fromDb])]
}

async function sendNewBookingAdminNotify(
  admin: ReturnType<typeof createClient>,
  userId: string,
  bookingId: string,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const { data: booking, error: bErr } = await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle()
  if (bErr || !booking) {
    return { ok: false, error: 'booking_not_found' }
  }
  const row = booking as Record<string, unknown>
  if (str(row.client_id) !== userId) {
    return { ok: false, error: 'forbidden' }
  }

  const recipients = await loadAdminNotifyEmails(admin)
  if (recipients.length === 0) {
    console.warn('[send-email] no admin notify emails (set ADMIN_NOTIFY_EMAILS or admin profiles)')
    return { ok: true, skipped: 'no_admin_recipients' }
  }

  const clientId = userId
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', clientId)
    .maybeSingle()
  let clientEmail = profile?.email ? String(profile.email) : ''
  let clientName = profile?.full_name ? String(profile.full_name) : 'Guest'
  if (!clientEmail) {
    const { data: authData } = await admin.auth.admin.getUserById(clientId)
    clientEmail = authData.user?.email?.trim() ?? ''
    if (!clientName || clientName === 'Guest') {
      const meta = authData.user?.user_metadata as { full_name?: string } | undefined
      if (meta?.full_name) {
        clientName = String(meta.full_name)
      }
    }
  }

  let vehicleName = 'Vehicle TBD'
  const vid = str(row.vehicle_id)
  if (vid) {
    const { data: v } = await admin.from('vehicles').select('name').eq('id', vid).maybeSingle()
    if (v?.name) {
      vehicleName = String(v.name)
    }
  }

  const reference = (str(row.id) ?? bookingId).slice(0, 8).toUpperCase()
  const est = row.estimated_price != null ? String(row.estimated_price) : '—'
  const currency = str(row.currency) ?? 'eur'
  const priceLabel = est !== '—' ? `${est} ${currency.toUpperCase()}` : '—'

  const { subject, html } = buildAdminNewBookingHtml({
    reference,
    clientName,
    clientEmail: clientEmail || '—',
    pickupLabel: formatPickup(str(row.pickup_datetime)),
    pickupAddress: str(row.pickup_address) ?? '',
    dropoffAddress: str(row.dropoff_address) ?? '',
    vehicleName,
    passengers: Number(row.passengers) || 1,
    estimatedPrice: priceLabel,
  })

  try {
    await sendResendEmail({ to: recipients, subject, html })
    console.log('[send-email] new_booking_admin sent', bookingId, recipients.length)
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/resend error 403/i.test(message) || /validation_error/i.test(message)) {
      console.warn('[send-email] new_booking_admin skipped (Resend test mode — verify domain at resend.com/domains)', message)
      return { ok: true, skipped: 'resend_test_mode' }
    }
    throw e
  }
}

async function assertAuthenticatedCaller(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
  corsHeaders: Record<string, string>,
): Promise<{ admin: ReturnType<typeof createClient>; userId: string } | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders)
  }
  const jwt = authHeader.slice(7).trim()
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt)
  if (userErr || !user) {
    return json({ error: 'Invalid session' }, 401, corsHeaders)
  }
  return { admin, userId: user.id }
}

async function assertAdminCaller(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
  corsHeaders: Record<string, string>,
): Promise<{ admin: ReturnType<typeof createClient> } | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders)
  }
  const jwt = authHeader.slice(7).trim()
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt)
  if (userErr || !user) {
    return json({ error: 'Invalid session' }, 401, corsHeaders)
  }
  const { data: prof, error: pErr } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (pErr || (prof as { role?: string } | null)?.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403, corsHeaders)
  }

  return { admin }
}

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[send-email] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server misconfiguration' }, 500, corsHeaders)
  }

  try {
    requireResendConfig()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'RESEND_API_KEY is not set'
    console.error('[send-email]', message)
    return json({ error: message }, 500, corsHeaders)
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, corsHeaders)
  }

  const body = raw as Record<string, unknown>

  // --- Client invoke: notify ops of a new reservation ---
  if (body?.mode === 'new_booking_admin' && typeof body.bookingId === 'string') {
    const authResult = await assertAuthenticatedCaller(req, supabaseUrl, serviceRoleKey, corsHeaders)
    if (authResult instanceof Response) {
      return authResult
    }
    const { admin, userId } = authResult
    try {
      const result = await sendNewBookingAdminNotify(admin, userId, body.bookingId)
      if (!result.ok && result.error === 'forbidden') {
        return json({ error: 'You can only notify for your own bookings.' }, 403, corsHeaders)
      }
      if (!result.ok && result.error) {
        return json({ error: result.error }, 400, corsHeaders)
      }
      return json({ ok: true, ...result }, 200, corsHeaders)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Email delivery failed'
      console.error('[send-email] new_booking_admin failed', e)
      return json({ error: message }, 500, corsHeaders)
    }
  }

  // --- Admin invoke (browser): user JWT + bookingId ---
  if (
    (body?.mode === 'admin_notify' || body?.mode === 'admin_cancel') &&
    typeof body.bookingId === 'string'
  ) {
    const authResult = await assertAdminCaller(req, supabaseUrl, serviceRoleKey, corsHeaders)
    if (authResult instanceof Response) {
      return authResult
    }
    const { admin } = authResult

    try {
      if (body.mode === 'admin_cancel') {
        const result = await sendBookingCancelled(admin, body.bookingId)
        if (!result.ok && result.error) {
          const msg =
            result.error === 'booking_or_client_missing'
              ? 'Could not find this booking or the guest has no email on file.'
              : result.error
          return json({ error: msg }, 400, corsHeaders)
        }
        return json({ ok: true, ...result }, 200, corsHeaders)
      }

      const result = await sendRideConfirmedIfAssigned(admin, body.bookingId)
      if (!result.ok && result.error) {
        return json({ error: result.error }, 400, corsHeaders)
      }
      return json({ ok: true, ...result }, 200, corsHeaders)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Email delivery failed'
      console.error('[send-email] admin invoke send failed', body.mode, e)
      return json({ error: message }, 500, corsHeaders)
    }
  }

  // --- Database webhook: shared secret ---
  const secret = Deno.env.get('BOOKING_EMAIL_WEBHOOK_SECRET')
  if (!secret || secret.length < 24) {
    console.error('[send-email] BOOKING_EMAIL_WEBHOOK_SECRET missing or too short')
    return json({ error: 'Server misconfiguration' }, 500, corsHeaders)
  }

  const auth = req.headers.get('Authorization')
  const headerSecret = req.headers.get('x-webhook-secret')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const bearerOk = bearer != null && timingSafeEqual(bearer, secret)
  const headerOk = headerSecret != null && timingSafeEqual(headerSecret, secret)
  if (!bearerOk && !headerOk) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders)
  }

  const payload = raw as DbWebhookPayload
  if (payload.type !== 'UPDATE' || payload.table !== 'bookings' || !payload.record) {
    return json({ ok: true, skipped: true, reason: 'not_bookings_update' }, 200, corsHeaders)
  }

  const record = payload.record
  const old = payload.old_record ?? null
  const oldStatus = old ? str(old.status) : null
  const newStatus = str(record.status)

  const bookingId = str(record.id)
  if (!bookingId) {
    return json({ error: 'Missing booking id' }, 400, corsHeaders)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Client email when ops assigns a chauffeur (includes driver phone from roster).
  if (oldStatus !== 'assigned' && newStatus === 'assigned' && str(record.driver_id)) {
    try {
      const result = await sendRideConfirmedIfAssigned(admin, bookingId)
      if (!result.ok && result.error) {
        return json({ error: result.error }, 500, corsHeaders)
      }
    } catch (e) {
      console.error('[send-email] webhook ride_confirmed failed', e)
      return json({ error: 'Email delivery failed' }, 500, corsHeaders)
    }
  }

  // Client email when ops cancels the reservation.
  if (oldStatus !== 'cancelled' && newStatus === 'cancelled') {
    try {
      const result = await sendBookingCancelled(admin, bookingId)
      if (!result.ok && result.error) {
        return json({ error: result.error }, 500, corsHeaders)
      }
    } catch (e) {
      console.error('[send-email] webhook booking_cancelled failed', e)
      return json({ error: 'Email delivery failed' }, 500, corsHeaders)
    }
  }

  return json({ ok: true, accepted: true }, 200, corsHeaders)
})
