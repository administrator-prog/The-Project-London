import type { Variants } from 'framer-motion'

/** Signature easing — a soft, expensive deceleration used site-wide. */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE_OUT_EXPO },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.1, ease: EASE_OUT_EXPO } },
}

/** Stagger children — used by section wrappers. */
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

/** A word/line mask reveal for editorial headings. */
export const maskUp: Variants = {
  hidden: { y: '110%' },
  visible: {
    y: '0%',
    transition: { duration: 1, ease: EASE_OUT_EXPO },
  },
}

export const viewport = { once: true, amount: 0.2 as const }
