import type { FooterColumn, NavLink } from '@/types'

/**
 * The collection sits at the top level — with two pieces there is nothing to
 * bury behind a "Shop" menu. Split either side of the centred wordmark:
 * the dresses lead, the supporting pages follow.
 */
export const primaryNav: NavLink[] = [
  { label: 'The Pearl', href: '/products/the-pearl' },
  { label: 'The Florence', href: '/products/the-florence' },
]

export const secondaryNav: NavLink[] = [
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },
]

export const socials: NavLink[] = [
  { label: 'Instagram', href: 'https://instagram.com/theprojectlondon' },
  { label: 'TikTok', href: 'https://tiktok.com/@theprojectlondon' },
]

/**
 * The footer, as columns: a small heading over a short stack of links. Four
 * short columns read as one tidy band where a wrapping row of mixed links
 * did not.
 *
 * Customer care carries labels without hrefs — those pages are not written
 * yet, so the footer renders them inert rather than pointing at dead routes.
 */
export const footerColumns: FooterColumn[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'The Pearl Dress', href: '/products/the-pearl' },
      { label: 'The Florence Dress', href: '/products/the-florence' },
    ],
  },
  {
    heading: 'The Project',
    links: [{ label: 'About', href: '/about' }],
  },
  {
    heading: 'Customer Care',
    links: [{ label: 'FAQ' }, { label: 'Shipping' }, { label: 'Returns & Exchanges' }],
  },
  {
    heading: 'Social',
    links: socials.map((s) => ({ ...s, external: true })),
  },
]
