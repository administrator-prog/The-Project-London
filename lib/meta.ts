import type Stripe from 'stripe'
import type { PlacedItem } from './commerce'
import type { OrderRow } from './fulfilment'

/**
 * Purchase, reported to Meta from the server through the Conversions API.
 *
 * The browser sends its own Purchase from the confirmation page, but browsers
 * block pixels, close tabs and never come back from 3-D Secure. This copy is
 * sent once, by whichever of the webhook and the confirmation page recorded
 * the payment, and carries the same event id as the browser's
 * (`purchase.<reference>`), so Meta keeps one of the two and the order is
 * counted exactly once.
 *
 * Only sent when the customer accepted cookies at checkout. /api/pay records
 * that choice — and the browser details Meta matches on — in the
 * PaymentIntent's metadata, which is where this reads it back from.
 *
 * Optional, like Resend: with no META_CAPI_ACCESS_TOKEN nothing is sent and
 * nothing fails. Never allowed to throw — the order is already recorded and
 * emailed by the time this runs.
 */

/** Mirrors META_PIXEL_ID in src/lib/pixel.ts. */
export const META_PIXEL_ID = '1611370797407799'

/** Pinned for the same reason as STRIPE_API_VERSION. */
const GRAPH_VERSION = 'v23.0'

/** Keys /api/pay writes to the PaymentIntent's metadata. */
export const TRACKING_METADATA = {
  consent: 'meta_consent',
  fbp: 'meta_fbp',
  fbc: 'meta_fbc',
  ip: 'client_ip',
  userAgent: 'client_user_agent',
  sourceUrl: 'event_source_url',
} as const

export async function sendPurchase(
  intent: Stripe.PaymentIntent,
  order: OrderRow,
  items: PlacedItem[],
) {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!token) return

  const meta = intent.metadata ?? {}
  if (meta[TRACKING_METADATA.consent] !== 'granted') return

  try {
    const address = (order.shipping_address ?? {}) as Record<string, string | null | undefined>
    const country = address.country?.toLowerCase() ?? null
    const [firstName, ...rest] = (order.customer_name ?? '').trim().toLowerCase().split(/\s+/)

    const user_data: Record<string, unknown> = {
      em: await hashed(order.email?.trim().toLowerCase()),
      ph: await hashed(normalisePhone(order.phone, country)),
      fn: await hashed(firstName),
      ln: await hashed(rest.join(' ')),
      ct: await hashed(address.city?.toLowerCase().replace(/[^a-z]/g, '')),
      zp: await hashed(address.postal_code?.toLowerCase().replace(/\s+/g, '')),
      country: await hashed(country),
      client_ip_address: meta[TRACKING_METADATA.ip] || undefined,
      client_user_agent: meta[TRACKING_METADATA.userAgent] || undefined,
      fbp: meta[TRACKING_METADATA.fbp] || undefined,
      fbc: meta[TRACKING_METADATA.fbc] || undefined,
    }

    const body = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: `purchase.${order.reference}`,
          action_source: 'website',
          event_source_url: meta[TRACKING_METADATA.sourceUrl] || undefined,
          user_data,
          custom_data: {
            currency: order.currency.toUpperCase(),
            value: (order.total_pence ?? order.subtotal_pence) / 100,
            content_type: 'product',
            content_ids: items.map((i) => i.productId),
            contents: items.map((i) => ({
              id: i.productId,
              quantity: i.quantity,
              item_price: i.unitPricePence / 100,
            })),
            num_items: items.reduce((n, i) => n + i.quantity, 0),
            order_id: order.reference,
          },
        },
      ],
      // Set while checking the setup in Events Manager → Test events; remove
      // it afterwards, or every real purchase lands in the test tab instead.
      ...(process.env.META_TEST_EVENT_CODE?.trim()
        ? { test_event_code: process.env.META_TEST_EVENT_CODE.trim() }
        : {}),
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    )

    if (!response.ok) {
      console.error(
        'Meta Conversions API refused Purchase for',
        order.reference,
        response.status,
        await response.text().catch(() => ''),
      )
    }
  } catch (error) {
    console.error('Could not send Purchase to Meta for', order.reference, error)
  }
}

/** SHA-256, hex, as Meta requires for anything that identifies a person. */
async function hashed(value: string | null | undefined): Promise<string | undefined> {
  if (!value) return undefined
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Digits only, with the country code. Stripe's address element usually gives
 * E.164 already; a UK number typed as 07… is the one common exception.
 */
function normalisePhone(phone: string | null, country: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (phone.trim().startsWith('+')) return digits
  if (country === 'gb' && digits.startsWith('0')) return `44${digits.slice(1)}`
  return digits
}
