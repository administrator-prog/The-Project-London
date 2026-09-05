import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { useBag } from '@/lib/bag'
import { fetchOrder } from '@/lib/checkout'
import type { OrderSummary } from '@/lib/checkout'
import { formatPence } from '@/lib/utils'

/**
 * Where Stripe returns the customer.
 *
 * The order is read back from the server rather than assembled from anything
 * carried in the URL — the only thing the URL is trusted for is the payment
 * intent id, and even that is just a lookup key.
 *
 * A first read can legitimately find the order still `pending`: the webhook is
 * a separate delivery and occasionally arrives second. So this polls a few
 * times before settling. The bag is emptied as soon as an order comes back
 * paid, and never before — a failed payment must leave the bag intact.
 */

/** Roughly twelve seconds. Long enough for a cold webhook, short enough that
 *  nobody sits watching a spinner wondering if their card was charged. */
const POLL_INTERVAL_MS = 1500
const MAX_POLLS = 8

export default function OrderConfirmed() {
  const [params] = useSearchParams()
  const paymentIntentId = params.get('payment_intent')
  const { clear } = useBag()

  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  // The bag must only ever be emptied once, and not again if this component
  // re-renders or the customer refreshes the page.
  const cleared = useRef(false)

  useEffect(() => {
    if (!paymentIntentId) {
      setState('missing')
      return
    }

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      const result = await fetchOrder(paymentIntentId!)
      if (cancelled) return

      if (result) {
        setOrder(result)
        setState('ready')

        if (result.status === 'paid' || result.status === 'fulfilled') {
          if (!cleared.current) {
            cleared.current = true
            clear()
          }
          return
        }
      }

      attempts += 1
      if (attempts >= MAX_POLLS) {
        if (!result) setState('missing')
        return
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [paymentIntentId, clear])

  if (state === 'loading') return <Waiting />
  if (state === 'missing' || !order) return <NotFound />

  const settled = order.status === 'paid' || order.status === 'fulfilled'

  return (
    <div className="bg-paper pb-24 md:pb-32">
      <Container className="pt-16 md:pt-24">
        <div className="mx-auto max-w-xl">
          <h1 className="text-title font-serif text-ink">
            <TextReveal text={settled ? 'Thank you' : 'Almost there'} />
          </h1>

          <Reveal delay={0.15}>
            <p className="mt-6 text-[0.95rem] leading-relaxed text-fog">
              {settled ? (
                <>
                  Your order is confirmed. We have sent a confirmation
                  {order.email ? ` to ${order.email}` : ''} and will be in touch again
                  the moment it leaves the studio.
                </>
              ) : (
                <>
                  Your payment is being confirmed. This usually takes a few seconds —
                  your order reference is below, and a confirmation email will follow
                  shortly.
                </>
              )}
            </p>
          </Reveal>

          <Reveal delay={0.25} className="mt-10">
            <span className="label-sm text-ash">Order {order.reference}</span>
          </Reveal>

          <Reveal delay={0.3} className="mt-10 border-t border-line">
            <ul>
              {order.items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}`}
                  className="flex items-start justify-between gap-6 border-b border-line py-6"
                >
                  <div className="min-w-0">
                    <h2 className="font-serif text-base leading-tight text-ink md:text-lg">
                      {item.productName}
                    </h2>
                    <span className="mt-2 block label-sm text-ash">
                      Size {item.size} · Quantity {item.quantity}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm text-fog">
                    {formatPence(item.unitPricePence * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.35} className="mt-7 space-y-3.5">
            <Row label="Subtotal" value={formatPence(order.subtotalPence, order.currency)} />
            <Row
              label={order.shippingMethod ?? 'Shipping'}
              value={
                order.shippingPence === null
                  ? '—'
                  : order.shippingPence === 0
                    ? 'Complimentary'
                    : formatPence(order.shippingPence, order.currency)
              }
            />
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-5">
              <span className="label-sm text-ink">Total</span>
              <span className="font-serif text-lg text-ink">
                {formatPence(order.totalPence ?? order.subtotalPence, order.currency)}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.45} className="mt-12">
            <ButtonLink to="/shop" size="lg">
              Continue Shopping
            </ButtonLink>
          </Reveal>
        </div>
      </Container>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-fog">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  )
}

/** Held deliberately plain — this is on screen for a second or two at most. */
function Waiting() {
  return (
    <div className="flex min-h-[60vh] items-center bg-paper">
      <Container className="py-24 text-center">
        <p className="label-sm text-ash">Confirming your order</p>
      </Container>
    </div>
  )
}

/**
 * Reached by anyone who lands here without a real session — a bookmarked URL,
 * a shared link, a back button days later. It says nothing about whether an
 * order exists, only where to go next.
 */
function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center bg-paper">
      <Container className="py-24 text-center">
        <h1 className="text-title font-serif text-ink">
          <TextReveal text={'We cannot find that order'} />
        </h1>
        <Reveal delay={0.15} className="mx-auto mt-6 max-w-sm">
          <p className="text-[0.95rem] leading-relaxed text-fog">
            If you have just placed an order, check your inbox for the confirmation.
            Otherwise, do reply to that email and we will look into it.
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
