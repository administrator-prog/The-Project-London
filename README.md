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

api/             checkout, stripe-webhook, order, verify-access, subscribe
lib/             server-only — supabase, stripe, fulfilment, email, money,
                 commerce, access, rate-limit
supabase/        migrations and the order-lifecycle test
```

## Routes

`/` home · `/shop` the collection · `/products/:id` the two dresses · `/about` · `/bag` · `/order/confirmed` · everything else 404s.
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

Hosted Stripe Checkout, orders in Supabase, email through Resend.

```
Bag  ──POST /api/checkout──▶  place_order()          prices the bag from Postgres,
                                                     checks stock, writes orders(pending)
     ◀──────── session url ── Stripe Checkout Session

Customer pays on Stripe's page

Stripe ──POST /api/stripe-webhook──▶  mark_order_paid()   records payment, decrements
                                                          stock, then Resend sends the
                                                          receipt and the studio alert

Customer ──▶ /order/confirmed?session_id=…  ──GET /api/order──▶  order_summary()
```

### The one rule

**The browser never sends a price.** `/api/checkout` accepts product ids, sizes and
quantities and nothing else; `place_order()` reads every price out of the `products`
table and computes the subtotal in SQL. A bag edited in devtools buys the real
catalogue at the real price, or it does not buy at all.

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
- **Shipping zone is chosen on the bag, not at Stripe.** Stripe Checkout shows every
  shipping option a session carries, so a session built with all three rates would offer
  a London customer the £25 international one. The bag asks first and the session is
  built with one zone's rates only.

### Stock

Checked at checkout, committed when the money actually arrives. Nothing is reserved in
between — that would need an expiry and a reaper for bags abandoned on Stripe's page,
which is a lot of machinery for a collection with fifty units a size.

If a size does sell out in that window, the paid order is **never refused**. The money
is already taken, so `mark_order_paid()` takes whatever stock is left, sets
`stock_shortfall`, and the studio email says so in as many words.

### Testing it

```bash
# Schema and the whole order lifecycle, rolled back on exit — safe against production.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/order-lifecycle.sql

# Webhook against a local dev server.
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Card `4242 4242 4242 4242`, any future expiry, any CVC. `4000 0027 6000 3184` forces a
3D Secure challenge; `4000 0000 0000 9995` declines for insufficient funds.

## Intentionally stubbed

- The newsletter form validates format and shows a success state but posts nowhere.
- `src/data/products.ts` (display copy, imagery) and the `products` table (price, stock)
  are separate. Change a price in **both**, or the bag and the charge disagree.

---

_Product galleries currently reuse campaign stills. Replace with the product shoot before launch._
