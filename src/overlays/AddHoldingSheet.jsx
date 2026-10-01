import { useState } from 'react'
import Sheet, { SheetTitle } from '../components/Sheet'
import AssetLogo from '../components/AssetLogo'
import { AmountForm } from '../components/HoldingParts'
import { ChevronLeft, SearchIcon } from '../components/Icons'
import { usePrices } from '../state/PricesContext'
import { useHoldings } from '../state/HoldingsContext'
import { rankAssets, assetSubtitle } from '../lib/search'
import { isAddable, HOLDINGS_LIMIT } from '../lib/holdings'

const MAX_RESULTS = 8

/*
 * Add a holding: find the token, then type the amount. Only tokens whose
 * amount Onstock can check are offered (lib/holdings isAddable). A token
 * already on the list is not added twice: `onExisting` opens its sheet to
 * change the amount instead.
 */
export default function AddHoldingSheet({ onClose, onExisting }) {
  const { holdings, add } = useHoldings()
  const { assets } = usePrices()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)

  const held = (id) => holdings.some((h) => h.assetId === id)
  const matches = rankAssets(assets, query)
  const addable = matches.filter(isAddable).slice(0, MAX_RESULTS)

  function pick(asset) {
    if (held(asset.id)) {
      onClose()
      onExisting(asset.id)
    } else setPicked(asset)
  }

  function submit(amount) {
    const result = add(picked.id, amount)
    onClose()
    if (result === 'exists') onExisting(picked.id)
  }

  return (
    <Sheet onClose={onClose} className="z-[55]">
      {picked ? (
        <>
          <div className="flex items-center gap-3 px-1">
            <button
              onClick={() => setPicked(null)}
              aria-label="Back"
              className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800"
            >
              <ChevronLeft size={20} />
            </button>
            <AssetLogo asset={picked} size={32} />
            <div className="min-w-0">
              <SheetTitle className="t-label text-zinc-100">{picked.ticker}</SheetTitle>
              <div className="t-caption truncate text-zinc-500">tracks {picked.name}</div>
            </div>
          </div>
          <AmountForm asset={picked} submitLabel="Add" onSubmit={submit} />
        </>
      ) : (
        <>
          <SheetTitle className="px-1 text-base font-semibold">Add a holding</SheetTitle>
          {holdings.length >= HOLDINGS_LIMIT ? (
            <p className="t-body px-1 pt-3 text-zinc-400">{`Holdings can list up to ${HOLDINGS_LIMIT} different tokens.`}</p>
          ) : (
            <>
              <label className="mt-3 flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-3 ring-accent/60 focus-within:ring-2">
                <SearchIcon size={18} className="shrink-0 text-zinc-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or ticker"
                  aria-label="Search by name or ticker"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                />
              </label>
              <div className="mt-2 max-h-[50vh] min-h-24 overflow-y-auto">
                {addable.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => pick(a)}
                    className="hover-row flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors active:bg-zinc-900"
                  >
                    <AssetLogo asset={a} size={28} />
                    <span className="min-w-0">
                      <span className="t-label block text-zinc-100">{a.ticker}</span>
                      <span className="t-caption block truncate text-zinc-500">{assetSubtitle(a)}</span>
                    </span>
                  </button>
                ))}
                {query.trim() && addable.length === 0 && (
                  <p className="t-body px-1 pt-3 text-zinc-400">
                    {matches.length > 0
                      ? "We can't add that token yet. For now, Holdings supports only xStocks and Ondo tokens whose details we have verified."
                      : `No tokenized version of “${query.trim()}” yet.`}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  )
}
