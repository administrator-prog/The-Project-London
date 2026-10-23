import { isSameOrigin, isSameOriginRead } from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'
import { serviceClient } from '../lib/supabase'
import { missingEnv } from '../lib/config'
import { sendEmail, welcomeEmail } from '../lib/email'
import {
  WELCOME_CONSENT,
  WELCOME_PERCENT_OFF,
  WELCOME_VALID_DAYS,
  offerEnabled,
} from '../lib/offer'

export const config = { runtime: 'edge' }

/**
 * The welcome popup.
 *
 *   GET   whether the popup should appear at all, so WELCOME_OFFER=off takes
 *         it down without a rebuild
 *   POST  an email address in, a code out — by email only
 *
 * The code is never shown on the page. Sending it is the proof the address is
 * real, which is the whole point of collecting it; a code printed on screen
 * would be handed out for any string with an @ in it.
 *
 * issue_welcome_code() gives each address one code. Asking again re-sends the
 * same one, so the popup cannot be farmed for a stack of discounts.
 */

const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 })

/** Shortest time a person plausibly spends typing an address. */
const MIN_FILL_MS = 1200

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

const SEND_FAILED = 'We could not send your code just now. Please try again in a moment.'

export default async function handler(request: Request) {
  if (request.method === 'GET') {
    if (!isSameOriginRead(request)) return json({ ok: false, error: 'bad_origin' }, 403)
    return json({ ok: true, enabled: offerEnabled() }, 200)
  }

  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  if (!offerEnabled()) {
    return json({ ok: false, error: 'disabled', message: 'This offer has ended.' }, 410)
  }

  const gaps = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  if (gaps.length > 0) {
    console.error('The welcome offer is not configured — missing', gaps.join(', '))
    return json({ ok: false, error: 'not_configured', message: SEND_FAILED }, 503)
  }

  if (limiter.check(clientKey(request))) {
    return json(
      { ok: false, error: 'rate_limited', message: 'Too many attempts. Please wait a moment.' },
      429,
      { 'Retry-After': '600' },
    )
  }

  let email = ''
  let trap = ''
  let elapsed: number | undefined
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body?.email === 'string') email = body.email.trim().slice(0, 254).toLowerCase()
    if (typeof body?.reference === 'string') trap = body.reference.trim()
    if (typeof body?.elapsed === 'number' && Number.isFinite(body.elapsed)) elapsed = body.elapsed
  } catch {
    // Malformed body falls through to the validation below.
  }

  if (!looksLikeEmail(email)) {
    return json({ ok: false, error: 'invalid', message: 'Please enter a valid email address.' }, 400)
  }

  // Bot checks answer with the same 200 a real signup gets — see api/subscribe.ts.
  if (trap || (elapsed !== undefined && elapsed < MIN_FILL_MS)) {
    console.warn('Dropped welcome signup: bot check', { email, trap: Boolean(trap), elapsed })
    return json({ ok: true }, 200)
  }

  const supabase = serviceClient()
  const { data, error } = await supabase.rpc('issue_welcome_code', {
    p_email: email,
    p_percent: WELCOME_PERCENT_OFF,
    p_valid_days: WELCOME_VALID_DAYS,
    p_consent: WELCOME_CONSENT,
  })

  if (error || !data) {
    console.error('issue_welcome_code failed', error?.message)
    return json({ ok: false, error: 'unknown', message: SEND_FAILED }, 500)
  }

  const issued = data as {
    status: 'new' | 'existing' | 'used'
    code?: string
    percentOff?: number
    expiresAt?: string
  }

  if (issued.status === 'used' || !issued.code) {
    return json(
      {
        ok: false,
        error: 'used',
        message: 'This email address has already used its welcome offer.',
      },
      409,
    )
  }

  // The link in the email brings the code with it, so checkout can fill it in.
  const origin = request.headers.get('origin') ?? new URL(request.url).origin
  const sent = await sendEmail({
    to: email,
    replyTo: process.env.ORDER_REPLY_TO || process.env.STUDIO_ORDER_EMAIL || undefined,
    ...welcomeEmail({
      code: issued.code,
      percentOff: issued.percentOff ?? WELCOME_PERCENT_OFF,
      expiresAt: issued.expiresAt ?? null,
      shopUrl: `${origin}/shop?offer=${encodeURIComponent(issued.code)}`,
    }),
  })

  // The code is kept either way; trying again re-sends the same one.
  if (!sent) return json({ ok: false, error: 'send_failed', message: SEND_FAILED }, 502)

  return json({ ok: true }, 200)
}
