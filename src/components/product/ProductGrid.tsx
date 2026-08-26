import type { Product } from '@/types'
import { cn } from '@/lib/utils'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  className?: string
  /** Columns at the largest breakpoint. */
  columns?: 2 | 3
}

export function ProductGrid({ products, className, columns = 2 }: ProductGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 md:gap-x-8',
        columns === 3 && 'lg:grid-cols-3',
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  )
}
