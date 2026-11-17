import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { setConsent, track, useConsent } from '@/lib/pixel'
import { forgetAttribution } from '@/lib/attribution'
import { usePublishedInset } from '@/lib/insets'

/**
 * The cookie question, asked once and remembered.
 *
 * The Meta Pixel is already running when this appears (see lib/pixel.ts), so
 * the copy says so. "Essential Only" is the opt-out, and it is styled exactly
 * like "Accept All", side by side, as UK guidance expects. The footer's
 * "Cookie settings" clears the choice, which brings this back.
 *
 * On a phone it is a short bar: one sentence and the two buttons, well under
 * a quarter of the screen. It publishes its height (lib/insets.ts) so the
 * sticky Add to Bag bar sits above it rather than under it.
 */
export function CookieBanner() {
  const consent = useConsent()
  const { pathname } = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const hidden = pathname.startsWith('/admin')
  const open = consent === null && !hidden

  usePublishedInset('--inset-cookie', ref, open)

  const button =
    'h-10 border-bone/40 px-4 text-bone hover:border-bone hover:bg-bone hover:text-ink md:h-9'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="region"
          aria-label="Cookie consent"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="fixed inset-x-0 bottom-0 z-50 bg-ink text-bone"
        >
          <Container className="flex flex-col gap-3 py-3.5 md:flex-row md:items-center md:justify-between md:gap-10 md:py-6">
            <p className="max-w-2xl text-xs leading-relaxed text-bone/80 md:text-sm">
              <span className="md:hidden">
                We use Meta cookies to see which of our adverts bring you here.
              </span>
              <span className="hidden md:inline">
                We use cookies from Meta to understand which of our Instagram and
                Facebook adverts bring you here. Choose Essential Only to turn them
                off. Essential cookies that keep your bag and checkout working are
                always on.
              </span>
            </p>
            <div className="grid shrink-0 grid-cols-2 gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                className={button}
                onClick={() => {
                  setConsent('denied')
                  forgetAttribution()
                }}
              >
                Essential Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={button}
                onClick={() => setConsent('granted')}
              >
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
 * in lib/pixel.ts, so this is the only thing sending it. It runs from the
 * first page, and stops after an opt-out.
 */
export function PixelPageViews() {
  const consent = useConsent()
  const { pathname } = useLocation()

  useEffect(() => {
    if (consent === 'denied' || pathname.startsWith('/admin')) return
    track('PageView')
  }, [consent, pathname])

  return null
}
