import { isSameOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'

export const config = { runtime: 'edge' }

/**
 * Forwards interest-list signups from the gate page to the LeadConnector
 * inbound webhook, minus the ones that fail the bot checks below.
 *
 * Proxied server-side rather than posted from the browser: it sidesteps CORS,
 * and it keeps the webhook URL off a page that anyone on the internet can
 * read, which would otherwise be an open invitation to flood the CRM.
 *
 * Override the target with LEADCONNECTOR_WEBHOOK_URL if the workflow is ever
 * rebuilt; the fallback is the current one.
 */
const DEFAULT_WEBHOOK =
  'https://services.leadconnectorhq.com/hooks/QMxiKfnC5Ebsz9c8WzIe/webhook-trigger/eb09b982-87f9-4c60-ab61-1937132441dc'

const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 })

const MAX_NAME = 120
const MAX_EMAIL = 254

/**
 * Shortest time a person plausibly spends on the form. Typing a name and an
 * email takes seconds even for a fast typist on a phone with autofill; scripts
 * submit the moment the page parses.
 */
const MIN_FILL_MS = 1500

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

/** Deliberately permissive — the CRM is the authority on deliverability. */
function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

/**
 * A link or markup in the name field. People type their name here; the only
 * things that paste a URL into it are the link-stuffing spam scripts.
 */
function looksLikeSpam(name: string) {
  return /https?:\/\/|www\.|\[url|<a\s|[<>]/i.test(name)
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const ip = clientKey(request)
  if (limiter.check(ip)) {
    return json({ ok: false, error: 'rate_limited' }, 429, { 'Retry-After': '600' })
  }

  let name = ''
  let email = ''
  let trap = ''
  let elapsed: number | undefined
  try {
    const body = (await request.json()) as {
      name?: unknown
      email?: unknown
      reference?: unknown
      elapsed?: unknown
    }
    if (typeof body?.name === 'string') name = body.name.trim().slice(0, MAX_NAME)
    if (typeof body?.email === 'string') email = body.email.trim().slice(0, MAX_EMAIL).toLowerCase()
    if (typeof body?.reference === 'string') trap = body.reference.trim()
    if (typeof body?.elapsed === 'number' && Number.isFinite(body.elapsed)) elapsed = body.elapsed
  } catch {
    // Malformed body falls through to the validation below.
  }

  if (!name || !looksLikeEmail(email)) {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  /*
   * Bot checks. All three answer with the same 200 a real signup gets, and
   * nothing goes to the CRM: a rejection tells whoever is scripting this which
   * check caught them, and they retune until they get through. Silence looks
   * like success, so they keep sending mail nobody reads.
   *
   * `elapsed` missing is treated as fine rather than suspicious — a visitor on
   * a cached copy of the page from before this shipped would not send it, and
   * losing a real signup is worse than passing a spam one on to the inbox.
   */
  if (trap) {
    console.warn('Dropped signup: honeypot filled', { email, trapLength: trap.length })
    return json({ ok: true }, 200)
  }

  if (elapsed !== undefined && elapsed < MIN_FILL_MS) {
    console.warn('Dropped signup: submitted too fast', { email, elapsed })
    return json({ ok: true }, 200)
  }

  if (looksLikeSpam(name)) {
    console.warn('Dropped signup: link in the name field', { email })
    return json({ ok: true }, 200)
  }

  // Split for CRMs that expect discrete name fields; `name` is sent as well so
  // the workflow can map whichever it prefers.
  const [firstName, ...rest] = name.split(/\s+/)
  const lastName = rest.join(' ')

  try {
    const response = await fetch(process.env.LEADCONNECTOR_WEBHOOK_URL || DEFAULT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        firstName,
        lastName,
        email,
        source: 'website-access-gate',
        submittedAt: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      console.error('LeadConnector webhook rejected the signup', response.status)
      return json({ ok: false, error: 'upstream' }, 502)
    }
  } catch (error) {
    console.error('LeadConnector webhook unreachable', error)
    return json({ ok: false, error: 'upstream' }, 502)
  }

  return json({ ok: true }, 200)
}
