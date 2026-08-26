# The Project London

A premium, editorial frontend for The Project London — a London-born womenswear label. The site carries a two-piece collection (The Pearl Dress, The Florence Dress), so the structure is deliberately small: home, shop, two product pages, about. **Frontend / design only**; checkout, inventory and CMS are intentionally left to a later backend integration (Shopify or similar).

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
  lib/           utils (cn, formatPrice), motion
  types/         shared TypeScript models
```

## Routes

`/` home · `/shop` the collection · `/products/:id` the two dresses · `/about` · everything else 404s.
`/collections/*` and `/editorial/*` from the earlier, larger store structure redirect to `/shop`.

## Homepage sections

Intro curtain → full-screen hero → the two dresses (split films) → chapter film → statement → chapter film → newsletter → Instagram → footer.

## Swapping in real content

Everything is data-driven and typed, so wiring a backend means replacing the `src/data/*` sources — not rewriting components.

- **Imagery** — every image and film resolves through `BRAND` / `MEDIA` in `src/data/images.ts`. Product galleries currently reuse the campaign stills as placeholders; drop the product shoot in there and the cards, gallery and menu all follow.
- **Products** — `src/data/products.ts` holds both dresses, conforming to the `Product` type in `src/types` (copy, detail bullets, fit, care, shipping). Point `ProductCard` / `ProductGrid` at your product API response shaped to that type.
- **Navigation & footer** — `src/data/navigation.ts` drives the menu overlay, footer links and socials.
- **Copy** — homepage copy lives in `src/data/home.ts`; page copy sits inline in each page for easy art-direction.

## Intentionally stubbed (frontend-only)

- "Add to bag" and the bag icon are UI state only — no cart or checkout yet.
- The newsletter form validates format and shows a success state but posts nowhere.
- `/shop` and `/products/:id` render from local data; the routes exist so the design is fully navigable.

---

_Product galleries currently reuse campaign stills. Replace with the product shoot before launch._
