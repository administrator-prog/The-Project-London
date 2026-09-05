import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Accordion } from '@/components/ui/Accordion'
import { Reveal } from '@/components/ui/Reveal'
import { CONTACT_EMAIL, faqs } from '@/data/policies'

export default function FAQ() {
  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        title={'Frequently Asked'}
        size="sm"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]}
      />

      <Container>
        <div className="max-w-2xl">
          {faqs.map((group, i) => (
            <Reveal key={group.heading} className={i > 0 ? 'mt-14' : ''}>
              <h2 className="label-sm mb-4 text-ash">{group.heading}</h2>
              <Accordion items={group.items} />
            </Reveal>
          ))}

          <Reveal className="mt-16">
            <p className="text-[0.95rem] leading-relaxed text-fog">
              Anything else, write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink link-underline">
                {CONTACT_EMAIL}
              </a>
              . We read every one.
            </p>
          </Reveal>
        </div>
      </Container>
    </div>
  )
}
