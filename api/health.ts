import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { serviceClient } from '../lib/supabase'
import { stripeClient } from '../lib/stripe'

export const config = { runtime: 'edge' }

/**
 * Is the commerce stack actually wired up?
 *
 * Deliberately *not* in the middleware's PUBLIC_PATHS, so it sits behind the
 * password wall like every other page. Open it in a browser you have already
 * unlocked the site in.
 *
 * It reports which variables are set and whether the credentials genuinely
 * work — a key that is present but wrong looks identical to a correct one
 * until something tries to use it, which is exactly the failure this is meant
 * to catch. Values are never returned; keys are reported only as `test` or
 * `live`, because a test secret against a live webhook secret is a common and
 * otherwise invisible mistake.
 */

const limiter = createRateLimiter({ max: 20, windowMs: 5 * 60 * 1000 })

const EXPECTED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'ORDER_FROM_EMAIL',
  'STUDIO_ORDER_EMAIL',
] as const

/** `sk_test_abc…` → `test`. Never the key itself. */
function keyMode(value: string | undefined): string | null {
  if (!value) return null
  if (value.includes('_test_') || value.startsWith('whsec_test')) return 'test'
  if (value.includes('_live_')) return 'live'
  return 'unknown'
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  if (limiter.check(clientKey(request))) {
    return new Response('Slow down', { status: 429 })
  }

  const present: Record<string, boolean> = {}
  for (const name of EXPECTED) present[name] = Boolean(process.env[name]?.trim())

  const missing = EXPECTED.filter((name) => !present[name])

  // --- Do the credentials work, or are they just present? ------------------

  let supabase: { ok: boolean; detail: string } = { ok: false, detail: 'not attempted' }
  if (present.SUPABASE_URL && present.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { count, error } = await serviceClient()
        .from('shipping_rates')
        .select('id', { count: 'exact', head: true })
      supabase = error
        ? { ok: false, detail: error.message }
        : { ok: true, detail: `${count ?? 0} shipping rates readable` }
    } catch (error) {
      supabase = { ok: false, detail: String(error) }
    }
  }

  let stripe: { ok: boolean; detail: string } = { ok: false, detail: 'not attempted' }
  if (present.STRIPE_SECRET_KEY) {
    try {
      // The cheapest authenticated call there is.
      const balance = await stripeClient().balance.retrieve()
      stripe = { ok: true, detail: `livemode: ${balance.livemode}` }
    } catch (error) {
      stripe = { ok: false, detail: error instanceof Error ? error.message : String(error) }
    }
  }

  const ready = missing.length === 0 && supabase.ok && stripe.ok

  return new Response(
    JSON.stringify(
      {
        ready,
        missing,
        present,
        modes: {
          STRIPE_SECRET_KEY: keyMode(process.env.STRIPE_SECRET_KEY),
          STRIPE_PUBLISHABLE_KEY: keyMode(process.env.STRIPE_PUBLISHABLE_KEY),
        },
        checks: { supabase, stripe },
        note: 'Read-only. Values are never returned.',
      },
      null,
      2,
    ),
    {
      status: ready ? 200 : 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  )
}
