import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Prose } from '@/components/ui/Prose'
import { Reveal } from '@/components/ui/Reveal'
import { SizeTable } from '@/components/ui/SizeTable'
import { sizeGuideNotes } from '@/data/policies'

export default function SizeGuide() {
  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        title={'Size Guide'}
        size="sm"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Size Guide' }]}
      />

      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <SizeTable />
          </Reveal>

          <div className="mt-14">
            <Prose blocks={sizeGuideNotes} />
          </div>
        </div>
      </Container>
    </div>
  )
}
