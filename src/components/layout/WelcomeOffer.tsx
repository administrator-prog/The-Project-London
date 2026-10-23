import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HOME_HERO_MOBILE, sized } from '@/data/images'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { captureOfferCode, popupWanted, rememberPopup } from '@/lib/offer'
import { track } from '@/lib/pixel'
import { cn } from '@/lib/utils'

/**
 * The welcome offer: an email address for 10% off, sent by email.
 *
 * Asked once. It waits a while before appearing, or until the cursor heads
 * for the tab bar on a desktop, and it never appears anywhere money is being
 * handled — the bag, checkout, the confirmation page — or in the admin.
 *
 * Whether it appears at all is the server's call (GET /api/offer), so
 * WELCOME_OFFER=off takes it down without a rebuild.
 */

const DELAY_MS = 15_000

/** Must match WELCOME_CONSENT in lib/offer.ts, which stores it with the code. */
const CONSENT_TEXT =
  'By signing up you agree to receive emails from The Project London. Unsubscribe at any time.'

const QUIET_PATHS = ['/bag', '/checkout', '/order', '/admin']

const isQuiet = (pathname: string) => QUIET_PATHS.some((path) => pathname.startsWith(path))

export function WelcomeOffer() {
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const armed = useRef(false)

  // A link from the welcome email carries the code; keep it for checkout.
  useEffect(() => {
    captureOfferCode(search)
  }, [search])

  const show = useCallback(() => {
    if (armed.current) return
    armed.current = true
    fetch('/api/offer')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { enabled?: boolean } | null) => {
        if (body?.enabled && popupWanted() && !isQuiet(window.location.pathname)) setOpen(true)
      })
      .catch(() => {
        /* No popup is the right failure. */
      })
  }, [])

  useEffect(() => {
    if (armed.current || isQuiet(pathname) || !popupWanted()) return

    const timer = window.setTimeout(show, DELAY_MS)

    // Exit intent: the pointer leaving through the top of the window.
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget && event.clientY <= 0) show()
    }
    document.addEventListener('mouseout', onLeave)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [pathname, show])

  // Navigating somewhere quiet takes it away, without counting as a no.
  useEffect(() => {
    if (isQuiet(pathname)) setOpen(false)
  }, [pathname])

  const dismiss = useCallback(() => {
    rememberPopup('dismissed')
    setOpen(false)
  }, [])

  return (
    <AnimatePresence>
      {open && <OfferDialog onDismiss={dismiss} onDone={() => setOpen(false)} />}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------------ */

function OfferDialog({ onDismiss, onDone }: { onDismiss: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [trap, setTrap] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openedAt = useRef(Date.now())
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') (sent ? onDone : onDismiss)()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sent, onDismiss, onDone])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          reference: trap,
          elapsed: Date.now() - openedAt.current,
        }),
      })
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string }
        | null

      if (response.ok && body?.ok) {
        rememberPopup('joined')
        track('Lead')
        setSent(true)
      } else if (body?.error === 'used') {
        // Nothing more to offer this address; do not ask again.
        rememberPopup('joined')
        setError(body.message ?? 'This email address has already used its welcome offer.')
      } else {
        setError(body?.message ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const close = sent ? onDone : onDismiss

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={close}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-offer-title"
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        onClick={(event) => event.stopPropagation()}
        className="relative grid w-full max-w-3xl bg-bone sm:grid-cols-[2fr_3fr]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center text-fog transition-colors hover:text-ink"
        >
          <X size={18} strokeWidth={1.25} />
        </button>

        <div className="hidden overflow-hidden bg-sand sm:block">
          <img
            src={sized(HOME_HERO_MOBILE, 700)}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        </div>

        <div className="px-6 pb-8 pt-12 sm:px-10 sm:py-14">
          {sent ? (
            <div aria-live="polite">
              <p className="label-sm text-ash">Welcome</p>
              <h2 id="welcome-offer-title" className="mt-4 font-serif text-3xl leading-tight text-ink">
                Check your inbox
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-fog">
                Your code is on its way to {email.trim()}. Enter it at checkout for 10% off
                your first order.
              </p>
              <Button variant="solid" size="md" className="mt-8 w-full" onClick={onDone}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <p className="label-sm text-ash">The Project London</p>
              <h2 id="welcome-offer-title" className="mt-4 font-serif text-3xl leading-tight text-ink">
                10% off your first order
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-fog">
                Join us for first access to new pieces, and we will email you a code for
                10% off.
              </p>

              {/* Honeypot: hidden from people, irresistible to form-filling scripts. */}
              <input
                type="text"
                name="reference"
                tabIndex={-1}
                autoComplete="off"
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
                aria-hidden
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              <label htmlFor="welcome-offer-email" className="sr-only">
                Email address
              </label>
              <input
                ref={input}
                id="welcome-offer-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                className={cn(
                  'mt-7 h-[46px] w-full border bg-paper px-3.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ash focus:border-ink',
                  error ? 'border-accent' : 'border-line',
                )}
              />

              {error && (
                <p role="alert" className="mt-3 text-xs leading-relaxed text-accent">
                  {error}
                </p>
              )}

              <Button type="submit" variant="solid" size="md" className="mt-4 w-full" disabled={busy}>
                {busy ? 'Sending' : 'Send My Code'}
              </Button>

              <p className="mt-4 text-[0.6875rem] leading-relaxed text-ash">{CONSENT_TEXT}</p>

              <button
                type="button"
                onClick={onDismiss}
                className="mt-5 label-sm text-ash transition-colors hover:text-ink"
              >
                <span className="link-underline">No thank you</span>
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
