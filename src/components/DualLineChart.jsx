import { formatPrice } from '../lib/format'

const W = 360
const H = 180
const PAD = 6

function linePath(series, x, y) {
  return series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
}

/*
 * The signature visual: real stock vs. token price, overlaid on a shared
 * time + dollar scale so the premium/discount gap is visible at a glance.
 * Token = accent, stock = neutral gray. Series: [{ t, v }].
 */
export default function DualLineChart({ token, stock, loading, error, onRetry }) {
  if (loading) {
    return <div className="mx-1 h-[180px] animate-pulse rounded-2xl bg-zinc-900" />
  }

  if (error || token.length < 2) {
    return (
      <div className="mx-1 flex h-[180px] flex-col items-center justify-center rounded-2xl bg-zinc-900/60 px-6 text-center">
        <p className="text-sm text-zinc-400">
          We couldn't load the chart right now — prices above are still live.
        </p>
        <button
          onClick={onRetry}
          className="mt-3 rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-200 active:bg-zinc-700"
        >
          Try again
        </button>
      </div>
    )
  }

  const all = [...token, ...stock]
  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(...all.map((p) => p.t))
  const vMin = Math.min(...all.map((p) => p.v))
  const vMax = Math.max(...all.map((p) => p.v))
  const vPad = (vMax - vMin || vMax * 0.01 || 1) * 0.08
  const lo = vMin - vPad
  const hi = vMax + vPad

  const x = (t) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - PAD * 2)
  const y = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Stock vs. token price chart">
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={H * f}
          y2={H * f}
          stroke="#27272a"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
      ))}
      <text x={W - PAD} y="12" textAnchor="end" fontSize="10" fill="#52525b">
        {formatPrice(vMax)}
      </text>
      <text x={W - PAD} y={H - 8} textAnchor="end" fontSize="10" fill="#52525b">
        {formatPrice(vMin)}
      </text>
      {stock.length >= 2 && (
        <path
          d={linePath(stock, x, y)}
          fill="none"
          stroke="#71717a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={linePath(token, x, y)}
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
