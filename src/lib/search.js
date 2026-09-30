// Symbol-search ranking, shared by the phone SearchOverlay and the desktop
// SymbolSearch. Pure: no React, no services, so it runs under vitest.

import { isThinlyTraded } from './prices'

/**
 * Ranked matching: exact ticker beats prefix beats substring, and ticker
 * matches beat name matches — in a 700-asset universe "MU" must surface the
 * MU tokens, not everything containing those letters. Ties keep universe
 * order (volume), so liquid versions rise.
 *
 * `q` is already trimmed and lower-cased; 0 means no match.
 */
export function searchScore(a, q) {
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

/**
 * Popular shortcuts pick one version per underlying: prefer a liquid xStocks
 * listing (the branding shown all over the app), then any liquid version,
 * then whatever exists. Undefined when nothing tokenizes the underlying.
 */
export function popularPick(assets, underlying) {
  const candidates = assets.filter((a) => a.underlying === underlying)
  return (
    candidates.find((a) => a.issuer === 'xStocks' && !isThinlyTraded(a)) ??
    candidates.find((a) => !isThinlyTraded(a)) ??
    candidates[0]
  )
}

/**
 * The assets matching a raw query, best first. Normalises the query itself
 * (trim + lower-case); a blank query matches nothing. The sort is stable, so
 * equal scores keep the input order.
 */
export function rankAssets(assets, query) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return []
  return assets
    .map((a) => [searchScore(a, q), a])
    .filter(([score]) => score > 0)
    .sort((x, y) => y[0] - x[0])
    .map(([, a]) => a)
}

/* The quiet line under a ticker in search results: "Name · Issuer, Chain". */
export function assetSubtitle(a) {
  return `${a.name} · ${a.issuer}${a.chain ? `, ${a.chain}` : ''}`
}
