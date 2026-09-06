import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { AssetRow } from './shared'

/**
 * The watchlist as a sidebar, for the desktop asset screen. Same phone
 * AssetRow the Home list uses — the desktop table row's grid needs ~830px,
 * which is more than a sidebar can give it. No chips, search, session line or
 * error surface: this pane is for moving between assets, not for finding them.
 *
 * The subscription key differs from Home's 'home-watchlist' on purpose:
 * PricesContext keeps a Map per key, so both screens can be mounted at once.
 */
export default function WatchlistPane({ currentId, onOpen }) {
  const { assets, marketOpen } = usePrices()
  const { watchlistIds } = useFolders()
  useAssetSubscription('detail-watchlist', watchlistIds)
  const sparks = useSparklines(watchlistIds)
  const watched = assets.filter((a) => watchlistIds.includes(a.id))

  if (watched.length === 0) {
    return (
      <p className="t-caption px-4 py-6 text-zinc-500">
        Your watchlist is empty — add the tokens you care about.
      </p>
    )
  }

  return (
    <>
      <div
        className="flex items-baseline justify-between border-b px-4 pb-1.5 pt-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Watchlist</span>
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>
      {watched.map((a) => (
        <div
          key={a.id}
          aria-current={a.id === currentId ? 'true' : undefined}
          className={a.id === currentId ? 'bg-zinc-900' : undefined}
        >
          <AssetRow asset={a} onOpen={onOpen} spark={sparks[a.id]} marketOpen={marketOpen} />
        </div>
      ))}
    </>
  )
}
