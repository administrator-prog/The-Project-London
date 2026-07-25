/**
 * Shared access-token helpers for the password wall.
 *
 * Used by both `middleware.ts` (verifies the cookie) and
 * `api/verify-access.ts` (issues it). Web Crypto only, so it runs unchanged on
 * the Edge runtime.
 *
 * The cookie holds `<expiry>.<signature>` rather than the password itself, so
 * the secret never travels to the browser and a stolen cookie expires on its
 * own. The signature is keyed on WEBSITE_ACCESS — changing the password
 * therefore invalidates every outstanding session, which is the behaviour you
 * want when you rotate it.
 */

export const COOKIE_NAME = 'tpl_access'
export const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

const encoder = new TextEncoder()

/** Constant-time byte comparison — no early exit on first mismatch. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/**
 * Timing-safe password check.
 *
 * Both sides are hashed first so the comparison always runs over 32 equal
 * bytes — that hides the password's length as well as the position of the
 * first differing character.
 */
export async function passwordMatches(submitted: string, secret: string) {
  const [a, b] = await Promise.all([sha256(submitted), sha256(secret)])
  return constantTimeEqual(a, b)
}

/** Mints `<expiresAtMs>.<signature>` for the session cookie. */
export async function createToken(secret: string) {
  const expiresAt = String(Date.now() + MAX_AGE_SECONDS * 1000)
  return `${expiresAt}.${toBase64Url(await hmac(expiresAt, secret))}`
}

/** True only for an unexpired token whose signature we produced. */
export async function verifyToken(token: string | undefined, secret: string) {
  if (!token) return false

  const separator = token.lastIndexOf('.')
  if (separator < 1) return false

  const expiresAt = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false

  const expected = toBase64Url(await hmac(expiresAt, secret))
  return constantTimeEqual(encoder.encode(signature), encoder.encode(expected))
}

/**
 * The host the request actually arrived on.
 *
 * Vercel puts the public hostname in `x-forwarded-host`, which is what makes
 * this work identically on project.vercel.app, a preview deployment, and a
 * custom domain added later — nothing is hardcoded.
 */
export function requestHost(request: Request) {
  return (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host
  )
}

/**
 * True when the request came from a page on this same deployment.
 *
 * Browsers always send `Origin` on a cross-origin-capable POST, so a missing
 * or mismatched one means the request did not originate from our own gate —
 * which is what stops another site from posting password guesses on a
 * visitor's behalf.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    return new URL(origin).host === requestHost(request)
  } catch {
    return false
  }
}

/** Reads one cookie out of a request's Cookie header. */
export function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie')
  if (!header) return undefined

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}
