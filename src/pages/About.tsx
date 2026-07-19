import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { PageHeader } from '@/components/ui/PageHeader'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { IMAGES } from '@/data/images'

const values = [
  { n: '01', title: 'Less, Better', body: 'We release in tightly edited chapters, not endless drops. Every piece earns its place.' },
  { n: '02', title: 'Material First', body: 'We start with the fabric — Italian wool, Japanese cotton, responsible merino — and design around it.' },
  { n: '03', title: 'Built to Last', body: 'Timeless cuts and honest construction, made to outlive the season and the trend cycle.' },
  { n: '04', title: 'Designed in London', body: 'Drawn, draped and refined by hand in our Redchurch Street studio.' },
]

export default function About() {
  return (
    <div className="bg-paper">
      <PageHeader
        eyebrow="Our Story"
        title={'A Wardrobe\nof Restraint'}
        description="The Project London is a contemporary label built on a simple idea — that the best wardrobe is a small one, made well."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
      />

      {/* Full-bleed image */}
      <Container className="mb-24 md:mb-32">
        <Reveal>
          <div className="relative aspect-[16/9] overflow-hidden bg-sand">
            <img
              src={IMAGES.campaignWide}
              alt="Inside the Project London studio"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </Container>

      {/* Manifesto */}
      <Section spacing="md" className="bg-paper">
        <Container width="narrow" className="text-center">
          <Reveal className="mb-8">
            <span className="label text-ash">The Manifesto</span>
          </Reveal>
          <h2 className="font-serif text-[clamp(1.75rem,3.75vw,3rem)] font-medium leading-[1.28] text-ink">
            <TextReveal
              text={'We started with a full wardrobe and\nnothing to wear. So we built the opposite —\na collection you actually reach for.'}
              stagger={0.06}
            />
          </h2>
        </Container>
      </Section>

      {/* Values grid */}
      <Section spacing="md" className="bg-bone">
        <Container>
          <div className="grid grid-cols-1 gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
            {values.map((v, i) => (
              <Reveal key={v.n} delay={(i % 2) * 0.08} className="bg-bone p-8 md:p-12">
                <span className="font-display text-sm font-semibold text-ash">{v.n}</span>
                <h3 className="mt-5 font-serif text-2xl font-semibold text-ink md:text-[1.75rem]">{v.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-fog">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section spacing="lg" className="bg-ink text-bone">
        <Container className="text-center">
          <h2 className="text-display font-serif font-semibold">
            <TextReveal text={'Start the *Project*'} />
          </h2>
          <Reveal delay={0.15} className="mt-10">
            <ButtonLink to="/collections/new" variant="light" size="lg">
              Shop the Collection
            </ButtonLink>
          </Reveal>
        </Container>
      </Section>
    </div>
  )
}
