import type Stripe from 'stripe'
import { cryptoProvider, stripeClient } from '../lib/stripe'
import { serviceClient } from '../lib/supabase'
import { WEBHOOK_ENV, missingEnv } from '../lib/config'
import { fulfil } from '../lib/fulfilment'

export const config = { runtime: 'edge' }

/**
 * Stripe's side of the conversation. This is the normal place an order becomes
 * paid — the browser's return to /order/confirmed is a courtesy, not evidence.
 * A customer who closes the tab the instant their card clears still gets a
 * recorded order, a decremented stock count and a receipt.
 *
 * IMPORTANT: this route is exempt from the password wall in `middleware.ts`.
 * Stripe does not carry a session cookie, so without that exemption every
 * delivery would be answered with a 307 to /access and no order would ever be
 * marked paid.
 *
 * Everything here is written to survive redelivery. Stripe retries for up to
 * three days on any non-2xx, and will occasionally send the same event twice
 * unprompted, so `stripe_events` is claimed first and every write below it is
 * a no-op the second time round.
 */

const HANDLED = new Set<Stripe.Event.Type>([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
])

export default async function handler(request: Request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const gaps = missingEnv(WEBHOOK_ENV)
  if (gaps.length > 0) {
    // 503 rather than 500: Stripe keeps retrying for three days, so an order
    // paid during a misconfigured window is still recorded once it is fixed.
    console.error('The webhook is not configured — missing', gaps.join(', '))
    return new Response('Not configured', { status: 503 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET!

  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  // The exact bytes Stripe signed. Parsing and re-serialising the JSON would
  // reorder keys and break the signature, so the body is read as text once and
  // only turned into an object by constructEventAsync.
  const payload = await request.text()

  const stripe = stripeClient()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
      undefined,
      cryptoProvider,
    )
  } catch (error) {
    // A bad signature is never retried — 400 tells Stripe to stop.
    console.error('Webhook signature verification failed', error)
    return new Response('Invalid signature', { status: 400 })
  }

  if (!HANDLED.has(event.type)) {
    // Acknowledged, not processed. Anything else enabled in the dashboard
    // would otherwise retry against this endpoint for three days.
    return new Response('Ignored', { status: 200 })
  }

  const supabase = serviceClient()

  // Claim the event. A duplicate key means another delivery of this same event
  // already did the work, so there is nothing left to do but agree.
  const { error: claimError } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })

  if (claimError) {
    if (claimError.code === '23505') {
      return new Response('Already processed', { status: 200 })
    }
    // Could not even record the attempt — let Stripe retry rather than risk
    // processing this event without a record that it happened.
    console.error('Could not claim the webhook event', claimError.message)
    return new Response('Storage unavailable', { status: 503 })
  }

  try {
    const intent = event.data.object as Stripe.PaymentIntent

    switch (event.type) {
      case 'payment_intent.succeeded': {
        await fulfil(supabase, stripe, intent.id, event.id)
        break
      }

      case 'payment_intent.payment_failed': {
        await supabase.rpc('mark_intent_closed', {
          p_payment_intent: intent.id,
          p_status: 'failed',
        })
        break
      }

      case 'payment_intent.canceled': {
        await supabase.rpc('mark_intent_closed', {
          p_payment_intent: intent.id,
          p_status: 'cancelled',
        })
        break
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    // Release the claim so Stripe's retry is allowed to try again, rather than
    // hitting the "already processed" branch above and skipping the order.
    console.error('Webhook handling failed', error)
    await supabase.from('stripe_events').delete().eq('id', event.id)
    return new Response('Handler error', { status: 500 })
  }
}
