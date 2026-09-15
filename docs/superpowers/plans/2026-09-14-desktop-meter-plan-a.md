# The Meter, Plan A: Board + Readout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Meter desktop home (Gap Board + Readout, chart as a keyed drill-in) behind a `desktopHome` switch beside the untouched Phase 1 shell, so both homes can go to the ten testers on one preview URL.

**Architecture:** New pure modules (`board.js`, `reading.js`, `meterKeys.js`, `desktopHome.js`, `returnVisit.js`) carry every rule and are unit-tested under Vitest's node environment. New desktop components (`MeterShell`, `Masthead`, `Board`, `Readout`, `GapHeader`, `ChartFootStrip`) compose the existing hooks (`useAssetWorkspace`, `usePrices`, `useFolders`) and existing sections (`GapBar`, `PremiumChart`, `DetailTabs`, `TradeButton`, the sheets). Phase 1 files are touched only by additive props whose defaults leave their DOM identical; phone files are touched the same way or not at all.

**Tech Stack:** React 19, Vite 8, Tailwind v4, Vitest 4 (node environment, no DOM), oxlint. Lightweight Charts is not touched in this plan (the gap-history pane on the library is Plan C).

## Global Constraints

Copied from `docs/superpowers/specs/2026-09-14-desktop-meter-design.md`:

- Phones stay byte-identical: every change is gated on the desktop media query in `App.jsx` (`min-width: 64rem` and not the native app), a desktop-only file, or an additive prop whose default reproduces today's DOM.
- The Phase 1 shell (`DesktopShell.jsx` and everything it renders) stays in the tree untouched until the owner picks a default after the week-3 preview. New behaviour goes in new files or behind new props.
- Sizes come from the 4 px rhythm and the 56 px `AssetRow`: masthead 56, control strip 40, company row 56, wrapper sub-row 40, column header 32, foot strip 40. No 48, 64 or 38 anywhere in the new files.
- The gap is never red or green on the Meter: the rule carries direction by which side of the zero tick the fill sits on, the sign character carries the sign, the fill is the accent (`var(--color-accent)`).
- Vocabulary in copy and chrome: gap, wrapper, issuer, leg, age, session, reading, Board, Readout, cheapest, bp apart, at your size, round trip, Watching. Never: symbol, Supercharts, layouts, interval codes as chrome, the ▲/▼ title, "Data is delayed" as a sentence.
- No letter opens search and no digit opens an interval prompt. Nine guarded single keys (W A C F ? on the Board; L H M I inside a chart, of which only I is bound in this plan) fire only when focus is outside an input, which `keyContext` already enforces; Ctrl+K (⌘K) opens search.
- Storage keys for the Meter are `bw.meter.*`; the Phase 1 keys `bw.desktop.*` are not reused except `bw.desktop.home.v1` (the switch) and `bw.desktop.tab.v1` (DetailTabs, shared on purpose).
- Tests: every new pure module gets a `*.test.js` beside it. Run `npx vitest run` and `npx oxlint` before every commit; both must be clean (oxlint's three pre-existing warnings in `shared.jsx`, `api/history.js`, `api/news.js` are the baseline).
- Commits: one per task, message body in a temp file passed with `git commit -F`, ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Branch `feat/desktop-meter`. Never `git add .`; add the task's files by path.
- Deviation recorded for the owner: the spec's Plan A line "`WatchlistPane` desktop prop" is not built here. On the Meter the watchlist is the Board's Watching lens, so `WatchlistPane` is not rendered by the Meter at all; the prop would change nothing a tester can see.
- The week-3 deletion of `NavRail`, `IntervalPrompt`, `intervalInput`, `toolbarDensity` and `desktopKeys` is NOT in this plan. It happens only after the owner picks the Board, as its own commit.

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/board.js` (new) | Group live assets into companies for the Board: credibility, lead gap per sort, cheapest wrapper, spread in bp; the bounded subscription set; frozen ordering; flattening rows with heights; the visible window for virtualisation; the header line. |
| `src/lib/reading.js` (new) | The Readout's words and arithmetic: the sentence at a size, gap in dollars, round trip, the percentile caption. |
| `src/lib/provenance.js` (extend) | Per-leg lines (`tokenLegLine`, `shareLegLine`) beside the existing legend strings. Old exports untouched. |
| `src/lib/meterKeys.js` (new) | The Meter's key map and its shortcut rows. `desktopKeys.js` stays for Phase 1. |
| `src/lib/pageTitle.js` (extend) | `meterTitle`, `boardTitle`. Old exports untouched. |
| `src/lib/desktopHome.js` (new) | Which desktop home to mount: `?home=` query, then the remembered choice, default `meter`. |
| `src/lib/returnVisit.js` (new) | Classify an app open as first / return / lapsed from the last-seen stamp, for the return counter. |
| `src/components/shared.jsx` (extend) | `GapBar` gains `tone` and `height` props with today's defaults. |
| `src/components/desktop/Board.jsx` (new) | Region B: control strip, column header, virtualised company rows and wrapper sub-rows, keyboard focus, selection. |
| `src/components/desktop/Readout.jsx` (new) | Region C: the sentence, size pills, wrapper picker, the reading, the rule, legs, at your size, gap history, "Price chart" strip, actions, tabs. |
| `src/components/desktop/Masthead.jsx` (new) | Region A: wordmark, five words, search, session sentence, widest gap, bell, avatar. |
| `src/components/desktop/GapHeader.jsx` (new) | The drill-in's 56 px header above the canvas. |
| `src/components/desktop/ChartFootStrip.jsx` (new) | The drill-in's 40 px strip at the chart's foot. |
| `src/components/desktop/ChartWorkspace.jsx` (extend) | A `drillIn` prop: gap header on top, no toolbar row, no legend title row, no countdown, no tabs, foot strip at the bottom. Default path unchanged. |
| `src/components/desktop/DetailTabs.jsx` (extend) | A `variant="meter"` prop: Statistics · News · Trades on · Learn. Default unchanged. |
| `src/components/desktop/ShortcutSheet.jsx` (extend) | `rows`, `intro`, `footer` props with today's values as defaults. |
| `src/hooks/useMeterShortcuts.js` (new) | Wires `meterKeys` actions to the shell. |
| `src/components/desktop/MeterShell.jsx` (new) | The Meter home: masthead + Board + Readout, takeovers, the drill-in, restore on load, titles, analytics. |
| `src/App.jsx` (extend) | Mount `MeterShell` or `DesktopShell` by `desktopHome`. Phone branch untouched. |

---

### Task 1: `board.js` grouping, credibility, sort, cheapest, spread

**Files:**
- Create: `src/lib/board.js`
- Test: `src/lib/board.test.js`

**Interfaces:**
- Consumes: `premiumPct`, `isThinlyTraded`, `PARITY_BAND` from `src/lib/prices.js`; `isPlausiblePct` from `src/lib/format.js`; `filterAssets` is NOT used (it lives in a component file); the lens filter is reimplemented here on `asset.type`.
- Produces: `BOARD_SORTS`, `BOARD_LENSES`, `MAX_CREDIBLE_GAP`, `groupCompanies(assets, opts) → Company[]` where `Company = { key, underlying, name, logoAsset, wrappers: Wrapper[], lead, leadAsset, cheapestAsset, spreadBp, muted, volume24h }` and `Wrapper = { asset, gap, diffUsd, muted, cheapest }`.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/board.test.js
import { describe, it, expect } from 'vitest'
import { groupCompanies, BOARD_SORTS, BOARD_LENSES, MAX_CREDIBLE_GAP } from './board'

const A = (over) => ({
  id: over.id,
  ticker: over.ticker,
  name: over.name ?? 'Co',
  underlying: over.underlying ?? null,
  type: over.type ?? 'stock',
  issuer: over.issuer ?? 'xStocks',
  tokenPrice: over.tokenPrice ?? null,
  stockPrice: over.stockPrice ?? null,
  volume24h: over.volume24h ?? 1_000_000,
})

const NVDAX = A({ id: 'nvdax', ticker: 'NVDAx', name: 'NVIDIA', underlying: 'NVDA', tokenPrice: 218.49, stockPrice: 218.29 })
const NVDAON = A({ id: 'nvdaon', ticker: 'NVDAon', name: 'NVIDIA', underlying: 'NVDA', issuer: 'Ondo', tokenPrice: 218.4, stockPrice: 218.29 })
const NVDAB = A({ id: 'nvdab', ticker: 'NVDAb', name: 'NVIDIA', underlying: 'NVDA', issuer: 'bStocks', tokenPrice: 218.55, stockPrice: 218.29 })
const TSLAX = A({ id: 'tslax', ticker: 'TSLAx', name: 'Tesla', underlying: 'TSLA', tokenPrice: 366.72, stockPrice: 365.44 })
const HOODX = A({ id: 'hoodx', ticker: 'HOODx', name: 'Robinhood', underlying: 'HOOD', tokenPrice: 118.03, stockPrice: 118.4 })
const SPYX = A({ id: 'spyx', ticker: 'SPYx', name: 'SPDR S&P 500', underlying: 'SPY', type: 'etf', tokenPrice: 766.73, stockPrice: 764.29 })
const NAV = A({ id: 'tbill', ticker: 'TBILL', name: 'T-bill fund', tokenPrice: 1.0 })
const THIN = A({ id: 'wmkt', ticker: 'WMKTx', name: 'Walmart', underlying: 'WMT', tokenPrice: 50, stockPrice: 100, volume24h: 1_000 })
const NOQUOTE = A({ id: 'aaplx', ticker: 'AAPLx', name: 'Apple', underlying: 'AAPL', tokenPrice: 332.27 })

const ALL = [NVDAX, NVDAON, NVDAB, TSLAX, HOODX, SPYX, NAV, THIN, NOQUOTE]

describe('groupCompanies', () => {
  it('makes one row per underlying, and none for NAV products or unquoted shares', () => {
    const rows = groupCompanies(ALL)
    expect(rows.map((r) => r.underlying)).toEqual(['TSLA', 'SPY', 'HOOD', 'NVDA', 'WMT'])
    expect(rows.find((r) => r.underlying === 'AAPL')).toBeUndefined()
  })

  it('reads the widest wrapper as the lead and names the cheapest', () => {
    const nvda = groupCompanies(ALL).find((r) => r.underlying === 'NVDA')
    expect(nvda.wrappers.map((w) => w.asset.ticker)).toEqual(['NVDAb', 'NVDAx', 'NVDAon'])
    expect(nvda.leadAsset.ticker).toBe('NVDAb')
    expect(nvda.lead).toBeCloseTo(0.119, 3)
    expect(nvda.cheapestAsset.ticker).toBe('NVDAon')
    expect(nvda.wrappers.find((w) => w.cheapest).asset.ticker).toBe('NVDAon')
    expect(nvda.spreadBp).toBe(7)
  })

  it('has no cheapest and no spread for a single wrapper', () => {
    const tsla = groupCompanies(ALL).find((r) => r.underlying === 'TSLA')
    expect(tsla.cheapestAsset).toBeNull()
    expect(tsla.spreadBp).toBeNull()
    expect(tsla.wrappers).toHaveLength(1)
  })

  it('prices the gap in dollars per wrapper', () => {
    const nvda = groupCompanies(ALL).find((r) => r.underlying === 'NVDA')
    const x = nvda.wrappers.find((w) => w.asset.ticker === 'NVDAx')
    expect(x.diffUsd).toBeCloseTo(0.2, 6)
  })

  it('mutes thin and implausible wrappers and sinks them below credible rows', () => {
    const rows = groupCompanies(ALL)
    const wmt = rows[rows.length - 1]
    expect(wmt.underlying).toBe('WMT')
    expect(wmt.muted).toBe(true)
    expect(wmt.wrappers[0].muted).toBe(true)
    expect(MAX_CREDIBLE_GAP).toBe(25)
  })

  it('with credibleOnly off, a muted wrapper still counts toward the lead', () => {
    const rows = groupCompanies(ALL, { credibleOnly: false })
    expect(rows[0].underlying).toBe('WMT')
    expect(rows[0].muted).toBe(false)
  })

  it('sorts by each BOARD_SORTS id', () => {
    const by = (sort) => groupCompanies(ALL, { sort }).map((r) => r.underlying)
    expect(by('widest')).toEqual(['TSLA', 'SPY', 'HOOD', 'NVDA', 'WMT'])
    expect(by('premium')).toEqual(['TSLA', 'SPY', 'NVDA', 'HOOD', 'WMT'])
    expect(by('discount')).toEqual(['HOOD', 'NVDA', 'SPY', 'TSLA', 'WMT'])
    expect(BOARD_SORTS.map((s) => s.id)).toEqual(['widest', 'premium', 'discount', 'traded'])
  })

  it('ranks by summed token volume under traded', () => {
    const rows = groupCompanies(ALL, { sort: 'traded' })
    expect(rows[0].underlying).toBe('NVDA')
    expect(rows[0].volume24h).toBe(3_000_000)
  })

  it('under discount and premium the lead is the extreme in that direction', () => {
    const nvda = groupCompanies(ALL, { sort: 'discount' }).find((r) => r.underlying === 'NVDA')
    expect(nvda.leadAsset.ticker).toBe('NVDAon')
    const nvda2 = groupCompanies(ALL, { sort: 'premium' }).find((r) => r.underlying === 'NVDA')
    expect(nvda2.leadAsset.ticker).toBe('NVDAb')
  })

  it('filters by lens: type chips and the Watching lens', () => {
    expect(groupCompanies(ALL, { lens: 'etf' }).map((r) => r.underlying)).toEqual(['SPY'])
    expect(groupCompanies(ALL, { lens: 'stock' }).map((r) => r.underlying)).not.toContain('SPY')
    const watching = groupCompanies(ALL, { lens: 'watching', watchlistIds: ['hoodx', 'nvdaon'] })
    expect(watching.map((r) => r.underlying)).toEqual(['HOOD', 'NVDA'])
    expect(watching.find((r) => r.underlying === 'NVDA').wrappers).toHaveLength(1)
    expect(BOARD_LENSES.map((l) => l.id)).toEqual(['all', 'stock', 'etf', 'bond', 'watching'])
  })

  it('keys each row by its underlying so order can be frozen', () => {
    expect(groupCompanies(ALL).map((r) => r.key)).toEqual(['TSLA', 'SPY', 'HOOD', 'NVDA', 'WMT'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/board.test.js`
Expected: FAIL with "Failed to resolve import ./board" (module missing).

- [ ] **Step 3: Write the implementation**

```js
// src/lib/board.js
// The Gap Board's rules, kept pure so vitest runs them under node: how live
// assets become one row per company, which wrapper leads the row, which is
// cheapest, how far apart the issuers price the same share, and what may be
// asserted. No React, no services.
//
// A company is keyed by its underlying ticker. Products with no underlying
// (NAV-based funds) have no share to compare against and are not on the
// Board; the Readout still opens them from search.

import { premiumPct, isThinlyTraded } from './prices'
import { isPlausiblePct } from './format'

/** Past this the number is a stale print, not a mispricing (Screener's rule). */
export const MAX_CREDIBLE_GAP = 25

export const BOARD_SORTS = Object.freeze([
  { id: 'widest', label: 'Widest gap', hint: 'Furthest from the share price, either direction' },
  { id: 'premium', label: 'Most expensive', hint: 'Token costs the most above its share' },
  { id: 'discount', label: 'Cheapest', hint: 'Token costs the least against its share' },
  { id: 'traded', label: 'Most traded', hint: 'Most token volume in 24 hours, all wrappers' },
])

export const BOARD_LENSES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'stock', label: 'Stocks' },
  { id: 'etf', label: 'ETFs' },
  { id: 'bond', label: 'Bonds' },
  { id: 'watching', label: 'Watching' },
])

function inLens(asset, lens, watchlistIds) {
  if (lens === 'all') return true
  if (lens === 'watching') return watchlistIds.includes(asset.id)
  return asset.type === lens
}

/** The wrapper whose gap is the extreme the sort asks for. */
function pickLead(wrappers, sort) {
  if (wrappers.length === 0) return null
  const by = {
    premium: (a, b) => b.gap - a.gap,
    discount: (a, b) => a.gap - b.gap,
  }[sort] ?? ((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
  return [...wrappers].sort(by)[0]
}

/**
 * groupCompanies(assets, { lens, sort, credibleOnly, watchlistIds })
 *
 * One row per underlying, wrappers sorted widest-first inside it. A wrapper
 * is `muted` when its market is thin or its gap is outside ±MAX_CREDIBLE_GAP.
 * With `credibleOnly` (the default) muted wrappers are shown but do not
 * decide the row's lead, cheapest or spread; a row with no credible wrapper
 * is itself muted and sorts after every credible row. With it off, every
 * wrapper counts.
 */
export function groupCompanies(
  assets,
  { lens = 'all', sort = 'widest', credibleOnly = true, watchlistIds = [] } = {}
) {
  const byUnderlying = new Map()
  for (const asset of assets ?? []) {
    if (!asset.underlying) continue
    if (!inLens(asset, lens, watchlistIds)) continue
    const gap = premiumPct(asset)
    if (gap == null) continue
    const muted = isThinlyTraded(asset) || !isPlausiblePct(gap, MAX_CREDIBLE_GAP)
    const wrapper = {
      asset,
      gap,
      diffUsd: asset.tokenPrice - asset.stockPrice,
      muted,
      cheapest: false,
    }
    if (!byUnderlying.has(asset.underlying)) byUnderlying.set(asset.underlying, [])
    byUnderlying.get(asset.underlying).push(wrapper)
  }

  const rows = []
  for (const [underlying, wrappers] of byUnderlying) {
    wrappers.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    const counted = credibleOnly ? wrappers.filter((w) => !w.muted) : wrappers
    const lead = pickLead(counted, sort)
    let cheapest = null
    let spreadBp = null
    if (counted.length > 1) {
      cheapest = counted.reduce((m, w) => (w.gap < m.gap ? w : m))
      cheapest.cheapest = true
      const gaps = counted.map((w) => w.gap)
      spreadBp = Math.round((Math.max(...gaps) - Math.min(...gaps)) * 100)
    }
    rows.push({
      key: underlying,
      underlying,
      name: wrappers[0].asset.name,
      logoAsset: wrappers[0].asset,
      wrappers,
      lead: lead ? lead.gap : null,
      leadAsset: lead ? lead.asset : null,
      cheapestAsset: cheapest ? cheapest.asset : null,
      spreadBp,
      muted: lead == null,
      volume24h: wrappers.reduce((s, w) => s + (w.asset.volume24h ?? 0), 0),
    })
  }

  const cmp = {
    widest: (a, b) => Math.abs(b.lead) - Math.abs(a.lead),
    premium: (a, b) => b.lead - a.lead,
    discount: (a, b) => a.lead - b.lead,
    traded: (a, b) => b.volume24h - a.volume24h,
  }[sort] ?? ((a, b) => Math.abs(b.lead) - Math.abs(a.lead))

  return rows.sort((a, b) => {
    if (a.muted !== b.muted) return a.muted ? 1 : -1
    if (a.muted && b.muted) return Math.abs(b.wrappers[0].gap) - Math.abs(a.wrappers[0].gap)
    return cmp(a, b)
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/board.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/board.js src/lib/board.test.js
printf 'Board rules: companies, credibility, lead, cheapest, spread\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 2: `board.js` bounded subscription, frozen order, rows and the visible window, header line

**Files:**
- Modify: `src/lib/board.js`
- Test: `src/lib/board.test.js`

**Interfaces:**
- Consumes: `isStockDelayed` from `src/lib/provenance.js`.
- Produces: `CANDIDATE_CAP`, `boundCandidates(staticAssets, { watchlistIds, cap }) → string[]` (asset ids), `freezeOrder(prevKeys, companies) → { companies, keys }`, `flattenRows(companies, expandedKey) → Row[]` with `Row = { type: 'company' | 'wrapper', key, height, company, wrapper? }`, `COMPANY_ROW_H = 56`, `WRAPPER_ROW_H = 40`, `visibleWindow(heights, scrollTop, viewportHeight, overscan) → { start, end, top, bottom }`, `headerLine({ count, session, stockAgeSeconds }) → string`.

- [ ] **Step 1: Write the failing tests** (append to `src/lib/board.test.js`)

```js
import {
  boundCandidates, CANDIDATE_CAP, freezeOrder, flattenRows, visibleWindow, headerLine,
  COMPANY_ROW_H, WRAPPER_ROW_H,
} from './board'

const S = (id, underlying, vol, extra = {}) => ({ id, ticker: id.toUpperCase(), underlying, vol, ...extra })

describe('boundCandidates', () => {
  const universe = [
    S('a1', 'A', 10), S('a2', 'A', 5),         // two wrappers of A
    S('b1', 'B', 1_000),                      // one wrapper, big volume
    S('c1', 'C', 1), S('c2', 'C', 1),         // two wrappers of C
    S('d1', 'D', 500),
    S('nav', null, 9_999),                    // no underlying: never a candidate
  ]

  it('takes the watchlist first, then every wrapper of multi-wrapper companies, then by volume', () => {
    const ids = boundCandidates(universe, { watchlistIds: ['d1'], cap: 10 })
    expect(ids.slice(0, 1)).toEqual(['d1'])
    expect(ids).toEqual(expect.arrayContaining(['a1', 'a2', 'c1', 'c2', 'b1']))
    expect(ids).not.toContain('nav')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('caps by distinct underlying and keeps every wrapper of a chosen company', () => {
    const ids = boundCandidates(universe, { watchlistIds: [], cap: 2 })
    const unders = new Set(ids.map((id) => universe.find((a) => a.id === id).underlying))
    expect(unders.size).toBe(2)
    expect(unders.has('A')).toBe(true)
    expect(unders.has('C')).toBe(true)
    expect(ids).toEqual(expect.arrayContaining(['a1', 'a2', 'c1', 'c2']))
    expect(CANDIDATE_CAP).toBe(150)
  })
})

describe('freezeOrder', () => {
  const rows = (keys) => keys.map((key) => ({ key }))

  it('keeps the previous order when the same companies come back in a new order', () => {
    const r = freezeOrder(['NVDA', 'TSLA', 'SPY'], rows(['TSLA', 'SPY', 'NVDA']))
    expect(r.companies.map((c) => c.key)).toEqual(['NVDA', 'TSLA', 'SPY'])
    expect(r.keys).toEqual(['NVDA', 'TSLA', 'SPY'])
  })

  it('drops companies that are gone', () => {
    const r = freezeOrder(['NVDA', 'TSLA', 'SPY'], rows(['SPY', 'NVDA']))
    expect(r.companies.map((c) => c.key)).toEqual(['NVDA', 'SPY'])
    expect(r.keys).toEqual(['NVDA', 'SPY'])
  })

  it('re-sorts freely while new companies are still arriving', () => {
    const r = freezeOrder(['NVDA'], rows(['TSLA', 'NVDA']))
    expect(r.companies.map((c) => c.key)).toEqual(['TSLA', 'NVDA'])
    expect(r.keys).toEqual(['TSLA', 'NVDA'])
  })

  it('takes the fresh order with no previous keys', () => {
    const r = freezeOrder([], rows(['B', 'A']))
    expect(r.keys).toEqual(['B', 'A'])
  })
})

describe('flattenRows / visibleWindow', () => {
  const company = (key, n) => ({
    key,
    wrappers: Array.from({ length: n }, (_, i) => ({ asset: { id: `${key}${i}` } })),
  })

  it('flattens companies and expands one', () => {
    const rows = flattenRows([company('A', 2), company('B', 1)], 'A')
    expect(rows.map((r) => r.type)).toEqual(['company', 'wrapper', 'wrapper', 'company'])
    expect(rows.map((r) => r.key)).toEqual(['A', 'A/A0', 'A/A1', 'B'])
    expect(rows.map((r) => r.height)).toEqual([COMPANY_ROW_H, WRAPPER_ROW_H, WRAPPER_ROW_H, COMPANY_ROW_H])
    expect(rows[1].wrapper.asset.id).toBe('A0')
    expect(rows[1].company.key).toBe('A')
  })

  it('windows rows to the viewport with overscan and spacer heights', () => {
    const heights = Array(100).fill(56)
    const w = visibleWindow(heights, 560, 280, 2)
    expect(w.start).toBe(8)
    expect(w.end).toBe(17)
    expect(w.top).toBe(8 * 56)
    expect(w.bottom).toBe((100 - 17) * 56)
  })

  it('never windows past the ends', () => {
    const heights = [56, 40, 40, 56]
    expect(visibleWindow(heights, 0, 1000, 6)).toEqual({ start: 0, end: 4, top: 0, bottom: 0 })
    expect(visibleWindow([], 0, 100, 6)).toEqual({ start: 0, end: 0, top: 0, bottom: 0 })
  })
})

describe('headerLine', () => {
  it('says the share leg state in the session\'s words', () => {
    expect(headerLine({ count: 459, session: 'closed', stockAgeSeconds: 9000 })).toBe(
      '459 companies · share legs at last close'
    )
    expect(headerLine({ count: 12, session: 'regular', stockAgeSeconds: 12 })).toBe(
      '12 companies · share leg live'
    )
    expect(headerLine({ count: 12, session: 'regular', stockAgeSeconds: 900 })).toBe(
      '12 companies · share leg stale, refreshing'
    )
    expect(headerLine({ count: 3, session: 'post', stockAgeSeconds: 12 })).toBe(
      '3 companies · share legs at 4pm close, after hours'
    )
    expect(headerLine({ count: 1, session: 'pre', stockAgeSeconds: 12 })).toBe(
      '1 company · share legs at last close, pre-market'
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/board.test.js`
Expected: FAIL, the new imports are undefined.

- [ ] **Step 3: Write the implementation** (append to `src/lib/board.js`, plus one import at the top)

```js
import { isStockDelayed } from './provenance'

/**
 * Finnhub's shared 60/min cannot quote 459 underlyings. The Board asks for
 * a bounded set, in this order: the watchlist, every wrapper of every
 * company with more than one wrapper (the issuer spread is the Board's
 * reason to exist), then single-wrapper companies by static volume. The
 * cap counts distinct UNDERLYINGS, because that is what a quote costs;
 * every wrapper of a chosen company comes along.
 */
export const CANDIDATE_CAP = 150

export function boundCandidates(staticAssets, { watchlistIds = [], cap = CANDIDATE_CAP } = {}) {
  const byUnder = new Map()
  for (const a of staticAssets ?? []) {
    if (!a.underlying) continue
    if (!byUnder.has(a.underlying)) byUnder.set(a.underlying, [])
    byUnder.get(a.underlying).push(a)
  }
  const chosen = new Set()
  const ids = []
  const take = (underlying) => {
    if (chosen.has(underlying) || chosen.size >= cap) return
    chosen.add(underlying)
    for (const a of byUnder.get(underlying) ?? []) ids.push(a.id)
  }
  const byId = new Map((staticAssets ?? []).map((a) => [a.id, a]))
  for (const id of watchlistIds) {
    const a = byId.get(id)
    if (a?.underlying) take(a.underlying)
  }
  for (const [u, list] of byUnder) if (list.length > 1) take(u)
  const rest = [...byUnder.entries()]
    .filter(([u]) => !chosen.has(u))
    .sort(([, a], [, b]) => (b[0].vol ?? 0) - (a[0].vol ?? 0))
  for (const [u] of rest) take(u)
  return ids
}

/**
 * Sort order is frozen once every company has arrived: the 50-quote rotor
 * refreshes rows in place and must never reorder the Board under the
 * reader. While companies are still arriving (a key not in `prevKeys`) the
 * fresh order stands, so the first paint is never a junk order.
 */
export function freezeOrder(prevKeys, companies) {
  const fresh = { companies, keys: companies.map((c) => c.key) }
  if (!prevKeys || prevKeys.length === 0) return fresh
  const byKey = new Map(companies.map((c) => [c.key, c]))
  if (companies.some((c) => !prevKeys.includes(c.key))) return fresh
  const kept = prevKeys.filter((k) => byKey.has(k))
  return { companies: kept.map((k) => byKey.get(k)), keys: kept }
}

export const COMPANY_ROW_H = 56
export const WRAPPER_ROW_H = 40

/** The Board's rows in order: each company, and under the expanded one its wrappers. */
export function flattenRows(companies, expandedKey) {
  const out = []
  for (const company of companies) {
    out.push({ type: 'company', key: company.key, height: COMPANY_ROW_H, company })
    if (company.key !== expandedKey) continue
    for (const wrapper of company.wrappers) {
      out.push({
        type: 'wrapper',
        key: `${company.key}/${wrapper.asset.id}`,
        height: WRAPPER_ROW_H,
        company,
        wrapper,
      })
    }
  }
  return out
}

/**
 * Which rows to render for a scroll position: the first index at or above
 * the viewport top, the index past the viewport bottom, each padded by
 * `overscan` rows, plus the spacer heights that keep the scrollbar honest.
 */
export function visibleWindow(heights, scrollTop, viewportHeight, overscan = 6) {
  const n = heights.length
  if (n === 0) return { start: 0, end: 0, top: 0, bottom: 0 }
  let y = 0
  let start = 0
  while (start < n && y + heights[start] <= scrollTop) {
    y += heights[start]
    start++
  }
  let end = start
  let seen = y
  while (end < n && seen < scrollTop + viewportHeight) {
    seen += heights[end]
    end++
  }
  start = Math.max(0, start - overscan)
  end = Math.min(n, end + overscan)
  let top = 0
  for (let i = 0; i < start; i++) top += heights[i]
  let bottom = 0
  for (let i = end; i < n; i++) bottom += heights[i]
  return { start, end, top, bottom }
}

/** The control strip's honesty count: how many companies, and what the share leg is right now. */
export function headerLine({ count, session, stockAgeSeconds }) {
  const noun = count === 1 ? 'company' : 'companies'
  const head = `${count} ${noun}`
  if (session === 'regular') {
    return isStockDelayed(session, stockAgeSeconds)
      ? `${head} · share leg stale, refreshing`
      : `${head} · share leg live`
  }
  if (session === 'post') return `${head} · share legs at 4pm close, after hours`
  if (session === 'pre') return `${head} · share legs at last close, pre-market`
  return `${head} · share legs at last close`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/board.test.js`
Expected: PASS, 21 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/board.js src/lib/board.test.js
printf 'Board rules: bounded quotes, frozen order, virtual rows, header line\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 3: `reading.js` and the per-leg lines in `provenance.js`

**Files:**
- Create: `src/lib/reading.js`
- Test: `src/lib/reading.test.js`
- Modify: `src/lib/provenance.js` (append two exports; nothing existing changes)
- Modify: `src/lib/provenance.test.js` (append)
- Modify: `src/services/stocks.js` (append one export)

**Interfaces:**
- Consumes: `formatPct`, `formatPrice`, `formatCompact`, `isPlausiblePct`, `EM_DASH` from `format.js`; `PARITY_BAND` from `prices.js`; `MAX_CREDIBLE_GAP` from `board.js`.
- Produces: `SIZES = [100, 1000, 10000]`, `formatSize(size) → '$1,000'`, `gapDollars(gapPct, size) → number | null`, `readingSentence({ ticker, companyName, gapPct, size, thin, volume24h }) → string`, `roundTrip({ gapPct, spreadPct, size }) → { gapUsd, spreadUsd, total } | null`, `gapPercentile(premium, currentPct) → number | null` (0..100, percent of readings whose |v| is below |current|), `percentileCaption(range, pct) → string`, `RANGE_WORDS`.
- `provenance.js`: `ageWords(seconds) → '7 s ago' | '2 m ago' | '3 h ago' | 'no price yet'`, `tokenLegLine({ price, ageSeconds, source }) → 'Token $218.49 · 7 s ago · via Jupiter'`, `shareLegLine({ price, session, ageSeconds, source }) → 'Share $218.29 · at last close · Finnhub'`.
- `stocks.js`: `STOCK_QUOTE_SOURCE` = `'Finnhub'` in production or when a Finnhub key is set, else `'Yahoo Finance'`.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/reading.test.js
import { describe, it, expect } from 'vitest'
import {
  SIZES, formatSize, gapDollars, readingSentence, roundTrip, gapPercentile, percentileCaption, RANGE_WORDS,
} from './reading'

const MINUS = '−'

describe('gapDollars / formatSize', () => {
  it('is the size times the gap', () => {
    expect(gapDollars(0.0916, 1000)).toBeCloseTo(0.916, 3)
    expect(gapDollars(-2.14, 1000)).toBeCloseTo(-21.4, 3)
    expect(gapDollars(null, 1000)).toBeNull()
    expect(SIZES).toEqual([100, 1000, 10000])
    expect(formatSize(1000)).toBe('$1,000')
    expect(formatSize(100)).toBe('$100')
  })
})

describe('readingSentence', () => {
  const base = { ticker: 'NVDAx', companyName: 'NVIDIA', size: 1000, thin: false, volume24h: 5_000_000 }

  it('says the gap in dollars at the size, more or less', () => {
    expect(readingSentence({ ...base, gapPct: 0.0916 })).toBe(
      'On $1,000 of NVIDIA, NVDAx costs $0.92 more than the shares right now.'
    )
    expect(readingSentence({ ...base, gapPct: -2.14 })).toBe(
      'On $1,000 of NVIDIA, NVDAx costs $21.40 less than the shares right now.'
    )
    expect(readingSentence({ ...base, gapPct: -2.14, size: 100 })).toBe(
      'On $100 of NVIDIA, NVDAx costs $2.14 less than the shares right now.'
    )
  })

  it('calls parity the same', () => {
    expect(readingSentence({ ...base, gapPct: 0.02 })).toBe(
      'On $1,000 of NVIDIA, NVDAx costs the same as the shares right now.'
    )
  })

  it('refuses to price noise', () => {
    expect(readingSentence({ ...base, gapPct: 18, thin: true, volume24h: 12_000 })).toBe(
      'The gap on NVDAx reads +18.00% but only $12k traded today; treat it as noise.'
    )
    expect(readingSentence({ ...base, gapPct: -40 })).toBe(
      `The gap on NVDAx reads ${MINUS}40.00% and no real wrapper drifts that far; treat it as noise.`
    )
    expect(readingSentence({ ...base, gapPct: 18, thin: true, volume24h: null })).toBe(
      'The gap on NVDAx reads +18.00% but almost nothing traded today; treat it as noise.'
    )
  })

  it('says when there is no share price', () => {
    expect(readingSentence({ ...base, gapPct: null })).toBe('No share price for NVDAx yet.')
  })
})

describe('roundTrip', () => {
  it('adds the gap and the DEX spread at the size', () => {
    expect(roundTrip({ gapPct: 0.0916, spreadPct: 0.046, size: 1000 })).toEqual({
      gapUsd: expect.closeTo(0.916, 3),
      spreadUsd: expect.closeTo(0.46, 3),
      total: expect.closeTo(1.376, 3),
    })
    expect(roundTrip({ gapPct: -1, spreadPct: 0.5, size: 100 }).gapUsd).toBeCloseTo(1, 6)
  })

  it('is null without a spread or a gap', () => {
    expect(roundTrip({ gapPct: 0.1, spreadPct: null, size: 1000 })).toBeNull()
    expect(roundTrip({ gapPct: null, spreadPct: 0.1, size: 1000 })).toBeNull()
  })
})

describe('gapPercentile / percentileCaption', () => {
  const series = [-0.4, -0.2, 0, 0.1, 0.3, 0.6, 0.9, 1.2].map((v, i) => ({ t: i, v }))

  it('is the share of readings narrower than now, by absolute value', () => {
    expect(gapPercentile(series, 0.5)).toBe(63)
    expect(gapPercentile(series, 2)).toBe(100)
    expect(gapPercentile(series, 0)).toBe(0)
    expect(gapPercentile([], 0.5)).toBeNull()
    expect(gapPercentile(series, null)).toBeNull()
  })

  it('captions with the range\'s granularity, never a bare "of the past year"', () => {
    expect(percentileCaption('1W', 71)).toBe('Wider than 71% of its half-hour readings this week.')
    expect(percentileCaption('1W', 29)).toBe('Narrower than 71% of its half-hour readings this week.')
    expect(percentileCaption('1D', 50)).toBe('Wider than 50% of its five-minute readings today.')
    expect(percentileCaption('1M', 82)).toBe('Wider than 82% of its daily close-to-close readings this month.')
    expect(percentileCaption('1Y', 82)).toBe('Wider than 82% of its daily close-to-close readings this year.')
    expect(percentileCaption('1W', null)).toBe('')
    expect(RANGE_WORDS['1D']).toBe('Past day')
  })
})
```

Append to `src/lib/provenance.test.js`:

```js
import { ageWords, tokenLegLine, shareLegLine } from './provenance'

describe('per-leg lines', () => {
  it('words an age', () => {
    expect(ageWords(7)).toBe('7 s ago')
    expect(ageWords(41)).toBe('41 s ago')
    expect(ageWords(125)).toBe('2 m ago')
    expect(ageWords(7200)).toBe('2 h ago')
    expect(ageWords(null)).toBe('no price yet')
  })

  it('reads the token leg', () => {
    expect(tokenLegLine({ price: 218.49, ageSeconds: 7, source: 'Jupiter' })).toBe(
      'Token $218.49 · 7 s ago · via Jupiter'
    )
    expect(tokenLegLine({ price: null, ageSeconds: null, source: 'CoinGecko' })).toBe(
      'Token — · no price yet · via CoinGecko'
    )
  })

  it('reads the share leg in the session\'s words', () => {
    expect(shareLegLine({ price: 218.29, session: 'closed', ageSeconds: 9000, source: 'Finnhub' })).toBe(
      'Share $218.29 · at last close · Finnhub'
    )
    expect(shareLegLine({ price: 218.29, session: 'regular', ageSeconds: 12, source: 'Finnhub' })).toBe(
      'Share $218.29 · 12 s ago · live · Finnhub'
    )
    expect(shareLegLine({ price: 218.29, session: 'regular', ageSeconds: 900, source: 'Finnhub' })).toBe(
      'Share $218.29 · 15 m ago · stale · Finnhub'
    )
    expect(shareLegLine({ price: 218.29, session: 'post', ageSeconds: 12, source: 'Finnhub' })).toBe(
      'Share $218.29 · at 4pm close · after hours · Finnhub'
    )
    expect(shareLegLine({ price: 218.29, session: 'pre', ageSeconds: 12, source: 'Finnhub' })).toBe(
      'Share $218.29 · at last close · pre-market · Finnhub'
    )
    expect(shareLegLine({ price: null, session: 'closed', ageSeconds: null, source: 'Finnhub' })).toBe(
      'Share — · at last close · Finnhub'
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/reading.test.js src/lib/provenance.test.js`
Expected: FAIL (missing module; undefined exports).

- [ ] **Step 3: Write the implementation**

```js
// src/lib/reading.js
// The Readout's words: the gap said in dollars at a size the reader picked
// (Robinhood's crypto page does this with "how much you'd receive"; the
// stronger sentence for a spread is "what it costs you"). Pure so vitest
// can pin every sentence. No React, no services.

import { formatPct, formatPrice, formatCompact } from './format'
import { PARITY_BAND } from './prices'
import { MAX_CREDIBLE_GAP } from './board'

export const SIZES = Object.freeze([100, 1000, 10000])

export const RANGE_WORDS = Object.freeze({
  '1D': 'Past day',
  '1W': 'Past week',
  '1M': 'Past month',
  '1Y': 'Past year',
})

const RANGE_GRAIN = Object.freeze({
  '1D': 'five-minute readings today',
  '1W': 'half-hour readings this week',
  '1M': 'daily close-to-close readings this month',
  '1Y': 'daily close-to-close readings this year',
})

export function formatSize(size) {
  return `$${size.toLocaleString('en-US')}`
}

/** What the tokens cost above (positive) or below (negative) the shares, on `size` dollars of shares. */
export function gapDollars(gapPct, size) {
  if (!Number.isFinite(gapPct) || !Number.isFinite(size)) return null
  return (size * gapPct) / 100
}

/**
 * readingSentence({ ticker, companyName, gapPct, size, thin, volume24h })
 *
 * "On $1,000 of NVIDIA, NVDAx costs $0.92 more than the shares right now."
 * Inside the parity band the tokens cost the same. When the market is thin
 * or the gap is outside ±MAX_CREDIBLE_GAP the sentence refuses to price it.
 */
export function readingSentence({ ticker, companyName, gapPct, size, thin = false, volume24h = null }) {
  if (!Number.isFinite(gapPct)) return `No share price for ${ticker} yet.`
  if (thin) {
    const traded = Number.isFinite(volume24h) ? `only ${formatCompact(volume24h)} traded today` : 'almost nothing traded today'
    return `The gap on ${ticker} reads ${formatPct(gapPct)} but ${traded}; treat it as noise.`
  }
  if (Math.abs(gapPct) > MAX_CREDIBLE_GAP) {
    return `The gap on ${ticker} reads ${formatPct(gapPct)} and no real wrapper drifts that far; treat it as noise.`
  }
  const lead = `On ${formatSize(size)} of ${companyName}, ${ticker} costs`
  if (Math.abs(gapPct) < PARITY_BAND) return `${lead} the same as the shares right now.`
  const usd = gapDollars(gapPct, size)
  return `${lead} ${formatPrice(Math.abs(usd))} ${usd > 0 ? 'more' : 'less'} than the shares right now.`
}

/** The gap plus the DEX spread, both in dollars at the size; null without either number. */
export function roundTrip({ gapPct, spreadPct, size }) {
  if (!Number.isFinite(gapPct) || !Number.isFinite(spreadPct) || !Number.isFinite(size)) return null
  const gapUsd = Math.abs(gapDollars(gapPct, size))
  const spreadUsd = (size * spreadPct) / 100
  return { gapUsd, spreadUsd, total: gapUsd + spreadUsd }
}

/** Percent of `premium` readings (each { t, v }) whose |v| is below |currentPct|. */
export function gapPercentile(premium, currentPct) {
  if (!Array.isArray(premium) || premium.length === 0 || !Number.isFinite(currentPct)) return null
  const now = Math.abs(currentPct)
  const below = premium.filter((p) => Math.abs(p.v) < now).length
  return Math.round((below / premium.length) * 100)
}

/** "Wider than 71% of its half-hour readings this week." Names the grain; never a bare year. */
export function percentileCaption(range, pct) {
  if (!Number.isFinite(pct)) return ''
  const grain = RANGE_GRAIN[range] ?? RANGE_GRAIN['1W']
  return pct >= 50
    ? `Wider than ${pct}% of its ${grain}.`
    : `Narrower than ${100 - pct}% of its ${grain}.`
}
```

Append to `src/lib/provenance.js`:

```js
import { formatPrice, EM_DASH } from './format'

/** '7 s ago' / '2 m ago' / '3 h ago'; 'no price yet' without an age. */
export function ageWords(seconds) {
  if (!Number.isFinite(seconds)) return 'no price yet'
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} m ago`
  return `${Math.round(m / 60)} h ago`
}

/** 'Token $218.49 · 7 s ago · via Jupiter' */
export function tokenLegLine({ price, ageSeconds, source }) {
  const p = Number.isFinite(price) ? formatPrice(price) : EM_DASH
  return `Token ${p} · ${ageWords(ageSeconds)} · via ${source}`
}

/**
 * 'Share $218.29 · at last close · Finnhub' (closed)
 * 'Share $218.29 · 12 s ago · live · Finnhub' (regular, fresh)
 * 'Share $218.29 · 15 m ago · stale · Finnhub' (regular, old)
 * 'Share $218.29 · at 4pm close · after hours · Finnhub' (post)
 * 'Share $218.29 · at last close · pre-market · Finnhub' (pre)
 */
export function shareLegLine({ price, session, ageSeconds, source }) {
  const p = Number.isFinite(price) ? formatPrice(price) : EM_DASH
  let state
  if (session === 'regular') {
    state = isStockDelayed(session, ageSeconds)
      ? `${ageWords(ageSeconds)} · stale`
      : `${ageWords(ageSeconds)} · live`
  } else if (session === 'post') state = 'at 4pm close · after hours'
  else if (session === 'pre') state = 'at last close · pre-market'
  else state = 'at last close'
  return `Share ${p} · ${state} · ${source}`
}
```

Note: the `import { formatPrice, EM_DASH } from './format'` line goes at the TOP of `provenance.js` with the other imports (there are none today; add it as the first line after the header comment). `isStockDelayed` is already defined above in the same file.

Append to `src/services/stocks.js` (after the `CLOSED_MARKET_REFRESH_MS` export):

```js
/** Which provider the live share quote comes from, for the Readout's leg line. */
export const STOCK_QUOTE_SOURCE = IS_PROD || FINNHUB_KEY ? 'Finnhub' : 'Yahoo Finance'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/reading.test.js src/lib/provenance.test.js`
Expected: PASS (reading 9 tests, provenance 13 tests including the 10 that existed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reading.js src/lib/reading.test.js src/lib/provenance.js src/lib/provenance.test.js src/services/stocks.js
printf 'The reading: the gap in dollars at your size, per-leg lines, percentile caption\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 4: `meterKeys.js`, `pageTitle.js` additions, `desktopHome.js`, `returnVisit.js`

**Files:**
- Create: `src/lib/meterKeys.js`, `src/lib/meterKeys.test.js`, `src/lib/desktopHome.js`, `src/lib/desktopHome.test.js`, `src/lib/returnVisit.js`, `src/lib/returnVisit.test.js`
- Modify: `src/lib/pageTitle.js` (append), `src/lib/pageTitle.test.js` (append)

**Interfaces:**
- Consumes: `keyContext`, `isMacPlatform` from `src/lib/desktopKeys.js` (re-exported so callers of the Meter never import the Phase 1 file directly).
- Produces:
  - `classifyMeterKey(event, { mac, typing, inModal, scope }) → action | null` where `scope` is `'board' | 'chart'` and actions are `{ type: 'focusSearch' }`, `{ type: 'escape' }`, `{ type: 'shortcuts' }`, `{ type: 'step', delta }`, `{ type: 'expand', open }`, `{ type: 'select' }`, `{ type: 'watch' }`, `{ type: 'alert' }`, `{ type: 'chart' }`, `{ type: 'fullscreen' }`, `{ type: 'indicators' }` (chart scope only).
  - `meterShortcutRows(mac) → { keys: string[], action: string }[]`.
  - `meterTitle({ ticker, gapPct }) → 'NVDAx +0.09% gap · OnStock'`, `boardTitle() → 'Board · OnStock'`.
  - `resolveDesktopHome({ search, saved }) → 'meter' | 'chart'`, `DESKTOP_HOME_KEY = 'bw.desktop.home.v1'`, `HOMES`.
  - `classifyVisit({ lastSeenMs, nowMs }) → { kind: 'first' | 'return' | 'lapsed', days: number | null }`, `RETURN_WINDOW_DAYS = 7`.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/meterKeys.test.js
import { describe, it, expect } from 'vitest'
import { classifyMeterKey, meterShortcutRows } from './meterKeys'

const press = (key, mods = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods })

describe('classifyMeterKey — the Board', () => {
  it('opens search on Ctrl+K only, never on a bare letter', () => {
    expect(classifyMeterKey(press('k', { ctrlKey: true }))).toEqual({ type: 'focusSearch' })
    expect(classifyMeterKey(press('k', { metaKey: true }), { mac: true })).toEqual({ type: 'focusSearch' })
    expect(classifyMeterKey(press('k', { metaKey: true }))).toBeNull()
    for (const l of 'nqxz') expect(classifyMeterKey(press(l))).toBeNull()
  })

  it('never opens an interval prompt on a digit', () => {
    for (const d of '0123456789') expect(classifyMeterKey(press(d))).toBeNull()
    expect(classifyMeterKey(press(','))).toBeNull()
  })

  it('steps, expands, collapses and selects', () => {
    expect(classifyMeterKey(press('ArrowDown'))).toEqual({ type: 'step', delta: 1 })
    expect(classifyMeterKey(press('ArrowUp'))).toEqual({ type: 'step', delta: -1 })
    expect(classifyMeterKey(press('ArrowRight'))).toEqual({ type: 'expand', open: true })
    expect(classifyMeterKey(press('ArrowLeft'))).toEqual({ type: 'expand', open: false })
    expect(classifyMeterKey(press('Enter'))).toEqual({ type: 'select' })
    expect(classifyMeterKey(press(' '))).toBeNull()
  })

  it('binds the guarded single keys W A C F ?', () => {
    expect(classifyMeterKey(press('w'))).toEqual({ type: 'watch' })
    expect(classifyMeterKey(press('W'))).toEqual({ type: 'watch' })
    expect(classifyMeterKey(press('a'))).toEqual({ type: 'alert' })
    expect(classifyMeterKey(press('c'))).toEqual({ type: 'chart' })
    expect(classifyMeterKey(press('f'))).toEqual({ type: 'fullscreen' })
    expect(classifyMeterKey(press('?', { shiftKey: true }))).toEqual({ type: 'shortcuts' })
    expect(classifyMeterKey(press('/', { ctrlKey: true }))).toBeNull()
  })

  it('binds I only inside a chart, and never L H M yet', () => {
    expect(classifyMeterKey(press('i'))).toBeNull()
    expect(classifyMeterKey(press('i'), { scope: 'chart' })).toEqual({ type: 'indicators' })
    for (const k of 'lhm') expect(classifyMeterKey(press(k), { scope: 'chart' })).toBeNull()
    expect(classifyMeterKey(press('ArrowDown'), { scope: 'chart' })).toBeNull()
    expect(classifyMeterKey(press('c'), { scope: 'chart' })).toBeNull()
  })

  it('leaves every modified key and every other key to the browser', () => {
    expect(classifyMeterKey(press('w', { ctrlKey: true }))).toBeNull()
    expect(classifyMeterKey(press('w', { altKey: true }))).toBeNull()
    expect(classifyMeterKey(press('W', { shiftKey: true }))).toBeNull()
    for (const k of ['Tab', 'Home', 'PageDown', '.', ';']) expect(classifyMeterKey(press(k))).toBeNull()
  })

  it('reports Esc outside a modal; inside a field only Esc; inside a modal nothing', () => {
    expect(classifyMeterKey(press('Escape'))).toEqual({ type: 'escape' })
    expect(classifyMeterKey(press('w'), { typing: true })).toBeNull()
    expect(classifyMeterKey(press('Escape'), { typing: true })).toEqual({ type: 'escape' })
    expect(classifyMeterKey(press('k', { ctrlKey: true }), { typing: true })).toBeNull()
    expect(classifyMeterKey(press('Escape'), { inModal: true })).toBeNull()
    expect(classifyMeterKey(press('w'), { inModal: true })).toBeNull()
  })
})

describe('meterShortcutRows', () => {
  it('lists each binding once with the platform modifier', () => {
    const win = meterShortcutRows(false)
    const mac = meterShortcutRows(true)
    expect(win[0].keys).toEqual(['Ctrl', 'K'])
    expect(mac[0].keys).toEqual(['⌘', 'K'])
    expect(win.find((r) => r.action === 'Open the chart').keys).toEqual(['C'])
    expect(win.some((r) => r.action.includes('letter'))).toBe(false)
    expect(new Set(win.map((r) => r.action)).size).toBe(win.length)
  })
})
```

```js
// src/lib/desktopHome.test.js
import { describe, it, expect } from 'vitest'
import { resolveDesktopHome, DESKTOP_HOME_KEY, HOMES } from './desktopHome'

describe('resolveDesktopHome', () => {
  it('honours the query first, then the saved choice, then the default', () => {
    expect(resolveDesktopHome({ search: '?home=chart', saved: 'meter' })).toBe('chart')
    expect(resolveDesktopHome({ search: '?x=1&home=meter', saved: 'chart' })).toBe('meter')
    expect(resolveDesktopHome({ search: '', saved: 'chart' })).toBe('chart')
    expect(resolveDesktopHome({ search: '', saved: null })).toBe('meter')
    expect(resolveDesktopHome({ search: '?home=nonsense', saved: 'chart' })).toBe('chart')
    expect(resolveDesktopHome({})).toBe('meter')
    expect(DESKTOP_HOME_KEY).toBe('bw.desktop.home.v1')
    expect(HOMES).toEqual(['meter', 'chart'])
  })
})
```

```js
// src/lib/returnVisit.test.js
import { describe, it, expect } from 'vitest'
import { classifyVisit, RETURN_WINDOW_DAYS } from './returnVisit'

const DAY = 86_400_000

describe('classifyVisit', () => {
  it('is a first visit without a stamp', () => {
    expect(classifyVisit({ lastSeenMs: null, nowMs: 10 * DAY })).toEqual({ kind: 'first', days: null })
  })
  it('is a return within the window and lapsed past it', () => {
    expect(classifyVisit({ lastSeenMs: 8 * DAY, nowMs: 10 * DAY })).toEqual({ kind: 'return', days: 2 })
    expect(classifyVisit({ lastSeenMs: 1 * DAY, nowMs: 10 * DAY })).toEqual({ kind: 'lapsed', days: 9 })
    expect(classifyVisit({ lastSeenMs: 3 * DAY, nowMs: 10 * DAY })).toEqual({ kind: 'return', days: 7 })
    expect(RETURN_WINDOW_DAYS).toBe(7)
  })
})
```

Append to `src/lib/pageTitle.test.js`:

```js
import { meterTitle, boardTitle } from './pageTitle'

describe('meterTitle / boardTitle', () => {
  it('names the wrapper and its gap with the product, no triangle', () => {
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 0.09 })).toBe('NVDAx +0.09% gap · OnStock')
    expect(meterTitle({ ticker: 'NVDAx', gapPct: -2.14 })).toBe(`NVDAx ${MINUS}2.14% gap · OnStock`)
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 0.09 })).not.toContain(UP)
    expect(meterTitle({ ticker: 'TBILL', gapPct: null })).toBe('TBILL · OnStock')
    expect(meterTitle({})).toBe(boardTitle())
    expect(boardTitle()).toBe('Board · OnStock')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/meterKeys.test.js src/lib/desktopHome.test.js src/lib/returnVisit.test.js src/lib/pageTitle.test.js`
Expected: FAIL (missing modules; undefined exports).

- [ ] **Step 3: Write the implementations**

```js
// src/lib/meterKeys.js
// The Meter's key map (spec §3.4 #5), decided before any component acts on
// it. Pure so vitest can pin it. Nine guarded single keys plus chords; a
// single key fires only when focus is outside a field, and inside an open
// Sheet nothing fires at all — the sheet owns its keys. No letter opens
// search and no digit opens a prompt.
//
//   Ctrl+K (⌘K)     focus the search
//   ↓ / ↑           next / previous row on the Board
//   → / ←           expand / collapse the focused company
//   Enter           put the focused row in the Readout
//   W               watch or unwatch the focused wrapper
//   A               set an alert on the focused wrapper
//   C               open the chart for the selected wrapper
//   F               fullscreen (hide the masthead)
//   ?               the shortcut list
//   I               (inside a chart) the Indicators panel
//   Esc             close what is on top
//
// L, H and M (mark-up) are Plan C and are deliberately NOT bound here.

import { keyContext, isMacPlatform } from './desktopKeys'

export { keyContext, isMacPlatform }

const BOARD_SINGLE = { w: 'watch', a: 'alert', c: 'chart', f: 'fullscreen' }
const CHART_SINGLE = { i: 'indicators', f: 'fullscreen' }

export function classifyMeterKey(event, { mac = false, typing = false, inModal = false, scope = 'board' } = {}) {
  const key = event?.key ?? ''
  if (inModal) return null
  if (key === 'Escape') return { type: 'escape' }
  if (typing) return null

  const mod = mac ? event.metaKey === true : event.ctrlKey === true
  if (mod && !event.altKey && !event.shiftKey && key.toLowerCase() === 'k') return { type: 'focusSearch' }
  if (event.ctrlKey || event.metaKey || event.altKey) return null

  // '?' arrives with shiftKey on every layout that needs Shift for it.
  if (key === '?') return { type: 'shortcuts' }
  if (event.shiftKey) return null

  if (scope === 'chart') {
    const type = CHART_SINGLE[key.toLowerCase()]
    return type ? { type } : null
  }

  if (key === 'ArrowDown') return { type: 'step', delta: 1 }
  if (key === 'ArrowUp') return { type: 'step', delta: -1 }
  if (key === 'ArrowRight') return { type: 'expand', open: true }
  if (key === 'ArrowLeft') return { type: 'expand', open: false }
  if (key === 'Enter') return { type: 'select' }
  const type = BOARD_SINGLE[key.toLowerCase()]
  return type ? { type } : null
}

/** The rows the ? sheet shows, with the platform modifier already in place. */
export function meterShortcutRows(mac = false) {
  const mod = mac ? '⌘' : 'Ctrl'
  return [
    { keys: [mod, 'K'], action: 'Search tickers or companies' },
    { keys: ['↓', '↑'], action: 'Move down or up the Board' },
    { keys: ['→', '←'], action: 'Show or hide a company\'s wrappers' },
    { keys: ['Enter'], action: 'Read the focused row' },
    { keys: ['W'], action: 'Watch or unwatch' },
    { keys: ['A'], action: 'Set an alert' },
    { keys: ['C'], action: 'Open the chart' },
    { keys: ['I'], action: 'Indicators (in the chart)' },
    { keys: ['F'], action: 'Fullscreen' },
    { keys: ['Esc'], action: 'Close what is on top' },
    { keys: ['?'], action: 'This list' },
  ]
}
```

```js
// src/lib/desktopHome.js
// Which desktop home to mount while both exist (spec §4, Plan A): the Meter
// (Board + Readout) or the Phase 1 chart-first shell. A tester switches with
// `?home=chart` or `?home=meter` in the URL, which is then remembered; with
// neither, the Meter. Pure; App.jsx reads it once on load.

export const DESKTOP_HOME_KEY = 'bw.desktop.home.v1'
export const HOMES = Object.freeze(['meter', 'chart'])

export function resolveDesktopHome({ search = '', saved = null } = {}) {
  const fromQuery = new URLSearchParams(search).get('home')
  if (HOMES.includes(fromQuery)) return fromQuery
  if (HOMES.includes(saved)) return saved
  return 'meter'
}
```

```js
// src/lib/returnVisit.js
// The one metric the roadmap cares about — ten people who open the app in a
// week and come back — as a classification of this open against the last
// one, so the analytics event can say "return within 7 days" without any
// server-side stitching. Pure.

export const RETURN_WINDOW_DAYS = 7
const DAY = 86_400_000

export function classifyVisit({ lastSeenMs, nowMs }) {
  if (!Number.isFinite(lastSeenMs)) return { kind: 'first', days: null }
  const days = Math.round((nowMs - lastSeenMs) / DAY)
  return { kind: days <= RETURN_WINDOW_DAYS ? 'return' : 'lapsed', days }
}
```

Append to `src/lib/pageTitle.js`:

```js
/** The Meter's tab title: the wrapper and its gap, then the product. No triangle. */
export function meterTitle({ ticker, gapPct } = {}) {
  if (!ticker) return boardTitle()
  const pct = signedPct(gapPct)
  return pct == null ? `${ticker} · OnStock` : `${ticker} ${pct} gap · OnStock`
}

export function boardTitle() {
  return 'Board · OnStock'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/meterKeys.test.js src/lib/desktopHome.test.js src/lib/returnVisit.test.js src/lib/pageTitle.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/meterKeys.js src/lib/meterKeys.test.js src/lib/desktopHome.js src/lib/desktopHome.test.js src/lib/returnVisit.js src/lib/returnVisit.test.js src/lib/pageTitle.js src/lib/pageTitle.test.js
printf 'Meter key map, tab titles, the home switch and the return counter\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 5: `GapBar` tone and height props; `ShortcutSheet` and `DetailTabs` variants

**Files:**
- Modify: `src/components/shared.jsx` (`GapBar` only)
- Modify: `src/components/desktop/ShortcutSheet.jsx`
- Modify: `src/components/desktop/DetailTabs.jsx`

**Interfaces:**
- `GapBar({ pct, thin, width, scale, tone = 'direction', height = 4 })`: `tone: 'accent'` paints the fill `var(--color-accent)` whatever the sign; `height` sets the track height in px. Defaults reproduce today's DOM exactly.
- `ShortcutSheet({ onClose, rows = shortcutRows(isMacPlatform()), intro = 'Anywhere on the desktop, outside a text field. Any letter starts a search.', footer = null })`.
- `DetailTabs({ ..., variant = 'chart' })`: `variant: 'meter'` uses tabs Statistics · News · Trades on · Learn; the stored tab id `also` falls back to `statistics` there.

No unit tests: these are components (no DOM environment). Verification is the phone DOM-skeleton diff in Task 11 (defaults must produce identical markup) and the live desktop check.

- [ ] **Step 1: `GapBar` props**

In `src/components/shared.jsx`, change the `GapBar` signature and the two places that read the fill colour and height:

```jsx
export function GapBar({ pct, thin = false, width = 104, scale = 2, tone = 'direction', height = 4 }) {
  const missing = pct == null || !Number.isFinite(pct)
  const muted = thin || (!missing && Math.abs(pct) < PARITY_BAND)
  const w = missing ? 0 : Math.min(Math.sqrt(Math.abs(pct) / scale), 1) * 50
  const left = missing ? 50 : pct >= 0 ? 50 : 50 - w
  // The Meter's rule carries direction by which side of the tick the fill
  // sits on and by the sign character beside it; the fill is the accent.
  // The phone keeps gain/loss (tone 'direction', the default).
  const fill =
    tone === 'accent' ? 'var(--color-accent)' : pct >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
  return (
    <span
      data-gapbar=""
      className="relative inline-block shrink-0 rounded-[2px]"
      style={{
        width,
        height,
        background: missing ? 'rgb(255 255 255 / 0.04)' : 'rgb(255 255 255 / 0.06)',
      }}
      aria-hidden="true"
    >
```

and in the fill span replace `background: muted ? 'transparent' : pct >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',` with `background: muted ? 'transparent' : fill,`. Everything else in `GapBar` stays as it is.

- [ ] **Step 2: `ShortcutSheet` props**

Replace the component body in `src/components/desktop/ShortcutSheet.jsx`:

```jsx
export default function ShortcutSheet({
  onClose,
  rows = shortcutRows(isMacPlatform()),
  intro = 'Anywhere on the desktop, outside a text field. Any letter starts a search.',
  footer = null,
}) {
  return (
    <Sheet onClose={onClose} pad={5}>
      <SheetTitle className="t-title text-zinc-100">Keyboard shortcuts</SheetTitle>
      <p className="t-caption mt-1 text-zinc-500">{intro}</p>
      <dl className="mt-4 divide-y divide-zinc-900">
        {rows.map((r) => (
          <div key={r.action} className="flex items-center justify-between gap-4 py-2">
            <dt className="t-label text-zinc-300">{r.action}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {r.keys.map((k) => (
                <KeyChip key={k} keys={[k]} />
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {footer}
    </Sheet>
  )
}
```

- [ ] **Step 3: `DetailTabs` variant**

In `src/components/desktop/DetailTabs.jsx`, add the Learn import and the variant tab list, and use them:

```jsx
import LearnCards from '../LearnCards'

const CHART_TABS = [
  { id: 'statistics', label: 'Statistics' },
  { id: 'news', label: 'News' },
  { id: 'trades', label: 'Trades on' },
  { id: 'also', label: 'Also tokenized by' },
]
/* The Meter retires "Also tokenized by" (the Board's wrapper sub-rows are
   that comparison) and adds Learn, the question cards, where a reader who
   just met the word "gap" can look it up without leaving the Readout. */
const METER_TABS = [
  { id: 'statistics', label: 'Statistics' },
  { id: 'news', label: 'News' },
  { id: 'trades', label: 'Trades on' },
  { id: 'learn', label: 'Learn' },
]
```

Delete the old `const TABS = [...]` and `const TAB_IDS = ...` lines. In the component:

```jsx
export default function DetailTabs({
  asset, info, spread, siblings, hasTokenStats, hasStockStats, bothSides, onSelectAsset,
  variant = 'chart',
}) {
  const TABS = variant === 'meter' ? METER_TABS : CHART_TABS
  const TAB_IDS = TABS.map((t) => t.id)
  const [saved, setTab] = useLocalState('bw.desktop.tab.v1', 'statistics')
  const tab = TAB_IDS.includes(saved) ? saved : 'statistics'
```

and add the Learn panel after the `tab === 'also'` block:

```jsx
        {tab === 'learn' && (
          <div className="-mx-0">
            <LearnCards />
          </div>
        )}
```

Check `LearnCards` renders without props (it does: `export default function LearnCards()`). If it renders a heading like "Learn the basics" that reads oddly inside a tab, leave it; copy is Plan B's.

- [ ] **Step 4: Lint and the full suite**

Run: `npx oxlint && npx vitest run`
Expected: lint at the baseline (3 warnings), 367 + new tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared.jsx src/components/desktop/ShortcutSheet.jsx src/components/desktop/DetailTabs.jsx
printf 'Additive props for the Meter: GapBar tone and height, ShortcutSheet rows, DetailTabs variant\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 6: `Board.jsx`

**Files:**
- Create: `src/components/desktop/Board.jsx`

**Interfaces:**
- Consumes: everything from `board.js` (Task 1 and 2); `GapBar` with `tone="accent"`; `AssetLogo`; `PriceText`; `usePrices`, `useAssetSubscription`; `useFolders`; `useLocalState`; `track`; `ChevronRight`, `ChevronDown` from `Icons`; `formatPct`, `formatPrice`; `ageWords` from `provenance.js`; `ASSETS` from `data/universe`.
- Props: `{ selectedId, onSelect(assetId, { from }), actionsRef, lens, onLens }`. `lens` and `onLens` are owned by the shell (the masthead's Watching word sets it too). Sort and Credible-only are the Board's own (`bw.meter.sort.v1`, `bw.meter.credible.v1`).
- Produces on `actionsRef.current`: `{ step(delta), expand(open), select(), focusedId() }` for the key map. `focusedId()` is the focused wrapper's asset id, or the focused company's lead asset id.

- [ ] **Step 1: Write the component**

```jsx
// src/components/desktop/Board.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePrices, useAssetSubscription } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { useLocalState } from '../../hooks/useLocalState'
import { track } from '../../services/analytics'
import { ASSETS } from '../../data/universe'
import {
  BOARD_LENSES, BOARD_SORTS, groupCompanies, boundCandidates, freezeOrder, flattenRows,
  visibleWindow, headerLine,
} from '../../lib/board'
import { ageWords } from '../../lib/provenance'
import { formatPct, formatPrice } from '../../lib/format'
import { GapBar } from '../shared'
import { ChevronRight, ChevronDown } from '../Icons'
import AssetLogo from '../AssetLogo'
import PriceText from '../PriceText'

/*
 * The Gap Board (spec §3.2 region B, §3.4 #1): one row per company, its
 * widest wrapper's gap as a rule on a shared zero axis, the share price with
 * its age, how many issuers and how far apart, and the cheapest. A company
 * expands into one sub-row per wrapper on the same column grid, so the zero
 * tick lines up. Rows past the viewport are not rendered (lib/board.js's
 * visibleWindow); order is frozen once every company is in.
 *
 * Column grid, 880 px wide at 1440: company 252 · share 128 · gap 240 ·
 * wrappers 108 · cheapest 80 · chevron 24, inside 24 px gutters.
 */
const GRID = '252px 128px 240px 108px 80px 24px'
const CHIP = 't-label flex h-7 shrink-0 items-center rounded-md px-2.5 transition-colors'
const CHIP_ON = 'bg-zinc-800 text-zinc-100'
const CHIP_OFF = 'text-zinc-500 hover:text-zinc-300'
const chipStyle = (on) => (on ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined)

export default function Board({ selectedId, onSelect, actionsRef, lens, onLens }) {
  const { assets, session, stocksAt } = usePrices()
  const { watchlistIds } = useFolders()
  const [sort, setSort] = useLocalState('bw.meter.sort.v1', 'widest')
  const [credibleOnly, setCredibleOnly] = useLocalState('bw.meter.credible.v1', true)
  const [expandedKey, setExpandedKey] = useState(null)
  const [focus, setFocus] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(800)
  const scrollRef = useRef(null)
  const orderRef = useRef({ sig: '', keys: [] })

  // The bounded quote set (spec §3.4 #1): the watchlist, every multi-wrapper
  // company, then by static volume, at most 150 underlyings. Static so the
  // set does not churn with every price tick.
  const watchKey = watchlistIds.join('|')
  const candidateIds = useMemo(
    () => boundCandidates(ASSETS, { watchlistIds: watchKey ? watchKey.split('|') : [] }),
    [watchKey]
  )
  useAssetSubscription('meter-board', candidateIds)

  const companies = useMemo(() => {
    const fresh = groupCompanies(assets, { lens, sort, credibleOnly, watchlistIds })
    const sig = `${lens}|${sort}|${credibleOnly}`
    if (orderRef.current.sig !== sig) orderRef.current = { sig, keys: [] }
    const frozen = freezeOrder(orderRef.current.keys, fresh)
    orderRef.current.keys = frozen.keys
    return frozen.companies
  }, [assets, lens, sort, credibleOnly, watchlistIds])

  const rows = useMemo(() => flattenRows(companies, expandedKey), [companies, expandedKey])
  const heights = useMemo(() => rows.map((r) => r.height), [rows])
  const win = visibleWindow(heights, scrollTop, viewportH)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const measure = () => setViewportH(el.clientHeight)
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Keep the focused row inside the viewport when the keys move it.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || rows.length === 0) return
    let y = 0
    for (let i = 0; i < focus && i < rows.length; i++) y += rows[i].height
    const h = rows[Math.min(focus, rows.length - 1)].height
    if (y < el.scrollTop) el.scrollTop = y
    else if (y + h > el.scrollTop + el.clientHeight) el.scrollTop = y + h - el.clientHeight
  }, [focus, rows])

  const rowAssetId = (row) => (row.type === 'wrapper' ? row.wrapper.asset.id : row.company.leadAsset?.id ?? null)

  function selectRow(row, from) {
    const id = rowAssetId(row)
    if (id) onSelect(id, { from })
  }

  // What the key map can do to the Board (hooks/useMeterShortcuts).
  useEffect(() => {
    actionsRef.current = {
      step: (delta) => setFocus((f) => Math.max(0, Math.min(rows.length - 1, f + delta))),
      expand: (open) => {
        const row = rows[focus]
        if (!row) return
        setExpandedKey(open ? row.company.key : null)
        if (!open && row.type === 'wrapper') {
          setFocus(rows.findIndex((r) => r.type === 'company' && r.key === row.company.key))
        }
      },
      select: () => {
        const row = rows[focus]
        if (row) selectRow(row, 'keys')
      },
      focusedId: () => (rows[focus] ? rowAssetId(rows[focus]) : selectedId),
    }
    return () => {
      actionsRef.current = null
    }
  })

  const stockAge = stocksAt ? (Date.now() - stocksAt) / 1000 : null
  const activeSort = BOARD_SORTS.find((s) => s.id === sort) ?? BOARD_SORTS[0]

  return (
    <section aria-label="Gap Board" className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-10 shrink-0 items-center gap-1 border-b px-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {BOARD_LENSES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              onLens(l.id)
              track('meter_lens', { lens: l.id })
            }}
            aria-pressed={lens === l.id}
            className={`${CHIP} ${lens === l.id ? CHIP_ON : CHIP_OFF}`}
            style={chipStyle(lens === l.id)}
          >
            {l.label}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-zinc-800" aria-hidden="true" />
        <SortMenu value={activeSort} onPick={(id) => setSort(id)} />
        <span className="mx-2 h-4 w-px bg-zinc-800" aria-hidden="true" />
        <label className="t-label flex items-center gap-2 text-zinc-400">
          <input
            type="checkbox"
            checked={credibleOnly}
            onChange={(e) => setCredibleOnly(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Credible only
        </label>
        <div className="flex-1" />
        <span className="num t-caption text-zinc-500">
          {headerLine({ count: companies.length, session, stockAgeSeconds: stockAge })}
        </span>
      </div>

      <div
        className="grid h-8 shrink-0 items-center border-b px-6"
        style={{ gridTemplateColumns: GRID, borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Company</span>
        <span className="t-micro text-zinc-500">Share · age</span>
        <span className="t-micro text-zinc-500">Gap vs share · widest wrapper</span>
        <span className="t-micro text-zinc-500">Wrappers</span>
        <span className="t-micro text-zinc-500">Cheapest</span>
        <span />
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {rows.length === 0 && (
          <p className="t-body px-6 py-12 text-center text-zinc-400">
            {lens === 'watching'
              ? 'Nothing on your Watching list yet — press W on any row to add it.'
              : 'No gaps to rank yet — prices are still loading.'}
          </p>
        )}
        <div style={{ height: win.top }} aria-hidden="true" />
        {rows.slice(win.start, win.end).map((row, i) => {
          const index = win.start + i
          const focused = index === focus
          if (row.type === 'company') {
            const c = row.company
            const open = c.key === expandedKey
            const selectedHere = c.wrappers.some((w) => w.asset.id === selectedId)
            return (
              <div
                key={row.key}
                role="button"
                tabIndex={-1}
                onClick={() => {
                  setFocus(index)
                  setExpandedKey(open ? null : c.key)
                  selectRow(row, 'board')
                }}
                className={`hover-row grid h-14 cursor-pointer items-center border-b px-6 ${
                  focused ? 'bg-zinc-900' : selectedHere ? 'bg-zinc-900/60' : ''
                } ${c.muted ? 'opacity-60' : ''}`}
                style={{ gridTemplateColumns: GRID, borderColor: open ? 'transparent' : 'var(--border-subtle)' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AssetLogo asset={c.logoAsset} size={36} />
                  <div className="min-w-0">
                    <div className="t-label text-zinc-100">{c.underlying}</div>
                    <div className="t-caption truncate text-zinc-500">{c.name}</div>
                  </div>
                </div>
                <div>
                  <div className="num t-label text-zinc-100">
                    <PriceText value={c.logoAsset.stockPrice} />
                  </div>
                  <div className="t-caption text-zinc-500">{shareAgeWord(session)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <GapBar pct={c.lead} thin={c.muted} width={160} height={6} tone="accent" />
                  <span className={`num t-label w-14 text-right ${c.muted ? 'text-zinc-500' : 'text-zinc-100'}`}>
                    {formatPct(c.lead)}
                  </span>
                </div>
                <div className="num t-caption text-zinc-400">
                  {c.wrappers.length}
                  {c.spreadBp != null ? ` · ${c.spreadBp} bp apart` : ' · 1 issuer'}
                </div>
                <div>
                  {c.cheapestAsset && (
                    <span className="t-caption rounded-md border px-2 py-0.5 text-zinc-300" style={{ borderColor: 'var(--border-default)' }}>
                      {c.cheapestAsset.ticker}
                    </span>
                  )}
                </div>
                {open ? (
                  <ChevronDown size={16} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={16} className="text-zinc-600" />
                )}
              </div>
            )
          }
          const w = row.wrapper
          const a = w.asset
          const selected = a.id === selectedId
          return (
            <div
              key={row.key}
              role="button"
              tabIndex={-1}
              onClick={() => {
                setFocus(index)
                selectRow(row, 'board')
              }}
              className={`hover-row grid h-10 cursor-pointer items-center border-b px-6 ${
                focused ? 'bg-zinc-800' : 'bg-zinc-900'
              } ${w.muted ? 'opacity-60' : ''}`}
              style={{
                gridTemplateColumns: GRID,
                borderColor: 'var(--border-subtle)',
                boxShadow: selected ? 'inset 0 0 0 1px var(--border-strong)' : undefined,
              }}
            >
              <div className="flex items-baseline gap-2 pl-12">
                <span className="t-label text-zinc-100">{a.ticker}</span>
                <span className="t-caption text-zinc-500">
                  {a.issuer}
                  {a.chain ? ` · ${a.chain}` : ''}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="num t-label text-zinc-100">
                  <PriceText value={a.tokenPrice} />
                </span>
                <span className="num t-caption text-zinc-500">{tokenAge(a)}</span>
              </div>
              <div className="flex items-center gap-3">
                <GapBar pct={w.gap} thin={w.muted} width={160} height={6} tone="accent" />
                <span className={`num t-label w-14 text-right ${w.muted ? 'text-zinc-500' : 'text-zinc-100'}`}>
                  {formatPct(w.gap)}
                </span>
              </div>
              <div className="num t-caption text-zinc-400">
                {formatPrice(Math.abs(w.diffUsd))} {w.diffUsd >= 0 ? 'above' : 'below'}
              </div>
              <div>
                {w.cheapest ? (
                  <span className="t-caption rounded-md border px-2 py-0.5 text-accent" style={{ borderColor: 'rgb(45 212 191 / 0.4)' }}>
                    cheapest
                  </span>
                ) : (
                  <span className="t-caption text-zinc-500">{a.venues?.[0] ?? ''}</span>
                )}
              </div>
              <span />
            </div>
          )
        })}
        <div style={{ height: win.bottom }} aria-hidden="true" />
      </div>
    </section>
  )
}

/* The share leg's age in one word, by session: outside regular hours the
   quote is a close, and the row says which. */
function shareAgeWord(session) {
  if (session === 'regular') return 'live'
  if (session === 'post') return '4pm close'
  if (session === 'pre') return 'last close · pre-market'
  return 'last close'
}

/* Token prices carry no per-asset timestamp yet; the fast layer refreshes
   subscribed mints every 2.5 s and the poll every minute, so the honest word
   is the poll's cadence. Plan D adds a per-asset stamp. */
function tokenAge(asset) {
  return asset.mint ? ageWords(3) : ageWords(45)
}

function SortMenu({ value, onPick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="t-label flex h-7 items-center gap-1 text-zinc-300 hover:text-zinc-100"
      >
        Sort: {value.label.toLowerCase()}
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Sort the Board"
          className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded-xl bg-zinc-950 py-1 ring-1 ring-zinc-800/70"
        >
          {BOARD_SORTS.map((s) => (
            <li key={s.id} role="presentation">
              <button
                role="option"
                aria-selected={s.id === value.id}
                onClick={() => {
                  onPick(s.id)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-zinc-900 ${s.id === value.id ? 'text-zinc-100' : 'text-zinc-400'}`}
              >
                <div className="t-label">{s.label}</div>
                <div className="t-caption text-zinc-500">{s.hint}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Note on `tokenAge`: the live token record carries no per-asset timestamp (`PricesContext` keeps one `lastFetchAt` for the whole batch), so the Board shows the layer's cadence, not a measured age. This is honest about what the code knows; a per-asset stamp is Plan D work and the comment says so.

- [ ] **Step 2: Lint**

Run: `npx oxlint src/components/desktop/Board.jsx`
Expected: no new warnings. (The component is not mounted yet; the live check is Task 9.)

- [ ] **Step 3: Commit**

```bash
git add src/components/desktop/Board.jsx
printf 'The Gap Board: company rows, wrapper sub-rows, frozen order, virtual window\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 7: `Readout.jsx`

**Files:**
- Create: `src/components/desktop/Readout.jsx`

**Interfaces:**
- Consumes: `useAssetWorkspace(assetId, range)` (chart, info, spread, siblings, flags); `usePrices` (session, stocksAt, lastFetchAt); `useFolders`; `useAlerts`; `alertLabelFor`; `reading.js`; `provenance.js` leg lines; `STOCK_QUOTE_SOURCE`; `GapBar tone="accent" height={10}`; `PremiumChart` (`fill`); `DetailTabs variant="meter"`; `TradeButton`; the three sheets; icons.
- Props: `{ assetId, onSelectAsset, onOpenChart, sheet, onSheet }` where `sheet` is `'folder' | 'alert' | 'share' | null` owned by the shell (so the A key can open the alert sheet for the selected wrapper).

- [ ] **Step 1: Write the component**

```jsx
// src/components/desktop/Readout.jsx
import { useState } from 'react'
import { usePrices } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { useAlerts } from '../../state/AlertsContext'
import { useAssetWorkspace, alertLabelFor } from '../../hooks/useAssetWorkspace'
import { useLocalState } from '../../hooks/useLocalState'
import { premiumPct, isThinlyTraded } from '../../lib/prices'
import { formatPct, formatPrice, EM_DASH } from '../../lib/format'
import {
  SIZES, RANGE_WORDS, formatSize, gapDollars, readingSentence, roundTrip, gapPercentile, percentileCaption,
} from '../../lib/reading'
import { tokenLegLine, shareLegLine } from '../../lib/provenance'
import { STOCK_QUOTE_SOURCE } from '../../services/stocks'
import { GapBar } from '../shared'
import { ShareIcon, PlusIcon, BellIcon, StarIcon, ChevronRight } from '../Icons'
import PremiumChart from '../PremiumChart'
import TradeButton from '../asset/TradeButton'
import DetailTabs from './DetailTabs'
import AddToFolderSheet from '../../overlays/AddToFolderSheet'
import SetAlertSheet from '../../overlays/SetAlertSheet'
import ShareSheet from '../../overlays/ShareSheet'

/*
 * The Readout (spec §3.2 region C): the selected wrapper read out loud. The
 * sentence in dollars at a size the reader picks, the reading, the rule,
 * both legs with their ages in words, the round trip, the gap history as
 * the only chart on the home, the way into the price chart, the actions
 * and the tabs. Nothing floats over a canvas.
 *
 * useAssetWorkspace already loads the chart series, the company info, the
 * DEX spread and the siblings for the phone screen; the Readout is the same
 * data in a different order.
 */
const ICON_BTN = 'flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-zinc-900 active:bg-zinc-800'
const PILL = 't-label flex h-[26px] items-center rounded-md px-2.5 transition-colors'
const RANGES = ['1D', '1W', '1M', '1Y']

export default function Readout({ assetId, onSelectAsset, onOpenChart, sheet, onSheet }) {
  const [size, setSize] = useLocalState('bw.meter.size.v1', 1000)
  const [range, setRange] = useLocalState('bw.meter.range.v1', '1W')
  const [chartRetry, setChartRetry] = useState(0)
  const { session, stocksAt, lastFetchAt } = usePrices()
  const { folders, watchlistIds, toggleWatchlist } = useFolders()
  const { rules } = useAlerts()
  const { asset, chart, info, spread, siblings, hasTokenStats, hasStockStats, bothSides } =
    useAssetWorkspace(assetId, range, chartRetry)

  if (!assetId) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="t-body text-center text-zinc-400">Pick a company on the Board, or search for a ticker.</p>
      </div>
    )
  }
  if (!asset) return null

  const gap = premiumPct(asset)
  const thin = isThinlyTraded(asset)
  const usd = gapDollars(gap, size)
  const diff = asset.tokenPrice != null && asset.stockPrice != null ? asset.tokenPrice - asset.stockPrice : null
  const companyName = asset.underlying ? asset.name : asset.ticker
  const sentence = readingSentence({ ticker: asset.ticker, companyName, gapPct: gap, size, thin, volume24h: asset.volume24h })
  const trip = roundTrip({ gapPct: gap, spreadPct: spread?.spreadPct ?? null, size })
  const pct = gapPercentile(chart.premium, gap)
  const tokenAgeSeconds = lastFetchAt ? (Date.now() - lastFetchAt) / 1000 : null
  const stockAgeSeconds = stocksAt ? (Date.now() - stocksAt) / 1000 : null
  const inWatchlist = watchlistIds.includes(asset.id)
  const memberCount = folders.filter((f) => f.assetIds.includes(asset.id)).length
  const alertLabel = alertLabelFor(rules[asset.id])
  const folderLabel = memberCount > 0 ? `In ${memberCount} folder${memberCount === 1 ? '' : 's'}` : 'Add to folder'
  const wrappers = [asset, ...siblings]

  return (
    <section aria-label={`${asset.ticker} readout`} className="flex flex-col gap-3 px-6 pb-8 pt-5">
      <p className="t-body text-zinc-100" style={{ textWrap: 'pretty' }}>{sentence}</p>

      <div className="flex items-center gap-1">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-pressed={size === s}
            className={`num ${PILL} ${size === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            style={size === s ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
          >
            {formatSize(s)}
          </button>
        ))}
        <div className="flex-1" />
        {wrappers.length > 1 &&
          wrappers.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelectAsset(w.id)}
              aria-pressed={w.id === asset.id}
              className={`${PILL} ${w.id === asset.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              style={w.id === asset.id ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
            >
              {w.ticker}
            </button>
          ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className={`num t-display ${thin ? 'text-zinc-500' : 'text-zinc-100'}`}>
            {gap != null ? formatPct(gap) : EM_DASH}
          </span>
          {diff != null && (
            <span className="t-caption text-zinc-500">
              <span className="num">{formatPrice(Math.abs(diff))}</span> {diff >= 0 ? 'above the share' : 'below the share'}
            </span>
          )}
        </div>
        <GapBar pct={gap} thin={thin} width="100%" height={10} tone="accent" />
        <div className="num flex justify-between text-[11px] text-zinc-500">
          <span>−2%</span>
          <span>0</span>
          <span>+2%</span>
        </div>
        <div className="num t-label flex flex-col gap-1 text-zinc-300">
          <div>{tokenLegLine({ price: asset.tokenPrice, ageSeconds: tokenAgeSeconds, source: asset.mint ? 'Jupiter' : 'CoinGecko' })}</div>
          {asset.underlying && (
            <div>{shareLegLine({ price: asset.stockPrice, session, ageSeconds: stockAgeSeconds, source: STOCK_QUOTE_SOURCE })}</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="t-micro text-zinc-500">At your size</span>
        <div className="grid grid-cols-3 gap-3">
          {SIZES.map((s) => {
            const d = gapDollars(gap, s)
            return (
              <div key={s} className={`num t-label ${s === size ? 'text-zinc-100' : 'text-zinc-300'}`}>
                {formatSize(s)} · {d == null ? EM_DASH : formatPrice(Math.abs(d))}
              </div>
            )
          })}
        </div>
        <div className="t-caption text-zinc-500">
          {trip ? (
            <>
              Round trip on <span className="num">{formatSize(size)}</span>: gap{' '}
              <span className="num">{formatPrice(trip.gapUsd)}</span> + DEX spread{' '}
              <span className="num">{formatPrice(trip.spreadUsd)}</span> ={' '}
              <span className="num text-zinc-300">{formatPrice(trip.total)}</span> · spread measured on a $200 trade
            </>
          ) : asset.mint ? (
            'Measuring the DEX spread…'
          ) : (
            'No DEX quote for this wrapper.'
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="t-micro text-zinc-500">Gap history</span>
        <div className="flex flex-col" style={{ height: 164 }}>
          {chart.loading ? (
            <div className="h-full animate-pulse rounded-xl bg-zinc-900" />
          ) : chart.error ? (
            <button type="button" onClick={() => setChartRetry((n) => n + 1)} className="t-caption text-zinc-400">
              The history could not load. Try again.
            </button>
          ) : chart.premium.length >= 2 ? (
            <PremiumChart fill premium={chart.premium} />
          ) : (
            <p className="t-caption text-zinc-500">No stored history yet.</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`t-caption ${range === r ? 'font-medium text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {RANGE_WORDS[r]}
            </button>
          ))}
        </div>
        <p className="t-caption text-zinc-500">{percentileCaption(range, pct)}</p>
      </div>

      <button
        type="button"
        onClick={onOpenChart}
        className="flex h-8 items-center justify-between rounded-md border px-3 transition-colors hover:bg-zinc-900"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <span className="t-label text-zinc-300">Price chart</span>
        <span className="t-caption flex items-center gap-2 text-zinc-500">
          Open chart <kbd className="rounded border px-1 font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>C</kbd>
          <ChevronRight size={12} />
        </span>
      </button>

      <div className="flex items-center gap-1 pt-1">
        <button
          onClick={() => toggleWatchlist(asset.id)}
          aria-label={inWatchlist ? 'Remove from Watching' : 'Add to Watching'}
          title={inWatchlist ? 'Remove from Watching' : 'Add to Watching'}
          className={`${ICON_BTN} ${inWatchlist ? 'text-accent' : 'text-zinc-300'}`}
        >
          <StarIcon size={18} filled={inWatchlist} />
        </button>
        {asset.underlying && (
          <button onClick={() => onSheet('alert')} aria-label={alertLabel} title={alertLabel} className={`${ICON_BTN} text-zinc-300`}>
            <BellIcon size={18} />
          </button>
        )}
        <button onClick={() => onSheet('folder')} aria-label={folderLabel} title={folderLabel} className={`${ICON_BTN} text-zinc-300`}>
          <PlusIcon size={18} />
        </button>
        <button onClick={() => onSheet('share')} aria-label="Share" title="Share" className={`${ICON_BTN} text-zinc-300`}>
          <ShareIcon size={18} />
        </button>
        <div className="flex-1" />
      </div>
      <div className="-mx-4">
        <TradeButton asset={asset} />
      </div>

      <DetailTabs
        variant="meter"
        asset={asset}
        info={info}
        spread={spread}
        siblings={siblings}
        hasTokenStats={hasTokenStats}
        hasStockStats={hasStockStats}
        bothSides={bothSides}
        onSelectAsset={onSelectAsset}
      />

      {sheet === 'folder' && <AddToFolderSheet asset={asset} onClose={() => onSheet(null)} />}
      {sheet === 'alert' && <SetAlertSheet asset={asset} onClose={() => onSheet(null)} />}
      {sheet === 'share' && <ShareSheet asset={asset} onClose={() => onSheet(null)} />}
    </section>
  )
}
```

`GapBar` accepts `width="100%"`: its inline style sets `width` directly, so a string works. `PremiumChart` with `fill` measures its container (`useFillSize`), so the 164 px flex box sizes it.

- [ ] **Step 2: Lint**

Run: `npx oxlint src/components/desktop/Readout.jsx`
Expected: no new warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/desktop/Readout.jsx
printf 'The Readout: the sentence at your size, the reading, legs, round trip, gap history, actions, tabs\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 8: `Masthead.jsx`, `GapHeader.jsx`, `ChartFootStrip.jsx`, and the `drillIn` prop on `ChartWorkspace`

**Files:**
- Create: `src/components/desktop/Masthead.jsx`, `src/components/desktop/GapHeader.jsx`, `src/components/desktop/ChartFootStrip.jsx`
- Modify: `src/components/desktop/ChartWorkspace.jsx`

**Interfaces:**
- `Masthead({ active, onTab, searchRef, onSelectAsset, onOpenProfile })`: `active` is one of `'home' | 'watching' | 'folders' | 'news' | 'trade'`; `onTab(id)` gets the same ids.
- `GapHeader({ asset, session, stocksAt, lastFetchAt, onExit, onSheet, inWatchlist, onToggleWatch })`.
- `ChartFootStrip({ mode, onMode, range, onRange, side, onSide, timeframe, onTimeframe, offeredTimeframes, log, onLog, indicatorCount, onOpenIndicators, onShortcuts, hasStock, ticker, underlying })`.
- `ChartWorkspace({ ..., drillIn })`: `drillIn` is `null` (Phase 1 path, unchanged) or `{ onExit, onSheet, onShortcuts }`.

- [ ] **Step 1: `Masthead.jsx`**

```jsx
// src/components/desktop/Masthead.jsx
import { usePrices } from '../../state/PricesContext'
import { useAlerts } from '../../state/AlertsContext'
import { SESSION_DOT, SESSION_NOTE, widestCredibleGap } from '../../lib/sessionCopy'
import { formatPct } from '../../lib/format'
import { AvatarButton, Wordmark } from '../Header'
import { BellIcon } from '../Icons'
import SymbolSearch from './SymbolSearch'

/*
 * The masthead (spec §3.2 region A), 56 px: the wordmark, five words with
 * an underline on the active one, the search field with its Ctrl K hint,
 * the session sentence as visible prose (not a tooltip), the widest
 * credible gap while the market is shut, the bell, the avatar.
 */
const WORDS = [
  { id: 'home', label: 'Board' },
  { id: 'watching', label: 'Watching' },
  { id: 'folders', label: 'Folders' },
  { id: 'news', label: 'News' },
  { id: 'trade', label: 'Trade' },
]

export default function Masthead({ active, onTab, searchRef, onSelectAsset, onOpenProfile }) {
  const { assets, session } = usePrices()
  const { unread } = useAlerts()
  const top = widestCredibleGap(assets, session)
  return (
    <header
      className="flex h-14 shrink-0 items-center gap-5 border-b px-6"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <Wordmark />
      <nav aria-label="Sections" className="ml-3 flex items-center gap-5">
        {WORDS.map((w) => {
          const on = active === w.id
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onTab(w.id)}
              aria-current={on ? 'page' : undefined}
              className={`t-label -mb-px flex h-14 items-center border-b-2 ${
                on ? 'text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              style={on ? { borderColor: 'var(--color-accent)' } : undefined}
            >
              {w.label}
            </button>
          )
        })}
      </nav>
      <div className="flex-1" />
      <SymbolSearch ref={searchRef} onSelectAsset={onSelectAsset} />
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: SESSION_DOT[session] }} />
        <span className="t-label font-normal text-zinc-400">{SESSION_NOTE[session]}</span>
      </div>
      {top && (
        <button type="button" onClick={() => onSelectAsset(top.asset.id)} className="t-caption shrink-0 whitespace-nowrap">
          <span className="text-zinc-500">Widest gap </span>
          <span className="font-medium text-zinc-300">{top.asset.ticker}</span>{' '}
          <span className="num font-medium text-zinc-100">{formatPct(top.p)}</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onTab('news')}
        aria-label={unread ? 'News, unread' : 'News'}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200"
      >
        <BellIcon size={18} />
        {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />}
      </button>
      <AvatarButton onClick={onOpenProfile} />
    </header>
  )
}
```

`SymbolSearch` is the Phase 1 field; its width is set inside it (240 at lg, 320 at xl). Leave it.

- [ ] **Step 2: `GapHeader.jsx`**

```jsx
// src/components/desktop/GapHeader.jsx
import { premiumPct, isThinlyTraded } from '../../lib/prices'
import { formatPct, formatPrice, EM_DASH } from '../../lib/format'
import { tokenLegLine, shareLegLine } from '../../lib/provenance'
import { STOCK_QUOTE_SOURCE } from '../../services/stocks'
import { GapBar } from '../shared'
import { ChevronLeft, StarIcon, BellIcon, PlusIcon, ShareIcon } from '../Icons'

/*
 * The drill-in's header (spec §3.2 "The drill-in"), 56 px: the way back, the
 * wrapper, the reading, the dollar line, the rule, both legs with their
 * ages, the actions. The gap sits above the canvas, not in a legend inside
 * it.
 */
const ICON_BTN = 'flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-900'

export default function GapHeader({ asset, session, stocksAt, lastFetchAt, onExit, onSheet, inWatchlist, onToggleWatch }) {
  const gap = premiumPct(asset)
  const thin = isThinlyTraded(asset)
  const diff = asset.tokenPrice != null && asset.stockPrice != null ? asset.tokenPrice - asset.stockPrice : null
  const tokenAge = lastFetchAt ? (Date.now() - lastFetchAt) / 1000 : null
  const stockAge = stocksAt ? (Date.now() - stocksAt) / 1000 : null
  return (
    <div
      className="flex h-14 shrink-0 items-center gap-4 whitespace-nowrap border-b px-6"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <button type="button" onClick={onExit} className="t-caption flex items-center gap-1 text-zinc-500 hover:text-zinc-300">
        <ChevronLeft size={12} />
        Board
        <kbd className="rounded border px-1 font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>Esc</kbd>
      </button>
      <div className="flex items-baseline gap-2.5">
        <span className="t-body font-medium text-zinc-100">{asset.ticker}</span>
        <span className={`num t-title ${thin ? 'text-zinc-500' : 'text-zinc-100'}`}>{gap != null ? formatPct(gap) : EM_DASH}</span>
        {asset.underlying && (
          <span className="t-caption text-zinc-500">
            vs {asset.underlying}
            {diff != null && (
              <>
                {' · '}
                <span className="num">{formatPrice(Math.abs(diff))}</span> {diff >= 0 ? 'above' : 'below'} the share
              </>
            )}
          </span>
        )}
      </div>
      <GapBar pct={gap} thin={thin} width={160} height={8} tone="accent" />
      <div className="num t-label flex items-center gap-3.5 text-zinc-300">
        <span>{tokenLegLine({ price: asset.tokenPrice, ageSeconds: tokenAge, source: asset.mint ? 'Jupiter' : 'CoinGecko' })}</span>
        {asset.underlying && (
          <span>{shareLegLine({ price: asset.stockPrice, session, ageSeconds: stockAge, source: STOCK_QUOTE_SOURCE })}</span>
        )}
      </div>
      <div className="flex-1" />
      <button onClick={onToggleWatch} aria-label={inWatchlist ? 'Remove from Watching' : 'Add to Watching'} className={`${ICON_BTN} ${inWatchlist ? 'text-accent' : 'text-zinc-300'}`}>
        <StarIcon size={18} filled={inWatchlist} />
      </button>
      {asset.underlying && (
        <button onClick={() => onSheet('alert')} aria-label="Set alert" className={`${ICON_BTN} text-zinc-300`}>
          <BellIcon size={18} />
        </button>
      )}
      <button onClick={() => onSheet('folder')} aria-label="Add to folder" className={`${ICON_BTN} text-zinc-300`}>
        <PlusIcon size={18} />
      </button>
      <button onClick={() => onSheet('share')} aria-label="Share" className={`${ICON_BTN} text-zinc-300`}>
        <ShareIcon size={18} />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: `ChartFootStrip.jsx`**

```jsx
// src/components/desktop/ChartFootStrip.jsx
import { RANGE_IDS } from '../../lib/intervalInput'
import { IndicatorsIcon, LogIcon } from '../Icons'

/*
 * The one strip of chart chrome on the Meter (spec §3.2 "The drill-in"),
 * 40 px at the chart's foot: Gap | Candles, the range words (Gap) or the
 * side and bar-length words (Candles), the Indicators button with its
 * count, Log scale, and the Shortcuts hint. No interval codes; every chip
 * is a word.
 */
const RANGE_WORDS = { '1D': 'Past day', '1W': 'Past week', '1M': 'Past month', '3M': 'Past 3 months', '1Y': 'Past year' }
const BAR_WORDS = { '1m': '1 min', '5m': '5 min', '15m': '15 min', '1h': '1 hour', '4h': '4 hours', '1d': '1 day' }
const CHIP = 't-label flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 transition-colors'
const on = (active) => (active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')
const onStyle = (active) => (active ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined)

function Rule() {
  return <span className="mx-2 h-4 w-px shrink-0 bg-zinc-800" aria-hidden="true" />
}

export default function ChartFootStrip({
  mode, onMode, range, onRange, side, onSide, timeframe, onTimeframe, offeredTimeframes,
  log, onLog, indicatorCount, onOpenIndicators, onShortcuts, hasStock, ticker, underlying,
}) {
  const candles = mode === 'candles'
  return (
    <div
      className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-t px-3 [scrollbar-width:none]"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <button type="button" onClick={() => onMode('gap')} aria-pressed={!candles} className={`${CHIP} ${on(!candles)}`} style={onStyle(!candles)}>Gap</button>
      <button type="button" onClick={() => onMode('candles')} aria-pressed={candles} className={`${CHIP} ${on(candles)}`} style={onStyle(candles)}>Candles</button>
      <Rule />
      {!candles &&
        RANGE_IDS.map((r) => (
          <button key={r} type="button" onClick={() => onRange(r)} aria-pressed={range === r} className={`${CHIP} ${on(range === r)}`} style={onStyle(range === r)}>
            {RANGE_WORDS[r]}
          </button>
        ))}
      {candles && (
        <>
          <button type="button" onClick={() => onSide('token')} aria-pressed={side === 'token'} className={`${CHIP} ${on(side === 'token')}`} style={onStyle(side === 'token')}>
            {ticker} token
          </button>
          {hasStock && (
            <button type="button" onClick={() => onSide('stock')} aria-pressed={side === 'stock'} className={`${CHIP} ${on(side === 'stock')}`} style={onStyle(side === 'stock')}>
              {underlying} share
            </button>
          )}
          <Rule />
          {offeredTimeframes.map((t) => (
            <button key={t.id} type="button" onClick={() => onTimeframe(t.id)} aria-pressed={timeframe === t.id} className={`${CHIP} ${on(timeframe === t.id)}`} style={onStyle(timeframe === t.id)}>
              {BAR_WORDS[t.id] ?? t.label}
            </button>
          ))}
          <Rule />
          <button type="button" onClick={onOpenIndicators} className={`${CHIP} ${on(indicatorCount > 0)}`} style={onStyle(indicatorCount > 0)}>
            <IndicatorsIcon size={16} />
            Indicators
            {indicatorCount > 0 && (
              <span className="num flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] text-zinc-950">
                {indicatorCount}
              </span>
            )}
          </button>
          <button type="button" onClick={onLog} aria-pressed={log} className={`${CHIP} ${on(log)}`} style={onStyle(log)}>
            <LogIcon size={16} />
            Log scale
          </button>
        </>
      )}
      <div className="flex-1" />
      <button type="button" onClick={onShortcuts} className="t-caption flex items-center gap-2 whitespace-nowrap text-zinc-500 hover:text-zinc-300">
        Shortcuts
        <kbd className="rounded border px-1 font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>?</kbd>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: the `drillIn` prop on `ChartWorkspace`**

In `src/components/desktop/ChartWorkspace.jsx`:

1. Add imports after the existing ones:

```jsx
import { useFolders } from '../../state/FoldersContext'
import { timeframesFor } from '../../lib/candleSeries'
import GapHeader from './GapHeader'
import ChartFootStrip from './ChartFootStrip'
```

2. Thread the prop: `export default function ChartWorkspace({ assetId, onSelectAsset, onScrub, searchRef, actionsRef, drillIn = null })` and pass `drillIn={drillIn}` to `<Workspace>`; `function Workspace({ assetId, onSelectAsset, onScrub, searchRef, actionsRef, drillIn })`.

3. Inside `Workspace`, after `const { stocksAt } = usePrices()`, add:

```jsx
  const { lastFetchAt } = usePrices()
  const { watchlistIds, toggleWatchlist } = useFolders()
```

4. The countdown must not tick on the drill-in: change `const countdownOn = mode === 'candles' && side === 'token' && lastBar != null` to `const countdownOn = !drillIn && mode === 'candles' && side === 'token' && lastBar != null`.

5. Replace the `return (` block's outer structure. The existing return begins `<div className="flex min-h-full flex-col">` then `<ChartToolbar .../>` then `<div className="px-6 pb-10">`. Change it to:

```jsx
  const footStrip = drillIn ? (
    <ChartFootStrip
      mode={mode}
      onMode={setMode}
      range={range}
      onRange={(r) => {
        onScrub(null)
        setScrubT(null)
        patch({ range: r })
      }}
      side={side}
      onSide={setSide}
      timeframe={timeframe}
      onTimeframe={(id) => patch({ timeframe: id })}
      offeredTimeframes={timeframesFor(side)}
      log={log}
      onLog={() => patch({ log: !log })}
      indicatorCount={mode === 'candles' ? indicators.length : 0}
      onOpenIndicators={() => setIndicatorsOpen(true)}
      onShortcuts={drillIn.onShortcuts}
      hasStock={Boolean(asset.underlying)}
      ticker={asset.ticker}
      underlying={asset.underlying}
    />
  ) : null

  return (
    <div className={drillIn ? 'flex h-full min-h-0 flex-col' : 'flex min-h-full flex-col'}>
      {drillIn ? (
        <GapHeader
          asset={asset}
          session={session}
          stocksAt={stocksAt}
          lastFetchAt={lastFetchAt}
          onExit={drillIn.onExit}
          onSheet={drillIn.onSheet}
          inWatchlist={watchlistIds.includes(asset.id)}
          onToggleWatch={() => toggleWatchlist(asset.id)}
        />
      ) : (
        <ChartToolbar
          ... (the existing props, unchanged)
        />
      )}

      <div className={drillIn ? 'min-h-0 flex-1 overflow-y-auto px-6 pb-4' : 'px-6 pb-10'}>
```

6. Gap-mode legend title row: wrap the existing `<div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-2">…</div>` in `{!drillIn && ( … )}`.

7. Candles-mode legend: wrap the title row `<div className="pointer-events-auto flex flex-wrap items-baseline gap-x-2">…</div>` in `{!drillIn && ( … )}`, and change the values row so OHLC shows only under the crosshair on the drill-in: `{shownBar ? (` becomes `{shownBar && (!drillIn || hoverBar) ? (`. Keep the indicator rows as they are (they name the lines).

8. Tabs: wrap `<DetailTabs … />` in `{!drillIn && ( … )}`.

9. After the closing `</div>` of the `px-6` content block and before `{alertOpen && …}`, insert `{footStrip}`.

Everything else in the file stays. With `drillIn` null the rendered tree is exactly today's.

- [ ] **Step 5: Lint and tests**

Run: `npx oxlint && npx vitest run`
Expected: baseline lint; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/desktop/Masthead.jsx src/components/desktop/GapHeader.jsx src/components/desktop/ChartFootStrip.jsx src/components/desktop/ChartWorkspace.jsx
printf 'Masthead, the drill-in gap header and foot strip; ChartWorkspace drillIn variant\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 9: `useMeterShortcuts.js`, `MeterShell.jsx`, and the switch in `App.jsx`

**Files:**
- Create: `src/hooks/useMeterShortcuts.js`, `src/components/desktop/MeterShell.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- `useMeterShortcuts({ scope, searchRef, boardRef, chartRef, onSelect, onWatch, onAlert, onChart, onFullscreen, onExitFullscreen, onExitChart, onShortcuts, onIndicators })`.
- `MeterShell({ tab, onTab, assetId, onSelectAsset, openFolderId, onOpenFolder, onOpenProfile })`: the same props `DesktopShell` takes minus `listSource`/`onListSource`.

- [ ] **Step 1: `useMeterShortcuts.js`**

```js
// src/hooks/useMeterShortcuts.js
import { useEffect, useRef } from 'react'
import { classifyMeterKey, keyContext, isMacPlatform } from '../lib/meterKeys'

/*
 * The Meter's keyboard map, mounted once by MeterShell as its only window
 * keydown listener. lib/meterKeys.js decides what a key means; this hook
 * wires the action to the thing that does it. `opts` is read through a ref
 * on every press so the caller passes fresh values without re-subscribing.
 *
 *   scope        'board' | 'chart' — which map is live
 *   searchRef    SymbolSearch's handle: focus(prefill), close() → bool
 *   boardRef     Board's handle: step(delta), expand(open), select(), focusedId()
 *   chartRef     ChartWorkspace's handle (closePrompt() → bool is the only member used here)
 *   onWatch(id) / onAlert(id) / onChart() / onFullscreen() / onExitFullscreen() → bool
 *   onExitChart() → bool / onShortcuts() / onIndicators()
 *
 * Esc closes the top-most thing: the search popover, fullscreen, then the chart.
 */
export function useMeterShortcuts(opts) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const mac = isMacPlatform()
    function onKeyDown(e) {
      if (e.defaultPrevented || e.isComposing) return
      const o = optsRef.current ?? {}
      const action = classifyMeterKey(e, { mac, scope: o.scope ?? 'board', ...keyContext(e.target) })
      if (!action) return
      const board = o.boardRef?.current
      switch (action.type) {
        case 'focusSearch':
          e.preventDefault()
          o.searchRef?.current?.focus('')
          break
        case 'step':
          e.preventDefault()
          board?.step(action.delta)
          break
        case 'expand':
          e.preventDefault()
          board?.expand(action.open)
          break
        case 'select':
          e.preventDefault()
          board?.select()
          break
        case 'watch': {
          const id = board?.focusedId?.()
          if (id) {
            e.preventDefault()
            o.onWatch?.(id)
          }
          break
        }
        case 'alert': {
          const id = board?.focusedId?.()
          if (id) {
            e.preventDefault()
            o.onAlert?.(id)
          }
          break
        }
        case 'chart':
          e.preventDefault()
          o.onChart?.()
          break
        case 'fullscreen':
          e.preventDefault()
          o.onFullscreen?.()
          break
        case 'indicators':
          e.preventDefault()
          o.onIndicators?.()
          break
        case 'shortcuts':
          e.preventDefault()
          o.onShortcuts?.()
          break
        case 'escape':
          if (o.searchRef?.current?.close?.()) return
          if (o.chartRef?.current?.closePrompt?.()) return
          if (o.onExitFullscreen?.()) return
          o.onExitChart?.()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export default useMeterShortcuts
```

- [ ] **Step 2: `MeterShell.jsx`**

```jsx
// src/components/desktop/MeterShell.jsx
import { useEffect, useRef, useState } from 'react'
import { track } from '../../services/analytics'
import { useFolders } from '../../state/FoldersContext'
import { useAsset } from '../../state/PricesContext'
import { useLocalState } from '../../hooks/useLocalState'
import { useMeterShortcuts } from '../../hooks/useMeterShortcuts'
import { getRecentViews } from '../../lib/recentViews'
import { ASSET_IDS } from '../../data/universe'
import { pickInitialAsset } from '../../lib/desktopState'
import { premiumPct } from '../../lib/prices'
import { meterTitle, boardTitle, screenTitle, DEFAULT_TITLE } from '../../lib/pageTitle'
import { meterShortcutRows, isMacPlatform } from '../../lib/meterKeys'
import { classifyVisit } from '../../lib/returnVisit'
import { DESKTOP_HOME_KEY } from '../../lib/desktopHome'
import { FoldersList, FolderDetail } from '../../screens/Folders'
import News from '../../screens/News'
import Trade from '../../screens/Trade'
import Masthead from './Masthead'
import Board from './Board'
import Readout from './Readout'
import ChartWorkspace from './ChartWorkspace'
import ShortcutSheet from './ShortcutSheet'
import SetAlertSheet from '../../overlays/SetAlertSheet'

const KNOWN_IDS = new Set(ASSET_IDS)

/*
 * The Meter (spec §3.2): the masthead over the Board and the Readout; the
 * chart is a drill-in one key away. Mounted by App at 1024px and up in a
 * browser when the desktop home is 'meter'; the Phase 1 DesktopShell is the
 * other home until the owner picks. Folders, News and Trade take over the
 * whole area below the masthead (their phone screens at 640px, centred);
 * picking an asset from any of them returns the Board with that wrapper in
 * the Readout.
 */
export default function MeterShell({ tab, onTab, assetId, onSelectAsset, openFolderId, onOpenFolder, onOpenProfile }) {
  const [lens, setLens] = useLocalState('bw.meter.lens.v1', null)
  const [chartOpen, setChartOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [sheet, setSheet] = useState(null) // 'folder' | 'alert' | 'share' | null (the Readout renders it)
  const [alertFor, setAlertFor] = useState(null) // an asset id the A key picked on the Board
  const searchRef = useRef(null)
  const boardRef = useRef(null)
  const chartRef = useRef(null)
  const { watchlistIds, toggleWatchlist } = useFolders()
  const alertAsset = useAsset(alertFor)
  const asset = useAsset(assetId)

  // Owner question 1's default: open on Watching when it has rows, else the
  // Board; after that the last lens is remembered.
  const effectiveLens = lens ?? (watchlistIds.length > 0 ? 'watching' : 'all')

  // Restore on load: the remembered wrapper, else the last viewed, else the
  // first Watching row. Runs once.
  const [savedAssetId, setSavedAssetId] = useLocalState('bw.meter.asset.v1', null)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (assetId != null) return
    const pick = pickInitialAsset({ saved: savedAssetId, recent: getRecentViews(), watchlistIds, known: KNOWN_IDS })
    if (pick) onSelectAsset(pick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (assetId != null) setSavedAssetId(assetId)
  }, [assetId, setSavedAssetId])

  // The return counter, once per mount: first / return within 7 days / lapsed.
  useEffect(() => {
    let lastSeen = null
    try {
      lastSeen = Number(localStorage.getItem('bw.meter.lastSeen.v1')) || null
      localStorage.setItem('bw.meter.lastSeen.v1', String(Date.now()))
    } catch {
      // storage unavailable; the event still fires as a first visit
    }
    const visit = classifyVisit({ lastSeenMs: lastSeen, nowMs: Date.now() })
    track('meter_open', { home: 'meter', visit: visit.kind, days: visit.days })
  }, [])

  // Leaving the Board for a takeover closes the chart; picking an asset
  // anywhere returns to the Board.
  useEffect(() => {
    if (tab !== 'home') setChartOpen(false)
  }, [tab])

  const gapPct = asset ? premiumPct(asset) : null
  useEffect(() => {
    if (tab !== 'home') document.title = screenTitle(tab)
    else document.title = asset ? meterTitle({ ticker: asset.ticker, gapPct }) : boardTitle()
  }, [tab, asset?.ticker, gapPct]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    document.title = DEFAULT_TITLE
  }, [])

  function select(id, { from = 'board' } = {}) {
    onSelectAsset(id)
    track('meter_asset', { from })
  }

  function openChart() {
    if (!assetId) return
    setChartOpen(true)
    track('meter_chart_open')
  }

  useMeterShortcuts({
    scope: chartOpen ? 'chart' : 'board',
    searchRef,
    boardRef,
    chartRef,
    onWatch: (id) => toggleWatchlist(id),
    onAlert: (id) => setAlertFor(id),
    onChart: openChart,
    onFullscreen: () => setFullscreen((f) => !f),
    onExitFullscreen: () => {
      if (!fullscreen) return false
      setFullscreen(false)
      return true
    },
    onExitChart: () => {
      if (!chartOpen) return false
      setChartOpen(false)
      return true
    },
    onShortcuts: () => setShortcutsOpen(true),
    onIndicators: () => chartRef.current?.focusIndicators?.(),
  })

  function onMastheadTab(id) {
    if (id === 'watching') {
      setLens('watching')
      onTab('home')
      return
    }
    if (id === 'home') {
      if (effectiveLens === 'watching') setLens('all')
      onTab('home')
      return
    }
    onTab(id)
  }
  const mastheadActive = tab === 'home' ? (effectiveLens === 'watching' ? 'watching' : 'home') : tab

  const switchFooter = (
    <p className="t-caption mt-4 text-zinc-500">
      Prefer the chart-first desktop?{' '}
      <button
        type="button"
        className="text-accent"
        onClick={() => {
          try {
            localStorage.setItem(DESKTOP_HOME_KEY, JSON.stringify('chart'))
          } catch {
            // storage unavailable: the query string below still switches
          }
          window.location.search = '?home=chart'
        }}
      >
        Switch
      </button>
    </p>
  )

  let body
  if (tab !== 'home') {
    let screen
    if (tab === 'folders') {
      screen = openFolderId ? (
        <FolderDetail folderId={openFolderId} onBack={() => onOpenFolder(null)} onOpenProfile={onOpenProfile} onOpenAsset={(a) => select(a.id, { from: 'folder' })} />
      ) : (
        <FoldersList onOpenProfile={onOpenProfile} onOpenFolder={onOpenFolder} />
      )
    } else if (tab === 'news') {
      screen = <News onOpenProfile={onOpenProfile} onOpenAsset={(a) => select(a.id, { from: 'news' })} />
    } else {
      screen = <Trade onOpenProfile={onOpenProfile} />
    }
    body = (
      <main className="min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-[640px]">{screen}</div>
      </main>
    )
  } else if (chartOpen && assetId) {
    body = (
      <main className="min-h-0">
        <ChartWorkspace
          assetId={assetId}
          onSelectAsset={(id) => select(id, { from: 'chart' })}
          onScrub={() => {}}
          searchRef={searchRef}
          actionsRef={chartRef}
          drillIn={{ onExit: () => setChartOpen(false), onSheet: setSheet, onShortcuts: () => setShortcutsOpen(true) }}
        />
      </main>
    )
  } else {
    body = (
      <div className="grid min-h-0" style={{ gridTemplateColumns: 'minmax(0, 1fr) min(560px, 39vw)' }}>
        <main className="min-h-0 min-w-0">
          <Board selectedId={assetId} onSelect={select} actionsRef={boardRef} lens={effectiveLens} onLens={setLens} />
        </main>
        <aside className="min-h-0 min-w-0 overflow-y-auto border-l" style={{ borderColor: 'var(--border-default)' }}>
          <Readout assetId={assetId} onSelectAsset={(id) => select(id, { from: 'readout' })} onOpenChart={openChart} sheet={sheet} onSheet={setSheet} />
        </aside>
      </div>
    )
  }

  return (
    <div className="grid h-dvh w-full overflow-hidden" style={{ gridTemplateRows: fullscreen ? '0px 1fr' : '56px 1fr' }}>
      <div hidden={fullscreen}>
        <Masthead active={mastheadActive} onTab={onMastheadTab} searchRef={searchRef} onSelectAsset={(id) => select(id, { from: 'search' })} onOpenProfile={onOpenProfile} />
      </div>
      {body}
      {shortcutsOpen && (
        <ShortcutSheet
          onClose={() => setShortcutsOpen(false)}
          rows={meterShortcutRows(isMacPlatform())}
          intro="Anywhere on the Meter, outside a text field."
          footer={switchFooter}
        />
      )}
      {alertAsset && <SetAlertSheet asset={alertAsset} onClose={() => setAlertFor(null)} />}
    </div>
  )
}
```

Note: the Readout's `sheet` state lives here so the drill-in's `GapHeader` can open the same sheets through `drillIn.onSheet`; when the chart is open the Readout is unmounted, so a sheet opened from the header must be rendered somewhere. Add, just before `{alertAsset && …}`:

```jsx
      {chartOpen && asset && sheet === 'folder' && <AddToFolderSheet asset={asset} onClose={() => setSheet(null)} />}
      {chartOpen && asset && sheet === 'share' && <ShareSheet asset={asset} onClose={() => setSheet(null)} />}
      {chartOpen && asset && sheet === 'alert' && <SetAlertSheet asset={asset} onClose={() => setSheet(null)} />}
```

with `import AddToFolderSheet from '../../overlays/AddToFolderSheet'` and `import ShareSheet from '../../overlays/ShareSheet'` added to the imports.

- [ ] **Step 3: `App.jsx`**

Add imports:

```jsx
import { resolveDesktopHome, DESKTOP_HOME_KEY } from './lib/desktopHome'
const MeterShell = lazy(() => import('./components/desktop/MeterShell'))
```

Inside `App()`, after the `desktop` line:

```jsx
  // Which desktop home (spec §4, Plan A): the Meter or the Phase 1 chart-first
  // shell, until the owner picks. `?home=chart` switches and is remembered.
  const [desktopHome] = useState(() => {
    let saved = null
    try {
      saved = JSON.parse(window.localStorage.getItem(DESKTOP_HOME_KEY))
    } catch {
      // unset or unreadable; the default stands
    }
    const home = resolveDesktopHome({ search: window.location.search, saved })
    try {
      window.localStorage.setItem(DESKTOP_HOME_KEY, JSON.stringify(home))
    } catch {
      // storage unavailable; this open still resolves
    }
    return home
  })
```

Replace the `{desktop ? ( <Suspense …><DesktopShell …/></Suspense> ) : ( … )}` branch's desktop half with:

```jsx
          {desktop ? (
            <Suspense fallback={null}>
              {desktopHome === 'meter' ? (
                <MeterShell
                  tab={tab}
                  onTab={switchTab}
                  assetId={openAssetId}
                  onSelectAsset={(id) => {
                    setOpenAssetId(id)
                    setTab('home')
                  }}
                  openFolderId={openFolderId}
                  onOpenFolder={setOpenFolderId}
                  onOpenProfile={openProfile}
                />
              ) : (
                <DesktopShell
                  tab={tab}
                  onTab={switchTab}
                  assetId={openAssetId}
                  onSelectAsset={(id) => {
                    setOpenAssetId(id)
                    setTab('home')
                  }}
                  listSource={listSource}
                  onListSource={setListSource}
                  openFolderId={openFolderId}
                  onOpenFolder={setOpenFolderId}
                  onOpenProfile={openProfile}
                />
              )}
            </Suspense>
          ) : (
```

The phone half of that ternary is untouched. `useState` is already imported.

- [ ] **Step 4: Lint, tests, build**

Run: `npx oxlint && npx vitest run && npx vite build`
Expected: baseline lint; all tests pass; build clean with a new `MeterShell-*.js` chunk listed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMeterShortcuts.js src/components/desktop/MeterShell.jsx src/App.jsx
printf 'The Meter shell: masthead + Board + Readout, the chart drill-in, the home switch\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 10: Live desktop verification and fixes

**Files:** whatever the checks turn up.

Use the Browser pane (`preview_start` with `blockwatch-dev`), never Bash, for the server. Checks at 1440×900 and 1280×800 (`resize_window`):

- [ ] **Step 1: The Board renders.** `http://localhost:5173/` at 1440×900. Expect: masthead 56 px with Board · Watching · Folders · News · Trade, the search field, the session sentence in full, the widest-gap pill when the market is shut. Below: the Board at left with the control strip, the column header, company rows. `read_page` must list buttons named "All", "Stocks", "ETFs", "Bonds", "Watching", "Sort: widest gap" and a checkbox "Credible only". Console (`read_console_messages onlyErrors`) shows no errors.
- [ ] **Step 2: Rows and sub-rows.** Click NVDA (or the first multi-wrapper company). Expect: it expands into one sub-row per wrapper; the sub-row bars' zero tick is at the same x as the company bar's (check with `javascript_tool`: `[...document.querySelectorAll('[data-gapbar]')].slice(0,4).map(b => b.getBoundingClientRect().left)` are equal). The "cheapest" chip sits on the lowest-gap wrapper. The Readout shows the clicked company's lead wrapper.
- [ ] **Step 3: The Readout.** Expect the sentence "On $1,000 of {company}, {ticker} costs $… more/less than the shares right now." (or the parity/noise forms), the size pills, the wrapper picker when there are siblings, the reading at display size, the rule, two leg lines, "At your size", the gap history at 164 px with range words and a percentile caption, "Price chart · Open chart C", the four action icons, the Trade button, tabs Statistics · News · Trades on · Learn. Click $10,000: the sentence and the "At your size" highlight change. Click Learn: the cards render.
- [ ] **Step 4: Keys.** With focus on the body (click an empty area): `ArrowDown` moves the focus highlight; `ArrowRight` expands; `Enter` fills the Readout; `w` toggles the star in the Readout; `c` opens the chart; `Escape` returns to the Board with the same row focused; `?` opens the shortcut sheet with the Meter rows and the "Switch" footer; a bare `n` does NOT open search; `Ctrl+K` does. Dispatch synthetic keys on `document.body`, not `window` (React listeners on `window` still receive bubbling events from `document.body`; the trap noted in memory is about React inputs).
- [ ] **Step 5: The drill-in.** After `c`: no masthead change, a 56 px gap header with "← Board Esc", the ticker, the reading, the rule, both legs, the actions; the chart fills the middle; the foot strip shows Gap · Candles · Past day … Past year · Shortcuts ?. No toolbar row above the chart, no legend title row. Click Candles: the strip shows "{ticker} token", "{underlying} share", "1 min … 1 day", "Indicators", "Log scale"; the Indicators button opens the existing dialog; adding SMA shows the count badge. The "Charts by TradingView" caption is present under the candle chart (it is CandleChart's own).
- [ ] **Step 6: Takeovers and the switch.** Click News: the news screen at 640 px centred, title "News — OnStock". Click a headline's asset: back to the Board with it in the Readout. Open `http://localhost:5173/?home=chart`: the Phase 1 shell renders (rail, chart in the middle). Reload `http://localhost:5173/`: still Phase 1 (remembered). `?home=meter`: the Meter again.
- [ ] **Step 7: 1280×800.** No horizontal scroll (`document.documentElement.scrollWidth <= window.innerWidth` via `javascript_tool`); the Board columns fit (the grid is 832 px wide inside 24 px gutters, the Readout `min(560px, 39vw)` = 499 px at 1280, so the Board gets 781 px: if the grid overflows, change `GRID` to `'minmax(160px,1fr) 120px 224px 104px 80px 24px'` and the bar width to 144).
- [ ] **Step 8: Fix and commit** whatever the checks found, one commit:

```bash
git add <files>
printf 'Meter: fixes from the live desktop check\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

Take a 1440×900 screenshot of the Board and one of the drill-in for the handover.

---

### Task 11: Phones byte-identical, and the PR

**Files:** none new unless a phone diff appears.

- [ ] **Step 1: Baseline.** In the Browser pane at 390×844 (`resize_window` mobile preset), on the branch's parent commit `6035e11`… this is the Phase 1 build the previous DOM-skeleton diff was taken against, and the phone tree has not been touched since. Rather than checking out the old commit, prove the skeleton directly: on a FRESH load of `http://localhost:5173/` at 390×844 run, via `javascript_tool`:

```js
(() => {
  const walk = (n) => n.nodeType === 1 ? `<${n.tagName.toLowerCase()} class="${n.className && n.className.baseVal === undefined ? n.className : ''}">${[...n.childNodes].map(walk).join('')}</${n.tagName.toLowerCase()}>` : '';
  return walk(document.getElementById('root')).length;
})()
```

and record the element count for home; then open an asset (tap the first row), and record again; then Gaps, Folders, News tabs. Note each count.

- [ ] **Step 2: Compare against `release/onstock`.** Stop the preview (`preview_stop`), `git stash -u` is NOT needed (the tree is clean after the commits); run `git worktree add ../bw-release release/onstock`, then `preview_start` cannot target another directory, so instead run `npx vite --port 5199` there via the Browser pane's launch config: add to `.claude/launch.json` a second configuration `{ "name": "bw-release", "runtimeExecutable": "npx", "runtimeArgs": ["vite", "--port", "5199"], "port": 5199, "cwd": "../bw-release" }` if the pane supports `cwd`; if it does not, skip the worktree and rely on the reasoning check below. Repeat the five counts on the release build. All five must match (data-only diffs like a gain/loss class flip are allowed; a count difference is not).
- [ ] **Step 3: Reasoning check** (always, in addition): `git diff 6035e11 --stat -- src` must list only these files touched under `src/`: `App.jsx`, `components/shared.jsx`, `components/desktop/*`, `hooks/useMeterShortcuts.js`, `lib/board.js`, `lib/reading.js`, `lib/meterKeys.js`, `lib/desktopHome.js`, `lib/returnVisit.js`, `lib/pageTitle.js`, `lib/provenance.js`, `services/stocks.js`, plus the September 7 indicator files from the second commit. Of these, the phone renders `shared.jsx` (GapBar: defaults unchanged, verified by reading the diff) and `App.jsx` (the phone branch of the ternary untouched, verified by reading the diff). Everything else is desktop-only or pure.
- [ ] **Step 4: Remove the worktree** if one was made: `git worktree remove ../bw-release`.
- [ ] **Step 5: Push and open the PR** into `release/onstock`:

```bash
git push -u origin feat/desktop-meter
```

Write the PR body to a file and use `gh pr create --base release/onstock --title "The Meter: Gap Board home, Readout, chart drill-in (Plan A)" --body-file "$TEMP/pr.md"`. The body: what the Meter is in three sentences; the switch (`?home=chart` / `?home=meter`); what is deliberately not in this PR (the week-3 deletion, the wrapper ledger, the Lightweight Charts gap pane, mark-up tools, the Indicators panel's editing); the two screenshots; the phone proof from Step 1 to 3; the gates (tests, lint, build). End with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Do not merge. Do not close PR #9 (owner question 6).

---

## Self-review

**Spec coverage (Plan A, spec §4 row A):**
- `Board.jsx` behind a flag beside the untouched shell: Tasks 6, 9. Company rows, wrapper sub-rows on the same grid: Task 6. Credible-only as a mute: Task 1 (`muted`), Task 6 (opacity, not hidden). Bounded subscription independent of premium: Task 2 `boundCandidates`, Task 6. Frozen sort: Task 2 `freezeOrder`, Task 6. Virtualisation: Task 2 `visibleWindow`, Task 6. Honest header count: Task 2 `headerLine`.
- `Readout.jsx` v1: Task 7. The sentence with size pills: Task 3, 7. Legs in words: Task 3, 7. "no DEX quote for this wrapper": Task 7. Action row, tabs: Task 7 (Learn tab: Task 5).
- Drill-in reshaped (gap header, no toolbar row, bottom strip, gap-led legend, countdown gone): Task 8.
- Own key map: Task 4, 9. Rekeyed `ShortcutSheet`: Task 5, 9. `pageTitle` gap grammar: Task 4, 9. New `provenance` exports: Task 3.
- `WatchlistPane` desktop prop: deliberately not built (Global Constraints, deviation recorded).
- Tests rewritten: new modules tested (Tasks 1 to 4); Phase 1 tests untouched because Phase 1 files are untouched.
- Return counter through PostHog: Task 4 `returnVisit.js`, Task 9 `meter_open` / `meter_lens` / `meter_asset` / `meter_chart_open`.
- Both homes on one preview URL: Task 4 `desktopHome.js`, Task 9 switch, Task 10 step 6.
- The Monday header line "what the weekend did to your Watching rows" from the spec's Plan A: NOT in this plan. It needs the session-reconciliation data of Plan D (§3.4 #6); listing it under Plan A in the spec was an ordering error. Recorded here for the owner.
- Owner picks the default, then deletion: after this plan, by design.

**Placeholder scan:** no TBD/TODO; every code step carries code; Task 8 step 5's "… (the existing props, unchanged)" refers to the `ChartToolbar` props already in the file the implementer is editing, verbatim above in this plan's Task 8 context (the file is read in place).

**Type consistency:** `groupCompanies` returns `key/underlying/name/logoAsset/wrappers/lead/leadAsset/cheapestAsset/spreadBp/muted/volume24h`, and Board.jsx reads exactly those. `freezeOrder(prevKeys, companies) → { companies, keys }` matches Board.jsx. `flattenRows` rows carry `type/key/height/company/wrapper`, and Board.jsx reads those. `visibleWindow → { start, end, top, bottom }` matches. `classifyMeterKey` action types match the `switch` in `useMeterShortcuts`. Board's `actionsRef.current` has `step/expand/select/focusedId`, which the hook calls. `readingSentence`/`roundTrip`/`gapDollars`/`gapPercentile`/`percentileCaption`/`formatSize`/`SIZES`/`RANGE_WORDS` are imported by name in Readout. `tokenLegLine`/`shareLegLine` signatures match their callers in Readout and GapHeader. `ShortcutSheet` `rows/intro/footer` match MeterShell. `DetailTabs variant="meter"` matches. `ChartWorkspace drillIn = { onExit, onSheet, onShortcuts }` matches MeterShell. `resolveDesktopHome({ search, saved })` and `DESKTOP_HOME_KEY` match App.jsx and MeterShell.
