import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { BRAND } from '@/data/images'

/** Intrinsic pixel size of the wordmark artwork — declared so the browser
 *  reserves the right box before the image loads. */
const LOGO_W = 8325
const LOGO_H = 1819

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
          width={LOGO_W}
          height={LOGO_H}
          className="h-auto w-[18rem] max-w-full sm:w-[23rem] md:w-[32rem]"
        />
      </Link>
    )
  }

  /**
   * The artwork carries a lot of transparent margin — the lettering is only
   * ~70% of the file's width and ~30% of its height, sitting at (48%, 52.6%)
   * of the canvas. Rendering the whole canvas in a fixed-height bar therefore
   * wastes most of the space on nothing. Instead the frame is sized to the
   * lettering alone and the oversized artwork is centred on its own ink, so
   * the wordmark reads large without the bar growing to fit the margins.
   */
  const size = cn(
    'absolute left-1/2 top-1/2 h-auto w-[18.5rem] max-w-none -translate-x-[48%] -translate-y-[52.6%]',
    'transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
  )
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="The Project London — home"
      className={cn('relative block h-6 w-[13.5rem] overflow-hidden', className)}
    >
      <img
        src={BRAND.logoDark}
        alt="The Project London"
        width={LOGO_W}
        height={LOGO_H}
        className={cn(size, light ? 'opacity-0' : 'opacity-100')}
      />
      <img
        src={BRAND.logoLight}
        alt=""
        aria-hidden
        width={LOGO_W}
        height={LOGO_H}
        className={cn(size, light ? 'opacity-100' : 'opacity-0')}
      />
    </Link>
  )
}
