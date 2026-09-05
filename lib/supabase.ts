import { createClient } from '@supabase/supabase-js'

/**
 * The service-role client.
 *
 * Every commerce table has RLS enabled with no policies, so this key is the
 * only thing that can read or write them. It must never reach the browser:
 * no VITE_ prefix, server-side imports only. If it ever needs rotating,
 * Supabase → Project Settings → API Keys.
 *
 * Built per request rather than at module scope. Edge instances are shared
 * between invocations, and a client captured at import time would outlive the
 * request that made it.
 */
export function serviceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'the-project-london/checkout' } },
  })
}
