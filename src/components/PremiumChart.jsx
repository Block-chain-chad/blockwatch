import { useId } from 'react'
import { formatPct } from '../lib/format'

const W = 360
const H = 80
const PAD = 6
// Never zoom tighter than this total span (%), or parity-hugging tokens would
// render their basis-point jitter as wild swings.
const MIN_SPAN = 0.3

/*
 * Premium history: the % gap between token and stock over the selected range.
 * One line around a dashed 1:1 axis — green while the token trades above the
 * stock, red while below (premium/discount is price movement, so the reserved
 * colors apply). Answers "is today's gap normal for this asset?"
 */
export default function PremiumChart({ premium }) {
  const uid = useId()
  if (premium.length < 2) return null

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

  return (
    <div className="px-2 pt-4">
      <div className="flex items-baseline justify-between px-2 pb-1">
        <span className="text-xs font-medium text-zinc-500">Premium history</span>
        <span className="text-xs tabular-nums text-zinc-500">
          avg <span className="text-zinc-300">{formatPct(avg)}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Premium history chart">
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
          stroke="#3f3f46"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <text x={W - PAD} y={Math.max(y0 - 4, 9)} textAnchor="end" fontSize="9" fill="#52525b">
          1:1
        </text>
        <path
          d={path}
          fill="none"
          stroke="#34d399"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${uid}-above)`}
        />
        <path
          d={path}
          fill="none"
          stroke="#f87171"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${uid}-below)`}
        />
      </svg>
    </div>
  )
}
