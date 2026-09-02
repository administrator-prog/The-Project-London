import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { sized } from '@/data/images'
import { useBag, MAX_PER_LINE } from '@/lib/bag'
import type { BagItem } from '@/lib/bag'
import { formatPrice } from '@/lib/utils'
import { EASE_OUT_EXPO } from '@/lib/motion'

/**
 * The bag. Two states, the same restraint as the rest of the site: a quiet
 * line of copy and a way back to the collection when empty, and when full,
 * the pieces at a readable size beside a summary that stays in view.
 *
 * Nothing shouts. No badges, no urgency, no crossed-out prices — the sell was
 * done on the product page; this page's only job is to be clear.
 */
export default function Bag() {
  const { items, count, subtotal, setQuantity, remove, clear } = useBag()

  if (items.length === 0) return <EmptyBag />

  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader title={'Bag'} size="sm" crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]} />

      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_21rem] lg:items-start lg:gap-16">
          {/* Lines */}
          <section aria-label="Bag contents">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <h2 className="label-sm text-ash">
                {count} {count === 1 ? 'Piece' : 'Pieces'}
              </h2>
              <button onClick={clear} className="label-sm text-ash transition-colors hover:text-ink">
                <span className="link-underline">Empty Bag</span>
              </button>
            </div>

            <ul>
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <BagRow
                    key={item.key}
                    item={item}
                    onQuantity={(q) => setQuantity(item.key, q)}
                    onRemove={() => remove(item.key)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>

          {/* Summary */}
          <aside className="lg:sticky lg:top-32">
            <div className="bg-bone p-7 md:p-8">
              <h2 className="label-sm text-ash">Summary</h2>

              <dl className="mt-6 space-y-3.5">
                <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                <SummaryRow label="Shipping" value="Complimentary" />
                <SummaryRow label="Taxes" value="At checkout" muted />
              </dl>

              <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-5">
                <span className="label-sm text-ink">Total</span>
                <span className="font-serif text-lg text-ink">{formatPrice(subtotal)}</span>
              </div>

              {/* No payment provider is connected yet — this is where the
                  checkout session would be opened. */}
              <Button variant="solid" size="lg" className="mt-7 h-14 w-full">
                Checkout
              </Button>

              <p className="mt-4 text-xs leading-relaxed text-ash">
                Complimentary UK delivery and 14-day returns. Taxes and any duties
                are calculated at checkout.
              </p>
            </div>

            <Link
              to="/shop"
              className="mt-6 inline-block label-sm text-ash transition-colors hover:text-ink"
            >
              <span className="link-underline">Continue Shopping</span>
            </Link>
          </aside>
        </div>
      </Container>
    </div>
  )
}

/**
 * One line: the piece at a size worth looking at, its size and quantity, and
 * the line total. Removing a row collapses it rather than snapping the list.
 */
function BagRow({
  item,
  onQuantity,
  onRemove,
}: {
  item: BagItem
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const href = `/products/${item.product.id}`

  return (
    <motion.li
      layout
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      className="overflow-hidden border-b border-line"
    >
      <div className="flex gap-5 py-6 md:gap-7 md:py-8">
        <Link
          to={href}
          aria-label={item.product.name}
          className="w-24 shrink-0 overflow-hidden bg-sand md:w-32"
        >
          <img
            src={sized(item.product.images[0], 400)}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] h-full w-full object-cover"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-serif text-base leading-tight text-ink md:text-lg">
                <Link to={href} className="link-underline">
                  {item.product.name}
                </Link>
              </h3>
              <span className="mt-2 block label-sm text-ash">Size {item.size}</span>
            </div>
            <span className="shrink-0 text-sm text-fog">{formatPrice(item.lineTotal)}</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 pt-5">
            <Stepper quantity={item.quantity} onChange={onQuantity} />
            <button
              onClick={onRemove}
              className="label-sm text-ash transition-colors hover:text-ink"
            >
              <span className="link-underline">Remove</span>
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  )
}

/** Minus, count, plus — on the same hairline box as the size selector. */
function Stepper({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (quantity: number) => void
}) {
  return (
    <div className="flex h-10 items-center border border-line">
      <button
        onClick={() => onChange(quantity - 1)}
        aria-label="Decrease quantity"
        className="flex h-full w-10 items-center justify-center text-ink transition-opacity duration-300 hover:opacity-50"
      >
        <Minus size={13} strokeWidth={1.5} />
      </button>
      <span aria-live="polite" className="w-5 text-center label-sm text-ink">
        {quantity}
      </span>
      <button
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= MAX_PER_LINE}
        aria-label="Increase quantity"
        className="flex h-full w-10 items-center justify-center text-ink transition-opacity duration-300 hover:opacity-50 disabled:opacity-25"
      >
        <Plus size={13} strokeWidth={1.5} />
      </button>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-fog">{label}</dt>
      <dd className={muted ? 'text-sm text-ash' : 'text-sm text-ink'}>{value}</dd>
    </div>
  )
}

/** Nothing in the bag — say so plainly and point back at the collection. */
function EmptyBag() {
  return (
    <div className="flex min-h-[60vh] items-center bg-paper">
      <Container className="py-24 text-center">
        <h1 className="text-title font-serif text-ink">
          <TextReveal text={'Your bag is empty'} />
        </h1>
        <Reveal delay={0.15} className="mx-auto mt-6 max-w-sm">
          <p className="text-[0.95rem] leading-relaxed text-fog">
            Two pieces, considered down to the smallest detail. Nothing here yet —
            start with the collection.
          </p>
        </Reveal>
        <Reveal delay={0.25} className="mt-10">
          <ButtonLink to="/shop" size="lg">
            Shop the Collection
          </ButtonLink>
        </Reveal>
      </Container>
    </div>
  )
}
