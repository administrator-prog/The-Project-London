import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe, StripeElementsOptions, StripeAddressElementChangeEvent } from '@stripe/stripe-js'
import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { sized } from '@/data/images'
import { getProduct } from '@/data/products'
import { useBag } from '@/lib/bag'
import { openCheckout, preparePayment, ZONE_COUNTRIES, ZONE_LABELS } from '@/lib/checkout'
import type { OpenedCheckout, ShippingRate, ShippingZone } from '@/lib/checkout'
import { cn, formatPence } from '@/lib/utils'

/**
 * Checkout, on our own page.
 *
 * Stripe supplies two iframes — the address fields and the card fields — and
 * nothing else. The layout, the type, the summary, the delivery options and
 * every piece of copy are ours, and the two frames are themed through the
 * Appearance API to sit inside them without a seam.
 *
 * The order of operations matters and is not obvious:
 *
 *   1. /api/checkout prices the bag and opens a pending order. Stripe is not
 *      involved. We get back a one-order token and the delivery options.
 *   2. Elements is mounted in deferred mode — it is told an amount so it knows
 *      which payment methods to offer, but no PaymentIntent exists yet.
 *   3. On submit, /api/pay creates the intent for the amount *the server*
 *      calculates from the chosen rate id.
 *   4. confirmPayment sends the card straight to Stripe. It never touches us.
 *
 * The amount Elements was mounted with is display only. If it ever disagreed
 * with the server's, Stripe would refuse the confirmation rather than charge
 * the lower one — which is the right way round for that mistake to fail.
 */

export default function Checkout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { items } = useBag()

  const zone: ShippingZone = params.get('zone') === 'international' ? 'international' : 'uk'

  const [opened, setOpened] = useState<OpenedCheckout | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // An order is opened once per visit to this page. Without this guard React's
  // StrictMode double-invoke would open two, and every remount would leave
  // another abandoned pending row behind.
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    if (items.length === 0) {
      navigate('/bag', { replace: true })
      return
    }
    requested.current = true

    openCheckout(items, zone).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setOpened(result.data)
      setStripePromise(loadStripe(result.data.publishableKey))
    })
  }, [items, zone, navigate])

  if (error) return <CheckoutError message={error} />
  if (!opened || !stripePromise) return <Preparing />

  return (
    <CheckoutForm opened={opened} zone={zone} stripePromise={stripePromise} />
  )
}

/* ------------------------------------------------------------------------ */

function CheckoutForm({
  opened,
  zone,
  stripePromise,
}: {
  opened: OpenedCheckout
  zone: ShippingZone
  stripePromise: Promise<Stripe | null>
}) {
  const [rateId, setRateId] = useState(opened.rates[0]?.id ?? '')

  const rate = opened.rates.find((r) => r.id === rateId) ?? opened.rates[0]
  const total = opened.order.subtotalPence + (rate?.pricePence ?? 0)

  const options: StripeElementsOptions = useMemo(
    () => ({
      mode: 'payment',
      amount: total,
      currency: opened.order.currency,
      // Stripe's own fonts do not reach inside the frame; Inter has to be
      // loaded into it explicitly or the fields fall back to Helvetica and
      // read as somebody else's form.
      fonts: [
        {
          cssSrc:
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap',
        },
      ],
      appearance: {
        theme: 'stripe',
        variables: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSizeBase: '15px',
          colorPrimary: '#0a0a0a',
          colorBackground: '#ffffff',
          colorText: '#0a0a0a',
          colorTextSecondary: '#6d6a63',
          colorTextPlaceholder: '#9a958c',
          colorDanger: '#6b5d4a',
          borderRadius: '0px',
          spacingUnit: '4px',
        },
        rules: {
          '.Input': {
            border: '1px solid #e4e0d8',
            boxShadow: 'none',
            padding: '12px 14px',
          },
          '.Input:focus': { border: '1px solid #0a0a0a', boxShadow: 'none' },
          '.Input--invalid': { border: '1px solid #6b5d4a', boxShadow: 'none' },
          '.Label': {
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#9a958c',
            marginBottom: '8px',
          },
          '.Tab': { border: '1px solid #e4e0d8', boxShadow: 'none' },
          '.Tab--selected': { border: '1px solid #0a0a0a', boxShadow: 'none' },
        },
      },
    }),
    // Only the amount changes as the customer picks a delivery option;
    // rebuilding the whole options object would remount the card fields and
    // wipe anything already typed into them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opened.order.currency],
  )

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        opened={opened}
        zone={zone}
        rateId={rateId}
        onRateChange={setRateId}
        total={total}
      />
    </Elements>
  )
}

/* ------------------------------------------------------------------------ */

function PaymentForm({
  opened,
  zone,
  rateId,
  onRateChange,
  total,
}: {
  opened: OpenedCheckout
  zone: ShippingZone
  rateId: string
  onRateChange: (id: string) => void
  total: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [address, setAddress] = useState<StripeAddressElementChangeEvent['value'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currency, subtotalPence, items } = opened.order
  const rate = opened.rates.find((r) => r.id === rateId)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  // Elements is told the new total when the delivery option changes, so the
  // payment methods it offers stay right for the amount.
  useEffect(() => {
    elements?.update({ amount: total })
  }, [elements, total])

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!stripe || !elements || busy) return

      setEmailTouched(true)
      if (!emailValid) {
        setError('Please enter an email address so we can send your confirmation.')
        return
      }

      setBusy(true)
      setError(null)

      // Runs Stripe's own validation on both frames before anything is created
      // server-side — otherwise a mistyped card would leave a stranded intent.
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message ?? 'Please check your details and try again.')
        setBusy(false)
        return
      }

      const prepared = await preparePayment(opened.order.clientToken, rateId, email.trim())
      if (!prepared.ok) {
        setError(prepared.message)
        setBusy(false)
        return
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: prepared.data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmed`,
          receipt_email: email.trim(),
          ...(address ? { shipping: toShipping(address) } : {}),
        },
        // Cards that need no 3-D Secure step never leave the page, so we send
        // the customer on ourselves. Anything that does redirect comes back to
        // return_url with the same query Stripe would have added here.
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message ?? 'Your payment could not be completed.')
        setBusy(false)
        return
      }

      if (paymentIntent?.id) {
        navigate(`/order/confirmed?payment_intent=${paymentIntent.id}`, { replace: true })
      }
    },
    [stripe, elements, busy, emailValid, opened.order.clientToken, rateId, email, address, navigate],
  )

  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        title={'Checkout'}
        size="sm"
        crumbs={[{ label: 'Bag', to: '/bag' }, { label: 'Checkout' }]}
      />

      <Container>
        <form
          onSubmit={submit}
          className="grid gap-14 lg:grid-cols-[1fr_21rem] lg:items-start lg:gap-16"
        >
          <div className="min-w-0">
            <Fieldset legend="Contact">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={emailTouched && !emailValid}
                className={cn(
                  'h-[46px] w-full border bg-paper px-3.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ash focus:border-ink',
                  emailTouched && !emailValid ? 'border-accent' : 'border-line',
                )}
              />
              <p className="mt-3 text-xs leading-relaxed text-ash">
                Your order confirmation and tracking details are sent here.
              </p>
            </Fieldset>

            <Fieldset legend="Delivery Address" className="mt-12">
              <AddressElement
                options={{
                  mode: 'shipping',
                  allowedCountries: ZONE_COUNTRIES[zone],
                  fields: { phone: 'always' },
                  validation: { phone: { required: 'never' } },
                }}
                onChange={(event) => setAddress(event.value)}
              />
              <p className="mt-3 text-xs leading-relaxed text-ash">
                Delivering to {ZONE_LABELS[zone]}.{' '}
                <Link to="/bag" className="text-fog link-underline">
                  Change
                </Link>
              </p>
            </Fieldset>

            <Fieldset legend="Delivery Method" className="mt-12">
              <div className="border-t border-line">
                {opened.rates.map((option) => (
                  <RateRow
                    key={option.id}
                    rate={option}
                    currency={currency}
                    checked={option.id === rateId}
                    onSelect={() => onRateChange(option.id)}
                  />
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Payment" className="mt-12">
              <PaymentElement options={{ layout: 'tabs' }} />
              <p className="mt-3 text-xs leading-relaxed text-ash">
                Your card details are sent directly to Stripe over an encrypted
                connection. They never reach our servers.
              </p>
            </Fieldset>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-32">
            <div className="bg-bone p-7 md:p-8">
              <h2 className="label-sm text-ash">Your Order</h2>

              <ul className="mt-6">
                {items.map((item) => (
                  <SummaryLine key={`${item.productId}-${item.size}`} item={item} currency={currency} />
                ))}
              </ul>

              <dl className="mt-6 space-y-3.5 border-t border-line pt-6">
                <Row label="Subtotal" value={formatPence(subtotalPence, currency)} />
                <Row
                  label={rate?.label ?? 'Delivery'}
                  value={
                    rate && rate.pricePence === 0
                      ? 'Complimentary'
                      : formatPence(rate?.pricePence ?? 0, currency)
                  }
                />
              </dl>

              <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-5">
                <span className="label-sm text-ink">Total</span>
                <span className="font-serif text-lg text-ink">{formatPence(total, currency)}</span>
              </div>

              <Button
                type="submit"
                variant="solid"
                size="lg"
                className="mt-7 h-14 w-full"
                disabled={busy || !stripe}
              >
                {busy ? 'Processing' : `Pay ${formatPence(total, currency)}`}
              </Button>

              {error && (
                <p role="alert" className="mt-4 text-xs leading-relaxed text-accent">
                  {error}
                </p>
              )}

              <p className="mt-4 text-xs leading-relaxed text-ash">
                Returns are accepted within 14 days, unworn and with tags attached.
                Return postage is the customer's.
              </p>
            </div>
          </aside>
        </form>
      </Container>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

/**
 * The address element reports an absent line2 as null; confirmPayment's type
 * wants it absent or a string. Same value, different spelling of "nothing".
 */
function toShipping(value: StripeAddressElementChangeEvent['value']) {
  const { line2, ...rest } = value.address
  return {
    name: value.name,
    ...(value.phone ? { phone: value.phone } : {}),
    address: { ...rest, ...(line2 ? { line2 } : {}) },
  }
}

function Fieldset({
  legend,
  children,
  className,
}: {
  legend: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <fieldset className={className}>
      <legend className="label-sm mb-5 text-ash">{legend}</legend>
      {children}
    </fieldset>
  )
}

/** A delivery option, on the same hairline rows as everything else. */
function RateRow({
  rate,
  currency,
  checked,
  onSelect,
}: {
  rate: ShippingRate
  currency: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 border-b border-line py-4">
      <input
        type="radio"
        name="delivery"
        value={rate.id}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors',
          checked ? 'border-ink' : 'border-stone',
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-ink" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] leading-snug text-ink">{rate.label}</span>
        {rate.description && (
          <span className="mt-1 block text-sm text-ash">{rate.description}</span>
        )}
      </span>

      <span className="shrink-0 text-sm text-fog">
        {rate.pricePence === 0 ? 'Complimentary' : formatPence(rate.pricePence, currency)}
      </span>
    </label>
  )
}

function SummaryLine({
  item,
  currency,
}: {
  item: { productId: string; productName: string; size: string; quantity: number; unitPricePence: number }
  currency: string
}) {
  const product = getProduct(item.productId)

  return (
    <li className="flex items-start gap-4 pb-5">
      {product && (
        <span className="w-14 shrink-0 overflow-hidden bg-sand">
          <img
            src={sized(product.images[0], 200)}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] h-full w-full object-cover"
          />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[0.95rem] leading-tight text-ink">
          {item.productName}
        </span>
        <span className="mt-1.5 block label-sm text-ash">
          Size {item.size} · {item.quantity}
        </span>
      </span>
      <span className="shrink-0 text-sm text-fog">
        {formatPence(item.unitPricePence * item.quantity, currency)}
      </span>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-fog">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  )
}

function Preparing() {
  return (
    <div className="flex min-h-[60vh] items-center bg-paper">
      <Container className="py-24 text-center">
        <p className="label-sm text-ash">Preparing checkout</p>
      </Container>
    </div>
  )
}

function CheckoutError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center bg-paper">
      <Container className="py-24 text-center">
        <p className="mx-auto max-w-sm text-[0.95rem] leading-relaxed text-fog">{message}</p>
        <Link to="/bag" className="mt-8 inline-block label-sm text-ash hover:text-ink">
          <span className="link-underline">Return to Bag</span>
        </Link>
      </Container>
    </div>
  )
}
