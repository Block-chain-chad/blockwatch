// GeckoTerminal parsing for token candles. Pure: no fetch, no globals, so the
// same code runs in the serverless proxy (api/candles.js) and in the dev
// client, which talks to GeckoTerminal through a vite proxy instead.
//
// GeckoTerminal is CoinGecko's on-chain arm. It indexes the DEX pools where
// xStocks (Solana) and Ondo tokens (Ethereum) actually trade and serves their
// OHLCV keyless. Two calls matter:
//
//   /search/pools?query=AAPLx&network=solana
//     -> data[]: pools whose name mentions the query, NOT only pools of that
//        token. The list includes pools where the ticker is the QUOTE side
//        ("AP / NVDAon"), look-alikes with the same letters in another case
//        ("AAPLX / USDC" is a different mint from "AAPLx / USDC"), and dust.
//        Hence the base-symbol filter below, and it is case-SENSITIVE.
//
//   /networks/{network}/pools/{address}/ohlcv/{minute|hour|day}?aggregate=&limit=
//     -> data.attributes.ohlcv_list: rows of
//        [unix_seconds, open, high, low, close, volume_usd], NEWEST FIRST.
//        Charting libraries want ascending time, so rows are reversed here.
//
// Verified against the live API on 2026-09-05.

export const GT_HOST = 'https://api.geckoterminal.com'
export const GT_API_PREFIX = '/api/v2'
const GT_BASE = `${GT_HOST}${GT_API_PREFIX}`

/** Networks this app resolves pools on. Keys are GeckoTerminal network ids. */
export const NETWORKS = Object.freeze(['solana', 'eth'])

/** Candle buckets GeckoTerminal serves, and the aggregates each accepts. */
export const TIMEFRAME_AGGREGATES = Object.freeze({
  minute: Object.freeze([1, 5, 15]),
  hour: Object.freeze([1, 4, 12]),
  day: Object.freeze([1]),
})

/**
 * Pool address shape per network. Solana addresses are base58 (32–44 chars,
 * no 0/O/I/l); EVM pools come as 0x + 40 hex, and GeckoTerminal also
 * identifies some eth pools by a 0x + 64 hex id (seen live for Uniswap v4).
 */
export const POOL_ADDRESS = Object.freeze({
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  eth: /^0x(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/,
})

/** Search path (host-relative) for one ticker on one network. */
export function searchPath(ticker, network) {
  return `/search/pools?query=${encodeURIComponent(ticker)}&network=${encodeURIComponent(network)}`
}

/** OHLCV path (host-relative) for one pool. */
export function ohlcvPath(network, pool, timeframe, aggregate, limit) {
  return (
    `/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(pool)}` +
    `/ohlcv/${encodeURIComponent(timeframe)}?aggregate=${encodeURIComponent(aggregate)}&limit=${encodeURIComponent(limit)}`
  )
}

export const searchUrl = (ticker, network) => `${GT_BASE}${searchPath(ticker, network)}`
export const ohlcvUrl = (...args) => `${GT_BASE}${ohlcvPath(...args)}`

/**
 * Split a pool name into its two symbols. "NVDAon / USDC 0.9%" -> the fee tier
 * is part of the quote leg on Uniswap-style pools and is not a symbol.
 */
export function splitPoolName(name) {
  if (typeof name !== 'string') return { base: '', quote: '' }
  const [base = '', quote = ''] = name.split(' / ')
  const strip = (s) => s.trim().replace(/\s+[\d.]+%$/, '')
  return { base: strip(base), quote: strip(quote) }
}

const num = (v) => {
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : null
}

/** "solana_XsbEh…" -> "XsbEh…"; anything else -> null. */
function addressFromTokenId(id) {
  if (typeof id !== 'string') return null
  const i = id.indexOf('_')
  return i > 0 ? id.slice(i + 1) : null
}

/**
 * Search response -> flat pool list. Every field is derived, none is passed
 * through: this is what the proxy returns to the client, so it must never
 * relay upstream fields wholesale.
 *
 * [{ address, name, baseSymbol, baseAddress, quoteSymbol, quoteAddress,
 *    volume24h, liquidityUsd, dex }]
 */
export function parseSearchPools(json) {
  const rows = Array.isArray(json?.data) ? json.data : []
  const out = []
  for (const row of rows) {
    const a = row?.attributes
    if (!a || typeof a.address !== 'string' || !a.address) continue
    const { base, quote } = splitPoolName(a.name)
    out.push({
      address: a.address,
      name: typeof a.name === 'string' ? a.name : '',
      baseSymbol: base,
      baseAddress: addressFromTokenId(row?.relationships?.base_token?.data?.id),
      quoteSymbol: quote,
      quoteAddress: addressFromTokenId(row?.relationships?.quote_token?.data?.id),
      volume24h: num(a.volume_usd?.h24) ?? 0,
      liquidityUsd: num(a.reserve_in_usd) ?? 0,
      dex: typeof row?.relationships?.dex?.data?.id === 'string' ? row.relationships.dex.data.id : null,
    })
  }
  return out
}

/**
 * The pools where `ticker` is the BASE token, by 24h volume, busiest first.
 * Case-sensitive on purpose — "AAPLX" is a different token from "AAPLx".
 */
export function matchingPools(pools, ticker) {
  if (typeof ticker !== 'string' || !ticker) return []
  return pools.filter((p) => p.baseSymbol === ticker).sort((a, b) => b.volume24h - a.volume24h)
}

/** The single busiest pool for `ticker`, or null when none matches. */
export function pickPool(pools, ticker) {
  return matchingPools(pools, ticker)[0] ?? null
}

/**
 * OHLCV response -> ascending candles: [{ time, open, high, low, close, volume }].
 * `time` is unix SECONDS (what GeckoTerminal sends and what charting
 * libraries expect). Rows with a missing or non-numeric leg are dropped rather
 * than zero-filled — a zero low would paint a wick to the floor. Duplicate
 * timestamps keep the later row.
 */
export function normalizeOhlcv(json) {
  const list = json?.data?.attributes?.ohlcv_list
  if (!Array.isArray(list)) return []
  const byTime = new Map()
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 6) continue
    const [t, o, h, l, c, v] = row.map(num)
    if ([t, o, h, l, c].some((x) => x == null) || t <= 0) continue
    // Volume can legitimately be 0 on a dead candle; only a non-number is bad.
    byTime.set(Math.floor(t), { time: Math.floor(t), open: o, high: h, low: l, close: c, volume: v ?? 0 })
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time)
}

/** The base/quote tokens the OHLCV response says it priced. */
export function ohlcvMeta(json) {
  const m = json?.meta ?? {}
  const token = (t) => ({
    symbol: typeof t?.symbol === 'string' ? t.symbol : null,
    address: typeof t?.address === 'string' ? t.address : null,
  })
  return { base: token(m.base), quote: token(m.quote) }
}
