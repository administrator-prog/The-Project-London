import { isSameOrigin, passwordMatches } from '../../lib/access'
import { adminCookie, adminSecret, createAdminToken } from '../../lib/admin'
import { clientKey, createRateLimiter } from '../../lib/rate-limit'

export const config = { runtime: 'edge' }

/**
 * Signs in to /admin.
 *
 * A separate cookie from the site wall's, even when it is the same password:
 * whoever holds an admin session can read every customer's address, and that
 * should be revocable on its own.
 *
 * Rate limited harder than the site gate. There is one password and it is
 * worth more.
 */

const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 })

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!isSameOrigin(request)) return json({ ok: false, error: 'bad_origin' }, 403)

  const secret = adminSecret()
  if (!secret) {
    console.error('Neither ADMIN_PASSWORD nor WEBSITE_ACCESS is set')
    return json({ ok: false, error: 'not_configured' }, 500)
  }

  if (limiter.check(clientKey(request))) {
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
    return json({ ok: false, error: 'wrong_password' }, 401)
  }

  return json({ ok: true }, 200, { 'Set-Cookie': adminCookie(await createAdminToken(secret)) })
}
