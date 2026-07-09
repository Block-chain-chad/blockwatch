import { premiumPct, PARITY_BAND, isThinlyTraded } from '../lib/prices'
import { SearchIcon, ChevronRight } from './Icons'
import PriceText from './PriceText'
import { formatPrice, formatPct, changeColor } from '../lib/format'

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

  if (value == null) {
    return (
      <span className="inline-block h-3.5 w-12 animate-pulse rounded-full bg-zinc-800 align-middle" />
    )
  }

  if (p != null && Math.abs(p) < PARITY_BAND && !thin) {
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

/* One watchlist row: ticker + issuer/chain, stock vs. token price, premium pill. */
export function AssetRow({ asset, onOpen }) {
  return (
    <button
      onClick={() => onOpen(asset)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-zinc-900"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-zinc-100">{asset.ticker}</div>
        <div className="truncate text-xs text-zinc-500">
          {asset.issuer} · {asset.chain}
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
    <p className="px-6 pb-4 pt-6 text-center text-[11px] leading-relaxed text-zinc-600">
      Prices are informational only and may be delayed. BlockWatch does not provide
      investment advice. Token market data by CoinGecko.
    </p>
  )
}
