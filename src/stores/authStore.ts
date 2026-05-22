import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import {
  consumeAuthCallbackFromUrlOnce,
  fetchUserProfile,
  readStoredSession,
  urlHasAuthCallback,
} from '@/services/authService'
import { isSupabaseConfigured } from '@/services/supabase'
import type { UserProfile } from '@/types/user'

type AuthState = {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (isLoading: boolean) => void
  /** Clears user, session, and profile in the client store (after remote signOut or on error). */
  logout: () => void
  /** Restores session + profile from Supabase; call once on app mount (before listener). */
  initialize: () => Promise<void>
  /**
   * Re-reads session from Supabase (URL tokens, refresh, etc.) without toggling global `isLoading`.
   * Use after email verification so booking flow sees the new session without a full reload.
   */
  syncAuthFromSupabase: () => Promise<void>
}

async function loadSessionAndProfile(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
  options?: { consumeUrlCallback?: boolean },
): Promise<void> {
  const prevUid = get().session?.user?.id ?? null
  const shouldConsume = options?.consumeUrlCallback ?? urlHasAuthCallback()
  const session = shouldConsume
    ? await consumeAuthCallbackFromUrlOnce()
    : await readStoredSession()
  const nextUid = session?.user?.id ?? null

  if (prevUid !== nextUid) {
    set({ profile: null, session, user: session?.user ?? null })
  } else {
    set({ session, user: session?.user ?? null })
  }

  if (!session?.user) {
    set({ profile: null })
    return
  }

  if (prevUid === nextUid && get().profile?.id === nextUid) {
    return
  }

  const profile = await fetchUserProfile(session.user.id)
  if (get().session?.user?.id !== session.user.id) {
    return
  }
  set({ profile })
}

let authInitializePromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, session: null, profile: null }),
  syncAuthFromSupabase: async () => {
    if (!isSupabaseConfigured) {
      return
    }
    try {
      // Never re-consume email/OAuth URL tokens here — that can hang parallel with app `initialize()`.
      await loadSessionAndProfile(set, get, { consumeUrlCallback: false })
    } catch (err) {
      console.error('[authStore] syncAuthFromSupabase failed', err)
    }
  },
  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ user: null, session: null, profile: null, isLoading: false })
      return
    }

    if (!authInitializePromise) {
      authInitializePromise = (async () => {
        set({ isLoading: true })
        try {
          await loadSessionAndProfile(set, get, { consumeUrlCallback: urlHasAuthCallback() })
        } catch (err) {
          console.error('[authStore] initialize failed', err)
          set({ user: null, session: null, profile: null })
        } finally {
          set({ isLoading: false })
        }
      })()
    }

    await authInitializePromise
  },
}))
