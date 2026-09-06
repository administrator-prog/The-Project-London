import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/utils'

/**
 * Orders, and the one action the studio takes on them.
 *
 * There is no client-side guard here worth the name — the page renders the
 * sign-in form until /api/admin/orders answers, and that endpoint is what
 * actually decides. Anything this component believes about who you are is
 * decoration.
 */

interface AdminItem {
  productName: string
  size: string
  quantity: number
  unitPricePence: number
}

interface AdminOrder {
  id: string
  reference: string
  status: string
  currency: string
  email: string | null
  customer_name: string | null
  phone: string | null
  shipping_zone: string
  shipping_method: string | null
  shipping_address: Record<string, unknown> | null
  subtotal_pence: number
  shipping_pence: number | null
  total_pence: number | null
  stock_shortfall: boolean
  zone_mismatch: boolean
  paid_at: string | null
  shipped_at: string | null
  tracking_carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_email_sent_at: string | null
  created_at: string
  items: AdminItem[]
}

type Filter = 'to-ship' | 'shipped' | 'all'

export default function Admin() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [state, setState] = useState<'loading' | 'signin' | 'ready' | 'error'>('loading')
  const [filter, setFilter] = useState<Filter>('to-ship')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)

    let response: Response
    try {
      response = await fetch('/api/admin/orders')
    } catch {
      setState('error')
      setError('Could not reach the server.')
      return
    }

    if (response.status === 401) {
      setState('signin')
      return
    }

    if (!response.ok) {
      /*
       * Worth naming, because these mean different things and one of them is
       * the common one. A 404 is a deployment that does not carry these routes
       * yet; 500 is almost always the migration not having been run, since
       * admin_order_list() is the only thing this endpoint calls.
       */
      setState('error')
      setError(
        response.status === 404
          ? 'This deployment does not have the admin API (404). Redeploy from the latest commit.'
          : response.status === 503
            ? 'Supabase is not configured for this deployment (503).'
            : response.status === 500
              ? 'The order list query failed (500) — most likely the admin migration has not been run.'
              : `The server answered ${response.status}.`,
      )
      return
    }

    try {
      const body = (await response.json()) as { orders?: AdminOrder[] }
      setOrders(body.orders ?? [])
      setState('ready')
    } catch {
      setState('error')
      setError('The server did not return an order list.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state === 'loading') return <Waiting />
  if (state === 'signin') return <SignIn onDone={load} />
  if (state === 'error') return <Failed message={error} onRetry={load} />

  const shown = (orders ?? []).filter((order) =>
    filter === 'all' ? true : filter === 'shipped' ? order.shipped_at : !order.shipped_at,
  )

  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader title={'Orders'} size="sm" crumbs={[{ label: 'Home', to: '/' }, { label: 'Orders' }]} />

      <Container>
        <div className="max-w-3xl">
          <div className="flex gap-6 border-b border-line pb-4">
            {(['to-ship', 'shipped', 'all'] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`label-sm transition-colors ${
                  filter === value ? 'text-ink' : 'text-ash hover:text-ink'
                }`}
              >
                {value === 'to-ship' ? 'To ship' : value === 'shipped' ? 'Shipped' : 'All'}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="mt-10 text-[0.95rem] text-fog">Nothing here.</p>
          ) : (
            <div className="mt-2">
              {shown.map((order) => (
                <OrderRow key={order.id} order={order} onShipped={load} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

function Failed({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-paper px-6">
      <div className="max-w-sm text-center">
        <p className="text-[0.95rem] leading-relaxed text-fog">{message ?? 'Something went wrong.'}</p>
        <button onClick={onRetry} className="mt-6 label-sm text-ink link-underline">
          Try again
        </button>
      </div>
    </div>
  )
}

function Waiting() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-paper">
      <span className="label-sm text-ash">Loading</span>
    </div>
  )
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setBusy(false)

    if (response.ok) {
      setPassword('')
      onDone()
      return
    }
    setError(
      response.status === 429
        ? 'Too many attempts. Try again later.'
        : 'That password was not right.',
    )
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-paper px-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <h1 className="font-serif text-xl text-ink">Orders</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          placeholder="Password"
          className="mt-6 h-12 w-full border border-line bg-transparent px-4 text-[0.95rem] text-ink outline-none focus:border-ink"
        />
        {error && <p className="mt-3 text-sm text-fog">{error}</p>}
        <Button type="submit" variant="solid" size="lg" className="mt-4 h-12 w-full" disabled={busy}>
          {busy ? 'Checking' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}

function OrderRow({ order, onShipped }: { order: AdminOrder; onShipped: () => void }) {
  const [open, setOpen] = useState(false)
  const [carrier, setCarrier] = useState(order.shipping_method ?? '')
  const [number, setNumber] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ship() {
    if (busy) return
    setBusy(true)
    setError(null)

    const response = await fetch('/api/admin/ship', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        carrier,
        trackingNumber: number,
        trackingUrl: url,
      }),
    })

    setBusy(false)

    if (!response.ok) {
      setError('Could not mark this as shipped.')
      return
    }

    const body = (await response.json()) as { emailed?: boolean }
    if (!body.emailed) setError('Marked as shipped, but the email did not send.')
    setOpen(false)
    onShipped()
  }

  const address = order.shipping_address ?? {}
  const line = (key: string) => {
    const value = address[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  return (
    <div className="border-b border-line py-6">
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0">
          <span className="label-sm text-ink">{order.reference}</span>
          <span className="ml-3 text-sm text-ash">
            {new Date(order.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          {order.shipped_at && <span className="ml-3 text-sm text-ash">Shipped</span>}
          {order.stock_shortfall && <span className="ml-3 text-sm text-ink">Stock shortfall</span>}
          {order.zone_mismatch && <span className="ml-3 text-sm text-ink">Zone mismatch</span>}
        </div>
        <span className="shrink-0 text-sm text-fog">
          {formatPence(order.total_pence ?? order.subtotal_pence, order.currency)}
        </span>
      </div>

      <div className="mt-3 text-sm leading-relaxed text-fog">
        {order.items.map((item) => (
          <div key={`${item.productName}-${item.size}`}>
            {item.productName} — size {item.size} × {item.quantity}
          </div>
        ))}
      </div>

      <div className="mt-3 text-sm leading-relaxed text-ash">
        {[line('name'), line('line1'), line('line2'), line('city'), line('postal_code'), line('country')]
          .filter(Boolean)
          .join(', ')}
        {order.email && <div className="mt-1">{order.email}</div>}
        {order.shipping_method && <div className="mt-1">{order.shipping_method}</div>}
      </div>

      {order.shipped_at ? (
        <div className="mt-4 text-sm text-ash">
          {order.tracking_number
            ? `${order.tracking_carrier ?? 'Tracking'}: ${order.tracking_number}`
            : 'No tracking recorded'}
          {!order.shipped_email_sent_at && ' · email not sent'}
        </div>
      ) : open ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="Carrier"
            className="h-11 border border-line bg-transparent px-3 text-sm text-ink outline-none focus:border-ink"
          />
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Tracking number"
            className="h-11 border border-line bg-transparent px-3 text-sm text-ink outline-none focus:border-ink"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Tracking link (optional)"
            className="h-11 border border-line bg-transparent px-3 text-sm text-ink outline-none focus:border-ink"
          />
          <div className="sm:col-span-3">
            <Button variant="solid" size="sm" onClick={ship} disabled={busy}>
              {busy ? 'Sending' : 'Mark shipped & email'}
            </Button>
            <button onClick={() => setOpen(false)} className="ml-4 text-sm text-ash hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 text-sm text-ink link-underline"
        >
          Mark as shipped
        </button>
      )}

      {error && <p className="mt-3 text-sm text-ink">{error}</p>}
    </div>
  )
}
