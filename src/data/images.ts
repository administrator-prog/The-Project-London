/**
 * Real brand assets (logos, campaign film) served from the brand CDN.
 * URLs are already percent-encoded — pass them through verbatim, do not
 * re-encode.
 */
const CDN = 'https://cdn.estateonline.ai/The%20Project%20London'

/**
 * The wordmarks are served from this site (public/brand), not the CDN. The
 * CDN's image optimizer rewrites them per device — WebP or a resized PNG —
 * without a Vary header, and phones were left showing a broken image. From
 * here every device gets the same original PNG. public/access.html and
 * lib/email.ts point at the same files; middleware.ts lets /brand/ past the
 * password wall so the gate page can show it too.
 */
export const BRAND = {
  /** Black wordmark — used over light surfaces (scrolled nav, mobile menu). */
  logoDark: '/brand/logo-black.png',
  /** White wordmark — used over the dark hero (pre-scroll nav, footer). */
  logoLight: '/brand/logo-white.png',
} as const

export const MEDIA = {
  homeHero: `${CDN}/Shoot/IMG_1031.webp`,
  heroDesktop: `${CDN}/Home%20Hero%20Desktop.mp4`,
  heroMobile: `${CDN}/Home%20Hero%20Mobile.mp4`,
  campaignFeature: `${CDN}/FEATURE%20SECTION.JPG`,
  dress1: `${CDN}/Dress%201.mp4`,
  dress2: `${CDN}/Dress%202.mp4`,
  dressFeature1: `${CDN}/1st%20Dress%20feature.jpg`,
  dressFeature2: `${CDN}/2nd%20Dress%20Feature.jpeg`,
  /* The filename itself contains percent signs, so the escapes are doubled
     at source. Correct as written — do not "fix" %25 back to %20. */
  aboutFilm: `${CDN}/The%2520Project%2520video-2.mp4`,
} as const

/**
 * Product shoot — a separate Bunny pull zone from the brand assets above.
 */
const SHOOT_CDN = 'https://estateonline.b-cdn.net/The%20Project%20London'

/** Filenames are already percent-encoded — pass them through verbatim. */
const shoot = (folder: string, file: string) => `${SHOOT_CDN}/${folder}/${file}`

/**
 * The hero on phones. A portrait frame from the Florence shoot stands up to a
 * tall viewport where the landscape campaign still has to be cropped hard to
 * the middle. Desktop keeps `MEDIA.homeHero`; only one of the two is ever
 * downloaded — see the `<picture>` in Hero.
 */
export const HOME_HERO_MOBILE = shoot('The%20Florence%20Dress', 'PINK%20DRESS%201_404%20copy.jpg')

/**
 * Bunny Optimizer parameters. The Optimizer is on for the brand CDN (it serves
 * photography as WebP); on the product pull zone these resize and re-compress at
 * the edge once the add-on is enabled there, with no code change.
 */
export const sized = (url: string, width: number, quality = 82) =>
  `${url}?width=${width}&quality=${quality}`

/** Ordered for merchandising: hero, then the walk-around, then the details. */
export const PEARL_IMAGES = [
  shoot('The%20Pearl%20Dress', 'BEIGE%20WHITE%20DRESS_1275%20copy.jpg'),
  shoot('The%20Pearl%20Dress', 'WHITEDRESS_876.jpg'),
  shoot('The%20Pearl%20Dress', 'WHITEDRESS_869.jpg'),
  shoot('The%20Pearl%20Dress', 'WHITEDRESS_784.jpg'),
  shoot('The%20Pearl%20Dress', 'BEIGE%20WHITE%20DRESS_1323%20copy.jpg'),
  shoot('The%20Pearl%20Dress', 'WHITEDRESS_857.jpg'),
  shoot('The%20Pearl%20Dress', 'WHITEDRESS_844.jpg'),
]

/**
 * Showcase frames — a tighter, studio-lit cut of the two pieces used for the
 * editorial run beneath the hero.
 */
export const SHOWCASE_IMAGES = {
  pearlDark: shoot('Showcase', 'IMG_1034.jpg'),
  florenceLight: shoot('Showcase', 'IMG_1096.jpg'),
  pearlPortrait: shoot('Showcase', 'IMG_1097.jpg'),
  florenceArch: shoot('Showcase', 'IMG_2457.jpg'),
} as const

export const FLORENCE_IMAGES = [
  shoot('The%20Florence%20Dress', 'BEIEGE%20PINK%20DRESS_057%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'PINK%20DRESS%201_548%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'PINK%20DRESS%201_263%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'BEIEGE%20PINK%20DRESS_168%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'BEIEGE%20PINK%20DRESS_159%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'PINK%20DRESS%201_319%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'PINK%20DRESS%201_297%20copy.jpg'),
  shoot('The%20Florence%20Dress', 'PINK%20DRESS%201_314%20copy.jpg'),
]
