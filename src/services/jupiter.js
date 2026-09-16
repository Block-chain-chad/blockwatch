// Near-live token prices from Jupiter (Solana's DEX aggregator) — free lite
// tier, no key, browser-callable. Only assets carrying a Solana mint (the
// xStocks line) ride this feed; everything else stays on the minute poll.
// Budget: one batched call per FAST_POLL_MS for on-screen assets ≈ 24
// requests/min, inside the lite tier's 60/min.
//
// UNITS, and a trap. Jupiter's two endpoints here do not speak the same one.
// /price/v3 reports per SHARE: it applies the issuer's Token-2022 scaled-
// amount multiplier for us. /swap/v1/quote reports raw integer amounts, which
// are per BASE token, and one base token is `multiplier` shares. Everything
// this module hands out is per share, so the quote-derived numbers are
// converted and the price-derived ones are not. Both are marked below.

import { effectiveMultiplier, perShare } from '../lib/multiplier'
import { tokenByMint } from '../data/verifiedMints'

const BASE = 'https://lite-api.jup.ag/price/v3'
const QUOTE_BASE = 'https://lite-api.jup.ag/swap/v1/quote'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
// Reference trade size for the buy/sell readout: big enough to smooth out
// dust pricing, small enough not to overstate impact in thin pools.
const SPREAD_REF_USD = 200

export const FAST_POLL_MS = 2_500

// --- Buy/sell spread (detail screen) ----------------------------------------
// A DEX has no order book to quote bid/ask from; the honest equivalent is
// "what would a ~$200 trade actually execute at, each direction" — derived
// from two swap quotes (USDC -> token for the ask, token -> USDC of the same
// token amount for the bid). Cached per mint for a minute.

const spreadCache = new Map()
const SPREAD_TTL = 60_000

async function quoteJson(params) {
  const res = await fetch(`${QUOTE_BASE}?${new URLSearchParams(params)}`)
  if (!res.ok) throw new Error(`Jupiter quote ${res.status}`)
  return res.json()
}

/**
 * Effective buy/sell prices for a token: { ask, bid, spreadPct, refUsd }.
 * Null when the token has no route (dead pool) or any request fails.
 */
export async function getTokenSpread(mint) {
  const hit = spreadCache.get(mint)
  if (hit && Date.now() - hit.at < SPREAD_TTL) return hit.data

  let data = null
  try {
    const priceRes = await fetch(`${BASE}?ids=${mint}`)
    if (!priceRes.ok) throw new Error(`Jupiter ${priceRes.status}`)
    const decimals = (await priceRes.json())[mint]?.decimals
    if (decimals == null) throw new Error('no decimals')

    const buy = await quoteJson({
      inputMint: USDC_MINT,
      outputMint: mint,
      amount: String(SPREAD_REF_USD * 1e6),
      slippageBps: '50',
    })
    const tokensRaw = Number(buy.outAmount)
    if (!(tokensRaw > 0)) throw new Error('no buy route')
    const sell = await quoteJson({
      inputMint: mint,
      outputMint: USDC_MINT,
      amount: buy.outAmount,
      slippageBps: '50',
    })
    const tokens = tokensRaw / 10 ** decimals
    const usdOut = Number(sell.outAmount) / 1e6
    if (!(tokens > 0) || !(usdOut > 0)) throw new Error('no sell route')

    // UNIT BOUNDARY. Jupiter's QUOTE endpoint works in raw amounts, so
    // `tokens` is base tokens and these two prices come out per BASE token.
    // They are displayed beside the share price and the gap, which are per
    // SHARE, so they are converted here. Without it NFLXx reads "Bid $757 ·
    // Ask $775" under a $77 price.
    //
    // spreadPct is deliberately left alone: it is a ratio of the two, and a
    // ratio does not care what unit both sides are in.
    const multiplier = effectiveMultiplier(tokenByMint(mint))
    const ask = perShare(SPREAD_REF_USD / tokens, multiplier)
    const bid = perShare(usdOut / tokens, multiplier)
    if (!(ask > 0) || !(bid > 0)) throw new Error('unusable ratio for this mint')
    data = { ask, bid, spreadPct: ((ask - bid) / ask) * 100, refUsd: SPREAD_REF_USD }
  } catch {
    data = null // cached too: a dead pool shouldn't be re-probed every render
  }
  spreadCache.set(mint, { at: Date.now(), data })
  return data
}

/**
 * Live DEX prices for a list of mint addresses: { [mint]: usdPrice }.
 *
 * These are already per SHARE and must NOT be converted. Jupiter's two
 * endpoints do not agree with each other: the quote endpoint above deals in
 * raw amounts, while this price endpoint applies the issuer's scaled-amount
 * multiplier itself. Checked against mainnet on 2026-09-16 — NFLXx, whose
 * ratio is 10, came back at 75.78 while a quote implied 774.90 per base token
 * and the real NFLX share was 76.41.
 */
/**
 * The issuer's share-per-token ratio as the chain has it RIGHT NOW, in the
 * same shape data/verifiedMints.json pins, or null when this mint has none.
 *
 * /price/v3 carries `scaledUiConfig` for Token-2022 scaled mints — the same
 * two values and effective time the mint account holds. That matters because
 * the pin can only know changes the issuer had scheduled when
 * scripts/verify-mints.mjs last ran, and these are scheduled continuously.
 * A live example: on 2026-09-16 at 20:17 UTC the pin for CRMx recorded
 * 1.0054716788543585 with nothing pending, while by 20:47 the chain carried a
 * new value of 1.0067077500492987 effective 00:30 the next morning. A sell
 * sized on the pin after that moment would be 0.1229% too large, and for
 * accruing mints a stale ratio always errs toward overselling.
 *
 * Numbers come back as JSON floats, so they are re-serialised to plain decimal
 * strings — lib/multiplier.js reads them as exact fractions and will not take
 * anything else.
 */
export async function fetchLiveRatio(mint) {
  const res = await fetch(`${BASE}?ids=${mint}`)
  if (!res.ok) throw new Error(`Jupiter ${res.status}`)
  const cfg = (await res.json())?.[mint]?.scaledUiConfig
  if (!cfg) return null
  const plain = (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null
    const s = String(v)
    return /^\d+(?:\.\d+)?$/.test(s) ? s : null
  }
  const multiplier = plain(cfg.multiplier)
  if (multiplier == null) return null
  const nextMultiplier = plain(cfg.newMultiplier)
  const at = cfg.newMultiplierEffectiveAt ? Date.parse(cfg.newMultiplierEffectiveAt) : NaN
  return nextMultiplier != null && Number.isFinite(at)
    ? { multiplier, nextMultiplier, nextMultiplierAt: new Date(at).toISOString() }
    : { multiplier }
}

export async function fetchFastPrices(mints) {
  const res = await fetch(`${BASE}?ids=${mints.join(',')}`)
  if (!res.ok) throw new Error(`Jupiter ${res.status}`)
  const json = await res.json()
  const map = {}
  for (const [mint, row] of Object.entries(json ?? {})) {
    if (row?.usdPrice > 0) map[mint] = row.usdPrice
  }
  return map
}
