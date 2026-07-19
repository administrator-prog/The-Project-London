import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Plus, Minus, Truck, RotateCcw } from 'lucide-react'
import { products } from '@/data/products'
import { formatPrice, cn } from '@/lib/utils'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { ProductGrid } from '@/components/product/ProductGrid'
import { EASE_OUT_EXPO } from '@/lib/motion'

const accordions = [
  {
    title: 'Details & Fit',
    body: 'Relaxed, true-to-size fit. Model is 6\'1" and wears a size M. Composition and precise measurements available on request.',
  },
  {
    title: 'Materials & Care',
    body: 'Crafted from responsibly sourced natural fibres. Wash cold, reshape while damp, dry flat. Do not tumble dry.',
  },
  {
    title: 'Shipping & Returns',
    body: 'Complimentary express shipping on orders over £150. Free 30-day returns on all unworn pieces.',
  },
]

export default function Product() {
  const { id } = useParams()
  const product = products.find((p) => p.id === id) ?? products[0]

  const [activeImage, setActiveImage] = useState(0)
  const [activeColor, setActiveColor] = useState(0)
  const [activeSize, setActiveSize] = useState<string | null>(null)
  const [openAccordion, setOpenAccordion] = useState<string | null>('Details & Fit')
  const [saved, setSaved] = useState(false)

  const gallery = [product.image, product.imageHover]
  const related = products.filter((p) => p.id !== product.id).slice(0, 4)

  return (
    <div className="bg-paper pb-8">
      <Container className="pt-4">
        <nav className="mb-8 flex items-center gap-2 label-sm text-ash">
          <Link to="/" className="hover:text-ink">Home</Link>
          <span className="text-stone">/</span>
          <Link to="/collections/all" className="hover:text-ink">{product.category}</Link>
          <span className="text-stone">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>
      </Container>

      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div className="flex flex-col-reverse gap-4 md:flex-row">
            <div className="flex gap-3 md:flex-col">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setActiveImage(i)}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'relative aspect-[3/4] w-16 shrink-0 overflow-hidden bg-sand md:w-20 ring-1 ring-inset transition-all',
                    activeImage === i ? 'ring-ink' : 'ring-transparent hover:ring-line',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="relative aspect-[3/4] flex-1 overflow-hidden bg-sand">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  src={gallery[activeImage]}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
            </div>
          </div>

          {/* Info */}
          <div className="lg:sticky lg:top-32 lg:h-fit lg:py-4">
            <span className="label-sm text-ash">{product.category}</span>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-[2.75rem] md:leading-[1.05]">
              {product.name}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xl text-ink">{formatPrice(product.price)}</span>
              {product.compareAtPrice && (
                <span className="text-lg text-ash line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Colours */}
            <div className="mt-9">
              <div className="mb-3 flex items-center justify-between">
                <span className="label-sm text-ink">Colour</span>
                <span className="label-sm text-ash">{product.colors[activeColor].name}</span>
              </div>
              <div className="flex gap-2.5">
                {product.colors.map((color, i) => (
                  <button
                    key={color.name}
                    onClick={() => setActiveColor(i)}
                    aria-label={color.name}
                    className={cn(
                      'relative h-9 w-9 rounded-full ring-1 ring-inset ring-ink/10 transition-transform',
                      activeColor === i && 'scale-105',
                    )}
                    style={{ backgroundColor: color.hex }}
                  >
                    <span
                      className={cn(
                        'absolute -inset-[3px] rounded-full border border-ink transition-opacity',
                        activeColor === i ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="label-sm text-ink">Size</span>
                <button className="label-sm text-ash underline underline-offset-4 hover:text-ink">
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
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

            {/* Actions */}
            <div className="mt-9 flex gap-3">
              <Button
                variant="solid"
                size="lg"
                className="h-14 flex-1"
                disabled={product.soldOut}
              >
                {product.soldOut ? 'Sold Out' : activeSize ? 'Add to Bag' : 'Select a Size'}
              </Button>
              <button
                onClick={() => setSaved((s) => !s)}
                aria-label="Add to wishlist"
                className="flex h-14 w-14 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-ink"
              >
                <Heart size={20} strokeWidth={1.5} className={saved ? 'fill-ink' : ''} />
              </button>
            </div>

            {/* Assurances */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5">
              <div className="flex items-center gap-3 text-fog">
                <Truck size={18} strokeWidth={1.25} />
                <span className="text-xs leading-tight">Free express shipping over £150</span>
              </div>
              <div className="flex items-center gap-3 text-fog">
                <RotateCcw size={18} strokeWidth={1.25} />
                <span className="text-xs leading-tight">Free 30-day returns</span>
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
                          <p className="pb-6 text-sm leading-relaxed text-fog">{a.body}</p>
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

      {/* Related */}
      <Section spacing="lg">
        <Container>
          <SectionHeading
            eyebrow="Complete the Look"
            title={'You May Also Like'}
            className="mb-14"
          />
          <ProductGrid products={related} />
        </Container>
      </Section>
    </div>
  )
}
