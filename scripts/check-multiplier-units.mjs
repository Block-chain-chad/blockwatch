// Does the price feed speak the same unit the chain does?
//
// The app's gap compares a token price against a share price. That only means
// anything if both are per SHARE. The chain is not: pool reserves and Jupiter
// quote amounts are per BASE token, and one base token is `multiplier` shares.
// CoinGecko's /coins/markets is where the app's token price comes from, and
// CoinGecko does not document which of the two it reports for a Token-2022
// mint carrying a scaled-amount extension.
//
// Measured on 2026-09-16, it reports per SHARE for the large ratios — NFLXx
// (10), CRWDx (4), TQQQx (2.0090), AZNx (0.5111) all quoted within about 2%
// of the real share price rather than a multiple of it. That is why
// src/lib/prices.js does NOT divide the gap by the multiplier: doing so would
// turn NFLXx's true +0.75% into a fabricated -90% next to a Buy button.
//
// But roughly eleven of the small dividend ratios (CMCSAx, UNHx, KOx, MCDx,
// GSx, BACx among them) sat about one multiplier ABOVE the share price while
// Jupiter's oracle sat at the share price. That is either a real premium or a
// feed that failed to scale, and it cannot be told apart from outside. So
// this script exists to catch the case that matters: a feed whose price is
// off by about exactly the multiplier, which is the signature of an unscaled
// unit rather than a market.
//
// Run it after scripts/verify-mints.mjs, and any time the gap on a name looks
// too good:  node scripts/check-multiplier-units.mjs
//
// It reads public endpoints only and writes nothing. Exit 1 on a flag, so it
// can gate a deploy later if we want it to.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { effectiveMultiplier, isUnity } from '../src/lib/multiplier.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const MINTS_PATH = join(HERE, '..', 'src', 'data', 'verifiedMints.json')

const CG = 'https://api.coingecko.com/api/v3/coins/markets'
const JUP = 'https://lite-api.jup.ag/price/v3'

// How close to the multiplier a price ratio has to be before we call it a
// unit error rather than a market. A wrapper can genuinely trade a few
// percent from its share; it does not genuinely trade at exactly 1 multiplier
// away by coincidence.
const UNIT_TOLERANCE = 0.25

// Below this the two hypotheses are not separable. If the ratio is 1.003,
// "priced per share" and "priced per base token" differ by 0.3%, which is
// less than the spread between two honest feeds — so any verdict would be
// noise, and a check that cries wolf gets ignored. Roughly 36 of the 66
// scaled assets clear this bar, including every one whose potential error is
// big enough to mislead. The ones below it can be wrong by at most 2%.
const MIN_DISCRIMINATING = 0.02

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function coingecko(ids) {
  const out = {}
  for (let i = 0; i < ids.length; i += 60) {
    const params = new URLSearchParams({
      vs_currency: 'usd',
      ids: ids.slice(i, i + 60).join(','),
      per_page: '250',
    })
    const res = await fetch(`${CG}?${params}`, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    for (const row of await res.json()) out[row.id] = row.current_price
    await sleep(3000) // free tier; this script is not in a hurry
  }
  return out
}

async function jupiter(mints) {
  const out = {}
  for (let i = 0; i < mints.length; i += 50) {
    const res = await fetch(`${JUP}?ids=${mints.slice(i, i + 50).join(',')}`)
    if (!res.ok) throw new Error(`Jupiter ${res.status}`)
    for (const [mint, row] of Object.entries(await res.json())) out[mint] = row?.usdPrice ?? null
    await sleep(500)
  }
  return out
}

/**
 * Pure verdict for one asset, so the rule is testable without the network.
 *
 * `cg` and `jup` are both supposed to be per SHARE. When one of them is about
 * `multiplier` times the other, one of the two is quoting per BASE token and
 * the gap built on it is an artifact.
 */
export function judgeUnits({ ticker, multiplier, cg, jup }) {
  const m = Number(multiplier)
  if (!Number.isFinite(m) || m <= 0) return { ticker, ok: false, reason: 'unreadable multiplier' }
  if (!(cg > 0) || !(jup > 0)) return { ticker, ok: true, reason: 'no price on one side', skipped: true }
  if (Math.abs(Math.log(m)) < MIN_DISCRIMINATING) {
    return { ticker, ok: true, reason: 'ratio too close to 1 to test', skipped: true }
  }
  const ratio = cg / jup
  // Agreement is ratio ~ 1. A unit error is ratio ~ m (CoinGecko unscaled) or
  // ratio ~ 1/m (Jupiter unscaled). Compared in log space so 10x and 0.1x are
  // equally far from parity.
  const dist = (x) => Math.abs(Math.log(ratio / x))
  const toParity = dist(1)
  const toUnscaledCg = dist(m)
  const toUnscaledJup = dist(1 / m)
  const best = Math.min(toUnscaledCg, toUnscaledJup)
  // Clearly better than parity, not merely closer. Two honest feeds on a thin
  // token drift enough to edge past a bare comparison, and a check that flags
  // those is a check nobody reads.
  if (best < toParity / 2 && best < UNIT_TOLERANCE) {
    return {
      ticker,
      ok: false,
      reason:
        toUnscaledCg <= toUnscaledJup
          ? `CoinGecko looks unscaled: ${cg.toFixed(4)} is ${ratio.toFixed(4)}x Jupiter's ${jup.toFixed(4)}, and the ratio is ${m}`
          : `Jupiter looks unscaled: ${jup.toFixed(4)} is ${(1 / ratio).toFixed(4)}x CoinGecko's ${cg.toFixed(4)}, and the ratio is ${m}`,
      ratio,
      multiplier: m,
    }
  }
  return { ticker, ok: true, ratio, multiplier: m }
}

async function main() {
  const pinned = JSON.parse(readFileSync(MINTS_PATH, 'utf8')).mints
  const assets = Object.entries(pinned)
    .map(([id, m]) => ({ id, ...m, effective: effectiveMultiplier(m) }))
    .filter((a) => !isUnity(a.effective))

  console.log(`Checking ${assets.length} assets whose ratio is not 1.0...`)
  const [cg, jup] = await Promise.all([
    coingecko(assets.map((a) => a.id)),
    jupiter(assets.map((a) => a.mint)),
  ])

  const verdicts = assets.map((a) =>
    judgeUnits({ ticker: a.ticker, multiplier: a.effective, cg: cg[a.id], jup: jup[a.mint] })
  )
  const flagged = verdicts.filter((v) => !v.ok)
  const noPrice = verdicts.filter((v) => v.skipped && v.reason === 'no price on one side')
  const tooSmall = verdicts.filter((v) => v.skipped && v.reason === 'ratio too close to 1 to test')

  for (const v of flagged) console.log(`  FLAG ${v.ticker}: ${v.reason}`)
  console.log(
    `\n${verdicts.length - flagged.length - noPrice.length - tooSmall.length} agree, ` +
      `${flagged.length} flagged, ${tooSmall.length} ratios too close to 1 to test, ` +
      `${noPrice.length} had no price on one side.`
  )
  if (flagged.length > 0) {
    console.log(
      '\nA flag means the gap shown for that asset may be a unit artifact, not a market.\n' +
        'Check the asset against its real share price before trusting its gap.'
    )
    process.exitCode = 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`check-multiplier-units failed: ${err.message}`)
    process.exit(1)
  })
}
