import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { BookingType } from '@/types/booking'
import type { RoutePricingUnit, TransportRoute } from '@/types/route'
import { snapPickupSchedule } from '@/utils/bookingPickupValidation'
import { toPickupIso } from '@/utils/bookingWizard'
import { routePriceForPassengers } from '@/utils/routePricing'

export type BookingWizardStep = 1 | 2 | 3

export type BookingStoreState = {
  lastCreatedBookingId: string | null
  currentStep: BookingWizardStep
  checkoutBookingId: string | null
  checkoutFingerprint: string | null
  wizardOwnerId: string | null
  bookingType: BookingType | null
  routeId: string | null
  /** Locked display price when a fixed route is selected */
  lockedRoutePrice: number | null
  /** Tier prices for selected fixed route (passenger-based catalogue). */
  fixedRoutePrice1to4: number | null
  fixedRoutePrice5to8: number | null
  fixedRoutePricingUnit: RoutePricingUnit | null
  pickupAddress: string
  dropoffAddress: string
  pickupDate: string
  pickupTime: string
  passengers: number
  flightNumber: string
  pickupLat: number | null
  pickupLng: number | null
  dropoffLat: number | null
  dropoffLng: number | null
  pickupDatetime: string
  fullName: string
  email: string
  phone: string
  specialRequests: string
  saveToProfile: boolean
}

type BookingStoreActions = {
  setLastCreatedBookingId: (id: string | null) => void
  setStep: (step: BookingWizardStep) => void
  setJourney: (patch: Partial<
    Pick<
      BookingStoreState,
      | 'pickupAddress'
      | 'dropoffAddress'
      | 'pickupDate'
      | 'pickupTime'
      | 'passengers'
      | 'flightNumber'
      | 'pickupLat'
      | 'pickupLng'
      | 'dropoffLat'
      | 'dropoffLng'
      | 'pickupDatetime'
    >
  >) => void
  setContact: (patch: Partial<
    Pick<BookingStoreState, 'fullName' | 'email' | 'phone' | 'specialRequests' | 'saveToProfile'>
  >) => void
  setCheckout: (bookingId: string | null, fingerprint: string | null, wizardOwnerId?: string | null) => void
  prepareCustomRouteForm: () => void
  enterCustomRoute: (premiumPrice: number) => void
  applyFixedRoute: (route: TransportRoute) => void
  setCustomRouteReady: () => void
  resetWizard: () => void
}

type BookingStore = BookingStoreState & BookingStoreActions

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const initialState = (): BookingStoreState => {
  const date = today()
  const { pickupDate, pickupTime } = snapPickupSchedule(date, '10:00')
  return {
  lastCreatedBookingId: null,
  currentStep: 1,
  checkoutBookingId: null,
  checkoutFingerprint: null,
  wizardOwnerId: null,
  bookingType: null,
  routeId: null,
  lockedRoutePrice: null,
  fixedRoutePrice1to4: null,
  fixedRoutePrice5to8: null,
  fixedRoutePricingUnit: null,
  pickupAddress: '',
  dropoffAddress: '',
  pickupDate,
  pickupTime,
  passengers: 2,
  flightNumber: '',
  pickupLat: null,
  pickupLng: null,
  dropoffLat: null,
  dropoffLng: null,
  pickupDatetime: '',
  fullName: '',
  email: '',
  phone: '',
  specialRequests: '',
  saveToProfile: false,
  }
}

export const useBookingStore = create(
  persist<BookingStore>(
    (set) => ({
      ...initialState(),
      setLastCreatedBookingId: (lastCreatedBookingId) => set({ lastCreatedBookingId }),
      setStep: (currentStep) => set({ currentStep }),
      setJourney: (patch) =>
        set((s) => {
          const next = { ...s, ...patch }
          if (
            next.bookingType === 'fixed' &&
            next.routeId &&
            patch.passengers !== undefined
          ) {
            const p14 = next.fixedRoutePrice1to4
            const p58 = next.fixedRoutePrice5to8
            if (p14 != null && p58 != null) {
              next.lockedRoutePrice = routePriceForPassengers(
                {
                  id: next.routeId,
                  title: '',
                  subtitle: null,
                  pickupAddress: '',
                  dropoffAddress: '',
                  pickupLat: null,
                  pickupLng: null,
                  dropoffLat: null,
                  dropoffLng: null,
                  price: p14,
                  price1to4: p14,
                  price5to8: p58,
                  pricingUnit: next.fixedRoutePricingUnit ?? 'trip',
                  active: true,
                  sortOrder: 0,
                },
                next.passengers,
              )
            }
          }
          return next
        }),
      setContact: (patch) => set((s) => ({ ...s, ...patch })),
      setCheckout: (checkoutBookingId, checkoutFingerprint, wizardOwnerId) =>
        set({
          checkoutBookingId,
          checkoutFingerprint,
          wizardOwnerId: checkoutBookingId ? wizardOwnerId ?? null : null,
        }),
      prepareCustomRouteForm: () =>
        set({
          bookingType: 'custom',
          routeId: null,
          lockedRoutePrice: null,
          fixedRoutePrice1to4: null,
          fixedRoutePrice5to8: null,
          fixedRoutePricingUnit: null,
          pickupAddress: '',
          dropoffAddress: '',
          pickupLat: null,
          pickupLng: null,
          dropoffLat: null,
          dropoffLng: null,
          pickupDatetime: '',
        }),
      enterCustomRoute: (premiumPrice) =>
        set({
          bookingType: 'custom',
          routeId: null,
          lockedRoutePrice: premiumPrice,
          pickupAddress: '',
          dropoffAddress: '',
          pickupLat: null,
          pickupLng: null,
          dropoffLat: null,
          dropoffLng: null,
          pickupDatetime: '',
        }),
      applyFixedRoute: (route) =>
        set((s) => ({
          bookingType: 'fixed',
          routeId: route.id,
          fixedRoutePrice1to4: route.price1to4,
          fixedRoutePrice5to8: route.price5to8,
          fixedRoutePricingUnit: route.pricingUnit,
          lockedRoutePrice: routePriceForPassengers(route, s.passengers),
          pickupAddress: route.pickupAddress,
          dropoffAddress: route.dropoffAddress,
          pickupLat: route.pickupLat,
          pickupLng: route.pickupLng,
          dropoffLat: route.dropoffLat,
          dropoffLng: route.dropoffLng,
          pickupDatetime: toPickupIso(s.pickupDate, s.pickupTime),
        })),
      setCustomRouteReady: () =>
        set((s) => ({
          bookingType: 'custom',
          routeId: null,
          pickupDatetime: toPickupIso(s.pickupDate, s.pickupTime),
        })),
      resetWizard: () => set(initialState()),
    }),
    {
      name: 'velox-booking-wizard-v5',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) =>
        ({
          lastCreatedBookingId: s.lastCreatedBookingId,
          currentStep: s.currentStep,
          checkoutBookingId: s.checkoutBookingId,
          checkoutFingerprint: s.checkoutFingerprint,
          wizardOwnerId: s.wizardOwnerId,
          bookingType: s.bookingType,
          routeId: s.routeId,
          lockedRoutePrice: s.lockedRoutePrice,
          fixedRoutePrice1to4: s.fixedRoutePrice1to4,
          fixedRoutePrice5to8: s.fixedRoutePrice5to8,
          fixedRoutePricingUnit: s.fixedRoutePricingUnit,
          pickupAddress: s.pickupAddress,
          dropoffAddress: s.dropoffAddress,
          pickupDate: s.pickupDate,
          pickupTime: s.pickupTime,
          passengers: s.passengers,
          flightNumber: s.flightNumber,
          pickupLat: s.pickupLat,
          pickupLng: s.pickupLng,
          dropoffLat: s.dropoffLat,
          dropoffLng: s.dropoffLng,
          pickupDatetime: s.pickupDatetime,
          fullName: s.fullName,
          email: s.email,
          phone: s.phone,
          specialRequests: s.specialRequests,
          saveToProfile: s.saveToProfile,
        }) as unknown as BookingStore,
    },
  ),
)
