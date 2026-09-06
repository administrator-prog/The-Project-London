import { next } from '@vercel/functions'
import { COOKIE_NAME, readCookie, verifyToken } from './lib/access'

/**
 * Password wall.
 *
 * Runs before anything is served. Requests without a valid session cookie are
 * redirected to /access; everything else falls through untouched.
 *
 * Note on static assets: the usual advice is to exempt them, but this is a
 * client-rendered SPA — every page's content lives in /assets/*.js. Exempting
 * those would leave the whole site readable to anyone who skipped the gate, so
 * they are gated too. That is why /access is a standalone HTML page with no
 * imports: it has to render before any bundle is reachable.
 */

const PUBLIC_PATHS = new Set([
  '/access',
  '/access.html',
  '/api/verify-access',
  // The gate page's interest-list form posts here, so it sits outside the wall.
  '/api/subscribe',
  // Stripe posts here from its own servers with no cookie of ours. Gating it
  // would answer every delivery with a 307 to /access, and no order would ever
  // be marked paid. Its own signature check is the authentication.
  '/api/stripe-webhook',
  '/favicon.svg',
])

export const config = {
  matcher: [
    '/((?!api/verify-access|api/subscribe|api/stripe-webhook|access\\.html|favicon\\.svg).*)',
  ],
}

/**
 * Redirects with a relative Location, which the browser resolves against the
 * host it is already on. That keeps the gate correct on project.vercel.app,
 * every preview URL, and any custom domain, with no origin configured
 * anywhere. `no-store` matters too: a cached redirect would follow an
 * authenticated visitor around, or leak past the gate for an anonymous one.
 */
function redirect(location: string) {
  return new Response(null, {
    status: 307,
    headers: { Location: location, 'Cache-Control': 'no-store', Vary: 'Cookie' },
  })
}

/**
 * Launch.
 *
 * SITE_OPEN_AT is an instant — `2026-09-06T18:00:00+01:00` reads as six in the
 * evening, British time, and carries its own offset so nobody has to convert
 * anything or remember whether the clocks have gone back. Until it passes the
 * wall behaves exactly as it does now; after it, everything falls through.
 *
 * Read per request rather than at boot, so the site opens by itself at that
 * moment with nobody watching and nothing to redeploy.
 *
 * Anything unreadable keeps the site shut. A typo in a launch time must never
 * be the thing that publishes the site.
 */
function siteIsOpen(): boolean {
  const value = process.env.SITE_OPEN_AT?.trim()
  if (!value) return false

  const opensAt = Date.parse(value)
  if (Number.isNaN(opensAt)) {
    console.error('SITE_OPEN_AT is not a date I can read:', value)
    return false
  }

  return Date.now() >= opensAt
}

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const { pathname } = url

  /*
   * Checked before the secret, deliberately: once the site is open a missing
   * WEBSITE_ACCESS is no longer a misconfiguration to fail closed on, it is
   * just a variable nobody needs any more. The gate itself sends people home
   * rather than showing a password box that guards nothing.
   */
  if (siteIsOpen()) {
    if (pathname === '/access' || pathname === '/access.html') return redirect('/')
    return next()
  }

  const secret = process.env.WEBSITE_ACCESS
  // Fail closed on a missing secret, except for the gate itself — otherwise a
  // misconfigured deploy would silently publish the whole site.
  if (!secret) {
    console.error('WEBSITE_ACCESS is not set')
    if (PUBLIC_PATHS.has(pathname)) return next()
    return new Response('Site unavailable', { status: 503 })
  }

  const authenticated = await verifyToken(readCookie(request, COOKIE_NAME), secret)

  if (PUBLIC_PATHS.has(pathname)) {
    // Someone already through the gate has no reason to see it again.
    if (authenticated && (pathname === '/access' || pathname === '/access.html')) {
      return redirect('/')
    }
    return next()
  }

  if (authenticated) return next()

  // Remember where they were heading so the gate can send them back.
  const target =
    pathname === '/'
      ? '/access'
      : `/access?next=${encodeURIComponent(pathname + url.search)}`

  return redirect(target)
}
