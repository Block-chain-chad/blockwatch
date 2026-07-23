import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '../lib/format'

/**
 * Source-agnostic animated price display: subtle green/red color pulse when the
 * value ticks, skeleton while the value is still unknown. A future streaming
 * upgrade only has to feed it new `value` props.
 */
export default function PriceText({ value, className = '', skeletonWidth = 'w-14' }) {
  const prev = useRef(value)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    const before = prev.current
    prev.current = value
    // Flash only when the RENDERED text changes — sub-cent moves that don't
    // alter a displayed digit must not blink green/red at the user.
    if (
      before != null &&
      value != null &&
      value !== before &&
      formatPrice(value) !== formatPrice(before)
    ) {
      setFlash(value > before ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 900)
      return () => clearTimeout(t)
    }
  }, [value])

  if (value == null) {
    return (
      <span
        className={`inline-block h-3.5 animate-pulse rounded bg-zinc-800 align-middle ${skeletonWidth}`}
        aria-label="Loading price"
      />
    )
  }

  const flashCls = flash === 'up' ? 'text-gain price-tick' : flash === 'down' ? 'text-loss price-tick' : ''
  return (
    <span key={value} className={`tabular-nums transition-colors duration-700 ${className} ${flashCls}`}>
      {formatPrice(value)}
    </span>
  )
}
