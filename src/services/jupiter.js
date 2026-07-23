// Near-live token prices from Jupiter (Solana's DEX aggregator) — free lite
// tier, no key, browser-callable. Only assets carrying a Solana mint (the
// xStocks line) ride this feed; everything else stays on the minute poll.
// Budget: one batched call per FAST_POLL_MS for on-screen assets ≈ 24
// requests/min, inside the lite tier's 60/min.

const BASE = 'https://lite-api.jup.ag/price/v3'

export const FAST_POLL_MS = 2_500

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
