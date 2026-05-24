import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import {
  cancelBookingByClient,
  createBooking,
  getBookingById,
  listAvailableVehicles,
  listBookingsForUser,
  updatePendingBooking,
} from '@/services/bookingService'
import { isSupabaseConfigured, supabase } from '@/services/supabase'
import type { Booking, BookingDraft, BookingWithVehicle } from '@/types/booking'
import { useBookingStore } from '@/stores/bookingStore'
import { QUERY_KEYS } from '@/utils/constants'

export type UseBookingOptions = {
  /** Subscribe to Postgres changes for this user's bookings (client dashboard). */
  userBookingsRealtime?: boolean
}

export function useBooking(bookingId?: string, options?: UseBookingOptions) {
  const { session } = useAuth()
  const clientId = session?.user?.id
  const queryClient = useQueryClient()
  const setLastCreatedBookingId = useBookingStore((s) => s.setLastCreatedBookingId)

  const vehiclesQuery = useQuery({
    queryKey: QUERY_KEYS.vehicles,
    queryFn: listAvailableVehicles,
    enabled: isSupabaseConfigured,
  })

  const bookingsQuery = useQuery({
    queryKey: [...QUERY_KEYS.bookings, clientId],
    queryFn: async () => {
      if (!clientId) {
        return [] as BookingWithVehicle[]
      }
      return listBookingsForUser(clientId)
    },
    enabled: Boolean(clientId) && isSupabaseConfigured,
    // Never show another user's cached trips while the account id is changing.
    placeholderData: undefined,
  })

  useEffect(() => {
    if (!options?.userBookingsRealtime || !clientId || !isSupabaseConfigured) {
      return
    }

    const channel = supabase
      .channel(`bookings-client-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.bookings, clientId] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [options?.userBookingsRealtime, queryClient, clientId])

  const bookingDetailQuery = useQuery({
    queryKey: bookingId ? QUERY_KEYS.booking(bookingId) : ['bookings', 'none'],
    queryFn: async () => {
      if (!bookingId) {
        return null
      }
      return getBookingById(bookingId)
    },
    enabled: Boolean(bookingId) && isSupabaseConfigured,
  })

  const createBookingMutation = useMutation({
    mutationFn: async (draft: BookingDraft) => {
      const uid = useAuthStore.getState().session?.user?.id
      if (!uid) {
        throw new Error('You must be signed in to book.')
      }
      return createBooking(uid, draft)
    },
    onSuccess: (booking: Booking) => {
      setLastCreatedBookingId(booking.id)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings })
    },
  })

  const updatePendingBookingMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: BookingDraft }) => updatePendingBooking(id, draft),
    onSuccess: (booking: Booking) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.booking(booking.id) })
    },
  })

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => cancelBookingByClient(id),
    onSuccess: (booking: Booking) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.booking(booking.id) })
    },
  })

  return {
    vehicles: vehiclesQuery.data ?? [],
    vehiclesError: vehiclesQuery.error,
    isVehiclesLoading: vehiclesQuery.isLoading,
    bookings: bookingsQuery.data ?? [],
    bookingsError: bookingsQuery.error,
    isBookingsLoading: bookingsQuery.isLoading,
    isBookingsEmpty: !bookingsQuery.isLoading && (bookingsQuery.data?.length ?? 0) === 0,
    booking: bookingDetailQuery.data,
    bookingError: bookingDetailQuery.error,
    isBookingLoading: bookingDetailQuery.isLoading,
    createBooking: createBookingMutation.mutateAsync,
    isCreatingBooking: createBookingMutation.isPending,
    createBookingError: createBookingMutation.error,
    updatePendingBooking: updatePendingBookingMutation.mutateAsync,
    isUpdatingPendingBooking: updatePendingBookingMutation.isPending,
    cancelBooking: cancelBookingMutation.mutateAsync,
    isCancellingBooking: cancelBookingMutation.isPending,
    cancellingBookingId: cancelBookingMutation.variables as string | undefined,
    cancelBookingError: cancelBookingMutation.error,
  }
}
