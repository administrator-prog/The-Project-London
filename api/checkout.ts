import { isSameOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { serviceClient } from '../lib/supabase'
import { CHECKOUT_ENV, missingEnv } from '../lib/config'
import { checkoutMessage, isShippingZone, orderError, parseLines } from '../lib/commerce'
import type { PlacedOrder, ShippingZone } from '../lib/commerce'

export const config = { runtime: 'edge' }

/**
 * Opens an order and returns everything the checkout page needs to render.
 *
 * No money moves here and Stripe is not called — that happens at /api/pay,
 * once the customer has chosen a delivery method. This step exists to get the
 * bag priced by Postgres and to hand back the one-order secret that authorises
 * everything after it.
 *
 * The browser sends product ids, sizes and quantities. It does not send a
 * price, and further down the flow it does not send a shipping cost either —
 * only the id of a rate, which the server looks up.
 */

const limiter = createRateLimiter({ max: 12, windowMs: 5 * 60 * 1000 })

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const gaps = missingEnv([...CHECKOUT_ENV, 'STRIPE_PUBLISHABLE_KEY'])
  if (gaps.length > 0) {
    console.error('Checkout is not configured — missing', gaps.join(', '))
    return json(
      { ok: false, error: 'not_configured', message: 'Checkout is not available right now.' },
      503,
    )
  }

  if (limiter.check(clientKey(request))) {
    return json(
      { ok: false, error: 'rate_limited', message: 'Too many attempts. Please wait a moment.' },
      429,
      { 'Retry-After': '300' },
    )
  }

  let lines: ReturnType<typeof parseLines> = []
  let zone: ShippingZone = 'uk'

  try {
    const body = (await request.json()) as Record<string, unknown>
    lines = parseLines(body?.lines)
    if (isShippingZone(body?.shippingZone)) zone = body.shippingZone
  } catch {
    return json({ ok: false, error: 'invalid', message: 'Something is wrong with your bag.' }, 400)
  }

  if (lines.length === 0) {
    return json({ ok: false, error: 'empty_bag', message: 'Your bag is empty.' }, 400)
  }

  const supabase = serviceClient()

  const { data: placed, error: placeError } = await supabase.rpc('place_order', {
    p_lines: lines,
    p_shipping_zone: zone,
    p_email: null,
  })

  if (placeError || !placed) {
    const { code, detail } = orderError(placeError?.message)
    if (code === 'unknown') {
      console.error('place_order failed', placeError?.message)
      return json({ ok: false, error: code, message: checkoutMessage(code, detail) }, 500)
    }
    return json({ ok: false, error: code, message: checkoutMessage(code, detail) }, 409)
  }

  const order = placed as PlacedOrder & { clientToken: string }

  const { data: rates, error: ratesError } = await supabase
    .from('shipping_rates')
    .select('id, label, description, price_pence, delivery_min_days, delivery_max_days')
    .eq('zone', zone)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (ratesError || !rates?.length) {
    console.error('No shipping rates configured for zone', zone, ratesError?.message)
    return json(
      { ok: false, error: 'no_shipping', message: 'Checkout is not available right now.' },
      500,
    )
  }

  /*
   * The publishable key is served from here rather than baked in at build time
   * with a VITE_ prefix. It is safe in the browser either way, but this keeps
   * the rule in .env.example absolute — nothing about Stripe is a build-time
   * variable — and means rotating it does not need a rebuild.
   */
  return json(
    {
      ok: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      order: {
        clientToken: order.clientToken,
        reference: order.reference,
        currency: order.currency,
        subtotalPence: order.subtotalPence,
        shippingZone: order.shippingZone,
        items: order.items,
      },
      rates: rates.map((rate) => ({
        id: rate.id,
        label: rate.label,
        description: rate.description,
        pricePence: rate.price_pence,
        deliveryMinDays: rate.delivery_min_days,
        deliveryMaxDays: rate.delivery_max_days,
      })),
    },
    200,
  )
}
