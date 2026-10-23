/**
 * The browser's half of the welcome offer.
 *
 * Two small things are remembered, in localStorage, and both are conveniences
 * rather than state anything depends on — a private window that forgets them
 * just shows the popup again, or asks for the code to be typed.
 *
 *   - what the visitor did with the popup, so it is not asked twice
 *   - a code that arrived on a link from the welcome email, so checkout can
 *     fill it in
 */

const POPUP_KEY = 'tpl.offer.popup.v1'
const CODE_KEY = 'tpl.offer.code.v1'

/** A dismissal is honoured for this long; a signup for good. */
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000

type PopupMemory = { state: 'joined' | 'dismissed'; at: number }

export function popupWanted(): boolean {
  try {
    const parsed = JSON.parse(localStorage.getItem(POPUP_KEY) ?? 'null') as PopupMemory | null
    if (!parsed) return true
    if (parsed.state === 'joined') return false
    return Date.now() - parsed.at > DISMISS_FOR_MS
  } catch {
    return true
  }
}

export function rememberPopup(state: PopupMemory['state']) {
  try {
    localStorage.setItem(POPUP_KEY, JSON.stringify({ state, at: Date.now() }))
  } catch {
    /* Private browsing — the popup may come back next visit. */
  }
}

const CODE_SHAPE = /^[A-Z0-9-]{4,32}$/

/** Picks `?offer=CODE` off the current URL, if the welcome email sent it. */
export function captureOfferCode(search: string) {
  const code = new URLSearchParams(search).get('offer')?.trim().toUpperCase()
  if (!code || !CODE_SHAPE.test(code)) return
  try {
    localStorage.setItem(CODE_KEY, code)
  } catch {
    /* Typed by hand at checkout instead. */
  }
  // The email link proves the visitor has signed up.
  rememberPopup('joined')
}

export function savedOfferCode(): string | null {
  try {
    const code = localStorage.getItem(CODE_KEY)
    return code && CODE_SHAPE.test(code) ? code : null
  } catch {
    return null
  }
}

export function forgetOfferCode() {
  try {
    localStorage.removeItem(CODE_KEY)
  } catch {
    /* Nothing to forget. */
  }
}
