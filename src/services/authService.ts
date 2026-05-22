import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase, assertSupabaseConfigured, isSupabaseConfigured } from '@/services/supabase'
import type { UserProfile } from '@/types/user'
import { ROUTES } from '@/utils/constants'
import { FIELD_LIMITS, sanitizePhone, sanitizeText } from '@/utils/sanitize'

/** Allowed post-confirm landing paths (query `next=`) — avoid open redirects. */
const POST_CONFIRM_EMAIL_NEXT = new Set<string>([
  ROUTES.book,
  ROUTES.dashboard,
  ROUTES.admin,
  ROUTES.home,
])

function sanitizePostConfirmNext(path?: string | null): string | undefined {
  if (!path?.trim()) {
    return undefined
  }
  const p = path.trim()
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('?')) {
    return undefined
  }
  return POST_CONFIRM_EMAIL_NEXT.has(p) ? p : undefined
}

/** Supabase confirmation email redirect: always `/login` so PKCE/hash is not consumed on a protected route; optional `next`. */
function authEmailRedirectTo(nextPath?: string | null): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  const origin = window.location.origin
  const safe = sanitizePostConfirmNext(nextPath)
  if (!safe) {
    return `${origin}${ROUTES.login}`
  }
  return `${origin}${ROUTES.login}?next=${encodeURIComponent(safe)}`
}

/** One-shot message after email-confirm redirect (read on login page, then cleared). */
export const AUTH_REDIRECT_FLASH_KEY = 'velox-vip-auth-redirect-flash'

export function formatAuthError(err: unknown): string {
  if (err && typeof err === 'object') {
    const o = err as { status?: number; message?: string }
    const msg = typeof o.message === 'string' ? o.message : ''
    const lower = msg.toLowerCase()
    if (
      o.status === 429 ||
      lower.includes('rate limit') ||
      lower.includes('too many requests')
    ) {
      return 'Too many sign-up or confirmation emails from this device. Supabase limits how many can be sent per hour — wait about an hour, then try again. If you were testing, use a different email or sign in if the account was already created.'
    }
    if (msg.length > 0) {
      return msg
    }
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Something went wrong.'
}

/** OAuth / magic-link params to remove from the URL after a failed or stale redirect (keep `next`, etc.). */
const SUPABASE_AUTH_CALLBACK_STRIP_KEYS = [
  'code',
  'type',
  'token_hash',
  'token_hash_verified',
  'error',
  'error_description',
  'error_code',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
]

function locationHasSupabaseAuthCallback(href: string): boolean {
  const p = parseAuthParamsFromLocation(href)
  return Boolean(
    p.code ||
      p.token_hash ||
      p.access_token ||
      p.error ||
      p.error_description,
  )
}

/** True when the current URL still carries Supabase email-confirm or OAuth callback params. */
export function urlHasAuthCallback(href?: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return locationHasSupabaseAuthCallback(href ?? window.location.href)
}

/** Auth events that should trigger a profile refetch (skip TOKEN_REFRESHED to avoid API spam). */
export const PROFILE_REFRESH_AUTH_EVENTS = new Set<AuthChangeEvent>([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'USER_UPDATED',
])

let authClientInitStarted = false
let authCallbackConsumePromise: Promise<Session | null> | null = null
let credentialAuthInFlight: Promise<unknown> | null = null
let sessionValidatedThisLoad = false

async function withCredentialAuthLock<T>(fn: () => Promise<T>): Promise<T> {
  if (credentialAuthInFlight) {
    return credentialAuthInFlight as Promise<T>
  }
  const run = fn().finally(() => {
    credentialAuthInFlight = null
  })
  credentialAuthInFlight = run
  return run
}

async function ensureAuthClientInitialized(): Promise<void> {
  if (typeof window === 'undefined' || authClientInitStarted) {
    return
  }
  authClientInitStarted = true
  const hadAuthCallback = locationHasSupabaseAuthCallback(window.location.href)
  const { error: initError } = await supabase.auth.initialize()
  if (initError) {
    if (hadAuthCallback) {
      stripAllSupabaseAuthCallbackFromUrl()
      try {
        sessionStorage.setItem(AUTH_REDIRECT_FLASH_KEY, formatAuthError(initError))
      } catch {
        /* ignore */
      }
    } else {
      console.warn('[auth] Supabase auth.initialize()', initError.message)
    }
  }
}

/** Read session from storage only — no URL token exchange (cheap). */
export async function readStoredSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    return null
  }
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  return data.session ?? null
}

/**
 * Exchange email-confirm / OAuth params in the URL once per page load (deduped).
 * Prevents duplicate verifyOtp / getUser calls that trigger Supabase Auth rate limits.
 */
export async function consumeAuthCallbackFromUrlOnce(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    return null
  }
  if (!urlHasAuthCallback()) {
    return readStoredSession()
  }
  if (!authCallbackConsumePromise) {
    authCallbackConsumePromise = getSession().finally(() => {
      authCallbackConsumePromise = null
    })
  }
  return authCallbackConsumePromise
}

/** Remove Supabase auth callback tokens from the address bar so `initialize()` is not retried forever. */
function stripAllSupabaseAuthCallbackFromUrl(): void {
  if (typeof window === 'undefined') {
    return
  }
  stripAuthKeysFromBrowserUrl(SUPABASE_AUTH_CALLBACK_STRIP_KEYS)
}

/** Merge hash + query params (query wins), same rules as @supabase/auth-js parseParametersFromURL. */
function parseAuthParamsFromLocation(href: string): Record<string, string> {
  const result: Record<string, string> = {}
  const url = new URL(href)
  if (url.hash?.startsWith('#')) {
    try {
      new URLSearchParams(url.hash.slice(1)).forEach((value, key) => {
        result[key] = value
      })
    } catch {
      /* ignore malformed hash */
    }
  }
  url.searchParams.forEach((value, key) => {
    result[key] = value
  })
  return result
}

function stripAuthKeysFromBrowserUrl(keys: string[]) {
  const url = new URL(window.location.href)
  for (const k of keys) {
    url.searchParams.delete(k)
  }
  if (url.hash.startsWith('#')) {
    const h = new URLSearchParams(url.hash.slice(1))
    for (const k of keys) {
      h.delete(k)
    }
    const rest = h.toString()
    url.hash = rest ? `#${rest}` : ''
  }
  const tail = `${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', `${url.pathname}${tail}`)
}

/**
 * PKCE-style `?code=…` without a stored verifier (e.g. email opened on another device)
 * cannot be exchanged when the client uses `flowType: 'pkce'`. `token_hash` + verifyOtp
 * still works below. Same-browser PKCE is handled by `auth.initialize()`.
 */
async function tryConsumeAuthCodeFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }
  const params = parseAuthParamsFromLocation(window.location.href)
  const code = params.code?.trim()
  if (!code) {
    return false
  }

  const stripKeys = ['code', 'type', 'error', 'error_description', 'error_code']

  // A stored session from another account must not block exchanging this redirect code.
  await supabase.auth.signOut({ scope: 'local' })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  stripAuthKeysFromBrowserUrl(stripKeys)

  if (error) {
    console.warn('[auth] exchangeCodeForSession from redirect URL failed', error)
    try {
      sessionStorage.setItem(AUTH_REDIRECT_FLASH_KEY, formatAuthError(error))
    } catch {
      /* ignore quota / private mode */
    }
  }

  return true
}

/**
 * Email confirmation sometimes lands as `?token_hash=…&type=signup` (or in the hash).
 * GoTrue URL recovery only handles implicit tokens or PKCE `code` + local code_verifier, so we exchange explicitly.
 */
async function tryConsumeEmailConfirmationFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }
  const params = parseAuthParamsFromLocation(window.location.href)
  const tokenHash = params.token_hash
  const otpType = params.type
  if (!tokenHash || !otpType) {
    return false
  }

  const stripKeys = ['token_hash', 'type', 'token_hash_verified']
  const allowedOtpTypes = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])
  if (!allowedOtpTypes.has(otpType)) {
    console.warn('[auth] Unknown email confirmation type in URL:', otpType)
    stripAuthKeysFromBrowserUrl(['token_hash', 'type', 'token_hash_verified'])
    return true
  }

  // Email confirm while another account is still in memory/storage causes stale dashboard state.
  if (otpType === 'signup' || otpType === 'invite' || otpType === 'email') {
    await supabase.auth.signOut({ scope: 'local' })
  }

  const { data: verified, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email',
  })

  stripAuthKeysFromBrowserUrl(stripKeys)

  if (!error && verified.user && (otpType === 'signup' || otpType === 'invite' || otpType === 'email')) {
    const meta = verified.user.user_metadata as Record<string, unknown> | undefined
    const fullName =
      typeof meta?.full_name === 'string' && meta.full_name.trim()
        ? meta.full_name.trim()
        : typeof meta?.fullName === 'string' && meta.fullName.trim()
          ? meta.fullName.trim()
          : verified.user.email?.split('@')[0] ?? 'Guest'
    const phone =
      typeof meta?.phone === 'string' && meta.phone.trim() ? meta.phone.trim() : null
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: verified.user.id,
        email: verified.user.email ?? '',
        full_name: fullName,
        phone,
        role: 'client',
      },
      { onConflict: 'id' },
    )
    if (profileError) {
      console.warn('[auth] profile upsert after email confirm', profileError)
    }
  }

  if (error) {
    console.warn('[auth] verifyOtp from email link failed', error)
    try {
      sessionStorage.setItem(AUTH_REDIRECT_FLASH_KEY, formatAuthError(error))
    } catch {
      /* ignore quota / private mode */
    }
  }

  return true
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  /** If set (e.g. `/book`), confirmation link includes `?next=` so login can return there; otherwise plain `/login` → dashboard after sign-in. */
  postConfirmNext?: string | null,
) {
  return withCredentialAuthLock(async () => {
    assertSupabaseConfigured()
    const trimmedEmail = email.trim()
    const trimmedName = fullName.trim()
    const trimmedPhone = phone.trim()

    const { data: existing } = await supabase.auth.getSession()
    const existingEmail = existing.session?.user?.email?.trim().toLowerCase()
    if (existing.session && existingEmail && existingEmail !== trimmedEmail.toLowerCase()) {
      await supabase.auth.signOut({ scope: 'local' })
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: authEmailRedirectTo(postConfirmNext),
        data: {
          full_name: trimmedName,
          phone: trimmedPhone || null,
        },
      },
    })
    if (error) {
      throw error
    }

    if (data.user) {
      if (data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: trimmedEmail,
            full_name: trimmedName,
            phone: trimmedPhone || null,
            role: 'client',
          },
          { onConflict: 'id' },
        )
        if (profileError) {
          console.warn('[auth] profile upsert after signUp', profileError)
        }
      }
    }

    return data
  })
}

/** Resend the signup confirmation email (e.g. link expired). Requires the same email used at sign-up. */
export async function resendSignupConfirmationEmail(email: string, postConfirmNext?: string | null) {
  assertSupabaseConfigured()
  const trimmed = email.trim()
  if (!trimmed) {
    throw new Error('Enter your email address first.')
  }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: trimmed,
    options: {
      emailRedirectTo: authEmailRedirectTo(postConfirmNext),
    },
  })
  if (error) {
    throw error
  }
}

export async function signIn(email: string, password: string) {
  return withCredentialAuthLock(async () => {
    assertSupabaseConfigured()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      throw error
    }
    return data
  })
}

export async function signOut() {
  assertSupabaseConfigured()
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

/**
 * Fast session check for booking/payment — no URL token exchange, no profile fetch.
 * Refreshes once when the JWT is missing, near expiry, or immediately after sign-up.
 */
export async function resolveActiveSessionUserId(): Promise<string> {
  assertSupabaseConfigured()

  const { data: first, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw sessionError
  }
  if (!first.session?.user?.id) {
    throw new Error('You must be signed in to continue.')
  }

  const expiresAt = first.session.expires_at ?? 0
  const now = Math.floor(Date.now() / 1000)
  const nearExpiry = expiresAt > 0 && expiresAt - now < 60

  if (!nearExpiry) {
    return first.session.user.id
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshed.session?.user?.id) {
    if (nearExpiry) {
      throw new Error('Your session expired. Sign in again, then continue.')
    }
    return first.session.user.id
  }

  return refreshed.session.user.id
}

/**
 * Validates and refreshes the Supabase session before Edge Function calls (e.g. Stripe checkout).
 * Avoids first-attempt 401s when the JWT is stale right after sign-up or email confirmation.
 */
export async function ensureSessionReadyForEdgeFunctions(): Promise<Session> {
  assertSupabaseConfigured()

  const userId = await resolveActiveSessionUserId()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  const session = data.session
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error('You must be signed in to continue.')
  }
  return session
}

function shouldClearStoredSessionAfterGetUser(err: { message?: string; status?: number }): boolean {
  const status = err.status
  if (status === 401 || status === 403) {
    return true
  }
  const msg = (err.message ?? '').toLowerCase()
  return /jwt|invalid|expired|malformed|not authorized|session/.test(msg)
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  if (typeof window !== 'undefined') {
    await ensureAuthClientInitialized()
  }

  const first = await supabase.auth.getSession()
  if (first.error) {
    throw first.error
  }
  let data = first.data

  if (typeof window !== 'undefined') {
    const consumedToken = await tryConsumeEmailConfirmationFromUrl()
    if (consumedToken) {
      const next = await supabase.auth.getSession()
      if (next.error) {
        throw next.error
      }
      data = next.data
    }
  }

  if (typeof window !== 'undefined') {
    const consumedCode = await tryConsumeAuthCodeFromUrl()
    if (consumedCode) {
      const next = await supabase.auth.getSession()
      if (next.error) {
        throw next.error
      }
      data = next.data
    }
  }

  const session = data.session ?? null
  if (!session) {
    return null
  }

  if (!sessionValidatedThisLoad) {
    sessionValidatedThisLoad = true
    const { error: userError } = await supabase.auth.getUser()
    if (userError && shouldClearStoredSessionAfterGetUser(userError)) {
      console.warn('[Velox VIP] Clearing invalid auth session:', userError.message)
      await supabase.auth.signOut({ scope: 'local' })
      return null
    }
    if (userError) {
      console.warn('[Velox VIP] getUser validation failed (keeping session):', userError.message)
    }
  }

  return session
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  if (!isSupabaseConfigured) {
    callback('INITIAL_SESSION', null)
    return () => {}
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback)

  return () => {
    subscription.unsubscribe()
  }
}

export async function updateClientProfile(userId: string, patch: { fullName?: string; phone?: string | null }) {
  assertSupabaseConfigured()
  const row: Record<string, string | null> = {}
  if (patch.fullName !== undefined) {
    row.full_name = sanitizeText(patch.fullName, FIELD_LIMITS.fullName)
  }
  if (patch.phone !== undefined) {
    row.phone = patch.phone ? sanitizePhone(patch.phone) : null
  }
  if (Object.keys(row).length === 0) {
    return
  }
  const { error } = await supabase.from('profiles').update(row).eq('id', userId)
  if (error) {
    throw error
  }
}

export async function updateAuthPassword(newPassword: string) {
  assertSupabaseConfigured()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw error
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapProfileRow(data as ProfileRow)
}

type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: string | null
  avatar_url: string | null
  created_at: string
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: (row.role as UserProfile['role']) ?? 'client',
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }
}

/** @deprecated Use signIn */
export async function signInWithPassword(credentials: { email: string; password: string }) {
  return signIn(credentials.email, credentials.password)
}

/** @deprecated Use signUp */
export async function signUpWithEmail(input: { email: string; password: string; fullName: string; phone?: string }) {
  return signUp(input.email, input.password, input.fullName, input.phone ?? '', undefined)
}

/** @deprecated Use onAuthStateChange */
export function subscribeToAuth(onChange: (payload: { user: User | null }) => void): () => void {
  return onAuthStateChange((_event, session) => {
    onChange({ user: session?.user ?? null })
  })
}
