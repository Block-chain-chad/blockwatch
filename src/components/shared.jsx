import { useRef } from 'react'
import { premiumPct, PARITY_BAND, isThinlyTraded } from '../lib/prices'
import { SearchIcon, ChevronRight } from './Icons'
import PriceText from './PriceText'
import AssetLogo from './AssetLogo'
import { formatPrice, formatPct, changeColor } from '../lib/format'
import { WEB_BASE } from '../services/apiBase'

export { formatPrice, formatPct, changeColor }

/*
 * Premium/discount pill: green premium, red discount, gray "1:1" parity.
 * NAV-based assets (no premium possible) fall back to the token's live 24h
 * change. Thinly traded assets render muted — their gap is noise, and painting
 * it green/red would present it as signal.
 */
export function PremiumPill({ asset }) {
  const p = premiumPct(asset)
  const thin = isThinlyTraded(asset)
  const value = p ?? asset.dayChange
  // Parity hysteresis: with 2.5s live ticks, a premium wobbling around the
  // band edge would flip "1:1" <-> "+0.06%" every tick. Enter the colored
  // state only clearly outside the band (1.2x), return to 1:1 only clearly
  // inside (0.8x); hold the previous face in between.
  const parityRef = useRef(null)

  if (value == null) {
    return (
      <span className="inline-block h-3.5 w-12 animate-pulse rounded-full bg-zinc-800 align-middle" />
    )
  }

  let showParity = false
  if (p != null && !thin) {
    const abs = Math.abs(p)
    if (abs < PARITY_BAND * 0.8) showParity = true
    else if (abs >= PARITY_BAND * 1.2) showParity = false
    else showParity = parityRef.current ?? abs < PARITY_BAND
    parityRef.current = showParity
  }

  if (showParity) {
    return (
      <span className="inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-400">
        1:1
      </span>
    )
  }

  const cls = thin
    ? 'bg-zinc-800 text-zinc-500'
    : value > 0
      ? 'bg-gain/10 text-gain'
      : value < 0
        ? 'bg-loss/10 text-loss'
        : 'bg-zinc-800 text-zinc-400'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${cls}`}>
      {formatPct(value)}
    </span>
  )
}

/* 7-day price sparkline: a single colored stroke, direction by first-vs-last.
   Pure decoration — rows render identically without data. */
export function Sparkline({ points, width = 56, height = 14 }) {
  if (!Array.isArray(points) || points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const d = points
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - 1 - ((v - min) / range) * (height - 2)).toFixed(1)}`
    )
    .join('')
  const up = points[points.length - 1] >= points[0]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="inline-block">
      <path
        d={d}
        pathLength="1"
        className="spark-draw"
        fill="none"
        stroke={up ? 'var(--color-gain)' : 'var(--color-loss)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

/* One watchlist row: logo, ticker + company name, stock vs. token price, premium pill.
   Company name over chain jargon in the primary view — recognition first. */
export function AssetRow({ asset, onOpen, spark }) {
  return (
    <button
      onClick={() => onOpen(asset)}
      className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors active:bg-zinc-900"
    >
      <AssetLogo asset={asset} size={34} />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-zinc-100">{asset.ticker}</div>
        <div className="truncate text-xs text-zinc-500">
          {asset.name} · {asset.issuer}
          {isThinlyTraded(asset) && <span className="text-zinc-600"> · thin trading</span>}
        </div>
      </div>
      <div className="w-[72px] text-right">
        <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Stock</div>
        <div className="text-[13px] text-zinc-300">
          {asset.underlying ? <PriceText value={asset.stockPrice} /> : '—'}
        </div>
      </div>
      <div className="w-[72px] text-right">
        <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Token</div>
        <div className="text-[13px] font-medium text-zinc-100">
          <PriceText value={asset.tokenPrice} />
        </div>
      </div>
      <div className="w-[64px] text-right">
        <PremiumPill asset={asset} />
        {spark && (
          <div className="mt-1">
            <Sparkline points={spark} />
          </div>
        )}
      </div>
    </button>
  )
}

/* Filter chips: All / Stocks / ETFs / Bonds. Accent only on the active chip. */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'stock', label: 'Stocks' },
  { id: 'etf', label: 'ETFs' },
  { id: 'bond', label: 'Bonds' },
]

export function FilterChips({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {FILTERS.map((f) => {
        const active = value === f.id
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              active
                ? 'bg-accent text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 active:bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

export function filterAssets(list, filter) {
  return filter === 'all' ? list : list.filter((a) => a.type === filter)
}

/* Tappable search bar (opens the search overlay). */
export function SearchBar({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="mx-4 flex items-center gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-left transition-colors active:bg-zinc-800"
    >
      <SearchIcon size={18} className="text-zinc-500" />
      <span className="text-sm text-zinc-500">Search tickers or companies</span>
    </button>
  )
}

/* Settings-style list row used in the profile sheet. */
export function ListRow({ icon, label, value, onClick, muted }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-zinc-800/60"
    >
      <span className="text-zinc-400">{icon}</span>
      <span className={`flex-1 text-[15px] ${muted ? 'text-zinc-500' : 'text-zinc-100'}`}>{label}</span>
      {value && <span className="text-sm text-zinc-500">{value}</span>}
      <ChevronRight size={18} className="text-zinc-600" />
    </button>
  )
}

export function Disclaimer() {
  return (
    <p className="px-6 pb-4 pt-6 text-center text-[11px] leading-relaxed text-zinc-400">
      Prices are informational only and may be delayed. BlockWatch does not provide
      investment advice. Token market data by CoinGecko.{' '}
      <a
        href={`${WEB_BASE}/privacy.html`}
        target="_blank"
        rel="noopener"
        className="underline decoration-zinc-700 underline-offset-2"
      >
        Privacy
      </a>
    </p>
  )
}
