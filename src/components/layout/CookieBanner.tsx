import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { setConsent, track, useConsent } from '@/lib/pixel'

/**
 * The cookie question, asked once and remembered.
 *
 * "Accept Essential" is the refusal, worded as a choice, and it carries equal
 * weight beside "Accept All" — the ICO's position is that refusing should be
 * as easy as agreeing, so it must not be demoted to a link in the copy. Until one is chosen nothing
 * from Meta loads. The footer's "Cookie settings" clears the choice, which
 * brings this back.
 */
export function CookieBanner() {
  const consent = useConsent()
  const { pathname } = useLocation()

  // The order book is not somewhere to ask, or to track.
  if (pathname.startsWith('/admin')) return null

  return (
    <AnimatePresence>
      {consent === null && (
        <motion.div
          role="region"
          aria-label="Cookie consent"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="fixed inset-x-0 bottom-0 z-50 bg-ink text-bone"
        >
          <Container className="flex flex-col gap-5 py-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <p className="max-w-2xl text-sm leading-relaxed text-bone/80">
              We would like to use cookies from Meta to understand which of our
              Instagram and Facebook adverts bring you here. They are only set if
              you accept. Essential cookies that keep your bag and checkout working
              are always on.
            </p>
            <div className="grid shrink-0 grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-bone/30 text-bone hover:border-bone hover:bg-bone hover:text-ink"
                onClick={() => setConsent('denied')}
              >
                Accept Essential
              </Button>
              <Button variant="light" size="sm" onClick={() => setConsent('granted')}>
                Accept All
              </Button>
            </div>
          </Container>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * PageView, once per route. The pixel's own history tracking is switched off
 * in lib/pixel.ts, so this is the only thing sending it. Depending on consent
 * as well as the path means the page the visitor accepted on is counted too.
 */
export function PixelPageViews() {
  const consent = useConsent()
  const { pathname } = useLocation()

  useEffect(() => {
    if (consent !== 'granted' || pathname.startsWith('/admin')) return
    track('PageView')
  }, [consent, pathname])

  return null
}
