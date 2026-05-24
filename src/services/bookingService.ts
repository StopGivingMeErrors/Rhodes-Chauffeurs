import { FunctionsHttpError } from '@supabase/supabase-js'
import { assertSupabaseConfigured, supabase, supabaseAnon } from '@/services/supabase'
import type { AssignedDriver, Booking, BookingDraft, BookingWithVehicle } from '@/types/booking'
import type { Vehicle, VehicleInput } from '@/types/vehicle'
import { ACTIVE_BOOKING_STATUSES } from '@/utils/adminBookingStatus'
import { formatSchedulingError } from '@/utils/bookingPickupValidation'
import {
  DEFAULT_SERVICE_DURATION_MINUTES,
  findSchedulingConflict,
  type BookingWindowRow,
} from '@/utils/bookingSchedule'
import { assertDraftPersistable, formatPostgrestError } from '@/utils/bookingValidation'
import {
  bookingStatusTransitionError,
  canAdminSetBookingStatus,
  isBookingMutableForAssignment,
} from '@/utils/bookingStatusTransitions'
import { startOfTodayIso } from '@/utils/bookingPickupWindow'
import { removeVehicleImageByPublicUrl } from '@/services/vehicleImageService'

/** Ensures a `profiles` row exists for the signed-in user (FK target for `bookings.client_id`). */
async function ensureClientProfileRow(userId: string): Promise<void> {
  const { data: existing, error: readErr } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (readErr) {
    throw new Error(formatPostgrestError(readErr))
  }
  if (existing) {
    return
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr) {
    throw new Error(sessionErr.message)
  }
  const u = sessionData.session?.user
  if (!u || u.id !== userId) {
    throw new Error('Your session is out of date. Sign in again, then continue your booking.')
  }
  const meta = (u.user_metadata ?? {}) as { full_name?: string }
  const email = (u.email ?? '').trim()
  if (!email) {
    throw new Error('Your account has no email on file. Add an email to your profile before booking.')
  }
  const fullName =
    typeof meta.full_name === 'string' && meta.full_name.trim().length > 0
      ? meta.full_name.trim()
      : email.split('@')[0] || 'Guest'

  const { error: insertErr } = await supabase.from('profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    phone: null,
    role: 'client',
  })
  if (insertErr?.code === '23505') {
    return
  }
  if (insertErr) {
    throw new Error(formatPostgrestError(insertErr))
  }
}

type VehicleRow = {
  id: string
  name: string
  category: string
  capacity: number
  standard_price?: string | number | null
  price_per_km?: string | number | null
  base_price?: string | number | null
  image_url: string | null
  features: string[] | null
  available: boolean
  sort_order?: number | null
  description?: string | null
}

type BookingRow = {
  id: string
  client_id: string
  booking_type?: string | null
  route_id?: string | null
  vehicle_id: string | null
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  pickup_lat?: string | number | null
  pickup_lng?: string | number | null
  dropoff_lat?: string | number | null
  dropoff_lng?: string | number | null
  pickup_datetime: string
  passengers: number
  flight_number: string | null
  special_requests: string | null
  status: string
  estimated_price: string | number | null
  quoted_price?: string | number | null
  final_price: string | number | null
  stripe_session_id?: string | null
  stripe_payment_intent_id?: string | null
  paid_at?: string | null
  distance_km: string | number | null
  currency?: string | null
  payment_method?: string | null
  pricing_mode?: string | null
  service_duration_minutes?: string | number | null
  created_at: string
  updated_at: string
}

type BookingRowWithVehicle = BookingRow & {
  vehicles?: { name: string } | { name: string }[] | null
  routes?: { title: string } | { title: string }[] | null
}

/** Single-vehicle fleet: assign first available vehicle for calendar overlap guard. */
async function resolveDefaultVehicleId(): Promise<string | null> {
  const { data, error } = await supabaseAnon
    .from('vehicles')
    .select('id')
    .eq('available', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn('[bookings] default vehicle lookup failed', error)
    return null
  }
  return (data as { id?: string } | null)?.id ?? null
}

async function routeTitleMapForIds(routeIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(routeIds.filter(Boolean))]
  if (unique.length === 0) return {}
  const { data, error } = await supabase.from('routes').select('id, title').in('id', unique)
  if (error) {
    console.warn('[bookings] route title lookup failed', error)
    return {}
  }
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    const id = (row as { id?: string }).id
    const title = (row as { title?: string }).title
    if (id && typeof title === 'string') map[id] = title
  }
  return map
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export async function listAvailableVehicles(): Promise<Vehicle[]> {
  assertSupabaseConfigured()
  const { data, error } = await supabaseAnon
    .from('vehicles')
    .select('*')
    .eq('available', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return (data as VehicleRow[]).map(mapVehicleRow)
}

async function vehicleNameMapForIds(vehicleIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(vehicleIds.filter(Boolean))]
  if (unique.length === 0) {
    return {}
  }
  const { data, error } = await supabase.from('vehicles').select('id, name').in('id', unique)
  if (error) {
    console.warn('[bookings] vehicle name lookup failed', error)
    return {}
  }
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    const id = (row as { id?: string }).id
    const name = (row as { name?: string }).name
    if (id && typeof name === 'string') {
      map[id] = name
    }
  }
  return map
}

async function clientProfileMapForIds(
  clientIds: string[],
): Promise<Record<string, { email: string; fullName: string | null; phone: string | null }>> {
  const unique = [...new Set(clientIds.filter(Boolean))]
  if (unique.length === 0) {
    return {}
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone')
    .in('id', unique)
  if (error) {
    console.warn('[bookings] client profile lookup failed', error)
    return {}
  }
  const map: Record<string, { email: string; fullName: string | null; phone: string | null }> = {}
  for (const row of data ?? []) {
    const r = row as { id?: string; email?: string; full_name?: string | null; phone?: string | null }
    if (r.id && typeof r.email === 'string' && r.email.trim()) {
      map[r.id] = {
        email: r.email.trim(),
        fullName: typeof r.full_name === 'string' && r.full_name.trim() ? r.full_name.trim() : null,
        phone: typeof r.phone === 'string' && r.phone.trim() ? r.phone.trim() : null,
      }
    }
  }
  return map
}

async function assertNoFleetSchedulingConflict(
  pickupDatetime: string,
  serviceDurationMinutes: number,
  excludeBookingId?: string,
): Promise<void> {
  const duration =
    Number.isFinite(serviceDurationMinutes) && serviceDurationMinutes > 0
      ? serviceDurationMinutes
      : DEFAULT_SERVICE_DURATION_MINUTES
  const pickupMs = Date.parse(pickupDatetime)
  if (Number.isNaN(pickupMs)) {
    throw new Error('Pickup date and time are invalid.')
  }
  const bufferStart = new Date(
    pickupMs - DEFAULT_SERVICE_DURATION_MINUTES * 60_000,
  ).toISOString()
  const bufferEnd = new Date(
    pickupMs + duration * 60_000 + DEFAULT_SERVICE_DURATION_MINUTES * 60_000,
  ).toISOString()

  let query = supabase
    .from('bookings')
    .select('id, pickup_datetime, service_duration_minutes')
    .in('status', ACTIVE_BOOKING_STATUSES)
    .gte('pickup_datetime', bufferStart)
    .lte('pickup_datetime', bufferEnd)

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(formatPostgrestError(error))
  }

  const rows: BookingWindowRow[] = (data ?? []).map((row) => {
    const r = row as {
      pickup_datetime?: string
      service_duration_minutes?: number | null
    }
    return {
      pickupDatetime: String(r.pickup_datetime ?? ''),
      serviceDurationMinutes: r.service_duration_minutes,
    }
  })
  if (findSchedulingConflict(pickupDatetime, duration, rows)) {
    throw new Error(
      formatSchedulingError(new Error('Another trip is already reserved in this time window')),
    )
  }
}

async function assertNoDuplicateActiveBooking(
  clientId: string,
  pickupDatetime: string,
  excludeBookingId?: string,
): Promise<void> {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('client_id', clientId)
    .eq('pickup_datetime', pickupDatetime)
    .in('status', ACTIVE_BOOKING_STATUSES)

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    throw new Error(formatPostgrestError(error))
  }
  if (data?.id) {
    throw new Error(
      'You already have an active reservation for this pickup time. Open it from your dashboard or choose a different schedule.',
    )
  }
}

async function driverMapForIds(driverIds: string[]): Promise<Record<string, AssignedDriver>> {
  const unique = [...new Set(driverIds.filter(Boolean))]
  if (unique.length === 0) {
    return {}
  }
  const { data, error } = await supabase
    .from('company_drivers')
    .select('id, full_name, phone')
    .in('id', unique)
  if (error) {
    console.warn('[bookings] driver lookup failed', error)
    return {}
  }
  const map: Record<string, AssignedDriver> = {}
  for (const row of data ?? []) {
    const r = row as { id?: string; full_name?: string; phone?: string | null }
    if (r.id && typeof r.full_name === 'string') {
      map[r.id] = {
        fullName: r.full_name,
        phone: r.phone?.trim() ? r.phone.trim() : null,
      }
    }
  }
  return map
}

function attachBookingListMeta(
  rows: BookingRow[],
  nameByVehicleId: Record<string, string>,
  titleByRouteId: Record<string, string>,
  driverById: Record<string, AssignedDriver>,
  clientById: Record<string, { email: string; fullName: string | null; phone: string | null }>,
): BookingWithVehicle[] {
  return rows.map((row) => {
    const vid = row.vehicle_id
    const vname = vid ? nameByVehicleId[vid] : undefined
    const rid = row.route_id
    const rtitle = rid ? titleByRouteId[rid] : undefined
    const withJoin: BookingRowWithVehicle = {
      ...row,
      vehicles: vname ? { name: vname } : null,
      routes: rtitle ? { title: rtitle } : null,
    }
    const booking = mapBookingRowWithVehicle(withJoin)
    const did = row.driver_id
    if (did && driverById[did]) {
      booking.driver = driverById[did]
    }
    const client = clientById[row.client_id]
    booking.clientEmail = client?.email ?? null
    booking.clientFullName = client?.fullName ?? null
    booking.clientPhone = client?.phone ?? null
    return booking
  })
}

/** Deletes bookings with pickup before today (admin-only RPC). */
export async function purgeBookingsBeforeToday(): Promise<void> {
  assertSupabaseConfigured()
  const { error } = await supabase.rpc('purge_bookings_before_today')
  if (error) {
    console.warn('[bookings] purge past failed', error.message)
  }
}

export async function listBookingsForUser(userId: string): Promise<BookingWithVehicle[]> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', userId)
    .gte('pickup_datetime', startOfTodayIso())
    .order('pickup_datetime', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as BookingRow[]
  const nameMap = await vehicleNameMapForIds(rows.map((r) => r.vehicle_id).filter((x): x is string => Boolean(x)))
  const driverMap = await driverMapForIds(rows.map((r) => r.driver_id).filter((x): x is string => Boolean(x)))
  const routeMap = await routeTitleMapForIds(rows.map((r) => r.route_id).filter((x): x is string => Boolean(x)))
  const clientMap = await clientProfileMapForIds(rows.map((r) => r.client_id))
  return attachBookingListMeta(rows, nameMap, routeMap, driverMap, clientMap)
}

export async function listAllBookingsAdmin(): Promise<BookingWithVehicle[]> {
  assertSupabaseConfigured()
  await purgeBookingsBeforeToday()
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('pickup_datetime', startOfTodayIso())
    .order('pickup_datetime', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as BookingRow[]
  const nameMap = await vehicleNameMapForIds(rows.map((r) => r.vehicle_id).filter((x): x is string => Boolean(x)))
  const routeMap = await routeTitleMapForIds(rows.map((r) => r.route_id).filter((x): x is string => Boolean(x)))
  const clientMap = await clientProfileMapForIds(rows.map((r) => r.client_id))
  return attachBookingListMeta(rows, nameMap, routeMap, {}, clientMap)
}

export async function getBookingById(id: string): Promise<Booking | null> {
  assertSupabaseConfigured()
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as BookingRow
  const booking = mapBookingRow(row)
  if (row.route_id) {
    const titles = await routeTitleMapForIds([row.route_id])
    booking.routeTitle = titles[row.route_id] ?? null
  }
  return booking
}

export async function createBooking(userId: string, draft: BookingDraft): Promise<Booking> {
  assertSupabaseConfigured()
  assertDraftPersistable(draft)
  await ensureClientProfileRow(userId)

  await assertNoDuplicateActiveBooking(userId, draft.pickupDatetime)
  await assertNoFleetSchedulingConflict(
    draft.pickupDatetime,
    draft.serviceDurationMinutes ?? DEFAULT_SERVICE_DURATION_MINUTES,
  )

  const vehicleId = await resolveDefaultVehicleId()

  const payload: Record<string, unknown> = {
    client_id: userId,
    booking_type: draft.bookingType,
    route_id: draft.routeId,
    vehicle_id: vehicleId,
    pickup_address: draft.pickupAddress,
    dropoff_address: draft.dropoffAddress,
    pickup_datetime: draft.pickupDatetime,
    passengers: draft.passengers,
    flight_number: draft.flightNumber,
    special_requests: draft.specialRequests,
    status: 'pending',
    driver_id: null,
    estimated_price: draft.estimatedPrice,
    quoted_price: draft.quotedPrice,
    pricing_mode: draft.pricingMode,
    distance_km: draft.distanceKm ?? null,
    payment_method: draft.bookingType === 'custom' ? 'cash' : 'stripe',
    pickup_lat: draft.pickupLat ?? null,
    pickup_lng: draft.pickupLng ?? null,
    dropoff_lat: draft.dropoffLat ?? null,
    dropoff_lng: draft.dropoffLng ?? null,
  }
  if (draft.serviceDurationMinutes != null) {
    payload.service_duration_minutes = draft.serviceDurationMinutes
  }

  const { data, error } = await supabase.from('bookings').insert(payload).select('*').single()

  if (error) {
    throw new Error(formatSchedulingError(new Error(formatPostgrestError(error))))
  }

  const booking = mapBookingRow(data as BookingRow)
  void requestAdminNewBookingEmail(booking.id)
  return booking
}

/** Client-owned pending booking: refresh route, vehicle, estimate, and contact-related fields before payment. */
export async function updatePendingBooking(id: string, draft: BookingDraft): Promise<Booking> {
  assertSupabaseConfigured()
  assertDraftPersistable(draft)

  const existing = await getBookingById(id)
  if (!existing) {
    throw new Error('Booking not found.')
  }
  if (existing.status !== 'pending') {
    throw new Error(
      'This reservation is no longer in draft (it may already be paid and confirmed). Refresh the page or open it from your dashboard.',
    )
  }
  await assertNoDuplicateActiveBooking(existing.clientId, draft.pickupDatetime, id)
  await assertNoFleetSchedulingConflict(
    draft.pickupDatetime,
    draft.serviceDurationMinutes ?? existing.serviceDurationMinutes ?? DEFAULT_SERVICE_DURATION_MINUTES,
    id,
  )

  const payload: Record<string, unknown> = {
    booking_type: draft.bookingType,
    route_id: draft.routeId,
    pickup_address: draft.pickupAddress,
    dropoff_address: draft.dropoffAddress,
    pickup_datetime: draft.pickupDatetime,
    passengers: draft.passengers,
    flight_number: draft.flightNumber,
    special_requests: draft.specialRequests,
    estimated_price: draft.estimatedPrice,
    quoted_price: draft.quotedPrice,
    pricing_mode: draft.pricingMode,
    payment_method: draft.bookingType === 'custom' ? 'cash' : 'stripe',
    distance_km: draft.distanceKm ?? null,
    pickup_lat: draft.pickupLat ?? null,
    pickup_lng: draft.pickupLng ?? null,
    dropoff_lat: draft.dropoffLat ?? null,
    dropoff_lng: draft.dropoffLng ?? null,
    updated_at: new Date().toISOString(),
  }
  if (draft.serviceDurationMinutes != null) {
    payload.service_duration_minutes = draft.serviceDurationMinutes
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(formatSchedulingError(new Error(formatPostgrestError(error))))
  }
  if (!data) {
    throw new Error(
      'This reservation is no longer in draft (it may already be paid and confirmed). Refresh the page or open it from your dashboard.',
    )
  }

  return mapBookingRow(data as BookingRow)
}

/** Confirm a pending booking as cash-on-service (no Stripe). Uses RPC with ownership checks. */
export async function confirmBookingCash(bookingId: string): Promise<Booking> {
  assertSupabaseConfigured()
  const { data, error } = await supabase.rpc('confirm_booking_cash', { p_booking_id: bookingId })
  if (error) {
    const msg = formatPostgrestError(error)
    if (/cannot confirm cash/i.test(msg)) {
      throw new Error(
        `${msg} Custom routes must be cash-only. Cancel this pending booking and create a new one, or ask support to apply the latest database migration.`,
      )
    }
    throw new Error(msg)
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Cash confirmation returned no booking.')
  }
  const row = Array.isArray(data) ? (data[0] as BookingRow) : (data as BookingRow)
  if (!row?.id) {
    throw new Error('Cash confirmation returned no booking.')
  }
  return mapBookingRow(row)
}

/** Client may cancel only while the reservation is still pending (before paid / confirmed flow). */
export async function cancelBookingByClient(id: string): Promise<Booking> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error(
      'Only pending reservations can be cancelled. If this trip is already confirmed or paid, use your dashboard or contact support.',
    )
  }

  return mapBookingRow(data as BookingRow)
}

export async function updateBookingStatus(id: string, status: Booking['status']) {
  assertSupabaseConfigured()
  const existing = await getBookingById(id)
  if (!existing) {
    throw new Error('Booking not found.')
  }
  if (!canAdminSetBookingStatus(existing.status, status)) {
    throw new Error(bookingStatusTransitionError(existing.status, status))
  }
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('Booking not found or you do not have permission to update it.')
  }

  return mapBookingRow(data as BookingRow)
}

/** Admin sets quoted price for a custom-route booking (clears stale Stripe session). */
export async function setBookingQuotedPriceAdmin(bookingId: string, quotedPrice: number): Promise<Booking> {
  assertSupabaseConfigured()
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
    throw new Error('Quote must be a positive amount.')
  }
  const { data, error } = await supabase
    .from('bookings')
    .update({
      quoted_price: quotedPrice,
      stripe_session_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('booking_type', 'custom')
    .select('*')
    .maybeSingle()

  if (error) throw new Error(formatPostgrestError(error))
  if (!data) throw new Error('Booking not found or not a custom route request.')
  return mapBookingRow(data as BookingRow)
}

export async function assignBookingDriver(bookingId: string, driverId: string | null): Promise<Booking> {
  assertSupabaseConfigured()
  const booking = await getBookingById(bookingId)
  if (!booking) {
    throw new Error('Booking not found')
  }
  if (!isBookingMutableForAssignment(booking.status)) {
    throw new Error(
      booking.status === 'cancelled'
        ? 'Cannot assign a driver to a cancelled reservation.'
        : 'Cannot change driver assignment on a completed reservation.',
    )
  }

  const patch: Record<string, unknown> = {
    driver_id: driverId,
  }

  if (driverId) {
    if (booking.status === 'pending' || booking.status === 'confirmed') {
      patch.status = 'assigned'
    }
  } else if (booking.status === 'assigned') {
    patch.status = 'confirmed'
  }

  const { data, error } = await supabase.from('bookings').update(patch).eq('id', bookingId).select('*').maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('Booking not found or update not allowed.')
  }

  return mapBookingRow(data as BookingRow)
}

export async function assignBookingVehicle(bookingId: string, vehicleId: string | null): Promise<Booking> {
  assertSupabaseConfigured()
  const booking = await getBookingById(bookingId)
  if (!booking) {
    throw new Error('Booking not found')
  }
  if (!isBookingMutableForAssignment(booking.status)) {
    throw new Error(
      booking.status === 'cancelled'
        ? 'Cannot change vehicle on a cancelled reservation.'
        : 'Cannot change vehicle on a completed reservation.',
    )
  }
  if (vehicleId) {
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .maybeSingle()
    if (vehicleErr) {
      throw new Error(formatPostgrestError(vehicleErr))
    }
    if (!vehicle) {
      throw new Error('Vehicle not found.')
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ vehicle_id: vehicleId, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(formatSchedulingError(new Error(formatPostgrestError(error))))
  }
  if (!data) {
    throw new Error('Booking not found or update not allowed.')
  }

  return mapBookingRow(data as BookingRow)
}

/**
 * Ask the `send-email` Edge Function to email the client their confirmed ride details (after a driver is assigned).
 * Uses the signed-in admin session. Failures are logged only so admin UI still succeeds.
 */
async function parseSendEmailInvokeError(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  let message = error instanceof Error ? error.message : fallback
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (typeof body?.error === 'string' && body.error.trim()) {
        message = body.error
      }
    } catch {
      /* keep message */
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

/** Notify operations that a guest created a new reservation (fire-and-forget from createBooking). */
export async function requestAdminNewBookingEmail(bookingId: string): Promise<void> {
  assertSupabaseConfigured()
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { mode: 'new_booking_admin', bookingId },
  })
  if (error) {
    const message = await parseSendEmailInvokeError(error, data, 'Could not notify admin of new booking.')
    console.warn('[booking] requestAdminNewBookingEmail', message)
  }
}

export async function requestRideConfirmedClientEmail(bookingId: string): Promise<void> {
  assertSupabaseConfigured()
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { mode: 'admin_notify', bookingId },
  })
  if (error) {
    const message = await parseSendEmailInvokeError(error, data, 'Could not send confirmation email.')
    console.warn('[booking] requestRideConfirmedClientEmail', message)
  }
}

/** Notify the client their reservation was cancelled by operations (admin dashboard). */
export async function requestBookingCancelledClientEmail(bookingId: string): Promise<void> {
  assertSupabaseConfigured()
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { mode: 'admin_cancel', bookingId },
  })
  if (error) {
    const message = await parseSendEmailInvokeError(error, data, 'Could not send cancellation email.')
    throw new Error(message)
  }
}

export async function listAllVehiclesAdmin(): Promise<Vehicle[]> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return (data as VehicleRow[]).map(mapVehicleRow)
}

export async function createVehicleAdmin(input: VehicleInput): Promise<Vehicle> {
  assertSupabaseConfigured()
  const features = (input.features ?? []).map((f) => f.trim()).filter(Boolean)
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category ?? 'suv',
      capacity: input.capacity ?? 8,
      image_url: input.imageUrl?.trim() || null,
      features,
      available: input.available ?? true,
      sort_order: input.sortOrder ?? 0,
      standard_price: 0,
      price_per_km: 0,
      base_price: 0,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapVehicleRow(data as VehicleRow)
}

export async function deleteVehicleAdmin(id: string): Promise<void> {
  assertSupabaseConfigured()
  const { data: row } = await supabase.from('vehicles').select('image_url').eq('id', id).maybeSingle()
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) {
    throw error
  }
  const url = (row as { image_url?: string | null } | null)?.image_url
  await removeVehicleImageByPublicUrl(url)
}

export async function updateVehicleFleet(
  id: string,
  patch: Partial<
    Pick<
      Vehicle,
      'available' | 'capacity' | 'name' | 'description' | 'category' | 'imageUrl' | 'features' | 'sortOrder'
    >
  >,
): Promise<Vehicle> {
  assertSupabaseConfigured()
  const row: Record<string, unknown> = {}
  if (patch.available !== undefined) {
    row.available = patch.available
  }
  if (patch.capacity !== undefined) {
    row.capacity = patch.capacity
  }
  if (patch.name !== undefined) {
    row.name = patch.name.trim()
  }
  if (patch.description !== undefined) {
    row.description = patch.description?.trim() || null
  }
  if (patch.category !== undefined) {
    row.category = patch.category
  }
  if (patch.imageUrl !== undefined) {
    row.image_url = patch.imageUrl?.trim() || null
  }
  if (patch.features !== undefined) {
    row.features = patch.features.map((f) => f.trim()).filter(Boolean)
  }
  if (patch.sortOrder !== undefined) {
    row.sort_order = patch.sortOrder
  }

  if (Object.keys(row).length === 0) {
    const { data, error: fetchError } = await supabase.from('vehicles').select('*').eq('id', id).single()
    if (fetchError) {
      throw fetchError
    }
    return mapVehicleRow(data as VehicleRow)
  }

  const { data, error } = await supabase.from('vehicles').update(row).eq('id', id).select('*').single()

  if (error) {
    throw error
  }

  return mapVehicleRow(data as VehicleRow)
}

function mapVehicleRow(row: VehicleRow): Vehicle {
  const fromCol = toNumber(row.standard_price)
  const legacy =
    Math.round(((toNumber(row.base_price) ?? 0) + 18 * (toNumber(row.price_per_km) ?? 0)) * 100) / 100
  const standardPrice = fromCol != null ? fromCol : legacy

  return {
    id: row.id,
    name: row.name,
    category: row.category as Vehicle['category'],
    capacity: row.capacity,
    standardPrice,
    imageUrl: row.image_url,
    description: row.description?.trim() || null,
    features: row.features ?? [],
    available: row.available,
    sortOrder: row.sort_order ?? 0,
  }
}

function vehicleNameFromRow(row: BookingRowWithVehicle): string | null {
  const v = row.vehicles
  if (!v) {
    return null
  }
  if (Array.isArray(v)) {
    return v[0]?.name ?? null
  }
  return v.name ?? null
}

function routeTitleFromRow(row: BookingRowWithVehicle): string | null {
  const r = row.routes
  if (!r) return null
  if (Array.isArray(r)) return r[0]?.title ?? null
  return r.title ?? null
}

function mapBookingRowWithVehicle(row: BookingRowWithVehicle): BookingWithVehicle {
  return {
    ...mapBookingRow(row),
    vehicleName: vehicleNameFromRow(row),
    routeTitle: routeTitleFromRow(row),
    clientEmail: null,
    clientFullName: null,
    clientPhone: null,
  }
}

function mapBookingRow(row: BookingRow): Booking {
  const pm = row.payment_method === 'cash' ? 'cash' : 'stripe'
  const bookingType = row.booking_type === 'custom' ? 'custom' : 'fixed'
  const pricingMode =
    (row.pricing_mode as Booking['pricingMode']) ??
    (bookingType === 'custom' ? 'custom_route' : 'fixed_route')

  return {
    id: row.id,
    clientId: row.client_id,
    bookingType,
    routeId: row.route_id ?? null,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    pickupDatetime: row.pickup_datetime,
    passengers: row.passengers,
    flightNumber: row.flight_number,
    specialRequests: row.special_requests,
    status: row.status as Booking['status'],
    estimatedPrice: toNumber(row.estimated_price),
    quotedPrice: toNumber(row.quoted_price),
    finalPrice: toNumber(row.final_price),
    distanceKm: toNumber(row.distance_km),
    currency: row.currency ?? 'eur',
    paymentMethod: pm,
    pricingMode,
    serviceDurationMinutes: Math.round(toNumber(row.service_duration_minutes) ?? 120),
    stripeSessionId: row.stripe_session_id ?? null,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
