import { useMemo, useState } from 'react'
import Header from '../components/Header'
import UpdatedAgo from '../components/UpdatedAgo'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import {
  AssetRow,
  AssetTableHeader,
  AssetTableRow,
  Disclaimer,
  filterAssets,
  FilterChips,
} from '../components/shared'

/*
 * The screener — "which tokens are mispriced right now?"
 *
 * The app tracks 700+ assets and, until now, had no way to ask that question:
 * Home is a hand-picked watchlist and search is lookup-by-name. rwa.xyz has
 * the same blind spot in a more damaging form — they publish a token's value
 * and its underlying NAV as separate columns and never derive the spread, so
 * the one number that matters has to be reconstructed by eye across a
 * 4,000px-wide table. This screen is that derivation, sorted.
 *
 * Sorted by gap and read top-down, the bars form a wedge: the distribution is
 * legible before a single number is read.
 */

const SORTS = [
  { id: 'widest', label: 'Widest gap', hint: 'Furthest from the share price, either direction' },
  { id: 'premium', label: 'Most expensive', hint: 'Token costs the most vs its share' },
  { id: 'discount', label: 'Cheapest', hint: 'Token costs the least vs its share' },
]

// A screener is a ranking, so it has to be honest about what it ranks. Thin
// markets print wild gaps off one stale trade — leaving them in would put junk
// at the top of every sort, which is exactly how the News digest ended up
// publishing "Biggest 24h move: WMKT −47.60%".
const MAX_CREDIBLE_GAP = 25

export default function Screener({ onOpenProfile, onOpenAsset }) {
  const [sort, setSort] = useState('widest')
  const [filter, setFilter] = useState('all')
  const { assets, marketOpen } = usePrices()

  const ranked = useMemo(() => {
    const rows = filterAssets(assets, filter)
      .map((a) => ({ a, p: premiumPct(a), thin: isThinlyTraded(a) }))
      .filter((r) => r.p != null && Math.abs(r.p) <= MAX_CREDIBLE_GAP && !r.thin)
    const by = {
      widest: (x, y) => Math.abs(y.p) - Math.abs(x.p),
      premium: (x, y) => y.p - x.p,
      discount: (x, y) => x.p - y.p,
    }[sort]
    return rows.sort(by).slice(0, 50)
  }, [assets, filter, sort])

  // Only the visible slice needs stock quotes — the registry drives which
  // assets get polled, so ranking 700 must not subscribe to 700.
  useAssetSubscription(
    'screener',
    useMemo(() => ranked.map((r) => r.a.id), [ranked])
  )

  const active = SORTS.find((s) => s.id === sort)

  return (
    <div className="pb-24">
      <Header title="Screener" onOpenProfile={onOpenProfile} />

      <div className="flex gap-2 overflow-x-auto px-4 pt-1 [scrollbar-width:none]">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`t-label shrink-0 rounded-md px-3 py-1.5 transition-colors ${
              sort === s.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
            }`}
            style={sort === s.id ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Say what the ranking means, once, instead of a dismissible card. */}
      <p className="t-caption px-4 pt-2 text-zinc-500">{active.hint}</p>

      <FilterChips value={filter} onChange={setFilter} />

      <div
        className="mt-2 flex items-baseline justify-between border-b px-4 pb-1.5 lg:hidden"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">{ranked.length} assets</span>
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>

      <div className="lg:hidden">
        {ranked.map(({ a }) => (
          <AssetRow key={a.id} asset={a} onOpen={onOpenAsset} marketOpen={marketOpen} />
        ))}
      </div>

      <div className="hidden lg:block">
        {ranked.length > 0 && <AssetTableHeader />}
        {ranked.map(({ a }) => (
          <AssetTableRow key={a.id} asset={a} onOpen={onOpenAsset} marketOpen={marketOpen} />
        ))}
      </div>

      {ranked.length === 0 && (
        <p className="t-body px-6 py-12 text-center text-zinc-400">
          No gaps to rank yet — prices are still loading.
        </p>
      )}

      <UpdatedAgo className="px-4 pt-3 text-center" />
      <Disclaimer />
    </div>
  )
}
