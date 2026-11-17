import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Up to three bars can sit along the bottom of a phone screen: the cookie
 * banner, the sticky Add to Bag bar, and the welcome offer. Each publishes its
 * height as a CSS variable on <html>, so the others can sit above it rather
 * than on top of it:
 *
 *   --inset-cookie  the cookie banner, while it is open
 *   --inset-cta     the sticky Add to Bag bar plus whatever is beneath it
 *
 * The variable is removed when the bar goes, so `var(--inset-x, 0px)` falls
 * back to nothing.
 */
export function usePublishedInset(
  name: '--inset-cookie' | '--inset-cta',
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  /** Anything that moves the bar without resizing it, such as a bar beneath it closing. */
  revision?: unknown,
) {
  useEffect(() => {
    const element = ref.current
    const root = document.documentElement
    if (!active || !element) {
      root.style.removeProperty(name)
      return
    }

    // Its height plus its own offset from the bottom, so a bar that sits
    // above another reports both together. Measured from layout rather than
    // the bounding box, which would include the slide-in transform.
    const publish = () => {
      const bottom = Number.parseFloat(getComputedStyle(element).bottom) || 0
      root.style.setProperty(name, `${Math.round(element.offsetHeight + bottom)}px`)
    }
    publish()

    const observer = new ResizeObserver(publish)
    observer.observe(element)
    window.addEventListener('resize', publish)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', publish)
      root.style.removeProperty(name)
    }
  }, [name, ref, active, revision])
}

/** Reads a published inset, in pixels. */
export function readInset(name: '--inset-cookie' | '--inset-cta'): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name)
  return Number.parseFloat(value) || 0
}
