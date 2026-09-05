import type Stripe from 'stripe'
import type { stripeClient } from './stripe'
import type { serviceClient } from './supabase'
import { confirmationEmail, sendEmail, studioEmail } from './email'
import type { PlacedItem } from './commerce'

/**
 * Turning a paid Stripe session into a fulfilled order.
 *
 * Shared by the webhook and the confirmation page. The webhook is the normal
 * route; the page calls the same code as a safety net so that a webhook which
 * is slow, misconfigured or pointed at the wrong deployment still cannot leave
 * a customer looking at an order that was never recorded.
 *
 * Both paths are safe to run concurrently — mark_order_paid() takes a row lock
 * and reports whether this call was the one that did the work, and only that
 * call sends email.
 */

/**
 * Records the money, commits the stock, sends the two emails.
 *
 * The session is re-fetched rather than read off the event: the event payload
 * carries unexpanded ids, and the chosen shipping rate's name only exists once
 * `shipping_cost.shipping_rate` is expanded.
 */
export async function fulfil(
  supabase: ReturnType<typeof serviceClient>,
  stripe: ReturnType<typeof stripeClient>,
  sessionId: string,
  eventId?: string,
) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['shipping_cost.shipping_rate'],
  })

  const shippingDetails = session.collected_information?.shipping_details ?? null
  const shippingRate = session.shipping_cost?.shipping_rate
  const shippingMethod =
    shippingRate && typeof shippingRate !== 'string' ? shippingRate.display_name : null

  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

  const { data, error } = await supabase.rpc('mark_order_paid', {
    p_session_id: session.id,
    p_payment_intent: paymentIntent ?? null,
    p_customer_id: customerId ?? null,
    p_email: session.customer_details?.email ?? null,
    p_customer_name: shippingDetails?.name ?? session.customer_details?.name ?? null,
    p_phone: session.customer_details?.phone ?? null,
    p_shipping_method: shippingMethod,
    p_shipping_pence: session.shipping_cost?.amount_total ?? null,
    p_total_pence: session.amount_total ?? null,
    p_shipping_address: flattenAddress(shippingDetails),
    p_billing_address: flattenAddress(session.customer_details),
  })

  if (error) throw new Error(`mark_order_paid failed: ${error.message}`)

  const result = data as {
    alreadyPaid: boolean
    order: OrderRow
    items: PlacedItem[]
  }

  // Link the event to the order now that we know which one it was.
  if (eventId) {
    await supabase.from('stripe_events').update({ order_id: result.order.id }).eq('id', eventId)
  }

  /*
   * Whether to email is decided by the timestamps, not by alreadyPaid. A first
   * delivery that recorded the order but could not reach Resend would otherwise
   * leave the customer with no receipt ever — the retry would find the order
   * already paid and skip straight past. Sending a second copy is a far smaller
   * failure than sending none.
   */
  if (!result.order.customer_email_sent_at || !result.order.studio_email_sent_at) {
    await notify(supabase, result.order, result.items)
  }

  return result
}

export interface OrderRow {
  id: string
  reference: string
  email: string | null
  customer_name: string | null
  phone: string | null
  currency: string
  subtotal_pence: number
  shipping_pence: number | null
  total_pence: number | null
  shipping_method: string | null
  shipping_zone: string
  shipping_address: Record<string, unknown> | null
  stock_shortfall: boolean
  customer_email_sent_at: string | null
  studio_email_sent_at: string | null
}

/**
 * Both emails, sent in parallel and never allowed to fail the webhook. The
 * order is already safely recorded by this point; a Resend outage should cost
 * a receipt, not trigger three days of Stripe retries against a webhook that
 * would re-run the whole fulfilment each time.
 */
async function notify(
  supabase: ReturnType<typeof serviceClient>,
  order: OrderRow,
  items: PlacedItem[],
) {
  const common = {
    reference: order.reference,
    customerName: order.customer_name,
    currency: order.currency,
    items,
    subtotalPence: order.subtotal_pence,
    shippingPence: order.shipping_pence,
    totalPence: order.total_pence,
    shippingMethod: order.shipping_method,
    shippingAddress: order.shipping_address,
  }

  const studioAddress = process.env.STUDIO_ORDER_EMAIL
  const replyTo = process.env.ORDER_REPLY_TO || studioAddress

  const [customerSent, studioSent] = await Promise.all([
    order.email && !order.customer_email_sent_at
      ? sendEmail({ to: order.email, replyTo, ...confirmationEmail(common) })
      : Promise.resolve(false),
    studioAddress && !order.studio_email_sent_at
      ? sendEmail({
          to: studioAddress,
          replyTo: order.email ?? undefined,
          ...studioEmail({
            ...common,
            email: order.email,
            phone: order.phone,
            shippingZone: order.shipping_zone,
            stockShortfall: order.stock_shortfall,
          }),
        })
      : Promise.resolve(false),
  ])

  if (!customerSent && order.email && !order.customer_email_sent_at) {
    console.error('Confirmation email was not sent for', order.reference)
  }
  if (!studioSent && !order.studio_email_sent_at) {
    console.error('Studio notification was not sent for', order.reference)
  }

  const now = new Date().toISOString()
  const stamps: Record<string, string> = {}
  if (customerSent) stamps.customer_email_sent_at = now
  if (studioSent) stamps.studio_email_sent_at = now

  if (Object.keys(stamps).length > 0) {
    await supabase.from('orders').update(stamps).eq('id', order.id)
  }
}

/**
 * Stripe nests the address under the party it belongs to and keeps the name
 * beside it. Flattened into one object so the email template and anyone
 * reading the row in Supabase see a single postal address.
 */
function flattenAddress(
  source: { name?: string | null; address?: Stripe.Address | null } | null | undefined,
): Record<string, unknown> | null {
  if (!source?.address) return null
  return { name: source.name ?? null, ...source.address }
}
