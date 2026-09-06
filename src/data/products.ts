import type { Product } from '@/types'
import { PEARL_IMAGES, FLORENCE_IMAGES } from './images'

const SIZES = ['XS', 'S', 'M', 'L']

/*
 * Rendered with `whitespace-pre-line`, so a single \n is a line break and \n\n
 * is a paragraph gap. The two opening lines are deliberately short and carry
 * no prices: the £7.95 next-day and £25 international rates live on /shipping
 * and at checkout, which is where they have to agree with `shipping_rates`.
 */
const SHIPPING =
  'Complimentary UK delivery\nNext day delivery available\n\nIf you decide to return your order, you can do so within 14 days of delivery for a full refund. Items must be unworn, in their original condition, with all original tags attached and returned in their original packaging. Return postage is the responsibility of the customer.'

export const products: Product[] = [
  {
    id: 'the-pearl',
    name: 'The Pearl Dress',
    category: 'Dresses',
    price: 325,
    description:
      'The Pearl Dress combines delicate lace with a flattering silhouette, finished with a signature pearl bow. Feminine, romantic and timeless.',
    details: [
      'Intricate floral lace',
      'Mini length',
      'Pearl bow detail at bust',
      'Fitted silhouette',
      'Scalloped lace hem',
      'Back zipper fastening',
    ],
    sizes: SIZES,
    images: PEARL_IMAGES,
    fit: 'Model is 5\'8" and wearing a size Small.',
    care: '100% Polyester. Hand wash only.',
    shipping: SHIPPING,
  },
  {
    id: 'the-florence',
    name: 'The Florence Dress',
    category: 'Dresses',
    price: 350,
    description:
      'Effortlessly elegant, The Florence Dress is designed to sculpt the silhouette with soft, fluid draping and delicate ruching through the waist. Finished with a floral appliqué and high side slit, this maxi dress is elegant and feminine.',
    details: [
      'Strapless neckline',
      'Maxi length',
      'Ruched waist detailing',
      'Handcrafted floral appliqué with pearl',
      'High side slit',
      'Concealed back fastening',
    ],
    sizes: SIZES,
    images: FLORENCE_IMAGES,
    fit: 'Model is 5\'8" and wearing a size Small.',
    care: '95% Polyester, 5% Spandex. Hand wash only.',
    shipping: SHIPPING,
  },
]

export const getProduct = (id?: string) => products.find((p) => p.id === id)
