import { isSameOriginRead } from '../../lib/access'
import { isAdmin } from '../../lib/admin'
import { CHECKOUT_ENV, missingEnv } from '../../lib/config'
import { clientKey, createRateLimiter } from '../../lib/rate-limit'
import { serviceClient } from '../../lib/supabase'

export const config = { runtime: 'edge' }

/**
 * The order list behind /admin.
 *
 * A GET, so it uses the read-side origin check — browsers send no Origin on a
 * same-origin GET, and requiring one here would refuse every real call.
 *
 * What comes back is admin_order_list()'s curated shape, not the order row:
 * no payment intent, no Stripe customer id.
 */

const limiter = createRateLimiter({ max: 60, windowMs: 5 * 60 * 1000 })

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') return json({ ok: false }, 405)
  if (!isSameOriginRead(request)) return json({ ok: false, error: 'bad_origin' }, 403)
  if (!(await isAdmin(request))) return json({ ok: false, error: 'unauthorised' }, 401)

  if (limiter.check(clientKey(request))) {
    return json({ ok: false, error: 'rate_limited' }, 429)
  }

  const gaps = missingEnv(CHECKOUT_ENV)
  if (gaps.length > 0) {
    console.error('Admin is not configured — missing', gaps.join(', '))
    return json({ ok: false, error: 'not_configured' }, 503)
  }

  const { data, error } = await supabaseList()

  if (error) {
    console.error('admin_order_list failed', error)
    return json({ ok: false, error: 'lookup_failed' }, 500)
  }

  return json({ ok: true, orders: data ?? [] }, 200)
}

async function supabaseList() {
  const supabase = serviceClient()
  const { data, error } = await supabase.rpc('admin_order_list', {
    p_limit: 100,
    p_offset: 0,
  })
  return { data, error: error?.message }
}
