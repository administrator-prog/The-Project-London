import type Stripe from 'stripe'
import type { stripeClient } from './stripe'
import type { serviceClient } from './supabase'
import { confirmationEmail, sendEmail, studioEmail } from './email'
import type { PlacedItem } from './commerce'

/**
 * Turning a succeeded PaymentIntent into a fulfilled order.
 *
 * Shared by the webhook and the confirmation page. The webhook is the normal
 * route; the page calls the same code as a safety net, so a webhook that is
 * slow, misconfigured or pointed at the wrong deployment still cannot leave a
 * customer looking at an order that was never recorded.
 *
 * Both paths are safe to run at once — mark_order_paid_by_intent() takes a row
 * lock and reports whether this call was the one that did the work.
 */

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
  zone_mismatch: boolean
  customer_email_sent_at: string | null
  studio_email_sent_at: string | null
}

export interface FulfilResult {
  alreadyPaid: boolean
  order: OrderRow
  items: PlacedItem[]
}

/**
 * Records the money, commits the stock, sends the two emails.
 *
 * The intent is re-fetched rather than read off the event, with the charge
 * expanded: the billing details the customer actually typed live on the charge,
 * not on the intent.
 */
export async function fulfil(
  supabase: ReturnType<typeof serviceClient>,
  stripe: ReturnType<typeof stripeClient>,
  paymentIntentId: string,
  eventId?: string,
): Promise<FulfilResult> {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  })

  const charge =
    intent.latest_charge && typeof intent.latest_charge !== 'string' ? intent.latest_charge : null

  const billing = charge?.billing_details ?? null
  const shipping = intent.shipping ?? charge?.shipping ?? null

  const { data, error } = await supabase.rpc('mark_order_paid_by_intent', {
    p_payment_intent: intent.id,
    p_email: intent.receipt_email ?? billing?.email ?? null,
    p_customer_name: shipping?.name ?? billing?.name ?? null,
    p_phone: shipping?.phone ?? billing?.phone ?? null,
    p_total_pence: intent.amount_received || intent.amount,
    p_shipping_address: flattenAddress(shipping),
    p_billing_address: flattenAddress(billing),
  })

  if (error) throw new Error(`mark_order_paid_by_intent failed: ${error.message}`)

  const result = data as FulfilResult

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
            zoneMismatch: order.zone_mismatch,
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
 * Stripe keeps the name and phone beside the address rather than inside it.
 * Flattened into one object so the email template and anyone reading the row
 * in Supabase see a single postal address.
 */
function flattenAddress(
  source:
    | { name?: string | null; phone?: string | null; address?: Stripe.Address | null }
    | null
    | undefined,
): Record<string, unknown> | null {
  if (!source?.address) return null
  return { name: source.name ?? null, ...source.address }
}
