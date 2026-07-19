import { useScrollState } from '@/hooks/useScrollState'
import { Navbar } from './Navbar'

interface HeaderProps {
  /** True on pages with a dark, full-bleed hero directly behind the nav. */
  heroMode?: boolean
}

/**
 * Fixed header. Rests transparent over a hero and turns solid on scroll.
 * Owns the shared scroll state.
 */
export function Header({ heroMode = false }: HeaderProps) {
  const { scrolled } = useScrollState(40)

  return (
    <header className="fixed inset-x-0 top-0 z-[80]">
      <Navbar heroMode={heroMode} scrolled={scrolled} />
    </header>
  )
}
