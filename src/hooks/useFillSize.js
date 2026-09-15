import { useCallback, useRef, useState } from 'react'

/**
 * The pixel size of an element, kept live by a ResizeObserver, for the SVG
 * charts' desktop `fill` mode: on the phone they scale a fixed 360-wide
 * viewBox to the column, on the desktop they draw at the pixel size of the
 * box they sit in so strokes and labels stay 1:1 at any width.
 *
 * Returns [size, ref]: `size` is null until the first measurement (or when
 * disabled), `ref` is a callback ref for the element to measure. A callback
 * ref rather than an object ref because the element only exists on the
 * chart's happy path — loading, error and empty states render other boxes —
 * and a plain effect would not notice it arriving later.
 */
export function useFillSize(enabled) {
  const [size, setSize] = useState(null)
  const observerRef = useRef(null)
  const ref = useCallback(
    (el) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!el || !enabled || typeof ResizeObserver === 'undefined') return
      const ro = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect
        if (r && r.width > 0 && r.height > 0) {
          setSize({ w: Math.round(r.width), h: Math.round(r.height) })
        }
      })
      ro.observe(el)
      observerRef.current = ro
    },
    [enabled]
  )
  return [enabled ? size : null, ref]
}
