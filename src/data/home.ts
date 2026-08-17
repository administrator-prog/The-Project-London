import { MEDIA } from './images'

/**
 * Homepage copy — deliberately sparse. A minimal, image-led brand says little
 * and lets the film carry the feeling.
 */

export const hero = {
  line: 'Built to outlast\nthe *season*.',
  cta: { label: 'Shop the collection', href: '/collections/new' },
}

export const statement = {
  eyebrow: 'The Project',
  /** `*word*` renders as a serif italic accent. */
  line: 'We make very little.\nWe make it *properly*.',
}

export const chapter = {
  title: 'In *motion*.',
  cta: { label: 'Watch the Film', href: '/editorial/winter-volume-04' },
}

/** The whole collection — two pieces, shown side by side.
 *  `objectPosition` reframes each film so the dress stays in view. */
export const dresses = [
  {
    name: 'The Florence',
    price: '£295',
    video: MEDIA.dress1,
    poster: MEDIA.campaignFeature,
    objectPosition: '50% 22%',
    href: '/products/the-florence',
  },
  {
    name: 'The Pearl',
    price: '£320',
    video: MEDIA.dress2,
    poster: MEDIA.campaignFeature,
    objectPosition: '50% 70%',
    href: '/products/the-pearl',
  },
]

export const invitation = {
  eyebrow: 'The Project',
  line: 'The *next* chapter.',
  body: 'Private previews and early access. We write only when it matters.',
}
