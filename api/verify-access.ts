import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  createToken,
  isSameOrigin,
  passwordMatches,
} from '../lib/access'
import { clientKey, createRateLimiter } from '../lib/rate-limit'

export const config = { runtime: 'edge' }

const limiter = createRateLimiter({ max: 8, windowMs: 10 * 60 * 1000 })

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)

  // Only our own gate may submit guesses. Checked against the host this
  // request arrived on, so it holds on any domain this is deployed to. No CORS
  // headers are sent either, so a cross-origin caller can't read the response.
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const secret = process.env.WEBSITE_ACCESS
  if (!secret) {
    console.error('WEBSITE_ACCESS is not set')
    return json({ ok: false, error: 'not_configured' }, 500)
  }

  const ip = clientKey(request)
  if (limiter.check(ip)) {
    return json({ ok: false, error: 'rate_limited' }, 429, { 'Retry-After': '600' })
  }

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    if (typeof body?.password === 'string') password = body.password
  } catch {
    // Malformed body is treated as a wrong password.
  }

  if (!(await passwordMatches(password, secret))) {
    // Blunt tax on guessing, on top of the counter above.
    await new Promise((resolve) => setTimeout(resolve, 500))
    return json({ ok: false }, 401)
  }

  limiter.reset(ip)

  const token = await createToken(secret)
  const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : ''

  return json({ ok: true }, 200, {
    'Set-Cookie':
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`,
  })
}
