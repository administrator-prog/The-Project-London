import type { NavLink } from '@/types'

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

/** Footer link set — one short column, no dead ends. */
export const footerLinks: NavLink[] = [
  { label: 'The Pearl Dress', href: '/products/the-pearl' },
  { label: 'The Florence Dress', href: '/products/the-florence' },
  { label: 'About', href: '/about' },
]

export const socials: NavLink[] = [
  { label: 'Instagram', href: 'https://instagram.com/theprojectlondon' },
  { label: 'TikTok', href: 'https://tiktok.com/@theprojectlondon' },
]
