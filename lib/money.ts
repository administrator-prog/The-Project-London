/**
 * Money is pence everywhere it is calculated, and only ever becomes a string
 * at the edge of the system — in an email, or on a page. Nothing here returns
 * a number of pounds, because the moment one exists someone will add two of
 * them together and lose a penny.
 */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
})

/** 32500 → "£325.00". Whole pounds keep their .00 on a receipt. */
export function formatPence(pence: number, currency = 'GBP'): string {
  if (currency.toUpperCase() !== 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(pence / 100)
  }
  return GBP.format(pence / 100)
}
