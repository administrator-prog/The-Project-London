import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Prose } from '@/components/ui/Prose'
import { returnsPolicy } from '@/data/policies'

export default function Returns() {
  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        title={'Returns & Exchanges'}
        size="sm"
        description="Fourteen days from the day it arrives, unworn and with its tags."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Returns & Exchanges' }]}
      />
      <Container>
        <Prose blocks={returnsPolicy} />
      </Container>
    </div>
  )
}
