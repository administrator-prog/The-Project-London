import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { PageHeader } from '@/components/ui/PageHeader'
import { EditorialBlock } from '@/components/home/EditorialBlock'
import { CollectionCard } from '@/components/collection/CollectionCard'
import { editorial, collections } from '@/data/collections'

export default function Editorial() {
  return (
    <div className="bg-paper">
      <PageHeader
        eyebrow="The Journal"
        title={'Editorial'}
        description="Campaigns, craft notes and conversations from the studio. A slower look at what we make and why."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Editorial' }]}
      />

      <Section spacing="md">
        <Container className="space-y-28 md:space-y-40">
          {editorial.map((item) => (
            <EditorialBlock key={item.id} item={item} />
          ))}
        </Container>
      </Section>

      <Section spacing="md" className="bg-bone">
        <Container>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {collections.map((c, i) => (
              <CollectionCard key={c.id} collection={c} index={i} />
            ))}
          </div>
        </Container>
      </Section>
    </div>
  )
}
