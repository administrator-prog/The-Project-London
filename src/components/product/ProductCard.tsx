import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import type { Product } from '@/types'
import { formatPrice, cn } from '@/lib/utils'
import { EASE_OUT_EXPO } from '@/lib/motion'

interface ProductCardProps {
  product: Product
  /** Index within a grid — used to offset reveal timing. */
  index?: number
  priority?: boolean
}

export function ProductCard({ product, index = 0, priority = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeColor, setActiveColor] = useState(0)

  const href = `/products/${product.id}`
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: (index % 4) * 0.07 }}
      className="group/card flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* — Image — */}
      <div className="relative aspect-[3/4] overflow-hidden bg-sand">
        <Link to={href} aria-label={product.name} className="block h-full w-full">
          {/* Base image */}
          <img
            src={product.image}
            alt={product.name}
            loading={priority ? 'eager' : 'lazy'}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              hovered ? 'scale-105 opacity-0' : 'scale-100 opacity-100',
            )}
          />
          {/* Hover image */}
          <img
            src={product.imageHover}
            alt=""
            aria-hidden
            loading="lazy"
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              hovered ? 'scale-100 opacity-100' : 'scale-110 opacity-0',
            )}
          />
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="bg-ink px-2.5 py-1 label-sm text-bone">New</span>
          )}
          {onSale && (
            <span className="bg-paper px-2.5 py-1 label-sm text-ink">Sale</span>
          )}
          {product.soldOut && (
            <span className="bg-paper/90 px-2.5 py-1 label-sm text-fog">Sold Out</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={() => setSaved((s) => !s)}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          className={cn(
            'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper/80 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'hover:bg-paper',
            hovered || saved ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0 md:opacity-0',
          )}
        >
          <Heart
            size={16}
            strokeWidth={1.5}
            className={cn('transition-colors', saved ? 'fill-ink text-ink' : 'text-ink')}
          />
        </button>

        {/* Quick-add — size row slides up on hover */}
        <AnimatePresence>
          {hovered && !product.soldOut && (
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              exit={{ y: '110%' }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="absolute inset-x-2 bottom-2 hidden md:block"
            >
              <div className="flex items-stretch overflow-hidden rounded-sm bg-paper/95 backdrop-blur-md shadow-[0_6px_30px_-12px_rgba(10,10,10,0.4)]">
                <span className="flex items-center px-3 label-sm text-ash">Add</span>
                <div className="flex flex-1 items-stretch justify-end">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className="flex-1 py-2.5 label-sm text-ink transition-colors duration-200 hover:bg-ink hover:text-bone"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* — Meta — */}
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="label-sm text-ash">{product.category}</span>
            <h3 className="mt-1.5 truncate font-display text-[0.95rem] font-medium text-ink">
              <Link to={href} className="link-underline">
                {product.name}
              </Link>
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-sm font-medium text-ink">
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <span className="ml-2 text-sm text-ash line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
        </div>

        {/* Colour swatches + count */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {product.colors.map((color, i) => (
              <button
                key={color.name}
                onMouseEnter={() => setActiveColor(i)}
                aria-label={color.name}
                className={cn(
                  'relative h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/10 transition-transform duration-300',
                  activeColor === i && 'scale-110',
                )}
                style={{ backgroundColor: color.hex }}
              >
                <span
                  className={cn(
                    'absolute -inset-[3px] rounded-full border border-ink transition-opacity duration-300',
                    activeColor === i ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))}
          </div>
          <span className="label-sm text-ash">
            {product.colors.length} {product.colors.length > 1 ? 'Colours' : 'Colour'}
          </span>
        </div>
      </div>
    </motion.article>
  )
}
