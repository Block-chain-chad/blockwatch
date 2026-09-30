import { useEffect, useState } from 'react'
import { useAsset, usePrices, useAssetSubscription } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { useAlerts } from '../../state/AlertsContext'
import { getTokenSpread } from '../../services/jupiter'
import { ASSETS } from '../../data/universe'
import { alertLabelFor } from '../../hooks/useAssetWorkspace'
import { formatPrice, formatCompact } from '../../lib/format'
import { isThinlyTraded } from '../../lib/prices'
import { ShareIcon, PlusIcon, BellIcon, StarIcon } from '../Icons'
import AssetLogo from '../AssetLogo'
import GapPanel from '../asset/GapPanel'
import TradeButton from '../asset/TradeButton'
import AddToFolderSheet from '../../overlays/AddToFolderSheet'
import SetAlertSheet from '../../overlays/SetAlertSheet'
import ShareSheet from '../../overlays/ShareSheet'

/*
 * The selected asset's numbers under the watchlist (spec §6.8): TradingView's
 * Details header — logo, ticker, the icon actions — over OnStock's block 0,
 * the gap panel, then the DEX spread, the thin-market note and the Trade
 * button. Everything below the header is the phone asset screen's markup,
 * extracted (asset/GapPanel, asset/TradeButton) or copied.
 *
 * Reads the live record and the cheap derived facts itself rather than
 * calling useAssetWorkspace: that hook also loads the chart series, which
 * the center already loads, and a second concurrent request for the same
 * history is a second upstream call. The spread is cached for a minute in
 * services/jupiter, so its one call here is shared with the chart.
 */
const ICON_BTN =
  'flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-zinc-900 active:bg-zinc-800'

export default function AssetNumbers({ assetId, scrub }) {
  const asset = useAsset(assetId)
  const { session, lastFetchAt } = usePrices()
  const { folders, watchlistIds, toggleWatchlist } = useFolders()
  const { rules } = useAlerts()
  const [spread, setSpread] = useState(null)
  const [sheet, setSheet] = useState(null) // 'folder' | 'alert' | 'share'

  // One key for this block; the ids it asks for are already in the chart's
  // subscription, so the union costs nothing extra.
  useAssetSubscription('desktop-numbers', assetId ? [assetId] : [])

  useEffect(() => {
    setSpread(null)
    setSheet(null)
    const mint = ASSETS.find((a) => a.id === assetId)?.mint
    if (!mint) return
    let cancelled = false
    getTokenSpread(mint).then((s) => {
      if (!cancelled) setSpread(s)
    })
    return () => {
      cancelled = true
    }
  }, [assetId])

  if (!asset) return null

  const inWatchlist = watchlistIds.includes(asset.id)
  const memberCount = folders.filter((f) => f.assetIds.includes(asset.id)).length
  const alertLabel = alertLabelFor(rules[asset.id])
  const folderLabel =
    memberCount > 0 ? `In ${memberCount} folder${memberCount === 1 ? '' : 's'}` : 'Add to folder'
  return (
    <section aria-label={`${asset.ticker} numbers`} className="pb-4">
      <div className="flex items-center gap-3 px-4 pt-3">
        <AssetLogo asset={asset} size={28} />
        <div className="min-w-0 flex-1">
          <div className="t-label text-zinc-100">{asset.ticker}</div>
          <div className="t-caption truncate text-zinc-500">
            {asset.name} · {asset.issuer}
            {asset.chain ? ` · ${asset.chain}` : ''}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => toggleWatchlist(asset.id)}
            aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            className={`${ICON_BTN} ${inWatchlist ? 'text-accent' : 'text-zinc-300'}`}
          >
            <StarIcon size={18} filled={inWatchlist} />
          </button>
          {asset.underlying && (
            <button
              onClick={() => setSheet('alert')}
              aria-label={alertLabel}
              title={alertLabel}
              className={`${ICON_BTN} text-zinc-300`}
            >
              <BellIcon size={18} />
            </button>
          )}
          <button
            onClick={() => setSheet('folder')}
            aria-label={folderLabel}
            title={folderLabel}
            className={`${ICON_BTN} text-zinc-300`}
          >
            <PlusIcon size={18} />
          </button>
          <button
            onClick={() => setSheet('share')}
            aria-label="Share"
            title="Share"
            className={`${ICON_BTN} text-zinc-300`}
          >
            <ShareIcon size={18} />
          </button>
        </div>
      </div>

      <div className="px-4">
        <GapPanel asset={asset} scrub={scrub} session={session} lastFetchAt={lastFetchAt} />

        {spread && (
          <div className="num t-caption mt-1 text-zinc-500">
            Bid <span className="text-zinc-300">{formatPrice(spread.bid)}</span> · Ask{' '}
            <span className="text-zinc-300">{formatPrice(spread.ask)}</span> ·{' '}
            {spread.spreadPct.toFixed(1)}% spread
          </div>
        )}
      </div>

      {isThinlyTraded(asset) && (
        <div className="mx-4 mt-4 rounded-xl bg-zinc-900 p-3.5">
          <p className="text-xs leading-relaxed text-zinc-400">
            <span className="font-medium text-zinc-300">Thinly traded.</span> About{' '}
            {asset.volume24h != null ? formatCompact(asset.volume24h) : 'very little'} changed
            hands in 24 hours, so small trades can move this token's price. Treat the gap versus{' '}
            {asset.underlying} as noisy, not as a real mispricing.
          </p>
        </div>
      )}

      <TradeButton asset={asset} />

      {sheet === 'folder' && <AddToFolderSheet asset={asset} onClose={() => setSheet(null)} />}
      {sheet === 'alert' && <SetAlertSheet asset={asset} onClose={() => setSheet(null)} />}
      {sheet === 'share' && <ShareSheet asset={asset} onClose={() => setSheet(null)} />}
    </section>
  )
}
