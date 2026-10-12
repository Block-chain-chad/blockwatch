# TradingView teardown — surface 17: The Supercharts frame, measured live

Date: 2026-09-06 (a Sunday; US stock markets closed, crypto open). Scope: the pixel geometry of the Supercharts page (`tradingview.com/chart/`), how it collapses as the window narrows, the right-toolbar panels' widths and limits, the browser-tab title, the chart URL grammar, tooltips and first-use hints, and two small Help Center features nobody else covered. This document exists because `onstock-desktop-spec.md` §1.2–1.3 fixes numbers (48 px top bar, 64 px rail, 320/360/400 px right column, 40 px toolbar, "~32 px rows", "TradingView's layout is the same from 1024 up") that none of the thirteen earlier documents sourced.

## How this was measured

- **Session**: TradingView opened as a **guest (logged out)** in the Claude Code Browser pane (Chromium), device-pixel-ratio 1, in a viewport emulated at exactly **1920×1080, 1680×1050, 1440×900, 1280×800, 1024×768** and then at 1200, 1180, 1170, 1160, 1140, 1100, 1023, 1000, 960, 920, 900, 768, 700, 650, 640, 620, 610, 600, 560, 540, 520, 500 and 480 px wide to find where behaviour changes. No account was used, so nothing below is plan-gated knowledge — it is what a first-time visitor gets.
- **Theme**: the first-ever load rendered the **light** theme even though the browser advertised `prefers-color-scheme: dark`; after one visit to `/chart/?theme=dark` every later load was dark (the choice is stored in `localStorage["tradingview.current_theme.name"]`). Geometry was identical in both themes; colours quoted are from the dark theme unless said otherwise.
- **Values were read with DOM APIs**, not by eye: `getBoundingClientRect()` on the layout regions (`.layout__area--top/left/center/right`, `.chart-container`, `.chart-markup-table.pane`, `.price-axis`, `.chart-markup-table.time-axis`, `.chart-controls-bar`, `[data-name="widgetbar-pages-with-tabs"]`, `.widgetbar-widget-watchlist`, `.widgetbar-widget-detail`), `getComputedStyle()` for fonts and cursors, and the `data-tooltip` / `data-tooltip-hotkey` attributes for tooltip text. All numbers are **CSS pixels**.
- **Two caveats** on method. (1) A background browser pane gets no animation frames, and TradingView re-lays out its regions inside `requestAnimationFrame`, so after every resize a screenshot was taken to force a frame before reading; readings taken without that step were stale and were discarded. (2) Keyboard input into the hidden pane did not reach the page, so the things that need typing (open Symbol Search by typing a letter, add an indicator from the search box) could not be exercised — those rows say **could not verify** rather than guessing.
- Where TradingView's own Help Center or docs describe the same thing, the article is cited by name and listed in Sources. Nothing below is invented; measurements are "as of today" and TradingView changes chrome from time to time.

Cross-references to earlier documents use their numbers: [01] anatomy, [05] watchlist, [06] layouts, [09] interactions, [13] account/first-run.

---

## 1. Fixed chrome — the frame around the chart

Reference viewport 1440×900, guest, right panel **closed** (its first-load state). Regions are laid out by TradingView's own JS as absolutely-positioned areas with **4 px gutters** between them.

### 1.1 The regions

| Region (TradingView's DOM name) | Position and size at 1440×900 | Notes |
|---|---|---|
| Hamburger / top-left button (`layout__area--topleft`) | x 0, y 0, **52 × 38** | One button; opens the main menu (theme toggle and the "show/hide drawings toolbar" slider live here — Help Center "How to enable/disable Dark theme", "How can I enable/disable the drawings toolbar?"). |
| Top toolbar (`layout__area--top`) | x 52, y 0, w 1388, **h 38** | The chart toolbar. Buttons are 38 px tall (full height); pill-shaped controls inside it (symbol box, Trade) are 28 px tall at y 5. |
| Gutter under the toolbar | y 38–42 | **4 px**. Everything else starts at y 42. |
| Left drawings toolbar (`layout__area--left`) | x 0, y 42, **w 52**, h 858 | 27 buttons in 12 groups + 4 singles; see §1.3. |
| Gutter left of the chart | x 52–56 | 4 px. |
| Chart area (`layout__area--center`) | x 56, y 42, **w 1335**, h 858 | = `.chart-container` (h 819) + bottom controls bar (h 39). |
| Right widget strip (`layout__area--right`, `data-name="right-toolbar"`) | x 1395, y 42, **w 45**, h 858 | Icon column; the panels open to its left. |
| Gutter right of the chart | x 1391–1395 | 4 px. When a panel is open the panel's 5-px drag handle sits in this gutter (§2). |
| Trading panel (`layout__area--tradingpanel`) | w 0 | Collapsed; drag handle `trading-panel-handle` is 7 px wide, `ew-resize`. |
| Bottom (`layout__area--bottom`) | h 0 | Reserved for Pine Editor / Strategy Tester, empty for a guest. |

Vertical budget at 900 px: 38 toolbar + 4 gutter + **819 chart** + **39 bottom bar** = 900. The chart itself splits into **791 px pane + 28 px time scale**.

### 1.2 Top toolbar — every button, verbatim tooltip, hotkey chip, width

Left to right at 1440 (positions are the button's left edge; all 38 tall unless noted). Tooltip text is the `data-tooltip` attribute exactly; the hotkey is rendered as a chip inside the same tooltip.

| # | Tooltip (verbatim) | Visible label | Hotkey chip | x | w | DOM id / data-name |
|---|---|---|---|---|---|---|
| 1 | `Symbol search` | `AAPL` (ticker) | — | 56 | **128 × 28** (y 5) | `header-toolbar-symbol-search` |
| 2 | `Switch data type` | (icon inside the symbol pill) | — | 152 | 32 × 28 | `header-toolbar-switch-data-type` |
| 3 | `Compare symbols` | (icon) | — | 188 | 38 | `header-toolbar-compare` |
| 4 | `1 day` | `D` | — | 235 | 37 | interval button; label is the short form (`D`, `1h`, `4h`, `15m`, `1m`, `W`) |
| 5 | `Candles` | (icon) | — | 281 | 38 | chart-type button; tooltip is the current type name (`Line` after `&style=2`) |
| 6 | `Indicators, metrics, and strategies` | `Indicators` | `/` | 328 | **108.8** | `data-name="open-indicators-dialog"` |
| 7 | `Indicator templates` | (icon) | — | 436.8 | 38 | |
| 8 | `Create alert` | `Alert` | `Alt + A` | 483.8 | 78 | `header-toolbar-alerts` |
| 9 | `Bar replay` | `Replay` | — | 561.8 | 88.4 | `header-toolbar-replay` |
| 10 | (no tooltip; disabled) | undo icon | — | 659.2 | 38 | |
| 11 | (no tooltip; disabled) | redo icon | — | 697.2 | 38 | |
| 12 | `Layout setup` | (grid icon) | — | 1007.5 | 38 | `header-toolbar-layouts`; right-aligned cluster starts here |
| 13 | `Save all charts for all symbols and intervals on your layout` | `Save` (+ caret) | `Ctrl + S` | 1045.5 | 65 | |
| 14 | `Manage layouts` | (caret only for a guest; the layout name for a saved layout) | — | 1110.5 | 24 | `data-name="save-load-menu"` |
| 15 | `Quick search` | (icon) | `Ctrl + K` | 1143.5 | 38 | `header-toolbar-quick-search` |
| 16 | `Settings` | (icon) | — | 1181.5 | 38 | `header-toolbar-properties` |
| 17 | `Fullscreen mode` | (icon) | `Shift + F` | 1219.5 | 38 | `header-toolbar-fullscreen` — this settles 06 §8: Shift+F is the fullscreen hotkey, shown in the button's own tooltip |
| 18 | `Take a snapshot` | (icon) | — | 1257.5 | 38 | |
| 19 | (no tooltip) | `Trade` | — | 1299.5 | 58.8 × 28 | pill |
| 20 | `Share your idea with the trade community` | `Publish` | — | 1366.3 | 73.7 | dark pill, flush right |

Group gaps: 9 px between the left group's items (e.g. 226→235), 8–9 px before Trade and Publish. The left group ends at x 735 (after redo) and the right cluster starts at 1007, so at 1440 there is **272 px of slack** — that slack is what the collapse in §3 consumes.

### 1.3 Left drawings toolbar

52 px wide. Every tool button is **52 × 38**; the first sits at y 48 (6 px below the region top); buttons stack at a 38-px pitch; group separators add 13 px (e.g. 352→365). Each *group* button has an 11 × 34 chevron sub-button on its right edge (x 41–52) that opens the group's flyout. Verbatim tooltips, top to bottom:

| Button (tooltip) | Group chevron tooltip | Hotkey chip |
|---|---|---|
| `Cross` | `Cursors` | — |
| `Trendline` | `Trend tools` | (chip text is a template string in the DOM: `{hotKey_0} — drawing a straight line at angles of 45`) |
| `Fib retracement` | `Gann and Fibonacci tools` | — |
| `XABCD pattern` | `Patterns` | — |
| `Long position` | `Forecasting and measurement tools` | — |
| `Brush` | `Geometric shapes` | — |
| `Text` | `Annotation tools` | — |
| `Icon` | `Icons` | — |
| `Measure` (`data-name="measure"`) | — | `{hotKey_0} + Click on the chart` (the live chip reads Shift + Click) |
| `Zoom in` (`data-name="zoom"`) | — | — |
| `Magnet mode snaps drawings placed near price bars to the closest OHLC value` | `Magnets` | `Ctrl` |
| `Keep drawing` (`data-name="drawginmode"`) | — | — |
| `Lock drawings and indicators` | `Lock options` | — |
| `Hide all drawings` | `Hide options` | `Ctrl + Alt + H` |
| `Remove objects` | `Remove options` | — |

The toolbar never auto-hides at any width tested (still 52 px at 480); hiding it is a manual slider in the top-left menu.

### 1.4 Right widget strip

45 px wide; buttons are **44 × 44** at x 1395.5, stacked at a 46-px pitch from y 44. Verbatim tooltips and `data-name`:

| y | Tooltip | data-name |
|---|---|---|
| 44 | `Watchlist, details, and news` | `base` |
| 90 | `Alerts` | `alerts` |
| 136 | `Object tree and data window` | `object_tree` |
| 571 | `Screeners` | `screener-dialog-button` |
| 615 | `Pine` | `pine-dialog-button` |
| 659 | `Calendars` | `calendar-dialog-button` |
| 705 | `Community` | `community-hub-button` |
| 751 | `Notifications` | `notifications-button` |
| 797 | `Products` | (no data-name; opens a flyout listing Screeners, Pine Editor, Calendars, Options, Yield Curves, Macro Maps, Community, Notifications) |
| 854 | `Help Center` | `help-button` |

The first three are "widget-bar pages" (they open a side panel); the bottom group opens overlays or split views (§7). No "Trading Panel" button exists for a guest — the trading area is a separate zero-width region.

### 1.5 Bottom bar (`chart-toolbar chart-controls-bar`)

**39 px** tall (y 861–900), buttons 38 tall, first button inset 8 px (x 64). Verbatim tooltips:

| Label | Tooltip | Width |
|---|---|---|
| `1D` | `1 day in 1 minute intervals` | 27.9 |
| `5D` | `5 days in 5 minutes intervals` | 27.9 |
| `1M` | `1 month in 30 minutes intervals` | 29.3 |
| `3M` | `3 months in 1 hour intervals` | 29.3 |
| `6M` | `6 months in 2 hours intervals` | 29.3 |
| `YTD` | `Year to day in 1 day intervals` | 36.7 |
| `1Y` | `1 year in 1 day intervals` | 27.3 |
| `5Y` | `5 years in 1 week intervals` | 27.3 |
| `All` | `All data in 1 month intervals` | 28.5 |
| (calendar icon) | `Go to` — hotkey chip `Alt + G` | 38 |
| `10:10:35 UTC` (live clock) | `Timezone` | 96.1, 14 px text, right-aligned |
| `ADJ` | `Adjust data for dividends` | 35.5 (stocks only; absent on US10Y/EURUSD/BTC) |

Each range button's tooltip states the interval it will switch to — the range buttons change *both* the visible span and the interval.

### 1.6 Legend (status line) — inset and type

- The legend wrapper starts at **(60, 46)**: 4 px in from the pane's top-left corner (pane origin 56, 42). Its main block is 66 px tall with the Buy/Sell strip, 20 px for the title row alone.
- Title row: symbol logo 18 × 18 (an 11 px bold letter when no logo), then `Apple Inc` as a button (tooltip `Change symbol`, **16 px / 400**), a separator, `1D` as a button (tooltip `Change interval`, 16 px), a separator, `NASDAQ` (16 px). Then a `Flag symbol` button (28 × 24), the data-mode badge, and `More` (28 × 24). The data-mode badge's tooltip for a guest on a NASDAQ stock reads, verbatim: `Market closed · One update every 5 seconds · NASDAQ by Cboe One`.
- Values row: `O 328.31 H 328.93 L 317.86 C 319.97 −8.24 (−2.51%)` at **13 px / 400**, each label/value a separate span (labels 7.6–9.8 px wide, values 38.9 px wide for a 6-character price).
- Buy/Sell strip (guest, paper-trading affordance): two 61.6 × 34 buttons (`319.97` at 12 px/600 over `Sell`/`Buy` at 11 px) with the spread `0.00` at 10 px between them; `data-name="sell-order-button"` / `buy-order-button`.
- `Vol 39.61 M` indicator legend line at 13 px, with a collapse chevron.
- When the pane is narrow the legend truncates from the right: at a ~285-px pane it shows only the company name and icons (interval and exchange dropped) and the O/H/L/C values wrap to a second line.

### 1.7 Price scale, time scale, navigation cluster, pane controls

| Item | Measured |
|---|---|
| Price scale width | **54 px** for `355.00`-style labels (AAPL), **52** for `79,986` / `230.36`, **56** for `4.840%` (US10Y), **64** for `1.17400` (EURUSD), **72** for `79,968.96` (BTCUSDT). It is sized to the widest label: roughly 52 px for six characters plus ~6–7 px per extra character. There is also a hidden 34-px-tall currency-label slot at the top of the axis (`price-axis-currency-label-wrapper`, shown when "Currency" is enabled). |
| Left price scale | present in the DOM at 0 px wide (`price-axis-container`), grows only if a scale is moved left. |
| Time scale height | **28 px** (`.chart-markup-table.time-axis`). |
| Pane / chart | pane = chart width − price scale; at 1440 with the panel closed: 1281 × 791. |
| Navigation cluster (`control-bar`) | Appears on hover near the bottom of the pane: **184 × 24** at x 613, y 777 in a 1281-wide pane — horizontally centred, bottom edge **32 px above the time scale**. Buttons **24 × 24** with 8-px gaps in two groups: `Zoom out` (chip `Ctrl + ↓`) / `Zoom in` (`Ctrl + ↑`); `Scroll to the left` (`←`) / `Scroll to the right` (`→`); then `Reset chart view` (`Alt + R`), which is invisible (opacity 0) until the view has been moved. `Maximize chart` (`Alt + Click`) exists in the DOM but is 0 × 0 on a single-chart layout. |
| Scroll-to-latest | `Scroll to the most recent bar` (chip `Alt + Shift + →`), 24 × 24 at the pane's right edge (x 1293 — 20 px left of the price scale), same baseline as the cluster, hidden until the chart is scrolled away from the last bar. |
| Pane controls | Top-right of each pane (x 1333, y 46), hidden until hover: `Collapse pane` / `Restore pane` (chip `Ctrl + Double click`), `Maximize pane` / `Restore pane` (`Double click`). |
| Pane separator hit area | **could not verify** — adding a second pane needs the indicator search box, which did not accept typed input in the headless pane. |
| Right margin (bars) | Rendered on canvas; the numeric default **could not verify** from the DOM. The setting is Chart settings → Canvas → `Right margin` [02 §5.4 "Section: Margins"]. |

---

## 2. Right-toolbar panels — widths, limits, persistence, rows

### 2.1 The panel container

| Property | Measured |
|---|---|
| Default width, first open | **300 px** of content (`widgetbar-pages` is 302 with its 1-px borders). With the 45-px strip and the 4-px gutter, opening the panel costs the chart **350 px**: at 1440 the chart area went 1335 → 1034. |
| Divider | `widgetbar-handle`, **5 px** wide, cursor `ew-resize`, sitting in the gutter (x 1091–1096 at 1440). It drags. |
| Minimum | **200 px**. Dragging stops there; dragging further right past the minimum **collapses the panel** entirely (content width 1, strip only). |
| Maximum | Not a fixed number: the chart area refuses to go below **296 px**, so the panel takes everything else (1040 at 1440, 1200 at 1600). |
| Persistence | The width is stored in `localStorage["tradingview.widgetbar.layout-settings"]` and survives reloads (a 202-px panel came back at 202; a 578-px one at 578). Reopening after a collapse restored the last width when that width was the 200 minimum (200 → collapse → 202), but after collapsing from the *maximum* (1200 at 1600 wide) it reopened at **578**, a number whose rule **could not verify** (it is not the default and not a fixed fraction of any width measured). Whether the panel is *open* on load persisted in one session and not in another (a fresh browser profile opened closed), so treat "open state persists" as **could not verify**. |
| Per-panel widths | The Alerts and Object tree panels write their own `tradingview.widgetbar.widget.alerts.*` / `…object_tree.*` keys; a per-panel width difference **could not verify** (only the Watchlist page was opened). |
| Watchlist / Details split | Default **427 / 431 px** of the 858-px column at 900 high (≈ 50/50; 477/481 at 1000 high). Divider `widgetbar-widgethandle`, **5 px** tall, cursor `ns-resize`, directly under the watchlist widget. Dragging up stops when the watchlist is **77 px** tall (48-px header + 29-px body). The details widget's minimum **could not verify** (the downward drag did not register). The split persists across reloads. |
| Behaviour on window resize | The panel keeps its stored width while the chart shrinks; at 1024 wide with a 578-px panel the chart area was 342 px. It does not auto-narrow to protect the chart. |

### 2.2 Watchlist widget — header, columns, rows, fonts (Table view mode)

| Element | Measured |
|---|---|
| Widget header | **48 px** (y 42–90). Left: `Watchlist` list-name button (14 px / **600**, `data-name="watchlists-button"`, 34 px tall). Right: three 38 × 38 buttons with tooltips `Add symbol`, `Advanced view`, `Settings`. |
| Column header | **28 px** (y 90–118). Labels `Symbol`, `Last`, `Chg`, `Chg%` at 14 px / 400. |
| Column widths at 300 | flag gutter 12 · Symbol **78.3** · Last **73.3** · Chg **68.4** · Chg% **60** (sum 292 + 8 px right pad). |
| Column widths at 578 | 147.8 / 142.8 / 137.8 / 127.8 (all four grow equally). |
| Column widths at 200 (minimum) | 43.8 / 39.3 / 37 / 60 — Chg% is the only column with a floor above 40. |
| Row height | **31 px** (rows at y 160, 190, 220 …). This settles the spec's "~32 px" guess. |
| Row content | 18 × 18 logo (11 px bold letter fallback) at x +16, ticker 14 px / 400, a 6 × 6 market-status dot after the ticker, a `D` "delayed" badge (10 px bold) on delayed symbols, then Last / Chg / Chg% at **14 px / 400**, right-aligned. Text colour `rgb(15,15,15)` on light (`rgb(219,219,219)`-class greys on dark); negative change `rgb(242,54,69)`, positive `rgb(66,189,168)` — TradingView's standard red/teal. |
| Section header | **37 px** for the first section (`INDICES`, y 124–161), **36 px** for later ones (`STOCKS` at y 310–346); the label sits in a 30-px inner row with a collapse chevron. |
| Selected row | The row for the chart's symbol gets a 1-px outline (`active` class) — visible as the boxed `AAPL` row. |
| Default list (guest) | Sections and tickers exactly: **INDICES** SPX, NDQ, DJI, VIX, DXY · **STOCKS** AAPL, TSLA, NFLX · **FUTURES** USOIL, GOLD, SILVER · **FOREX** EURUSD, GBPUSD, USDJPY · **CRYPTO** BTCUSD, BTCUSDT, ETHUSD. This fills the 13 §13 gap. |
| Settings menu (verbatim) | `Table view` (toggle) · **CUSTOMIZE COLUMNS**: `Last`, `Change`, `Change %`, `Volume`, `Extended Hours` · **SYMBOL DISPLAY**: `Logo`, `Symbol`, `Name`. Stored in `localStorage["widget.watchlist.table-view"]`. |
| Clicking a row | Changes the chart symbol, updates the tab title and rewrites the URL to `/chart/?symbol=EXCHANGE%3ATICKER` (§5). |

### 2.3 Watchlist — minimalistic mode (`Table view` off)

| Element | Measured |
|---|---|
| Row height | **43 px** (rows at y 160, 202, 244). |
| Layout | Two lines: ticker (14 px / 400) over the company name (12 px / 400); on the right the last price (14 px) over `Chg%` (12 px). No `Chg` absolute column. |
| Header | The column header row becomes `Symbol` + a `Sort by` control; no column labels. |
| Section headers | unchanged, 37 px. |

TradingView's own description of the mode: enable by going "to the Watchlist's settings and deactivate the Table view mode"; it shows "price and change stats together right next to a symbol" (blog "Minimalistic display mode for watchlist"). Note the minimalistic row is **taller** (43) than the table row (31) — it trades density for the second line.

### 2.4 Details widget (below the watchlist)

Header 48 px: 24 × 24 logo, ticker at 14 px / 600, then `details-add-note-button` and `details-settings-button` (38 × 38). Body, top to bottom at 300 px wide: company name and exchange (12 px), sector/industry (12 px), **price at 28 px / 600** with the currency at 12 px beside it, change and change % at 16 px / 600, a status line `Market closed` (13 px) and `Last update at Sep 4, 16:59 GMT-7` (13 px), the pre/post pills, then blocks headed `Key facts`, `Key stats` (rows `Next earnings report`, `Volume`, `Average Volume (30D)`, `Market capitalization`), `Earnings` (with a `More info` link), `Dividends`, then buttons named in the DOM `details-more-earnings-button`, `details-more-technicals-button`, `details-see-forecast-button`, `details-more-stock-bonds-button`, `details-more-options-button`, and a `News` card ("2 days ago", `More events`). For a non-stock (US10Y) the blocks are `DAY'S RANGE` and `52WK RANGE` sliders plus News.

---

## 3. Responsive collapse — what changes at each width

### 3.1 The mechanism (not media queries)

The top toolbar decides its own mode by measurement, not by viewport breakpoints. It renders **two hidden clones** (`inner-… fake-…`, `visibility: hidden; position: fixed`) — one in "full" mode (labels on Indicators/Alert/Replay) that is **971.2 px** wide, one in "medium" mode (icons only) that is **810 px** wide — and shows whichever fits the space left after the fixed right-hand items (Trade 59 + Publish 74 + gaps ≈ 145 px). So the breakpoint moves with the symbol's name length (the symbol pill is 128 px for a 4–5-letter ticker) and with the locale. The bottom bar uses the same trick (a third fake, 84.9 px, appears for the `Date Range` dropdown). Consequences: there is **no "…" overflow menu** in the top toolbar — items either lose their label or disappear; and the numbers below shift by a few px with different symbols.

### 3.2 Behaviour by viewport width (guest, panel closed unless noted)

| Viewport | Top toolbar | Bottom bar | Right strip | Left toolbar | Chart area (panel closed) |
|---|---|---|---|---|---|
| 1920 | Full: labels on `Indicators`, `Alert`, `Replay`; `Trade` + `Publish` pills | full range row | 45 | 52 | 1815 |
| 1680 | same | same | 45 | 52 | 1575 |
| 1440 | same (272 px slack) | same | 45 | 52 | 1335 |
| 1280 | same | same | 45 | 52 | 1175 |
| 1200 | same | same | 45 | 52 | 1095 |
| **1170** | last width with labels | same | 45 | 52 | 1065 |
| **1160** | **labels dropped** — `Indicators`, `Alert`, `Replay` become icons (medium mode) | same | 45 | 52 | 1055 |
| 1100 | medium | same | 45 | 52 | 995 |
| 1024 | medium; `Trade` + `Publish` still present | same | 45 | 52 | 919 |
| **1000** | `Publish` **hidden**; `Trade` becomes an icon-only pill | same | 45 | 52 | 895 |
| 900 / 768 / 700 / 650 / 610 | medium, no Publish, Trade icon | same | 45 | 52 | 795 / 663 / 595 / 545 / 505 |
| **560** | `Trade` icon **hidden** | same | **strip hidden** (`layout__area--right` = 0) | 52 | 504 |
| 500 | same | full range row (chart 444) | 0 | 52 | 444 |
| **480** | toolbar wider than the window — it **scrolls horizontally** (Publish/Trade gone, right end clipped) | **`Date Range` dropdown** replaces the nine range buttons (chart 424) | 0 | 52 | 424 |

Exact thresholds found: labels drop between **1160 and 1170** px (with a 5-character symbol); `Publish` and the Trade label go between **1024 and 1000**; the right strip and the Trade icon go between **610 and 560**; the bottom range row collapses to `Date Range` when the **chart area** (not the viewport) is narrower than roughly **430–444 px** — it was full at a 444-px chart and collapsed at 424 and 418 (the latter at 1100 wide with a 578-px panel open, which is why the panel's width matters).

Things that never happened between 1920 and 480: the left toolbar did not hide; no "mobile" layout appeared (the `<html>` classes stayed `feature-no-touch feature-no-mobiletouch`; the phone layout is served on touch/user-agent, not on width); the chart never dropped below the toolbars; no horizontal scrollbar except the toolbar's own at 480. **Minimum usable width**: about 560 px keeps every region; below that the widget strip is gone and the top toolbar clips.

### 3.3 With the panel open at 1024

At 1024 × 768 with the panel at its persisted 578 px: chart area **342 px** (pane 286 + 56 scale), watchlist and details 361 / 365 px tall, columns 147.8 / 142.8 / 137.8 / 127.8, and the bottom bar already collapsed to `Date Range`. With the **default 300-px** panel the arithmetic gives a **618-px chart area at 1024** (1024 − 52 − 4 − 302 − 4 − 45 = 617). So "TradingView gives the chart the remainder" is true, but the remainder at 1024 is ~618 px, not the 700-plus the spec's 320-px column implies.

### 3.4 Multi-chart grid at 1024

**Could not verify** — a guest has a single chart (Basic = 1 chart per layout, 06 §3.1), and the `Layout setup` menu was not exercised. The `Maximize chart` control (Alt + Click) exists in the DOM at every width.

---

## 4. The browser-tab title (`document.title`)

Observed formats (verbatim, spaces and glyphs exact):

| Page / state | `document.title` |
|---|---|
| Server-rendered HTML, before the app boots | `Live stock, index, futures, Forex and Bitcoin charts on TradingView` |
| App booted, quote not yet received | `AAPL` / `BTCUSD` / `NVDA` (the ticker alone) |
| Quote received, market closed (Sunday) | `AAPL 319.97 ▼ −2.51%` — last close, day change; nothing says "closed" |
| Quote received, market open (crypto) | `BTCUSD 79,986 ▲ +0.19%`, later `BTCUSD 79,970 ▲ +0.17%` |
| Yield symbol | `US10Y 4.784% ▲ +0.25%` (price formatted per symbol: `%` for yields, five decimals for FX `EURUSD 1.16130 ▼ −0.11%`, two for BTCUSDT `79,968.96`) |
| Named saved layout (someone's shared `/chart/3jUkqZqY/`) | `ETHUSDT 2,498.83 ▲ +0.75% test123` — the **layout name is appended** after the change |
| Symbol page `/symbols/NASDAQ-AAPL/` | `Apple Stock Chart — NASDAQ:AAPL Stock Price — TradingView` (static, no live price) |
| Screener `/screener/` | `Stock Screener: Search and Filter Stocks — TradingView` |
| Heatmap `/heatmap/stock/` | `Stock Heatmap — TradingView` |

Grammar of the chart title: `<TICKER> <price> <▲|▼> <+|−><change%>[ <layout name>]`. Glyphs are U+25B2 BLACK UP-POINTING TRIANGLE, U+25BC BLACK DOWN-POINTING TRIANGLE, and the change uses U+2212 MINUS SIGN, not a hyphen. The title carries **no exchange, no interval, no "TradingView" suffix** — the product name is dropped in favour of the quote. It follows the chart's symbol, not the watchlist selection (clicking `SPX` in the watchlist switched the chart and the title to `SPX 7,718.60 ▼ −0.38%`).

Update cadence: the legend's data-mode tooltip says the guest feed is `One update every 5 seconds` (NASDAQ by Cboe One); the title is rewritten when the quote changes. In this background pane the title node was rewritten once in 18 s with identical text, so the true foreground cadence **could not verify** beyond "at most every quote tick".

Favicon: `https://static.tradingview.com/static/images/favicon.ico` on every page (plus a 180×180 `apple-touch-icon`); no change with price direction, symbol or page was observed in the web app. The **Desktop app** is the one that reworked "tab titles and favicons to improve readability and accurately reflect active screens and filters" (release notes 3.2.0, 2026-06-03), added `Customize tab title` to the tab context menu (2.12.0) and first "Show the ticker and layout name on the window title" (1.0.12) — see 13 §10a; not repeated here.

---

## 5. Chart URL grammar (verified live)

| URL | What happened |
|---|---|
| `/chart/` | Opens the guest's **last-used** symbol and interval (stored client-side). First-ever visit: `AAPL`, `1D`, Candles. |
| `/chart/?symbol=BITSTAMP:BTCUSD&interval=60` | Opened BTCUSD at `1h`; the address bar kept the parameters, with the colon percent-encoded: `/chart/?symbol=BITSTAMP%3ABTCUSD&interval=60`. |
| `/chart/?symbol=NASDAQ:NVDA&interval=D&theme=dark` | Opened NVDA daily in the **dark** theme (`<html class="… theme-dark">`) and the theme stayed dark on every later visit. |
| `/chart/?symbol=NASDAQ:NVDA&interval=1W&style=2` | Weekly, chart type **Line** (the type button's tooltip read `Line`). `style` takes the numeric chart-type ids (1 = Candles, 2 = Line — only 2 was tested; the full id list is in [01]'s chart-type table). |
| `/chart/?symbol=NVDA&interval=240` | No exchange: resolved to a listing (legend showed `NVDA`), interval `4h`. |
| `/chart/?symbol=NASDAQ:NVDA&interval=15&timeframe=1M` | `15m` was applied; `timeframe` produced no visible change to the date range — **could not verify** that it is honoured. |
| `/chart/3jUkqZqY/` | An 8-character **layout id**. Someone else's shared layout opened read-only with a `View Only Mode` banner and a `Copy` button, on its own symbol/interval (ETHUSDT, 5), and the tab title gained the layout name. This is the "unique URL" of [06]; a shared link is exactly this path (Help Center: "Copy the URL from the address bar and share it"; recipients "will see your chart in the View Only mode"; "the person who has the link can select Copy and save the layout as their own"; changes after sharing are not reflected). Whether `?symbol=&interval=` on a layout URL overrides the layout's saved symbol **could not verify** as a guest. |
| `/symbols/NASDAQ-AAPL/` | The symbol page (colon becomes a hyphen), as in 05 §3. |
| `/screener/` | Stock screener; no query grammar observed on the page. |
| `/heatmap/stock/` | Redirects to a **hash-JSON** state: `#{"dataSource":"SPX500","blockColor":"change","blockSize":"market_cap_basic","grouping":"sector"}` (percent-encoded). That hash is the heatmap's deep-link grammar. |

Interval values accepted are the Advanced Charts resolution strings: bare digits = minutes (`1`, `15`, `60`, `240`), `xS` seconds, `xD` days, `xW` weeks, `xM` months, `xT` ticks; "you can also omit the number of units if it is equal to 1", so `D` = `1D` (charting-library docs, Resolution). Seconds and ticks are paid-plan intervals (08).

Address-bar behaviour on the page: when the symbol is changed by clicking a watchlist row the URL is rewritten to `/chart/?symbol=EXCHANGE%3ATICKER` (no `interval`). Whether that rewrite is a `pushState` (a Back step per symbol) or a `replaceState` **could not verify** — `history.length` was not read immediately before and after a click; what was observed is that a browser Back from a `?symbol=…&interval=1` entry went to the previous *page* (`/chart/`), and that page then reopened the **last-used** symbol from storage rather than the one implied by its URL. Whether an interval change is written to the URL **could not verify** (the keyboard interval prompt could not be driven headlessly; the URL after the watchlist click carried no `interval=`, which suggests it is not).

---

## 6. Tooltips, hints, the Save affordance, loading, guest defaults

**Tooltip rendering.** Hovering `Indicators` produced a `common-tooltip` element: **24 px tall, 13 px text**, light-on-dark (`rgb(242,242,242)` on `rgb(61,61,61)` in the dark theme), 2-px corner radius, positioned **4 px below the toolbar** (y 42), left-aligned under the button, with the hotkey as a separate chip after the text (`Indicators, metrics, and strategies` `/`). Every toolbar control carries its text in `data-tooltip` and its keys in `data-tooltip-hotkey` as JSON (`{"keys":["Ctrl","K"],"text":"{0} + {1}"}`), which is how the tables above were transcribed.

**First-use hints.** None appeared during this session (no element containing "Got it" or "Press and hold" was ever present). 09 §13 saw `Press and hold to see detailed chart values` with a `Got it!` button on a fresh load, and the charting library exposes it as the `popup_hints` featureset; treat the trigger conditions as **could not verify**. What a guest *does* get, after a few minutes on the page, is a sign-up modal (`data-dialog-name="gopro"`) over the chart, verbatim: `Look first / Then leap.` — `Make every move count. Create a free account for powerful tools, deeper insights, and everything needed to launch your trading journey.` — button `Join for free`. It has a close control and does not recur immediately.

**The Save affordance.** For a guest the toolbar shows a `Save` button with a caret (tooltip `Save all charts for all symbols and intervals on your layout`, `Ctrl + S`) and an unnamed `Manage layouts` button (24 px, caret only). The Help Center's logged-in behaviour — "Every time you make changes to your chart, you'll see 'Save' appearing under the layout's name — click on it from time to time", plus an `Autosave` toggle — **could not verify** without an account.

**Loading.** Order observed on every navigation: server title `Live stock, index, futures, Forex and Bitcoin charts on TradingView` → the shell with the ticker-only title (`BTCUSD`) → chart data and the full title within ~1–2 s. No skeleton was captured: the toolbar and empty pane render first, bars fill in. The legend shows `∅` for O/H/L/C until data arrives.

**Guest defaults (fills 13 §13).** First-ever load: symbol **AAPL** (`Apple Inc · 1D · NASDAQ`), interval **1D**, chart type **Candles**, **Vol** indicator on, light theme, right panel **closed** (strip only), left toolbar shown, date-range row shown, clock in **UTC**, Buy/Sell buttons in the legend. Later loads restore the last symbol, interval, theme, panel width and watchlist mode from `localStorage` (keys seen: `tradingview.widgetbar.layout-settings`, `tradingview.current_theme.name`, `widget.watchlist.table-view`, `tradingview.trading.orderWidgetMode.`).

---

## 7. Two Help Center features no earlier document covered

Both live in the Help Center folder "I can't find a certain feature or setting" (43 articles; the folder also holds "How to enable/disable floating data tooltip?", "How to view chart data as a table", "How can I keep chart position in time after applying a new interval?").

**"Simple steps to Split view mode"** (43000753069). Verbatim points: "Split view mode can help you better organize your workspace while charting. It prevents screeners, calendars, options, and other widgets from overlapping your chart"; "only available on Supercharts". Steps: open a widget from the right toolbar (Screeners, Calendars, or Options); "press the 'Move overlay to split-view' button" in the panel; "By default, the panel will take 50% of the screen size, but you can toggle it according to your needs"; repeat "with other widgets and pin all three"; the widget icons disappear from the toolbar while pinned; "The size and order of the widget windows are saved and will reemerge the next time you open the chart." In frame terms this is the zero-height `layout__area--bottom` region becoming a dock.

**"How to change the time frame quickly"** (43000762824). Verbatim: "The timeframe buttons at the top represent favorite timeframes"; "add an interval to your favorites by clicking on the star icon next to it and quickly change the time frame by selecting it from the top panel"; or "just start typing the number. For example, if you want to set a 125-minute interval, type '125' on your keyboard and press the Enter key"; letters: "2 - 2 minutes, 12D - 12 days, 1W - 1 week, 3M - 3 months". Starred intervals appear as extra buttons beside the `D` interval button in the top toolbar, so the toolbar's collapse point in §3 moves left by ~37 px per favourite.

---

## What this means for OnStock

Mapped onto `onstock-desktop-spec.md` §1.2–1.3 and B15.

1. **Adjust — top bar 48 → keep 48, but know TradingView is 38 + 4.** TradingView's chart toolbar is 38 px with a 4-px gutter (42 px to content). OnStock's 48 is fine for a bar that also holds the wordmark and session strip; do not go taller.
2. **Adjust — chart toolbar 40 → 38.** Every TradingView toolbar row (top, bottom, panel headers' buttons) is 38 px; the bottom bar is 39. A 38-px chart toolbar with 28-px pills inside (symbol box, Trade) is the measured convention.
3. **Adopt — 4-px gutters and a 52-px icon rail.** The spec's 64-px nav rail is wider than TradingView's 52-px drawings toolbar and its 45-px widget strip. 64 is defensible because OnStock's rail carries 10-px labels; if labels go, 52 is the number.
4. **Adjust — right column 320/360/400 → make 300 the default and 200 the floor.** TradingView opens its panel at exactly **300 px**, floors it at **200** (columns clamp to 44/39/37/60), collapses when dragged below that, and lets it grow until the chart hits **296 px**. OnStock's fixed 320 at 1024 leaves a ~560-px chart; TradingView at 1024 leaves ~618. Keep 320–400 as the *initial* widths per breakpoint if the phone row needs it, but the Phase-2 draggable column (B13) should copy 300 default / 200 minimum / chart-min 296 and persist the width in localStorage as TradingView does.
5. **Adjust — "~32 px rows" → 31 px table rows, 43 px minimalistic rows.** The Phase-2 table view should be **31 px** rows, 14 px/400 text, a 28-px column header, 36–37-px section headers and a 48-px panel header. OnStock's current 56-px phone `AssetRow` is closer to TradingView's 43-px two-line minimalistic row than to its table — so ship the two-line row at 43–48 px first (it already carries name + price + change) and the 31-px table as the density option.
6. **Adopt — column set and proportions.** At 300 px TradingView gives Symbol 78 / Last 73 / Chg 68 / Chg% 60 with a 12-px flag gutter. OnStock's equivalents are Symbol / Token / Gap% / Gap-drift; give the gap column the Chg% slot (right-most, floored at 60) so the thesis number never truncates.
7. **Skip — the spec's "nothing else collapses" claim.** TradingView does collapse, but by *measuring* the toolbar, not by breakpoints: labels drop at ≈1165 px, Publish/Trade at ≈1000, the widget strip at ≈560, the range row when the chart is under ≈440 px. For OnStock at 1024–1279: drop the button labels on the chart toolbar (keep icons + tooltips with the shortcut chip), keep the session strip short, and collapse the interval row into a `Date Range`-style dropdown only when the chart is narrower than ~440 px (which at 1024 with a 320 column it is not). Do not build a "…" overflow menu — TradingView has none.
8. **Adopt — a `document.title` rule.** Copy the grammar exactly: `NVDAx 12.34 ▲ +0.65%` with U+25B2/U+25BC and U+2212, no suffix while a chart is open, ticker-only before the first quote, and append a layout name if layouts ever ship. The OnStock twist that TradingView cannot do: when the Gap|Candles toggle is on **Gap**, write the gap instead of the price — `NVDAx gap +0.42% ▲` — so the tab itself answers the product's question. Static titles (`Screener — OnStock`) on non-chart routes, like TradingView's screener and symbol pages. Favicon stays fixed; TradingView's web app never changes it.
9. **Adopt — TradingView-style query parameters, not a hash.** B15 proposes `#s=&i=&m=`. TradingView's grammar is `/chart/?symbol=EXCHANGE:TICKER&interval=60&theme=dark&style=2`, it rewrites the query when the symbol changes, and `/chart/` with no query reopens the last-used state. For OnStock: `/chart?symbol=NVDAx&interval=1h&mode=gap&theme=dark`, `replaceState` on change (so Back leaves the app rather than stepping through symbols — TradingView's push-vs-replace choice could not be verified, so pick the one that matches OnStock's phone Back behaviour), restore-last-used on a bare `/chart`, and reserve `/chart/<id>` for saved layouts (view-only for other people, as TradingView does). Query strings survive copy-paste and unfurl in chat better than fragments.
10. **Adopt — tooltip-with-shortcut on every toolbar control.** 13 px text, 24 px tall, 4 px below the bar, shortcut as a chip. Put the text in a `data-tooltip` attribute so it is also the accessible name.
11. **Adopt — the bottom-centre navigation cluster.** 24-px buttons, 8-px gaps, centred, 32 px above the time scale, hidden until hover, with a reset that only appears once the view has moved and a "scroll to latest" at the right edge. Lightweight Charts has no built-in one; it is ~40 lines.
12. **Adapt — legend inset and type.** 4-px inset from the pane corner, 16-px symbol/interval as buttons, 13-px values. OnStock's readout already exists; match the sizes and make the ticker and interval clickable like TradingView's `Change symbol` / `Change interval`.
13. **Adopt — the price scale must grow with the label.** 52 px for six characters, ~7 px per extra character (72 px at `79,968.96`). Tokenized-stock prices with four decimals will need 60–70 px; do not hard-code 54.
14. **Skip — the guest nag modal and the Trade pill in the toolbar.** OnStock's Trade goes out to Jupiter from the right column (spec) — fine; do not put it in the chart toolbar where TradingView drops it first when space runs out.
15. **Adopt (Phase 2) — Split view as the model for the gap-history pane.** TradingView docks screeners/calendars into a bottom region at 50% and remembers size and order. OnStock's gap-history pane under the chart is the same shape; give it a drag handle and persist its height with the column width.

---

## Sources

Live pages read in the browser on 2026-09-06 (guest):

- https://www.tradingview.com/chart/ (and with `?symbol=`, `&interval=`, `&theme=`, `&style=`, `&timeframe=` variants listed in §5)
- https://www.tradingview.com/chart/3jUkqZqY/ (a third-party shared layout, view-only)
- https://www.tradingview.com/symbols/NASDAQ-AAPL/
- https://www.tradingview.com/screener/
- https://www.tradingview.com/heatmap/stock/

TradingView Help Center, blog and docs (fetched):

- https://www.tradingview.com/support/folders/43000547370-i-can-t-find-a-certain-feature-or-setting/
- https://www.tradingview.com/support/solutions/43000753069-simple-steps-to-split-view-mode/
- https://www.tradingview.com/support/solutions/43000762824-how-to-change-the-time-frame-quickly/
- https://www.tradingview.com/support/solutions/43000689717-how-to-edit-tab-title/
- https://www.tradingview.com/support/solutions/43000673888-tradingview-desktop-releases-and-release-notes/
- https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/
- https://www.tradingview.com/support/solutions/43000480047-how-to-share-protect-my-charts/
- https://www.tradingview.com/support/solutions/43000606515-how-to-share-charts-in-view-only-mode/
- https://www.tradingview.com/support/solutions/43000512928-how-can-i-enable-disable-the-drawings-toolbar/
- https://www.tradingview.com/support/solutions/43000478062-how-to-enable-disable-dark-theme/
- https://www.tradingview.com/support/solutions/43000659671-quick-search-on-tradingview-find-anything-super-fast/
- https://www.tradingview.com/blog/en/in-app-theme-management-and-customizable-tabs-in-tradingview-desktop-32720
- https://www.tradingview.com/blog/en/tradingview-desktop-updated-new-tab-and-sync-58473/
- https://www.tradingview.com/blog/en/minimalistic-display-mode-for-watchlist-41721/
- https://www.tradingview.com/charting-library-docs/latest/core_concepts/Resolution/

Third-party (used only to locate things, then verified live):

- https://alertatron.com/docs/adjusting-the-symbol-and-time-interval-on-saved-tradingview-charts (page body did not render for the fetcher; the `?symbol=&interval=` pattern it names was verified on the live site instead)
- Search-result snippet quoting `https://www.tradingview.com/chart/3jUkqZqY/?symbol=BINANCE:BTCUSDT&interval=60` (dirask.com) — the layout id was used for the §5 view-only test; the query-override half of that URL was not verified.
