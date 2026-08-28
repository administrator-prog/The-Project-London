import { SHOWCASE_IMAGES } from './images'

/**
 * Homepage copy — deliberately sparse. A minimal, image-led brand says little
 * and lets the film carry the feeling.
 */

export const hero = {
  line: 'Built to outlast\nthe season.',
  cta: { label: 'Shop the collection', href: '/shop' },
}

/**
 * The opening statement beneath the hero — the collection introduced as a
 * single editorial run of four frames.
 *
 * Frames deliberately avoid the shots used by the split section directly
 * below, so the two do not echo each other, and alternate the pieces — and
 * with them the dark and light backdrops — to give the row a rhythm.
 */
export const firstCollection = {
  title: 'The First Collection',
  cta: { label: 'Discover the pieces', href: '/shop' },
  frames: [
    { image: SHOWCASE_IMAGES.pearlDark, name: 'The Pearl Dress', href: '/products/the-pearl' },
    { image: SHOWCASE_IMAGES.florenceLight, name: 'The Florence Dress', href: '/products/the-florence' },
    { image: SHOWCASE_IMAGES.pearlPortrait, name: 'The Pearl Dress', href: '/products/the-pearl' },
    { image: SHOWCASE_IMAGES.florenceArch, name: 'The Florence Dress', href: '/products/the-florence' },
  ],
}

export const invitation = {
  eyebrow: 'The Project',
  line: 'The next chapter.',
  body: 'Private previews and early access. We write only when it matters.',
}
