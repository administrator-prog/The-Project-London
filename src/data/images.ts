/**
 * Central image registry.
 *
 * Every image on the site resolves through here so the whole art direction
 * can be re-shot / swapped in one place (e.g. when Shopify assets land).
 * Placeholders are stable Unsplash photos served through their CDN with
 * on-the-fly resizing + compression.
 */

type UnsplashOpts = {
  w?: number
  h?: number
  q?: number
}

const unsplash = (id: string, { w = 1400, h, q = 80 }: UnsplashOpts = {}) => {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    crop: 'entropy',
    w: String(w),
    q: String(q),
  })
  if (h) params.set('h', String(h))
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`
}

export const IMAGES = {
  hero: unsplash('1490481651871-ab68de25d43d', { w: 2400, q: 82 }),
  heroPortrait: unsplash('1483985988355-763728e1935b', { w: 1600 }),

  // Collections
  collectionOuterwear: unsplash('1591047139829-d91aecb6caea', { w: 1400 }),
  collectionKnitwear: unsplash('1576871337622-98d48d1cf531', { w: 1400 }),
  collectionTailoring: unsplash('1507679799987-c73779587ccf', { w: 1400 }),
  collectionEssentials: unsplash('1489987707025-afc232f7ea0f', { w: 1400 }),

  // Editorial / campaign
  editorialPrimary: unsplash('1521572163474-6864f9cf17ab', { w: 1800 }),
  editorialSecondary: unsplash('1618354691373-d851c5c3a990', { w: 1200 }),
  campaignWide: unsplash('1441984904996-e0b6ba687e04', { w: 2400 }),

  // Lifestyle
  lifestyle1: unsplash('1487222477894-8943e31ef7b2', { w: 1400 }),
  lifestyle2: unsplash('1509631179647-0177331693ae', { w: 1200 }),
  lifestyle3: unsplash('1516762689617-e1cffcef479d', { w: 1200 }),

  // Brand story
  brandStory: unsplash('1523381210434-271e8be1f52b', { w: 1600 }),

  // Products — model / flat pairs
  p1a: unsplash('1521572163474-6864f9cf17ab', { w: 900 }),
  p1b: unsplash('1503341504253-dff4815485f1', { w: 900 }),
  p2a: unsplash('1576871337622-98d48d1cf531', { w: 900 }),
  p2b: unsplash('1552374196-c4e7ffc6e126', { w: 900 }),
  p3a: unsplash('1507679799987-c73779587ccf', { w: 900 }),
  p3b: unsplash('1488161628813-04466f872be2', { w: 900 }),
  p4a: unsplash('1591047139829-d91aecb6caea', { w: 900 }),
  p4b: unsplash('1507003211169-0a1dd7228f2d', { w: 900 }),
  p5a: unsplash('1489987707025-afc232f7ea0f', { w: 900 }),
  p5b: unsplash('1506794778202-cad84cf45f1d', { w: 900 }),
  p6a: unsplash('1618354691373-d851c5c3a990', { w: 900 }),
  p6b: unsplash('1517841905240-472988babdf9', { w: 900 }),
  p7a: unsplash('1620799140408-edc6dcb6d633', { w: 900 }),
  p7b: unsplash('1524504388940-b1c1722653e1', { w: 900 }),
  p8a: unsplash('1434389677669-e08b4cac3105', { w: 900 }),
  p8b: unsplash('1469334031218-e382a71b716b', { w: 900 }),

  // Instagram grid
  ig1: unsplash('1490481651871-ab68de25d43d', { w: 700, h: 700 }),
  ig2: unsplash('1441984904996-e0b6ba687e04', { w: 700, h: 700 }),
  ig3: unsplash('1487222477894-8943e31ef7b2', { w: 700, h: 700 }),
  ig4: unsplash('1523381210434-271e8be1f52b', { w: 700, h: 700 }),
  ig5: unsplash('1509631179647-0177331693ae', { w: 700, h: 700 }),
  ig6: unsplash('1516762689617-e1cffcef479d', { w: 700, h: 700 }),
} as const

/**
 * Real brand assets (logos, campaign film) served from the brand CDN.
 * URLs are already percent-encoded — pass them through verbatim, do not
 * re-encode.
 */
const CDN = 'https://cdn.estateonline.ai/The%20Project%20London'

export const BRAND = {
  /** Black wordmark — used over light surfaces (scrolled nav, mobile menu). */
  logoDark: `${CDN}/BLACK%20FONT%20(1).png`,
  /** White wordmark — used over the dark hero (pre-scroll nav, footer). */
  logoLight: `${CDN}/WHITE%20FONT.png`,
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
} as const
