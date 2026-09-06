import { useId } from 'react'
import { formatPct } from '../lib/format'
import { useFillSize } from '../hooks/useFillSize'

// The phone draws a fixed viewBox scaled to the column; desktop `fill` mode
// swaps these for the measured pixel size of the box the chart sits in.
const BASE_W = 360
const BASE_H = 80
const PAD = 6
// Never zoom tighter than this total span (%), or parity-hugging tokens would
// render their basis-point jitter as wild swings.
const MIN_SPAN = 0.3

/*
 * Premium history: the % gap between token and stock over the selected range.
 * One line around a dashed 1:1 axis — green while the token trades above the
 * stock, red while below (premium/discount is price movement, so the reserved
 * colors apply). Answers "is today's gap normal for this asset?"
 *
 * Desktop additions, both off by default so the phone render is unchanged:
 *   fill   — draw at the pixel size of the wrapper instead of scaling a
 *            360×80 viewBox
 *   scrubT — a time (ms) to mark with a vertical rule, so a hover on the Gap
 *            chart above shows on this pane at the same moment; nothing is
 *            drawn when it falls outside the series
 */
export default function PremiumChart({ premium, fill = false, scrubT = null }) {
  const uid = useId()
  const [size, measureRef] = useFillSize(fill)
  if (premium.length < 2) return null

  const W = size ? size.w : BASE_W
  const H = size ? size.h : BASE_H

  const values = premium.map((p) => p.v)
  let lo = Math.min(0, ...values)
  let hi = Math.max(0, ...values)
  const span = hi - lo
  if (span < MIN_SPAN) {
    const grow = (MIN_SPAN - span) / 2
    lo -= grow
    hi += grow
  }
  const vPad = (hi - lo) * 0.1
  lo -= vPad
  hi += vPad

  const t0 = premium[0].t
  const t1 = premium[premium.length - 1].t
  const x = (t) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - PAD * 2)
  const y = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2)
  const y0 = y(0)
  const path = premium
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')

  const avg = values.reduce((s, v) => s + v, 0) / values.length
  const ruleX = scrubT != null && scrubT >= t0 && scrubT <= t1 ? x(scrubT) : null

  const svg = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={fill ? W : undefined}
      height={fill ? H : undefined}
      className={fill ? 'block' : 'w-full'}
      aria-label="Premium history chart"
    >
      <defs>
        <clipPath id={`${uid}-above`}>
          <rect x="0" y="0" width={W} height={Math.max(y0, 0)} />
        </clipPath>
        <clipPath id={`${uid}-below`}>
          <rect x="0" y={y0} width={W} height={Math.max(H - y0, 0)} />
        </clipPath>
      </defs>
      <line
        x1={PAD}
        x2={W - PAD}
        y1={y0}
        y2={y0}
        className="stroke-zinc-700"
        strokeWidth="1"
        strokeDasharray="3 5"
      />
      {/* The zero axis. Labelled "1:1" everywhere else once, which put a
          ratio in a column of percentages — same unit as the rest of the
          screen now. */}
      <text x={W - PAD} y={Math.max(y0 - 4, 9)} textAnchor="end" fontSize="9" className="fill-zinc-500">
        0%
      </text>
      <path
        d={path}
        fill="none"
        className="stroke-gain"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={`url(#${uid}-above)`}
      />
      <path
        d={path}
        fill="none"
        className="stroke-loss"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={`url(#${uid}-below)`}
      />
      {ruleX != null && (
        <line x1={ruleX} x2={ruleX} y1={PAD} y2={H - PAD} className="stroke-zinc-600" strokeWidth="1" />
      )}
    </svg>
  )

  return (
    <div className={fill ? 'flex h-full flex-col px-2 pt-4' : 'px-2 pt-4'}>
      <div className="flex items-baseline justify-between px-2 pb-1">
        <span className="t-micro text-zinc-500">Gap history</span>
        <span className="num t-caption text-zinc-500">
          avg <span className="text-zinc-300">{formatPct(avg)}</span>
        </span>
      </div>
      {fill ? (
        <div ref={measureRef} className="min-h-0 flex-1">
          {svg}
        </div>
      ) : (
        svg
      )}
    </div>
  )
}
