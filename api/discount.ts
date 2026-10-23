import { isSameOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { serviceClient } from '../lib/supabase'
import { CHECKOUT_ENV, missingEnv } from '../lib/config'
import { orderError } from '../lib/commerce'
import { offerEnabled } from '../lib/offer'

export const config = { runtime: 'edge' }

/**
 * Puts a discount code on an open order, or takes it off with an empty one.
 *
 * Nothing is charged here and Stripe is not called. apply_discount() decides
 * what the code is worth and writes it onto the order; prepare_payment() then
 * includes it when it fixes the total in /api/pay. The browser is told the
 * discount only so the summary can show it.
 */

// Tighter than checkout: this is the one route where guessing is the attack.
// A code is one of 32^6, so the limit is about noise rather than odds.
const limiter = createRateLimiter({ max: 10, windowMs: 5 * 60 * 1000 })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function discountMessage(code: string): string {
  switch (code) {
    case 'discount_unknown':
      return 'That code is not recognised. Please check it and try again.'
    case 'discount_used':
      return 'That code has already been used.'
    case 'discount_expired':
      return 'That code has expired.'
    case 'unknown_order':
      return 'This checkout has expired. Please return to your bag and start again.'
    case 'order_closed':
      return 'This order has already been placed.'
    default:
      return 'We could not apply that code. Please try again in a moment.'
  }
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  if (!offerEnabled()) {
    return json(
      { ok: false, error: 'disabled', message: 'Discount codes are not available right now.' },
      410,
    )
  }

  const gaps = missingEnv(CHECKOUT_ENV)
  if (gaps.length > 0) {
    console.error('Discounts are not configured — missing', gaps.join(', '))
    return json({ ok: false, error: 'not_configured', message: discountMessage('') }, 503)
  }

  if (limiter.check(clientKey(request))) {
    return json(
      { ok: false, error: 'rate_limited', message: 'Too many attempts. Please wait a moment.' },
      429,
    )
  }

  let clientToken = ''
  let code = ''
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body?.clientToken === 'string') clientToken = body.clientToken.trim()
    if (typeof body?.code === 'string') code = body.code.trim().slice(0, 32)
  } catch {
    return json({ ok: false, error: 'invalid', message: discountMessage('') }, 400)
  }

  if (!UUID.test(clientToken)) {
    return json({ ok: false, error: 'invalid', message: discountMessage('unknown_order') }, 400)
  }

  const { data, error } = await serviceClient().rpc('apply_discount', {
    p_client_token: clientToken,
    p_code: code,
  })

  if (error || !data) {
    const { code: reason } = orderError(error?.message)
    if (reason === 'unknown') console.error('apply_discount failed', error?.message)
    return json({ ok: false, error: reason, message: discountMessage(reason) }, 409)
  }

  const applied = data as { code: string | null; percentOff: number; discountPence: number }

  return json(
    {
      ok: true,
      code: applied.code,
      percentOff: applied.percentOff,
      discountPence: applied.discountPence,
    },
    200,
  )
}
