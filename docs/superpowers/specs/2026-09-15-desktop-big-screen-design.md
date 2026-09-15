# OnStock desktop: big screens and the calm day

Written 2026-09-15. Builds on `docs/superpowers/specs/2026-09-14-desktop-meter-design.md` (the Meter) and on Plan A as shipped in PR #10 (`feat/desktop-meter`). Nothing here changes the phone app or the Phase 1 chart-first shell.

Status: direction chosen by the owner on 2026-09-15 from three mocked options (Option A "Grow the meter" as the default; Option B "Pin and compare" later as an opt-in; Option C "Denser Board" later as a toggle, never the default). Design approved in principle in conversation; this document is the record.

Mockups: https://claude.ai/artifact/A7j4sRuXtCai7gwZvAZCMa, page "Big screen options" (six artboards at 1920 and 2560).

## 0. The one sentence

On a big screen the Meter grows the instrument, not the whitespace: the gap rule and the Readout widen with the window while everything else keeps its size, the page answers "is this unusual" as loudly as it answers "how big", and an alert reaches you through the operating system.

## 1. Why this and not the others

Three directions were mocked at 1920 and 2560 with the same data. The choice was made on how a first-time visitor reads the screen:

- **One question per screen.** The Meter's premise is that the home answers one question. Option A keeps it. Option C puts nine columns and nineteen rows in front of the eye at once, which is what makes a terminal feel like work. Option B introduces a second concept (pinning) before the first one (the gap) has landed.
- **The eye lands where the size is.** In A the largest object is the widened rule and the reading beside it, which is the product. In C the largest object is the table. In B two Readouts compete.
- **Consistency across devices.** A is the phone layout with room to breathe; someone who learned OnStock on a phone recognises it on a monitor. C is a different product on desktop.

Comparing two wrappers is a real desire, but a second-visit desire; B's pin is progressive disclosure for later. Density is a preference of a minority; C's table is a toggle for later.

## 2. Layout at 1440 and up

Only three things scale: the Board's gap column, the Readout's width, and the Readout's gap-history height. Everything else keeps its 1440 size, so the eye always finds the same objects in the same places.

### 2.1 Breakpoints

Tailwind v4 in use: `lg` 1024, `xl` 1280, `2xl` 1536. Two new widths are named in `src/index.css` as tokens, not Tailwind screens, because they drive inline widths in JavaScript as much as CSS.

| Window width | Board gap rule | Readout width | Gap history height | Notes |
|---|---|---|---|---|
| 1024 to 1439 | 144 px (today) | `min(560px, 39vw)` (today) | 164 px (today) | unchanged |
| 1440 to 1679 | 240 px | 560 px | 164 px | the 1440 mockup |
| 1680 to 1919 | 400 px | 560 px | 220 px | |
| 1920 to 2559 | 560 px | 640 px | 260 px | the Option A artboard |
| 2560 and up | 560 px (cap) | 800 px | 320 px | the shell centres in a 2560 px content max with plain page-background margins; see 2.4 |

The Board's other columns keep the widths they have today (`minmax(160px, 1fr) 120px … 104px 80px 24px` in `src/components/desktop/Board.jsx`), with the gap track becoming the named width above instead of 224 px. The company column stays the flexible one, so at 1920 it takes what the rule and the Readout leave (about 400 px), not the whole surplus.

Widths come from one pure function so the Board, the Readout and the shell agree: `bigScreen(width) → { rule, readout, history }` in a new `src/lib/bigScreen.js`, with tests for every breakpoint edge (1439, 1440, 1679, 1680, 1919, 1920, 2559, 2560, 3440). The shell measures `window.innerWidth` through the existing `useMediaQuery` pattern or a small `useWindowWidth` hook and passes the result down as props; components never read the window themselves.

### 2.2 The rule's scale, made legible

`GapBar` keeps its square-root fill (`width = min(sqrt(|pct| / 2), 1) × 50 %` of the half track) because it is what keeps a 0.25 % gap visible beside a 2 % one. A 144 px rule hides the fact that the scale is not linear; a 560 px rule does not. So from 1680 px up the column header carries tick labels at the scale's real positions: −2, −1, −0.5, 0, +0.5, +1, +2 percent, at 100 / 70.7 / 50 / 0 / 50 / 70.7 / 100 percent of the half track, in the 11 px mono style, colour `oklch(0.62 0.009 250)` (the same grey the Readout's rule labels use). The Readout's own rule gets the same seven labels at every width from 1440 up (it is already 480 px wide there). The header stays 32 px tall: 14 px label, 4 px, 12 px ticks.

A pure helper `ruleTicks(scale = 2) → [{ pct, position }]` in `src/lib/bigScreen.js` produces the label set; tests pin the seven positions.

### 2.3 The Readout at 640 and 800

The Readout's content is a single column at every width; it does not become two columns (that is Option B's territory). What changes with width: the gap history's height (table above), the rule's width (the column's content width), and the wrapper picker and size pills, which sit on one row at 640 and up instead of sharing a row. Nothing else moves, so the vertical order the phone taught stays the same.

### 2.4 Past 2560

The shell's outer grid gets `max-width: 2560px; margin: 0 auto` from 2560 up; the page background shows in the margins with no border. The masthead spans the content max, not the window. This keeps the widest monitors from turning the Board into a sparse table, which is what Option A's own 2560 artboard showed when the company column absorbed the surplus.

### 2.5 What stays exactly as shipped

Row heights (56, 40, 32, 40), the masthead (56), the drill-in, the key map, the storage keys, the colours, the phone tree, the Phase 1 shell, the `?home=` switch.

## 3. The calm day

On a quiet weekday most bars sit near zero and the Board can read as "nothing here". The fix is emphasis and copy, not new data.

### 3.1 The masthead names the widest gap during the open session

`widestCredibleGap` in `src/lib/sessionCopy.js` returns null during regular hours by design, because on the phone Home every open-market gap is a real spread and the pill was a story for the shut market. The desktop masthead wants the opposite: during the open session, when the number is most trustworthy, name it. Add an option to the same function, `widestCredibleGap(assets, session, { includeRegular = false })`, with the regular-hours bound at 5 % (the pre/post bound) and the same 0.15 % floor and thin-market exclusion. The phone keeps the default; the Masthead passes `includeRegular: true`. The pill's copy during regular hours reads "Widest gap right now · COINx +0.59%"; outside regular hours it keeps today's "Widest gap · COINx +0.59%". Tests cover both.

### 3.2 The percentile line sits under the reading

Today the percentile caption ("Wider than 71% of its hourly readings this week") sits under the gap-history pane, three sections below the number it describes. Move it to directly under the reading and the rule, above the two leg lines, in the same 12 px grey. It stays on the same data (`gapPercentile` over `chart.premium` for the selected range) and keeps its honest grain words; it is null while the history loads. The history pane keeps its range words but loses the duplicate caption.

### 3.3 Nothing is asserted without an age

Unchanged rule, restated because it is the trust mechanism: every figure keeps its age beside it, in words, ticking once a second (Plan A's `useNow`).

## 4. Desktop workflow, this round

### 4.1 Alerts through the operating system

Alerts are evaluated on the client by `AlertsProvider` (`src/state/AlertsContext.jsx`), which appends events and raises `unread`; today the only surface is the News tab's feed and the bell dot. On desktop, add system notifications:

- **Permission is asked once, at the moment of intent.** When a user sets an alert from the desktop (the Readout's or the gap header's alert sheet), and `Notification.permission` is `"default"`, the sheet shows one sentence above its Save button: "Get a system notification when this fires?" with a "Turn on" button that calls `Notification.requestPermission()`. Denied or dismissed is remembered in `bw.meter.notify.v1` as `"declined"` and never asked again; granted is `"on"`. The sheet never blocks saving the alert on the answer.
- **A fired alert becomes one notification.** A new desktop-only hook `useAlertNotifications()` in `src/hooks/useAlertNotifications.js`, mounted by `MeterShell`, watches `useAlerts().events` for events newer than the last it has shown and, when permission is granted and the document is hidden or unfocused, posts `new Notification(title, { body, tag: assetId })` with the title `"NVDAx gap +1.42%"` (the `meterTitle` grammar without the product suffix) and the body as the alert's own sentence from the event. `tag` collapses repeats for the same asset. When the tab is focused, nothing posts; the bell dot and the feed already say it.
- **No service worker, no push.** These notifications fire only while a tab is open; the copy in the alert sheet says "while OnStock is open in a tab", and the spec's earlier honesty about client-side alerts stands. Push is Plan D.
- **Phones untouched.** The hook mounts only in the Meter shell. The alert sheet gets one additive prop, `notify`, that the Meter's callers pass as `true`; with the prop absent (every phone and Phase 1 caller) the sheet renders exactly today's markup.

### 4.2 The tab title

Already the readout (`meterTitle`). No change; recorded so it is not re-opened.

### 4.3 Window memory

Already covered: asset, lens, sort, credible toggle, size, range, home. No change.

## 5. What waits, and how this round leaves room for it

- **Pin and compare (Option B).** Its own plan: a Pin action in the Readout head, a pinned column at 480 px beside the live one from 1920 up, a comparison strip. The width rules in 2.1 leave 640 px of Readout at 1920, which splits into 480 live plus a 160 px gutter, or the Board yields 320 px; the later plan decides. Nothing in this round hard-codes a single Readout except the grid template string.
- **Dense Board (Option C).** A "Dense" toggle in the control strip in a later plan: 44 px rows, more columns, a sparkline. Never the default.
- **Push notifications and server-side alerts.** Plan D, on Vercel Pro.

## 6. Delivery

One implementation plan, small enough for a single PR from `feat/desktop-big-screen` (branched from `feat/desktop-meter`, so it lands after PR #10):

1. `src/lib/bigScreen.js` (`bigScreen`, `ruleTicks`) with tests; `useWindowWidth` hook.
2. Board: rule width and tick labels from props; header stays 32 px.
3. Readout: width from the shell; history height and rule labels; percentile line moved under the reading; pills and picker on one row at 640 and up.
4. Shell: grid columns from `bigScreen`, the 2560 content max, and the window-width hook.
5. `widestCredibleGap` option and the masthead copy, with tests.
6. `useAlertNotifications` and the alert sheet's permission sentence, desktop-gated.
7. Live checks at 1440, 1680, 1920, 2560 and 3440 (no horizontal scroll, the arithmetic in 2.1, the tick positions), a phone DOM check, lint, build, tests.

Testing: every pure module has unit tests; components are checked live in the Browser pane as in Plan A; the phone stays byte-identical, proven the same way (additive props, default paths reviewed line by line).

## 7. Risks and owner questions

- **Notification permission prompts are a trust moment.** Asking at the moment of setting an alert, once, with a plain sentence, is the least intrusive pattern; a page that asks on load loses the user. Default: ask only from the alert sheet. Owner question: keep the OS notification when the tab is focused too? Default: no, the bell is enough.
- **Wide rules exaggerate small gaps to the eye.** Mitigated by the tick labels and the percentile line; the number is always printed beside the bar.
- **The 2560 cap.** A 3440 px ultrawide user gets a centred 2560 px Meter with 440 px margins each side. Alternative: a third region (Option B) fills that later. Default: the cap.
- **Finnhub budget** (from PR #10) is unchanged by this round and remains the open owner call.
