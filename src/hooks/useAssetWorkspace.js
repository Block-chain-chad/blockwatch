import { useEffect, useState } from 'react'
import { useAsset, usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import { getTokenSpread } from '../services/jupiter'
import { ASSETS } from '../data/universe'
import { formatPrice } from '../components/shared'
import { useChartData } from './useChartData'
import { useStockInfo } from './useStockInfo'

/**
 * The alert button's caption for one asset's rule (or no rule). Shared with
 * the desktop right column, which reads the rule without the chart bundle.
 */
export function alertLabelFor(rule) {
  if (!rule) return 'Set alert'
  if (rule.drift && rule.price) return '2 alerts set'
  if (rule.drift) return `Alert at ±${rule.drift.threshold}%`
  return `Alert at ${formatPrice(rule.price.target)}`
}

/**
 * Everything the asset screen knows about one asset, in one place: the live
 * record, its price subscription, the gap chart series for `range`, the
 * underlying's company info, the DEX spread, the cross-issuer siblings, and
 * the small derived facts the sections key on. The phone AssetDetail and the
 * desktop chart workspace both call it, so the two surfaces cannot drift.
 *
 * Every hook inside runs unconditionally; when `assetId` has no live record
 * yet, `asset` is null and the derived values fall back to their empty
 * shapes so a caller can bail after the call.
 */
export function useAssetWorkspace(assetId, range, chartRetry = 0) {
  const asset = useAsset(assetId)
  const { session, assets, lastFetchAt } = usePrices()

  // This asset + its cross-issuer siblings (same underlying) need live token
  // prices and the underlying's quote — long-tail assets aren't polled
  // otherwise. Sibling ids come from the static universe so the list is
  // stable regardless of what data has arrived.
  const staticAsset = ASSETS.find((a) => a.id === assetId)
  const subIds = staticAsset?.underlying
    ? ASSETS.filter((a) => a.underlying === staticAsset.underlying).map((a) => a.id)
    : [assetId]
  useAssetSubscription(`detail:${assetId}`, subIds)

  // Live buy/sell readout from the DEX — what a ~$200 trade would actually
  // execute at in each direction. Solana-minted assets only.
  const [spread, setSpread] = useState(null)
  useEffect(() => {
    setSpread(null)
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

  const { folders, watchlistIds, toggleWatchlist } = useFolders()
  const { rules } = useAlerts()
  const chart = useChartData(asset ?? { id: assetId }, range, chartRetry)
  const info = useStockInfo(asset?.underlying)

  const memberCount = asset ? folders.filter((f) => f.assetIds.includes(asset.id)).length : 0
  const alertLabel = alertLabelFor(rules[assetId])
  const inWatchlist = watchlistIds.includes(assetId)
  // Same underlying, different issuer — the cross-issuer comparison.
  const siblings = asset?.underlying
    ? assets.filter((a) => a.underlying === asset.underlying && a.id !== asset.id)
    : []

  // Key statistics has a token group and a stock group; either can be absent
  // (token-only products have no stock side, fresh assets may lack data).
  const ts = asset?.tokenStats
  const hasTokenStats = ts != null && (ts.high24h != null || ts.ath != null || ts.supply != null)
  const hasStockStats = asset?.underlying && (asset.stockQuote || info.metrics)
  // Both sides present → the shared figures render as a side-by-side grid
  // (the app's whole thesis in table form); leftovers list underneath.
  const bothSides = hasTokenStats && hasStockStats

  return {
    asset,
    staticAsset,
    session,
    lastFetchAt,
    chart,
    info,
    spread,
    siblings,
    memberCount,
    alertLabel,
    inWatchlist,
    toggleWatchlist,
    hasTokenStats,
    hasStockStats,
    bothSides,
  }
}
