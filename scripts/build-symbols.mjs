// Regenerates api/_symbols.js — the stock-symbol allowlist api/finnhub.js
// forwards to Finnhub.
//
// Reads src/data/universe.json and emits its distinct non-null `underlying`
// values. No network: run it any time src/data/universe.json changes (i.e.
// after scripts/build-universe.mjs). api/_symbols.test.js fails if the two
// ever drift apart, so a forgotten run is caught by the test suite rather
// than by a user whose ticker silently stopped quoting.
//
//   node scripts/build-symbols.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const UNIVERSE_PATH = path.join(ROOT, 'src', 'data', 'universe.json')
const OUT_PATH = path.join(ROOT, 'api', '_symbols.js')

/** The distinct symbols the app can display, sorted for a stable diff. */
export function symbolsFromUniverse(assets) {
  return [...new Set(assets.map((a) => a.underlying).filter(Boolean))].sort()
}

const HEADER = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/build-symbols.mjs
//
// Every stock symbol the app can display: the distinct non-null "underlying"
// values in src/data/universe.json. api/finnhub.js and api/news.js forward
// nothing else, and api/history.js forwards nothing but the Yahoo spelling of
// an entry here.
//
// Why this list exists. The proxies used to accept any 1-10 character symbol,
// and every distinct symbol is a distinct edge-cache key, so a script walking
// ?symbol=AAAA..ZZZZ turned one shared cached response into unlimited upstream
// calls against Finnhub's shared 60/min free tier. A drained quota blanks the
// share price — and therefore the gap — for every user at once. Bounding the
// symbol space bounds the cache-key space, which bounds the upstream spend.
//
// Matching is EXACT, not case-insensitive. The client only ever sends the
// uppercase form straight out of universe.json, and accepting "aapl" beside
// "AAPL" would hand the drain straight back: case variants are different URLs,
// so they are different cache keys, and each one costs its own upstream call.

`

// Appended after isAllowedSymbol. Derived from the list above rather than
// generated as a second list, so there is one allowlist and not two that can
// drift.
const YAHOO_FOOTER = `
// Yahoo spells a class share with a dash where Finnhub uses a dot: BRK-B, not
// BRK.B. src/services/stocks.js and src/services/candles.js both rewrite the
// symbol with .replace('.', '-') before calling /api/history, so that exact
// transform — first dot only, same as the client — is the one mirrored here.
// No symbol in the universe carries two dots, so the two spellings agree
// today; mirroring the client rather than guessing keeps them agreeing if one
// ever does.
//
// api/_symbols.test.js asserts the mapping stays one-to-one. If two symbols
// ever collapsed onto the same Yahoo spelling, one of them would be silently
// unreachable through /api/history and its chart would go blank.
export const ALLOWED_YAHOO_SYMBOLS = new Set([...ALLOWED_SYMBOLS].map((s) => s.replace('.', '-')))

/** True when this is the Yahoo spelling of a symbol the app would ask for. */
export function isAllowedYahooSymbol(symbol) {
  return typeof symbol === 'string' && ALLOWED_YAHOO_SYMBOLS.has(symbol)
}
`

function generate() {
  const assets = JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8'))
  const symbols = symbolsFromUniverse(assets)

  // Eight per line: the list reads as a reviewable diff rather than one 2 KB line.
  const rows = []
  for (let i = 0; i < symbols.length; i += 8) {
    rows.push(`  ${symbols.slice(i, i + 8).map((s) => JSON.stringify(s)).join(', ')},`)
  }

  writeFileSync(
    OUT_PATH,
    `${HEADER}export const ALLOWED_SYMBOLS = new Set([\n${rows.join('\n')}\n])\n\n` +
      `/** True when this is a symbol the app itself would ask for. */\n` +
      `export function isAllowedSymbol(symbol) {\n` +
      `  return typeof symbol === 'string' && ALLOWED_SYMBOLS.has(symbol)\n` +
      `}\n` +
      YAHOO_FOOTER
  )

  console.log(`Wrote ${symbols.length} symbols to api/_symbols.js`)
}

// Only when run as a command. api/_symbols.test.js imports symbolsFromUniverse
// to check the generated file is still in sync, and importing a module must
// never rewrite the very file under test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generate()
