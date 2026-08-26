import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Product } from '@/types'
import { formatPrice, cn } from '@/lib/utils'
import { sized } from '@/data/images'
import { EASE_OUT_EXPO } from '@/lib/motion'

interface ProductCardProps {
  product: Product
  /** Index within a grid — used to offset reveal timing. */
  index?: number
  priority?: boolean
}

/** Image, name, price. Nothing else — the collection is two pieces long. */
export function ProductCard({ product, index = 0, priority = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false)

  const href = `/products/${product.id}`
  const [rest, hover = rest] = product.images

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: (index % 2) * 0.08 }}
      className="flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={href} aria-label={product.name} className="relative block aspect-[3/4] overflow-hidden bg-sand">
        <img
          src={sized(rest, 900)}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            hovered ? 'scale-105 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <img
          src={sized(hover, 900)}
          alt=""
          aria-hidden
          loading="lazy"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            hovered ? 'scale-100 opacity-100' : 'scale-110 opacity-0',
          )}
        />
        {product.soldOut && (
          <span className="absolute left-3 top-3 bg-paper/90 px-2.5 py-1 label-sm text-fog">
            Sold Out
          </span>
        )}
      </Link>

      <div className="flex items-baseline justify-between gap-4 pt-5">
        <h3 className="font-serif text-xl text-ink md:text-2xl">
          <Link to={href} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <span className="shrink-0 text-sm text-fog">{formatPrice(product.price)}</span>
      </div>
    </motion.article>
  )
}
