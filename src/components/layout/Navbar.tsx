import { useState } from 'react'
import { Search, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { MenuOverlay } from './MenuOverlay'

interface NavbarProps {
  /** True on pages with a dark, full-bleed hero directly behind the nav. */
  heroMode?: boolean
  /** Lifted from the header — true once the user scrolls past the threshold. */
  scrolled?: boolean
}

export function Navbar({ heroMode = false, scrolled = false }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Light (bone) treatment over the hero and over the open menu overlay.
  const light = menuOpen || (heroMode && !scrolled)
  const transparent = light

  return (
    <>
      <div
        className={cn(
          'relative z-[90] transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          transparent ? 'bg-transparent' : 'border-b border-line bg-paper/85 backdrop-blur-xl',
        )}
      >
        <nav
          className={cn(
            'mx-auto flex max-w-[100rem] items-center justify-between px-gutter transition-[height] duration-500',
            scrolled && !menuOpen ? 'h-16' : 'h-20',
          )}
        >
          {/* Left — menu trigger */}
          <div className="flex min-w-0 flex-1 items-center">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={cn('group flex items-center gap-3', light ? 'text-bone' : 'text-ink')}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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

          {/* Right — utilities */}
          <div className={cn('flex min-w-0 flex-1 items-center justify-end gap-5', light ? 'text-bone' : 'text-ink')}>
            <button aria-label="Search" className="hidden p-1 transition-opacity hover:opacity-60 sm:block">
              <Search size={19} strokeWidth={1.25} />
            </button>
            <button aria-label="Shopping bag" className="group relative flex items-center gap-2 p-1 transition-opacity hover:opacity-60">
              <span className="label hidden md:inline">Bag</span>
              <span className="relative">
                <ShoppingBag size={19} strokeWidth={1.25} />
                <span
                  className={cn(
                    'absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.5rem] font-semibold',
                    light ? 'bg-bone text-ink' : 'bg-ink text-bone',
                  )}
                >
                  2
                </span>
              </span>
            </button>
          </div>
        </nav>
      </div>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
