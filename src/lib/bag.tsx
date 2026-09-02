import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getProduct } from '@/data/products'
import type { BagLine, Product } from '@/types'

/**
 * The bag — held in React state, mirrored to localStorage so a refresh or a
 * return visit does not lose it. There is no commerce backend yet, so this is
 * the whole of it: the shape a checkout provider would later read from.
 *
 * A line is a piece *in a size*: the same dress in S and in M are two lines.
 */

const STORAGE_KEY = 'tpl.bag.v1'

/** A hard ceiling per line — a two-piece collection has no bulk buyers. */
const MAX_PER_LINE = 9

export const lineKey = (productId: string, size: string) => `${productId}::${size}`

/** A bag line with its product resolved, ready to render. */
export interface BagItem extends BagLine {
  key: string
  product: Product
  lineTotal: number
}

interface BagValue {
  items: BagItem[]
  /** Total pieces, not lines — what the nav shows. */
  count: number
  subtotal: number
  add: (productId: string, size: string, quantity?: number) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

const BagContext = createContext<BagValue | null>(null)

/**
 * Storage is best-effort on both ends: private windows throw on write, and
 * anything already stored may be from an older shape or a piece since pulled
 * from the collection. A bad read starts an empty bag rather than a blank page.
 */
function read(): BagLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (l): l is BagLine =>
        !!l &&
        typeof l === 'object' &&
        typeof (l as BagLine).productId === 'string' &&
        typeof (l as BagLine).size === 'string' &&
        Number.isFinite((l as BagLine).quantity),
    )
  } catch {
    return []
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BagLine[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* Private browsing — the bag simply does not outlive the session. */
    }
  }, [lines])

  const add = useCallback((productId: string, size: string, quantity = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId && l.size === size)
      if (i === -1) return [...prev, { productId, size, quantity }]
      const next = [...prev]
      next[i] = { ...next[i], quantity: Math.min(next[i].quantity + quantity, MAX_PER_LINE) }
      return next
    })
  }, [])

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity < 1
        ? prev.filter((l) => lineKey(l.productId, l.size) !== key)
        : prev.map((l) =>
            lineKey(l.productId, l.size) === key
              ? { ...l, quantity: Math.min(quantity, MAX_PER_LINE) }
              : l,
          ),
    )
  }, [])

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => lineKey(l.productId, l.size) !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<BagValue>(() => {
    // A line whose piece has left the collection is dropped on the way out,
    // so a stale bag from storage can never render an empty row.
    const items = lines.flatMap<BagItem>((line) => {
      const product = getProduct(line.productId)
      if (!product) return []
      return [
        {
          ...line,
          key: lineKey(line.productId, line.size),
          product,
          lineTotal: product.price * line.quantity,
        },
      ]
    })

    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
      add,
      setQuantity,
      remove,
      clear,
    }
  }, [lines, add, setQuantity, remove, clear])

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>
}

export function useBag() {
  const ctx = useContext(BagContext)
  if (!ctx) throw new Error('useBag must be used within a BagProvider')
  return ctx
}

export { MAX_PER_LINE }
