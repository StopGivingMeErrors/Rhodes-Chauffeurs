import { describe, expect, it } from 'vitest'
import type { TransportRoute } from '@/types/route'
import { formatRouteTierSummary, routePriceForPassengers } from '@/utils/routePricing'

const route: TransportRoute = {
  id: '1',
  title: 'Faliraki',
  subtitle: null,
  pickupAddress: 'Lindos',
  dropoffAddress: 'Faliraki',
  pickupLat: null,
  pickupLng: null,
  dropoffLat: null,
  dropoffLng: null,
  price: 65,
  price1to4: 65,
  price5to8: 100,
  pricingUnit: 'trip',
  active: true,
  sortOrder: 1,
}

describe('routePriceForPassengers', () => {
  it('returns 1–4 tier for up to 4 guests', () => {
    expect(routePriceForPassengers(route, 4)).toBe(65)
  })

  it('returns 5–8 tier from 5 guests', () => {
    expect(routePriceForPassengers(route, 5)).toBe(100)
  })
})

describe('formatRouteTierSummary', () => {
  it('shows both tiers when they differ', () => {
    expect(formatRouteTierSummary(route)).toContain('1–4: €65')
    expect(formatRouteTierSummary(route)).toContain('5–8: €100')
  })

  it('appends /hr for hourly routes', () => {
    const hourly = { ...route, pricingUnit: 'hour' as const, price1to4: 40, price5to8: 60 }
    expect(formatRouteTierSummary(hourly)).toContain('/hr')
  })
})
