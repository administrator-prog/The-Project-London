/**
 * Where this visitor came from, kept until they order.
 *
 * The adverts tag every link with utm_source, utm_medium, utm_campaign and
 * utm_content, and Meta adds an fbclid. Those are on the landing URL only;
 * the first click inside the site loses them. So they are read once, when the
 * page loads, kept in localStorage for 30 days, and sent with the payment so
 * the order records which campaign and which ad brought it in. That works
 * independently of Meta's own reporting.
 *
 * The most recent tagged visit wins: someone who first came from a
 * newsletter and later bought from an advert is credited to the advert.
 *
 * It follows the cookie choice: nothing is kept after "Essential only".
 */

const KEY = 'tpl.attribution.v1'
/** Mirrors CONSENT_KEY in lib/pixel.ts. Read directly to keep the two modules apart. */
const CONSENT_KEY = 'tpl.consent.v1'
const KEEP_FOR_MS = 30 * 24 * 60 * 60 * 1000

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  /** The ad click carried an fbclid. The id itself is Meta's business, not ours. */
  fbclid?: boolean
  landing_path?: string
  referrer?: string
  captured_at: string
}

const AD_SOURCES = /^(facebook|fb|instagram|ig|meta)$/i

const initial = typeof window === 'undefined' ? null : new URL(window.location.href)

/**
 * Whether this page load began on a link from a Meta advert. Fixed at load:
 * moving around the site afterwards does not change how the visit started.
 */
export const landedFromAd: boolean = (() => {
  if (!initial) return false
  const params = initial.searchParams
  return params.has('fbclid') || AD_SOURCES.test(params.get('utm_source') ?? '')
})()

/** The path this page load began on. */
export const landingPath: string | null = initial?.pathname ?? null

function optedOut() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'denied'
  } catch {
    return false
  }
}

const clean = (value: string | null) => value?.trim().slice(0, 150) || undefined

function capture() {
  if (!initial || optedOut()) return
  const params = initial.searchParams

  const found: Attribution = { captured_at: new Date().toISOString() }
  for (const key of UTM_KEYS) {
    const value = clean(params.get(key))
    if (value) found[key] = value
  }
  if (params.has('fbclid')) found.fbclid = true

  const tagged = UTM_KEYS.some((key) => found[key]) || found.fbclid
  if (!tagged) return

  found.landing_path = initial.pathname.slice(0, 150)
  const referrer = clean(document.referrer ? new URL(document.referrer).hostname : null)
  if (referrer && referrer !== initial.hostname) found.referrer = referrer

  try {
    localStorage.setItem(KEY, JSON.stringify(found))
  } catch {
    /* Private browsing: this order simply goes unattributed. */
  }
}

capture()

/** The last tagged visit within 30 days, or null. */
export function savedAttribution(): Attribution | null {
  if (optedOut()) return null
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Attribution | null
    if (!parsed?.captured_at) return null
    if (Date.now() - Date.parse(parsed.captured_at) > KEEP_FOR_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function forgetAttribution() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* Nothing to forget. */
  }
}
