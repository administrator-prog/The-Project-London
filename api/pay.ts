import { isSameOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { serviceClient } from '../lib/supabase'
import { stripeClient } from '../lib/stripe'
import { CHECKOUT_ENV, missingEnv } from '../lib/config'
import { orderError } from '../lib/commerce'
import { TRACKING_METADATA } from '../lib/meta'

export const config = { runtime: 'edge' }

/**
 * Creates the PaymentIntent, at the amount the server decides.
 *
 * This is the last server step before the card is charged, and the only place
 * the total is fixed. The browser sends the order's token and the id of a
 * shipping rate; prepare_payment() looks up what that rate costs, checks it
 * belongs to the zone the order was placed in — otherwise an international
 * order could be paid at the £0 UK rate — and writes the total onto the order.
 * The intent is then created for exactly that figure.
 *
 * The amount the Payment Element was mounted with is display only. If the two
 * ever disagree, Stripe refuses the confirmation rather than charging the
 * lower one, which is the right way round for that mistake to fail.
 */

const limiter = createRateLimiter({ max: 20, windowMs: 5 * 60 * 1000 })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

/** What the customer is told when the server refuses to price the payment. */
function payMessage(code: string): string {
  switch (code) {
    case 'unknown_order':
      return 'This checkout has expired. Please return to your bag and start again.'
    case 'order_closed':
      return 'This order has already been placed.'
    case 'unknown_rate':
    case 'rate_wrong_zone':
      return 'That delivery option is not available. Please choose another.'
    case 'discount_invalid':
      return 'Your discount code has expired or has already been used. Please remove it to continue.'
    default:
      return 'We could not start the payment. Please try again in a moment.'
  }
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const gaps = missingEnv(CHECKOUT_ENV)
  if (gaps.length > 0) {
    console.error('Payment is not configured — missing', gaps.join(', '))
    return json({ ok: false, error: 'not_configured', message: payMessage('') }, 503)
  }

  if (limiter.check(clientKey(request))) {
    return json({ ok: false, error: 'rate_limited', message: payMessage('') }, 429)
  }

  let clientToken = ''
  let rateId = ''
  let email: string | null = null
  let tracking: Record<string, string> = {}

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body?.clientToken === 'string') clientToken = body.clientToken.trim()
    if (typeof body?.rateId === 'string') rateId = body.rateId.trim().slice(0, 64)
    if (typeof body?.email === 'string') {
      const trimmed = body.email.trim().slice(0, 254).toLowerCase()
      if (looksLikeEmail(trimmed)) email = trimmed
    }
    tracking = readTracking(request, body?.tracking)
  } catch {
    return json({ ok: false, error: 'invalid', message: payMessage('') }, 400)
  }

  if (!UUID.test(clientToken) || !rateId) {
    return json({ ok: false, error: 'invalid', message: payMessage('unknown_order') }, 400)
  }

  const supabase = serviceClient()

  const { data, error } = await supabase.rpc('prepare_payment', {
    p_client_token: clientToken,
    p_rate_id: rateId,
    p_email: email,
  })

  if (error || !data) {
    const { code } = orderError(error?.message)
    if (code === 'unknown') console.error('prepare_payment failed', error?.message)
    return json({ ok: false, error: code, message: payMessage(code) }, 409)
  }

  const priced = data as {
    id: string
    reference: string
    currency: string
    subtotalPence: number
    discountPence?: number
    shippingPence: number
    totalPence: number
    shippingLabel: string
  }

  const stripe = stripeClient()

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: priced.totalPence,
        currency: priced.currency,
        // Lets Stripe decide what to offer from the dashboard settings — cards,
        // Apple Pay and Google Pay — without this file needing to know.
        automatic_payment_methods: { enabled: true },
        description: `The Project London — ${priced.reference}`,
        ...(email ? { receipt_email: email } : {}),
        metadata: {
          order_id: priced.id,
          reference: priced.reference,
          shipping_method: priced.shippingLabel,
        },
      },
      // Keyed on the order and the amount, so re-picking a delivery option
      // makes a new intent while a double-submitted form reuses the last one.
      { idempotencyKey: `pay:${priced.id}:${priced.totalPence}` },
    )

    if (!intent.client_secret) throw new Error('Stripe returned an intent with no client secret')

    const { error: attachError } = await supabase.rpc('attach_payment_intent', {
      p_client_token: clientToken,
      p_payment_intent: intent.id,
    })

    if (attachError) {
      // Without this link the webhook cannot find the order, so the payment
      // must not be allowed to proceed.
      console.error('Could not attach the payment intent to the order', attachError.message)
      await stripe.paymentIntents.cancel(intent.id).catch(() => {})
      return json({ ok: false, error: 'link_failed', message: payMessage('') }, 500)
    }

    // A separate call rather than part of the create above: the idempotency
    // key there would refuse a retry whose cookie choice had changed. Not
    // fatal — without it the order simply is not reported to Meta from here.
    // Skipped entirely until the Conversions API is configured, since nothing
    // would ever read it.
    if (process.env.META_CAPI_ACCESS_TOKEN?.trim()) {
      await stripe.paymentIntents
        .update(intent.id, { metadata: tracking })
        .catch((error) => console.error('Could not record ad tracking on the intent', error))
    }

    return json(
      {
        ok: true,
        clientSecret: intent.client_secret,
        reference: priced.reference,
        subtotalPence: priced.subtotalPence,
        discountPence: priced.discountPence ?? 0,
        shippingPence: priced.shippingPence,
        totalPence: priced.totalPence,
      },
      200,
    )
  } catch (stripeError) {
    console.error('PaymentIntent creation failed', stripeError)
    return json({ ok: false, error: 'stripe', message: payMessage('') }, 502)
  }
}

const FBP = /^fb\.\d\.\d{10,16}\.\d{1,24}$/
const FBC = /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_-]{1,400}$/

/**
 * What lib/meta.ts needs to report the purchase, as PaymentIntent metadata.
 *
 * Every key is always written — an empty string removes a metadata key on
 * Stripe — so a customer who accepted and then declined before paying leaves
 * nothing behind from the first attempt.
 */
function readTracking(request: Request, raw: unknown): Record<string, string> {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const granted = value.consent === true
  const pick = (v: unknown, pattern: RegExp) =>
    granted && typeof v === 'string' && pattern.test(v) ? v : ''

  const ip = granted
    ? (request.headers.get('x-forwarded-for')?.split(',')[0] ?? request.headers.get('x-real-ip') ?? '')
        .trim()
        .slice(0, 64)
    : ''
  const origin = request.headers.get('origin')

  return {
    [TRACKING_METADATA.consent]: granted ? 'granted' : 'denied',
    [TRACKING_METADATA.fbp]: pick(value.fbp, FBP),
    [TRACKING_METADATA.fbc]: pick(value.fbc, FBC),
    [TRACKING_METADATA.ip]: ip,
    // Stripe caps a metadata value at 500 characters.
    [TRACKING_METADATA.userAgent]: granted
      ? (request.headers.get('user-agent') ?? '').slice(0, 500)
      : '',
    [TRACKING_METADATA.sourceUrl]: granted && origin ? `${origin}/order/confirmed` : '',
  }
}
