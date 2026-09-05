import type Stripe from 'stripe'

/** A line as the browser is allowed to describe it: no prices, ever. */
export interface CheckoutLine {
  productId: string
  size: string
  quantity: number
}

export type ShippingZone = 'uk' | 'international'

/** What place_order() hands back once it has priced the bag itself. */
export interface PlacedOrder {
  id: string
  reference: string
  currency: string
  subtotalPence: number
  shippingZone: ShippingZone
  items: PlacedItem[]
}

export interface PlacedItem {
  productId: string
  productName: string
  size: string
  quantity: number
  unitPricePence: number
}

export const MAX_PER_LINE = 9
export const MAX_LINES = 20

/**
 * Where the international rate applies.
 *
 * Stripe validates the address against this list before it will take a card,
 * so anywhere missing here simply cannot check out. Edit freely — it is a
 * commercial decision, not a technical one. GB is deliberately absent: a UK
 * address belongs on the UK session, which has the free and next-day rates.
 */
export const INTERNATIONAL_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  [
    'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
    'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'JP', 'KR', 'LI', 'LT',
    'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RO', 'SE', 'SG',
    'SI', 'SK', 'US', 'AE', 'HK', 'QA', 'SA', 'KW', 'BH', 'OM', 'IL', 'ZA',
    'MY', 'MX',
  ]

export const UK_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ['GB']

export function isShippingZone(value: unknown): value is ShippingZone {
  return value === 'uk' || value === 'international'
}

/**
 * Pulls the bag out of a request body without trusting any of it. Anything
 * malformed is dropped rather than corrected — place_order() will reject an
 * empty list, and a silently "fixed" line is worse than a refused one.
 */
export function parseLines(input: unknown): CheckoutLine[] {
  if (!Array.isArray(input)) return []

  return input.flatMap<CheckoutLine>((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const { productId, size, quantity } = raw as Record<string, unknown>

    if (typeof productId !== 'string' || !productId) return []
    if (typeof size !== 'string' || !size) return []
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) return []
    if (quantity < 1 || quantity > MAX_PER_LINE) return []

    return [{ productId: productId.slice(0, 64), size: size.slice(0, 16), quantity }]
  })
}

/** The message place_order() raises, split into a code and its detail. */
export function orderError(message: string | undefined) {
  const [code, ...detail] = (message ?? '').trim().split(':')
  return { code: code || 'unknown', detail }
}

/**
 * Maps a Postgres-side refusal onto something the bag page can say out loud.
 * Anything unrecognised stays vague on purpose — an internal message is not
 * copy, and shipping one to a customer is how stack traces end up in
 * screenshots.
 */
export function checkoutMessage(code: string, detail: string[]): string {
  switch (code) {
    case 'insufficient_stock': {
      const [, size, left] = detail
      const remaining = Number(left)
      if (Number.isFinite(remaining) && remaining > 0) {
        return `Only ${remaining} left in size ${size}. Please adjust your bag.`
      }
      return `Size ${size} has just sold out. Please adjust your bag.`
    }
    case 'unknown_product':
    case 'unknown_size':
      return 'One of the pieces in your bag is no longer available.'
    case 'empty_bag':
      return 'Your bag is empty.'
    case 'invalid_quantity':
    case 'duplicate_line':
    case 'too_many_lines':
    case 'invalid_line':
      return 'Something is wrong with your bag. Please empty it and try again.'
    default:
      return 'We could not start checkout. Please try again in a moment.'
  }
}
