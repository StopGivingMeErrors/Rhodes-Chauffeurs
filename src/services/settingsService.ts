import { DEFAULT_CUSTOM_ROUTE_PRICE_EUR } from '@/config/pricing'
import { assertSupabaseConfigured, supabase, supabaseAnon } from '@/services/supabase'

const CUSTOM_ROUTE_PRICE_KEY = 'custom_route_price_eur'

export async function getCustomRoutePrice(): Promise<number> {
  assertSupabaseConfigured()
  const { data, error } = await supabaseAnon
    .from('app_settings')
    .select('value_numeric')
    .eq('key', CUSTOM_ROUTE_PRICE_KEY)
    .maybeSingle()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '42P01' || code === 'PGRST205') {
      return DEFAULT_CUSTOM_ROUTE_PRICE_EUR
    }
    throw error
  }

  const n = data?.value_numeric != null ? Number(data.value_numeric) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CUSTOM_ROUTE_PRICE_EUR
}

export async function updateCustomRoutePriceAdmin(price: number): Promise<number> {
  assertSupabaseConfigured()
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be greater than zero.')
  }
  const rounded = Math.round(price * 100) / 100
  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      { key: CUSTOM_ROUTE_PRICE_KEY, value_numeric: rounded, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    .select('value_numeric')
    .single()

  if (error) throw error
  return Number(data.value_numeric)
}
