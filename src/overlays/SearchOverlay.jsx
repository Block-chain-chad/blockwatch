import { useEffect, useState } from 'react'
import { popularSearches } from '../data/mock'
import { usePrices } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { track } from '../services/analytics'
import { fetchNewListings } from '../services/coingecko'
import { ASSET_IDS } from '../data/universe'
import { formatPrice, formatPct, changeColor } from '../lib/format'
import { isThinlyTraded } from '../lib/prices'
import { getRecentViews } from '../lib/recentViews'
import { SearchIcon, PlusIcon, CheckCircleIcon, CloseIcon } from '../components/Icons'
import AssetLogo from '../components/AssetLogo'

// Ranked matching: exact ticker beats prefix beats substring, and ticker
// matches beat name matches — in a 700-asset universe "MU" must surface the
// MU tokens, not everything containing those letters. Ties keep universe
// order (volume), so liquid versions rise.
function searchScore(a, q) {
  const ticker = a.ticker.toLowerCase()
  const und = a.underlying?.toLowerCase() ?? ''
  const name = a.name.toLowerCase()
  if (ticker === q || und === q) return 5
  if (ticker.startsWith(q) || und.startsWith(q)) return 4
  if (name.startsWith(q)) return 3
  if (ticker.includes(q) || und.includes(q)) return 2
  if (name.includes(q)) return 1
  return 0
}

// Popular shortcuts pick one version per underlying: prefer a liquid xStocks
// listing (the branding shown all over the app), then any liquid version,
// then whatever exists.
function popularPick(assets, underlying) {
  const candidates = assets.filter((a) => a.underlying === underlying)
  return (
    candidates.find((a) => a.issuer === 'xStocks' && !isThinlyTraded(a)) ??
    candidates.find((a) => !isThinlyTraded(a)) ??
    candidates[0]
  )
}

/*
 * Search over the tokenized-asset universe (Home shows only your watchlist;
 * this is where the full directory lives).
 * Default mode: tap a row for its detail; the trailing icon adds/removes it
 * from your watchlist.
 * Picker mode (pickerFolderId set): the whole row toggles folder membership —
 * used by "Add assets" inside a folder.
 */

function ResultRow({ asset, fallbackTicker, subtitle, changePct, pickerFolder, watchlistIds, toggle, onOpen }) {
  const included = asset
    ? pickerFolder
      ? pickerFolder.assetIds.includes(asset.id)
      : watchlistIds.includes(asset.id)
    : false
  const icon = included ? (
    <CheckCircleIcon size={22} className="text-accent" />
  ) : pickerFolder ? (
    <span className="h-[22px] w-[22px] rounded-full border border-zinc-700" />
  ) : (
    <PlusIcon size={20} className="text-accent" />
  )
  const body = (
    <>
      {asset && <AssetLogo asset={asset} size={32} />}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{asset ? asset.ticker : fallbackTicker}</div>
        <div className="truncate text-xs text-zinc-500">{subtitle}</div>
      </div>
      {asset?.tokenPrice != null && (
        <div className="shrink-0 text-right">
          <div className="text-[13px] tabular-nums text-zinc-300">{formatPrice(asset.tokenPrice)}</div>
          {changePct != null && (
            <div className={`text-[11px] tabular-nums ${changeColor(changePct)}`}>
              {formatPct(changePct)}
            </div>
          )}
        </div>
      )}
    </>
  )

  // Picker mode: whole row toggles. Default mode: body opens detail, icon toggles watchlist.
  if (pickerFolder) {
    return (
      <button
        onClick={() => asset && toggle(asset)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left active:bg-zinc-900"
      >
        {body}
        {asset && icon}
      </button>
    )
  }
  return (
    <div className="flex items-stretch">
      <button
        onClick={() => asset && onOpen(asset)}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-left active:bg-zinc-900"
      >
        {body}
      </button>
      {asset && (
        <button
          onClick={() => toggle(asset)}
          aria-label={included ? `Remove ${asset.ticker} from watchlist` : `Add ${asset.ticker} to watchlist`}
          className="flex items-center px-4 transition-colors active:bg-zinc-900"
        >
          {icon}
        </button>
      )}
    </div>
  )
}

export default function SearchOverlay({ onClose, onOpenAsset, pickerFolderId = null }) {
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const { assets } = usePrices()
  const { folders, watchlistIds, toggleWatchlist, toggleAssetInFolder } = useFolders()
  const pickerFolder = pickerFolderId ? folders.find((f) => f.id === pickerFolderId) : null

  // Live discovery: issuer-category tokens we don't track yet.
  useEffect(() => {
    if (pickerFolderId) return
    let cancelled = false
    fetchNewListings(ASSET_IDS).then((rows) => {
      if (!cancelled) setListings(rows)
    })
    return () => {
      cancelled = true
    }
  }, [pickerFolderId])

  const q = query.trim().toLowerCase()
  const results = q
    ? assets
        .map((a) => [searchScore(a, q), a])
        .filter(([score]) => score > 0)
        .sort((x, y) => y[0] - x[0])
        .map(([, a]) => a)
    : null

  // Empty state: what this device looked at recently, above the Popular list.
  const recent = q
    ? []
    : getRecentViews()
        .map((id) => assets.find((a) => a.id === id))
        .filter(Boolean)

  // Biggest liquid 24h movers — discovery for a 700-asset universe. Data only
  // exists for polled assets (core by cap + subscribed), which is exactly the
  // liquid slice worth surfacing anyway.
  const movers = q
    ? []
    : assets
        .filter((a) => a.dayChange != null && a.tokenPrice != null && !isThinlyTraded(a))
        .sort((x, y) => Math.abs(y.dayChange) - Math.abs(x.dayChange))
        .slice(0, 5)

  // Log settled searches (debounced). Misses are market intelligence — they
  // tell us what people want tokenized next.
  useEffect(() => {
    if (!q || q.length < 2) return
    const t = setTimeout(() => {
      if (results.length > 0) track('search', { query: q, results: results.length })
      else track('search_miss', { query: q })
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const toggle = pickerFolder
    ? (asset) => toggleAssetInFolder(pickerFolder.id, asset.id)
    : (asset) => toggleWatchlist(asset.id)

  const rowProps = { pickerFolder, watchlistIds, toggle, onOpen: onOpenAsset }

  return (
    <div className="overlay-in fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-zinc-950">
      {pickerFolder && (
        <div className="px-4 pt-4 text-sm font-medium text-zinc-400">
          Add to <span className="text-zinc-100">{pickerFolder.name}</span>
        </div>
      )}
      <div className={`flex items-center gap-3 px-4 pb-3 ${pickerFolder ? 'pt-2' : 'pt-5'}`}>
        <form
          className="flex flex-1 items-center gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2.5"
          onSubmit={(e) => {
            // Enter (or the keyboard's Go) opens the top hit.
            e.preventDefault()
            if (!pickerFolder && results?.length > 0) onOpenAsset(results[0])
          }}
        >
          <SearchIcon size={18} className="text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickers or companies"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="-mr-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-zinc-500 active:text-zinc-300"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </form>
        <button onClick={onClose} className="text-[15px] text-accent active:opacity-60">
          {pickerFolder ? 'Done' : 'Cancel'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {results === null ? (
          <>
            {recent.length > 0 && (
              <>
                <h3 className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Recently viewed
                </h3>
                <div className="divide-y divide-zinc-900">
                  {recent.map((a) => (
                    <ResultRow
                      key={a.id}
                      asset={a}
                      subtitle={`${a.name} — ${a.issuer}${a.chain ? `, ${a.chain}` : ''}`}
                      {...rowProps}
                    />
                  ))}
                </div>
              </>
            )}
            {movers.length > 0 && (
              <>
                <h3 className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Top movers (24h)
                </h3>
                <div className="divide-y divide-zinc-900">
                  {movers.map((a) => (
                    <ResultRow
                      key={a.id}
                      asset={a}
                      subtitle={`${a.name} — ${a.issuer}${a.chain ? `, ${a.chain}` : ''}`}
                      changePct={a.dayChange}
                      {...rowProps}
                    />
                  ))}
                </div>
              </>
            )}
            <h3 className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Popular
            </h3>
            <div className="divide-y divide-zinc-900">
              {popularSearches.map((t) => {
                const asset = popularPick(assets, t)
                return (
                  <ResultRow
                    key={t}
                    asset={asset}
                    fallbackTicker={t}
                    subtitle={
                      asset
                        ? `${asset.name} — ${asset.issuer}${asset.chain ? `, ${asset.chain}` : ''}`
                        : ''
                    }
                    {...rowProps}
                  />
                )
              })}
            </div>

            {listings.length > 0 && (
              <>
                <h3 className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Recently tokenized
                </h3>
                <div className="divide-y divide-zinc-900">
                  {listings.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold">{l.ticker}</div>
                        <div className="truncate text-xs text-zinc-500">
                          {l.name} — {l.issuer}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] tabular-nums text-zinc-300">
                          {formatPrice(l.price)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                          tracking soon
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : results.length > 0 ? (
          <div className="divide-y divide-zinc-900 pt-2">
            {results.map((a) => (
              <ResultRow
                key={a.id}
                asset={a}
                subtitle={`${a.name} — ${a.issuer}${a.chain ? `, ${a.chain}` : ''}`}
                {...rowProps}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 pt-12 text-center">
            <p className="text-sm text-zinc-400">
              No tokenized version of “{query}” yet.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              We track new listings daily — try one of these in the meantime.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {popularSearches.map((t) => (
                <button
                  key={t}
                  onClick={() => setQuery(t)}
                  className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-zinc-300 active:bg-zinc-800"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
