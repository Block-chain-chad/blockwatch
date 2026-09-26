// Pin each Ondo token's shares-per-token multiplier, from the issuer's oracle.
//
// WHY. An Ondo Global Markets token does not track one share. Its price is
// the share price times a multiplier Ondo calls sValue: it starts at 1.0,
// grows as dividends are reinvested, and jumps at a split (10.0 after a
// 10-for-1). Ondo publishes it on chain in its SyntheticSharesOracle. On
// 2026-09-26 NFLXon traded at 711 against a 71 share because its sValue is
// 10; without the multiplier the app called that a +900% premium.
//
// WHERE THE NUMBER COMES FROM. The oracle address is the one Ondo lists at
// docs.ondo.finance/addresses. Ondo's Ethereum oracle only carries a handful
// of assets, while its BNB Chain oracle carries the catalogue, so this reads
// BNB Chain. Candidate token addresses come from CoinGecko (a third party),
// and each one is only kept when the chain agrees on both:
//   1. the token contract's symbol() is exactly the ticker we show, and
//   2. the issuer's oracle knows the address (it reverts with AssetNotFound
//      for anything Ondo has not registered).
// Anything that fails either check stays unpinned, and the app shows its gap
// as "Ratio unverified" rather than guessing 1.0.
//
// Re-run: node scripts/verify-ondo.mjs. A run that cannot reach CoinGecko or
// the chain exits non-zero and leaves src/data/verifiedOndo.json alone.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const UNIVERSE_PATH = join(HERE, '..', 'src', 'data', 'universe.json')
const OUT_PATH = join(HERE, '..', 'src', 'data', 'verifiedOndo.json')

export const ORACLE = Object.freeze({
  chain: 'bsc',
  address: '0xF4Fd8a1B412633e10527454137A29Db7Aa35F15e',
  source: 'https://docs.ondo.finance/addresses (SyntheticSharesOracle, BNB Chain)',
})
const RPC = process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com'

// A second opinion. Ondo also runs the oracle on Ethereum, for a handful of
// assets. Where both carry a token they should agree up to their update lag
// (measured 2026-09-26: 0.07% on QQQon, 0.17% on SPYon, exact on TSLAon and
// SGOVon). More than 1% apart means one side missed a split or is wrong, and
// the run stops without writing.
export const ETH_ORACLE = '0x9BC39DB6fbB44B91a48b8D5A6C208B82B1741bE6'
const ETH_RPC = process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com'
export const MAX_ORACLE_DISAGREEMENT = 0.01

/** Relative difference between two sValues, or null when either is unusable. */
export function oracleDisagreement(a, b) {
  const x = Number(a)
  const y = Number(b)
  if (!(x > 0) || !(y > 0)) return null
  return Math.abs(x / y - 1)
}
const COINGECKO_LIST = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'

// Function selectors: keccak256 of the signature, first four bytes.
const SEL_GET_SVALUE = '0x0a562827' // getSValue(address) -> (uint128 sValue, bool paused)
const SEL_SYMBOL = '0x95d89b41' // symbol() -> string
const BATCH = 40

/** An ABI-encoded address argument. */
export function encodeAddress(address) {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

/** Decode an ABI-encoded string return value; null if it is not one. */
export function decodeString(hex) {
  const body = String(hex ?? '').replace(/^0x/, '')
  if (body.length < 128) return null
  const len = parseInt(body.slice(64, 128), 16)
  if (!Number.isSafeInteger(len) || len > 64) return null
  const bytes = body.slice(128, 128 + len * 2)
  return Buffer.from(bytes, 'hex').toString('utf8')
}

/** Decode getSValue's (uint128, bool) as { sValue: decimal string, paused }. */
export function decodeSValue(hex) {
  const body = String(hex ?? '').replace(/^0x/, '')
  if (body.length < 128) return null
  const raw = BigInt(`0x${body.slice(0, 64)}`)
  if (raw <= 0n) return null
  const paused = BigInt(`0x${body.slice(64, 128)}`) !== 0n
  return { sValue: formatFixed18(raw), paused }
}

/** An 18-decimal fixed-point integer as a plain decimal string, no trailing zeros. */
export function formatFixed18(raw) {
  const whole = raw / 10n ** 18n
  const frac = (raw % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : `${whole}`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** One JSON-RPC batch, retried with backoff when the public endpoint throttles. */
async function rpcBatch(calls, attempt = 0, url = RPC) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_call', params: [{ to: c.to, data: c.data }, 'latest'] })),
    ),
  })
  if (res.status === 429 && attempt < 5) {
    await sleep(2000 * 2 ** attempt + Math.random() * 500)
    return rpcBatch(calls, attempt + 1, url)
  }
  if (!res.ok) throw new Error(`rpc ${res.status}`)
  const out = await res.json()
  if (!Array.isArray(out)) throw new Error('rpc did not answer the batch')
  return out.sort((a, b) => a.id - b.id)
}

async function main() {
  const universe = JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8'))
  const ondo = universe.filter((a) => a.issuer === 'Ondo')
  const listRes = await fetch(COINGECKO_LIST)
  if (!listRes.ok) throw new Error(`coingecko ${listRes.status}`)
  const byId = new Map((await listRes.json()).map((c) => [c.id, c]))

  const candidates = ondo
    .map((a) => ({ asset: a, address: byId.get(a.id)?.platforms?.['binance-smart-chain'] }))
    .filter((c) => typeof c.address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(c.address))

  const tokens = {}
  const refused = []
  for (let i = 0; i < candidates.length; i += BATCH) {
    const chunk = candidates.slice(i, i + BATCH)
    const answers = await rpcBatch(
      chunk.flatMap((c) => [
        { to: c.address, data: SEL_SYMBOL },
        { to: ORACLE.address, data: SEL_GET_SVALUE + encodeAddress(c.address) },
      ]),
    )
    await sleep(400) // stay well under the public endpoint's rate limit
    chunk.forEach((c, j) => {
      const symbol = decodeString(answers[2 * j]?.result)
      const sv = answers[2 * j + 1]?.error ? null : decodeSValue(answers[2 * j + 1]?.result)
      if (symbol !== c.asset.ticker) return refused.push(`${c.asset.ticker}: symbol ${JSON.stringify(symbol)}`)
      if (!sv) return refused.push(`${c.asset.ticker}: not in the issuer's oracle`)
      tokens[c.asset.id] = { ticker: c.asset.ticker, address: c.address.toLowerCase(), ...sv }
    })
  }

  const count = Object.keys(tokens).length
  if (count === 0) throw new Error('no Ondo token verified; refusing to write an empty list')

  // Cross-check against the Ethereum oracle wherever it knows the token.
  const onEth = Object.entries(tokens)
    .map(([id, pin]) => ({ id, pin, eth: byId.get(id)?.platforms?.ethereum }))
    .filter((c) => typeof c.eth === 'string' && /^0x[0-9a-fA-F]{40}$/.test(c.eth))
  let compared = 0
  for (let i = 0; i < onEth.length; i += BATCH) {
    const chunk = onEth.slice(i, i + BATCH)
    const answers = await rpcBatch(
      chunk.map((c) => ({ to: ETH_ORACLE, data: SEL_GET_SVALUE + encodeAddress(c.eth) })),
      0,
      ETH_RPC,
    )
    await sleep(400)
    chunk.forEach((c, j) => {
      const eth = answers[j]?.error ? null : decodeSValue(answers[j]?.result)
      if (!eth) return // not on the Ethereum oracle: nothing to compare
      compared++
      const off = oracleDisagreement(c.pin.sValue, eth.sValue)
      if (off == null || off > MAX_ORACLE_DISAGREEMENT) {
        throw new Error(
          `${c.pin.ticker}: BNB Chain oracle says ${c.pin.sValue}, Ethereum oracle says ${eth.sValue}; not writing`,
        )
      }
    })
  }
  console.log(`cross-checked ${compared} against Ondo's Ethereum oracle, all within ${MAX_ORACLE_DISAGREEMENT * 100}%`)
  const out = { checkedAt: new Date().toISOString(), oracle: ORACLE, tokens }
  writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`verified ${count} of ${ondo.length} Ondo tokens (${candidates.length} had a BNB Chain address)`)
  for (const line of refused) console.log(`  not pinned: ${line}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`verify-ondo: ${err.message}`)
    process.exit(1)
  })
}
