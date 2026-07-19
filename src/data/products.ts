import type { Product } from '@/types'
import { IMAGES } from './images'

const SIZES = ['XS', 'S', 'M', 'L', 'XL']

export const products: Product[] = [
  {
    id: 'heavyweight-crew-tee',
    name: 'Heavyweight Crew T-Shirt',
    category: 'Essentials',
    price: 65,
    image: IMAGES.p1a,
    imageHover: IMAGES.p1b,
    colors: [
      { name: 'Vintage Black', hex: '#1a1a19' },
      { name: 'Bone', hex: '#efe9dd' },
      { name: 'Clay', hex: '#b7a08a' },
    ],
    sizes: SIZES,
    isNew: true,
    isBestSeller: true,
  },
  {
    id: 'boucle-knit-crew',
    name: 'Bouclé Knit Sweater',
    category: 'Knitwear',
    price: 190,
    image: IMAGES.p2a,
    imageHover: IMAGES.p2b,
    colors: [
      { name: 'Oat', hex: '#d8cbb4' },
      { name: 'Charcoal', hex: '#3a3a38' },
    ],
    sizes: SIZES,
    isNew: true,
  },
  {
    id: 'wool-overcoat',
    name: 'Double-Faced Wool Overcoat',
    category: 'Tailoring',
    price: 545,
    image: IMAGES.p3a,
    imageHover: IMAGES.p3b,
    colors: [
      { name: 'Camel', hex: '#a67c52' },
      { name: 'Ink', hex: '#14140f' },
    ],
    sizes: SIZES,
    isBestSeller: true,
  },
  {
    id: 'technical-parka',
    name: 'Technical Shell Parka',
    category: 'Outerwear',
    price: 420,
    compareAtPrice: 520,
    image: IMAGES.p4a,
    imageHover: IMAGES.p4b,
    colors: [
      { name: 'Slate', hex: '#5a5f63' },
      { name: 'Black', hex: '#0f0f0e' },
    ],
    sizes: SIZES,
  },
  {
    id: 'pleated-trouser',
    name: 'Pleated Wide Trouser',
    category: 'Tailoring',
    price: 210,
    image: IMAGES.p5a,
    imageHover: IMAGES.p5b,
    colors: [
      { name: 'Stone', hex: '#c9bfa9' },
      { name: 'Ink', hex: '#14140f' },
      { name: 'Olive', hex: '#6b6b4e' },
    ],
    sizes: SIZES,
    isBestSeller: true,
  },
  {
    id: 'garment-dyed-hoodie',
    name: 'Garment-Dyed Hoodie',
    category: 'Essentials',
    price: 145,
    image: IMAGES.p6a,
    imageHover: IMAGES.p6b,
    colors: [
      { name: 'Faded Black', hex: '#2a2826' },
      { name: 'Sand', hex: '#d4c6ac' },
      { name: 'Fog', hex: '#8f9195' },
    ],
    sizes: SIZES,
    isNew: true,
  },
  {
    id: 'merino-half-zip',
    name: 'Merino Half-Zip',
    category: 'Knitwear',
    price: 175,
    image: IMAGES.p7a,
    imageHover: IMAGES.p7b,
    colors: [
      { name: 'Ecru', hex: '#e2d8c3' },
      { name: 'Navy', hex: '#2b3140' },
    ],
    sizes: SIZES,
    isBestSeller: true,
  },
  {
    id: 'relaxed-oxford-shirt',
    name: 'Relaxed Oxford Shirt',
    category: 'Shirting',
    price: 130,
    image: IMAGES.p8a,
    imageHover: IMAGES.p8b,
    colors: [
      { name: 'White', hex: '#f4f1ea' },
      { name: 'Sky', hex: '#aebdc9' },
    ],
    sizes: SIZES,
    soldOut: true,
  },
]

export const newArrivals = products.filter((p) => p.isNew)
export const bestSellers = products.filter((p) => p.isBestSeller)
export const featured = products.slice(0, 4)
