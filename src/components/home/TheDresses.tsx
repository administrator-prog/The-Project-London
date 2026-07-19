import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { dresses } from '@/data/home'
import { cn } from '@/lib/utils'

/**
 * The collection — two pieces, one full-height frame split down the middle.
 * Each half is its own film; hover lifts a minimal shop cue. No grid, no
 * headings — the clothes are the content.
 */
export function TheDresses() {
  return (
    <section className="grid grid-cols-1 md:h-[100svh] md:min-h-[640px] md:grid-cols-2">
      {dresses.map((dress, i) => (
        <DressHalf key={dress.name} dress={dress} withDivider={i === 0} />
      ))}
    </section>
  )
}

function DressHalf({
  dress,
  withDivider,
}: {
  dress: (typeof dresses)[number]
  withDivider: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      to={dress.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative block h-[72svh] overflow-hidden bg-ink md:h-full',
        withDivider && 'md:border-r md:border-bone/15',
      )}
    >
      <video
        src={dress.video}
        poster={dress.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={dress.name}
        style={{ objectPosition: dress.objectPosition }}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)]',
          hovered ? 'scale-[1.04]' : 'scale-100',
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent transition-opacity duration-700 group-hover:from-ink/65" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-8 md:p-12">
        <div>
          <h3 className="font-serif text-2xl leading-none text-bone md:text-3xl">
            {dress.name}
          </h3>
          <span className="mt-2 block text-sm text-bone/70">{dress.price}</span>
        </div>
        <span
          className={cn(
            'mb-1 flex items-center gap-2 label text-bone transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            hovered ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0',
          )}
        >
          Shop
          <ArrowRight size={14} strokeWidth={1.5} />
        </span>
      </div>
    </Link>
  )
}
