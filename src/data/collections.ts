import type { Collection, EditorialItem } from '@/types'
import { IMAGES, MEDIA } from './images'

export const collections: Collection[] = [
  {
    id: 'outerwear',
    title: 'Outerwear',
    subtitle: 'Shells, parkas & overcoats',
    image: IMAGES.collectionOuterwear,
    itemCount: 24,
    href: '/collections/outerwear',
  },
  {
    id: 'knitwear',
    title: 'Knitwear',
    subtitle: 'Merino, bouclé & lambswool',
    image: IMAGES.collectionKnitwear,
    itemCount: 18,
    href: '/collections/knitwear',
  },
  {
    id: 'tailoring',
    title: 'Tailoring',
    subtitle: 'Relaxed suiting & trousers',
    image: IMAGES.collectionTailoring,
    itemCount: 16,
    href: '/collections/tailoring',
  },
  {
    id: 'essentials',
    title: 'Essentials',
    subtitle: 'The everyday foundation',
    image: IMAGES.collectionEssentials,
    itemCount: 32,
    href: '/collections/essentials',
  },
]

export const editorial: EditorialItem[] = [
  {
    id: 'winter-24',
    eyebrow: 'Campaign — Volume 04',
    title: 'The Winter\n*Chapter*',
    body: 'Shot across the disused warehouses of East London, our winter chapter explores weight, drape and the quiet confidence of monochrome dressing.',
    image: IMAGES.editorialPrimary,
    video: MEDIA.dress1,
    href: '/editorial/winter-volume-04',
    align: 'left',
  },
  {
    id: 'material',
    eyebrow: 'The Craft',
    title: 'Considered\n*Materials*',
    body: 'Japanese loopback cotton, Italian double-faced wool, garment-dyed by hand. We build pieces to be kept, not replaced.',
    image: IMAGES.editorialSecondary,
    video: MEDIA.dress2,
    href: '/editorial/the-craft',
    align: 'right',
  },
]
