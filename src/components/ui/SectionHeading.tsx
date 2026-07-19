import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Reveal, TextReveal } from './Reveal'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  /** Optional supporting line beneath the title. */
  description?: string
  link?: { label: string; to: string }
  align?: 'left' | 'center'
  className?: string
}

/**
 * The recurring section header: a tracked eyebrow, a masked editorial title,
 * and an optional "view all" link. Keeps rhythm consistent across the page.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'md:flex-col md:items-center text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <Reveal as="div" className="mb-5">
            <span className="label text-ash">{eyebrow}</span>
          </Reveal>
        )}
        <h2 className="text-headline font-serif font-semibold text-ink">
          <TextReveal text={title} />
        </h2>
        {description && (
          <Reveal delay={0.1} className="mt-5 max-w-md">
            <p className="text-sm leading-relaxed text-fog">{description}</p>
          </Reveal>
        )}
      </div>

      {link && (
        <Reveal delay={0.15} className={cn(align === 'center' && 'mx-auto')}>
          <Link
            to={link.to}
            className="group inline-flex items-center gap-1.5 label text-ink"
          >
            <span className="link-underline pb-1">{link.label}</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.5}
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </Reveal>
      )}
    </div>
  )
}
