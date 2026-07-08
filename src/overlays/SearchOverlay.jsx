import { useEffect, useState } from 'react'
import { popularSearches, recentlyTokenized } from '../data/mock'
import { usePrices } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { track } from '../services/analytics'
import { SearchIcon, PlusIcon, CheckCircleIcon } from '../components/Icons'

/*
 * Search over the tokenized-asset universe.
 * Default mode: tap a result to open its detail screen.
 * Picker mode (pickerFolderId set): taps toggle folder membership instead —
 * used by "Add assets" inside a folder.
 */
export default function SearchOverlay({ onClose, onOpenAsset, pickerFolderId = null }) {
  const [query, setQuery] = useState('')
  const { assets } = usePrices()
  const { folders, toggleAssetInFolder } = useFolders()
  const pickerFolder = pickerFolderId ? folders.find((f) => f.id === pickerFolderId) : null

  const q = query.trim().toLowerCase()
  const results = q
    ? assets.filter(
        (a) =>
          a.ticker.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.underlying && a.underlying.toLowerCase().includes(q))
      )
    : null

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

  function rowAction(asset) {
    if (!asset) return
    if (pickerFolder) {
      toggleAssetInFolder(pickerFolder.id, asset.id)
    } else {
      onOpenAsset(asset)
    }
  }

  function RowIcon({ asset }) {
    if (!asset) return null
    if (pickerFolder) {
      return pickerFolder.assetIds.includes(asset.id) ? (
        <CheckCircleIcon size={22} className="text-accent" />
      ) : (
        <span className="h-[22px] w-[22px] rounded-full border border-zinc-700" />
      )
    }
    return <PlusIcon size={18} className="text-accent" />
  }

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-zinc-950">
      {pickerFolder && (
        <div className="px-4 pt-4 text-sm font-medium text-zinc-400">
          Add to <span className="text-zinc-100">{pickerFolder.name}</span>
        </div>
      )}
      <div className={`flex items-center gap-3 px-4 pb-3 ${pickerFolder ? 'pt-2' : 'pt-5'}`}>
        <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2.5">
          <SearchIcon size={18} className="text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickers or companies"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
        </div>
        <button onClick={onClose} className="text-[15px] text-accent active:opacity-60">
          {pickerFolder ? 'Done' : 'Cancel'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {results === null ? (
          <>
            <h3 className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Popular
            </h3>
            <div className="divide-y divide-zinc-900">
              {popularSearches.map((t) => {
                const asset = assets.find((a) => a.underlying === t)
                return (
                  <button
                    key={t}
                    onClick={() => rowAction(asset)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-zinc-900"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">{asset ? asset.ticker : t}</div>
                      <div className="text-xs text-zinc-500">
                        {asset ? `${asset.name} — ${asset.issuer}, ${asset.chain}` : ''}
                      </div>
                    </div>
                    <RowIcon asset={asset} />
                  </button>
                )
              })}
            </div>

            <h3 className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Recently tokenized
            </h3>
            <div className="divide-y divide-zinc-900">
              {recentlyTokenized.map((r) => {
                const asset = assets.find((a) => a.underlying === r.ticker)
                return (
                  <button
                    key={r.ticker}
                    onClick={() => rowAction(asset)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-zinc-900"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">
                        {asset ? asset.ticker : r.ticker}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {r.name} — {r.issuer}, {r.chain}
                      </div>
                    </div>
                    <RowIcon asset={asset} />
                  </button>
                )
              })}
            </div>
          </>
        ) : results.length > 0 ? (
          <div className="divide-y divide-zinc-900 pt-2">
            {results.map((a) => (
              <button
                key={a.id}
                onClick={() => rowAction(a)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{a.ticker}</div>
                  <div className="text-xs text-zinc-500">
                    {a.name} — {a.issuer}, {a.chain}
                  </div>
                </div>
                <RowIcon asset={a} />
              </button>
            ))}
          </div>
        ) : (
          <div className="px-6 pt-12 text-center">
            <p className="text-sm text-zinc-400">
              No tokenized version of “{query}” yet.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
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
