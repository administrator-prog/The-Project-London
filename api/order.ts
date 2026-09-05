import { isSameOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { CHECKOUT_ENV, missingEnv } from '../lib/config'
import { serviceClient } from '../lib/supabase'
import { stripeClient } from '../lib/stripe'
import { fulfil } from '../lib/fulfilment'

export const config = { runtime: 'edge' }

/**
 * What the confirmation page reads after Stripe sends the customer back.
 *
 * The session id in the URL is the only key — it is long, opaque and known
 * only to the person who just paid, and this whole site sits behind the
 * password wall besides. Even so the response is a curated summary from
 * order_summary(), not the order row: no payment intent, no customer id.
 *
 * If the webhook has not landed yet — a cold start, a retry, or an endpoint
 * that was never configured — this asks Stripe directly and runs the same
 * fulfilment the webhook would have. The customer sees a confirmed order
 * either way, and the double-run is a no-op by design.
 */

const limiter = createRateLimiter({ max: 30, windowMs: 5 * 60 * 1000 })

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  if (limiter.check(clientKey(request))) {
    return json({ ok: false, error: 'rate_limited' }, 429)
  }

  const gaps = missingEnv(CHECKOUT_ENV)
  if (gaps.length > 0) {
    console.error('Order lookup is not configured — missing', gaps.join(', '))
    return json({ ok: false, error: 'not_configured' }, 503)
  }

  const sessionId = new URL(request.url).searchParams.get('session_id')?.trim()

  // Stripe's ids are `cs_test_…` / `cs_live_…`. Anything else is not worth a
  // round trip to the database.
  if (!sessionId || !/^cs_[A-Za-z0-9_]{10,255}$/.test(sessionId)) {
    return json({ ok: false, error: 'invalid_session' }, 400)
  }

  const supabase = serviceClient()

  const { data, error } = await supabase.rpc('order_summary', { p_session_id: sessionId })

  if (error) {
    console.error('order_summary failed', error.message)
    return json({ ok: false, error: 'lookup_failed' }, 500)
  }

  if (!data) return json({ ok: false, error: 'not_found' }, 404)

  const summary = data as { status: string }

  // Still pending means the webhook has not arrived. Ask Stripe whether the
  // money is actually in, and finish the job here if it is.
  if (summary.status === 'pending') {
    try {
      const stripe = stripeClient()
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.payment_status === 'paid') {
        console.warn('Fulfilling from the confirmation page — webhook has not arrived', sessionId)
        await fulfil(supabase, stripe, sessionId)

        const { data: refreshed } = await supabase.rpc('order_summary', {
          p_session_id: sessionId,
        })
        if (refreshed) return json({ ok: true, order: refreshed }, 200)
      }
    } catch (recoveryError) {
      // Not fatal. The page can still show the order as pending, and the
      // webhook's own retries have three days to sort it out.
      console.error('Could not recover the pending order from Stripe', recoveryError)
    }
  }

  return json({ ok: true, order: data }, 200)
}
