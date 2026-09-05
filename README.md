# The Project London

A premium, editorial frontend for The Project London — a London-born womenswear label. The site carries a two-piece collection (The Pearl Dress, The Florence Dress), so the structure is deliberately small: home, shop, two product pages, about, bag, checkout.

Commerce runs on **Stripe Checkout, Supabase and Resend** — see [Orders and payments](#orders-and-payments).

Built with **React + Vite + TypeScript + Tailwind CSS v4 + Framer Motion**.

---

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Requires Node 18+.

---

## Design system

The look is driven almost entirely by **typography, whitespace and restraint** — near-black ink on warm off-whites, with colour reserved for a single muted bronze accent.

- **Type** — `Archivo` for display/headings, `Inter` for body/UI, `Instrument Serif` for editorial serif moments (headlines, pull-quotes). Loaded in `index.html`.
- **Tokens** — colours, fluid type scale (`text-hero` / `text-display` / `text-headline`), easing curves and the responsive page gutter are defined once in `src/index.css` under `@theme`. Utilities like `.label`, `.link-underline` and `.px-gutter` live there too.
- **Motion** — a single signature easing (`EASE_OUT_EXPO`) and shared variants in `src/lib/motion.ts`. Reveals are quiet and once-only; nothing loops or distracts. Respects `prefers-reduced-motion`.

## Project structure

```
src/
  components/
    ui/          Reusable primitives — Button, Container, Section, Reveal,
                 TextReveal, SectionHeading, PageHeader, Logo, PageTransition
    layout/      Header, Navbar, MenuOverlay, Footer, InstagramStrip, Layout
    product/     ProductCard (hover image swap), ProductGrid
    home/        Every homepage section (Intro, Hero, TheDresses, ChapterFilm, …)
  data/          images, products, navigation, home copy  ← swap points
  pages/         Home, Shop (the collection), Product, About, NotFound
  hooks/         useScrollState, useMediaQuery
  lib/           utils (cn, formatPrice), motion, bag, checkout
  types/         shared TypeScript models

api/             checkout, pay, stripe-webhook, order, verify-access, subscribe
lib/             server-only — supabase, stripe, fulfilment, email, money,
                 commerce, access, rate-limit
supabase/        migrations and the order-lifecycle test
```

## Routes

`/` home · `/shop` · `/products/:id` · `/about` · `/bag` · `/checkout` · `/order/confirmed` · `/returns` · `/shipping` · `/faq` · everything else 404s.
`/collections/*` and `/editorial/*` from the earlier, larger store structure redirect to `/shop`.

## Homepage sections

Intro curtain → full-screen hero → the two dresses (split films) → chapter film → statement → chapter film → newsletter → Instagram → footer.

## Swapping in real content

Everything is data-driven and typed, so wiring a backend means replacing the `src/data/*` sources — not rewriting components.

- **Imagery** — every image and film resolves through `BRAND` / `MEDIA` in `src/data/images.ts`. Product galleries currently reuse the campaign stills as placeholders; drop the product shoot in there and the cards, gallery and menu all follow.
- **Products** — `src/data/products.ts` holds both dresses, conforming to the `Product` type in `src/types` (copy, detail bullets, fit, care, shipping). Point `ProductCard` / `ProductGrid` at your product API response shaped to that type.
- **Navigation & footer** — `src/data/navigation.ts` drives the menu overlay, footer links and socials.
- **Copy** — homepage copy lives in `src/data/home.ts`; page copy sits inline in each page for easy art-direction.

## Orders and payments

Payment is taken **on the site** with Stripe's Payment Element. Orders live in
Supabase; email goes through Resend.

```
Bag  ──POST /api/checkout──▶  place_order()   prices the bag from Postgres, checks
                                              stock, opens orders(pending), returns a
                                              one-order token and the delivery options

/checkout   our own page: our layout, our type. Stripe supplies two themed
            iframes — the address fields and the card fields — and nothing else.

     ──POST /api/pay──▶  prepare_payment()    looks up what the chosen rate costs,
                                              writes the total, creates the
                                              PaymentIntent for exactly that amount

     ──▶ stripe.confirmPayment()   card goes straight to Stripe, never to us

Stripe ──POST /api/stripe-webhook──▶  mark_order_paid_by_intent()   records payment,
                                              decrements stock, then Resend sends the
                                              receipt and the studio alert

Customer ──▶ /order/confirmed?payment_intent=…  ──GET /api/order──▶  order_summary_by_intent()
```

### The one rule

**The browser never sends a price.** `/api/checkout` accepts product ids, sizes and
quantities and nothing else; `place_order()` reads every price out of the `products`
table and computes the subtotal in SQL. A bag edited in devtools buys the real
catalogue at the real price, or it does not buy at all.

The same holds for delivery. The browser sends the **id** of a shipping rate, never
its cost — `prepare_payment()` looks up the price and refuses a rate from a different
zone, so a UK order cannot be paid at the £0 rate and shipped abroad.

Money is held in **pence** everywhere it is calculated, and only becomes a formatted
string at the edge — in an email or on a page.

### Schema

`supabase/migrations/` holds one migration covering:

| Table | Holds |
| --- | --- |
| `products` / `product_variants` | The catalogue and per-size stock. Price source of truth. |
| `shipping_rates` | The rates offered, by zone. |
| `orders` / `order_items` | Orders, with prices and names snapshotted at purchase. |
| `stripe_events` | Every event id Stripe has delivered — the replay guard. |

Every table has **RLS enabled with no policies**, so the anon and publishable keys can
read nothing. Only the service-role key, which lives in Vercel's environment, reaches
them. The money functions are `SECURITY DEFINER` with `EXECUTE` revoked from `anon`
and `authenticated`.

```bash
supabase link --project-ref <ref>
supabase db push --linked
```

### Two things that are easy to get wrong

- **`/api/stripe-webhook` is exempt from the password wall** in `middleware.ts`. Stripe
  posts from its own servers with no session cookie; gate it and every delivery gets a
  307 to `/access` and no order is ever marked paid. Its signature check is its
  authentication.
- **The address form's country list is UI, not a control.** Hosted Checkout enforced
  allowed countries on Stripe's side; on our own page that restriction lives in the
  browser. So `mark_order_paid_by_intent()` checks the delivery country against the
  zone once the money lands and sets `zone_mismatch` — flagged for the studio, never
  used to refuse a payment that has already gone through.
- **The amount the Payment Element is mounted with is display only.** It decides which
  payment methods to offer. The charge is whatever `prepare_payment()` wrote. If the
  two ever disagree Stripe refuses the confirmation rather than taking the lower one.

### Stock

Checked at checkout, committed when the money actually arrives. Nothing is reserved in
between — that would need an expiry and a reaper for bags abandoned on Stripe's page,
which is a lot of machinery for a collection with fifty units a size.

If a size does sell out in that window, the paid order is **never refused**. The money
is already taken, so `mark_order_paid_by_intent()` takes whatever stock is left, sets
`stock_shortfall`, and the studio email says so in as many words. The same applies to
`zone_mismatch`: flag it, email it, let a person decide.

### Testing it

```bash
# Schema and the whole order lifecycle, rolled back on exit — safe against production.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/order-lifecycle.sql

# Webhook against a local dev server.
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Card `4242 4242 4242 4242`, any future expiry, any CVC. `4000 0027 6000 3184` forces a
3D Secure challenge, which is worth walking at least once — it is the one path that
leaves the page and comes back through `return_url`. `4000 0000 0000 9995` declines for
insufficient funds.

## Intentionally stubbed

- The newsletter form validates format and shows a success state but posts nowhere.
- `src/data/products.ts` (display copy, imagery) and the `products` table (price, stock)
  are separate. Change a price in **both**, or the bag and the charge disagree.

---

_Product galleries currently reuse campaign stills. Replace with the product shoot before launch._
