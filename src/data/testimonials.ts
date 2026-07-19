export interface Testimonial {
  quote: string
  author: string
  detail: string
}

export const testimonials: Testimonial[] = [
  {
    quote:
      'The overcoat is the best-made piece I own. The weight, the drape — it feels like something that should cost three times as much.',
    author: 'James M.',
    detail: 'Verified Client · London',
  },
  {
    quote:
      'Finally a brand that understands restraint. Everything works together. I have stopped shopping anywhere else.',
    author: 'Sofia R.',
    detail: 'Verified Client · Copenhagen',
  },
  {
    quote:
      'Quietly luxurious. Nothing shouts, but people always ask where it is from. Exactly what I want from my wardrobe.',
    author: 'Daniel K.',
    detail: 'Verified Client · New York',
  },
]

export const press: string[] = [
  'Vogue',
  'GQ',
  'Highsnobiety',
  'Hypebeast',
  'Mr Porter',
  'Monocle',
  'Dazed',
]
