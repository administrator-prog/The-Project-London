import type { BagItem } from './bag'

/**
 * The client half of checkout.
 *
 * Deliberately thin. It sends what is in the bag as ids, sizes and quantities
 * and nothing more — no prices, no totals. Everything monetary is decided by
 * the server, so there is nothing here worth tampering with.
 */

export type ShippingZone = 'uk' | 'international'

/** Shown on the bag so the total is honest before anyone reaches Stripe. */
export const SHIPPING: Record<
  ShippingZone,
  { label: string; pounds: number; note?: string }
> = {
  uk: {
    label: 'Complimentary',
    pounds: 0,
    note: 'Next day delivery is available at checkout for £7.95.',
  },
  international: {
    label: '£25.00',
    pounds: 25,
    note: 'Flat rate worldwide. Any duties are payable on delivery.',
  },
}

export interface OrderItem {
  productId: string
  productName: string
  size: string
  quantity: number
  unitPricePence: number
}

export interface OrderSummary {
  reference: string
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded' | 'failed'
  email: string | null
  customerName: string | null
  currency: string
  subtotalPence: number
  shippingPence: number | null
  totalPence: number | null
  shippingMethod: string | null
  placedAt: string
  items: OrderItem[]
}

type CheckoutResult = { ok: true; url: string } | { ok: false; message: string }

const GENERIC_ERROR = 'We could not start checkout. Please try again in a moment.'

/**
 * Asks the server to price the bag and open a Stripe session.
 *
 * Resolves with a URL to send the browser to, or a message fit to show the
 * customer. It never throws — a bag page that blanks out on a dropped
 * connection is worse than one that says "try again".
 */
export async function startCheckout(
  items: BagItem[],
  shippingZone: ShippingZone,
): Promise<CheckoutResult> {
  const lines = items.map((item) => ({
    productId: item.productId,
    size: item.size,
    quantity: item.quantity,
  }))

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, shippingZone }),
    })

    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; url?: string; message?: string }
      | null

    if (response.ok && body?.ok && typeof body.url === 'string') {
      return { ok: true, url: body.url }
    }

    return { ok: false, message: body?.message || GENERIC_ERROR }
  } catch {
    return { ok: false, message: GENERIC_ERROR }
  }
}

/** Reads back an order after Stripe returns the customer to the site. */
export async function fetchOrder(sessionId: string): Promise<OrderSummary | null> {
  try {
    const response = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`)
    if (!response.ok) return null

    const body = (await response.json()) as { ok?: boolean; order?: OrderSummary }
    return body?.ok && body.order ? body.order : null
  } catch {
    return null
  }
}
