import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { MEDIA } from '@/data/images'
import { hero } from '@/data/home'
import { EASE_OUT_EXPO } from '@/lib/motion'

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.14])
  const overlay = useTransform(scrollYProgress, [0, 1], [0.08, 0.28])
  const ctaY = useTransform(scrollYProgress, [0, 1], ['0%', '-28%'])
  const ctaOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

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

      {/* Call to action */}
      <motion.div
        style={{ y: ctaY, opacity: ctaOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-[100rem] flex-col justify-end px-gutter pb-16 md:pb-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.4 }}
        >
          <Link to={hero.cta.href} className="group inline-flex items-center gap-3 label-lg text-bone">
            <span className="border-b border-bone/50 pb-2.5 transition-colors duration-500 group-hover:border-bone">
              {hero.cta.label}
            </span>
            <ArrowRight
              size={18}
              strokeWidth={1.25}
              className="mb-2.5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
            />
          </Link>
        </motion.div>
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
