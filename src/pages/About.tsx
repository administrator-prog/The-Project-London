import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { PageHeader } from '@/components/ui/PageHeader'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { MEDIA } from '@/data/images'

export default function About() {
  return (
    <div className="bg-paper">
      <PageHeader
        eyebrow="About Us"
        title={'Made to make\nan *entrance*.'}
        description="The Project is a London-born womenswear brand, creating timeless pieces designed to make an entrance."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
      />

      {/* Full-bleed image */}
      <Container className="mb-24 md:mb-32">
        <Reveal>
          <div className="relative aspect-[16/9] overflow-hidden bg-sand">
            <img
              src={MEDIA.campaignFeature}
              alt="The Project London"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </Container>

      {/* Statement */}
      <Section spacing="md" className="bg-bone">
        <Container width="narrow" className="text-center">
          <Reveal className="mb-8">
            <span className="label text-ash">The Project</span>
          </Reveal>
          <h2 className="font-serif text-[clamp(1.75rem,3.75vw,3rem)] font-medium leading-[1.28] text-ink">
            <TextReveal
              text={'Pretty, effortless and designed\nto make you feel your *best*.'}
              stagger={0.06}
            />
          </h2>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-8 max-w-md text-[0.95rem] leading-relaxed text-fog">
              Each piece is considered down to the smallest detail, from the
              silhouette to the finishing touches.
            </p>
          </Reveal>
        </Container>
      </Section>

      {/* CTA */}
      <Section spacing="lg" className="bg-ink text-bone">
        <Container className="text-center">
          <h2 className="text-display font-serif font-medium">
            <TextReveal text={'The *Collection*'} />
          </h2>
          <Reveal delay={0.15} className="mt-10">
            <ButtonLink to="/shop" variant="light" size="lg">
              Shop the Collection
            </ButtonLink>
          </Reveal>
        </Container>
      </Section>
    </div>
  )
}
