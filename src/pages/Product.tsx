import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Truck, RotateCcw } from 'lucide-react'
import { products, getProduct } from '@/data/products'
import { sized } from '@/data/images'
import { formatPrice, cn } from '@/lib/utils'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/product/ProductCard'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { useBag } from '@/lib/bag'

export default function Product() {
  const { id } = useParams()
  const product = getProduct(id)

  const [activeImage, setActiveImage] = useState(0)
  const [activeSize, setActiveSize] = useState<string | null>(null)
  const [openAccordion, setOpenAccordion] = useState<string | null>('Size & Fit')
  const [justAdded, setJustAdded] = useState(false)
  const { add } = useBag()

  // The confirmation is a moment, not a state — it clears itself, and clears
  // on unmount so a quick navigation cannot set state on a gone component.
  useEffect(() => {
    if (!justAdded) return
    const t = setTimeout(() => setJustAdded(false), 2400)
    return () => clearTimeout(t)
  }, [justAdded])

  if (!product) return <Navigate to="/shop" replace />

  const other = products.find((p) => p.id !== product.id)

  const accordions = [
    { title: 'Size & Fit', body: product.fit },
    { title: 'Composition & Care', body: product.care },
    { title: 'Shipping, Exchange & Returns', body: product.shipping },
  ]

  return (
    <div className="bg-paper pb-8">
      <Container className="pt-4">
        <nav className="mb-8 flex items-center gap-2 label-sm text-ash">
          <Link to="/" className="hover:text-ink">Home</Link>
          <span className="text-stone">/</span>
          <Link to="/shop" className="hover:text-ink">Shop</Link>
          <span className="text-stone">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>
      </Container>

      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div>
            {/* Small screens — swipeable. Keeps the price and size selector
                within reach instead of behind a thirteen-image scroll. */}
            <div className="lg:hidden">
              <div
                onScroll={(e) => {
                  const el = e.currentTarget
                  const slide = el.scrollWidth / product.images.length
                  setActiveImage(Math.min(Math.round(el.scrollLeft / slide), product.images.length - 1))
                }}
                className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto"
              >
                {product.images.map((src, i) => (
                  <div
                    key={src}
                    className="aspect-[3/4] w-full shrink-0 snap-center overflow-hidden bg-sand"
                  >
                    <img
                      src={sized(src, 900)}
                      alt={`${product.name} — view ${i + 1}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-3 label-sm text-ash">
                <span className="text-ink">{String(activeImage + 1).padStart(2, '0')}</span>
                <span className="h-px w-6 bg-line" />
                <span>{String(product.images.length).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Large screens — the full stack, scrolling past the sticky info. */}
            <div className="hidden lg:flex lg:flex-col lg:gap-4">
              {product.images.map((src, i) => (
                <div key={src} className="aspect-[3/4] overflow-hidden bg-sand">
                  <img
                    src={sized(src, 1400)}
                    alt={`${product.name} — view ${i + 1}`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="lg:sticky lg:top-32 lg:h-fit lg:py-4">
            <h1 className="font-serif text-xl font-medium leading-tight tracking-tight text-ink md:text-[1.375rem]">
              {product.name}
            </h1>
            <span className="mt-2 block text-sm text-fog">{formatPrice(product.price)}</span>

            <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-fog">
              {product.description}
            </p>

            <ul className="mt-6 space-y-2">
              {product.details.map((d) => (
                <li key={d} className="flex gap-3 text-sm leading-relaxed text-fog">
                  <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-stone" />
                  {d}
                </li>
              ))}
            </ul>

            {/* Sizes */}
            <div className="mt-9">
              <span className="label-sm text-ink">Size</span>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setActiveSize(size)}
                    disabled={product.soldOut}
                    className={cn(
                      'flex h-12 items-center justify-center border label-sm transition-all duration-300 disabled:opacity-30',
                      activeSize === size
                        ? 'border-ink bg-ink text-bone'
                        : 'border-line text-ink hover:border-ink',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Action */}
            <Button
              variant="solid"
              size="lg"
              className="mt-8 h-14 w-full"
              disabled={product.soldOut || !activeSize}
              onClick={() => {
                if (!activeSize) return
                add(product.id, activeSize)
                setJustAdded(true)
              }}
            >
              {product.soldOut
                ? 'Sold Out'
                : !activeSize
                  ? 'Select a Size'
                  : justAdded
                    ? 'Added to Bag'
                    : 'Add to Bag'}
            </Button>

            <AnimatePresence>
              {justAdded && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  className="mt-4 text-center text-sm text-fog"
                >
                  Added in size {activeSize}.{' '}
                  <Link to="/bag" className="text-ink">
                    <span className="link-underline">View bag</span>
                  </Link>
                </motion.p>
              )}
            </AnimatePresence>

            {/* Assurances */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5">
              <div className="flex items-center gap-3 text-fog">
                <Truck size={18} strokeWidth={1.25} />
                <span className="text-xs leading-tight">Complimentary UK delivery</span>
              </div>
              <div className="flex items-center gap-3 text-fog">
                <RotateCcw size={18} strokeWidth={1.25} />
                <span className="text-xs leading-tight">14-day returns</span>
              </div>
            </div>

            {/* Accordions */}
            <div className="mt-2">
              {accordions.map((a) => {
                const open = openAccordion === a.title
                return (
                  <div key={a.title} className="border-b border-line">
                    <button
                      onClick={() => setOpenAccordion(open ? null : a.title)}
                      className="flex w-full items-center justify-between py-5 text-left"
                    >
                      <span className="font-display text-sm font-medium text-ink">{a.title}</span>
                      {open ? <Minus size={16} /> : <Plus size={16} />}
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                          className="overflow-hidden"
                        >
                          <p className="whitespace-pre-line pb-6 text-sm leading-relaxed text-fog">
                            {a.body}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Container>

      {/* The other piece */}
      {other && (
        <Section spacing="lg">
          <Container>
            <SectionHeading
              eyebrow="The Collection"
              title={'The Other Piece'}
              size="sm"
              className="mb-10"
            />
            <div className="mx-auto max-w-sm sm:max-w-md">
              <ProductCard product={other} />
            </div>
          </Container>
        </Section>
      )}
    </div>
  )
}
