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

const PUBLIC_PATHS = new Set(['/access', '/access.html', '/api/verify-access', '/favicon.svg'])

export const config = {
  matcher: ['/((?!api/verify-access|access\\.html|favicon\\.svg).*)'],
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

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const { pathname } = url

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
