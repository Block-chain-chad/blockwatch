import { useRef } from 'react'
import { premiumPct, PARITY_BAND, isThinlyTraded } from '../lib/prices'
import { gapCheck, GAP_STATUS_LABEL } from '../lib/gapCheck'
import { SearchIcon, ChevronRight } from './Icons'
import PriceText from './PriceText'
import AssetLogo from './AssetLogo'
import { formatPrice, formatPct, changeColor, EM_DASH } from '../lib/format'
import { delayTooltip } from '../lib/provenance'
import { closedGapLabelFor } from '../lib/sessionCopy'
import ClosedGapMark from './ClosedGapMark'
import { WEB_BASE } from '../services/apiBase'

export { formatPrice, formatPct, changeColor }

/*
 * The premium/discount — the one number nobody else computes, and the reason
 * this app exists. rwa.xyz lists a token's value and its underlying NAV as
 * separate columns and never derives the spread; TradingView promotes exactly
 * one derived figure (their pre-market gap) to its own column and it is the
 * most useful thing on the page. This is ours, so it gets the headline slot.
 *
 * Returns the raw parts so callers can size it for their context.
 */
function usePremium(asset) {
  const p = premiumPct(asset)
  const thin = isThinlyTraded(asset)
  // "Ratio unverified" or "Gap not confirmed" (lib/gapCheck.js): said in
  // words. The 24h change stands in only for NAV funds, which have no share
  // to compare with; anything still waiting for a price or its timestamp
  // shows the loading placeholder, because a 24h change in this slot reads
  // as a gap.
  const check = gapCheck(asset)
  const label = GAP_STATUS_LABEL[check.status] ?? null
  const value = check.status === 'ok' ? p : check.status === 'none' ? asset.dayChange : null
  // Parity hysteresis: with 2.5s live ticks a premium wobbling around the band
  // edge would flip presentation every tick. Enter the signal state only
  // clearly outside the band (1.2x), return to noise only clearly inside
  // (0.8x); hold the previous face in between.
  const parityRef = useRef(null)

  let parity = false
  if (p != null && !thin) {
    const abs = Math.abs(p)
    if (abs < PARITY_BAND * 0.8) parity = true
    else if (abs >= PARITY_BAND * 1.2) parity = false
    else parity = parityRef.current ?? abs < PARITY_BAND
    parityRef.current = parity
  }

  // Colour is REINFORCEMENT for the sign character, never the carrier. Within
  // the parity band, or on a thin market, the gap is noise — so it renders in
  // tertiary text rather than green/red. The unit never changes: previously a
  // parity row showed "1:1" while its neighbours showed "+0.65%", which put
  // two different units in one column and made it unscannable.
  const muted = parity || thin || value == null
  // Only a gap gets the closed-market mark; a NAV fund's 24h change is not one.
  const closed = check.status === 'ok' ? closedGapLabelFor(asset) : null
  return { value, label, muted, thin, closed, color: muted ? 'text-zinc-500' : changeColor(value) }
}

function StatusLabel({ text }) {
  return <span className="t-caption whitespace-nowrap text-zinc-500">{text}</span>
}

export function PremiumValue({ asset, size = 'row', mark = true }) {
  const { value, label, color, closed } = usePremium(asset)
  if (label) return <StatusLabel text={label} />
  if (value == null) {
    return <span className="inline-block h-4 w-14 animate-pulse rounded bg-zinc-800 align-middle" />
  }
  // The premium outranks the prices that produce it — in the table it is the
  // only cell heavier than the row's base weight.
  const cls =
    size === 'lead' ? 't-title' : size === 'table' ? 'text-[15px] font-semibold' : 't-label'
  const figure = <span className={`num ${cls} ${color}`}>{formatPct(value)}</span>
  if (!mark || !closed) return figure
  return (
    <span className="inline-flex items-center gap-2">
      {figure}
      <ClosedGapMark label={closed} stacked />
    </span>
  )
}

/*
 * GapBar — a centred deviation bar. The gap becomes a distance you scan by
 * shape instead of eight numbers you read in sequence. Sorted descending it
 * draws the whole distribution as a wedge.
 *
 * `scale` is the gap at which the bar reaches full width — ±2%, which covers
 * the live range (measured today: 0.07% to 1.96% across a watchlist).
 *
 * The length is SQUARE-ROOT scaled, not linear, and that is a deliberate call
 * made against real data rather than a mockup. Linear at this scale renders a
 * typical 0.25% gap as a 5px stub while one outlier fills the track; linear at
 * a tighter scale pegs everything above ~0.7% so +0.72% and +1.96% become
 * indistinguishable, which destroys the ranking the bar exists to show. Sqrt
 * keeps the mapping monotonic — bigger gap is always a longer bar, so sorting
 * still reads correctly — while giving small gaps enough length to compare.
 * The exact figure is always printed beside it, so the bar is for ranking and
 * the number is for magnitude.
 */
export function GapBar({ pct, thin = false, width = 104, scale = 2, tone = 'direction', height = 4 }) {
  const missing = pct == null || !Number.isFinite(pct)
  const muted = thin || (!missing && Math.abs(pct) < PARITY_BAND)
  const w = missing ? 0 : Math.min(Math.sqrt(Math.abs(pct) / scale), 1) * 50
  const left = missing ? 50 : pct >= 0 ? 50 : 50 - w
  // The Meter's rule carries direction by which side of the tick the fill
  // sits on and by the sign character beside it; the fill is the accent.
  // The phone keeps gain/loss (tone 'direction', the default).
  const fill =
    tone === 'accent' ? 'var(--color-accent)' : pct >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
  return (
    <span
      data-gapbar=""
      className="relative inline-block shrink-0 rounded-[2px]"
      style={{
        width,
        height,
        background: missing ? 'rgb(255 255 255 / 0.04)' : 'rgb(255 255 255 / 0.06)',
      }}
      aria-hidden="true"
    >
      {/* Zero tick, overhanging the track. Sits ABOVE the fill so the origin
          stays findable on a row whose bar starts at centre — at 22% it
          disappeared behind every green fill. */}
      <span
        className="absolute z-10"
        style={{ left: '50%', width: 1, top: -3, bottom: -3, background: 'rgb(255 255 255 / 0.38)' }}
      />
      {!missing && w > 0 && (
        <span
          className="absolute rounded-[2px]"
          style={{
            left: `${left}%`,
            width: `${w}%`,
            top: 0,
            bottom: 0,
            // Inside the parity band or on a thin market the gap is noise, so
            // the bar is hollow rather than filled — present, not asserted.
            background: muted ? 'transparent' : fill,
            boxShadow: muted ? 'inset 0 0 0 1px var(--color-zinc-600)' : undefined,
          }}
        />
      )}
    </span>
  )
}

/* Kept for surfaces that still want the enclosed form (search results). */
export function PremiumPill({ asset }) {
  const { value, label, muted, color, closed } = usePremium(asset)
  if (label) return <StatusLabel text={label} />
  if (value == null) {
    return <span className="inline-block h-3.5 w-12 animate-pulse rounded-full bg-zinc-800 align-middle" />
  }
  const bg = muted ? 'bg-zinc-800' : value > 0 ? 'bg-gain/10' : value < 0 ? 'bg-loss/10' : 'bg-zinc-800'
  const pill = (
    <span className={`num inline-block rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${color}`}>
      {formatPct(value)}
    </span>
  )
  if (!closed) return pill
  return (
    <span className="inline-flex items-center gap-2">
      {pill}
      <ClosedGapMark label={closed} stacked />
    </span>
  )
}

/*
 * 7-day price trend. Deliberately NEUTRAL.
 *
 * It used to be green/red — which put it in the same colour language as the
 * premium badge sitting 20px away, while measuring something entirely
 * different (own price over 7d vs. gap against the underlying, right now). A
 * row could show a green +0.29% premium beside a red line and both were
 * correct. Two meanings, one colour vocabulary, no labels. The premium owns
 * colour now; the trend is context, so it is a plain stroke.
 */
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
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="inline-block">
      <path
        d={d}
        pathLength="1"
        className="spark-draw"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/*
 * Watchlist row, mobile. Premium leads; the two prices that produce it sit
 * beneath as supporting evidence, separated by a thin slash so they read as
 * one quantity rather than two columns.
 *
 * The per-row "STOCK"/"TOKEN" labels are gone — eight rows were reprinting
 * their own column headers sixteen times. Headers belong at the top, once.
 */
/* `delayed` (desktop only; every phone call site omits it) puts TradingView's
   yellow D beside the stock price while the share quote is not live — the
   same badge the chart legend shows on the stock leg. */
export function AssetRow({
  asset,
  onOpen,
  spark,
  marketOpen = true,
  barWidth = 88,
  delayed = false,
}) {
  const thin = isThinlyTraded(asset)
  const { value, closed } = usePremium(asset)
  return (
    <button
      onClick={() => onOpen(asset)}
      className="hover-row flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors active:bg-zinc-900"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <AssetLogo asset={asset} size={32} />
      <div className="min-w-0 flex-1">
        <div className="t-label text-zinc-100">{asset.ticker}</div>
        <div className="t-caption truncate text-zinc-500">
          {asset.name}
          {thin && <span className="text-zinc-500"> · thin</span>}
        </div>
      </div>
      {/* The 7-day stroke is hidden while the market is shut: a week of token
          movement next to a frozen stock leg invites a comparison that isn't
          there. */}
      {spark && marketOpen && (
        <span className="hidden shrink-0 text-zinc-600 min-[360px]:inline">
          <Sparkline points={spark} width={44} height={14} />
        </span>
      )}
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* The closed-market mark needs the room; the bar gives it up. */}
          <GapBar pct={value} thin={thin} width={closed ? Math.min(barWidth, 48) : barWidth} />
          <PremiumValue asset={asset} />
        </div>
        <div className="num t-caption mt-1 text-zinc-500">
          <PriceText value={asset.tokenPrice} />
          <span className="mx-1 text-zinc-600">/</span>
          {asset.underlying ? <PriceText value={asset.stockPrice} /> : EM_DASH}
          {delayed && asset.underlying && (
            <span
              className="ml-1 text-[10px] font-bold leading-none text-amber-400"
              title={delayTooltip()}
            >
              D
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/*
 * Desktop table. At 1440px the app previously rendered as a ~446px column with
 * roughly 80% of the window black — a phone in a void. A wide screen is
 * exactly where this product's comparison finally fits on one line, so it gets
 * a real table: fixed row height, sticky header (DefiLlama's header scrolls
 * away, which is the one thing they get wrong about tables), premium as the
 * widest and boldest column after the ticker.
 */
const COLS =
  'grid-cols-[minmax(170px,1.5fr)_140px_minmax(80px,0.8fr)_minmax(88px,0.9fr)_minmax(88px,0.9fr)_72px_64px]'

export function AssetTableHeader() {
  return (
    <div
      className={`sticky top-0 z-10 grid ${COLS} items-center gap-4 border-b bg-zinc-950 px-4 py-2`}
      style={{ borderColor: 'var(--border-default)' }}
    >
      <span className="t-micro text-zinc-500">Asset</span>
      <span className="t-micro text-zinc-500" />
      <span className="t-micro text-right text-zinc-500">Gap</span>
      <span className="t-micro text-right text-zinc-500">Token</span>
      <span className="t-micro text-right text-zinc-500">Stock</span>
      <span className="t-micro text-right text-zinc-500">7d</span>
      <span className="t-micro text-right text-zinc-500">Chain</span>
    </div>
  )
}

export function AssetTableRow({ asset, onOpen, spark, marketOpen = true }) {
  const thin = isThinlyTraded(asset)
  const { value } = usePremium(asset)
  return (
    <button
      onClick={() => onOpen(asset)}
      className={`hover-row grid ${COLS} w-full items-center gap-4 border-b px-4 text-left transition-colors`}
      style={{ borderColor: 'var(--border-subtle)', height: 'var(--row-h-pointer)' }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <AssetLogo asset={asset} size={22} />
        <span className="t-label shrink-0 text-zinc-100">{asset.ticker}</span>
        <span className="t-caption truncate text-zinc-500">
          {asset.name}
          {thin && <span className="text-zinc-500"> · thin</span>}
        </span>
      </span>
      <span className="flex justify-end">
        <GapBar pct={value} thin={thin} width={132} />
      </span>
      <span className="text-right">
        <PremiumValue asset={asset} size="table" />
      </span>
      <span className="num t-label text-right text-zinc-100">
        <PriceText value={asset.tokenPrice} />
      </span>
      <span className="num t-label text-right text-zinc-400">
        {asset.underlying ? <PriceText value={asset.stockPrice} /> : EM_DASH}
      </span>
      <span className="text-right text-zinc-600">
        {spark && marketOpen ? <Sparkline points={spark} width={64} height={16} /> : null}
      </span>
      <span className="t-caption truncate text-right text-zinc-500">{asset.chain || EM_DASH}</span>
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
    <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {FILTERS.map((f) => {
        const active = value === f.id
        // Squared, not pills — the pill is reserved for status. And the active
        // chip is a bordered surface rather than a filled accent block: a
        // saturated swatch here was the brightest object on the screen,
        // outranking every price on a page whose job is showing prices.
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`t-label shrink-0 rounded-md px-3 py-1.5 transition-colors ${
              active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
            }`}
            style={active ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

/*
 * One control chip in FilterChips' language, for surfaces that build their
 * own rows of them (the chart mode, series, interval and indicator controls
 * on the asset screen). Same squared shape, t-label, bordered surface when
 * active. `swatch` is an optional line colour class, muted rather than
 * hidden when off — the same rule the chart legend follows.
 */
export function Chip({ active, onClick, swatch, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`t-label flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
        active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
      }`}
      style={active ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
    >
      {swatch && <span className={`h-0.5 w-4 rounded ${swatch} ${active ? '' : 'opacity-40'}`} />}
      {children}
    </button>
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
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${onClick ? 'active:bg-zinc-800/60' : ''}`}
    >
      <span className="text-zinc-400">{icon}</span>
      <span className={`flex-1 text-[15px] ${muted ? 'text-zinc-500' : 'text-zinc-100'}`}>{label}</span>
      {value && <span className="text-sm text-zinc-500">{value}</span>}
      {onClick && <ChevronRight size={18} className="text-zinc-600" />}
    </button>
  )
}

export function Disclaimer() {
  return (
    <p className="px-6 pb-4 pt-6 text-center text-[11px] leading-relaxed text-zinc-400">
      Prices are informational only and may be delayed. OnStock does not provide
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
