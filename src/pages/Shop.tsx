import { useParams } from 'react-router-dom'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductGrid } from '@/components/product/ProductGrid'
import { products } from '@/data/products'

const filters = ['All', 'Outerwear', 'Knitwear', 'Tailoring', 'Essentials', 'Shirting']

/**
 * Collection listing page. Reused for every /collections/:slug route — the
 * slug simply becomes the display title. Filtering UI is presentational for now.
 */
export default function Shop() {
  const { slug } = useParams()
  const title = slug
    ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'All Pieces'

  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        eyebrow="Collection"
        title={title}
        description="A tightly edited selection — considered fabrications, timeless cuts, built to stay in rotation."
        crumbs={[{ label: 'Home', to: '/' }, { label: title }]}
      />

      {/* Filter / sort bar */}
      <Container className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
          <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto">
            {filters.map((f, i) => (
              <button
                key={f}
                className={
                  'shrink-0 rounded-full px-4 py-2 label-sm transition-colors duration-300 ' +
                  (i === 0
                    ? 'bg-ink text-bone'
                    : 'text-fog hover:bg-sand hover:text-ink')
                }
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden items-center gap-2 label-sm text-ink sm:flex">
              <SlidersHorizontal size={14} strokeWidth={1.5} /> Filter
            </button>
            <button className="flex items-center gap-1.5 label-sm text-ink">
              Sort <ChevronDown size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <p className="mt-4 label-sm text-ash">{products.length} Products</p>
      </Container>

      <Container>
        <ProductGrid products={products} />
      </Container>
    </div>
  )
}
