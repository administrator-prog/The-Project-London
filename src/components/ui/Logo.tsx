import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { BRAND } from '@/data/images'

interface LogoProps {
  className?: string
  /** Stacked = oversized footer wordmark; inline = nav / menu wordmark. */
  variant?: 'inline' | 'stacked'
  /**
   * Which wordmark to show. `true` = white (over dark), `false` = black
   * (over light). For the nav we render both and crossfade on scroll.
   */
  light?: boolean
  onClick?: () => void
}

/**
 * The brand wordmark, rendered from the supplied logo artwork. The inline
 * variant stacks both colourways and crossfades between them so the header
 * logo transitions cleanly as the nav goes from transparent to solid.
 */
export function Logo({ className, variant = 'inline', light = false, onClick }: LogoProps) {
  if (variant === 'stacked') {
    return (
      <Link
        to="/"
        onClick={onClick}
        aria-label="The Project London — home"
        className={cn('block', className)}
      >
        <img
          src={light ? BRAND.logoLight : BRAND.logoDark}
          alt="The Project London"
          className="h-16 w-auto sm:h-20 md:h-28"
        />
      </Link>
    )
  }

  const size = 'h-11 w-auto md:h-14'
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="The Project London — home"
      className={cn('relative block', className)}
    >
      <img
        src={BRAND.logoDark}
        alt="The Project London"
        className={cn(size, 'transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]', light ? 'opacity-0' : 'opacity-100')}
      />
      <img
        src={BRAND.logoLight}
        alt=""
        aria-hidden
        className={cn(size, 'absolute left-0 top-0 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]', light ? 'opacity-100' : 'opacity-0')}
      />
    </Link>
  )
}
