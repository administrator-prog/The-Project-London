/**
 * The size guide.
 *
 * Held as data like the rest of the customer care copy, and for the same
 * reason: these are numbers a person will want to revise without opening a
 * component. The columns are the same four sizes as `SIZES` in
 * `src/data/products.ts` — if a size is ever added there, add it here too or
 * the table will quietly stop describing what is on sale.
 */

export const sizeColumns = ['XS', 'S', 'M', 'L'] as const

export interface SizeRow {
  label: string
  /** One value per column, in the order of `sizeColumns`. */
  values: string[]
}

export const sizeChart: SizeRow[] = [
  { label: 'UK size', values: ['6', '8', '10', '12'] },
  { label: 'US size', values: ['2', '4', '6', '8'] },
  { label: 'Bust', values: ['30"', '32"', '34"', '36"'] },
  { label: 'Waist', values: ['23.5–24"', '24.5–25"', '26.5–27"', '28.5–29"'] },
  { label: 'Hips', values: ['33–34"', '34.5–35"', '36.5–37"', '38.5–39"'] },
]
