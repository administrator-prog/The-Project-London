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
 *
 * One spacing value carries the whole band: the gap above the title, the gap
 * from the link down to the grid, and the gap below the grid are all the
 * Section preset's padding, so the rhythm reads as even top to bottom. The
 * title and its link sit tight together as a single head block.
 */
export function FirstCollection() {
  return (
    <Section spacing="sm" className="bg-paper">
      <Container>
        <div className="text-center">
          <h2 className="font-serif text-[clamp(1.5rem,2.4vw,2.125rem)] leading-[1.15] text-ink">
            <TextReveal text={firstCollection.title} />
          </h2>

          <Reveal delay={0.12} className="mt-5">
            <Link
              to={firstCollection.cta.href}
              className="inline-block border-b border-ink pb-2.5 label-lg text-ink transition-opacity duration-500 hover:opacity-60"
            >
              {firstCollection.cta.label}
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 md:mt-20 md:grid-cols-4 md:gap-4">
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
