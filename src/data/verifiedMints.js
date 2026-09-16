// The only token addresses the in-app swap may touch.
//
// universe.json learns each mint from CoinGecko, a third party with no
// relationship to the issuer; a wrong address there spends the user's money
// on a different token. verifiedMints.json is the answer the ISSUER gave, read
// off Solana mainnet by scripts/build-universe.mjs's companion,
// scripts/verify-mints.mjs — regenerate it there, never by hand.
//
// An asset that is not pinned here keeps its external Jupiter link and loses
// the in-app swap. That is the safe direction: no swap is recoverable, the
// wrong token is not.

import raw from './verifiedMints.json'

export const VERIFIED_MINTS = raw.mints

/** When the pinned list was last checked against the chain (UTC, ISO 8601). */
export const VERIFIED_AT = raw.checkedAt

/**
 * The verified token for an asset, or null.
 *
 * Returns null when the pinned address DISAGREES with the one in the asset
 * record as well as when there is no pin at all: a universe rebuild that
 * produced a different address is exactly the case this list exists to
 * catch, and it must fail closed until someone re-runs the verification.
 *
 * `decimals` comes from the mint account itself, so nothing about sizing the
 * transaction depends on a price API answering correctly at swap time.
 */
export function verifiedToken(asset) {
  const pinned = asset?.id ? VERIFIED_MINTS[asset.id] : null
  if (!pinned) return null
  if (asset.mint && asset.mint !== pinned.mint) return null
  return pinned
}
