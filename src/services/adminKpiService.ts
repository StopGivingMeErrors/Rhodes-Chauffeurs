import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns'
import { assertSupabaseConfigured, supabase } from '@/services/supabase'

export type AdminKpiBounds = {
  todayStart: string
  todayEnd: string
  monthStart: string
  monthEnd: string
}

export function computeAdminKpiBounds(reference = new Date()): AdminKpiBounds {
  return {
    todayStart: startOfDay(reference).toISOString(),
    todayEnd: endOfDay(reference).toISOString(),
    monthStart: startOfMonth(reference).toISOString(),
    monthEnd: endOfMonth(reference).toISOString(),
  }
}

export type AdminKpis = {
  todayBookings: number
  revenueThisMonth: number
  activeRides: number
  pendingAssignments: number
}

type PriceRow = {
  final_price: string | number | null
  estimated_price: string | number | null
}

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) {
    return 0
  }
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Loads operational KPIs using scoped Supabase queries (counts + revenue aggregate data).
 */
export async function fetchAdminKpis(bounds: AdminKpiBounds): Promise<AdminKpis> {
  assertSupabaseConfigured()

  const [todayRes, revenueRes, activeRes, pendingRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('pickup_datetime', bounds.todayStart)
      .lte('pickup_datetime', bounds.todayEnd),
    supabase
      .from('bookings')
      .select('final_price, estimated_price')
      .eq('status', 'completed')
      .gte('pickup_datetime', bounds.monthStart)
      .lte('pickup_datetime', bounds.monthEnd),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .is('driver_id', null),
  ])

  if (todayRes.error) {
    throw todayRes.error
  }
  if (revenueRes.error) {
    throw revenueRes.error
  }
  if (activeRes.error) {
    throw activeRes.error
  }
  if (pendingRes.error) {
    throw pendingRes.error
  }

  let revenueThisMonth = 0
  for (const r of (revenueRes.data ?? []) as PriceRow[]) {
    const fp = num(r.final_price)
    const ep = num(r.estimated_price)
    revenueThisMonth += fp > 0 ? fp : ep
  }

  return {
    todayBookings: todayRes.count ?? 0,
    revenueThisMonth,
    activeRides: activeRes.count ?? 0,
    pendingAssignments: pendingRes.count ?? 0,
  }
}
