import { isSameOrigin } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'

export const config = { runtime: 'edge' }

/**
 * Forwards interest-list signups from the gate page to the LeadConnector
 * inbound webhook.
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

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const ip = clientKey(request)
  if (limiter.check(ip)) {
    return json({ ok: false, error: 'rate_limited' }, 429, { 'Retry-After': '600' })
  }

  let name = ''
  let email = ''
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown }
    if (typeof body?.name === 'string') name = body.name.trim().slice(0, MAX_NAME)
    if (typeof body?.email === 'string') email = body.email.trim().slice(0, MAX_EMAIL).toLowerCase()
  } catch {
    // Malformed body falls through to the validation below.
  }

  if (!name || !looksLikeEmail(email)) {
    return json({ ok: false, error: 'invalid' }, 400)
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
