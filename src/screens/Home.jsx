import { useState } from 'react'
import Header from '../components/Header'
import UpdatedAgo from '../components/UpdatedAgo'
import OnboardingTip from '../components/OnboardingTip'
import { usePrices } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import {
  AssetRow,
  FilterChips,
  filterAssets,
  SearchBar,
  Disclaimer,
  formatPct,
  changeColor,
} from '../components/shared'
import { formatCompact } from '../lib/format'

export default function Home({ onOpenProfile, onOpenAsset, onOpenSearch }) {
  const [filter, setFilter] = useState('all')
  const { assets } = usePrices()
  const { watchlistIds } = useFolders()

  // Home is YOUR watchlist, not the whole universe — the directory lives
  // behind search. Metric cards reflect the watchlist too.
  const watched = assets.filter((a) => watchlistIds.includes(a.id))
  const visible = filterAssets(watched, filter)

  // Avg premium excludes thinly traded assets — one illiquid token printing a
  // wild gap would swing the whole average. (24h-change fallback for when the
  // stock feed is empty applies the same rule.)
  const liquid = watched.filter((a) => !isThinlyTraded(a))
  const premiums = liquid.map(premiumPct).filter((p) => p != null)
  const changes = liquid.map((a) => a.dayChange).filter((c) => c != null)
  const hasPremiums = premiums.length > 0
  const avg = hasPremiums
    ? premiums.reduce((s, p) => s + p, 0) / premiums.length
    : changes.length > 0
      ? changes.reduce((s, c) => s + c, 0) / changes.length
      : null

  // Hero: the whole tracked tokenized market as one number (no user holdings
  // in MVP, so the "portfolio total" slot shows the market itself).
  const capAssets = assets.filter((a) => a.marketCap != null)
  const totalCap = capAssets.reduce((s, a) => s + a.marketCap, 0)
  const weighted = capAssets.filter((a) => a.dayChange != null)
  const weightedCap = weighted.reduce((s, a) => s + a.marketCap, 0)
  const marketChange =
    weightedCap > 0 ? weighted.reduce((s, a) => s + a.dayChange * a.marketCap, 0) / weightedCap : null

  return (
    <div className="pb-24">
      <Header brand onOpenProfile={onOpenProfile} />

      <SearchBar onOpen={onOpenSearch} />

      <div className="px-4 pt-5">
        <div className="text-xs text-zinc-500">Tokenized market value</div>
        {totalCap > 0 ? (
          <>
            <div className="mt-0.5 text-4xl font-semibold tabular-nums tracking-tight">
              {formatCompact(totalCap)}
            </div>
            {marketChange != null && (
              <div className={`mt-1 text-sm font-medium tabular-nums ${changeColor(marketChange)}`}>
                {formatPct(marketChange)} today
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 h-9 w-40 animate-pulse rounded bg-zinc-800" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-4">
        <div className="rounded-2xl bg-zinc-900 p-4">
          <div className="text-xs text-zinc-500">Watching</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{watched.length}</div>
        </div>
        <div className="rounded-2xl bg-zinc-900 p-4">
          <div className="text-xs text-zinc-500">{hasPremiums ? 'Avg premium' : 'Avg 24h change'}</div>
          {avg == null ? (
            <div className="mt-2 h-6 w-16 animate-pulse rounded bg-zinc-800" />
          ) : (
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${changeColor(avg)}`}>
              {formatPct(avg)}
            </div>
          )}
        </div>
      </div>

      <FilterChips value={filter} onChange={setFilter} />

      <OnboardingTip />

      <div className="mt-1 divide-y divide-zinc-900">
        {visible.map((a) => (
          <AssetRow key={a.id} asset={a} onOpen={onOpenAsset} />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">
            {watched.length === 0
              ? 'Your watchlist is empty — add the tokens you care about.'
              : 'Nothing on your watchlist in this category yet.'}
          </p>
          <button
            onClick={onOpenSearch}
            className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 active:bg-accent-dim"
          >
            Search assets
          </button>
        </div>
      )}

      <UpdatedAgo className="px-4 pt-3 text-center" />

      <Disclaimer />
    </div>
  )
}
