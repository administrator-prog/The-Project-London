# The Project London

A premium, editorial frontend for a contemporary fashion label — designed to feel like a bespoke £100k brand site rather than a Shopify template. **Frontend / design only**; product, checkout, inventory and CMS are intentionally left to a later backend integration (Shopify or similar).

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

- **Type** — `Archivo` for display/headings, `Inter` for body/UI, `Fraunces` for occasional editorial serif moments (pull-quotes, testimonials). Loaded in `index.html`.
- **Tokens** — colours, fluid type scale (`text-hero` / `text-display` / `text-headline`), easing curves and the responsive page gutter are defined once in `src/index.css` under `@theme`. Utilities like `.label`, `.link-underline` and `.px-gutter` live there too.
- **Motion** — a single signature easing (`EASE_OUT_EXPO`) and shared variants in `src/lib/motion.ts`. Reveals are quiet and once-only; nothing loops or distracts. Respects `prefers-reduced-motion`.

## Project structure

```
src/
  components/
    ui/          Reusable primitives — Button, Container, Section, Reveal,
                 TextReveal, SectionHeading, PageHeader, Marquee, Logo, PageTransition
    layout/      Header, AnnouncementBar, Navbar, MegaMenu, MobileMenu, Footer, Layout
    product/     ProductCard (hover swap, quick-add, swatches, wishlist), ProductGrid
    collection/  CollectionCard
    home/        Every homepage section (Hero, NewCollection, EditorialCampaign, …)
  data/          images, products, collections, navigation, testimonials  ← swap points
  pages/         Home, Shop (collection listing), Product, Editorial, About, NotFound
  hooks/         useScrollState
  lib/           utils (cn, formatPrice), motion
  types/         shared TypeScript models
```

## Homepage sections

Full-screen hero → values marquee → new collection → featured products → editorial campaign (cinematic banner + splits) → best sellers → lifestyle triptych → testimonials → brand story → newsletter → Instagram gallery → footer.

## Swapping in real content

Everything is data-driven and typed, so wiring a backend means replacing the `src/data/*` sources — not rewriting components.

- **Imagery** — every image resolves through `src/data/images.ts` (currently stable Unsplash placeholders). Replace the URLs there with your CDN / Shopify asset URLs in one place.
- **Products** — `src/data/products.ts` conforms to the `Product` type in `src/types`. Point `ProductCard` / `ProductGrid` at your product API response shaped to that type.
- **Navigation & footer** — `src/data/navigation.ts` drives the mega menu, mobile menu and footer columns.
- **Copy** — section headings and editorial copy live inline in each `home/` section for easy art-direction.

## Intentionally stubbed (frontend-only)

- "Add to bag", quick-add, wishlist and the bag count are UI state only — no cart/persistence.
- The newsletter form validates format and shows a success state but posts nowhere.
- `/collections/:slug`, `/products/:id` etc. render from local data; the routes exist so the design is fully navigable.

---

_Placeholder fashion photography via [Unsplash](https://unsplash.com). Replace before any production use._
