import type Stripe from 'stripe'
import { isSameOrigin, requestOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { CHECKOUT_ENV, missingEnv } from '../lib/config'
import { serviceClient } from '../lib/supabase'
import { stripeClient } from '../lib/stripe'
import {
  INTERNATIONAL_COUNTRIES,
  UK_COUNTRIES,
  checkoutMessage,
  isShippingZone,
  orderError,
  parseLines,
} from '../lib/commerce'
import type { PlacedOrder, ShippingZone } from '../lib/commerce'

export const config = { runtime: 'edge' }

/**
 * Opens a Stripe Checkout session for the bag.
 *
 * The browser sends product ids, sizes and quantities — nothing else. Prices,
 * line totals and stock all come back out of Postgres inside place_order(), so
 * a bag edited in devtools buys the real catalogue at the real price or it
 * does not buy at all.
 *
 * The order row is written *before* Stripe is called, so a session can never
 * exist without something on our side to reconcile it against. An abandoned
 * checkout simply leaves a `pending` row behind.
 */

const limiter = createRateLimiter({ max: 12, windowMs: 5 * 60 * 1000 })

/** Stripe's floor is 30 minutes. Long enough to find a card, short enough
 *  that a stale session cannot be paid days later at yesterday's price. */
const SESSION_TTL_SECONDS = 30 * 60

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const gaps = missingEnv(CHECKOUT_ENV)
  if (gaps.length > 0) {
    console.error('Checkout is not configured — missing', gaps.join(', '))
    return json(
      { ok: false, error: 'not_configured', message: 'Checkout is not available right now.' },
      503,
    )
  }

  const ip = clientKey(request)
  if (limiter.check(ip)) {
    return json({ ok: false, error: 'rate_limited', message: 'Too many attempts. Please wait a moment.' }, 429, {
      'Retry-After': '300',
    })
  }

  let lines: ReturnType<typeof parseLines> = []
  let zone: ShippingZone = 'uk'
  let email: string | null = null

  try {
    const body = (await request.json()) as Record<string, unknown>
    lines = parseLines(body?.lines)
    if (isShippingZone(body?.shippingZone)) zone = body.shippingZone
    if (typeof body?.email === 'string') {
      const trimmed = body.email.trim().slice(0, 254).toLowerCase()
      if (looksLikeEmail(trimmed)) email = trimmed
    }
  } catch {
    return json({ ok: false, error: 'invalid', message: 'Something is wrong with your bag.' }, 400)
  }

  if (lines.length === 0) {
    return json({ ok: false, error: 'empty_bag', message: 'Your bag is empty.' }, 400)
  }

  const supabase = serviceClient()

  // --- Price and reserve-check the bag, server side -------------------------

  const { data: placed, error: placeError } = await supabase.rpc('place_order', {
    p_lines: lines,
    p_shipping_zone: zone,
    p_email: email,
  })

  if (placeError || !placed) {
    const { code, detail } = orderError(placeError?.message)

    // Stock and catalogue refusals are ordinary — a size sold out, a bag went
    // stale — and the customer is told plainly. Anything unrecognised is ours,
    // so it is logged in full and answered vaguely.
    if (code === 'unknown') {
      console.error('place_order failed', placeError?.message)
      return json({ ok: false, error: code, message: checkoutMessage(code, detail) }, 500)
    }

    return json({ ok: false, error: code, message: checkoutMessage(code, detail) }, 409)
  }

  const order = placed as PlacedOrder

  // --- Shipping rates for this zone only ------------------------------------

  const { data: rates, error: ratesError } = await supabase
    .from('shipping_rates')
    .select('id, label, description, price_pence, delivery_min_days, delivery_max_days')
    .eq('zone', zone)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (ratesError || !rates?.length) {
    console.error('No shipping rates configured for zone', zone, ratesError?.message)
    await failOrder(supabase, order.id)
    return json(
      { ok: false, error: 'no_shipping', message: 'We could not start checkout. Please try again shortly.' },
      500,
    )
  }

  // --- The session ----------------------------------------------------------

  const origin = requestOrigin(request)
  const stripe = stripeClient()

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: order.reference,
        ...(email ? { customer_email: email } : {}),

        line_items: order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: order.currency,
            unit_amount: item.unitPricePence,
            product_data: {
              name: item.productName,
              description: `Size ${item.size}`,
              metadata: { product_id: item.productId, size: item.size },
            },
          },
        })),

        shipping_address_collection: {
          allowed_countries: zone === 'uk' ? UK_COUNTRIES : INTERNATIONAL_COUNTRIES,
        },
        shipping_options: rates.map(toShippingOption(order.currency)),
        phone_number_collection: { enabled: true },
        billing_address_collection: 'auto',

        // The reference travels on the payment intent too, so a refund or a
        // dispute opened months later in the Stripe dashboard still says which
        // order it belongs to.
        payment_intent_data: {
          description: `The Project London — ${order.reference}`,
          metadata: { order_id: order.id, reference: order.reference },
        },
        metadata: { order_id: order.id, reference: order.reference, shipping_zone: zone },

        expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
        success_url: `${origin}/order/confirmed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/bag`,
      },
      // Keyed on the order, so a double-clicked button or a retried fetch
      // returns the same session instead of opening a second one.
      { idempotencyKey: `order:${order.id}` },
    )

    if (!session.url) {
      throw new Error('Stripe returned a session with no URL')
    }

    const { error: linkError } = await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    if (linkError) {
      // Without this link the webhook has no way to find the order, so the
      // session must not be handed to the customer.
      console.error('Could not attach the Stripe session to the order', linkError.message)
      await stripe.checkout.sessions.expire(session.id).catch(() => {})
      await failOrder(supabase, order.id)
      return json(
        { ok: false, error: 'link_failed', message: 'We could not start checkout. Please try again shortly.' },
        500,
      )
    }

    return json({ ok: true, url: session.url, reference: order.reference }, 200)
  } catch (error) {
    console.error('Stripe session creation failed', error)
    await failOrder(supabase, order.id)
    return json(
      { ok: false, error: 'stripe', message: 'We could not reach our payment provider. Please try again shortly.' },
      502,
    )
  }
}

/** Turns a row of `shipping_rates` into the option Stripe renders. */
function toShippingOption(currency: string) {
  return (rate: {
    label: string
    price_pence: number
    delivery_min_days: number | null
    delivery_max_days: number | null
  }): Stripe.Checkout.SessionCreateParams.ShippingOption => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: rate.label,
      fixed_amount: { amount: rate.price_pence, currency },
      ...(rate.delivery_min_days !== null && rate.delivery_max_days !== null
        ? {
            delivery_estimate: {
              minimum: { unit: 'business_day', value: rate.delivery_min_days },
              maximum: { unit: 'business_day', value: rate.delivery_max_days },
            },
          }
        : {}),
    },
  })
}

/** A pending order that never made it to Stripe is closed out, not left open. */
async function failOrder(supabase: ReturnType<typeof serviceClient>, orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'failed', cancelled_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending')

  if (error) console.error('Could not close out the failed order', error.message)
}
