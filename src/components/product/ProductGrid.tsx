import type { Product } from '@/types'
import { cn } from '@/lib/utils'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  className?: string
  /** Columns at the largest breakpoint. */
  columns?: 3 | 4
}

export function ProductGrid({ products, className, columns = 4 }: ProductGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:gap-y-14',
        columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  )
}
