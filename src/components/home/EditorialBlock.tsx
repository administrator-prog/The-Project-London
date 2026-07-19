import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { EditorialItem } from '@/types'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'

/**
 * An asymmetric editorial split: oversized image with a slow parallax on one
 * side, generous negative space and a text column on the other.
 */
export function EditorialBlock({ item }: { item: EditorialItem }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])
  const right = item.align === 'right'

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-16"
    >
      {/* Media — looping film when supplied, otherwise a still */}
      <div
        className={cn(
          'relative aspect-[4/5] overflow-hidden bg-sand md:col-span-7',
          right && 'md:order-2 md:col-start-6',
        )}
      >
        {item.video ? (
          <motion.video
            style={{ y: imageY, scale: 1.12 }}
            src={item.video}
            poster={item.image}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
        ) : (
          <motion.img
            style={{ y: imageY, scale: 1.12 }}
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
        )}
      </div>

      {/* Text */}
      <div
        className={cn(
          'md:col-span-4',
          right ? 'md:order-1 md:col-start-1' : 'md:col-start-9',
        )}
      >
        <Reveal className="mb-5">
          <span className="label text-ash">{item.eyebrow}</span>
        </Reveal>
        <h3 className="text-display font-serif font-semibold text-ink">
          <TextReveal text={item.title} />
        </h3>
        <Reveal delay={0.1} className="mt-6">
          <p className="max-w-md text-[0.95rem] leading-relaxed text-fog">
            {item.body}
          </p>
        </Reveal>
        <Reveal delay={0.18} className="mt-8">
          <Link
            to={item.href}
            className="group inline-flex items-center gap-2 label text-ink"
          >
            <span className="link-underline pb-1">Read the Story</span>
            <ArrowUpRight
              size={15}
              strokeWidth={1.5}
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </Reveal>
      </div>
    </div>
  )
}
