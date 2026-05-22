/**
 * Minimal globals for Supabase Edge Functions (Deno). The editor uses Node
 * TypeScript; Deno provides these at runtime.
 *
 * Deno `npm:` specifiers are declared here so the workspace TypeScript server
 * resolves types via the same packages in the repo root `node_modules`.
 */
declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

// eslint-disable-next-line no-var -- ambient optional global on Supabase Edge
declare var EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare module 'npm:stripe@16.12.0' {
  import Stripe from 'stripe'
  export default Stripe
}
