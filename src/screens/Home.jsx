import { useState } from 'react'
import Header from '../components/Header'
import UpdatedAgo from '../components/UpdatedAgo'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import {
  AssetRow,
  AssetTableHeader,
  AssetTableRow,
  FilterChips,
  filterAssets,
  SearchBar,
  Disclaimer,
  formatPct,
  changeColor,
} from '../components/shared'

/*
 * Overnight session strip: while the US market sleeps, tokens keep trading —
 * the biggest drift vs last close is the story only this app can tell.
 * Hidden entirely during market hours.
 */
function SessionLine({ onOpenAsset }) {
  const { assets, marketOpen } = usePrices()

  // A rule with a state dot, not a card. This was an indigo gradient panel
  // with a moon glyph — the heaviest object above the list, and a gradient
  // surface besides, which the system bans. The session is a fact about the
  // data, so it reads as a caption on the list rather than an announcement.
  const dot = (
    <span
      className="mt-[5px] size-1.5 shrink-0 rounded-full"
      style={{ background: marketOpen ? 'var(--color-session-open)' : 'var(--color-session-overnight)' }}
    />
  )

  if (marketOpen) {
    return (
      <div
        className="mx-4 mt-3.5 flex items-start gap-2 border-b pb-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {dot}
        <span className="t-caption text-zinc-400">
          US market open — both sides live, so the gap is a real spread right now.
        </span>
      </div>
    )
  }

  // Sanity band: no real tokenized stock drifts 20% overnight — bigger gaps
  // are stale prints on illiquid tokens, not a story worth telling.
  const candidates = assets
    .filter((a) => !isThinlyTraded(a))
    .map((a) => ({ asset: a, p: premiumPct(a) }))
    .filter((x) => x.p != null && Math.abs(x.p) >= 0.15 && Math.abs(x.p) <= 20)
  const top = candidates.length
    ? candidates.reduce((m, x) => (Math.abs(x.p) > Math.abs(m.p) ? x : m))
    : null

  return (
    <div
      className="mx-4 mt-3.5 flex items-start gap-2 border-b pb-2.5"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {dot}
      <span className="t-caption flex-1 text-zinc-400">
        Overnight — the market is shut, tokens still trade.
      </span>
      {top && (
        <button onClick={() => onOpenAsset(top.asset)} className="t-caption shrink-0 text-right">
          <span className="text-zinc-500">Widest gap </span>
          <span className="font-medium text-zinc-300">{top.asset.ticker}</span>{' '}
          <span className={`num font-medium ${changeColor(top.p)}`}>{formatPct(top.p)}</span>
        </button>
      )}
    </div>
  )
}

export default function Home({ onOpenProfile, onOpenAsset, onOpenSearch }) {
  const [filter, setFilter] = useState('all')
  const { assets, marketOpen } = usePrices()
  const { watchlistIds } = useFolders()

  // Watchlist rows need stock quotes for their premium pills — quotes only
  // flow for subscribed assets.
  useAssetSubscription('home-watchlist', watchlistIds)
  const sparks = useSparklines(watchlistIds)

  // Home is YOUR watchlist, not the whole universe — the directory lives
  // behind search.
  const watched = assets.filter((a) => watchlistIds.includes(a.id))
  const visible = filterAssets(watched, filter)

  return (
    <div className="pb-24">
      <Header brand onOpenProfile={onOpenProfile} />

      <SearchBar onOpen={onOpenSearch} />

      {/* The overnight strip is the one thing above the list, because it is the
          only story this app can tell that a stock tracker cannot: the token
          kept trading while the market slept. Everything else that used to sit
          here — the market-cap hero, the Watching/Avg-premium cards, the
          permanent explainer — pushed the first price 536px down an 844px
          screen. None of them drove a decision. */}
      <SessionLine onOpenAsset={onOpenAsset} />

      <FilterChips value={filter} onChange={setFilter} />

      {/* Column labels, printed once, replacing the per-row STOCK/TOKEN pairs
          and the dismissible card that used to explain the badge. */}
      <div
        className="mt-2 flex items-baseline justify-between border-b px-4 pb-1.5 lg:hidden"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Asset</span>
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>

      <div className="lg:hidden">
        {visible.map((a) => (
          <AssetRow
            key={a.id}
            asset={a}
            onOpen={onOpenAsset}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
          />
        ))}
      </div>

      <div className="hidden lg:block">
        {visible.length > 0 && <AssetTableHeader />}
        {visible.map((a) => (
          <AssetTableRow
            key={a.id}
            asset={a}
            onOpen={onOpenAsset}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
          />
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
