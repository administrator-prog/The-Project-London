import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowDown } from 'lucide-react'
import { MEDIA } from '@/data/images'

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.14])
  const overlay = useTransform(scrollYProgress, [0, 1], [0.08, 0.28])

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-ink">
      {/* Image */}
      <motion.div style={{ y: imageY, scale }} className="absolute inset-0 will-change-transform">
        <img
          src={MEDIA.homeHero}
          alt="The Project London — Volume 04"
          className="h-full w-full object-cover"
        />
        <motion.div style={{ opacity: overlay }} className="absolute inset-0 bg-ink" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-ink/10" />
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 right-[var(--spacing-gutter)] z-10 hidden items-center gap-2 text-bone/60 md:flex"
      >
        <span className="label-sm">Scroll</span>
        <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ArrowDown size={15} strokeWidth={1.5} />
        </motion.span>
      </motion.div>
    </section>
  )
}
