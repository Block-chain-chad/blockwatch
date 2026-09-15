# Big Screens and the Calm Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a 1440 px and wider window the Meter grows its instrument (the Board's gap rule, the Readout, the gap history) and nothing else, names the widest gap during the open session, moves the percentile line under the reading, and turns a fired alert into one operating-system notification.

**Architecture:** One new pure module, `src/lib/bigScreen.js`, decides every width from `window.innerWidth`, which the shell measures once through a new `useWindowWidth` hook and passes down as a `big` prop; Board and Readout never read the window. A second pure module, `src/lib/alertNotify.js`, composes the notification's words and the two permission rules; a new `useAlertNotifications` hook mounted by `MeterShell` posts them. `widestCredibleGap` gains an option, `meterTitle` is split so its headline can be reused, and `SetAlertSheet` gains one additive prop whose absence leaves the phone's markup byte-identical.

**Tech Stack:** React 19, Vite 8, Tailwind v4, Vitest 4 (node environment, no DOM: hooks are not unit-tested, their logic lives in pure modules), oxlint. No new dependencies.

## Global Constraints

Copied from `docs/superpowers/specs/2026-09-15-desktop-big-screen-design.md`:

- Only three things scale with the window: the Board's gap column, the Readout's width, and the Readout's gap-history height. Everything else keeps its 1440 size (§2). Row heights 56/40/32/40, the masthead 56, the drill-in, the key map, the storage keys, the colours, the phone tree, the Phase 1 shell and the `?home=` switch stay exactly as shipped (§2.5).
- The breakpoint table, verbatim (§2.1): 1024–1439 rule 144 / Readout `min(560px, 39vw)` / history 164 (unchanged); 1440–1679 rule 240 / 560 px / 164; 1680–1919 rule 400 / 560 px / 220; 1920–2559 rule 560 / 640 px / 260; 2560 and up rule 560 (cap) / 800 px / 320, the shell centred in a 2560 px content max with plain page-background margins and no border, the masthead spanning the content max (§2.4).
- The Board's other columns keep today's widths: `minmax(160px, 1fr) 120px … 104px 80px 24px`. The gap track is the rule plus 80 px (12 px gap, the 56 px signed label, 12 px trailing), so 224 today, 320 / 480 / 640 / 640 across the bands. The company column stays the flexible one (§2.1, mockup).
- Widths come from one pure function `bigScreen(width) → { rule, readout, history, … }` in `src/lib/bigScreen.js`, tested at every edge: 1439, 1440, 1679, 1680, 1919, 1920, 2559, 2560, 3440. The shell measures `window.innerWidth` through a small `useWindowWidth` hook and passes the result down as props; components never read the window themselves (§2.1).
- `GapBar` keeps its square-root fill. From 1680 up the Board's column header carries tick labels −2, −1, −0.5, 0, +0.5, +1, +2 percent at 100 / 70.7 / 50 / 0 / 50 / 70.7 / 100 percent of the half track, 11 px tabular figures, colour `oklch(0.62 0.009 250)` (`zinc-500`). The Readout's rule gets the same seven labels from 1440 up. The header stays 32 px: 14 px label, 4 px, 12 px ticks. A pure `ruleTicks(scale = 2)` produces the set; tests pin the seven positions (§2.2).
- The Readout stays a single column at every width. What changes: the history height, the rule's width (the column's content width), and the size pills and wrapper picker sit on one row at 640 and up (§2.3). The mockup's 640 px Readout shows exactly today's pills-and-picker row (size pills, a flex spacer, wrapper chips), so no task changes that row; recorded in the self-review.
- `widestCredibleGap(assets, session, { includeRegular = false })`: the regular-hours bound is 5 % (the pre/post bound), same 0.15 % floor and thin-market exclusion; the phone keeps the default; the Masthead passes `includeRegular: true`. Pill copy in regular hours "Widest gap right now · COINx +0.59%", otherwise "Widest gap · COINx +0.59%". Tests cover both (§3.1).
- The percentile caption moves to directly under the reading and the rule, above the two leg lines, same 12 px grey; same data (`gapPercentile` over `chart.premium` for the selected range); null while the history loads; the history pane keeps its range words and loses the duplicate (§3.2).
- Every figure keeps its age beside it, ticking once a second through `useNow` (§3.3, unchanged).
- Notifications (§4.1): permission is asked once, at the moment of intent, from the alert sheet, only when `Notification.permission === "default"`: one sentence "Get a system notification when this fires?" with a "Turn on" button calling `Notification.requestPermission()`. Denied or dismissed is remembered in `bw.meter.notify.v1` as `"declined"` and never asked again; granted is `"on"`. Saving the alert never waits on the answer. The copy says "while OnStock is open in a tab". A desktop-only hook `useAlertNotifications()` in `src/hooks/useAlertNotifications.js`, mounted by `MeterShell`, watches `useAlerts().events` for events newer than the last it has shown and, when permission is granted and the document is hidden or unfocused, posts `new Notification(title, { body, tag: assetId })`; the title is the `meterTitle` grammar without the product suffix, the body the alert's own sentence, the tag collapses repeats per asset. Focused tab: nothing posts. No service worker, no push. The hook mounts only in the Meter shell; the sheet's `notify` prop is additive and absent on every phone and Phase 1 caller.
- Recorded decision: the spec's example title `"NVDAx gap +1.42%"` contradicts its own rule ("the `meterTitle` grammar without the product suffix", which is `NVDAx +1.42% gap`). The rule governs; the title is `NVDAx +1.42% gap`, produced by a new `meterHeadline` that `meterTitle` itself now uses.
- Recorded decision (final review): spec §2.1 says the two new widths are "named in `src/index.css` as tokens"; no CSS reads them (every consumer is inline JavaScript through `bigScreen`), so the tokens were not added — a CSS token nothing reads would be dead code. The bands live in `src/lib/bigScreen.js` alone.
- Recorded decision (final review): spec §2.1 prose estimates the company column at "about 400 px" at 1920; the table's own arithmetic (Readout 640 + 1 px border, 48 px gutters, fixed columns 120 + 640 + 104 + 80 + 24) leaves 263 px at 1920, 183 at 1440, 263 at 1680 and 743 at 2560 — all above the 160 px minimum, pinned by `bigScreen.test.js`. The table governs; the owner may narrow a band's rule later.
- Phones stay byte-identical: every change is in a desktop-only file, a pure module, or an additive prop whose default reproduces today's DOM. `SetAlertSheet.jsx` is the one phone file touched; its default path is reviewed line by line in Task 7 and again in Task 8.
- Storage keys are `bw.meter.*`; the one new key is `bw.meter.notify.v1`.
- Tests: every pure module gets a `*.test.js` beside it. Run `npx vitest run` and `npx oxlint` before every commit; both must be clean. The oxlint baseline is 18 warnings / 0 errors (recorded in Plan A's ledger); add none. `npm run build` must pass before the PR.
- Commits: one per task, message body in a temp file passed with `git commit -F`, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Branch `feat/desktop-big-screen` (cut from `feat/desktop-meter` at bbd0902). Never `git add .`; add the task's files by path.
- The PR goes into `feat/desktop-meter` (stacked on PR #10, which stays open and unmerged). Do not merge.
- Out of scope, recorded for the owner: below ~1160 px the Board's grid already overflows its column today (company min 160 px against `min(560px, 39vw)`); the 1024–1439 band is unchanged by the spec, so this plan does not touch it. Pin and compare, the dense Board, push notifications and the Finnhub budget stay open (§5, §7).

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/bigScreen.js` (new) | `bigScreen(width)`: rule, gap column, Readout track, history height, which tick sets show, the content max. `ruleTicks(scale)`: the seven labels with positions. `BIG_SCREEN_BASE`: today's layout. |
| `src/hooks/useWindowWidth.js` (new) | `window.innerWidth` as live state (`useSyncExternalStore` on `resize`), the shell's one measurement. |
| `src/components/desktop/RuleTicks.jsx` (new) | The seven positioned tick labels under a GapBar, for the Board header and the Readout. |
| `src/components/desktop/Board.jsx` (extend) | `big` prop: gap track width, GapBar width, header ticks from 1680. |
| `src/components/desktop/Readout.jsx` (extend) | `big` prop: history height, seven rule labels from 1440; the percentile line under the reading; passes `notify` to its alert sheet. |
| `src/components/desktop/MeterShell.jsx` (extend) | Measures the window, computes `big`, sizes the grid, applies the 2560 content max, mounts `useAlertNotifications`, passes `notify` to its alert sheets. |
| `src/lib/sessionCopy.js` (extend) | `widestCredibleGap` `includeRegular` option; `widestGapLabel(session)`. |
| `src/components/desktop/Masthead.jsx` (extend) | Names the widest gap during the open session, with the session's label. |
| `src/lib/pageTitle.js` (extend) | `meterHeadline`; `meterTitle` built from it. Old exports unchanged in output. |
| `src/lib/alertNotify.js` (new) | `NOTIFY_KEY`, `alertNotification(event)`, `unseenEvents(events, sinceAt)`, `notifyOfferVisible({ permission, saved })`, `shouldPost({ permission, hidden, focused })`. |
| `src/hooks/useAlertNotifications.js` (new) | Posts one notification per new alert event when granted and the tab is not being looked at. |
| `src/overlays/SetAlertSheet.jsx` (extend) | Additive `notify` prop: the one-time ask above the Save button. Default path byte-identical. |

---

### Task 1: `bigScreen.js` and `useWindowWidth`

**Files:**
- Create: `src/lib/bigScreen.js`
- Create: `src/hooks/useWindowWidth.js`
- Test: `src/lib/bigScreen.test.js`

**Interfaces:**
- Consumes: nothing from the codebase (pure); the hook consumes React's `useSyncExternalStore`, the same pattern as `src/hooks/useMediaQuery.js`.
- Produces: `bigScreen(width) → { rule: number, gapColumn: number, readout: string, history: number, boardTicks: boolean, readoutTicks: boolean, contentMax: number | null }`; `BIG_SCREEN_BASE` (frozen, equals `bigScreen(0)`); `GAP_COLUMN_EXTRA = 80`; `CONTENT_MAX = 2560`; `ruleTicks(scale = 2) → [{ pct, position, left, label }]` (seven, negative to positive; `position` is the signed percent of the half track, `left` the percent of the full track, `label` like `'−0.5%'` or `'0'`); `useWindowWidth() → number` (0 without a window).

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/bigScreen.test.js
import { describe, it, expect } from 'vitest'
import { bigScreen, ruleTicks, BIG_SCREEN_BASE, GAP_COLUMN_EXTRA, CONTENT_MAX } from './bigScreen'

const BASE = {
  rule: 144, gapColumn: 224, readout: 'min(560px, 39vw)', history: 164,
  boardTicks: false, readoutTicks: false, contentMax: null,
}

describe('bigScreen', () => {
  it("keeps today's layout below 1440, and for a missing width", () => {
    expect(bigScreen(1024)).toEqual(BASE)
    expect(bigScreen(1439)).toEqual(BASE)
    expect(bigScreen(0)).toEqual(BASE)
    expect(bigScreen(undefined)).toEqual(BASE)
    expect(bigScreen(NaN)).toEqual(BASE)
    expect(BIG_SCREEN_BASE).toEqual(BASE)
    expect(Object.isFrozen(BIG_SCREEN_BASE)).toBe(true)
  })

  it('1440 to 1679: the rule grows to 240, the Readout pins at 560, the history stays 164', () => {
    const b = { rule: 240, gapColumn: 320, readout: '560px', history: 164, boardTicks: false, readoutTicks: true, contentMax: null }
    expect(bigScreen(1440)).toEqual(b)
    expect(bigScreen(1679)).toEqual(b)
  })

  it('1680 to 1919: rule 400, history 220, and the Board header gains its ticks', () => {
    const b = { rule: 400, gapColumn: 480, readout: '560px', history: 220, boardTicks: true, readoutTicks: true, contentMax: null }
    expect(bigScreen(1680)).toEqual(b)
    expect(bigScreen(1919)).toEqual(b)
  })

  it('1920 to 2559: rule 560, Readout 640, history 260', () => {
    const b = { rule: 560, gapColumn: 640, readout: '640px', history: 260, boardTicks: true, readoutTicks: true, contentMax: null }
    expect(bigScreen(1920)).toEqual(b)
    expect(bigScreen(2559)).toEqual(b)
  })

  it('2560 and up: the rule caps at 560, Readout 800, history 320, and the shell centres in 2560', () => {
    const b = { rule: 560, gapColumn: 640, readout: '800px', history: 320, boardTicks: true, readoutTicks: true, contentMax: 2560 }
    expect(bigScreen(2560)).toEqual(b)
    expect(bigScreen(3440)).toEqual(b)
    expect(CONTENT_MAX).toBe(2560)
  })

  it('the gap column is the rule plus the 12 px gap, the 56 px label and 12 px trailing', () => {
    expect(GAP_COLUMN_EXTRA).toBe(80)
    for (const w of [1024, 1440, 1680, 1920, 2560]) {
      expect(bigScreen(w).gapColumn).toBe(bigScreen(w).rule + 80)
    }
  })

  it('leaves the company column its 160 px minimum at every named width', () => {
    // Board grid: company · 120 · gap · 104 · 80 · 24 inside 24 px gutters,
    // beside the Readout and its 1 px border. The arithmetic of spec §2.1.
    const fixed = (b) => 120 + b.gapColumn + 104 + 80 + 24 + 48 + 1
    const readoutPx = { 1440: 560, 1680: 560, 1920: 640, 2560: 800 }
    for (const [w, r] of Object.entries(readoutPx)) {
      const b = bigScreen(Number(w))
      expect(Number(w) - r - fixed(b)).toBeGreaterThanOrEqual(160)
    }
  })
})

describe('ruleTicks', () => {
  it("has seven labels at the square-root scale's real positions", () => {
    const t = ruleTicks()
    expect(t.map((x) => x.pct)).toEqual([-2, -1, -0.5, 0, 0.5, 1, 2])
    expect(t.map((x) => x.label)).toEqual(['−2%', '−1%', '−0.5%', '0', '+0.5%', '+1%', '+2%'])
    const positions = t.map((x) => x.position)
    ;[-100, -70.71, -50, 0, 50, 70.71, 100].forEach((p, i) => expect(positions[i]).toBeCloseTo(p, 1))
    const lefts = t.map((x) => x.left)
    ;[0, 14.645, 25, 50, 75, 85.355, 100].forEach((l, i) => expect(lefts[i]).toBeCloseTo(l, 2))
  })

  it('uses a true minus sign, never a hyphen', () => {
    for (const x of ruleTicks()) expect(x.label).not.toMatch(/-/)
  })

  it('follows the scale', () => {
    const t = ruleTicks(4)
    expect(t.map((x) => x.pct)).toEqual([-4, -2, -1, 0, 1, 2, 4])
    expect(t.map((x) => x.label)).toEqual(['−4%', '−2%', '−1%', '0', '+1%', '+2%', '+4%'])
    expect(t[1].position).toBeCloseTo(-70.71, 1)
    expect(t[5].left).toBeCloseTo(85.355, 2)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/bigScreen.test.js`
Expected: FAIL, `Failed to load url ./bigScreen` (the module does not exist).

- [ ] **Step 3: Write the module and the hook**

```js
// src/lib/bigScreen.js
// Big-screen widths for the Meter (spec 2026-09-15 §2): the only three
// things that scale with the window are the Board's gap rule, the Readout's
// width and the gap history's height. One pure function decides all three
// so the Board, the Readout and the shell can never disagree; the shell
// measures window.innerWidth (hooks/useWindowWidth) and passes the result
// down as a prop. Components never read the window themselves.
//
// Bands (window width → rule / Readout track / history height):
//   1024–1439  144  min(560px, 39vw)  164   today, unchanged
//   1440–1679  240  560px             164
//   1680–1919  400  560px             220
//   1920–2559  560  640px             260
//   2560 up    560  800px             320   and the shell centres in 2560

/** The Board's gap track is the rule plus 12 px gap, the 56 px signed label and 12 px trailing (Board.jsx). */
export const GAP_COLUMN_EXTRA = 80
/** Past this the shell centres with plain page-background margins (spec §2.4). */
export const CONTENT_MAX = 2560

const BASE_READOUT = 'min(560px, 39vw)'

const BANDS = [
  { min: 2560, rule: 560, readout: '800px', history: 320, contentMax: CONTENT_MAX },
  { min: 1920, rule: 560, readout: '640px', history: 260, contentMax: null },
  { min: 1680, rule: 400, readout: '560px', history: 220, contentMax: null },
  { min: 1440, rule: 240, readout: '560px', history: 164, contentMax: null },
  { min: 0, rule: 144, readout: BASE_READOUT, history: 164, contentMax: null },
]

/**
 * bigScreen(width) → { rule, gapColumn, readout, history, boardTicks, readoutTicks, contentMax }
 *   rule          px width of the Board's GapBar
 *   gapColumn     px width of the Board's gap grid track (rule + GAP_COLUMN_EXTRA)
 *   readout       the CSS grid track for the Readout column
 *   history       px height of the Readout's gap-history pane
 *   boardTicks    the Board's column header carries the seven tick labels (1680 up)
 *   readoutTicks  the Readout's rule carries the seven tick labels (1440 up)
 *   contentMax    px max-width for the shell, or null below 2560
 * A missing or non-finite width is the base band.
 */
export function bigScreen(width) {
  const w = Number.isFinite(width) ? width : 0
  const band = BANDS.find((b) => w >= b.min)
  return {
    rule: band.rule,
    gapColumn: band.rule + GAP_COLUMN_EXTRA,
    readout: band.readout,
    history: band.history,
    boardTicks: w >= 1680,
    readoutTicks: w >= 1440,
    contentMax: band.contentMax,
  }
}

/** Today's layout, for a Board or Readout rendered without a measured width. */
export const BIG_SCREEN_BASE = Object.freeze(bigScreen(0))

const MINUS = '−' // U+2212, the same glyph format.js prints
const TICK_STEPS = [1, 0.5, 0.25]

/**
 * The tick labels that make the rule's square-root scale legible (spec §2.2).
 * GapBar fills sqrt(|pct| / scale) of the half track, so ±scale sits at the
 * ends, ±scale/2 at 70.7 % of the half track and ±scale/4 at 50 %. Seven
 * ticks, negative to positive:
 *   { pct, position, left, label }
 *   position  signed percent of the HALF track (−100 … 100), as the spec states it
 *   left      percent of the FULL track (0 … 100), what a CSS `left` needs
 *   label     '−2%' … '0' … '+2%': a true minus sign, no trailing zeros
 */
export function ruleTicks(scale = 2) {
  const tick = (pct) => {
    const position = pct === 0 ? 0 : Math.sign(pct) * Math.sqrt(Math.abs(pct) / scale) * 100
    const label = pct === 0 ? '0' : `${pct < 0 ? MINUS : '+'}${Math.abs(pct)}%`
    return { pct, position, left: 50 + position / 2, label }
  }
  const magnitudes = TICK_STEPS.map((s) => scale * s) // [2, 1, 0.5] at the default scale
  return [...magnitudes.map((m) => -m), 0, ...magnitudes.slice().reverse()].map(tick)
}
```

```js
// src/hooks/useWindowWidth.js
import { useSyncExternalStore } from 'react'

/**
 * window.innerWidth as state, kept live on 'resize': the one measurement the
 * Meter shell takes so lib/bigScreen can size the Board's rule, the Readout
 * and the gap history (spec 2026-09-15 §2.1). Components receive the result
 * as props and never read the window themselves. 0 where window is
 * undefined, which bigScreen reads as the base band.
 */
export function useWindowWidth() {
  return useSyncExternalStore(subscribe, getWidth, () => 0)
}

function subscribe(onChange) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function getWidth() {
  return typeof window === 'undefined' ? 0 : window.innerWidth
}

export default useWindowWidth
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/bigScreen.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Lint and the whole suite**

Run: `npx oxlint` then `npx vitest run`
Expected: oxlint 18 warnings / 0 errors (the baseline, none new); vitest 425 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/bigScreen.js src/lib/bigScreen.test.js src/hooks/useWindowWidth.js
printf 'Big screen widths: bigScreen, ruleTicks, useWindowWidth\n\nOne pure function for the rule, the gap column, the Readout track, the\nhistory height and the 2560 content max, tested at every band edge; the\nseven sqrt-scale tick labels with their positions; the shell'"'"'s one window\nmeasurement as a hook.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 2: `RuleTicks.jsx` and the Board's `big` prop

**Files:**
- Create: `src/components/desktop/RuleTicks.jsx`
- Modify: `src/components/desktop/Board.jsx` (lines 20–31 the comment and `GRID`; line 37 the signature; lines 203–213 the header; lines 256, 272, 310, 331 the grid and bar widths)

**Interfaces:**
- Consumes: `ruleTicks`, `BIG_SCREEN_BASE` from `src/lib/bigScreen.js` (Task 1); `GapBar` from `src/components/shared.jsx` (unchanged: `width` accepts a number or a CSS string).
- Produces: `RuleTicks({ width })` (a `span` of seven positioned labels; `width` is a number of pixels or `'100%'`); `Board` accepts `big` (a `bigScreen` result, default `BIG_SCREEN_BASE`) and reads `big.rule`, `big.gapColumn`, `big.boardTicks`.

- [ ] **Step 1: Write `RuleTicks.jsx`**

```jsx
// src/components/desktop/RuleTicks.jsx
import { ruleTicks } from '../../lib/bigScreen'

/*
 * The seven labels along a GapBar that make its square-root scale legible
 * (spec 2026-09-15 §2.2): −2 −1 −0.5 0 +0.5 +1 +2 percent at the scale's
 * real positions. 11 px tabular figures in the rule-label grey (zinc-500,
 * oklch(0.62 0.009 250)). The end labels hang inside the track's ends; the
 * inner ones are centred on their tick. `width` is the track's width: a
 * number of pixels on the Board, '100%' in the Readout. Decorative: the
 * figure is always printed beside the bar.
 */
const TICKS = ruleTicks()

export default function RuleTicks({ width }) {
  return (
    <span className="num relative block h-3 text-[11px] leading-3 text-zinc-500" style={{ width }} aria-hidden="true">
      {TICKS.map((t) => (
        <span
          key={t.pct}
          className="absolute top-0"
          style={
            t.left === 0
              ? { left: 0 }
              : t.left === 100
                ? { right: 0 }
                : { left: `${t.left}%`, transform: 'translateX(-50%)' }
          }
        >
          {t.label}
        </span>
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Give the Board its `big` prop**

In `src/components/desktop/Board.jsx`, replace the column-grid comment and constant (lines 28–31):

```js
 * Column grid: company flexes (min 160px) · share 120 · gap (the rule plus
 * 80: 12 gap, the 56 px signed label, 12 trailing; 224 at 1440 and below,
 * lib/bigScreen.js decides above that) · wrappers 104 · cheapest 80 ·
 * chevron 24, inside 24 px gutters.
 */
const gridFor = (gapColumn) => `minmax(160px, 1fr) 120px ${gapColumn}px 104px 80px 24px`
```

Add the imports after line 15 (`import { GapBar } from '../shared'`):

```js
import { BIG_SCREEN_BASE } from '../../lib/bigScreen'
import RuleTicks from './RuleTicks'
```

Change the signature (line 37):

```js
export default function Board({ selectedId, onSelect, actionsRef, lens, onLens, big = BIG_SCREEN_BASE }) {
```

Directly after `const activeSort = …` (line 162) add:

```js
  const grid = gridFor(big.gapColumn)
```

Replace every `gridTemplateColumns: GRID` (three places: the header at line 205, the company row at line 256, the wrapper row at line 310) with `gridTemplateColumns: grid`.

Replace both `width={144}` on `GapBar` (lines 272 and 331) with `width={big.rule}`.

Replace the header's third cell (line 209):

```jsx
        {big.boardTicks ? (
          <div className="flex flex-col gap-1">
            <span className="t-micro text-zinc-500">Gap vs share · widest wrapper</span>
            <RuleTicks width={big.rule} />
          </div>
        ) : (
          <span className="t-micro text-zinc-500">Gap vs share · widest wrapper</span>
        )}
```

(The label is 11 px at line-height 1.2, 4 px gap, 12 px ticks: 29 px inside the 32 px `h-8` row, which keeps `items-center`.)

- [ ] **Step 3: Confirm nothing else reads `GRID`**

Run: `grep -n "GRID\b" src/components/desktop/Board.jsx`
Expected: no matches.

- [ ] **Step 4: Lint, tests, and a render check**

Run: `npx oxlint` then `npx vitest run`
Expected: baseline warnings only; 425 passed.

Start the preview (`preview_start` with `blockwatch-dev`) at 1440×900 and confirm the Board still renders with 144 px bars and no header ticks (the shell passes nothing yet, so `BIG_SCREEN_BASE` applies): via `javascript_tool`, `document.querySelector('[aria-label="Gap Board"] [data-gapbar]').getBoundingClientRect().width` is `144`, and `read_console_messages` with `onlyErrors` shows nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/components/desktop/RuleTicks.jsx src/components/desktop/Board.jsx
printf 'Board: gap rule and header ticks from a big prop\n\nThe grid'"'"'s gap track and both GapBar widths come from bigScreen; from\n1680 the column header carries the seven sqrt-scale labels under its\ntitle and stays 32 px. RuleTicks is the shared label row.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 3: The Readout's `big` prop and the percentile line

**Files:**
- Modify: `src/components/desktop/Readout.jsx` (line 16 imports; line 40 signature; lines 128–133 the rule labels; line 170 the history height; line 198 the percentile line)

**Interfaces:**
- Consumes: `BIG_SCREEN_BASE` from `src/lib/bigScreen.js` (Task 1); `RuleTicks` from `./RuleTicks` (Task 2); `percentileCaption`, `gapPercentile` from `src/lib/reading.js` (unchanged).
- Produces: `Readout` accepts `big` (default `BIG_SCREEN_BASE`) and reads `big.history`, `big.readoutTicks`. Its width is the shell's business (Task 4): the section is already `100%` of its `aside`.

- [ ] **Step 1: Imports and signature**

After line 16 (`import { GapBar } from '../shared'`) add:

```js
import { BIG_SCREEN_BASE } from '../../lib/bigScreen'
import RuleTicks from './RuleTicks'
```

Change line 40:

```js
export default function Readout({ assetId, onSelectAsset, onOpenChart, sheet, onSheet, big = BIG_SCREEN_BASE }) {
```

- [ ] **Step 2: The rule labels and the percentile line under the reading**

Replace lines 129–133 (the three-label `div`) with:

```jsx
        {big.readoutTicks ? (
          <RuleTicks width="100%" />
        ) : (
          <div className="num flex justify-between text-[11px] text-zinc-500">
            <span>−2%</span>
            <span>0</span>
            <span>+2%</span>
          </div>
        )}
        {/* The percentile sits under the number it describes (spec 2026-09-15
            §3.2), not three sections down under the history pane. */}
        {percentileLine && <p className="t-caption text-zinc-500">{percentileLine}</p>}
```

- [ ] **Step 3: The history height, and the duplicate caption gone**

Line 170: `style={{ height: 164 }}` becomes `style={{ height: big.history }}`.

Delete line 198 (`{percentileLine && <p className="t-caption text-zinc-500">{percentileLine}</p>}`) from the history block, so the range words are the last thing in it.

- [ ] **Step 4: Confirm the caption renders once**

Run: `grep -n "percentileLine" src/components/desktop/Readout.jsx`
Expected: exactly two lines: its definition (`const percentileLine = …`) and the one render under the rule.

- [ ] **Step 5: Lint, tests, render check**

Run: `npx oxlint` then `npx vitest run`
Expected: baseline warnings only; 425 passed.

In the preview at 1440×900 with an asset selected: `read_page` shows the "Wider than …" or "Narrower than …" sentence immediately after the rule and before the "Token …" leg line, and not after the range words; the history pane is still 164 px (`document.querySelector('[aria-label$="readout"] .flex.flex-col[style*="height"]').getBoundingClientRect().height` is `164`); the rule labels are still three (the shell passes nothing yet).

- [ ] **Step 6: Commit**

```bash
git add src/components/desktop/Readout.jsx
printf 'Readout: history height and rule labels from a big prop; percentile under the reading\n\nThe gap history takes its height from bigScreen; from 1440 the rule\ncarries the seven tick labels. The percentile caption moves to directly\nunder the reading and the rule, above the legs, and leaves the history\npane, which keeps its range words.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 4: The shell measures the window

**Files:**
- Modify: `src/components/desktop/MeterShell.jsx` (lines 5–6 imports; after line 50 the measurement; line 212 the inner grid; lines 214 and 222 the props; lines 253–256 the outer grid)

**Interfaces:**
- Consumes: `useWindowWidth` from `src/hooks/useWindowWidth.js` and `bigScreen` from `src/lib/bigScreen.js` (Task 1); `Board`'s and `Readout`'s `big` prop (Tasks 2, 3).
- Produces: the one place `big` is computed. Later tasks add nothing to the grid.

- [ ] **Step 1: Imports and the measurement**

After line 6 (`import { useMeterShortcuts } …`) add:

```js
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { bigScreen } from '../../lib/bigScreen'
```

After line 50 (`const asset = useAsset(assetId)`) add:

```js
  // The one window measurement (spec 2026-09-15 §2.1): bigScreen sizes the
  // Board's rule, the Readout column and the gap history from it, and the
  // shell hands the result down. Memoised on the width so a price re-render
  // does not hand the children a fresh object.
  const width = useWindowWidth()
  const big = useMemo(() => bigScreen(width), [width])
```

- [ ] **Step 2: The inner grid and the props**

Line 212, the inner grid's style, becomes a template literal:

```jsx
        <div hidden={chartShown} className="grid min-h-0" style={{ gridTemplateColumns: `minmax(0, 1fr) ${big.readout}` }}>
```

Line 214: add `big={big}` to `<Board … />`.

Lines 222–228: add `big={big}` to `<Readout … />` (after `onSheet={setSheet}`).

- [ ] **Step 3: The 2560 content max**

Lines 253–256, the outer `div`:

```jsx
    <div
      className="grid h-dvh w-full overflow-hidden"
      style={{
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: fullscreen ? '0px 1fr' : '56px 1fr',
        // Past 2560 the Meter centres with plain page-background margins and
        // no border; the masthead inside spans the content max (spec §2.4).
        maxWidth: big.contentMax ?? undefined,
        marginInline: big.contentMax == null ? undefined : 'auto',
      }}
    >
```

- [ ] **Step 4: Lint, tests, and the arithmetic live**

Run: `npx oxlint` then `npx vitest run`
Expected: baseline warnings only; 425 passed.

In the preview, via `resize_window` with custom sizes then `javascript_tool`:

```js
(() => {
  const bar = document.querySelector('[aria-label="Gap Board"] [data-gapbar]')
  const aside = document.querySelector('[aria-label="Gap Board"]').closest('main').nextElementSibling
  const hist = document.querySelector('[aria-label$="readout"] .flex.flex-col[style*="height"]')
  const root = document.querySelector('.h-dvh')
  const header = document.querySelector('[aria-label="Gap Board"] .grid.h-8')
  return {
    w: innerWidth,
    rule: Math.round(bar.getBoundingClientRect().width),
    readout: Math.round(aside.getBoundingClientRect().width),
    history: hist && Math.round(hist.getBoundingClientRect().height),
    ticksInHeader: header.querySelectorAll('.num.relative span').length,
    ticksInReadout: document.querySelector('[aria-label$="readout"] .num.relative') ? 7 : 3,
    rootLeft: Math.round(root.getBoundingClientRect().left),
    rootWidth: Math.round(root.getBoundingClientRect().width),
    headerH: Math.round(header.getBoundingClientRect().height),
    hscroll: document.documentElement.scrollWidth > innerWidth,
  }
})()
```

Expected per width (the Readout's width includes its 1 px border):

| Window | rule | readout | history | ticksInHeader | ticksInReadout | rootLeft | rootWidth | headerH | hscroll |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 240 | 560 | 164 | 0 | 7 | 0 | 1440 | 32 | false |
| 1680×1050 | 400 | 560 | 220 | 7 | 7 | 0 | 1680 | 32 | false |
| 1920×1080 | 560 | 640 | 260 | 7 | 7 | 0 | 1920 | 32 | false |
| 2560×1080 | 560 | 800 | 320 | 7 | 7 | 0 | 2560 | 32 | false |
| 3440×1440 | 560 | 800 | 320 | 7 | 7 | 440 | 2560 | 32 | false |
| 1280×800 | 144 | 499 | 164 | 0 | 3 | 0 | 1280 | 32 | false |

If the pane scales a viewport wider than itself, `innerWidth` still reports the emulated width; read `w` first.

- [ ] **Step 5: Commit**

```bash
git add src/components/desktop/MeterShell.jsx
printf 'Meter shell: grid columns from bigScreen, the 2560 content max\n\nThe shell measures window.innerWidth once (useWindowWidth), sizes the\nReadout column from bigScreen and hands the same result to the Board and\nthe Readout. From 2560 the outer grid caps at 2560 and centres with plain\npage-background margins; the masthead spans the content max.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 5: The masthead names the widest gap during the open session

**Files:**
- Modify: `src/lib/sessionCopy.js` (lines 37–59)
- Modify: `src/lib/sessionCopy.test.js` (line 2 import; lines 47–49 the regular-hours test; new tests)
- Modify: `src/components/desktop/Masthead.jsx` (lines 4, 13–14, 27, 65)

**Interfaces:**
- Consumes: `premiumPct`, `isThinlyTraded` from `src/lib/prices.js` (unchanged).
- Produces: `widestCredibleGap(assets, session, { includeRegular = false } = {}) → { asset, p } | null`; `widestGapLabel(session) → 'Widest gap right now' | 'Widest gap'`. The phone Home calls `widestCredibleGap(assets, session)` with no options and is unchanged.

- [ ] **Step 1: Write the failing tests**

In `src/lib/sessionCopy.test.js`, change line 2 to import the label too:

```js
import { SESSION_DOT, SESSION_NOTE, SESSION_SHORT, widestCredibleGap, widestGapLabel } from './sessionCopy'
```

Replace the first `widestCredibleGap` test (lines 47–49) with:

```js
  it('is null during regular hours by default, whatever the gaps', () => {
    expect(widestCredibleGap([liquid('ax', 110, 100)], 'regular')).toBeNull()
    expect(widestCredibleGap([liquid('ax', 101, 100)], 'regular', {})).toBeNull()
    expect(widestCredibleGap([liquid('ax', 101, 100)], 'regular', { includeRegular: false })).toBeNull()
  })

  it('names the widest gap in regular hours when asked, inside the pre/post 5% band', () => {
    const assets = [liquid('ax', 101, 100), liquid('bx', 96, 100), liquid('cx', 110, 100)]
    const top = widestCredibleGap(assets, 'regular', { includeRegular: true })
    expect(top.asset.id).toBe('bx')
    expect(top.p).toBeCloseTo(-4)
    expect(widestCredibleGap([liquid('cx', 110, 100)], 'regular', { includeRegular: true })).toBeNull()
  })

  it('keeps the floor and the thin-market exclusion in regular hours', () => {
    const thin = liquid('ax', 104, 100, { volume24h: THIN_VOLUME_USD / 2 })
    expect(widestCredibleGap([liquid('bx', 100.1, 100)], 'regular', { includeRegular: true })).toBeNull()
    expect(widestCredibleGap([thin], 'regular', { includeRegular: true })).toBeNull()
    expect(widestCredibleGap([thin, liquid('cx', 100.2, 100)], 'regular', { includeRegular: true })?.asset.id).toBe('cx')
  })

  it('leaves the shut-market sessions exactly as before with the option on', () => {
    const wide = liquid('ax', 110, 100)
    const huge = liquid('bx', 130, 100)
    expect(widestCredibleGap([wide, huge], 'closed', { includeRegular: true })?.asset.id).toBe('ax')
    expect(widestCredibleGap([wide, huge], 'pre', { includeRegular: true })).toBeNull()
  })
```

Add at the end of the file:

```js
describe('widestGapLabel', () => {
  it('says the number is live only in regular hours', () => {
    expect(widestGapLabel('regular')).toBe('Widest gap right now')
    for (const s of ['pre', 'post', 'closed']) expect(widestGapLabel(s)).toBe('Widest gap')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/sessionCopy.test.js`
Expected: FAIL: `widestGapLabel is not a function`, and the `includeRegular: true` cases return null.

- [ ] **Step 3: The option and the label**

Replace lines 37–59 of `src/lib/sessionCopy.js` with:

```js
/**
 * The "Widest gap" candidate, or null. Same rule as Home's session line:
 * liquid tokens only, a gap of at least 0.15% so parity noise never wins,
 * and a sanity band — no real tokenized stock drifts 20% overnight, so
 * bigger gaps are stale prints on illiquid tokens. In pre/post the band
 * tightens to 5%, because a third source of big numbers appears: the stock
 * itself moving while our quote sits at the close. We cannot tell that
 * apart from a genuine premium, and naming a "widest gap" is a claim.
 *
 * Regular hours are null by default: on the phone Home every open-market
 * gap is a real spread and the pill was a story for the shut market. The
 * desktop masthead wants the opposite (spec 2026-09-15 §3.1) — during the
 * open session the number is most trustworthy, so it passes
 * `includeRegular: true` and gets the widest gap inside the 5% band.
 *
 * Returns { asset, p } (p = the gap in %) or null.
 */
export function widestCredibleGap(assets, session, { includeRegular = false } = {}) {
  if (session === 'regular' && !includeRegular) return null
  const bound = session === 'closed' ? 20 : 5
  const candidates = (assets ?? [])
    .filter((a) => !isThinlyTraded(a))
    .map((a) => ({ asset: a, p: premiumPct(a) }))
    .filter((x) => x.p != null && Math.abs(x.p) >= 0.15 && Math.abs(x.p) <= bound)
  return candidates.length
    ? candidates.reduce((m, x) => (Math.abs(x.p) > Math.abs(m.p) ? x : m))
    : null
}

/** The masthead pill's label: in the open session it says the number is live. */
export function widestGapLabel(session) {
  return session === 'regular' ? 'Widest gap right now' : 'Widest gap'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/sessionCopy.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: The masthead**

In `src/components/desktop/Masthead.jsx`, line 4:

```js
import { SESSION_DOT, SESSION_NOTE, widestCredibleGap, widestGapLabel } from '../../lib/sessionCopy'
```

Lines 13–14 of the comment: replace "the widest / credible gap while the market is shut" with "the widest credible gap, named during the open session too (spec 2026-09-15 §3.1)".

Line 27:

```js
  const top = widestCredibleGap(assets, session, { includeRegular: true })
```

Line 65:

```jsx
          <span className="text-zinc-500">{widestGapLabel(session)} · </span>
```

- [ ] **Step 6: Lint, tests, render check**

Run: `npx oxlint` then `npx vitest run`
Expected: baseline warnings only; 429 passed.

In the preview at 1440×900: `read_page` lists a button whose text starts "Widest gap right now · " during regular hours (09:30–16:00 ET on a weekday) or "Widest gap · " otherwise, followed by a ticker and a signed percent. If no asset clears the 0.15 % floor the pill is absent; that is correct, not a failure.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sessionCopy.js src/lib/sessionCopy.test.js src/components/desktop/Masthead.jsx
printf 'Masthead names the widest gap during the open session\n\nwidestCredibleGap gains includeRegular (default false, so the phone Home\nis unchanged) with the pre/post 5%% band, the 0.15%% floor and the thin\nexclusion; widestGapLabel says "right now" only in regular hours. The\nmasthead passes the option and reads the label.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 6: `meterHeadline` and the pure `alertNotify.js`

**Files:**
- Modify: `src/lib/pageTitle.js` (lines 71–76)
- Modify: `src/lib/pageTitle.test.js` (import; new tests)
- Create: `src/lib/alertNotify.js`
- Test: `src/lib/alertNotify.test.js`

**Interfaces:**
- Consumes: `signedPct`, `boardTitle` (in `pageTitle.js`); `formatPct`, `formatPrice` from `src/lib/format.js`; the event shape `AlertsProvider` appends (`src/state/AlertsContext.jsx` lines 197–207 and 224–234): drift `{ id, kind: 'alert', type: 'drift', assetId, ticker, underlying, premium, threshold, at }`, price `{ id, kind: 'alert', type: 'price', assetId, ticker, target, direction, price, at }`.
- Produces: `meterHeadline({ ticker, gapPct }) → 'NVDAx +1.42% gap' | 'NVDAx' | null`; `meterTitle` unchanged in output; `NOTIFY_KEY = 'bw.meter.notify.v1'`; `alertNotification(event) → { title, body, tag }`; `unseenEvents(events, sinceAt) → event[]` oldest first; `notifyOfferVisible({ permission, saved }) → boolean`; `shouldPost({ permission, hidden, focused }) → boolean`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/pageTitle.test.js`, add `meterHeadline` to the import from `./pageTitle` (keep every existing name) and append:

```js
describe('meterHeadline', () => {
  it('is the wrapper and its gap, without the product', () => {
    expect(meterHeadline({ ticker: 'NVDAx', gapPct: 1.42 })).toBe('NVDAx +1.42% gap')
    expect(meterHeadline({ ticker: 'NVDAx', gapPct: -0.31 })).toBe('NVDAx −0.31% gap')
    expect(meterHeadline({ ticker: 'NVDAx', gapPct: 0 })).toBe('NVDAx 0% gap')
    expect(meterHeadline({ ticker: 'NVDAx' })).toBe('NVDAx')
    expect(meterHeadline({})).toBeNull()
  })

  it('is what meterTitle says before the product', () => {
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 1.42 })).toBe('NVDAx +1.42% gap · OnStock')
    expect(meterTitle({ ticker: 'NVDAx' })).toBe('NVDAx · OnStock')
    expect(meterTitle({})).toBe('Board · OnStock')
  })
})
```

```js
// src/lib/alertNotify.test.js
import { describe, it, expect } from 'vitest'
import { NOTIFY_KEY, alertNotification, unseenEvents, notifyOfferVisible, shouldPost } from './alertNotify'

const DRIFT = {
  id: 'nvdax-d-1', kind: 'alert', type: 'drift', assetId: 'nvdax', ticker: 'NVDAx', underlying: 'NVDA',
  premium: 1.42, threshold: 1, at: 1000,
}
const PRICE = {
  id: 'nvdax-p-2', kind: 'alert', type: 'price', assetId: 'nvdax', ticker: 'NVDAx',
  target: 220, direction: 'above', price: 220.5, at: 2000,
}

describe('alertNotification', () => {
  it('titles a drift with the Meter headline and says what crossed', () => {
    expect(alertNotification(DRIFT)).toEqual({
      title: 'NVDAx +1.42% gap',
      body: 'NVDAx drifted +1.42% from NVDA. Crossed your ±1% drift alert.',
      tag: 'nvdax',
    })
    expect(alertNotification({ ...DRIFT, premium: -0.31, threshold: 0.5 })).toEqual({
      title: 'NVDAx −0.31% gap',
      body: 'NVDAx drifted −0.31% from NVDA. Crossed your ±0.5% drift alert.',
      tag: 'nvdax',
    })
  })

  it('titles a price target with the crossing and says where it trades', () => {
    expect(alertNotification(PRICE)).toEqual({
      title: 'NVDAx crossed $220.00',
      body: 'Your price target hit — trading at $220.50.',
      tag: 'nvdax',
    })
  })

  it('tags by asset so repeats collapse', () => {
    expect(alertNotification(DRIFT).tag).toBe(alertNotification(PRICE).tag)
    expect(alertNotification({ ...DRIFT, assetId: 'tslax' }).tag).toBe('tslax')
  })
})

describe('unseenEvents', () => {
  const events = [{ at: 3 }, { at: 2 }, { at: 1 }] // AlertsContext keeps newest first
  it('returns the events after the cursor, oldest first', () => {
    expect(unseenEvents(events, 1)).toEqual([{ at: 2 }, { at: 3 }])
    expect(unseenEvents(events, 0)).toEqual([{ at: 1 }, { at: 2 }, { at: 3 }])
  })
  it('is empty at or past the newest, and for no events', () => {
    expect(unseenEvents(events, 3)).toEqual([])
    expect(unseenEvents(events, 99)).toEqual([])
    expect(unseenEvents([], 0)).toEqual([])
    expect(unseenEvents(undefined, 0)).toEqual([])
  })
  it('does not mutate the list', () => {
    const copy = [...events]
    unseenEvents(events, 0)
    expect(events).toEqual(copy)
  })
})

describe('notifyOfferVisible', () => {
  it('offers only while the browser has not been asked and the app has not been told no', () => {
    expect(notifyOfferVisible({ permission: 'default', saved: null })).toBe(true)
    expect(notifyOfferVisible({ permission: 'default', saved: undefined })).toBe(true)
    expect(notifyOfferVisible({ permission: 'default', saved: 'declined' })).toBe(false)
    expect(notifyOfferVisible({ permission: 'granted', saved: null })).toBe(false)
    expect(notifyOfferVisible({ permission: 'denied', saved: null })).toBe(false)
    expect(notifyOfferVisible({ permission: null, saved: null })).toBe(false)
  })
  it('asks again when the browser forgot a grant this app remembers', () => {
    expect(notifyOfferVisible({ permission: 'default', saved: 'on' })).toBe(true)
  })
})

describe('shouldPost', () => {
  it('posts only when granted and the reader is not looking at the tab', () => {
    expect(shouldPost({ permission: 'granted', hidden: true, focused: false })).toBe(true)
    expect(shouldPost({ permission: 'granted', hidden: false, focused: false })).toBe(true)
    expect(shouldPost({ permission: 'granted', hidden: false, focused: true })).toBe(false)
    expect(shouldPost({ permission: 'default', hidden: true, focused: false })).toBe(false)
    expect(shouldPost({ permission: 'denied', hidden: true, focused: false })).toBe(false)
  })
})

describe('NOTIFY_KEY', () => {
  it('is a bw.meter key', () => {
    expect(NOTIFY_KEY).toBe('bw.meter.notify.v1')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/pageTitle.test.js src/lib/alertNotify.test.js`
Expected: pageTitle FAIL with `meterHeadline is not a function`; alertNotify FAIL to load `./alertNotify`.

- [ ] **Step 3: `meterHeadline`**

Replace lines 71–76 of `src/lib/pageTitle.js`:

```js
/**
 * The Meter's headline for a wrapper: 'NVDAx +1.42% gap', or the ticker
 * alone without a gap; null without a ticker. The tab title and a system
 * notification's title (lib/alertNotify) are both built from it.
 */
export function meterHeadline({ ticker, gapPct } = {}) {
  if (!ticker) return null
  const pct = signedPct(gapPct)
  return pct == null ? ticker : `${ticker} ${pct} gap`
}

/** The Meter's tab title: the headline, then the product. No triangle. */
export function meterTitle({ ticker, gapPct } = {}) {
  const head = meterHeadline({ ticker, gapPct })
  return head == null ? boardTitle() : `${head} · OnStock`
}
```

- [ ] **Step 4: `alertNotify.js`**

```js
// src/lib/alertNotify.js
// What a fired alert says through the operating system (spec 2026-09-15
// §4.1), and the small rules around it. Pure; hooks/useAlertNotifications
// posts the result and overlays/SetAlertSheet asks the permission.
//
// The words are the News feed's own (screens/News.jsx) so a notification
// and the feed entry it mirrors read the same. News wraps its figures in a
// tabular-figure span, which a notification body cannot carry, so the
// sentence is composed here as plain text rather than lifted from the
// phone screen.

import { formatPct, formatPrice } from './format'
import { meterHeadline } from './pageTitle'

/** The answer to the one-time ask: 'on' | 'declined'; absent = never asked. */
export const NOTIFY_KEY = 'bw.meter.notify.v1'

/**
 * alertNotification(event) → { title, body, tag }
 *   drift  title 'NVDAx +1.42% gap' (the Meter headline, no product suffix)
 *          body  'NVDAx drifted +1.42% from NVDA. Crossed your ±1% drift alert.'
 *   price  title 'NVDAx crossed $220.00'
 *          body  'Your price target hit — trading at $220.50.'
 * `tag` is the asset id, so repeats for one wrapper collapse into one.
 */
export function alertNotification(event) {
  if (event.type === 'price') {
    return {
      title: `${event.ticker} crossed ${formatPrice(event.target)}`,
      body: `Your price target hit — trading at ${formatPrice(event.price)}.`,
      tag: event.assetId,
    }
  }
  return {
    title: meterHeadline({ ticker: event.ticker, gapPct: event.premium }),
    body: `${event.ticker} drifted ${formatPct(event.premium)} from ${event.underlying}. Crossed your ±${event.threshold}% drift alert.`,
    tag: event.assetId,
  }
}

/** The events newer than `sinceAt`, oldest first. AlertsContext keeps its list newest first. */
export function unseenEvents(events, sinceAt) {
  return (events ?? []).filter((e) => e.at > sinceAt).sort((a, b) => a.at - b.at)
}

/**
 * Whether the alert sheet may show the one-time ask: the browser has not
 * been asked (`permission` is 'default') and this app has not been told no.
 * A remembered 'on' with a browser back at 'default' (site data cleared) is
 * asked again; 'declined' never is.
 */
export function notifyOfferVisible({ permission, saved }) {
  return permission === 'default' && saved !== 'declined'
}

/** Whether a fired alert may post right now: granted, and the reader is not looking at the tab. */
export function shouldPost({ permission, hidden, focused }) {
  return permission === 'granted' && (hidden || !focused)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/pageTitle.test.js src/lib/alertNotify.test.js`
Expected: PASS (pageTitle's existing tests plus 2 new; alertNotify 10).

- [ ] **Step 6: Lint and the whole suite**

Run: `npx oxlint` then `npx vitest run`
Expected: baseline warnings only; 441 passed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pageTitle.js src/lib/pageTitle.test.js src/lib/alertNotify.js src/lib/alertNotify.test.js
printf 'Alert notifications: the words and the rules, pure\n\nmeterHeadline is the tab title without the product, so a notification\ncan carry it. alertNotify composes a drift or price event into title,\nbody and tag (the News feed'"'"'s words), lists the events past a cursor,\nand decides when the sheet may ask and when a fired alert may post.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 7: `useAlertNotifications`, the sheet's one-time ask, and the wiring

**Files:**
- Create: `src/hooks/useAlertNotifications.js`
- Modify: `src/overlays/SetAlertSheet.jsx` (lines 1–5 imports; line 14 signature; before line 87 and before line 141 the offer; a new `NotifyOffer` component at the end)
- Modify: `src/components/desktop/MeterShell.jsx` (imports; the hook call; lines 274 and 276 `notify`)
- Modify: `src/components/desktop/Readout.jsx` (line 256 `notify`)

**Interfaces:**
- Consumes: `useAlerts` from `src/state/AlertsContext.jsx` (`{ events }`, newest first); `alertNotification`, `unseenEvents`, `shouldPost`, `notifyOfferVisible`, `NOTIFY_KEY` from `src/lib/alertNotify.js` (Task 6); `useLocalState` from `src/hooks/useLocalState.js`.
- Produces: `useAlertNotifications()` (no return); `SetAlertSheet` accepts `notify = false`. Nothing later depends on either.

- [ ] **Step 1: The hook**

```js
// src/hooks/useAlertNotifications.js
import { useEffect, useRef } from 'react'
import { useAlerts } from '../state/AlertsContext'
import { alertNotification, unseenEvents, shouldPost } from '../lib/alertNotify'

/**
 * A fired alert becomes one system notification (spec 2026-09-15 §4.1).
 * Mounted once by MeterShell, desktop only. Watches AlertsProvider's events
 * for ones newer than the last it has seen and, when permission is granted
 * and the tab is hidden or unfocused, posts `new Notification(title, {
 * body, tag })`; the tag collapses repeats for one wrapper. With the tab
 * focused nothing posts — the bell dot and the News feed already say it —
 * but the cursor still advances, so a later blur never replays old events.
 *
 * Events already stored when the shell mounts are not replayed: the cursor
 * starts at the newest of them. No service worker, no push: this fires
 * only while a tab is open.
 */
export function useAlertNotifications() {
  const { events } = useAlerts()
  const sinceRef = useRef(null)

  useEffect(() => {
    if (sinceRef.current == null) {
      sinceRef.current = Math.max(0, ...events.map((e) => e.at))
      return
    }
    const fresh = unseenEvents(events, sinceRef.current)
    if (fresh.length === 0) return
    sinceRef.current = fresh[fresh.length - 1].at
    if (typeof Notification === 'undefined' || typeof document === 'undefined') return
    if (!shouldPost({ permission: Notification.permission, hidden: document.hidden, focused: document.hasFocus() })) return
    for (const event of fresh) {
      const { title, body, tag } = alertNotification(event)
      try {
        new Notification(title, { body, tag })
      } catch {
        // an insecure context, or a browser that refuses page-created
        // notifications: the feed and the bell still have it
      }
    }
  }, [events])
}

export default useAlertNotifications
```

- [ ] **Step 2: The sheet's additive `notify` prop**

In `src/overlays/SetAlertSheet.jsx`, after line 5 (`import Sheet, { SheetTitle } …`) add:

```js
import { useLocalState } from '../hooks/useLocalState'
import { NOTIFY_KEY, notifyOfferVisible } from '../lib/alertNotify'
```

Line 14:

```js
export default function SetAlertSheet({ asset, onClose, notify = false }) {
```

Directly before the drift tab's button row (line 87, `<div className="mt-4 flex gap-2">`) insert:

```jsx
          {notify && <NotifyOffer />}
```

Directly before the price tab's button row (line 141, `<div className="mt-3 flex gap-2">`) insert the same line:

```jsx
          {notify && <NotifyOffer />}
```

At the end of the file add:

```jsx
/*
 * The one-time ask for system notifications (spec 2026-09-15 §4.1), desktop
 * only: rendered when the Meter passes `notify`, and then only while the
 * browser has not been asked and this app has not been told no. Granted is
 * remembered as 'on', denied or dismissed as 'declined', in
 * bw.meter.notify.v1. Saving the alert never waits on the answer. A child
 * component so the phone sheet (notify absent) never touches the key.
 */
function NotifyOffer() {
  const [saved, setSaved] = useLocalState(NOTIFY_KEY, null)
  const permission = typeof Notification === 'undefined' ? null : Notification.permission
  if (!notifyOfferVisible({ permission, saved })) return null
  return (
    <div className="mt-4 flex items-center gap-3 px-1">
      <p className="flex-1 text-xs leading-relaxed text-zinc-500">
        Get a system notification when this fires, while OnStock is open in a tab?
      </p>
      <button
        type="button"
        onClick={() => {
          // Older Safari takes a callback and returns undefined; everything
          // current returns a promise. Resolve once either way.
          new Promise((resolve) => {
            const r = Notification.requestPermission(resolve)
            if (r && typeof r.then === 'function') r.then(resolve)
          }).then((result) => setSaved(result === 'granted' ? 'on' : 'declined'))
        }}
        className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-800 active:bg-zinc-800"
      >
        Turn on
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Wire the Meter**

`src/components/desktop/MeterShell.jsx`: after the `useMeterShortcuts` import add

```js
import { useAlertNotifications } from '../../hooks/useAlertNotifications'
```

After the `big` computation from Task 4 add:

```js
  // Fired alerts reach the operating system while a Meter tab is open
  // (spec 2026-09-15 §4.1); the hook decides focus and permission.
  useAlertNotifications()
```

Lines 274 and 276: add `notify` to both `<SetAlertSheet … />` elements, e.g. `<SetAlertSheet asset={asset} onClose={() => setSheet(null)} notify />`.

`src/components/desktop/Readout.jsx` line 256: `<SetAlertSheet asset={asset} onClose={() => onSheet(null)} notify />` (the Readout renders only on the Meter, so it needs no prop of its own).

- [ ] **Step 4: Prove the default path**

Run: `git diff feat/desktop-meter -- src/overlays/SetAlertSheet.jsx`
Read every hunk: the only additions are two imports, `notify = false` in the signature, two `{notify && <NotifyOffer />}` lines (each renders `false`, which React emits as nothing), and the new function below the default export. No existing line is changed or moved. Record the hunk count in the task report.

Run: `grep -rn "SetAlertSheet" src --include=*.jsx | grep -v "overlays/SetAlertSheet.jsx\|desktop/MeterShell.jsx\|desktop/Readout.jsx"`
Expected: `screens/AssetDetail.jsx`, `desktop/AssetNumbers.jsx`, `desktop/ChartWorkspace.jsx` still render it with no `notify`.

- [ ] **Step 5: Lint, tests, and a live check of the ask**

Run: `npx oxlint` then `npx vitest run`
Expected: baseline warnings only; 441 passed.

In the preview at 1440×900 with an asset that has an underlying selected, click the Readout's bell (aria-label "Set alert" or "Alert at …"). Via `javascript_tool`: `Notification.permission` is `'default'` in a fresh pane, so `read_page` shows the paragraph "Get a system notification when this fires, while OnStock is open in a tab?" and a "Turn on" button above "Set drift alert"; switch to "Price target": the same offer sits above "Set price alert". Click "Set drift alert": the sheet closes without waiting on any prompt (the alert saves regardless). Then `localStorage.setItem('bw.meter.notify.v1', JSON.stringify('declined'))`, reopen the sheet: the offer is gone. Remove the key afterwards. `read_console_messages` with `onlyErrors`: nothing new. The Browser pane cannot grant OS permission, so posting is covered by the pure tests, not live.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAlertNotifications.js src/overlays/SetAlertSheet.jsx src/components/desktop/MeterShell.jsx src/components/desktop/Readout.jsx
printf 'Alerts through the operating system on the Meter\n\nuseAlertNotifications, mounted by the shell, posts one notification per\nnew alert event when permission is granted and the tab is hidden or\nunfocused; the cursor advances either way. The alert sheet gains an\nadditive notify prop: the Meter'"'"'s callers pass it and get the one-time\nask above Save, remembered in bw.meter.notify.v1; every phone and Phase 1\ncaller renders exactly today'"'"'s markup.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

---

### Task 8: Live checks at five widths, the phone, lint, build, tests

**Files:** whatever the checks turn up.

Use the Browser pane (`preview_start` with `blockwatch-dev`), never Bash, for the server. `resize_window` takes custom `width`/`height`; a viewport wider than the pane is scaled down, and `innerWidth` still reports the emulated width.

- [ ] **Step 1: The arithmetic of §2.1 at every width.** Run the probe from Task 4 step 4 at 1440×900, 1680×1050, 1920×1080, 2560×1080 and 3440×1440, then at 1280×800, and compare each result against Task 4's table. Additionally at each width: `document.documentElement.scrollWidth <= innerWidth` (no horizontal scroll); the company row height is 56 and the wrapper sub-row 40 (`[data-board-row]` heights); the masthead 56 (`header.getBoundingClientRect().height`).
- [ ] **Step 2: The tick positions.** At 1920×1080, via `javascript_tool`:

```js
(() => {
  const row = document.querySelector('[aria-label="Gap Board"] .grid.h-8 .num.relative')
  const r = row.getBoundingClientRect()
  return [...row.children].map((s) => {
    const b = s.getBoundingClientRect()
    const centre = s.style.right ? r.right : s.style.transform ? b.left + b.width / 2 : r.left
    return [s.textContent, Math.round(((centre - r.left) / r.width) * 1000) / 10]
  })
})()
```

Expected: `[["−2%",0],["−1%",14.6],["−0.5%",25],["0",50],["+0.5%",75],["+1%",85.4],["+2%",100]]` (±0.2). The same probe on `[aria-label$="readout"] .num.relative` gives the same seven at 1440 and up. Confirm visually with one `computer` screenshot at 1920: the labels sit under the header title in the same grey as the Readout's, and a bar with a +1 % gap reaches the "+1%" label.
- [ ] **Step 3: The calm-day copy.** At 1440: the masthead pill reads "Widest gap right now · …" in regular hours or "Widest gap · …" otherwise (or is absent when nothing clears 0.15 %); the Readout's percentile sentence sits under the rule labels and above the "Token …" line; the history block ends with the range words. Switch the range to "Past day": the sentence goes away while the history loads and comes back with "five-minute readings today".
- [ ] **Step 4: 2560 and 3440.** At 3440×1440: the root's left edge is 440 and its width 2560; the area outside it is the page colour with no border (`getComputedStyle(document.body).backgroundColor` equals the root's parent's; no element's right edge exceeds 3000); the masthead's `header` width is 2560. Take one screenshot.
- [ ] **Step 5: The alert ask.** Repeat Task 7 step 5 at 1920. Also open the drill-in (`c`) and click the gap header's bell: the same offer appears in the sheet the shell renders.
- [ ] **Step 6: The phone.** `resize_window` to the `mobile` preset (375×812) and reload. `read_page`: the phone Home renders (TabBar, session sentence, no masthead, no Board). Open an asset, tap its bell: the alert sheet shows "Drift vs …" and "Price target" tabs and NO "Turn on" button. Via `javascript_tool`: `localStorage.getItem('bw.meter.notify.v1')` is `null` (the phone never touched the key). Then the reasoning check: `git diff feat/desktop-meter --stat -- src` lists only `components/desktop/Board.jsx`, `components/desktop/Masthead.jsx`, `components/desktop/MeterShell.jsx`, `components/desktop/Readout.jsx`, `components/desktop/RuleTicks.jsx`, `hooks/useAlertNotifications.js`, `hooks/useWindowWidth.js`, `lib/alertNotify.js` (+ test), `lib/bigScreen.js` (+ test), `lib/pageTitle.js` (+ test), `lib/sessionCopy.js` (+ test), `overlays/SetAlertSheet.jsx`. Of these the phone renders `sessionCopy.js` (default argument path, unchanged output), `pageTitle.js` (phones never call it; `meterTitle` output unchanged by its tests) and `SetAlertSheet.jsx` (Task 7 step 4's hunk review). Everything else is desktop-only or pure.
- [ ] **Step 7: The gates.** `npx oxlint` (18 warnings, 0 errors), `npx vitest run` (441 passed), `npm run build` (succeeds; note the bundle size line for the PR).
- [ ] **Step 8: Fix and commit** whatever the checks found, one commit:

```bash
git add <files>
printf 'Big screen: fixes from the live check at 1440 to 3440\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n' > "$TEMP/c.txt"
git commit -F "$TEMP/c.txt"
```

Keep the 1920 and 3440 screenshots for the PR. `resize_window` back to `desktop` when done.

---

### Task 9: Push and the PR

**Files:** none.

- [ ] **Step 1: Push**

```bash
git push -u origin feat/desktop-big-screen
```

- [ ] **Step 2: Open the PR into `feat/desktop-meter`**

Write the body to `$TEMP/pr.md` and run `gh pr create --base feat/desktop-meter --head feat/desktop-big-screen --title "Big screens and the calm day: the Meter grows its instrument, names the widest gap, notifies through the OS" --body-file "$TEMP/pr.md"`. The body: the one sentence from spec §0; the breakpoint table; the calm-day changes (masthead pill, percentile line); the notification behaviour and its honesty (tab open, no push); the recorded decisions (the title grammar; the pills row is already one row; the ` · ` in the pill; the pre-existing sub-1160 overflow left alone); what waits (pin and compare, dense Board, push, Finnhub budget); the proof (Task 4's table as measured, the tick positions, the phone check, the SetAlertSheet hunk review); the gates (tests, lint, build); the two screenshots. State that it is stacked on PR #10 and lands after it. End with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 3: Do not merge.** Leave PR #10 open. Record the PR URL in the SDD ledger.

---

## Self-review

**Spec coverage:**
- §2.1 table and the one pure function: Task 1 (`bigScreen`, tests at 1439/1440/1679/1680/1919/1920/2559/2560/3440), Task 4 (the shell measures, passes down). The gap track = rule + 80 (the mockup's 640 = 560 + 12 + 56 + 12): Task 1 `GAP_COLUMN_EXTRA`, Task 2 `gridFor`. The company column stays flexible and ≥ 160 at every named width: Task 1's arithmetic test.
- §2.2 tick labels, positions, style, header height, Board from 1680, Readout from 1440: Task 1 `ruleTicks`, Task 2 `RuleTicks` + header, Task 3 Readout; positions measured in Task 8 step 2.
- §2.3 single column; history height and rule width scale; pills and picker on one row at 640 up: Task 3. The pills/picker row is not changed by any task: today's Readout already renders the size pills, a flex spacer and the wrapper chips on one flex row, which is exactly what the 640 px mockup draws; recorded here and in the PR.
- §2.4 the 2560 content max, margins, masthead spans the content: Task 4 step 3; measured at 3440 in Task 8 step 4.
- §2.5 unchanged list: no task touches row heights, masthead height, the drill-in, keys, storage keys (one new key, `bw.meter.notify.v1`, §4.1), colours, the phone tree, Phase 1, `?home=`. Task 8 step 1 measures the heights.
- §3.1 `includeRegular`, the 5 % regular bound, floor and thin exclusion, phone default, the two copies, tests for both: Task 5. The spec's copy carries a middle dot the shipped pill did not; Task 5 adds it.
- §3.2 percentile under the reading, same data, null while loading, history keeps range words: Task 3; Task 8 step 3 checks the loading case.
- §3.3 ages tick: unchanged (`useNow` in Board, Readout, GapHeader), nothing to do.
- §4.1 permission at intent, one sentence + Turn on, `bw.meter.notify.v1` on/declined, never blocks saving, `useAlertNotifications` in `src/hooks/`, mounted by `MeterShell`, newer-than-shown, granted and hidden/unfocused, title/body/tag, focused posts nothing, no push, "while OnStock is open in a tab", `notify` prop additive, phones untouched: Tasks 6 and 7; the default path proven in Task 7 step 4 and Task 8 step 6.
- §4.2, §4.3: no change, recorded.
- §5: nothing hard-codes a single Readout except the grid template string (Task 4), as the spec allows.
- §6 delivery steps 1–7 map to Tasks 1, 2, 3, 4, 5, 6+7, 8; the PR is Task 9.
- §7 owner questions: the OS notification stays silent when the tab is focused (the default); the 2560 cap (the default); both recorded in the PR body.

**Placeholder scan:** no TBD/TODO; every code step carries the code; Task 8's "whatever the checks turn up" is the same open-ended fix step Plan A used, with the checks themselves fully specified.

**Type consistency:** `bigScreen` returns `rule/gapColumn/readout/history/boardTicks/readoutTicks/contentMax`; Board reads `rule`, `gapColumn`, `boardTicks`; Readout reads `history`, `readoutTicks`; MeterShell reads `readout`, `contentMax`. `ruleTicks` items carry `pct/position/left/label`; `RuleTicks` reads `pct`, `left`, `label`; the tests check `position`. `RuleTicks({ width })` is called with `big.rule` (number) and `'100%'`. `widestCredibleGap(assets, session, { includeRegular })` and `widestGapLabel(session)` match the Masthead. `meterHeadline({ ticker, gapPct })` matches `alertNotification`'s call. `alertNotification(event)` reads `type/ticker/underlying/premium/threshold/target/price/assetId`, which are the fields `AlertsContext` writes. `unseenEvents(events, sinceAt)`, `shouldPost({ permission, hidden, focused })` and `notifyOfferVisible({ permission, saved })` match their callers in the hook and the sheet. `NOTIFY_KEY` is the string the phone check reads.
