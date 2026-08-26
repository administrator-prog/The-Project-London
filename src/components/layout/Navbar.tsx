import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { primaryNav, secondaryNav } from '@/data/navigation'
import { MobileMenu } from './MobileMenu'

interface NavbarProps {
  /** True on pages with a dark, full-bleed hero directly behind the nav. */
  heroMode?: boolean
  /** Lifted from the header — true once the user scrolls past the threshold. */
  scrolled?: boolean
}

export function Navbar({ heroMode = false, scrolled = false }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // A route change means the panel has done its job.
  useEffect(() => setMenuOpen(false), [pathname])

  // Light (bone) treatment only over the hero — the mobile panel is paper, so
  // an open menu always wants the solid, dark-on-light bar.
  const light = heroMode && !scrolled && !menuOpen

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'label whitespace-nowrap pb-1 transition-opacity duration-300 hover:opacity-60',
      isActive ? 'border-b border-current' : 'border-b border-transparent',
    )

  return (
    <>
      <div
        className={cn(
          'relative z-[90] transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          light ? 'bg-transparent' : 'border-b border-line bg-paper/85 backdrop-blur-xl',
        )}
      >
        <nav
          className={cn(
            'mx-auto flex max-w-[100rem] items-center justify-between px-gutter transition-[height] duration-500',
            scrolled && !menuOpen ? 'h-16' : 'h-20',
          )}
        >
          {/* Left — the collection (desktop) / menu trigger (small screens) */}
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center',
              light ? 'text-bone' : 'text-ink',
            )}
          >
            <ul className="hidden items-center gap-7 lg:flex">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <NavLink to={item.href} className={linkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="group flex items-center gap-3 lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span className="relative block h-3.5 w-6">
                <span
                  className={cn(
                    'absolute left-0 h-px w-6 bg-current transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0.5',
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 h-px w-6 bg-current transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    menuOpen ? 'top-1.5 -rotate-45' : 'top-[0.6875rem]',
                  )}
                />
              </span>
              <span className="label hidden sm:inline">{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
          </div>

          {/* Center — wordmark */}
          <div className="flex shrink-0 justify-center">
            <Logo variant="inline" light={light} onClick={() => setMenuOpen(false)} />
          </div>

          {/* Right — pages + bag */}
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center justify-end gap-7',
              light ? 'text-bone' : 'text-ink',
            )}
          >
            <ul className="hidden items-center gap-7 lg:flex">
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <NavLink to={item.href} className={linkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <button
              aria-label="Shopping bag"
              className="flex items-center gap-2 pb-1 transition-opacity hover:opacity-60"
            >
              <span className="label hidden xl:inline">Bag</span>
              <ShoppingBag size={19} strokeWidth={1.25} />
            </button>
          </div>
        </nav>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
