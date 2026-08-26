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
