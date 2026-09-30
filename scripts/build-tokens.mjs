// Regenerates api/_tokens.js, the token-ticker allowlist api/candles.js checks
// before it asks GeckoTerminal which pool a token trades in.
//
// Reads src/data/universe.json and emits every token ticker with the networks
// the app searches for it (src/lib/candles.js networksFor). No network: run it
// any time src/data/universe.json changes. api/_tokens.test.js fails if the
// two drift apart.
//
//   node scripts/build-tokens.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { networksFor } from '../src/lib/candles.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const UNIVERSE_PATH = path.join(ROOT, 'src', 'data', 'universe.json')
const OUT_PATH = path.join(ROOT, 'api', '_tokens.js')

/**
 * [ticker, networks[]] pairs, sorted by ticker for a stable diff. A ticker
 * that appears under two issuers gets the union of their networks.
 */
export function tokensFromUniverse(assets) {
  const byTicker = new Map()
  for (const a of assets) {
    if (!a.ticker) continue
    const nets = byTicker.get(a.ticker) ?? new Set()
    for (const n of networksFor(a)) nets.add(n)
    byTicker.set(a.ticker, nets)
  }
  return [...byTicker.keys()].sort().map((t) => [t, [...byTicker.get(t)].sort()])
}

const HEADER = `// GENERATED FILE. Do not edit by hand.
// Regenerate with: node scripts/build-tokens.mjs
//
// Every token ticker in src/data/universe.json, with the networks the app
// searches for it. api/candles.js resolves nothing else.
//
// Why this list exists. Every distinct ticker is a distinct edge-cache key, so
// a script walking made-up tickers turned the cache into unlimited calls
// against GeckoTerminal's shared free limit (about 30 a minute for everyone),
// and token charts stopped for every user (security review finding 6).
//
// Matching is EXACT, case included. The client sends the ticker straight out
// of universe.json, and case variants would be new cache keys.

`

function generate() {
  const tokens = tokensFromUniverse(JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8')))
  const rows = tokens.map(([t, nets]) => `  [${JSON.stringify(t)}, ${JSON.stringify(nets)}],`)
  writeFileSync(
    OUT_PATH,
    `${HEADER}export const TOKEN_NETWORKS = new Map([\n${rows.join('\n')}\n])\n\n` +
      `/** True when the app itself would search for this ticker on this network. */\n` +
      `export function isAllowedToken(ticker, network) {\n` +
      `  return typeof ticker === 'string' && Boolean(TOKEN_NETWORKS.get(ticker)?.includes(network))\n` +
      `}\n`
  )
  console.log(`Wrote ${tokens.length} tokens to api/_tokens.js`)
}

// Only when run as a command, so the test can import tokensFromUniverse
// without rewriting the file under test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generate()
