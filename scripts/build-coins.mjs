// Regenerates api/_coins.js, the CoinGecko coin-id allowlist api/token-history.js
// checks before it asks CoinGecko for a token's price history.
//
// Reads src/data/universe.json and emits every asset id (each one is the
// asset's CoinGecko id). No network: run it any time src/data/universe.json
// changes. api/_coins.test.js fails if the two drift apart.
//
//   node scripts/build-coins.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const UNIVERSE_PATH = path.join(ROOT, 'src', 'data', 'universe.json')
const OUT_PATH = path.join(ROOT, 'api', '_coins.js')

/** Every asset id in the universe, once each, sorted for a stable diff. */
export function coinsFromUniverse(assets) {
  return [...new Set(assets.map((a) => a.id).filter((id) => typeof id === 'string' && id))].sort()
}

const HEADER = `// GENERATED FILE. Do not edit by hand.
// Regenerate with: node scripts/build-coins.mjs
//
// Every CoinGecko coin id in src/data/universe.json. api/token-history.js
// asks CoinGecko about nothing else.
//
// Why this list exists. Every distinct id is a distinct edge-cache key, so a
// script walking made-up ids would turn the cache into unlimited calls
// against CoinGecko's limit, and token history would stop for every user.
//
// Matching is EXACT, case included. The client sends the id straight out of
// universe.json, and case variants would be new cache keys.

`

function generate() {
  const ids = coinsFromUniverse(JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8')))
  writeFileSync(
    OUT_PATH,
    `${HEADER}export const COIN_IDS = new Set([\n${ids.map((id) => `  ${JSON.stringify(id)},`).join('\n')}\n])\n\n` +
      `/** True when this is a coin id the app itself would ask about. */\n` +
      `export function isAllowedCoin(id) {\n` +
      `  return typeof id === 'string' && COIN_IDS.has(id)\n` +
      `}\n`
  )
  console.log(`Wrote ${ids.length} coin ids to api/_coins.js`)
}

// Only when run as a command, so the test can import coinsFromUniverse
// without rewriting the file under test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generate()
