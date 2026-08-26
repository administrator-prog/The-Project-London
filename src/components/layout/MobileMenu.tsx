import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { products } from '@/data/products'
import { secondaryNav, socials } from '@/data/navigation'
import { sized } from '@/data/images'
import { formatPrice } from '@/lib/utils'
import { EASE_OUT_EXPO } from '@/lib/motion'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

/**
 * Small-screen navigation. A light panel that drops out of the header rather
 * than a full-screen takeover — with four destinations there is nothing to
 * fill a black screen with. The two dresses lead, shown as they are sold.
 */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim — opacity only, so the fixed panel above keeps its footing.
              Hidden from assistive tech: the trigger is the labelled control. */}
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 -z-10 bg-ink/25 lg:hidden"
          />

          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
            className="overflow-hidden border-b border-line bg-paper lg:hidden"
          >
            <div className="px-gutter pb-9 pt-7">
              {/* The collection */}
              <span className="label-sm text-ash">The Collection</span>
              <ul className="mt-5 space-y-4">
                {products.map((product) => (
                  <li key={product.id}>
                    <Link
                      to={`/products/${product.id}`}
                      onClick={onClose}
                      className="group flex items-center gap-4"
                    >
                      <span className="h-24 w-[4.5rem] shrink-0 overflow-hidden bg-sand">
                        <img
                          src={sized(product.images[0], 300)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-serif text-xl text-ink">{product.name}</span>
                        <span className="mt-1 block text-sm text-fog">
                          {formatPrice(product.price)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Pages */}
              <ul className="mt-8 space-y-4 border-t border-line pt-7">
                {secondaryNav.map((item) => (
                  <li key={item.href}>
                    <Link to={item.href} onClick={onClose} className="label block text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Socials */}
              <div className="mt-8 flex gap-7 border-t border-line pt-7">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="label-sm text-ash transition-colors hover:text-ink"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
