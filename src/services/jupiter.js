// Near-live token prices from Jupiter (Solana's DEX aggregator) — free lite
// tier, no key, browser-callable. Only assets carrying a Solana mint (the
// xStocks line) ride this feed; everything else stays on the minute poll.
// Budget: one batched call per FAST_POLL_MS for on-screen assets ≈ 24
// requests/min, inside the lite tier's 60/min.

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

    const ask = SPREAD_REF_USD / tokens
    const bid = usdOut / tokens
    data = { ask, bid, spreadPct: ((ask - bid) / ask) * 100, refUsd: SPREAD_REF_USD }
  } catch {
    data = null // cached too: a dead pool shouldn't be re-probed every render
  }
  spreadCache.set(mint, { at: Date.now(), data })
  return data
}

/** Live DEX prices for a list of mint addresses: { [mint]: usdPrice }. */
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
