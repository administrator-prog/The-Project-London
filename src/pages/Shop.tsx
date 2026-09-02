import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductGrid } from '@/components/product/ProductGrid'
import { products } from '@/data/products'

/** The collection — two pieces, no filtering to do. */
export default function Shop() {
  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        title={'Shop'}
        size="sm"
        description="Two pieces, considered down to the smallest detail — from the silhouette to the finishing touches."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Shop' }]}
      />

      <Container>
        <ProductGrid products={products} columns={2} />
      </Container>
    </div>
  )
}
