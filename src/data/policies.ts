/**
 * Customer care copy — returns, shipping, FAQs.
 *
 * Held as data for the same reason the product copy is: these are the lines
 * most likely to be revised by someone who does not want to open a component
 * to do it. The three pages render whatever is here.
 *
 * One number appears in two places by necessity — the £7.95 next-day rate is
 * quoted here for the customer *and* held in the `shipping_rates` table, which
 * is what actually charges them. Change it in both.
 */

export const CONTACT_EMAIL = 'hello@theprojectlondon.com'

export interface PolicyBlock {
  heading?: string
  /** Paragraphs. Rendered in order, with the page's reading rhythm. */
  paragraphs: string[]
}

/** One run of paragraphs, no sub-headings — the studio's copy, as written. */
export const returnsPolicy: PolicyBlock[] = [
  {
    paragraphs: [
      'We hope you love your order. If you wish to return or exchange an item, you can do so within 14 days of receiving your order.',
      `To request a return, please email ${CONTACT_EMAIL} with your order number and the item(s) you wish to return. We will then provide you with the return instructions.`,
      'Items must be returned unworn, unused and in their original condition, with all original tags and packaging intact. We are unable to accept returns that show signs of wear, damage or alteration.',
      'Once your return has been received and inspected, we will process your refund to the original payment method. Please allow a few working days for the refund to appear in your account.',
      'Please note: Return postage costs are the responsibility of the customer.',
      `For exchanges, please email ${CONTACT_EMAIL} with your order number and the size you would like to exchange for, and we will process your exchange.`,
    ],
  },
]

export interface ShippingOption {
  label: string
  price: string
  note?: string
}

export const ukShipping: ShippingOption[] = [
  { label: 'Royal Mail Standard', price: 'Complimentary' },
  { label: 'DPD Next Day', price: '£7.95' },
]

export const ukShippingNotes: PolicyBlock[] = [
  {
    paragraphs: [
      'Orders are dispatched Monday–Friday. You’ll receive tracking details once your order has been dispatched.',
    ],
  },
]

/**
 * No rate table any more: the page no longer quotes a figure for
 * international, it points at checkout. `shipping_rates` is still what
 * charges, and still what has to be right.
 */
export const internationalShipping: PolicyBlock[] = [
  {
    heading: 'International Delivery',
    paragraphs: [
      'International delivery is available. Shipping costs are calculated at checkout based on your destination.',
      'Please note that customs duties and taxes may apply and are the responsibility of the customer.',
    ],
  },
]

/**
 * Sits under the size table. Deliberately says nothing about *how* to take a
 * measurement, and does not claim the figures are body or garment
 * measurements — the guide they came from does not say, and guessing at it
 * here is how a customer ends up ordering the wrong size.
 */
export const sizeGuideNotes: PolicyBlock[] = [
  {
    paragraphs: [
      'All measurements are in inches. Each product page carries the model’s height and the size she is wearing under Size & Fit.',
      `Between two sizes, or unsure which to choose? Email ${CONTACT_EMAIL} and we will help you decide before you order.`,
    ],
  },
]

export interface FaqGroup {
  heading: string
  items: { question: string; answer: string }[]
}

export const faqs: FaqGroup[] = [
  {
    heading: 'Ordering',
    items: [
      {
        question: 'Can I change or cancel my order?',
        answer: `Once an order has been placed, we’re unable to guarantee that it can be changed or cancelled. Please contact our customer service team as soon as possible at ${CONTACT_EMAIL} and we’ll do our best to accommodate your request.`,
      },
      {
        question: 'Can I change my delivery address after ordering?',
        answer: `If your order has not yet been dispatched, please contact us as soon as possible at ${CONTACT_EMAIL} with your order number and updated delivery address. We’ll do our best to update this before your order is shipped.`,
      },
    ],
  },
  {
    heading: 'Shipping',
    items: [
      {
        question: 'How long will delivery take?',
        answer:
          'Orders are carefully prepared and dispatched as soon as possible. Once your order has been dispatched, you’ll receive a confirmation email with your tracking details.',
      },
      {
        question: 'Do you offer free shipping?',
        answer: 'UK delivery is complimentary on all orders.',
      },
      {
        question: 'Do you ship internationally?',
        answer:
          'Yes, we offer international delivery. Delivery costs and estimated times will be calculated at checkout based on your destination.\n\nPlease note that international orders may be subject to local customs duties or taxes, which are the responsibility of the customer.',
      },
      {
        question: 'How can I track my order?',
        answer:
          'Once your order has been dispatched, you’ll receive an email containing your tracking information. Simply follow the link provided to track your parcel’s journey.',
      },
    ],
  },
  {
    heading: 'Returns & exchanges',
    items: [
      {
        question: 'How do I return my order?',
        answer:
          'We accept returns within 14 days of delivery, provided the item is unworn and all original tags remain attached.\n\nFor full details, please visit our Returns page.',
      },
      {
        question: 'How do I exchange my order?',
        answer:
          'For full details on our exchange process and eligibility, please visit our Exchanges page.',
      },
      {
        question: 'Do I have to pay to return my order?',
        answer:
          'Yes, return postage is the responsibility of the customer. We recommend using a tracked service when returning your order to ensure your parcel reaches us safely.',
      },
    ],
  },
  {
    heading: 'Sizing & fit',
    items: [
      {
        question: 'How do I find my size?',
        answer:
          'Please refer to our size guide on each product page for detailed measurements to help you find your perfect fit.',
      },
      {
        question: 'Are the dresses true to size?',
        answer:
          'Yes, our dresses are true to size. For the most accurate fit, we recommend referring to our size guide on each product page for detailed measurements.',
      },
    ],
  },
  {
    heading: 'Payment',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major debit and credit cards, as well as secure payments through Apple Pay and other selected payment providers available at checkout.',
      },
      {
        question: 'Is my payment secure?',
        answer:
          'Absolutely. Your payment is processed through a secure, encrypted checkout, ensuring your personal and payment details remain protected at every stage of your purchase.',
      },
    ],
  },
]
