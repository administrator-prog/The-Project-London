import { Link } from 'react-router-dom'
import { Container } from './Container'
import { Reveal, TextReveal } from './Reveal'

interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  crumbs?: Crumb[]
}

export function PageHeader({ title, eyebrow, description, crumbs }: PageHeaderProps) {
  return (
    <Container className="pt-6 pb-10 md:pt-10 md:pb-14">
      {crumbs && (
        <Reveal className="mb-8">
          <nav className="flex items-center gap-2 label-sm text-ash">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-2">
                {c.to ? (
                  <Link to={c.to} className="transition-colors hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-ink">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="text-stone">/</span>}
              </span>
            ))}
          </nav>
        </Reveal>
      )}

      {eyebrow && (
        <Reveal className="mb-4">
          <span className="label text-ash">{eyebrow}</span>
        </Reveal>
      )}

      <h1 className="text-display font-serif font-semibold text-ink">
        <TextReveal text={title} />
      </h1>

      {description && (
        <Reveal delay={0.1} className="mt-6 max-w-xl">
          <p className="text-[0.95rem] leading-relaxed text-fog">{description}</p>
        </Reveal>
      )}
    </Container>
  )
}
