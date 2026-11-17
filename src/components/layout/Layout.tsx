import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { ScrollToTop } from './ScrollToTop'
import { CookieBanner, PixelPageViews } from './CookieBanner'
import { WelcomeOffer } from './WelcomeOffer'
import { PageTransition } from '@/components/ui/PageTransition'

/** Routes whose top of page is a dark, full-bleed hero behind the nav. */
const HERO_ROUTES = ['/']

export function Layout() {
  const location = useLocation()
  const heroMode = HERO_ROUTES.includes(location.pathname)

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header heroMode={heroMode} />

      <div className="flex-1">
        {/* Offset the fixed header on pages without a full-bleed hero. */}
        {!heroMode && <div aria-hidden className="h-20" />}
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <FrozenOutlet />
          </PageTransition>
        </AnimatePresence>
      </div>

      <Footer />
      <CookieBanner />
      <PixelPageViews />
      <WelcomeOffer />
    </div>
  )
}

/**
 * The page as it was when this transition mounted.
 *
 * A plain <Outlet /> inside AnimatePresence renders the *new* route in the
 * page that is fading out, so every navigation mounted the incoming page
 * twice: once in the exiting wrapper, once in the entering one. Checkout
 * opened two orders and sent InitiateCheckout twice; product pages sent
 * ViewContent twice. Holding on to the element captured at mount keeps the
 * exiting page showing what it showed, and the new one mounts once.
 */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}
