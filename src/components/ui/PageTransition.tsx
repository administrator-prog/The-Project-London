import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE_OUT_EXPO } from '@/lib/motion'

/** A soft fade/rise applied to each page on mount for gentle route transitions. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.main>
  )
}
