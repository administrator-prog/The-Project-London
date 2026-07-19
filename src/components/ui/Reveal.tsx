import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE_OUT_EXPO, viewport } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Seconds of delay before the reveal begins. */
  delay?: number
  /** Vertical travel distance in px. */
  y?: number
  as?: 'div' | 'span' | 'li' | 'section'
}

/**
 * A single-element fade-and-rise reveal, triggered once when scrolled into view.
 * The default building block for the site's "Apple-quiet" motion language.
 */
export function Reveal({ children, className, delay = 0, y = 28, as = 'div' }: RevealProps) {
  const MotionTag = motion[as]
  return (
    <MotionTag
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </MotionTag>
  )
}

interface TextRevealProps {
  text: string
  className?: string
  /** Delay in seconds between each line's reveal. */
  stagger?: number
  delay?: number
}

/** Render a line, italicising any `*emphasised*` segments in serif italic. */
function renderLine(line: string) {
  return line
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('*') && part.endsWith('*') ? (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
}

/**
 * Masked line reveal for editorial headings. Pass a string with `\n` to split
 * into lines; each line rises out from behind a clip mask. Wrap a word in
 * `*asterisks*` to render it as a serif italic accent.
 *
 * Parent-driven: the wrapper owns the in-view trigger and staggers its children
 * via variants — more reliable than per-line `whileInView` (which can fail to
 * fire for clipped children that mount already inside the viewport).
 */
export function TextReveal({ text, className, stagger = 0.09, delay = 0 }: TextRevealProps) {
  const lines = text.split('\n')
  return (
    <motion.span
      className={cn('block', className)}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <motion.span
            className="block will-change-transform"
            variants={{
              hidden: { y: '115%' },
              visible: { y: '0%', transition: { duration: 1, ease: EASE_OUT_EXPO } },
            }}
          >
            {renderLine(line)}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}
