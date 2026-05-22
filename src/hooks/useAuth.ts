import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  fetchUserProfile,
  resendSignupConfirmationEmail as resendSignupConfirmationEmailService,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  updateClientProfile as updateClientProfileService,
} from '@/services/authService'
import { isSupabaseConfigured } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { QUERY_KEYS } from '@/utils/constants'
import { clearUserScopedClientState } from '@/utils/clearUserScopedClientState'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)
  const setUser = useAuthStore((s) => s.setUser)
  const setSession = useAuthStore((s) => s.setSession)
  const setProfile = useAuthStore((s) => s.setProfile)
  const logout = useAuthStore((s) => s.logout)
  const syncAuthFromSupabase = useAuthStore((s) => s.syncAuthFromSupabase)

  const queryClient = useQueryClient()

  const signOutMutation = useMutation({
    retry: 0,
    mutationFn: async () => {
      if (!isSupabaseConfigured) {
        return
      }
      await signOutService()
    },
    onSettled: () => {
      logout()
      clearUserScopedClientState(queryClient)
    },
  })

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.')
      }
      setProfile(null)
      clearUserScopedClientState(queryClient)
      const data = await signInService(email, password)
      setSession(data.session)
      setUser(data.user)
      if (data.user) {
        setProfile(await fetchUserProfile(data.user.id))
      } else {
        setProfile(null)
      }
      return data
    },
    [queryClient, setProfile, setSession, setUser],
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone: string,
      postConfirmNext?: string | null,
    ) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.')
      }
      setProfile(null)
      clearUserScopedClientState(queryClient)
      const data = await signUpService(email, password, fullName, phone, postConfirmNext)
      setSession(data.session ?? null)
      // Only treat as signed in when a session exists (email confirmation off). Otherwise PostgREST stays anon → 401 on bookings.
      setUser(data.session?.user ?? null)
      const uid = data.session?.user?.id
      if (uid) {
        setProfile(await fetchUserProfile(uid))
      } else {
        setProfile(null)
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth })
      return data
    },
    [queryClient, setProfile, setSession, setUser],
  )

  const updateClientProfile = useCallback(
    async (patch: { fullName?: string; phone?: string | null }) => {
      const uid = useAuthStore.getState().session?.user?.id ?? useAuthStore.getState().user?.id
      if (!uid) {
        throw new Error('Not signed in.')
      }
      await updateClientProfileService(uid, patch)
      setProfile(await fetchUserProfile(uid))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth })
    },
    [queryClient, setProfile],
  )

  const resendSignupConfirmationEmail = useCallback(async (email: string, postConfirmNext?: string | null) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.')
    }
    await resendSignupConfirmationEmailService(email, postConfirmNext)
  }, [])

  const isAuthenticated = Boolean(session?.user)
  const isAdmin = profile?.role === 'admin'
  const isClient = profile?.role === 'client'

  return {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated,
    isAdmin,
    isClient,
    signIn,
    signUp,
    signOut: signOutMutation.mutateAsync,
    isSigningOut: signOutMutation.isPending,
    updateClientProfile,
    syncAuthFromSupabase,
    resendSignupConfirmationEmail,
    /** @deprecated use isLoading */
    isInitializing: isLoading,
    /** @deprecated use signIn */
    signInWithPassword: signIn,
    /** @deprecated use signUp */
    signUpWithEmail: (input: { email: string; password: string; fullName: string; phone?: string }) =>
      signUp(input.email, input.password, input.fullName, input.phone ?? '', undefined),
  }
}
