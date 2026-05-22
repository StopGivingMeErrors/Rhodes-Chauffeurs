export type VehicleCategory = 'sedan' | 'suv' | 'van' | 'sprinter'

export type Vehicle = {
  id: string
  name: string
  category: VehicleCategory
  capacity: number
  /** Legacy DB column; pricing is route-based — not shown to guests. */
  standardPrice: number
  imageUrl: string | null
  /** Shown on the landing page card (admin-written). */
  description: string | null
  features: string[]
  available: boolean
  sortOrder: number
}

export type VehicleInput = {
  name: string
  description?: string | null
  category?: VehicleCategory
  capacity?: number
  imageUrl?: string | null
  features?: string[]
  available?: boolean
  sortOrder?: number
}
