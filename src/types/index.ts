export interface Product {
  id: string
  name: string
  category: string
  price: number
  /** Short paragraph shown under the price. */
  description: string
  /** Bullet points — construction and detail notes. */
  details: string[]
  sizes: string[]
  /** Gallery. The first two also drive the card's rest / hover images. */
  images: string[]
  /** Accordion copy. */
  fit: string
  care: string
  shipping: string
  soldOut?: boolean
}

export interface NavLink {
  label: string
  href: string
}

export interface FooterColumn {
  heading: string
  /** A link with no `href` renders inert — that page is not written yet. */
  links: { label: string; href?: string; external?: boolean }[]
}

/** One line in the bag: a piece, in a size, at a quantity. */
export interface BagLine {
  productId: string
  size: string
  quantity: number
}
