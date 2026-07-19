import { Container } from '@/components/ui/Container'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { statement } from '@/data/home'

/**
 * A quiet, centred statement — the brand's point of view in two lines.
 * Small, generous space, nothing shouted.
 */
export function Manifesto() {
  return (
    <section className="bg-bone py-32 md:py-48">
      <Container className="text-center">
        <Reveal className="mb-8">
          <span className="label text-ash">{statement.eyebrow}</span>
        </Reveal>
        <h2 className="mx-auto max-w-[22ch] font-serif text-[clamp(1.75rem,3.4vw,3rem)] font-normal leading-[1.22] text-ink">
          <TextReveal text={statement.line} stagger={0.08} />
        </h2>
      </Container>
    </section>
  )
}
