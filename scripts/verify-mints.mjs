// Pin the token addresses the in-app swap is allowed to touch.
//
// The universe builder learns each xStocks mint from CoinGecko, which is a
// third party with no relationship to the issuer. A wrong address there is
// not a cosmetic bug: it buys a different token with the user's money. So
// CoinGecko's answer never reaches the swap path directly. This script takes
// each candidate address to the chain itself and keeps only the ones the
// ISSUER vouches for, writing them to src/data/verifiedMints.json — the only
// list src/services/swap.js will trade.
//
// An xStocks mint is issuer-verified when, on Solana mainnet, its Token-2022
// token-metadata extension says all four of:
//   1. update authority  === the pinned xStocks authority below,
//   2. metadata URI host === the issuer's own domain,
//   3. symbol            === the ticker we show the user,
//   4. the mint is owned by the Token-2022 program.
// Any mismatch drops the asset from the list: it keeps the external Jupiter
// link and loses the in-app swap. Losing a swap is recoverable; buying the
// wrong token is not.
//
// Each verified entry also carries the issuer's share-per-token ratio, read
// from the same account in the same pass (see readMultiplier). The app needs
// it to size a sell in the unit the user's wallet shows and to put chart
// candles in the same unit as the share price. It is pinned rather than read
// live so the client keeps no RPC dependency; src/lib/multiplier.test.js
// fails once the pin is older than MAX_PIN_AGE_DAYS.
//
// Re-run after scripts/build-universe.mjs:  node scripts/verify-mints.mjs
// It never edits universe.json and never deletes a pin on a network failure —
// a run that cannot reach the chain exits non-zero and leaves the file alone.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { effectiveMultiplier, pendingMultiplier } from '../src/lib/multiplier.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const UNIVERSE_PATH = join(HERE, '..', 'src', 'data', 'universe.json')
const OUT_PATH = join(HERE, '..', 'src', 'data', 'verifiedMints.json')

const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

// Who the issuer is, on chain. These are the facts a wrong address has to
// forge, and they are checked on every run rather than trusted from a file.
const ISSUERS = {
  xStocks: {
    updateAuthority: '5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq',
    metadataHost: 'xstocks-metadata.backed.fi',
  },
}

// getMultipleAccounts caps at 100 addresses per request.
const BATCH = 100

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`${method} ${res.status}`)
  const body = await res.json()
  if (body.error) throw new Error(`${method}: ${body.error.message}`)
  return body.result
}

/** The Token-2022 token-metadata extension of a jsonParsed mint account. */
function tokenMetadata(account) {
  const info = account?.data?.parsed?.info
  const ext = info?.extensions?.find((e) => e.extension === 'tokenMetadata')
  return ext?.state ?? null
}

/**
 * The issuer's share-per-token ratio, from the Token-2022
 * `scaledUiAmountConfig` extension: { multiplier, nextMultiplier,
 * nextMultiplierAt } as plain decimal strings and an ISO timestamp.
 *
 * Both values are pinned, not just the one in force today. The extension
 * carries a scheduled change and the moment it takes effect, and Token-2022
 * switches to it the instant that timestamp passes — so pinning both lets the
 * app stay correct between runs of this script instead of going wrong until
 * the next one. src/lib/multiplier.js applies the same rule at read time.
 *
 * A mint with no such extension gets nothing here, and the client's default
 * of 1.0 applies. All 103 xStocks mints carried it on 2026-09-16.
 */
export function readMultiplier(account) {
  const ext = account?.data?.parsed?.info?.extensions?.find(
    (e) => e.extension === 'scaledUiAmountConfig'
  )
  // No extension at all is a plain Token-2022 mint that the issuer never
  // scaled. One token is one share, the client's default is right, and there
  // is nothing to pin. This is the ONLY silent case.
  if (!ext?.state) return null

  const { multiplier, newMultiplier, newMultiplierEffectiveTimestamp: ts } = ext.state
  const plain = (v) => {
    // The chain reports these as f64. Pin a plain decimal string so the
    // client can read it as an exact fraction; exponent notation could not be.
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return null
    const s = String(v).trim()
    return /^\d+(?:\.\d+)?$/.test(s) ? s : null
  }

  // Past here every failure THROWS, which stops the run and leaves the
  // previous file alone. The alternative was worse than useless: an extension
  // we could not read used to produce an entry with no ratio, which the client
  // reads as 1.0 — so a shape change in the RPC's output would have silently
  // pinned NFLXx as one token per share and oversold every holder tenfold.
  // All 66 scaled mints take their ratio from newMultiplier, so that is not a
  // hypothetical corner.
  const current = plain(multiplier)
  if (current == null) {
    throw new Error(`scaledUiAmountConfig multiplier is unreadable: ${JSON.stringify(multiplier)}`)
  }
  if (newMultiplier == null) return { multiplier: current }

  const next = plain(newMultiplier)
  if (next == null) {
    throw new Error(`scaledUiAmountConfig newMultiplier is unreadable: ${JSON.stringify(newMultiplier)}`)
  }
  if (!Number.isFinite(ts)) {
    throw new Error(`scaledUiAmountConfig effective timestamp is unreadable: ${JSON.stringify(ts)}`)
  }
  // A timestamp at or before the epoch means the scheduled value is already in
  // force and there is no future change to record — so it becomes the standing
  // ratio rather than being pinned with a 1970 date nobody can act on.
  if (ts <= 0) return { multiplier: next }

  return { multiplier: current, nextMultiplier: next, nextMultiplierAt: new Date(ts * 1000).toISOString() }
}

function hostOf(uri) {
  try {
    return new URL(uri).host
  } catch {
    return null
  }
}

/**
 * Why this mint is or is not the issuer's. Pure: takes the chain's answer,
 * returns { ok, reason } — so the rule is readable in one place and testable.
 */
export function judgeMint({ account, asset, issuer }) {
  if (!account) return { ok: false, reason: 'no such account on chain' }
  if (account.owner !== TOKEN_2022_PROGRAM) {
    return { ok: false, reason: `not a Token-2022 mint (owner ${account.owner})` }
  }
  const meta = tokenMetadata(account)
  if (!meta) return { ok: false, reason: 'no on-chain token metadata' }
  if (meta.updateAuthority !== issuer.updateAuthority) {
    return { ok: false, reason: `update authority ${meta.updateAuthority} is not the issuer` }
  }
  const host = hostOf(meta.uri)
  if (host !== issuer.metadataHost) {
    return { ok: false, reason: `metadata host ${host ?? '(unparseable)'} is not the issuer` }
  }
  if (meta.symbol !== asset.ticker) {
    return { ok: false, reason: `on-chain symbol ${meta.symbol} is not ${asset.ticker}` }
  }
  const decimals = account.data?.parsed?.info?.decimals
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 18) {
    return { ok: false, reason: `unusable decimals ${decimals}` }
  }
  return { ok: true, decimals, symbol: meta.symbol, name: meta.name }
}

async function main() {
  const universe = JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8'))
  const candidates = universe.filter((a) => a.mint && ISSUERS[a.issuer])
  console.log(`Checking ${candidates.length} candidate mints against the chain...`)

  const accounts = new Map()
  for (let i = 0; i < candidates.length; i += BATCH) {
    const slice = candidates.slice(i, i + BATCH)
    const result = await rpc('getMultipleAccounts', [
      slice.map((a) => a.mint),
      { encoding: 'jsonParsed' },
    ])
    slice.forEach((asset, n) => accounts.set(asset.id, result.value[n]))
    console.log(`  ...${Math.min(i + BATCH, candidates.length)}/${candidates.length}`)
  }

  const mints = {}
  const rejected = []
  for (const asset of candidates) {
    const verdict = judgeMint({
      account: accounts.get(asset.id),
      asset,
      issuer: ISSUERS[asset.issuer],
    })
    if (!verdict.ok) {
      rejected.push(`  ${asset.ticker} (${asset.id}): ${verdict.reason}`)
      continue
    }
    mints[asset.id] = {
      mint: asset.mint,
      ticker: asset.ticker,
      symbol: verdict.symbol,
      name: verdict.name,
      decimals: verdict.decimals,
      issuer: asset.issuer,
      ...(readMultiplier(accounts.get(asset.id)) ?? {}),
    }
  }

  // A run that verified nothing is a broken run, not an empty market. Refuse
  // to replace a good list with an empty one.
  if (Object.keys(mints).length === 0) {
    throw new Error('no mint passed verification — leaving the pinned list untouched')
  }

  const previous = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, 'utf8')) : null
  const dropped = Object.keys(previous?.mints ?? {}).filter((id) => !(id in mints))

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        note: 'Generated by scripts/verify-mints.mjs. Do not hand-edit: every entry was checked against the issuer on Solana mainnet.',
        checkedAt: new Date().toISOString(),
        rpc: RPC,
        issuers: ISSUERS,
        mints,
      },
      null,
      1
    ) + '\n'
  )

  console.log(`\nVerified ${Object.keys(mints).length} mints -> ${OUT_PATH}`)
  const ratios = Object.values(mints).filter((m) => m.multiplier)
  const scaled = ratios.filter((m) => effectiveMultiplier(m) !== '1')
  const pendingNow = ratios.filter((m) => pendingMultiplier(m) != null)
  console.log(
    `Share-per-token ratio: ${ratios.length} carry one, ${scaled.length} are not 1.0, ${pendingNow.length} have a change scheduled.`
  )
  const byRatio = (a, b) => Number(effectiveMultiplier(b)) - Number(effectiveMultiplier(a))
  for (const m of scaled.sort(byRatio).slice(0, 8)) {
    // Same wording as the asset screen, so the maintainer console and the
    // user-facing sentence cannot drift into describing the ratio two ways.
    console.log(`  ${m.ticker}: 1 token tracks ${effectiveMultiplier(m)} shares`)
  }
  if (rejected.length > 0) {
    console.log(`Rejected ${rejected.length} (no in-app swap for these):`)
    console.log(rejected.join('\n'))
  }
  if (dropped.length > 0) {
    console.log(`\nWARNING: ${dropped.length} previously pinned mint(s) no longer verify:`)
    console.log(dropped.map((id) => `  ${id}`).join('\n'))
  }
}

// Importable for tests; only runs the network pass when invoked directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`verify-mints failed: ${err.message}`)
    process.exit(1)
  })
}
