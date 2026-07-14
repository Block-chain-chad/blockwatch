// Universe builder: auto-maps the entire tokenized-stock market instead of the
// hand-curated seed list.
//
//   node scripts/build-universe.mjs
//
// Pipeline:
//   1. Pull every token in the issuer/type categories from CoinGecko.
//   2. Derive each token's real-world ticker from the issuer's symbol pattern
//      (xStocks: NVDAx -> NVDA, Ondo: TSLAon -> TSLA).
//   3. Validate every derived ticker against Finnhub once (cached in
//      scripts/.ticker-cache.json, 30-day TTL) — a guess that doesn't quote is
//      dropped to null and the token shows token-only, like OUSG.
//   4. Classify type: tokenized-etfs member -> etf, treasury/yield names -> bond,
//      else stock.
//   5. Emit src/data/universe.json (sorted by 24h volume) and a human-readable
//      mapping table at scripts/universe-report.txt for eyeballing.
//
// Free-tier budgets: CoinGecko keyless (~10 calls, 2.5s apart), Finnhub
// 60/min (validation throttled to ~55/min; cache makes re-runs near-free).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_PATH = path.join(ROOT, 'scripts', '.ticker-cache.json')
const OUT_PATH = path.join(ROOT, 'src', 'data', 'universe.json')
const REPORT_PATH = path.join(ROOT, 'scripts', 'universe-report.txt')
const CACHE_TTL = 30 * 24 * 60 * 60_000

// --- config ------------------------------------------------------------------

const CG_BASE = 'https://api.coingecko.com/api/v3'
const CG_DELAY_MS = 2_500 // keyless public tier
const FINNHUB_DELAY_MS = 1_100 // 60/min limit -> ~55/min

// Category roles. Issuer categories identify who minted the token (and thus
// the symbol pattern); type categories vote on stock/etf/bond. classifierOnly
// categories never ADD tokens to the universe — they only re-type tokens that
// are already in it (tokenized-treasuries is full of stablecoin-adjacent
// products we don't track).
const ETF_CAT = 'tokenized-exchange-traded-funds-etfs'
const BOND_CAT = 'tokenized-treasuries'
const CATEGORIES = [
  { id: 'xstocks-ecosystem', issuer: 'xStocks' },
  { id: 'ondo-tokenized-assets', issuer: 'Ondo' },
  { id: 'bstocks-ecosystem', issuer: 'bStocks' },
  { id: 'tokenized-stock', issuer: null },
  { id: ETF_CAT, issuer: null },
  { id: BOND_CAT, issuer: null, classifierOnly: true },
]

// Tracked since the original seed but absent from the issuer categories
// (ondo-tokenized-assets only holds the Global Markets line, not Ondo's own
// NAV funds). Dropping them would orphan existing watchlists.
const ALWAYS_INCLUDE = [
  { id: 'ousg', issuer: 'Ondo' },
  { id: 'ondo-us-dollar-yield', issuer: 'Ondo' },
]

// Symbol pattern per issuer: regex capture = the real-world ticker guess.
const TICKER_PATTERNS = {
  xStocks: /^(.+)x$/i,
  Ondo: /^(.+)on$/i,
  bStocks: /^(.+)b$/i,
}

// Guesses that quote fine on Finnhub but mean the wrong company — SPCX is a
// listed SPAC, while every token stripping to it is pre-IPO SpaceX.
const TICKER_BLOCKLIST = new Set(['SPCX'])

// Hand corrections for tokens the heuristics get wrong. Checked before
// pattern-derivation; underlying:null forces token-only; name replaces
// CoinGecko's when theirs reads badly on a row.
const OVERRIDES = {
  'sp500-xstock': { name: 'S&P 500 ETF' },
  'nasdaq-xstock': { name: 'Nasdaq 100 ETF' },
  'gold-xstock': { name: 'Gold Trust ETF' },
  'tqqq-xstock': { name: 'ProShares UltraPro QQQ' },
  'microstrategy-xstock': { name: 'Strategy' },
}

// NAV products & funds with no listed underlying: treasury/yield keywords.
const BOND_RE = /treasur|t-?bill|\byield\b|money market|\bbond\b/i

// Suffix junk CoinGecko appends to token names, stripped for display. The
// last two catch issuer parentheticals — including dangling ones left open
// when an earlier rule ate the closing half ("Circle (bStocks").
const NAME_STRIP = [
  /\s*\(?xstocks?\)?$/i,
  /\s*\(?ondo tokenized (stock|etf|fund)s?\)?$/i,
  /\s*\(?ondo global markets\)?$/i,
  /\s*\(?tokenized (stock|etf|fund)s?\)?$/i,
  /\s*\((bstocks?|backed|backpack|reality protocol|robinhood|st0x|figure|ondo|remora|prestocks?|openstock)[^)]*\)?$/i,
  /\s*•.*$/,
]

// --- helpers -----------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function readEnvLocal(name) {
  try {
    const raw = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    const line = raw.split(/\r?\n/).find((l) => l.startsWith(`${name}=`))
    return line ? line.slice(name.length + 1).trim() : null
  } catch {
    return null
  }
}

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (res.status === 429 && attempt <= 2) {
    console.log(`  rate-limited, backing off 65s (attempt ${attempt})...`)
    await sleep(65_000)
    return fetchJson(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

// --- 1. pull categories ------------------------------------------------------

async function fetchCategory(catId) {
  const rows = []
  for (let page = 1; page <= 4; page++) {
    const url = `${CG_BASE}/coins/markets?vs_currency=usd&category=${catId}&order=market_cap_desc&per_page=250&page=${page}`
    let batch
    try {
      batch = await fetchJson(url)
    } catch (err) {
      // A renamed/removed category shouldn't sink the whole build.
      console.log(`  WARNING ${catId} page ${page} failed (${err.message}) — continuing without it`)
      break
    }
    rows.push(...batch)
    if (batch.length < 250) break
    await sleep(CG_DELAY_MS)
  }
  return rows
}

// --- 2-4. derive / classify --------------------------------------------------

function cleanName(name) {
  let out = name
  for (const re of NAME_STRIP) out = out.replace(re, '')
  return out.trim() || name
}

function classify(coin) {
  if (coin._cats.has(ETF_CAT)) return 'etf'
  if (coin._cats.has(BOND_CAT)) return 'bond'
  if (BOND_RE.test(coin.name) || BOND_RE.test(coin._clean)) return 'bond'
  return 'stock'
}

function deriveCandidate(coin) {
  const pattern = TICKER_PATTERNS[coin._issuer]
  if (!pattern) return null
  const m = coin.symbol.match(pattern)
  if (!m) return null
  const guess = m[1].toUpperCase()
  coin._base = guess // display keeps issuer casing (SPCXx) even when unmapped
  if (TICKER_BLOCKLIST.has(guess)) return null
  // Listed US tickers: 1-5 letters, optional .CLASS (BRK.B). Anything else is
  // a NAV product or naming quirk -> token-only.
  return /^[A-Z]{1,5}(\.[A-Z])?$/.test(guess) ? guess : null
}

// --- main --------------------------------------------------------------------

const finnhubKey = readEnvLocal('VITE_FINNHUB_API_KEY')
if (!finnhubKey) {
  console.error('VITE_FINNHUB_API_KEY missing from .env.local — cannot validate tickers.')
  process.exit(1)
}

console.log('Fetching CoinGecko categories...')
const byId = new Map()
for (const cat of CATEGORIES) {
  const rows = await fetchCategory(cat.id)
  console.log(`  ${cat.id}: ${rows.length} tokens`)
  for (const row of rows) {
    const existing = byId.get(row.id)
    if (existing) {
      existing._cats.add(cat.id)
      if (!existing._issuer && cat.issuer) existing._issuer = cat.issuer
    } else if (!cat.classifierOnly) {
      byId.set(row.id, { ...row, _cats: new Set([cat.id]), _issuer: cat.issuer })
    }
  }
  await sleep(CG_DELAY_MS)
}

const alwaysMissing = ALWAYS_INCLUDE.filter((a) => !byId.has(a.id))
if (alwaysMissing.length > 0) {
  const rows = await fetchJson(
    `${CG_BASE}/coins/markets?vs_currency=usd&ids=${alwaysMissing.map((a) => a.id).join(',')}`
  )
  for (const row of rows) {
    const spec = alwaysMissing.find((a) => a.id === row.id)
    byId.set(row.id, { ...row, _cats: new Set(), _issuer: spec.issuer })
  }
  console.log(`  always-include: added ${rows.length} of ${alwaysMissing.length}`)
}

const all = [...byId.values()]
const priced = all.filter((c) => c.current_price != null)
console.log(`\n${all.length} unique tokens, ${priced.length} with a live price (rest dropped).`)

// Derive candidates and validate the unique set against Finnhub.
let cache = {}
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  } catch {
    cache = {}
  }
}

for (const coin of priced) {
  coin._clean = cleanName(coin.name)
  const o = OVERRIDES[coin.id]
  coin._candidate = o && 'underlying' in o ? o.underlying : deriveCandidate(coin)
}

const toValidate = [
  ...new Set(priced.map((c) => c._candidate).filter(Boolean)),
].filter((t) => !(cache[t] && Date.now() - cache[t].at < CACHE_TTL))

console.log(`Validating ${toValidate.length} tickers against Finnhub (cache covers the rest)...`)
let done = 0
for (const ticker of toValidate) {
  try {
    const q = await fetchJson(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${finnhubKey}`
    )
    cache[ticker] = { ok: Boolean(q.c > 0 || q.pc > 0), at: Date.now() }
  } catch (err) {
    console.log(`  ${ticker}: validation error (${err.message}) — treating as invalid this run`)
    cache[ticker] = { ok: false, at: 0 } // at:0 -> retried next run
  }
  done++
  if (done % 25 === 0) console.log(`  ...${done}/${toValidate.length}`)
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1))
  await sleep(FINNHUB_DELAY_MS)
}

// Assemble final records.
const assets = priced
  .map((coin) => {
    const o = OVERRIDES[coin.id] ?? {}
    const underlying = coin._candidate && cache[coin._candidate]?.ok ? coin._candidate : null
    const suffix =
      { xStocks: 'x', Ondo: 'on', bStocks: 'b' }[coin._issuer] ?? ''
    return {
      id: coin.id,
      ticker: underlying
        ? underlying + suffix
        : coin._base
          ? coin._base + suffix
          : coin.symbol.toUpperCase(),
      name: o.name ?? coin._clean,
      underlying,
      type: o.type ?? classify(coin),
      issuer: coin._issuer ?? 'Other',
      vol: Math.round(coin.total_volume ?? 0),
      cap: Math.round(coin.market_cap ?? 0),
    }
  })
  .sort((a, b) => b.vol - a.vol)

writeFileSync(OUT_PATH, JSON.stringify(assets, null, 1))

// Human-readable mapping table for review.
const pad = (s, n) => String(s ?? '').padEnd(n)
const lines = assets.map(
  (a) =>
    `${pad(a.ticker, 12)} ${pad(a.underlying ?? '—', 8)} ${pad(a.type, 6)} ${pad(a.issuer, 8)} ` +
    `${pad('$' + a.vol.toLocaleString('en-US'), 16)} ${a.name}  [${a.id}]`
)
writeFileSync(
  REPORT_PATH,
  `ticker       underly. type   issuer   vol24h           name  [coingecko id]\n${'-'.repeat(100)}\n${lines.join('\n')}\n`
)

const matched = assets.filter((a) => a.underlying).length
const byIssuer = {}
const byType = {}
for (const a of assets) {
  byIssuer[a.issuer] = (byIssuer[a.issuer] ?? 0) + 1
  byType[a.type] = (byType[a.type] ?? 0) + 1
}
console.log(`\nWrote ${assets.length} assets to src/data/universe.json`)
console.log(`  underlying matched: ${matched}, token-only: ${assets.length - matched}`)
console.log(`  by issuer: ${JSON.stringify(byIssuer)}`)
console.log(`  by type:   ${JSON.stringify(byType)}`)
console.log(`Full mapping table: scripts/universe-report.txt`)
