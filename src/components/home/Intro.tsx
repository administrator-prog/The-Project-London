import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '@/data/images'
import { EASE_OUT_EXPO } from '@/lib/motion'

/**
 * A one-time entrance. The wordmark settles, a hairline draws across, then the
 * panel lifts like a curtain to reveal the film. Plays once per session so it
 * stays a moment, never a chore.
 */
export function Intro() {
  const [done, setDone] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('tpl-intro') === 'seen',
  )

  useEffect(() => {
    if (done) return
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      sessionStorage.setItem('tpl-intro', 'seen')
      setDone(true)
    }, 2100)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [done])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink"
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO }}
          onAnimationComplete={() => {
            document.body.style.overflow = ''
          }}
        >
          <motion.img
            src={BRAND.logoLight}
            alt="The Project London"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.15 }}
            className="h-8 w-auto md:h-11"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, ease: EASE_OUT_EXPO, delay: 0.5 }}
            className="mt-8 h-px w-40 origin-left bg-bone/30"
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-6 label-sm text-bone/40"
          >
            Volume 04 — Winter
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
