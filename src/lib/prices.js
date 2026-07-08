// Pure helpers for combining the static seed universe with live market data.

// Within ±0.05% we call it 1:1 parity.
export const PARITY_BAND = 0.05

// Premium/discount = (tokenPrice − stockPrice) / stockPrice, as a percent.
// Null when either side is missing (e.g. stock feed not wired yet, or NAV-based token).
export function premiumPct(asset) {
  if (asset.tokenPrice == null || asset.stockPrice == null) return null
  return ((asset.tokenPrice - asset.stockPrice) / asset.stockPrice) * 100
}

/**
 * Merge seed identities with the token price map ({ [id]: { tokenPrice, change24h, marketCap } })
 * and the stock quote map ({ [ticker]: { price, prevClose, asOf } }).
 * Assets without data yet keep null prices (UI shows skeletons).
 * Keeps curated seed order — market-cap sorting would put treasury tokens above
 * the household-name stocks people open the app for.
 */
export function mergeAssets(seed, priceMap, stockMap) {
  return seed.map((s) => {
    const p = priceMap?.[s.id]
    const q = s.underlying ? stockMap?.[s.underlying] : null
    return {
      ...s,
      tokenPrice: p?.tokenPrice ?? null,
      stockPrice: q?.price ?? null,
      dayChange: p?.change24h ?? null,
      marketCap: p?.marketCap ?? null,
      volume24h: p?.volume24h ?? null,
    }
  })
}

// Aggregate "today" % for a folder = average 24h change of members with data.
export function folderDayChange(folder, assets) {
  const members = assets.filter((a) => folder.assetIds.includes(a.id) && a.dayChange != null)
  if (members.length === 0) return null
  return members.reduce((sum, a) => sum + a.dayChange, 0) / members.length
}
