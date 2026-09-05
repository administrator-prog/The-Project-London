import type { BagItem } from './bag'

/**
 * The client half of checkout.
 *
 * Deliberately thin, and deliberately ignorant of money. It sends what is in
 * the bag as ids, sizes and quantities, and later the *id* of a shipping rate.
 * It never sends a price, a shipping cost or a total — those are looked up and
 * fixed by the server, so there is nothing here worth tampering with.
 */

export type ShippingZone = 'uk' | 'international'

export const ZONE_LABELS: Record<ShippingZone, string> = {
  uk: 'United Kingdom',
  international: 'Rest of World',
}

/**
 * Which countries the address form offers, per zone.
 *
 * Mirrors INTERNATIONAL_COUNTRIES in lib/commerce.ts. Kept as a separate list
 * rather than fetched because the address form needs it before any request has
 * been made; if you add a country there, add it here.
 */
export const ZONE_COUNTRIES: Record<ShippingZone, string[]> = {
  uk: ['GB'],
  international: [
    'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
    'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'JP', 'KR', 'LI', 'LT',
    'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RO', 'SE', 'SG',
    'SI', 'SK', 'US', 'AE', 'HK', 'QA', 'SA', 'KW', 'BH', 'OM', 'IL', 'ZA',
    'MY', 'MX',
  ],
}

/** Shown on the bag, so the total is honest before anyone reaches checkout. */
export const SHIPPING: Record<ShippingZone, { label: string; pounds: number; note?: string }> = {
  uk: {
    label: 'Complimentary',
    pounds: 0,
    note: 'DPD Next Day is available at checkout for £7.95.',
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

export interface ShippingRate {
  id: string
  label: string
  description: string | null
  pricePence: number
  deliveryMinDays: number | null
  deliveryMaxDays: number | null
}

export interface OpenedCheckout {
  publishableKey: string
  order: {
    clientToken: string
    reference: string
    currency: string
    subtotalPence: number
    shippingZone: ShippingZone
    items: OrderItem[]
  }
  rates: ShippingRate[]
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

type Result<T> = { ok: true; data: T } | { ok: false; message: string }

const GENERIC_ERROR = 'We could not start checkout. Please try again in a moment.'

/**
 * Step one: hand the bag to the server, which prices it and opens an order.
 * Nothing is charged here and Stripe is not involved yet.
 */
export async function openCheckout(
  items: BagItem[],
  shippingZone: ShippingZone,
): Promise<Result<OpenedCheckout>> {
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
      | (Partial<OpenedCheckout> & { ok?: boolean; message?: string })
      | null

    if (response.ok && body?.ok && body.publishableKey && body.order && body.rates) {
      return { ok: true, data: body as OpenedCheckout }
    }
    return { ok: false, message: body?.message || GENERIC_ERROR }
  } catch {
    return { ok: false, message: GENERIC_ERROR }
  }
}

export interface PreparedPayment {
  clientSecret: string
  reference: string
  subtotalPence: number
  shippingPence: number
  totalPence: number
}

/**
 * Step two: name a delivery option and get a payment secret back.
 *
 * The rate is sent by id. What it costs, and therefore what the card is
 * charged, is decided on the server.
 */
export async function preparePayment(
  clientToken: string,
  rateId: string,
  email: string,
): Promise<Result<PreparedPayment>> {
  try {
    const response = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientToken, rateId, email }),
    })

    const body = (await response.json().catch(() => null)) as
      | (Partial<PreparedPayment> & { ok?: boolean; message?: string })
      | null

    if (response.ok && body?.ok && body.clientSecret) {
      return { ok: true, data: body as PreparedPayment }
    }
    return { ok: false, message: body?.message || GENERIC_ERROR }
  } catch {
    return { ok: false, message: GENERIC_ERROR }
  }
}

/** Reads back an order once the payment has gone through. */
export async function fetchOrder(paymentIntentId: string): Promise<OrderSummary | null> {
  try {
    const response = await fetch(
      `/api/order?payment_intent=${encodeURIComponent(paymentIntentId)}`,
    )
    if (!response.ok) return null

    const body = (await response.json()) as { ok?: boolean; order?: OrderSummary }
    return body?.ok && body.order ? body.order : null
  } catch {
    return null
  }
}
