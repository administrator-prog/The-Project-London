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

export const returnsPolicy: PolicyBlock[] = [
  {
    paragraphs: [
      'We hope you love your order. If you wish to return or exchange an item, you can do so within 14 days of receiving your order.',
    ],
  },
  {
    heading: 'Requesting a return',
    paragraphs: [
      `To request a return, please email ${CONTACT_EMAIL} with your order number and the item or items you wish to return. We will then provide you with the return instructions.`,
      'Items must be returned unworn, unused and in their original condition, with all original tags and packaging intact. We are unable to accept returns that show signs of wear, damage or alteration.',
    ],
  },
  {
    heading: 'Refunds',
    paragraphs: [
      'Once your return has been received and inspected, we will process your refund to the original payment method. Please allow a few working days for the refund to appear in your account.',
      'Return postage costs are the responsibility of the customer. We recommend using a tracked service so your parcel reaches us safely.',
    ],
  },
  {
    heading: 'Exchanges',
    paragraphs: [
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
  { label: 'DPD Next Day', price: '£7.95', note: 'Order before 1pm, Monday to Thursday' },
]

export const internationalShipping: ShippingOption[] = [
  { label: 'International Delivery', price: '£25.00', note: 'A flat rate, wherever you are' },
]

export const shippingNotes: PolicyBlock[] = [
  {
    paragraphs: [
      'Orders are dispatched Monday to Friday, within one to two working days. You will receive tracking details by email as soon as your order has left the studio.',
    ],
  },
  {
    heading: 'International orders',
    paragraphs: [
      'We ship worldwide at a single flat rate, shown at checkout before you pay.',
      'Customs duties and local taxes may apply on arrival and are the responsibility of the customer.',
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
        answer: `Once an order has been placed, we are unable to guarantee that it can be changed or cancelled. Please contact us as soon as possible at ${CONTACT_EMAIL} and we will do our best to accommodate your request.`,
      },
      {
        question: 'Can I change my delivery address after ordering?',
        answer: `If your order has not yet been dispatched, please contact us as soon as possible at ${CONTACT_EMAIL} with your order number and updated delivery address. We will do our best to update this before your order is shipped.`,
      },
    ],
  },
  {
    heading: 'Shipping',
    items: [
      {
        question: 'How long will delivery take?',
        answer: 'Orders are carefully prepared and dispatched within one to two working days. Once your order has been dispatched you will receive a confirmation email with your tracking details.',
      },
      {
        question: 'Do you offer free shipping?',
        answer: 'UK delivery is complimentary on all orders. DPD Next Day is available at checkout for £7.95.',
      },
      {
        question: 'Do you ship internationally?',
        answer: 'Yes. International delivery is a flat £25, shown at checkout before you pay. Please note that international orders may be subject to local customs duties or taxes, which are the responsibility of the customer.',
      },
      {
        question: 'How can I track my order?',
        answer: 'Once your order has been dispatched you will receive an email containing your tracking information. Simply follow the link provided to track your parcel’s journey.',
      },
    ],
  },
  {
    heading: 'Returns & Exchanges',
    items: [
      {
        question: 'How do I return my order?',
        answer: 'We accept returns within 14 days of delivery, provided the item is unworn and all original tags remain attached. Full details are on our Returns page.',
      },
      {
        question: 'How do I exchange my order?',
        answer: `Email ${CONTACT_EMAIL} with your order number and the size you would like instead, and we will process the exchange. Full details are on our Returns page.`,
      },
      {
        question: 'Do I have to pay to return my order?',
        answer: 'Yes, return postage is the responsibility of the customer. We recommend using a tracked service when returning your order to ensure your parcel reaches us safely.',
      },
    ],
  },
  {
    heading: 'Sizing & Fit',
    items: [
      {
        question: 'How do I find my size?',
        answer: 'Each product page carries detailed measurements under Size & Fit to help you find your perfect fit.',
      },
      {
        question: 'Are the dresses true to size?',
        answer: 'Yes, our dresses are true to size. For the most accurate fit we recommend referring to the measurements on each product page.',
      },
    ],
  },
  {
    heading: 'Payment',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major debit and credit cards, as well as Apple Pay and Google Pay at checkout.',
      },
      {
        question: 'Is my payment secure?',
        answer: 'Yes. Payments are processed by Stripe over an encrypted connection. Your card details are entered on Stripe’s own payment page and are never sent to, or stored on, our servers.',
      },
    ],
  },
]
