export interface ColorOption {
  name: string
  /** CSS colour value for the swatch dot. */
  hex: string
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  /** Optional strike-through original price. */
  compareAtPrice?: number
  /** Primary and hover image — swapped on card hover. */
  image: string
  imageHover: string
  colors: ColorOption[]
  sizes: string[]
  /** Marketing flags used for badges. */
  isNew?: boolean
  isBestSeller?: boolean
  soldOut?: boolean
}

export interface Collection {
  id: string
  title: string
  subtitle: string
  image: string
  itemCount: number
  href: string
}

export interface EditorialItem {
  id: string
  eyebrow: string
  title: string
  body: string
  /** Poster / still. Also the fallback when no `video` is set. */
  image: string
  /** Optional looping film; takes precedence over `image` when present. */
  video?: string
  href: string
  align?: 'left' | 'right'
}

export interface NavLink {
  label: string
  href: string
}

export interface NavColumn {
  heading: string
  links: NavLink[]
}

export interface MegaMenuFeature {
  label: string
  caption: string
  image: string
  href: string
}

export interface NavItem {
  label: string
  href: string
  columns?: NavColumn[]
  features?: MegaMenuFeature[]
}
