import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { chapter } from '@/data/home'
import { Reveal, TextReveal } from '@/components/ui/Reveal'

/** A full-height "In motion" chapter. `image` sets the background feature. */
export function ChapterFilm({ image }: { image: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  return (
    <section ref={ref} className="relative flex h-[100svh] min-h-[600px] items-end overflow-hidden bg-ink">
      <motion.img
        style={{ y, scale: 1.16 }}
        src={image}
        alt="The Project London — Volume 04"
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-gutter pb-16 md:pb-24">
        <h2 className="text-display font-serif font-medium text-bone">
          <TextReveal text={chapter.title} />
        </h2>
        <Reveal delay={0.15}>
          <Link to={chapter.cta.href} className="group mt-8 inline-flex items-center gap-2 label text-bone">
            <span className="link-underline pb-1">{chapter.cta.label}</span>
            <ArrowUpRight size={15} strokeWidth={1.5} className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
