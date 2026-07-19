import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { InstagramStrip } from './InstagramStrip'
import { ScrollToTop } from './ScrollToTop'
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
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </div>

      <InstagramStrip />
      <Footer />
    </div>
  )
}
