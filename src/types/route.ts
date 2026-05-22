export type RoutePricingUnit = 'trip' | 'hour'

export type TransportRoute = {
  id: string
  title: string
  subtitle: string | null
  pickupAddress: string
  dropoffAddress: string
  pickupLat: number | null
  pickupLng: number | null
  dropoffLat: number | null
  dropoffLng: number | null
  /** Admin list / fallback (usually 1–4 guest price). */
  price: number
  price1to4: number
  price5to8: number
  pricingUnit: RoutePricingUnit
  active: boolean
  sortOrder: number
}

export type RouteInput = {
  title: string
  subtitle?: string | null
  pickupAddress: string
  dropoffAddress: string
  pickupLat?: number | null
  pickupLng?: number | null
  dropoffLat?: number | null
  dropoffLng?: number | null
  /** 1–4 passengers (EUR). */
  price1to4: number
  /** 5–8 passengers (EUR). */
  price5to8: number
  pricingUnit?: RoutePricingUnit
  active?: boolean
  sortOrder?: number
}
