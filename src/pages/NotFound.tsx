import { Container } from '@/components/ui/Container'
import { ButtonLink } from '@/components/ui/Button'
import { TextReveal, Reveal } from '@/components/ui/Reveal'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center bg-paper">
      <Container className="text-center">
        <Reveal className="mb-6">
          <span className="label text-ash">Error 404</span>
        </Reveal>
        <h1 className="text-hero font-serif font-semibold text-ink">
          <TextReveal text={'Lost'} />
        </h1>
        <Reveal delay={0.15} className="mx-auto mt-6 max-w-sm">
          <p className="text-[0.95rem] leading-relaxed text-fog">
            The page you're looking for has moved on — much like last season's
            collection. Let's get you back to something considered.
          </p>
        </Reveal>
        <Reveal delay={0.25} className="mt-10">
          <ButtonLink to="/" size="lg">
            Return Home
          </ButtonLink>
        </Reveal>
      </Container>
    </div>
  )
}
