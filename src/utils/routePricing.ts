import type { TransportRoute } from '@/types/route'

export const LINDOS_STARTING_BASE = 'Lindos, Rhodes, Greece'

/** Passengers 1–4 use tier A; 5–8 use tier B (catalogue). */
export function routePriceForPassengers(route: TransportRoute, passengers: number): number {
  const tier58 = route.price5to8 ?? route.price
  const tier14 = route.price1to4 ?? route.price
  return passengers >= 5 ? tier58 : tier14
}

export function formatRouteTierSummary(route: TransportRoute): string {
  const p14 = route.price1to4 ?? route.price
  const p58 = route.price5to8 ?? route.price
  const unit = route.pricingUnit === 'hour' ? '/hr' : ''
  if (p14 === p58) {
    return `1–8 guests: €${p14}${unit}`
  }
  return `1–4: €${p14}${unit} · 5–8: €${p58}${unit}`
}
