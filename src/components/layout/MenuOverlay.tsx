import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { navigation, footerColumns } from '@/data/navigation'
import { IMAGES } from '@/data/images'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface MenuOverlayProps {
  open: boolean
  onClose: () => void
}

const socials = ['Instagram', 'TikTok', 'Pinterest']

/** Fallback visual for nav items that carry no feature image. */
const FALLBACK_FEATURE = {
  image: IMAGES.editorialPrimary,
  label: 'Winter — Volume 04',
  caption: 'The current chapter',
  href: '/collections/new',
}

/**
 * Full-screen navigation. Large serif links on the left; hovering a link
 * reveals its world (a feature image + sub-links) on the right. One unified,
 * confident interaction across every breakpoint — no mega menu, no drawer.
 */
export function MenuOverlay({ open, onClose }: MenuOverlayProps) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Reset the highlighted item each time the menu opens.
  useEffect(() => {
    if (open) setActive(0)
  }, [open])

  const activeItem = navigation[active]
  const feature = activeItem?.features?.[0] ?? FALLBACK_FEATURE
  const subLinks = activeItem?.columns?.flatMap((c) => c.links).slice(0, 6) ?? []

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="fixed inset-0 z-[70] bg-ink text-bone"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.05 }}
            className="mx-auto flex h-full max-w-[100rem] flex-col px-gutter pt-24 pb-10 md:pt-32"
          >
            <div className="grid flex-1 grid-cols-1 gap-12 lg:grid-cols-12">
              {/* Primary links */}
              <nav className="lg:col-span-7">
                <span className="label-sm text-bone/40">Explore</span>
                <ul className="mt-8 space-y-1 md:mt-10">
                  {navigation.map((item, i) => (
                    <li key={item.label}>
                      <Link
                        to={item.href}
                        onClick={onClose}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          'group flex items-baseline gap-4 py-1.5 font-serif text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[1.02] tracking-[-0.01em] transition-colors duration-300',
                          active === i ? 'text-bone' : 'text-bone/45 hover:text-bone',
                        )}
                      >
                        <span className="label-sm w-6 pt-2 text-bone/30 transition-opacity duration-300 group-hover:text-bone/60">
                          0{i + 1}
                        </span>
                        <span className="relative overflow-hidden">
                          <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
                            {item.label}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Feature + sub-links */}
              <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeItem?.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  >
                    <Link
                      to={feature.href ?? activeItem?.href ?? '/'}
                      onClick={onClose}
                      className="group relative block aspect-[4/3] overflow-hidden bg-ink-soft"
                    >
                      <img
                        src={feature.image}
                        alt={feature.label}
                        className="h-full w-full object-cover opacity-90 transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-6">
                        <div>
                          <span className="label-sm text-bone/60">{feature.caption}</span>
                          <div className="mt-1 font-serif text-2xl">{feature.label}</div>
                        </div>
                        <ArrowUpRight size={22} strokeWidth={1.25} className="text-bone transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </div>
                    </Link>

                    {subLinks.length > 0 && (
                      <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                        {subLinks.map((l) => (
                          <li key={l.label}>
                            <Link
                              to={l.href}
                              onClick={onClose}
                              className="text-sm text-bone/60 transition-colors hover:text-bone"
                            >
                              <span className="link-underline">{l.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer row */}
            <div className="mt-10 flex flex-col gap-6 border-t border-line-dark pt-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {footerColumns[1].links.slice(0, 3).map((l) => (
                  <Link key={l.label} to={l.href} onClick={onClose} className="label-sm text-bone/50 transition-colors hover:text-bone">
                    {l.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {socials.map((s) => (
                  <a key={s} href="https://instagram.com" target="_blank" rel="noreferrer" className="label-sm text-bone/50 transition-colors hover:text-bone">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
