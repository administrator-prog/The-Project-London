import { useSyncExternalStore } from 'react'

/**
 * The Meta Pixel, on unless the visitor opts out.
 *
 * It loads on the first page, before the cookie banner is answered, so the
 * landing page and an ad's fbclid are captured. "Essential Only" turns it
 * off and takes back its cookies. This is opt-out, not the opt-in consent
 * PECR asks of advertising cookies — a deliberate choice, made knowingly.
 * Every call into here is safe to make regardless — after an opt-out it
 * simply does nothing, so the pages that fire events never need to ask first.
 *
 * Mirrors META_PIXEL_ID in lib/meta.ts, which sends the server-side copy of
 * Purchase. The id is public by design; it is in every page that runs a pixel.
 */

export const META_PIXEL_ID = '1611370797407799'

const CONSENT_KEY = 'tpl.consent.v1'
const PURCHASED_KEY = 'tpl.pixel.purchased.v1'
const MATCH_KEY = 'tpl.pixel.match.v1'

export type Consent = 'granted' | 'denied'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: Fbq
  loaded: boolean
  version: string
  disablePushState?: boolean
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

/* ---- Consent ----------------------------------------------------------- */

const listeners = new Set<() => void>()

function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

let consent: Consent | null = readConsent()

export function setConsent(value: Consent | null) {
  consent = value
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value)
    else localStorage.removeItem(CONSENT_KEY)
  } catch {
    /* Private browsing — the choice lasts as long as the tab. */
  }

  if (value === 'denied') {
    // Already loaded: tell it to stop, and take back the
    // cookies it set, rather than wait for the next page load.
    window.fbq?.('consent', 'revoke')
    try {
      localStorage.removeItem(MATCH_KEY)
    } catch {
      /* Nothing stored. */
    }
    for (const name of ['_fbp', '_fbc']) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${location.hostname}`
      document.cookie = `${name}=; Max-Age=0; Path=/`
    }
  } else if (window.fbq) {
    window.fbq('consent', 'grant')
  }

  listeners.forEach((listener) => listener())
}

/** The visitor's choice, or null while they have not made one. */
export function useConsent(): Consent | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => consent,
  )
}

/* ---- The pixel ---------------------------------------------------------- */

/**
 * Meta's base code, as a function rather than a <script> in index.html, so it
 * runs only while the visitor has not opted out. Calls made before fbevents.js
 * arrives are queued by the stub and replayed when it does.
 */
function load(): Fbq {
  if (window.fbq) return window.fbq

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  // This is a single-page app, and PageView is sent on every route change by
  // PixelPageViews. Left on, the pixel would also send one for each
  // history.pushState and every navigation would count twice.
  fbq.disablePushState = true

  window.fbq = fbq
  window._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  // Off: Meta's automatic events would report every button press as a
  // SubscribedButtonClick, burying the six events this site sends on purpose.
  fbq('set', 'autoConfig', false, META_PIXEL_ID)
  const match = storedMatch()
  if (match) fbq('init', META_PIXEL_ID, match)
  else fbq('init', META_PIXEL_ID)
  return fbq
}

type StandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  // The welcome popup's signup — what an email-capture campaign optimises for.
  | 'Lead'

export interface EventParams {
  content_ids: string[]
  content_name?: string
  content_type: 'product'
  contents?: { id: string; quantity: number; item_price?: number }[]
  num_items?: number
  value: number
  currency: string
}

/* ---- Advanced matching ------------------------------------------------- */

/**
 * The visitor's email, hashed, for Meta's advanced matching.
 *
 * Once someone gives an address (the welcome popup, the checkout email field,
 * the confirmation page), every later event from this browser carries its
 * SHA-256, which lets Meta tie the visit to an account and lifts the event
 * match quality. Only the hash is kept, never the address, and an opt-out
 * deletes it along with the cookies.
 */
type Match = { em: string }

function storedMatch(): Match | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(MATCH_KEY) ?? 'null') as Match | null
    return parsed && /^[0-9a-f]{64}$/.test(parsed.em) ? parsed : null
  } catch {
    return null
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hands Meta the hashed email for this browser. Safe to call often: it does
 * nothing after an opt-out, for an invalid address, or for the address it
 * already has. Never throws.
 */
export async function identify(email: string | null | undefined): Promise<void> {
  try {
    const normalised = email?.trim().toLowerCase() ?? ''
    if (!allowed() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalised)) return
    const em = await sha256(normalised)
    if (storedMatch()?.em === em) return
    try {
      localStorage.setItem(MATCH_KEY, JSON.stringify({ em }))
    } catch {
      /* Matched for this page load only. */
    }
    // Re-initialising with user data updates the pixel already running;
    // it is keyed by id, so no event is sent twice.
    if (window.fbq) window.fbq('init', META_PIXEL_ID, { em })
  } catch {
    /* No matching is the right failure. */
  }
}

/** Whether the pixel may run: always, until the visitor opts out. */
const allowed = () => consent !== 'denied'

/** Sends one event, or nothing at all after an opt-out. */
export function track(event: StandardEvent, params?: EventParams, eventId?: string) {
  if (!allowed()) return false
  const fbq = load()
  if (eventId) fbq('track', event, params ?? {}, { eventID: eventId })
  else if (params) fbq('track', event, params)
  else fbq('track', event)
  return true
}

/**
 * The id Purchase is sent under, in the browser and from the server both.
 * Meta keeps one of any pair that share it, so the order counts once however
 * many times it is reported.
 */
export const purchaseEventId = (reference: string) => `purchase.${reference}`

/**
 * Purchase, at most once per order from this browser. A refresh of the
 * confirmation page or a return to it from history finds the reference
 * already recorded and sends nothing; the shared event id is the second line
 * of defence where storage is unavailable.
 */
export function trackPurchase(reference: string, params: EventParams) {
  let sent: string[] = []
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PURCHASED_KEY) ?? '[]')
    if (Array.isArray(parsed)) sent = parsed.filter((r): r is string => typeof r === 'string')
  } catch {
    /* Unreadable — fall back on Meta's deduplication. */
  }
  if (sent.includes(reference)) return

  if (!track('Purchase', params, purchaseEventId(reference))) return

  try {
    localStorage.setItem(PURCHASED_KEY, JSON.stringify([...sent, reference].slice(-20)))
  } catch {
    /* As above. */
  }
}

/**
 * What the server needs to send its own copy of Purchase: whether it may at
 * all, and the two first-party cookies that let Meta tie that copy back to
 * this browser and to the ad that was clicked.
 */
export interface AdTracking {
  consent: boolean
  fbp?: string
  fbc?: string
}

export function adTracking(): AdTracking {
  if (!allowed()) return { consent: false }
  const cookie = (name: string) =>
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1)
  return { consent: true, fbp: cookie('_fbp'), fbc: cookie('_fbc') }
}
