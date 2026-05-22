import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchAdminKpis, computeAdminKpiBounds } from '@/services/adminKpiService'
import { listCompanyDrivers } from '@/services/driverService'
import { listAllBookingsAdmin, listAllVehiclesAdmin } from '@/services/bookingService'
import { isSupabaseConfigured, supabase } from '@/services/supabase'
import { QUERY_KEYS } from '@/utils/constants'

export function useAdminKpis() {
  return useQuery({
    queryKey: QUERY_KEYS.adminKpis,
    queryFn: () => fetchAdminKpis(computeAdminKpiBounds()),
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  })
}

export function useAdminBookingsList() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.adminBookings,
    queryFn: listAllBookingsAdmin,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const channel = supabase
      .channel('admin-bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminKpis })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

export function useAdminDriversList() {
  return useQuery({
    queryKey: QUERY_KEYS.adminDrivers,
    queryFn: listCompanyDrivers,
    enabled: isSupabaseConfigured,
    staleTime: 300_000,
  })
}

export function useAdminVehiclesList() {
  return useQuery({
    queryKey: QUERY_KEYS.adminVehicles,
    queryFn: listAllVehiclesAdmin,
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  })
}
