import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { firstCollection } from '@/data/home'
import { sized } from '@/data/images'

/**
 * The opening statement beneath the hero: a centred title, a single call to
 * action, and a four-frame run of the collection. Each frame links to the
 * piece it shows.
 */
export function FirstCollection() {
  return (
    <Section spacing="lg" className="bg-paper pt-12 pb-24 md:pt-16 md:pb-32">
      <Container>
        <div className="text-center">
          <h2 className="font-serif text-[clamp(1.75rem,3vw,2.875rem)] leading-[1.15] text-ink">
            <TextReveal text={firstCollection.title} />
          </h2>

          <Reveal delay={0.12} className="mt-7">
            <Link
              to={firstCollection.cta.href}
              className="inline-block border-b border-ink pb-2.5 label-lg text-ink transition-opacity duration-500 hover:opacity-60"
            >
              {firstCollection.cta.label}
            </Link>
          </Reveal>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 md:mt-14 md:grid-cols-4 md:gap-6">
          {firstCollection.frames.map((frame, i) => (
            <Reveal key={frame.image} delay={(i % 4) * 0.08}>
              <Link
                to={frame.href}
                aria-label={frame.name}
                className="group block aspect-[3/4] overflow-hidden bg-sand"
              >
                <img
                  src={sized(frame.image, 800)}
                  alt={frame.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
