import { useRef, useState } from 'react'
import { formatPrice, formatPct, changeColor } from '../lib/format'

const W = 360
const H = 180
const PAD = 6

function linePath(series, x, y) {
  return series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
}

function nearest(series, t) {
  if (series.length === 0) return null
  let best = series[0]
  let bestDist = Math.abs(t - best.t)
  for (const p of series) {
    const d = Math.abs(p.t - t)
    if (d < bestDist) {
      best = p
      bestDist = d
    }
  }
  return best
}

/*
 * The signature visual: real stock vs. token price, overlaid on a shared
 * time + dollar scale so the premium/discount gap is visible at a glance.
 * Token = accent, stock = neutral gray. Series: [{ t, v }].
 *
 * Scrubbing: drag (touch) or hover (mouse) to inspect any moment — a
 * crosshair snaps to the nearest data points and the readout above shows
 * both prices plus the gap at that time.
 */
export default function DualLineChart({
  token,
  stock,
  premium = [],
  loading,
  error,
  onRetry,
  onScrub,
  showToken = true,
  showStock = true,
}) {
  const svgRef = useRef(null)
  const [scrubT, setScrubT] = useState(null)

  if (loading) {
    return <div className="mx-1 h-[204px] animate-pulse rounded-2xl bg-zinc-900" />
  }

  if (error) {
    return (
      <div className="mx-1 flex h-[204px] flex-col items-center justify-center rounded-2xl bg-zinc-900/60 px-6 text-center">
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

  // Fetch succeeded but there's nothing to draw: the token simply didn't
  // trade enough in this window. Truth beats a fake error — and the range
  // pills sit right below this box.
  if (token.length < 2) {
    return (
      <div className="mx-1 flex h-[204px] flex-col items-center justify-center rounded-2xl bg-zinc-900/60 px-6 text-center">
        <p className="text-sm text-zinc-400">
          Not enough trading activity to chart this range — this token trades
          thinly. Try a longer range below.
        </p>
      </div>
    )
  }

  const tokenVisible = showToken
  const stockVisible = showStock && stock.length >= 2
  // Scale to the visible lines only — hiding one zooms into the other.
  const scaled = [...(tokenVisible ? token : []), ...(stockVisible ? stock : [])]
  const all = scaled.length >= 2 ? scaled : token
  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(...all.map((p) => p.t))
  const vMin = Math.min(...all.map((p) => p.v))
  const vMax = Math.max(...all.map((p) => p.v))
  const vPad = (vMax - vMin || vMax * 0.01 || 1) * 0.08
  const lo = vMin - vPad
  const hi = vMax + vPad

  const x = (t) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - PAD * 2)
  const y = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2)

  function timeFromPointer(clientX) {
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((clientX - rect.left) / rect.width) * W
    const frac = Math.min(1, Math.max(0, (vx - PAD) / (W - PAD * 2)))
    return t0 + frac * (t1 - t0)
  }

  // Robinhood-style: the scrub also drives the parent's headline price.
  // Emitted from the pointer path (not an effect) so hook order stays clean
  // above the early returns.
  function updateScrub(t) {
    setScrubT(t)
    if (!onScrub) return
    if (t == null) return onScrub(null)
    const st = token.length > 0 ? nearest(token, t) : null
    onScrub(st ? { price: st.v, t: st.t } : null)
  }

  const scrubToken = scrubT != null && tokenVisible ? nearest(token, scrubT) : null
  const scrubStock = scrubT != null && stockVisible ? nearest(stock, scrubT) : null
  const scrubGap = scrubT != null && premium.length > 0 ? nearest(premium, scrubT) : null
  const scrubAnchor = scrubToken ?? scrubStock
  const showClock = t1 - t0 <= 8 * 86_400_000 // intraday-ish ranges get a time of day
  // Display times snap to clean 5-minute marks (data samples land on odd minutes).
  const scrubLabel =
    scrubAnchor &&
    new Date(showClock ? Math.round(scrubAnchor.t / 300_000) * 300_000 : scrubAnchor.t).toLocaleString(
      'en-US',
      showClock
        ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        : { month: 'short', day: 'numeric', year: 'numeric' }
    )

  return (
    <div>
      {/* Readout row: fixed height so scrubbing never shifts layout */}
      <div className="flex h-5 items-center justify-between px-2 text-[11px] tabular-nums">
        {scrubAnchor ? (
          <>
            <span className="text-zinc-500">{scrubLabel}</span>
            {scrubToken && (
              <span className="flex items-center gap-1 text-zinc-200">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {formatPrice(scrubToken.v)}
              </span>
            )}
            {scrubStock && (
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                {formatPrice(scrubStock.v)}
              </span>
            )}
            {scrubGap && (
              <span className={changeColor(scrubGap.v)}>{formatPct(scrubGap.v)}</span>
            )}
          </>
        ) : (
          <span className="text-zinc-700">Touch and hold the chart to inspect</span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        aria-label="Stock vs. token price chart"
        onPointerDown={(e) => updateScrub(timeFromPointer(e.clientX))}
        onPointerMove={(e) => updateScrub(timeFromPointer(e.clientX))}
        onPointerUp={() => updateScrub(null)}
        onPointerLeave={() => updateScrub(null)}
        onPointerCancel={() => updateScrub(null)}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H * f}
            y2={H * f}
            className="stroke-zinc-800"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}
        <text x={W - PAD} y="12" textAnchor="end" fontSize="10" className="fill-zinc-600">
          {formatPrice(vMax)}
        </text>
        <text x={W - PAD} y={H - 8} textAnchor="end" fontSize="10" className="fill-zinc-600">
          {formatPrice(vMin)}
        </text>
        {stockVisible && (
          <path
            key={`s-${stock.length}-${stock[0]?.t ?? 0}`}
            d={linePath(stock, x, y)}
            pathLength="1"
            fill="none"
            className="chart-draw stroke-zinc-500"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {tokenVisible && (
          <path
            key={`t-${token.length}-${token[0]?.t ?? 0}`}
            d={linePath(token, x, y)}
            pathLength="1"
            fill="none"
            className="chart-draw stroke-accent"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {scrubAnchor && (
          <>
            <line
              x1={x(scrubAnchor.t)}
              x2={x(scrubAnchor.t)}
              y1={PAD}
              y2={H - PAD}
              className="stroke-zinc-600"
              strokeWidth="1"
            />
            {scrubStock && (
              <circle cx={x(scrubStock.t)} cy={y(scrubStock.v)} r="3.5" className="fill-zinc-500" />
            )}
            {scrubToken && (
              <circle cx={x(scrubToken.t)} cy={y(scrubToken.v)} r="3.5" className="fill-accent" />
            )}
          </>
        )}
      </svg>
    </div>
  )
}
