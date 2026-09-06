import { isSameOrigin } from '../../lib/access'
import { isAdmin } from '../../lib/admin'
import { CHECKOUT_ENV, missingEnv } from '../../lib/config'
import { shippedEmail } from '../../lib/email'
import { sendEmail } from '../../lib/email'
import { claimSend, releaseSend } from '../../lib/fulfilment'
import { clientKey, createRateLimiter } from '../../lib/rate-limit'
import { serviceClient } from '../../lib/supabase'
import type { PlacedItem } from '../../lib/commerce'

export const config = { runtime: 'edge' }

/**
 * Marks an order shipped and tells the customer.
 *
 * mark_order_shipped() takes the row lock and reports whether this call was
 * the one that did it, so a double-clicked button cannot set two dispatch
 * dates. The email is claimed separately, the same way the confirmation is —
 * an order that was marked shipped but whose email failed must still be able
 * to send one, and an order already emailed must not send a second.
 */

const limiter = createRateLimiter({ max: 30, windowMs: 5 * 60 * 1000 })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ShippedOrder {
  id: string
  reference: string
  email: string | null
  customer_name: string | null
  shipping_method: string | null
  shipping_address: Record<string, unknown> | null
  tracking_carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_email_sent_at: string | null
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)
  if (!(await isAdmin(request))) return json({ ok: false, error: 'unauthorised' }, 401)

  if (limiter.check(clientKey(request))) {
    return json({ ok: false, error: 'rate_limited' }, 429)
  }

  const gaps = missingEnv(CHECKOUT_ENV)
  if (gaps.length > 0) {
    console.error('Admin is not configured — missing', gaps.join(', '))
    return json({ ok: false, error: 'not_configured' }, 503)
  }

  let orderId = ''
  let carrier: string | null = null
  let trackingNumber: string | null = null
  let trackingUrl: string | null = null

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body?.orderId === 'string') orderId = body.orderId.trim()
    if (typeof body?.carrier === 'string') carrier = body.carrier.trim().slice(0, 60) || null
    if (typeof body?.trackingNumber === 'string') {
      trackingNumber = body.trackingNumber.trim().slice(0, 120) || null
    }
    if (typeof body?.trackingUrl === 'string') {
      const value = body.trackingUrl.trim().slice(0, 500)
      // Only ever put an http(s) link in front of a customer.
      trackingUrl = /^https?:\/\//i.test(value) ? value : null
    }
  } catch {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  if (!UUID.test(orderId)) return json({ ok: false, error: 'invalid' }, 400)

  const supabase = serviceClient()

  const { data, error } = await supabase.rpc('mark_order_shipped', {
    p_order_id: orderId,
    p_carrier: carrier,
    p_tracking: trackingNumber,
    p_url: trackingUrl,
  })

  if (error || !data) {
    const message = error?.message ?? ''
    if (/unknown_order/.test(message)) return json({ ok: false, error: 'unknown_order' }, 404)
    if (/order_not_paid/.test(message)) return json({ ok: false, error: 'not_paid' }, 409)
    console.error('mark_order_shipped failed', message)
    return json({ ok: false, error: 'failed' }, 500)
  }

  const result = data as {
    alreadyShipped: boolean
    order: ShippedOrder
    items: PlacedItem[]
  }

  const emailed = await notifyShipped(supabase, result.order, result.items)

  return json(
    { ok: true, alreadyShipped: result.alreadyShipped, emailed, order: result.order },
    200,
  )
}

/**
 * The dispatch email, claimed before it is sent and released if it fails.
 *
 * Never allowed to fail the request: the order really has shipped by this
 * point, and telling the admin it did not because Resend was down would invite
 * them to press the button again.
 */
async function notifyShipped(
  supabase: ReturnType<typeof serviceClient>,
  order: ShippedOrder,
  items: PlacedItem[],
): Promise<boolean> {
  if (!order.email || order.shipped_email_sent_at) return false
  if (!(await claimSend(supabase, order.id, 'shipped_email_sent_at'))) return false

  const sent = await sendEmail({
    to: order.email,
    replyTo: process.env.ORDER_REPLY_TO || process.env.STUDIO_ORDER_EMAIL,
    ...shippedEmail({
      reference: order.reference,
      customerName: order.customer_name,
      items,
      shippingMethod: order.shipping_method,
      shippingAddress: order.shipping_address,
      trackingCarrier: order.tracking_carrier,
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url,
    }),
  })

  if (!sent) {
    console.error('Dispatch email was not sent for', order.reference)
    await releaseSend(supabase, order.id, 'shipped_email_sent_at')
  }

  return sent
}
