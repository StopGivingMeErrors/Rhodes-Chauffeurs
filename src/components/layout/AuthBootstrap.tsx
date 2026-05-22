import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  fetchUserProfile,
  onAuthStateChange,
  AUTH_REDIRECT_FLASH_KEY,
  PROFILE_REFRESH_AUTH_EVENTS,
  urlHasAuthCallback,
} from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { useBookingStore } from '@/stores/bookingStore'
import { useToast } from '@/hooks/useToast'
import { QUERY_KEYS } from '@/utils/constants'
import { clearUserScopedClientState } from '@/utils/clearUserScopedClientState'

/**
 * Runs once at app root: restores session, then keeps Zustand in sync with Supabase auth.
 */
export function AuthBootstrap() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void (async () => {
      const hadAuthCallback = urlHasAuthCallback()
      await useAuthStore.getState().initialize()
      if (cancelled) {
        return
      }
      if (hadAuthCallback) {
        clearUserScopedClientState(queryClient)
      }
      try {
        const flash = sessionStorage.getItem(AUTH_REDIRECT_FLASH_KEY)
        if (flash) {
          sessionStorage.removeItem(AUTH_REDIRECT_FLASH_KEY)
          const lower = flash.toLowerCase()
          const title =
            lower.includes('expired') || lower.includes('invalid')
              ? 'Sign-in link'
              : 'Email confirmation'
          toast({
            title,
            description: flash,
            variant: 'error',
            duration: 9000,
          })
        }
      } catch {
        /* ignore */
      }
      unsubscribe = onAuthStateChange(async (event, nextSession) => {
        const setUser = useAuthStore.getState().setUser
        const setSession = useAuthStore.getState().setSession
        const setProfile = useAuthStore.getState().setProfile
        const prevUid = useAuthStore.getState().session?.user?.id ?? null
        const nextUid = nextSession?.user?.id ?? null
        const { checkoutBookingId, wizardOwnerId } = useBookingStore.getState()

        if (prevUid !== nextUid) {
          setProfile(null)
          clearUserScopedClientState(queryClient)
        }

        setSession(nextSession)
        setUser(nextSession?.user ?? null)

        if (nextUid === null) {
          useBookingStore.getState().resetWizard()
        } else if (prevUid !== null && prevUid !== nextUid) {
          useBookingStore.getState().resetWizard()
        } else if (checkoutBookingId && wizardOwnerId && wizardOwnerId !== nextUid) {
          useBookingStore.getState().resetWizard()
        }

        if (nextSession?.user && PROFILE_REFRESH_AUTH_EVENTS.has(event)) {
          const existing = useAuthStore.getState().profile
          if (event === 'INITIAL_SESSION' && existing?.id === nextSession.user.id) {
            return
          }
          try {
            const nextProfile = await fetchUserProfile(nextSession.user.id)
            if (useAuthStore.getState().session?.user?.id === nextSession.user.id) {
              setProfile(nextProfile)
            }
          } catch (e) {
            console.error('[AuthBootstrap] profile refresh failed', e)
            setProfile(null)
          }
        } else if (!nextSession?.user) {
          setProfile(null)
          queryClient.removeQueries({ queryKey: QUERY_KEYS.auth })
        }
      })
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
    // Mount once: initialize is deduped; listener must not re-register on parent re-renders.
  }, [queryClient, toast])

  return null
}
