// Ondo tokens' shares-per-token multipliers (Ondo calls it sValue), pinned
// from the issuer's own SyntheticSharesOracle by scripts/verify-ondo.mjs.
// Regenerate there, never by hand.
//
// An Ondo token's price is the share price times this number: 1.0 at launch,
// a little above 1 as dividends are reinvested, and 10 after a 10-for-1 split.
// Anything not pinned here has no verified ratio, and its gap is not shown.

import raw from './verifiedOndo.json'

export const VERIFIED_ONDO = raw.tokens

/** When the multipliers were read from the chain (UTC, ISO 8601). */
export const ONDO_VERIFIED_AT = raw.checkedAt

/** The oracle they were read from: { chain, address, source }. */
export const ONDO_ORACLE = raw.oracle

/**
 * The verified shares-per-token multiplier for an Ondo asset, as a number, or
 * null. Null when the asset is not Ondo's, was never verified, was paused for
 * a corporate action when pinned, or its ticker no longer matches the pin.
 */
export function ondoSharesPerToken(asset) {
  if (asset?.issuer !== 'Ondo' || !asset.id) return null
  const pin = VERIFIED_ONDO[asset.id]
  if (!pin || pin.paused || pin.ticker !== asset.ticker) return null
  const n = Number(pin.sValue)
  return Number.isFinite(n) && n > 0 ? n : null
}
