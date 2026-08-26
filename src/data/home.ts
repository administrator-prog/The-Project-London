import { PEARL_IMAGES, FLORENCE_IMAGES } from './images'

/**
 * Homepage copy — deliberately sparse. A minimal, image-led brand says little
 * and lets the film carry the feeling.
 */

export const hero = {
  line: 'Built to outlast\nthe *season*.',
  cta: { label: 'Shop the collection', href: '/shop' },
}

/**
 * The opening statement beneath the hero — the collection introduced as a
 * single editorial run of four frames.
 *
 * Frames deliberately avoid the shots used by the split section directly
 * below, so the two do not echo each other, and alternate warm (campaign)
 * with cool (studio) backdrops to give the row a rhythm.
 */
export const firstCollection = {
  title: 'The First Collection',
  cta: { label: 'Discover the pieces', href: '/shop' },
  frames: [
    { image: PEARL_IMAGES[4], name: 'The Pearl Dress', href: '/products/the-pearl' },
    { image: FLORENCE_IMAGES[2], name: 'The Florence Dress', href: '/products/the-florence' },
    { image: FLORENCE_IMAGES[4], name: 'The Florence Dress', href: '/products/the-florence' },
    { image: PEARL_IMAGES[2], name: 'The Pearl Dress', href: '/products/the-pearl' },
  ],
}

export const statement = {
  eyebrow: 'The Project',
  /** `*word*` renders as a serif italic accent. */
  line: 'We make very little.\nWe make it *properly*.',
}

export const chapter = {
  title: 'In *motion*.',
  cta: { label: 'View the collection', href: '/shop' },
}

export const invitation = {
  eyebrow: 'The Project',
  line: 'The *next* chapter.',
  body: 'Private previews and early access. We write only when it matters.',
}
