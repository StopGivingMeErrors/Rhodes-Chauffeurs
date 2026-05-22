import { DEFAULT_FIXED_ROUTES } from '@/config/defaultRoutes'
import { assertSupabaseConfigured, supabase, supabaseAnon } from '@/services/supabase'
import type { RouteInput, TransportRoute } from '@/types/route'

function activeDefaultRoutes(): TransportRoute[] {
  return DEFAULT_FIXED_ROUTES.filter((r) => r.active)
}

type RouteRow = {
  id: string
  title: string
  subtitle: string | null
  pickup_address: string
  dropoff_address: string
  pickup_lat: string | number | null
  pickup_lng: string | number | null
  dropoff_lat: string | number | null
  dropoff_lng: string | number | null
  price: string | number
  price_1_4?: string | number | null
  price_5_8?: string | number | null
  pricing_unit?: string | null
  active: boolean
  sort_order: number
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function mapRouteRow(row: RouteRow): TransportRoute {
  const p14 = toNum(row.price_1_4) ?? toNum(row.price) ?? 0
  const p58 = toNum(row.price_5_8) ?? p14
  const unit = row.pricing_unit === 'hour' ? 'hour' : 'trip'
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    pickupLat: toNum(row.pickup_lat),
    pickupLng: toNum(row.pickup_lng),
    dropoffLat: toNum(row.dropoff_lat),
    dropoffLng: toNum(row.dropoff_lng),
    price: p14,
    price1to4: p14,
    price5to8: p58,
    pricingUnit: unit,
    active: row.active,
    sortOrder: row.sort_order,
  }
}

export async function listActiveRoutes(): Promise<TransportRoute[]> {
  assertSupabaseConfigured()
  const { data, error } = await supabaseAnon
    .from('routes')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '42P01' || code === 'PGRST205') {
      return activeDefaultRoutes()
    }
    throw error
  }
  const mapped = (data as RouteRow[]).map(mapRouteRow)
  return mapped.length > 0 ? mapped : activeDefaultRoutes()
}

export async function listAllRoutesAdmin(): Promise<TransportRoute[]> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '42P01' || code === 'PGRST205') {
      return DEFAULT_FIXED_ROUTES
    }
    throw error
  }
  const mapped = (data as RouteRow[]).map(mapRouteRow)
  return mapped.length > 0 ? mapped : DEFAULT_FIXED_ROUTES
}

function buildRouteSubtitle(
  price1to4: number,
  price5to8: number,
  pricingUnit: 'trip' | 'hour',
  custom?: string | null,
): string | null {
  const customTrim = custom?.trim()
  if (customTrim) {
    return customTrim
  }
  const unit = pricingUnit === 'hour' ? '/hr' : ''
  const tier =
    price1to4 === price5to8
      ? `€${price1to4}${unit} for 1–4 or 5–8 guests`
      : `1–4 guests €${price1to4}${unit} · 5–8 guests €${price5to8}${unit}`
  return `Starting base: Lindos · ${tier}`
}

export async function createRouteAdmin(input: RouteInput): Promise<TransportRoute> {
  assertSupabaseConfigured()
  const p14 = input.price1to4
  const p58 = input.price5to8
  const unit = input.pricingUnit ?? 'trip'
  const { data, error } = await supabase
    .from('routes')
    .insert({
      title: input.title.trim(),
      subtitle: buildRouteSubtitle(p14, p58, unit, input.subtitle),
      pickup_address: input.pickupAddress.trim(),
      dropoff_address: input.dropoffAddress.trim(),
      pickup_lat: input.pickupLat ?? null,
      pickup_lng: input.pickupLng ?? null,
      dropoff_lat: input.dropoffLat ?? null,
      dropoff_lng: input.dropoffLng ?? null,
      price: p14,
      price_1_4: p14,
      price_5_8: p58,
      pricing_unit: unit,
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapRouteRow(data as RouteRow)
}

export async function updateRouteAdmin(
  id: string,
  patch: Partial<RouteInput>,
): Promise<TransportRoute> {
  assertSupabaseConfigured()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) row.title = patch.title.trim()
  if (patch.subtitle !== undefined) row.subtitle = patch.subtitle?.trim() || null
  if (patch.pickupAddress !== undefined) row.pickup_address = patch.pickupAddress.trim()
  if (patch.dropoffAddress !== undefined) row.dropoff_address = patch.dropoffAddress.trim()
  if (patch.pickupLat !== undefined) row.pickup_lat = patch.pickupLat
  if (patch.pickupLng !== undefined) row.pickup_lng = patch.pickupLng
  if (patch.dropoffLat !== undefined) row.dropoff_lat = patch.dropoffLat
  if (patch.dropoffLng !== undefined) row.dropoff_lng = patch.dropoffLng
  if (patch.price1to4 !== undefined) {
    row.price_1_4 = patch.price1to4
    row.price = patch.price1to4
  }
  if (patch.price5to8 !== undefined) {
    row.price_5_8 = patch.price5to8
  }
  if (patch.pricingUnit !== undefined) {
    row.pricing_unit = patch.pricingUnit
  }
  if (patch.active !== undefined) row.active = patch.active
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder

  if (
    patch.price1to4 !== undefined ||
    patch.price5to8 !== undefined ||
    patch.pricingUnit !== undefined
  ) {
    const current = await getRouteById(id)
    if (current) {
      const p14 = patch.price1to4 ?? current.price1to4
      const p58 = patch.price5to8 ?? current.price5to8
      const unit = patch.pricingUnit ?? current.pricingUnit
      row.subtitle = buildRouteSubtitle(p14, p58, unit, patch.subtitle ?? current.subtitle)
    }
  } else if (patch.subtitle !== undefined) {
    row.subtitle = patch.subtitle?.trim() || null
  }

  const { data, error } = await supabase.from('routes').update(row).eq('id', id).select('*').single()
  if (error) throw error
  return mapRouteRow(data as RouteRow)
}

export async function getRouteById(id: string): Promise<TransportRoute | null> {
  assertSupabaseConfigured()
  const { data, error } = await supabase.from('routes').select('*').eq('id', id).maybeSingle()
  if (error) {
    const code = (error as { code?: string }).code
    if (code === '42P01' || code === 'PGRST205') {
      return DEFAULT_FIXED_ROUTES.find((r) => r.id === id) ?? null
    }
    throw error
  }
  if (!data) {
    return DEFAULT_FIXED_ROUTES.find((r) => r.id === id) ?? null
  }
  return mapRouteRow(data as RouteRow)
}
