// Is the pinned share-per-token ratio still fresh enough to size a trade with?
//
// data/verifiedMints.json records each xStocks mint's ratio as the chain had
// it when scripts/verify-mints.mjs last ran. The issuer moves those ratios on
// its own schedule, so the file goes out of date by sitting still. The sell
// path reads the live value from Jupiter and falls back to the pin, and the
// candle and spread paths use the pin alone — so a stale file is a wrong
// ratio on screen and a wrong ratio in the fallback.
//
// This lived as an assertion inside the unit suite, which was the wrong place
// for it twice over: it turned every test run red on a date nobody had written
// down, and it reported a routine maintenance task as a broken test. It is now
// its own named step — "Pin freshness" in .github/workflows/ci.yml, and again
// in repin-mints.yml after the re-pin — so CI says "the pin is stale" rather
// than failing the whole suite over a calendar.
//
//   npm run check:pin
//
// Reads the two local pin files (xStocks mints, Ondo multipliers). No network,
// no secrets. Exits 1 when either is older than MAX_PIN_AGE_DAYS, naming the
// script that re-pins it.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { MAX_PIN_AGE_DAYS } from '../src/lib/multiplier.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// Both pinned ratio files: the xStocks mints, and the Ondo multipliers read
// from Ondo's oracle. Same rule for both; each names the script that fixes it.
export const PIN_FILES = Object.freeze([
  { file: 'verifiedMints.json', entries: 'mints', script: 'scripts/verify-mints.mjs', what: 'mints' },
  { file: 'verifiedOndo.json', entries: 'tokens', script: 'scripts/verify-ondo.mjs', what: 'Ondo tokens' },
])

export function judgePinAge(checkedAt, now = Date.now(), file = 'verifiedMints.json') {
  const at = Date.parse(checkedAt ?? '')
  if (!Number.isFinite(at)) return { ok: false, reason: `${file} has no readable checkedAt` }
  const ageDays = (now - at) / 86_400_000
  if (ageDays < 0) return { ok: false, reason: `checkedAt is in the future (${checkedAt})`, ageDays }
  return ageDays < MAX_PIN_AGE_DAYS
    ? { ok: true, ageDays }
    : { ok: false, ageDays, reason: `pinned ratios are ${ageDays.toFixed(1)} days old` }
}

function main() {
  for (const pin of PIN_FILES) {
    const json = JSON.parse(readFileSync(join(HERE, '..', 'src', 'data', pin.file), 'utf8'))
    const verdict = judgePinAge(json.checkedAt, Date.now(), pin.file)
    const count = Object.keys(json[pin.entries] ?? {}).length
    if (verdict.ok) {
      console.log(
        `Pinned ratios for ${count} ${pin.what} are ${verdict.ageDays.toFixed(1)} days old ` +
          `(limit ${MAX_PIN_AGE_DAYS}). Checked at ${json.checkedAt}.`
      )
      continue
    }
    console.error(`STALE: ${pin.file}: ${verdict.reason}.`)
    console.error(`Limit is ${MAX_PIN_AGE_DAYS} days. Re-run: node ${pin.script}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
