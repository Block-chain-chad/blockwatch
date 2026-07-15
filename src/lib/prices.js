// Pure helpers for combining the static seed universe with live market data.

// Within ±0.05% we call it 1:1 parity.
export const PARITY_BAND = 0.05

// Below this 24h volume a token's price moves on a handful of trades, so its
// premium/change is noise, not signal. Calibrated against the seed universe
// (healthy assets trade $130k–$14M/day; the flagged tail trades $1k–$46k).
export const THIN_VOLUME_USD = 50_000

// NAV-based products (no listed underlying) are exempt: their price is set by
// the issuer's net asset value, not by on-market trading, so low exchange
// volume doesn't make the displayed price untrustworthy. Unknown volume is
// treated as thin — in a 700-asset universe the tokens with no volume data
// are exactly the dead ones whose prices are stale garbage.
export function isThinlyTraded(asset) {
  return asset.underlying != null && (asset.volume24h == null || asset.volume24h < THIN_VOLUME_USD)
}

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
      stockQuote: q ?? null, // full quote (prevClose/open/day range) for the detail screen
      tokenStats: p ?? null, // full token record (24h range/ATH/supply) for the detail screen
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
