import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Collection } from '@/types'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface CollectionCardProps {
  collection: Collection
  index?: number
  /** Taller portrait ratio for featured placements. */
  tall?: boolean
}

export function CollectionCard({ collection, index = 0, tall = false }: CollectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: index * 0.08 }}
    >
      <Link
        to={collection.href}
        className="group relative block overflow-hidden bg-sand"
      >
        <div className={cn('relative w-full overflow-hidden', tall ? 'aspect-[3/4]' : 'aspect-[4/5]')}>
          <img
            src={collection.image}
            alt={collection.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent opacity-90 transition-opacity duration-700 group-hover:opacity-100" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-7">
          <div>
            <span className="label-sm text-bone/70">
              {collection.itemCount} Pieces
            </span>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-bone md:text-4xl">
              {collection.title}
            </h3>
            <p className="mt-1 text-sm text-bone/70">{collection.subtitle}</p>
          </div>
          <span className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bone/40 text-bone transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-bone group-hover:text-ink">
            <ArrowRight
              size={18}
              strokeWidth={1.5}
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
