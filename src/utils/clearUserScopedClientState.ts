import type { QueryClient } from '@tanstack/react-query'
import { useBookingStore } from '@/stores/bookingStore'
import { QUERY_KEYS } from '@/utils/constants'

/** Drop cached data tied to a specific user (bookings, profile queries, wizard). */
export function clearUserScopedClientState(queryClient: QueryClient, options?: { resetWizard?: boolean }) {
  if (options?.resetWizard !== false) {
    useBookingStore.getState().resetWizard()
  }
  queryClient.removeQueries({ queryKey: QUERY_KEYS.auth })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.bookings })
  queryClient.removeQueries({ queryKey: ['bookings'] })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.adminBookings })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.adminKpis })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.adminDrivers })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.adminVehicles })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.vehicles })
}
