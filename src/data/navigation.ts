import type { NavItem } from '@/types'
import { IMAGES } from './images'

export const announcements: string[] = [
  'Complimentary shipping on orders over £150',
  'Winter — Volume 04 now available',
  'Members receive early access to new arrivals',
]

export const navigation: NavItem[] = [
  {
    label: 'New',
    href: '/collections/new',
    columns: [
      {
        heading: 'Just In',
        links: [
          { label: 'New Arrivals', href: '/collections/new' },
          { label: 'Winter — Volume 04', href: '/collections/winter' },
          { label: 'Back in Stock', href: '/collections/restock' },
          { label: 'The Gift Edit', href: '/collections/gifts' },
        ],
      },
      {
        heading: 'Featured',
        links: [
          { label: 'Best Sellers', href: '/collections/best-sellers' },
          { label: 'The Monochrome Edit', href: '/collections/monochrome' },
          { label: 'Last Chance', href: '/collections/last-chance' },
        ],
      },
    ],
    features: [
      {
        label: 'Winter — Volume 04',
        caption: 'The full chapter',
        image: IMAGES.collectionOuterwear,
        href: '/collections/winter',
      },
    ],
  },
  {
    label: 'Women',
    href: '/collections/women',
    columns: [
      {
        heading: 'Clothing',
        links: [
          { label: 'Outerwear', href: '/collections/women-outerwear' },
          { label: 'Knitwear', href: '/collections/women-knitwear' },
          { label: 'Dresses', href: '/collections/dresses' },
          { label: 'Tailoring', href: '/collections/women-tailoring' },
          { label: 'Tops', href: '/collections/tops' },
        ],
      },
      {
        heading: 'Shop By',
        links: [
          { label: 'All Womenswear', href: '/collections/women' },
          { label: 'New In', href: '/collections/new' },
          { label: 'Essentials', href: '/collections/women-essentials' },
        ],
      },
    ],
    features: [
      {
        label: 'Knitwear',
        caption: 'Merino & bouclé',
        image: IMAGES.collectionKnitwear,
        href: '/collections/women-knitwear',
      },
    ],
  },
  {
    label: 'Collections',
    href: '/collections',
    columns: [
      {
        heading: 'Editions',
        links: [
          { label: 'Winter — Volume 04', href: '/collections/winter' },
          { label: 'The Monochrome Edit', href: '/collections/monochrome' },
          { label: 'Studio Series', href: '/collections/studio' },
          { label: 'The Archive', href: '/collections/archive' },
        ],
      },
    ],
    features: [
      {
        label: 'The Archive',
        caption: 'Past chapters',
        image: IMAGES.editorialPrimary,
        href: '/collections/archive',
      },
    ],
  },
  { label: 'Editorial', href: '/editorial' },
  { label: 'About', href: '/about' },
]

export const footerColumns = [
  {
    heading: 'Shop',
    links: [
      { label: 'New Arrivals', href: '/collections/new' },
      { label: 'Menswear', href: '/collections/men' },
      { label: 'Womenswear', href: '/collections/women' },
      { label: 'Best Sellers', href: '/collections/best-sellers' },
      { label: 'Gift Cards', href: '/gift-cards' },
    ],
  },
  {
    heading: 'Client Care',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Shipping & Returns', href: '/shipping' },
      { label: 'Size Guide', href: '/size-guide' },
      { label: 'Product Care', href: '/care' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    heading: 'The Project',
    links: [
      { label: 'Our Story', href: '/about' },
      { label: 'Editorial', href: '/editorial' },
      { label: 'Sustainability', href: '/sustainability' },
      { label: 'Stores', href: '/stores' },
      { label: 'Careers', href: '/careers' },
    ],
  },
]
