import { useEffect, useState } from 'react'

interface ScrollState {
  /** True once the user has scrolled past `threshold`. */
  scrolled: boolean
  /** True when scrolling up (or near the top). */
  atTop: boolean
}

/**
 * Tracks lightweight scroll state for the navbar without re-rendering on every
 * frame — only when the boolean flags actually change.
 */
export function useScrollState(threshold = 40): ScrollState {
  const [state, setState] = useState<ScrollState>({ scrolled: false, atTop: true })

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setState((prev) => {
          const scrolled = y > threshold
          const atTop = y < threshold
          if (prev.scrolled === scrolled && prev.atTop === atTop) return prev
          return { scrolled, atTop }
        })
        raf = 0
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [threshold])

  return state
}
