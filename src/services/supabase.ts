import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'

/**
 * Reads VITE_SUPABASE_URL and returns a valid http(s) URL, or null if unset / invalid.
 * Accepts:
 * - Full URL: `https://xxxx.supabase.co`
 * - Host only: `xxxx.supabase.co` (https is added)
 * - Project ref only: `xxxx` → `https://xxxx.supabase.co` (common copy-paste mistake)
 */
function parseEnvSupabaseUrl(raw: string | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    let u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

    const host = u.hostname
    // Pasted ref without domain: https://abcdefghijklmnop / abcdefghijklmnop
    const isBareRef =
      !host.includes('.') &&
      host !== 'localhost' &&
      /^[a-z0-9]+$/i.test(host) &&
      host.length >= 8

    if (isBareRef) {
      const path = u.pathname === '/' ? '' : u.pathname
      u = new URL(`${u.protocol}//${host.toLowerCase()}.supabase.co${path}${u.search}`)
    }

    return u.href.replace(/\/$/, '')
  } catch {
    return null
  }
}

const parsedUrl = parseEnvSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

/** Legacy anon JWT, or new dashboard “Publishable” key — never secret / service_role. */
function isValidSupabasePublicClientKey(key: string): boolean {
  const t = key.trim()
  if (!t) return false
  // Never use the secret / service key in the browser bundle.
  if (t.startsWith('sb_secret_')) return false

  // New API keys (Supabase 2025+): “Publishable” — safe in apps.
  if (t.startsWith('sb_publishable_') && t.length >= 32) return true

  // Legacy “anon public” JWT.
  if (t.startsWith('eyJ')) {
    const parts = t.split('.')
    if (parts.length === 3 && t.length >= 100) return true
  }

  return false
}

export const isSupabaseConfigured = Boolean(parsedUrl && anonKey && isValidSupabasePublicClientKey(anonKey))

const SUPABASE_CONFIG_WARN_KEY = '__veloxVipSupabaseConfigWarned'
const SUPABASE_ANON_SHAPE_WARN_KEY = '__veloxVipSupabaseAnonShapeWarned'

function warnSupabaseEnvMissing(): void {
  const g = globalThis as typeof globalThis & Record<string, boolean | undefined>
  if (g[SUPABASE_CONFIG_WARN_KEY]) return
  g[SUPABASE_CONFIG_WARN_KEY] = true
  console.warn(
    '[Rhodes Chauffeurs] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

function warnAnonKeyWrongShape(): void {
  const g = globalThis as typeof globalThis & Record<string, boolean | undefined>
  if (g[SUPABASE_ANON_SHAPE_WARN_KEY]) return
  g[SUPABASE_ANON_SHAPE_WARN_KEY] = true
  console.error(
    '[Rhodes Chauffeurs] VITE_SUPABASE_ANON_KEY must be the browser-safe public key from Supabase (Dashboard → Project Settings → API): either the new "Publishable" key (starts with sb_publishable_) or the legacy "anon" "public" JWT (starts with eyJ, three dot-separated parts). Do not use the project ref, "Secret" / sb_secret_*, or legacy service_role.',
  )
}

if (!parsedUrl || !anonKey) {
  warnSupabaseEnvMissing()
} else if (!isValidSupabasePublicClientKey(anonKey)) {
  warnAnonKeyWrongShape()
}

const urlForClient = parsedUrl ?? PLACEHOLDER_URL

/**
 * Namespaced auth storage so old/broken tokens from earlier env keys or projects
 * are not reused (prevents 401 on REST when a stale Bearer JWT is sent).
 */
function supabaseAuthStorageKey(supabaseUrl: string): string {
  try {
    const host = new URL(supabaseUrl).hostname
    return `velox-vip-auth-${host}`
  } catch {
    return 'velox-vip-auth'
  }
}

/**
 * Read-only client: no auth persistence, so PostgREST always uses the anon key only.
 * Prevents 401 when a broken user JWT would otherwise be sent on public catalog reads.
 */
export const supabaseAnon: SupabaseClient = createClient(
  urlForClient,
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

/**
 * Singleton Supabase browser client. Configure Row Level Security in Supabase for production.
 */
export const supabase: SupabaseClient = createClient(
  urlForClient,
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storageKey: supabaseAuthStorageKey(urlForClient),
      persistSession: true,
      autoRefreshToken: true,
      /** Manual URL handling in authService — avoids double exchange with initialize(). */
      detectSessionInUrl: false,
      /**
       * PKCE matches Supabase email-confirm links when the user signs up in this browser (code_verifier
       * is stored). `implicit` rejects those redirects and leaves people stuck without a session.
       * If someone opens the link on another device, they should sign in with email + password here.
       */
      flowType: 'pkce',
    },
  },
)

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase environment variables are missing.')
  }
}
