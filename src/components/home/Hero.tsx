import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { MEDIA } from '@/data/images'
import { hero } from '@/data/home'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { TextReveal } from '@/components/ui/Reveal'

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.14])
  const overlay = useTransform(scrollYProgress, [0, 1], [0.28, 0.6])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-28%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-ink">
      {/* Image */}
      <motion.div style={{ y: imageY, scale }} className="absolute inset-0 will-change-transform">
        <img
          src={MEDIA.campaignFeature}
          alt="The Project London — Volume 04"
          className="h-full w-full object-cover"
        />
        <motion.div style={{ opacity: overlay }} className="absolute inset-0 bg-ink" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/25" />
      </motion.div>

      {/* Title card */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-[100rem] flex-col justify-end px-gutter pb-16 md:pb-24"
      >
        <h1 className="max-w-[15ch] text-display font-serif font-medium text-bone">
          <TextReveal text={hero.line} delay={0.1} />
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.7 }}
          className="mt-10"
        >
          <Link to={hero.cta.href} className="group inline-flex items-center gap-3 label text-bone">
            <span className="link-underline pb-1">{hero.cta.label}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/40 transition-colors duration-500 group-hover:bg-bone group-hover:text-ink">
              <ArrowRight size={15} strokeWidth={1.5} className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" />
            </span>
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
