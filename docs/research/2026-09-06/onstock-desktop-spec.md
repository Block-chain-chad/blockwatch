# OnStock desktop — adoption spec

Written 2026-09-06 from the TradingView teardown in `tradingview/` (index at `tradingview/00-teardown-index.md`), the 2026-09-05 desktop audit and charts-licence research (branch `research/2026-09-05`), and the code on `release/onstock` at `1ddae1b`. Nothing here has been built; PR #2's "dock the asset screen" increment is the only desktop code that exists, and Phase 1 below replaces it.

**Revised the same day** after five filler documents landed behind the critic's pass: **14** (Compare, overlays and spreads — the document behind Adapt #1 and Skip #20), **15** (the pricing table read from the HTML — an errata sheet that corrects plan cells in 01/05/07/10/13 and two sentences in this spec's §5), **16** (data provenance on the chart and every chart-page notice), **17** (the Supercharts frame measured live: toolbar heights, panel widths, collapse thresholds, the tab title and the URL grammar) and **18** (the Details widget block by block, plus Yield Curves, Fundamental Graphs, Portfolio, Options and Macro Maps). Where a number in §1 changed because of 17, or a sentence in §5 because of 15, the bracketed reference says so; nothing else was reopened.

**How to read this.** §1 makes the owner's approved mockup precise (regions, pixels, breakpoints). §2–§4 are the adopt / adapt / skip lists, each item with one reason. §5 is what a paid tier may gate given the Advanced Charts licence. §6 is the Phase-1 build brief — file by file, rule by rule — written so a builder can execute it without asking anything. §7 is the short list of things only the owner can decide. Plain words throughout; where a TradingView label is quoted it is quoted exactly.

**The one sentence.** OnStock's desktop is TradingView's frame — top bar, icon rail, chart in the middle, watchlist on the right, tabs under the chart — with the **gap** in every slot TradingView reserves for price: the watchlist column, the legend, the alert line, the order-info strip.

---

## 1. The desktop grammar, made precise

### 1.1 The approved layout

The owner approved this in a mockup on 2026-09-06:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR   [wordmark]  [symbol search ……………]        [session strip]  [profile] │ 48px
├────┬─────────────────────────────────────────────────────────┬───────────────┤
│    │ CHART TOOLBAR  [Gap|Candles] [1m 5m 15m 1h 4h 1D] [SMA…] │ RIGHT COLUMN  │
│ R  │                 O H L C · change · vol · time            │ ┌───────────┐ │
│ A  │ ┌─────────────────────────────────────────────────────┐ │ │ Watchlist ▾│ │
│ I  │ │                                                     │ │ │ rows …    │ │
│ L  │ │                   CENTER CHART                      │ │ │           │ │
│    │ │                                                     │ │ ├───────────┤ │
│ H  │ └─────────────────────────────────────────────────────┘ │ │ NVDAx     │ │
│ G  │ ┌─ Gap history ───────────────────────────────────────┐ │ │ +0.65%    │ │
│ F  │ └─────────────────────────────────────────────────────┘ │ │ token/share│ │
│ N  │ [Statistics] [News] [Trades on] [Also tokenized by]     │ │ bid · ask │ │
│ T  │ … tab content …                                        │ │ [Trade ↗] │ │
│    │                                                         │ └───────────┘ │
└────┴─────────────────────────────────────────────────────────┴───────────────┘
 64px            1fr (min 560px)                                  320–400px
```

- **Top bar**: wordmark (the existing `Header` brand SVG + "OnStock"), a symbol-search field, the session strip (the four-state copy that `Home.jsx` already owns), the profile avatar.
- **Left nav rail**: the five `TabBar` destinations as a vertical column of icon + 10 px label — Home, Gaps, Folders, News, Trade — replacing the bottom tab bar at ≥ 1024 px.
- **Center**: a chart workspace. Toolbar above the chart (Gap | Candles, intervals, indicators, the OHLC/readout), the chart, the gap-history pane under it, then a tab strip: Statistics · News · Trades on · Also tokenized by.
- **Right column**: the watchlist on top (with a list-name menu so a folder can drive it, and the All/Stocks/ETFs/Bonds chips), and beneath it the selected asset's numbers: the gap panel (gap %, gap bar, token price + age, share price + age), bid/ask, the action icons (star, bell, folder, share) and the Trade button. When the chips are on **Bonds**, `TreasuryYields` renders above the rows.
- **Takeovers**: choosing Gaps, Folders, News or Trade on the rail replaces the center with that screen; picking any asset from a takeover (a Screener row, a folder row, a digest headline) returns the chart with that asset selected and highlights Home. Home on desktop *is* the chart workspace — the phone Home's four jobs are split across the top bar (search, session), the right column (watchlist, chips, yields) and the center (the chart).
- **Phones**: nothing changes. The desktop shell mounts only at ≥ 1024 px and only in a browser, never inside the Capacitor WebView (see §7 for the iPad question).

### 1.2 Regions, widths, heights

All values are CSS pixels. Tailwind v4 is in use, so `lg` = 64rem = **1024 px**, `xl` = 80rem = **1280 px**, `2xl` = 96rem = **1536 px**. New tokens go in `src/index.css` `:root`.

| Region | Width | Height | Scrolls? | Token |
|---|---|---|---|---|
| Shell | full window width (no `--content-max` cap on desktop — see §7 Q1) | `100dvh` | no | — |
| Top bar | full width | **48** | no | `--topbar-h: 48px` |
| Nav rail | **64** | `100dvh − 48` | no | `--rail-w: 64px` |
| Center | `1fr`, min **560** | `100dvh − 48` | yes (own `overflow-y: auto`) | — |
| Right column | **320** at 1024–1279 · **360** at 1280–1535 · **400** at ≥ 1536 (TradingView opens its panel at exactly **300**, floors it at **200**, collapses it when dragged below that, and lets it grow until the chart is **296** wide [17 §2.1]; Phase 1 keeps the fixed widths because the phone `AssetRow` needs them, and B13's draggable column copies TradingView's three numbers) | `100dvh − 48` | yes (own scroll) | `--right-col` |
| Watchlist block (top of right column) | full column | `flex: 1 1 50%`, min **200** | yes | — |
| Asset numbers block (bottom of right column) | full column | auto | with the column | — |
| Chart toolbar | center width | **38** (was 40; every TradingView toolbar row measures 38 px with 28-px pills inside it, the bottom bar 39 [17 §1.1–1.2, §1.5]) | no | — |
| Gap chart (`DualLineChart`) | center width − 16 | `clamp(240px, 38vh, 420px)` | — | — |
| Gap history (`PremiumChart`) | center width − 16 | **96** | — | — |
| Candles chart (`CandleChart`) | center width − 16 | `clamp(280px, 42vh, 480px)` main + **96** RSI pane when on | — | — |
| Tab strip | center width | **40** | no | — |
| Tab panel content | max **720**, left-aligned inside the center gutter | auto | with the center | — |
| Takeover screens (Gaps / Folders / News / Trade) | max **640**, centred in the center region | auto | with the center | — |

Gutters inside the center are 24 px (design system §3 "Screen gutter 24 desktop"); TradingView's own gutters between regions are 4 px and its icon rails are 52 px (drawings) and 45 px (widget strip) [17 §1.1] — OnStock's 64-px rail is wider only because it carries 10-px labels. Row height in the watchlist stays the phone `AssetRow` (a touch-height row, 56 px). Measured on TradingView [17 §2.2–2.3]: table rows are **31 px** (14 px/400 text, 28-px column header, 36–37-px section headers, 48-px panel header) and the two-line "minimalistic" rows are **43 px** — so OnStock's 56-px row is the minimalistic shape, and the denser 31-px table row is Phase 2 (§3 item 4). Column proportions at 300 px are Symbol 78 / Last 73 / Chg 68 / Chg% 60 with a 12-px flag gutter; the Chg% column is the only one floored above 40 px — the gap column takes that slot in Phase 2 so the thesis number never truncates.

### 1.3 Breakpoints and what collapses

| Viewport | Behaviour |
|---|---|
| < 1024 | The phone tree, byte-identical to today (Home list/table, bottom `TabBar`, `AssetDetail` as a full-screen overlay, `SearchOverlay`, bottom sheets). |
| 1024–1279 | Desktop shell. Right column 320: `WatchlistPane` rows get `barWidth={64}`; the session strip in the top bar shows dot + short word only ("Open", "Pre-market", "After hours", "Overnight") with the full sentence as a `title` tooltip; the symbol-search field is 240 wide. The chart toolbar's **Auto / Latest / Reset / Log** buttons drop their labels and keep icon + tooltip (TradingView drops the Indicators / Alert / Replay labels at ≈1165 px, by measuring the toolbar rather than by breakpoint [17 §3.1–3.2]). The tab strip scrolls horizontally if it overflows. |
| 1280–1535 | Right column 360, `barWidth={88}` (the phone default), search field 320, session strip shows the short word plus the "Widest gap" link when the market is shut. |
| ≥ 1536 | Right column 400; nothing else changes (the chart absorbs the width). |
| Any desktop width, Shift+F | Fullscreen chart: rail and right column hidden, top bar stays, center fills; Esc or Shift+F again restores. Not persisted. |

Nothing else collapses in Phase 1. The earlier claim that "TradingView's layout is the same from 1024 up" was wrong: measured live [17 §3.2], TradingView drops toolbar labels between 1160 and 1170 px, hides Publish and the Trade label below ≈1000, hides the right widget strip below ≈560, and swaps the nine range buttons for a `Date Range` dropdown when the **chart area** (not the viewport) is narrower than ≈440 px — all by measuring its own toolbar against two hidden clones, never by media queries, and never with a "…" overflow menu. With a 320-px column at 1024 OnStock's chart is ≈560 wide, so the interval chips never need to collapse; do not build an overflow menu. What TradingView's collapse does teach is the order of sacrifice: labels first, then the marketing pill (Publish), then the Trade pill, then the widget strip — the chart is the last thing to shrink.

### 1.4 State that the shell owns

The desktop has no overlay stack. Its state lives in `App.jsx` (already the owner of `tab` and `openAssetId`) plus two new pieces:

| State | Where | Persistence | Meaning |
|---|---|---|---|
| `tab` | `App.jsx` (exists) | none | which rail item is lit; `'home'` = the chart workspace |
| `openAssetId` | `App.jsx` (exists) | desktop: mirrored to `localStorage` `bw.desktop.asset.v1` | phone: the overlay's asset; desktop: the selected asset in the center and right column |
| `listSource` | `App.jsx` (new) | `localStorage` `bw.desktop.list.v1` | `'watchlist'` or a folder id — what the right column lists |
| `chartMode`, `range`, `side`, `timeframe`, `indicators` | `ChartWorkspace` (new) | `localStorage` `bw.desktop.chart.v1` | TradingView's rule: settings belong to the chart slot and follow you across symbols (see index item 17). They must **not** reset when the asset changes. |
| `detailTab` | `DetailTabs` (new) | `localStorage` `bw.desktop.tab.v1` | which tab under the chart is open |
| `fullscreen` | `DesktopShell` (new) | none | Shift+F |

Selection on first load: `bw.desktop.asset.v1` → else `getRecentViews()[0]` → else `watchlistIds[0]` → else null (center shows an empty state: "Search for a ticker or pick one from your watchlist"). TradingView restores "the latest used interval and symbol" the same way — a bare `/chart/` reopens the last-used symbol and interval from `localStorage`, and a first-ever visit gets AAPL · 1D · Candles [17 §5–6].

---

## 2. ADOPT — behaviours OnStock takes on as-is

Grouped by phase. "Reason" is the one-line justification; the teardown file in brackets is where the detail lives.

### Phase 1 — build now

The layout, the chart-first center, the rail, the right column, the tabs under the chart, the top bar with symbol search, interval typing, and the crosshair/last-price polish that Lightweight Charts 5.2 already supports.

| # | Behaviour (TradingView's name) | Reason |
|---|---|---|
| A1 | **The three-toolbar frame**: top bar, left rail, right column, thin toolbar over the chart [01]. | It is the layout every trader has in muscle memory; the owner approved it. |
| A2 | **Right column = watchlist over details** (TradingView's Watchlist + Details panel) [01, 05]. | Details under the list is where TradingView puts "the numbers for the symbol you just clicked"; OnStock's numbers are the gap panel. |
| A3 | **Watchlist list-name menu** ("Open list…") with Watchlist + each folder [05]. | Lets a folder drive the right column without leaving the chart; the phone already has folders. |
| A4 | **Single click switches the chart; ↓ / Space next symbol, ↑ / Shift+Space previous; Alt+W toggles the current asset in the watchlist** [05, 09]. | The one watchlist behaviour desktop users bring with them. |
| A5 | **Type-to-search: Ctrl+K or any letter opens the symbol search with that letter typed; ↑/↓/Enter pick; Esc closes** [05, 09]. | "The single most TradingView-on-a-PC thing to add" (09). `SearchOverlay`'s scoring already exists. |
| A6 | **Interval typing: a digit or `,` opens a small prompt; `1 5 15 60 240` = minutes, `D` = day; in Gap mode `1D 1W 1M 3M 1Y`; Enter applies, Esc cancels; unsupported values snap to the nearest offered chip** [01, 09]. | Cheap; OnStock has six buckets and five ranges, all expressible. |
| A7 | **Interval and indicator chips on the toolbar, favourites-style, with unsupported ones greyed rather than hidden** [01]. | TradingView greys what the data cannot serve; `coerceTimeframe` today silently lands elsewhere. |
| A8 | **Status line (legend) in the top-left of the chart**: ticker · interval · O H L C · change · volume, values following the crosshair [02, 09]; inset 4 px from the pane corner, symbol and interval at 16 px as buttons, values at 13 px [17 §1.6]. | Replaces the phone caption row with the desktop idiom; costs no data. |
| A9 | **Auto button + "Reset chart view" (Alt+R) + scroll-to-latest** on the Candles chart [02, 09]. Phase 1 puts them in the toolbar; TradingView draws them as a hover-only cluster centred 32 px above the time scale [17 §1.7] — that placement is B16. | Lightweight Charts gives wheel zoom / drag pan / axis drag for free; the visible Auto chip is what TradingView adds. Also fixes the refit-on-every-refresh bug (§6.9). |
| A10 | **Crosshair Magnet mode on the Candles chart** (snap to OHLC) [09]. | TradingView's default; `CrosshairMode.Magnet` is one option. Phone keeps `Normal`. |
| A11 | **Crosshair sync between the Gap chart and the gap-history pane** [06, 09]. | One hover, both readouts move — TradingView's "Crosshair" sync, in the only place OnStock has two charts today. |
| A12 | **Last-price label and line on** (already the library default) and **Alt+L logarithmic toggle** [02, 09]. | Free; users look for the log button first. |
| A13 | **Countdown to bar close on the token candles only**, hidden on the delayed stock side [02, 09]. | TradingView's own rule: no countdown on intervals shorter than the feed's delay. |
| A14 | **Shift+F fullscreen (hide rail + right column), Esc restores; Ctrl+/ opens the shortcut list** [06, 09]. | Two small features that make the rest discoverable. |
| A15 | **Settings follow the chart slot**: mode, interval, indicators persist across asset switches [11]. | "When navigating between symbols, your layout keeps its settings"; today's remount resets everything. |
| A16 | **Tabs under the chart** for the long tail (Statistics, News, Trades on, Also tokenized by) [05 §3 symbol page tabs]. | The symbol page's tab model; the owner asked for exactly these four. |
| A17 | **Sheets become centred dialogs at ≥ 1024** (Add to folder, Set alert, Share, Swap) [01]. | A phone-width bottom sheet rising in the middle of a 1440 px window reads as broken; one class change in `Sheet.jsx`. |
| A18 | **Session status in the top bar** (TradingView's "Open market status" chip) [02]. | OnStock's four-state copy is better than TradingView's popup; it belongs where the eye rests. |
| A19 | **Restore on load**: last asset, list source, chart settings, open tab [13]. | TradingView Desktop restores "the ticker, interval, and active watchlist upon launch". |
| A20 | **12 px scale text on desktop** (11 stays on phones) [11]. | TradingView's default; the one font control in the product. |
| A21 | **The browser-tab title is the quote**: `NVDAx 12.34 ▲ +0.65%` while a chart is open (U+25B2/U+25BC, U+2212 minus, ticker-only before the first quote, no product suffix); in Gap mode the gap replaces the price — `NVDAx gap +0.42% ▲`; static titles on the takeover screens (`Gaps — OnStock`) [17 §4]. | TradingView's grammar exactly, plus the one thing it cannot do: the tab answers the product's question. Favicon never changes (TradingView's web app never changes it either). |
| A22 | **A tooltip with the shortcut chip on every toolbar control**: 13-px text, 24 px tall, 4 px below the bar, the keys rendered as a chip after the text; the text lives in a `data-tooltip` attribute that doubles as the accessible name [17 §6]. | It is how every TradingView shortcut gets discovered; costs a `title` per button. |
| A23 | **Provenance in the legend, TradingView's three-segment shape**: `{session} · {cadence} · {venue} by {source}` — token leg "24/7 · One update every 30 seconds · Raydium by GeckoTerminal", stock leg "Market closed · Data is delayed · NASDAQ by Yahoo Finance" — plus a **D** badge on the stock leg and on delayed watchlist rows whose tooltip says the delay in minutes ("Quotes are delayed by 15 min") [16 §1.1–1.3]. | TradingView puts "what am I looking at, how old is it, where did it come from" in the legend, not a footer; OnStock's better copy (`UpdatedAgo`, `stockAge`) is stranded under the chart today. |

### Phase 2 — needs primitives (or Advanced Charts)

Drawing tools and the indicator dialog. On Lightweight Charts these are series/pane **primitives** OnStock writes itself (TradingView publishes reference plugins); on Advanced Charts they come built in but under the licence in [08 §12]. Either way they are a separate project from Phase 1.

| # | Behaviour | Reason |
|---|---|---|
| B1 | **Seven drawing tools with TradingView's hotkeys**: Horizontal line (Alt+H), Horizontal ray (Alt+J), Trendline (Alt+T), Vertical line (Alt+V), Rectangle (Shift+Alt+R), Text, Price/Date range [03]. | The daily-use set; each is roughly one primitive. |
| B2 | **The shared drawing dialog Style / Text / Coordinates / Visibility** [03]. | One dialog shape is what makes tools learnable; build it once from a per-tool schema. |
| B3 | **Measure (Shift+click): Δ price, %, bars, elapsed time** — and on the Gap chart, Δ gap in percentage points [03, 09]. | Cheapest high-value tool; `subscribeClick` exists. |
| B4 | **Magnet Weak/Strong with Ctrl override, Keep drawing, Lock all, Hide all (Ctrl+Alt+H), Remove all with a count** [03]. | The utilities users expect at the bottom of the rail. |
| B5 | **Indicators dialog opened by `/`**: search box, Favorites, a short catalogue, per-indicator **Inputs / Style / Visibility** with **Defaults → Save as default / Reset settings** [04]. | Three checkboxes do not scale; the schema-generated dialog does. |
| B6 | **Indicator templates with "Remember Symbol"** and two or three shipped presets ("Gap watch", "Momentum") [04]. | TradingView ships six built-ins; a saved indicator set is the desktop's saved view. |
| B7 | **Move to pane / Pin to scale (Right / Left / No scale) / Collapse pane** [04, 02]. | Lightweight Charts v5 has panes; the RSI pane is hard-coded at index 1 today. |
| B8 | **Settings gear with Symbol / Status line / Scales and lines / Canvas tabs** [02]: Body/Borders/Wick colours, "Color bars based on previous close", Previous close line, Precision, Timezone (Exchange / Local / UTC), scale mode **Regular / Percent / Indexed to 100 / Logarithmic** (all four `PriceScaleMode`s, with the Log→off trap: TradingView lands on Regular, not back on Percent [14 §3]), **"Scale price chart only"** (autoscale on the token candles alone; `autoscaleInfoProvider` returning `null` on the stock leg [14]), **"Symbol name label"** on the axis auto-enabled when two series share a scale (`title` + `lastValueVisible` per series [14 §2.5]), grid mode, crosshair style, margins, "Save chart left edge position when changing interval". | Every row maps one-to-one onto a Lightweight Charts option; it is a settings surface, not chart work. |
| B9 | **Right-click on the chart: "Add alert on X at price…", "Copy price", "Lock vertical cursor line by time", "Settings…"; the Plus button on the price scale for alerts and lines** [02, 09]. | Pure UI on top of alerts that exist. |
| B10 | **Go to date (Alt+G)** with the first-available-bar marker, an empty canvas (no invented bars) past the floor, and a "History from {date}" row per leg in the Symbol Info dialog (B17) [09, 16 §6]. | Also discloses GeckoTerminal's shallow history honestly — per leg, because Yahoo daily is deep and GeckoTerminal is not. |
| B11 | **Events on the time scale: earnings, dividends, splits for the underlying; the tokenization news lightning marker** [02, 10]. | The moments a token and its share decouple. Finnhub already supplies earnings. |
| B12 | **Session shading at ~8 % alpha in the session hue, session breaks as thin rules** on the Candles chart [11]. | The single most on-thesis appearance feature: the gap opens when the stock is shut and the token is not. |
| B13 | **Draggable divider between the watchlist and the numbers** in the right column, and a **draggable column edge** with TradingView's numbers: 300 default, 200 minimum (dragging past it collapses the column to nothing), the chart never below 296, width persisted in `localStorage` (TradingView: `tradingview.widgetbar.layout-settings`); the watchlist/details split defaults to 50/50 with a 77-px watchlist floor [01, 05, 17 §2.1]. | TradingView's Watchlist/Details divider; small once the column exists. |
| B14 | **Snapshot: Alt+Ctrl+S save image, Shift+Ctrl+S copy image** via `chart.takeScreenshot()` [09]. | Two hotkeys and a canvas. Skip the hosted-link variant. |
| B15 | **Symbol and chart state in the URL as query parameters, TradingView's grammar**: `/chart?symbol=NVDAx&interval=1h&mode=gap&theme=dark` (was a hash); `replaceState` on change so Back leaves the app rather than stepping through symbols; a bare `/chart` restores last-used; `/chart/<id>` reserved for saved layouts, view-only for other people [06, 17 §5]. | TradingView rewrites `?symbol=EXCHANGE%3ATICKER` on every symbol change and reads `interval`, `theme`, `style` back; query strings survive copy-paste and unfurl in chat, fragments do not. |
| B16 | **The bottom-centre navigation cluster**: 24-px buttons with 8-px gaps, centred, 32 px above the time scale, hidden until hover — Zoom out / Zoom in (Ctrl+↓ / Ctrl+↑), scroll left / right, "Reset chart view" (Alt+R) visible only once the view has moved, and "Scroll to the most recent bar" (Alt+Shift+→) at the pane's right edge [17 §1.7]. | Lightweight Charts has no built-in; about forty lines; it is where TradingView users' hands go. |
| B17 | **A Symbol Info dialog** from the legend's **More** button and the series right-click: Symbol, Description, **Exchange** (the DEX pool) vs **Listed Exchange** (NASDAQ for the underlying), Chain, Mint, Pool, Issuer, Backing, Currency, Tick size / precision, **Session** of the underlying (`0930-1600`, `America/New_York`) vs token `24x7`, Data status (streaming / delayed_streaming + delay), ISIN of the underlying, "History from {date}" per leg [16 §3]. | The field set is the library's `LibrarySymbolInfo` — the schema OnStock would need anyway if it ever adopts Advanced Charts. |
| B18 | **Two more blocks in the right column, TradingView's Details grammar**: **Price ranges** (`24H RANGE` token · `DAY'S RANGE` stock · `52WK RANGE` stock as two-sided bars, one per leg with its own age) and a **Performance** row (gap change over 1D / 1W / 1M); a **Settings** gear that hides blocks by title, all on by default, stored per user (Supabase profile JSON, `localStorage` for guests, sign-in prompt on first toggle) [18 §1.2–1.3, 14 §6]. | The two range bars are TradingView's most-read block after the price; the four numbers already exist (`CompareRow "Range (1d)"`, Finnhub `52WeekHigh/Low`). The gear is the only personalisation TradingView offers on this panel. |
| B19 | **Per-symbol notes**: **Add note** in the numbers header, Alt+N, a dot on the watchlist row for symbols with a note, all notes on the account sheet; plain text; gated on sign-in exactly as TradingView gates a guest [18 §2]. | One table `notes(user_id, asset_id, body, created_at)`; skip TradingView's "NON-SYMBOL RELATED NOTES" migration artefact and rich text. |
| B20 | **A chart-notices table with exact copy**, in the legend, modelled on TradingView's [16 §4]: stale feed ("Connection hiccup — showing prices from 3m ago", already written, moved into the legend), **delisted token** ("This token no longer trades — last pool activity 14 days ago"), thin pool (the existing "Thinly traded" card as a legend badge), **quota hit** ("GeckoTerminal is rate-limiting us — chart data may be up to N minutes old. Retrying…" with a Restore-connection-style retry button), **"No data here"** for a token with no pool. | TradingView's DEX rule of deleting pools that "lost liquidity and/or trading volume" is the precedent for a delisted label; the connection-closed pop-up (what happened, what it costs, one button to recover) is the shape to copy — not its socket counting. |
| B21 | **Table view** (right-click → "Table view"): one row per bar, columns for the token, the stock and the gap, newest at the top, hidden indicators excluded, "matches exactly how they appear on the chart" [16 §7.1]. | Cheap on Lightweight Charts data and the honest way to expose the gap series numerically without an export. |
| B22 | **Correlation Coefficient (token, stock)** as a pane indicator with TradingView's three inputs (Symbol, Length 20, Source Close) and levels at 1 / 0 / −1; and the stock leg's **legend row** with **Hide** (`showStock`), **Settings** (Line / Candles / Area — TradingView's Overlay study allows candles), no **Remove** [14 §2.2, §6]. | CC is the one built-in TradingView ships for exactly this question; the stock leg is permanent, so its row is a study row minus Remove. |
| B23 | **`TreasuryYields` with dated comparison rows** — **Current / 1 month ago / 1 year ago** across the key tenors, adding `DGS3MO` and `DGS5` (3M and 5Y are TradingView's key tenors) — displayed as `US03M / US02Y / US05Y / US10Y / US30Y` with **Source** ("FRED, H.15"), **Frequency** ("daily, prior business day") and **Units** ("percent"), keeping OnStock's 2s10s spread line [18 §3, 16 §8]. | FRED's CSV already returns the full history, so three rows cost no new upstream; TradingView's Yield Curves page has **no** tenor-spread control at all, so the spread line is a place OnStock is already ahead — do not remove it to "match". |

### Phase 3 — layouts, alerts parity, screener

| # | Behaviour | Reason |
|---|---|---|
| C1 | **Layout setup with three grids: 1, 2 side-by-side, 2 stacked, 2×2**; **Maximize** (Alt+Enter / Alt+click), Tab to cycle, draggable borders (Shift for several, double-click resets) [06]. | Token \| stock side by side is the thesis in one screen; TradingView's first grids were exactly these. |
| C2 | **Sync toggles with TradingView's labels: Symbol, Interval, Crosshair, Time, Date range** [06]. | Crosshair and Date range first; interval sync rarely applies (1 m token vs daily stock). |
| C3 | **Saved layouts: named, autosaved, one URL each, Make a copy, read-only share snapshot; soft-delete with `UndoToast`** [06]. | TradingView's "cannot be restored" is not worth copying; the rest is. |
| C4 | **Alerts dialog parity**: Symbols → Condition with **Crossing / Crossing Up / Crossing Down** → Trigger **Only Once / Every Time** → Expiration (2 months, **Open-ended** toggle) → Name / Message with placeholders → Notifications (App, Email, Webhook) + **Notification schedule** [07]. | The current sheet infers direction and has no expiry; stale alerts on delisted tokens pile up. |
| C5 | **Alerts panel with Alerts / Log tabs, status badges, sort/search, CSV export; alert marks on the price scale that blink on fire; "Only active alerts"** [07]. | Rules and events exist; only the desktop surface is missing. |
| C6 | **Server-side alert evaluation with email and webhook delivery** [07, 13]. | "Close TradingView and alerts continue" is the prerequisite for any paid alert feature (§5). |
| C7 | **Screener as a table with named screens**: Save screen / Make a copy / Export screen results / Open screen…, column sets, active/inactive filter chips with Reset all / Remove inactive / Remove all, "Primary issuer only" (TradingView's Primary listing crown), Table/Chart view [10]. | The phone screener is a sorted list; desktop has room for the real shell. |
| C8 | **Heatmap coloured by gap %** with `Size by` 24h volume / liquidity / mono, legend-as-filter, Classic / Color-blind / Monochrome schemes [10]. | The best structural fit on the whole surface for a gap product. |
| C9 | **Settings page with hash-anchored sections** (`#account`, `#appearance`, `#notifications`, `#sessions`), Active sessions + "Log out everywhere", 2FA with backup codes, 30-day deletion grace [13]. | The stacked Profile sheets do not scale to a desktop; the security items are what a cautious owner wants. |
| C10 | **Object tree** listing candles, gap line, indicators, alert lines and drawings with eye/lock icons [03]. | Needed once drawings and alert lines share a canvas. |
| C11 | **Split view for News beside the chart**: TradingView's "Move overlay to split-view" docks a product at 50 % and remembers size and order; OnStock docks the news lane beside the chart the same way, with the gap-history pane's height and the column width persisted in the same `bw.desktop.*` keys [17 §7, 18 §0]. | News is the one product a gap trader reads while watching a chart; Phase 1's takeover model stands until then. |
| C12 | **"Why does my chart look wrong" Learn cards**, one per TradingView article that maps: chart price ≠ watchlist price (gap uses the last stock quote, chart uses candle close), a missing candle (inactivity gap vs pool outage), volume differs (GeckoTerminal counts one pool, not all venues), synthetic pairs (USD price via the SOL/USDC route), holidays (model NYSE holidays instead of `market.js`'s "briefly wrong" fallback) [16 §5]. | TradingView answers each with a setting name and a one-line cause; OnStock has the causes and no cards. |

---

## 3. ADAPT — reshaped around the gap thesis

| # | TradingView piece | OnStock's version | Reason |
|---|---|---|---|
| 1 | The **Compare** button ("Compare symbols" → **Same % scale** / **New price scale** / **New pane**; the main scale flips to Percent because arbitrary symbols differ in level) [01, 14 §1] | The Gap chart **is** Compare, permanently, with **Regular** (dollars) as the default: the two legs are the same asset at almost the same price, so the shared dollar axis is readable and the gap is literally the vertical distance — the "collapse" TradingView warns about never happens. **Percent** and **Indexed to 100** are offered as modes in Phase 2 (B8) to answer "which leg ran ahead"; Indexed to 100 gets two anchors, "since visible start" (TradingView re-bases at the first *visible* bar, so the index moves as you scroll) and "since listing". A left scale for the stock leg (TradingView's "New price scale") is an option for the re-based modes only, never the default, and scales are never lettered A/B because a third scale will not exist. | OnStock's comparison is the product, not a feature to switch on; Compare is free on every TradingView plan and OnStock gates nothing here either. |
| 2 | An indicator pane under the price pane [04] | The **gap history** pane is the permanent second pane under the chart (Gap mode today; in Candles mode from Phase 2 as a series on the gap scale). | The gap is OnStock's native "indicator"; RSI/Bollinger *of the gap* is the Phase 2 indicator-on-indicator. |
| 3 | The **Details** section under the watchlist — a fixed identity/quote header (name, exchange, type tags, price, currency, **D**/**R** feed badge, "Market closed", "Last update at Sep 4, 16:59 GMT-7"), then titled blocks in a fixed order each ending in one "More …" button, hideable from a Settings checklist [05, 18 §1] | The **gap panel** as block 0: gap %, gap bar, token price with its age, share price with its age (pre/post/closed wording) and its delayed badge, bid/ask from the two-quote spread, the action icons, the Trade button. Phase 2 adds Price ranges and Performance (B18). The long tail (Key stats, Analyst rating, Earnings, News, Profile) stays in the tabs under the chart — the owner's four tabs, not TradingView's column — see §7 Q15. | TradingView shows bid/ask and day range; OnStock shows the two legs and their freshness because the two legs have different ages. TradingView's "Last update at …" line is the only cadence statement it makes; OnStock prints one per leg. |
| 4 | Watchlist columns Last / Change / Change % / Volume [05] | Compact rows keep the phone `AssetRow` (gap bar + gap % + token/stock). Phase 2 adds a **table view** with columns **Gap %**, **Token**, **Stock**, **Chg % 24h**, **Volume**, header-click sort asc → desc → custom, sections, and a Table/compact toggle. | The gap is a column, not a hover. |
| 5 | **Channel alerts** (Entering / Exiting / Inside / Outside) on a drawn band [07] | The **gap-drift alert** is the channel alert: a ±threshold band on the gap series with **Exiting** (today's behaviour) and, in Phase 3, **Entering** ("gap closes") plus asymmetric bands. Drawn as a band on the gap history pane. | A moving condition that TradingView cannot express on a plain price chart. |
| 6 | The **Trade** button → broker list → order ticket docked right [12] | The right column's **Trade** button: wallet connected → `SwapSheet` (centred dialog in Phase 1; docked ticket in Phase 3) with an **Order info** strip showing minimum received, price impact, fees and **the gap at the quoted price**; no wallet → "Trade on Jupiter ↗" as today. Statuses **Placing / Filled / Rejected** map onto swap `build` / `broadcast` phases and on-chain confirmation, never printing "failed" after broadcast. | "TradingView doesn't process your trades and acts as an interface only" is OnStock's own promise; the wallet popup plays the OAuth "Continue" tab. |
| 7 | **Yield Curves** widget in the right toolbar — US Treasuries by default, three dated rows (today / one month ago / one year ago) across eleven tenors, Tenor vs Linear scale, Clone, country Add, Map tab, heatmap mode, CSV; no tenor-spread control [01, 18 §3] | `TreasuryYields` appears in the right column when the chips are on **Bonds** (the phone Home rule, moved). Phase 2 (B23) takes the one idea worth taking — the three dated rows — and TradingView's economic-series vocabulary: display FRED's `DGS*` ids as `US02Y / US10Y / US30Y` with **Source**, **Frequency** and **Units** attached, which forces the "as of" date onto the row [16 §8]. The 2s10s spread line stays. | Tokenized bond products are priced off the curve; it is context for those rows, not a widget of its own. |
| 8 | **Market status** popup with the exchange session timeline [02] | The **session strip** in the top bar with OnStock's four states and the "gaps read wider than they are" honesty in pre/post. | OnStock's copy is more useful than TradingView's popup for a product whose number depends on the session. |
| 9 | "**Data is delayed** → Learn more" as a purchase prompt, and the **Market Status pop-up** behind the legend's status icon: three sections (**Market closed** with a session ruler and "Exchange timezone: New York (UTC-4)"; **One update every 5 seconds**; **NASDAQ by Cboe One**), each with a **Learn more** that sells [13, 16 §1.3] | A **D** badge on the stock leg (legend, gap panel, watchlist row) whose tooltip states the delay in minutes (A23), and — Phase 2 — the same three-section pop-up with OnStock's copy: "Market closed — opens for pre-market in 1 day 21 h · Exchange timezone: New York (UTC-4)" with the ruler; "Data is delayed — the share price is Yahoo's regular-session quote, so between 16:00 and 20:00 the token can move on news the stock leg has not printed yet; that is why the gap is caveated in extended hours"; "Solana by GeckoTerminal — pool X on Raydium, 24h volume $Y". **Learn more** opens a Learn card, never a price page. | Yahoo is delayed by design; explain, do not sell. TradingView's pop-up structure is right; only its third button is a sale. |
| 10 | **Symbol/interval sync groups** by emoji [06] | Phase 3's 2-up layout has one built-in group: **the token and its underlying move together** — change the token in one pane and the sibling shows its share. | The only sync rule the gap thesis needs, and one TradingView lacks. |
| 11 | **Hotlists** (Volume gainers, Gap gainers…) in the list-name menu [05, 10] | Phase 3 "**Gap lists**" in the same menu: Widest premium, Widest discount, Most traded 24h. | Cheap from sorts that exist; TradingView paywalls hotlists, OnStock need not. |
| 12 | **Hotkeys that place orders** (Shift+B / Shift+S) [12] | Hotkeys that **open** the pre-filled ticket, never send. | The wallet signs; "Instant orders placement" cannot exist for a real swap and pretending otherwise misleads. |
| 13 | The **capability matrix** on broker profiles ("Supported / Not offered") [12] | A per-venue table on the Trade screen: spot swap ✓, limit orders — defer, brackets ✗ (alerts instead), DOM ✗, margin ✗. | TradingView's honesty about "Not offered" is what makes its broker list trustworthy. |
| 14 | **Events tab** (Ideas, Economic events…) [02] | Only **Earnings, Dividends, Splits** on the underlying and the tokenization news marker (Phase 2); a "stock market closed" shading band instead of an economic calendar. | Splits and dividends are exactly when a token and its share decouple; there is no source for the rest. |
| 15 | **Interval favourites and custom intervals** [01] | Six fixed chips; unsupported ones greyed with a tooltip ("No 1m bars for the stock side"); no custom intervals. | GeckoTerminal serves exactly these buckets. |
| 16 | **Countdown to bar close** on every symbol [02] | Token side only (see A13). | The stock side is delayed; a countdown there would lie. |
| 17 | **Alert presets** (five per user) [07] | One "default drift alert" per folder in Phase 3 (e.g. ±1 %, every time, email). | Folders exist; five named presets is overkill. |
| 18 | **Watermark** (symbol + interval on the canvas) [02, 11] | Off; the ticker · interval sits in the legend and the "Charts by TradingView" caption keeps attribution. | TradingView itself recommends letting users opt in. |
| 19 | **News Flow** filters (Watchlist / Instrument / Provider / Format) [10] | Phase 2 exposes the client-side source whitelist as a **Provider** filter and scopes the feed to the current watchlist; the two lanes (tokenization beat vs company headlines) are **Format**. | Small change to a feed that already exists; keep the fixed-query design. |
| 20 | **Spread symbols** typed into Symbol Search (`AAPL / XAUUSD`; four documented operators, six in the engine; a 10-symbol cap; intraday bars rebuilt server-side from 1-minute legs) [14 §4] | Print the gap **as a spread in TradingView's grammar** — `AAPLx / AAPL − 1`, their operators, their spacing — as the gap pane's legend title and in the alert dialog. No parser, no free-form expressions (Skip #20). | A TradingView user reads it as a spread at a glance; OnStock computes exactly one spread, server-side, from two feeds it controls. |
| 21 | The **repaint warning** on spreads ("real-time bars are built on tick data, whereas historical bars are built from minute data … bars may mismatch"; "we strongly advise not to set alerts on spread charts") [14 §4–5] | The same one-line caveat on the gap series and inside the drift-alert dialog: "the stock leg is delayed; the gap at trigger time can differ from the gap you see later". A plain **price** alert on the stock leg only with the delayed-data caveat shown, and never on intervals shorter than the delay (TradingView's countdown rule, applied to alerts). | OnStock's gap "repaints" for a different reason (a delayed leg against a live one) but the honesty is the same; TradingView counts an alert on a compared symbol as a **technical** alert, and OnStock's drift alert is that alert. |
| 22 | **"Allow extend time scale"** in the Compare dialog (off by default: the compared 24/7 symbol is clipped to the main symbol's bars) [14 §2.5] | Reversed: the time axis is the token's 24/7 clock and the **stock** is the leg with holes — drawn flat-dotted through closed sessions, never clipping the token to market hours. | The gap opens when the stock is shut and the token is not; clipping would hide the product. |
| 23 | The **Products** button and the **overlay sheet** ("Move overlay to split-view · Collapse panel · Close"; the overlay hosts the full standalone product, docks at 50 %, and remembers size and order) [18 §0] | Phase 1 keeps the rail's **takeover** rule (Gaps / Folders / News / Trade replace the centre); Phase 3 (C11) adds split view for News beside the chart; "what was open and how wide" persists in the existing `bw.desktop.*` keys — the web equivalent of the desktop app's per-tab overlay memory. | One product beside the chart is worth docking; four is TradingView's scale, not OnStock's. |
| 24 | **Portfolio** — a transaction ledger (Buy / Sell / Deposit / Withdrawal / Dividend / Split, CSV import, benchmark, Sharpe / Sortino; 49 Help Center articles; 1 / 3 / 4 / 5 / 7 portfolios by plan) [18 §5] | Deferred, and a different model when it comes: holdings read from the **connected Solana wallet** (no manual transactions, no CSV), each holding shown with its live gap, and nothing more — no P&L accounting, no benchmark, no risk ratios. TradingView's **Holdings** column vocabulary (Allocation, Qty, Last price, Value, Daily gain %) is the right one; its Upcoming Earnings block is not. | The roadmap's Portfolio item (roadmap §3.2) is a wallet view, not an accounting product; copying the ledger would be a year of work for the wrong persona. |
| 25 | **Guest gating** in the Details panel: every number visible to a logged-out visitor; only **Add note**, **Metrics** and the index's "exclusive news" open a **Sign in** dialog on the action [18 §1] | `AccessGate` gates notes (B19) and the synced block preferences (B18) the same way — a sign-in dialog on the action, never a blurred panel — and leaves every number visible. | It is also what the Advanced Charts licence §2.7 would require later (§5.3). |

---

## 4. SKIP — with the reason

| # | TradingView feature | Why not |
|---|---|---|
| 1 | Pine Script, Pine Editor, Pine Screener, community scripts [04, 10] | A scripting runtime and a script marketplace are TradingView's moat and years of work; OnStock's indicator set is small and schema-driven. |
| 2 | Strategy Tester, Deep Backtesting [04] | No order engine; trades route out to Jupiter. The only idea to keep is a gap-close backtest curve, later. |
| 3 | Bar Replay [01, 03] | Needs deep intraday history GeckoTerminal does not serve; replaying a gap is unproven value. |
| 4 | DOM / Level 2, order brackets (TP/SL), OSO/OCO, Reverse position, leverage, margin, Account Manager summary fields [12] | No order book, no resting orders, no account, no margin on a DEX swap; a ladder would be invented data. |
| 5 | Paper Trading as a venue (for now) [12] | Worth doing later as "virtual USDC + real Jupiter quotes", but not before a real ticket exists (Phase 3). |
| 6 | Ideas, Minds, public/private chats, reputation, badges, moderators, Paid Spaces, Editors' Picks [05, 10, 13] | Social features drag moderation with them; TradingView is retiring public chats on 2026-09-30; the owner is security-cautious. |
| 7 | Second- and tick-based intervals, custom range bars, Renko / Kagi / Line Break / Point & Figure, Volume footprint, TPO, Session volume profile [01, 08] | They need tick or intrabar data OnStock does not have; GeckoTerminal's floor is one minute. |
| 8 | Gann, Fibonacci fans/arcs/spirals/wedges, pitchforks, harmonic patterns, Elliott, cycles, Image, X posts, Icons/Emojis, Table, Brush/Highlighter [03] | Heavy to build as primitives, rarely used by the gap-trader persona. A plain Fib retracement is the only one worth reconsidering. |
| 9 | Real-time exchange data add-ons, professional/non-professional status, the "US Stock Markets" bundle [08, 13] | These exist because exchanges charge per-user fees; OnStock's DEX candles are free real-time and its stock data is delayed Yahoo. |
| 10 | Free-plan ads, "Ad blocker detected" wall [08, 13] | No ads, ever; it would cost trust for pennies. |
| 11 | The five-tier ladder and the hidden Expert tier [08] | Two tiers (Free + one paid) are enough; see §5. |
| 12 | Desktop app tabs, tab linking by colour tag, detaching tabs into windows, proxy settings, credential autofill [06, 13] | OnStock is a web app plus a Capacitor shell, not Electron; the browser already has tabs and windows. |
| 13 | Language subdomains [13] | One domain; if localisation ever happens, store the language on the account. |
| 14 | Financials tab, Documents tab, Forecasts, Options, ETFs, Bonds tabs on the symbol page; **Fundamental Graphs** (up to nine symbols × nine metrics over multi-year statements; date ranges "Up to 5y" free / "All" Premium+); **Macro Maps** (indicator chips + a 1914–2026 date slider over a world map); **Options** (chain, strategy builder, finder, volume, the ATM-IV block in Details); Calendars as products; the **Metrics** full-screen button and the **Minds** purple box in Details [05, 10, 18 §1, §4, §6] | No data source (the Finnhub allowlist is profile / quote / metric / earnings only), and none of it is the gap thesis; tokenized stocks have no listed options, so the whole Options family has no counterpart — recorded so nobody re-opens it. Macro Maps' one transferable detail (chip row + date slider) waits for a CPI/FOMC context feature that does not exist. Portfolio is **Adapt #24** (a wallet view), not a copy. |
| 15 | Chart templates ("a set of colors used for the main series") and "Apply to all" [11] | They solve a multi-chart, many-colour-picker problem OnStock does not have. |
| 16 | The dark-theme **gradient** background [11] | The design system bans gradient fills on surfaces; hairlines separate better beside a table. |
| 17 | Custom watchlist columns, 7 flag colours, import/export as paid features, symbol caps [05, 08] | TradingView's own watchlist refuses custom columns; flags in seven colours and per-plan symbol caps exist to sell upgrades; OnStock's universe is ~700 tokens. |
| 18 | "Export chart data" from the layout menu [06] | GeckoTerminal and Yahoo have their own terms; leave data export out until the data-rights question is settled (a gap-series CSV is different — see §5). |
| 19 | Multi-condition (AND) alerts, watchlist alerts as a quota, strategy alerts, fundamentals alerts, second-based alerts [07] | None map onto OnStock's data; "set drift alert on every asset in this folder" is a bulk action, not a separate alert type. |
| 20 | Spread charts (`AAPL / XAUUSD` syntax in search; six engine operators incl. Exponentiation and Reciprocal; options legs; the 10-symbol cap) [01, 14 §4] | The gap **is** OnStock's spread. TradingView gates intraday spreads behind Plus and refuses Bar Replay and alerts on them because they repaint; OnStock computes one spread server-side from the same two feeds and can make it first-class instead (Adapt #20–21). A general spread engine drags TradingView's whole repaint/alert support burden in for an audience that wants one spread. |
| 21 | **"New pane"** for the stock leg, **"Merge all scales into one"**, lettered A/B scales [14 §1.2, §3] | A stock leg in its own pane defeats the product; with at most two scales there is nothing to merge; the gap-history pane (Adapt #2) is the only "New pane" OnStock needs. |
| 22 | A **2-chart layout as the way to see token and share side by side** — before Phase 3 [06, 14 §7] | TradingView users fall back to two charts only when the two symbols' price levels make one axis useless; the token and its share sit at almost the same level, so the overlay already is the comparison. C1 stays Phase 3. |
| 23 | **Exchange delay pricing**, Cboe One vs primary-exchange feeds, professional status, BIST-style "data type" packages, the **connection-count** model, and the **ADJ / B-ADJ / 1! / 2!** adjustment controls [16 §1.4, §2, §4, §5.6] | OnStock has nothing to sell and no second feed to switch to; its scarce resource is upstream quota, not sockets (the pop-up *shape* is B20, the counting is not); no futures; and the dividend gap between token and share is **content** for the gap chart (an Events marker, B11), not something to adjust away. |
| 24 | The **"Switch data type"** menu as a data-source control [16 §2.1] | It is a *view* switcher (Chart / Financials / Technicals / News / Options …), not a feed switcher — TradingView has no drop-down that moves a US stock between Cboe One and NASDAQ; the source is a fact shown in the legend. OnStock's Gap \| Candles toggle is the view switcher (kept beside the symbol, where TradingView keeps its own); the source is A23's legend string, never a control. |
| 25 | The **guest nag modal** ("Look first / Then leap." → **Join for free**), the **Trade** and **Publish** pills in the chart toolbar, a "…" overflow menu [17 §3, §6] | Trade goes out to Jupiter from the right column; TradingView drops its own Trade pill first when space runs out, which says where it belongs. TradingView has no overflow menu — items lose their label or disappear (§1.3). |

---

## 5. The paid tier

### 5.1 The rule that binds everything

OnStock renders with **Lightweight Charts** (Apache-2.0) today, which carries no offering restrictions. But the owner intends to apply for **Advanced Charts**, and the Free Advanced Charts Agreement v.0626.FAC says [08 §12, charts-licence doc]:

- §2.4 — the licence is for "Implementations as a public access service (as a free offering only, and whether account registration is required or not)";
- §2.7 — the library must be shown on a page "available to any visitor without the need to login";
- §2.11 — an announcement post with a contextual backlink is mandatory;
- §4.2 / §4.4 — 60 days' notice ends it, after which the implementation must be discontinued;
- §7.5 — $50,000 liquidated damages per uncured breach.

TradingView never defines "free offering" beyond those words and never enumerates which features *around* the chart may be paid. The only safe reading: **the chart, as any visitor sees it, must be usable without paying and without a mandatory login.** Anything narrower is an interpretation TradingView would have to bless in writing (platforms@tradingview.com).

So the design rule from day one, even on Lightweight Charts: **never gate anything inside the chart surface** — not intervals, not on-chart history depth, not indicators on the chart, not the gap series, not drawings once they exist. Build every gate as a count, a delivery channel, a saved-object cap, an export, or a cadence, enforced server-side (Vercel functions / Supabase RLS), so the chart never has to know which tier is looking at it. The reason is the licence, **not** TradingView's example: an earlier draft claimed Basic "has every capability", and the pricing table read from the HTML [15 §3.17] shows TradingView does gate things *inside* its own chart on Basic — custom / second / tick intervals, four of the 21 chart types, Volume Profile, auto chart patterns, intraday Bar Replay and bar depth (5K vs 40K). OnStock's rule is stricter than TradingView's on purpose, and it keeps a later switch to Advanced Charts a data-adapter change rather than a business-model change.

### 5.2 Two tiers

| | Free | Paid (one tier; "OnStock Pro" is a placeholder name) |
|---|---|---|
| Price | $0 | roughly Essential/Plus territory, **$10–15/mo**, annual **13–17 % lower** (TradingView: Essential $14.95 → $12.95 is 13.4 %, Ultimate $239.95 → $199.95 is 16.7 %; the badge "Save up to 17%" is the ceiling, not the Essential rate [15 §2]) — so $12.95 → ~$11 is the like-for-like annual price, not $10.75; 30-day trial, cancel any time, 14-day annual refund rule stated plainly |
| The chart | everything, always | identical |
| Watchlists | 1 watchlist + the folders users already have (do not take anything away — see §7 Q7) | unlimited folders, sections inside lists |
| Alerts (active) | 3 price + 1 gap-drift (TradingView Basic is 3 price / **0** technical — a `crossIcon`, and cut from 6 to 3 since June 2023; do not copy the cut [15 §3.7, §5]) | 100 price + 100 drift (server-enforced) |
| Alert duration | 1 month, then Stopped — Expired (TradingView: 1 mo. / 2 mo. / 2 mo. / ∞ / ∞) | Open-ended (TradingView's Premium+ reading; generous for one tier, consistent with the layouts row) |
| Alert delivery | in-app **+ native push when the Capacitor app has it** (TradingView gives "Native push alerts notifications" to Basic — an earlier read that put it on paid plans was a blank-icon misread [15 §3.14, §4 #41]; push is retention and costs nothing per user) | in-app + push + email + webhook (webhook is ✗ on TradingView Basic and ✓ from Essential — the cheapest paid plan — so the paid side is right [15 §3.7]) |
| Alert log | 30 days / 100 events | 90 days, CSV export |
| Saved layouts (Phase 3) | 1 | unlimited |
| Charts per layout (Phase 3) | 1 | up to 4 (2-up token \| stock, 2×2) |
| Screener | table, all columns, 60 s refresh | 10 s refresh, saved screens, CSV export |
| Gap-series & candle CSV export | — | ✓ (a button beside the chart, not the chart) |
| Support | docs + email (TradingView Basic cannot open a ticket at all — a small, honest advantage worth stating on the pricing page [15 §3.16]) | priority reply |
| Ads | never | never |

Every TradingView number in this table is taken from `tradingview/08-plans-and-gating.md` (all 109 cells match the pricing page's HTML) and `tradingview/15-pricing-table-reconciliation.md` (the errata sheet); do not cite 01, 05, 07, 10 or 13 for a plan cell — each carries at least one blank-icon misread that 15 §4 lists. The confirmed cells the table leans on: watchlists 1 / ∞ and symbols 30 / 1,000; saved layouts 1 / 5 / 10 / ∞ / ∞; screener refresh "1 min" free vs "10 sec / 1 min" paid; screener "Data export" Essential+ and chart "Download chart data" Plus+ (two rungs — if a second paid tier ever appears, chart export is the natural upper-rung item); "Compare symbols" ✓ on every plan. None of the errata adds a gate: every corrected cell (seconds/ticks, TPO, footprint, volume candles, auto patterns, deep backtesting, financial-metric and second-based alerts, market-data add-ons, invite-only scripts) is on a feature §4 already skips.

The first revenue lever is not a tier at all: the Jupiter integrator fee ("the fee switch", roadmap §2.3) never touches the chart and is unaffected by any charting licence. It should be turned on before a paid tier exists; the paid tier is second.

### 5.3 What must never be gated

- Any interval, chart mode, indicator, or drawing *on the chart*.
- On-chart history depth (TradingView gates "Historical bars available" 5K/10K/20K/40K, but that lives inside the chart; gate the **bulk export** of deep history instead).
- The gap number, the gap history pane, the two prices, the session strip.
- Login to see the chart (§2.7). Beta access codes are fine now; a mandatory account to *view* is not, later.

---

## 6. PHASE-1 BUILD BRIEF

Work in a worktree branched from `release/onstock` (or `main` once #6 merges). Do not touch `ios/` or `.github/`. One PR. Everything below is a decision already made; the builder should not need to choose.

### 6.1 Ground rules

1. **Phones are byte-identical.** Under 1024 px, and everywhere inside the Capacitor WebView, the rendered DOM and behaviour of every screen must not change. The acceptance test in §6.12 is a DOM diff, not a visual impression. Source files may change (extractions, exported constants) as long as the phone output does not.
2. **One gate.** `App.jsx` decides desktop vs phone once: `const desktop = useMediaQuery('(min-width: 64rem)') && !isNativeApp()`. Nothing else in the tree tests the width, except the three places noted (§6.5 right-column width tokens via CSS, `AssetRow` `barWidth`, and `CandleChart` `fontSize`).
3. **No new dependencies.** No router, no state library, no icon set. `lightweight-charts@5.2.1` stays the only chart dependency.
4. **No new colours, shapes or type sizes.** Everything uses the tokens in `src/index.css` and the six type steps. Active tabs use the accent (accent = active state, per the design system); chips are `Chip` from `shared.jsx`; rows are `AssetRow`.
5. **No new upstream cost.** The desktop shell subscribes to exactly what the phone Home + open detail subscribe to today: the watchlist ids (one key) and the selected asset plus its siblings (one key). Candles fetch only in Candles mode, as now.
6. **Pure logic goes in `src/lib/` with tests** (`services/apiBase.js` reads `window` at import, so nothing that imports a service is testable under vitest). Four new pure modules: `src/lib/search.js`, `src/lib/intervalInput.js`, `src/lib/pageTitle.js` (A21) and `src/lib/provenance.js` (A23).
7. `npm run lint`, `npm run test`, `npm run build` must pass; the test count goes up, never down.

### 6.2 File plan

**New files**

| File | What it is |
|---|---|
| `src/components/desktop/DesktopShell.jsx` | The grid: top bar, rail, center, right column; owns `fullscreen`; mounts `useDesktopShortcuts`. |
| `src/components/desktop/TopBar.jsx` | Wordmark, `SymbolSearch`, `SessionStrip`, `AvatarButton`. |
| `src/components/desktop/NavRail.jsx` | Vertical rail from `TABS` (exported from `TabBar.jsx`). |
| `src/components/desktop/SymbolSearch.jsx` | Input + results popover; uses `src/lib/search.js`. |
| `src/components/desktop/SessionStrip.jsx` | Dot + short word + tooltip + "Widest gap" link; uses `src/lib/sessionCopy.js`. |
| `src/components/desktop/ChartWorkspace.jsx` | Toolbar + chart + gap history + `DetailTabs`; owns chart settings state; calls `useAssetWorkspace`. |
| `src/components/desktop/ChartToolbar.jsx` | Gap \| Candles, interval chips, indicator chips, Auto / Reset / Latest buttons, legend readout. |
| `src/components/desktop/IntervalPrompt.jsx` | The small typed-interval prompt (digits / `,` open it). |
| `src/components/desktop/DetailTabs.jsx` | Statistics · News · Trades on · Also tokenized by. |
| `src/components/desktop/RightColumn.jsx` | List-name menu + `FilterChips` + optional `TreasuryYields` + `WatchlistPane` + `AssetNumbers`. |
| `src/components/desktop/AssetNumbers.jsx` | `GapPanel` + spread line + action icons + `TradeButton`. |
| `src/components/desktop/ShortcutSheet.jsx` | The Ctrl+/ list (a `Sheet`). |
| `src/components/asset/GapPanel.jsx` | Extracted from `AssetDetail.jsx` lines 253–337 (the bordered gap block). |
| `src/components/asset/TradeButton.jsx` | Extracted from lines 540–574 (swap / Jupiter button + caption). |
| `src/components/asset/StatsSection.jsx` | Lines 632–664 ("Stats"). |
| `src/components/asset/KeyStatistics.jsx` | Lines 666–825 (the disclosure; `open`/`onToggle` props). |
| `src/components/asset/AboutSection.jsx` | Lines 827–839. |
| `src/components/asset/AnalystRatings.jsx` | Lines 841–870. |
| `src/components/asset/EarningsSection.jsx` | Lines 872–901. |
| `src/components/asset/AssetNews.jsx` | Lines 903–928. |
| `src/components/asset/DetailsSection.jsx` | Lines 936–975 (`open`/`onToggle` props). |
| `src/components/asset/TradesOn.jsx` | Lines 576–590. |
| `src/components/asset/AlsoTokenizedBy.jsx` | Lines 592–630 (`onSwitchAsset` prop). |
| `src/hooks/useAssetWorkspace.js` | The data bundle `AssetDetail` computes: subscription, `useChartData`, `useStockInfo`, spread, `siblings`, `memberCount`, `alertLabel`, `inWatchlist`, `hasTokenStats` / `hasStockStats` / `bothSides`. Both `AssetDetail` and `ChartWorkspace` call it. |
| `src/hooks/useDesktopShortcuts.js` | The keyboard map (§6.10). |
| `src/hooks/useLocalState.js` | `useState` mirrored to a `localStorage` key with try/catch (used for the five persisted desktop states). |
| `src/lib/search.js` (+ `search.test.js`) | `searchScore(asset, q)` and `popularPick(assets, underlying)` moved out of `SearchOverlay.jsx`; `rankAssets(assets, query)` returning the sorted matches. |
| `src/lib/intervalInput.js` (+ test) | `parseIntervalInput(text, mode)` → `{ kind: 'timeframe', id } \| { kind: 'range', id } \| null`, with nearest-snap. |
| `src/lib/sessionCopy.js` | `SESSION_DOT`, `SESSION_NOTE` (moved from `Home.jsx`) plus `SESSION_SHORT = { regular: 'Open', pre: 'Pre-market', post: 'After hours', closed: 'Overnight' }`. |
| `src/lib/pageTitle.js` (+ test) | `chartTitle({ ticker, price, changePct, mode, gapPct })` → `'NVDAx 12.34 ▲ +0.65%'` / `'NVDAx gap +0.42% ▲'` / `'NVDAx'` when no quote yet; `screenTitle(tab)` → `'Gaps — OnStock'` etc. (§6.9). |
| `src/lib/provenance.js` (+ test) | `legendStatus(leg, session, ageSeconds)` → the three-segment string (`'Market closed · Data is delayed · NASDAQ by Yahoo Finance'`, `'24/7 · One update every 30 seconds · Raydium by GeckoTerminal'`) and `delayTooltip(minutes)` → `'Quotes are delayed by 15 min'` (§6.9). |

**Changed files**

| File | Change |
|---|---|
| `src/App.jsx` | The desktop gate; `listSource` state; render `<DesktopShell>` on desktop, the existing tree otherwise (§6.3). |
| `src/components/TabBar.jsx` | `export const TABS` (move the const out of module scope to a named export; component unchanged). |
| `src/screens/Home.jsx` | Import `SESSION_DOT` / `SESSION_NOTE` from `src/lib/sessionCopy.js`; delete the local copies. Nothing else. |
| `src/screens/AssetDetail.jsx` | Remove the desktop dock (the `lg:` classes on the root, the `<aside>`, the `desktop` media query, the `WatchlistPane` import, the `lg:` wrapper divs); compose the extracted `asset/*` components; call `useAssetWorkspace`. Phone DOM unchanged (§6.12). |
| `src/components/WatchlistPane.jsx` | New props: `assetIds` (defaults to `watchlistIds`), `subscriptionKey` (default `'desktop-watchlist'`), `barWidth`, `header` (a node rendered in place of the fixed "Watchlist / Gap · token / stock" header), `emptyText`, `showDelayed` (default `false`; when true each row gets `delayed={!stockLive}` — A23). |
| `src/components/shared.jsx` | `AssetRow` only: one additive prop `delayed` (default `false`) that renders the 10-px **D** badge with `title={delayTooltip(15)}` beside the stock price. Every existing call site omits it, so the phone DOM is unchanged (§6.12 item 1 proves it). Nothing else in the file. |
| `src/components/Sheet.jsx` | Root: add `lg:items-center lg:justify-center`; panel: add `lg:max-w-md lg:rounded-2xl lg:sheet-in-center` where `.sheet-in-center` is `bw-fade` (no rise). Handle bar gets `lg:hidden`. |
| `src/components/DualLineChart.jsx` | New prop `fill` (default `false`). When true, a `ResizeObserver` on the wrapper sets `W`/`H` in pixels and the `<svg>` gets `width`/`height` attributes instead of `className="w-full"`; also new prop `scrubT` in/out for sync (`onScrubT`). Default path untouched. |
| `src/components/PremiumChart.jsx` | Same `fill` prop; new prop `scrubT` draws a 1 px `stroke-zinc-600` vertical line at that time. |
| `src/components/CandleChart.jsx` | New props `fontSize` (default 11), `magnet` (default false → `CrosshairMode.Normal`; true → `Magnet`), `onCrosshair(bar\|null)`, `resetKey` (refit only when it changes), and a `ref` exposing `{ reset(), scrollToLatest(), setLog(bool), isAuto(), setAuto() }`. Phone call site passes nothing new. |
| `src/components/CandlesPanel.jsx` | Controlled mode: optional props `side`, `timeframe`, `indicators`, `onSide`, `onTimeframe`, `onIndicators`, `hideControls`, `chartProps`. When all are omitted it behaves exactly as today. |
| `src/index.css` | Add the four tokens (§6.4) and `.sheet-in-center`. |
| `docs/design-system.md` §7 | Replace the "docks it" paragraph with the §1.2 table and the §1.3 rules. |

**Do not edit**: `src/components/shared.jsx` beyond the single `delayed` prop on `AssetRow` above (`barWidth` already exists), `src/screens/Screener.jsx`, `src/screens/News.jsx`, `src/screens/Trade.jsx`, `src/screens/Folders.jsx`, any overlay other than `Sheet.jsx`, any `api/` file, `src/state/*`.

### 6.3 `App.jsx` — the gate and the state

```jsx
import { useMediaQuery } from './hooks/useMediaQuery'
import { isNativeApp } from './lib/platform'
import DesktopShell from './components/desktop/DesktopShell'

// inside App():
const desktop = useMediaQuery('(min-width: 64rem)') && !isNativeApp()
const [listSource, setListSource] = useLocalState('bw.desktop.list.v1', 'watchlist')
```

Rendering rule, inside the existing provider stack and inside the existing shell `<div>`:

```jsx
{desktop ? (
  <DesktopShell
    tab={tab}
    onTab={switchTab}
    assetId={openAssetId}
    onSelectAsset={(id) => { setOpenAssetId(id); setTab('home') }}
    listSource={listSource}
    onListSource={setListSource}
    openFolderId={openFolderId}
    onOpenFolder={setOpenFolderId}
    onOpenProfile={openProfile}
  />
) : (
  <>
    {screen}
    <TabBar tab={tab} onChange={switchTab} />
    {openAssetId && <AssetDetail key={openAssetId} … />}
    {showSearch && <SearchOverlay … />}
  </>
)}
{showProfile && <ProfileSheet … />}
<UndoToast />
<RecoveryGate />
<WelcomeGate … />
```

Rules:

- The shell `<div>` keeps `mx-auto min-h-dvh max-w-md bg-zinc-950 md:border-x` and drops `lg:max-w-[var(--content-max)]` in favour of `lg:max-w-none lg:border-x-0` (full-bleed on desktop; the phone shell is unchanged because those are `lg:` classes — but note the phone tree at ≥ 1024 in the **native** app still renders inside this shell, so keep `lg:max-w-[var(--content-max)]` applied *only when `desktop` is false*: `className={desktop ? '… lg:max-w-none' : '… lg:max-w-[var(--content-max)]'}`).
- `switchTab` keeps clearing `openFolderId`; on desktop it must **not** clear `openAssetId` (the chart keeps its asset when you look at News and come back). Change `switchTab` to `setOpenAssetId(null)` only when `!desktop`.
- `openAssetId` on desktop is initialised from `localStorage` `bw.desktop.asset.v1` → `getRecentViews()[0]` → `watchlistIds[0]` → `null` in an effect that runs once when `desktop` first becomes true, and mirrored to that key on change. On the phone, `openAssetId` starts `null` as today.
- `ProfileSheet`, `UndoToast`, `RecoveryGate`, `WelcomeGate` render on both.

### 6.4 `index.css` — tokens

Append to `:root`:

```css
--topbar-h: 48px;
--rail-w: 64px;
--right-col: 320px;
```

and:

```css
@media (min-width: 80rem) { :root { --right-col: 360px; } }
@media (min-width: 96rem) { :root { --right-col: 400px; } }

/* Sheets become centred dialogs on desktop; no rise, just the fade. */
.sheet-in-center { animation: bw-fade 0.15s ease-out both; }
@media (prefers-reduced-motion: reduce) { .sheet-in-center { animation: none; } }
```

### 6.5 `DesktopShell.jsx`

```jsx
<div className="grid h-dvh w-full" style={{
  gridTemplateColumns: fullscreen
    ? 'var(--rail-w) 1fr 0px'
    : 'var(--rail-w) minmax(560px, 1fr) var(--right-col)',
  gridTemplateRows: 'var(--topbar-h) 1fr',
}}>
  <TopBar className="col-span-3" … />
  <NavRail hidden={fullscreen} … />
  <main className="min-w-0 overflow-y-auto">{center}</main>
  <aside className="min-w-0 overflow-y-auto border-l" style={{ borderColor: 'var(--border-subtle)' }} hidden={fullscreen}>
    <RightColumn … />
  </aside>
</div>
```

- `center` is `tab === 'home' ? <ChartWorkspace/> : <Takeover/>` where `Takeover` renders the existing screen component for the tab inside `<div className="mx-auto max-w-[640px]">`: `Screener`, `FoldersList` / `FolderDetail` (using `openFolderId`), `News`, `Trade`. Pass their existing props; `onOpenAsset={(a) => onSelectAsset(a.id)}`. Their `Header` (title + avatar) renders as today — the duplicate avatar is accepted in Phase 1 (§7 Q9 asks whether to hide it).
- When the tab is `folders` and `openFolderId` is set, also call `onListSource(openFolderId)` once so the right column shows that folder's rows (TradingView: clicking a list makes it the active list).
- `fullscreen` toggles on Shift+F and Esc (§6.10). The rail and aside get the `hidden` attribute (the reset already has `[hidden]{display:none!important}` semantics via Tailwind's preflight; verify).
- Under `main` the center content has `px-6` (24 px gutters).

### 6.6 `TopBar.jsx`, `SymbolSearch.jsx`, `SessionStrip.jsx`

**TopBar** — `flex h-[var(--topbar-h)] items-center gap-4 border-b px-4` with `borderColor: var(--border-default)`:

1. Wordmark: copy the brand `<svg>` + `<span>OnStock</span>` from `Header.jsx` (extract to `export function Wordmark()` in `Header.jsx` and use it in both places — phone output identical).
2. `SymbolSearch` (width 240 at lg, 320 at xl).
3. `flex-1` spacer.
4. `SessionStrip`.
5. `AvatarButton onClick={onOpenProfile}` (existing export from `Header.jsx`).

**SymbolSearch** — an `<input>` styled like `SearchBar` (`rounded-xl bg-zinc-900 px-3.5 py-2 text-sm`, `SearchIcon` inside) with placeholder "Search tickers or companies · Ctrl+K". Behaviour:

- Typing runs `rankAssets(assets, q)` from `src/lib/search.js`; a popover (`absolute`, `z-30`, `bg-zinc-950`, `ring-1 ring-zinc-800/70`, `rounded-xl`, max-height 60vh, `overflow-y-auto`) lists up to 12 rows: `AssetLogo` · ticker · name — issuer · chain · token price · a trailing `PlusIcon`/`CheckCircleIcon` that toggles the watchlist (same as `SearchOverlay`'s `ResultRow`, but implement locally; do not import `SearchOverlay`).
- Empty query shows two groups: "Recently viewed" (`getRecentViews()`) and "Popular" (`popularSearches` via `popularPick`) — the same groups the phone overlay shows; skip "Top movers" and "Recently tokenized" (keep the popover short).
- ↑/↓ move a highlight, Enter selects (calls `onSelectAsset(id)`, clears the input, blurs), Esc closes and blurs. Clicking outside closes.
- Exposes `focus(prefill?: string)` through a ref so the shortcuts hook can open it with the typed letter.
- `track('search' | 'search_miss')` exactly as `SearchOverlay` does (same 800 ms debounce).

**SessionStrip** — `usePrices().session`; renders the dot (`SESSION_DOT`), then at lg the short word (`SESSION_SHORT`) in `t-caption text-zinc-400`, with `title={SESSION_NOTE[session]}`. At xl (`hidden xl:inline`), when `session !== 'regular'`, append the "Widest gap TICKER +x.xx%" button computed exactly as `Home.jsx` lines 82–89 (extract that computation to `src/lib/sessionCopy.js` as `widestCredibleGap(assets, session)` — pure, testable; Home keeps its own inline code or imports it, output identical). Clicking it calls `onSelectAsset`.

### 6.7 `NavRail.jsx`

- `<nav className="flex flex-col border-r" style={{ width: 'var(--rail-w)', borderColor: 'var(--border-subtle)' }}>`.
- One button per `TABS` entry: `h-14 w-full flex flex-col items-center justify-center gap-0.5`, `Icon size={22} strokeWidth={active ? 2.1 : 1.8}`, label `text-[10px] font-medium`, active `text-accent`, inactive `text-zinc-500 hover:text-zinc-300`.
- The News unread dot and the Trade "soon" tag exactly as `TabBar.jsx` renders them (copy the two spans).
- `aria-current="page"` on the active item; `title={label}`.
- Keyboard: the rail is a normal tab stop; no custom keys.

### 6.8 `RightColumn.jsx`, `AssetNumbers.jsx`, `WatchlistPane` changes

**RightColumn** — a flex column, `h-full`:

1. **List header** (`flex items-center justify-between border-b px-4 py-2`): a `<button>` in `t-micro text-zinc-500` reading the list name ("Watchlist" or the folder's name) with a `ChevronDown size={14}`; clicking opens a popover listing "Watchlist" then every `folders` entry (`useFolders().folders`), the current one marked `aria-current`. Choosing one calls `onListSource(id)`. On the right, the same "Gap · token / stock" micro label.
2. `FilterChips` (existing) with local `filter` state (`useLocalState('bw.desktop.filter.v1', 'all')`).
3. `{filter === 'bond' && <TreasuryYields />}` — above the rows, as `Home.jsx` does.
4. `<WatchlistPane assetIds={ids} subscriptionKey="desktop-watchlist" currentId={assetId} onOpen={(a) => onSelectAsset(a.id)} barWidth={barWidth} header={null} emptyText={…} />` where `ids = filterAssets(listSource === 'watchlist' ? watchlistIds : folder.assetIds, filter)`; if the folder no longer exists fall back to `'watchlist'` and call `onListSource('watchlist')`. `barWidth` = 64 when `useMediaQuery('(min-width: 80rem)')` is false, else 88. Empty text: watchlist → the Home sentence ("Your watchlist is empty — add the tokens you care about."); folder → "No assets here yet."
5. The watchlist block is `flex-1 min-h-[200px] overflow-y-auto`; the numbers block below is `shrink-0 border-t`.
6. `AssetNumbers` for `assetId` (null → nothing).

**WatchlistPane** changes: the header markup moves behind a `header` prop (default = today's header, so the phone-side code that no longer mounts it is irrelevant but the default is preserved); `assetIds` prop defaults to `watchlistIds`; `subscriptionKey` prop defaults to `'detail-watchlist'` (unchanged default); `barWidth` passed through to `AssetRow`; the `scrollIntoView` on mount stays. Add `↓`/`↑` support: the pane does not handle keys itself — `useDesktopShortcuts` computes next/previous from `ids` and `currentId` and calls `onSelectAsset`.

**AssetNumbers** — for the selected asset (`useAsset(assetId)`) and `useAssetWorkspace(asset)`:

1. A header row: `AssetLogo size={28}` · `t-label` ticker · `t-caption text-zinc-500` "{name} · {issuer} · {chain}" — and on the right four 36 px icon buttons: star (`toggleWatchlist`, filled when in), bell (opens `SetAlertSheet`; `title={alertLabel}`), `PlusIcon` (opens `AddToFolderSheet`; `title` "Add to folder" / "In N folders"), `ShareIcon` (opens `ShareSheet`). Sheets render as siblings (they are `Sheet`s and will be centred dialogs on desktop by §6.2). This is TradingView's Details header (logo · ticker · three icon buttons at 38 px [17 §2.4, 18 §1.1]) with OnStock's actions in the slots; the per-leg ages and the stock leg's **D** badge live inside `GapPanel` (its `tokenAge` / `stockAge` lines already say "12s ago · live" and "at last close · pre-market" — add the badge beside the stock line via the same `delayed` prop as the legend, A23).
2. `<GapPanel asset={asset} scrub={scrub} session={session} marketOpen={marketOpen} lastFetchAt={lastFetchAt} />` — the extracted block, unchanged markup. `scrub` comes from `ChartWorkspace` via a small shared context or prop (the Gap chart's scrub drives the headline price on the phone; on desktop it drives this panel — pass `scrub` down from `DesktopShell`, which holds `const [scrub, setScrub] = useState(null)` and gives `ChartWorkspace` the setter).
3. The bid/ask line (lines 364–370) and the thin-market note (373–382) exactly as extracted.
4. `<TradeButton asset={asset} />` (the extracted swap / Jupiter block).

### 6.9 `ChartWorkspace.jsx`, `ChartToolbar.jsx`, `DetailTabs.jsx`

**State** (all via `useLocalState('bw.desktop.chart.v1', {...})` as one object): `{ mode: 'gap', range: '1D', side: 'token', timeframe: DEFAULT_TIMEFRAME_ID, indicators: { sma20: false, ema50: false, rsi14: false }, log: false }`. None of it resets on asset change (A15). `visibleLines` (the Gap legend toggles) stays in memory.

**Toolbar** (`h-[38px] flex items-center gap-2 border-b px-6` — 38, TradingView's toolbar row [17 §1.2]; the `Chip`s inside are the 28-px pills):

- `Chip` Gap / `Chip` Candles (same handlers as `AssetDetail`, including `track('chart_mode')` and clearing `scrub` when leaving Gap).
- Gap mode: the five `RANGES` chips. Candles mode: side chips (`{ticker} token` / `{underlying} stock`) then `timeframesFor('token')` chips — on the stock side the ones with `stock == null` render `disabled` with `title="No {label} bars for the stock side"` instead of being hidden (A7); the active one still coerces via `coerceTimeframe` when the side changes.
- Candles mode: the three `INDICATORS` chips with swatches (as `CandlesPanel`).
- A `flex-1` spacer, then in Candles mode: **Auto** (a `Chip`, active when the price scale is in auto mode — poll `ref.isAuto()` on crosshair move), **Latest** (`ref.scrollToLatest()`), **Reset** (`ref.reset()`), **Log** (`Chip`, toggles `log`). Below 1280 these four render icon-only (§1.3).
- **Tooltips (A22)**: every toolbar control carries `data-tooltip` (the text) and, where a key exists, `data-tooltip-hotkey` (`{"keys":["Alt","R"]}`), rendered by one small `Tooltip` element: 13-px text, 24 px tall, 4 px below the bar, left-aligned under the control, the keys as a chip after the text — `Reset chart view` `Alt + R`, `Scroll to the most recent bar`, `Auto (fits data to screen)`, `Logarithmic` `Alt + L`, `Fullscreen mode` `Shift + F`, `Symbol search` `Ctrl + K`. The `data-tooltip` text is also the `aria-label`. The Ctrl+/ sheet lists the same strings.
- The **legend readout** sits *on* the chart, not in the toolbar: an absolutely positioned `div` at `top-1 left-1` (4 px inset from the pane corner, as TradingView [17 §1.6]) over the chart wrapper, `pointer-events-none` except for its buttons, with a 50 %-alpha `bg-zinc-950/50` plate (TradingView's legend background default). Two rows: the **title row** — `{ticker}` and `{interval}` as `<button>`s in `t-body` (16 px; ticker focuses the symbol search, interval opens the interval prompt), then the exchange/venue word — and the **values row** in `num t-caption` (13 px): `O … H … L … C … · Δ {change} ({pct}) · Vol {vol} · {time}`, `C` coloured by direction as today. In Gap mode the same slot shows the scrub readout (`DualLineChart`'s readout row already exists — render the existing readout row above the chart, no overlay, to keep the Gap chart untouched). Token side adds "closes in mm:ss" (A13) computed from `candleSeconds(timeframe)` and the last bar's `time`, ticking once a second; stock side never shows it.
- **Provenance in the legend (A23)**: after the title row's venue word, a status `<button>` whose text is `legendStatus(side, session, age)` from `src/lib/provenance.js` — `24/7 · One update every 30 seconds · Raydium by GeckoTerminal` on the token side (the refresh cadence is `PricesContext`'s 30 s), `Market closed · Data is delayed · NASDAQ by Yahoo Finance` on the stock side with the session word from `SESSION_SHORT`. On the stock side a **D** badge (10 px bold, `text-amber-400`, exactly TradingView's yellow letter) precedes the string with `title={delayTooltip(15)}`; `WatchlistPane` rows get the same badge on the stock price when `stockAge` is not live (pass `delayed` through `AssetRow`'s existing props — no phone change, the badge only renders when the new prop is set). Phase 1 renders the string as text; clicking it does nothing until the pop-up (Adapt #9) lands in Phase 2.
- **`document.title` (A21)**: an effect in `ChartWorkspace` sets `document.title = chartTitle(...)` from `src/lib/pageTitle.js` on every price tick and mode change; `DesktopShell` sets `screenTitle(tab)` when a takeover is open and restores the chart title on return; `main.jsx`'s default title is the fallback before the first quote. Never on phones (the effect lives in the desktop components only).
- **Price scale width**: leave Lightweight Charts' auto-sizing alone — do not hard-code 54 px. TradingView's scale grows with the label (52 px for six characters, ~7 px per extra character, 72 at `79,968.96` [17 §1.7]); tokenized-stock prices with four decimals need 60–70.

**Chart area** (`relative mt-3`):

- Gap mode: `<DualLineChart fill token stock premium loading error onRetry onScrub={(s) => { setScrub(s); setScrubT(s?.t ?? null) }} showToken showStock />` inside a wrapper with `height: clamp(240px, 38vh, 420px)`; the legend chips row and the "Tap either…" caption render under it as today (copy the JSX; change "Tap" to "Click" on desktop). Then `<PremiumChart fill premium scrubT={scrubT} />` at height 96.
- Candles mode: `<CandlesPanel asset={staticAsset} side timeframe indicators onSide onTimeframe onIndicators hideControls chartProps={{ fontSize: 12, magnet: true, resetKey: `${asset.id}:${side}:${timeframe}`, onCrosshair: setHoverBar, ref: chartRef }} />` in the `CandlesBoundary` + `Suspense` wrapper copied from `AssetDetail`. `CandlesPanel`'s caption line ("Token candles are the largest … pool…") still renders under the chart.
- `CandleChart` internal changes: `fitContent()` runs in the data effect **only when `resetKey` changed since the last fit** (store the last key in a ref); a refresh of the same timeframe must not touch the visible range. The `ref` methods: `reset()` = `timeScale().fitContent()` + `priceScale('right').applyOptions({ autoScale: true })`; `scrollToLatest()` = `timeScale().scrollToRealTime()`; `setLog(v)` = `priceScale('right').applyOptions({ mode: v ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal })`; `isAuto()` = `priceScale('right').options().autoScale`; `setAuto()` = `applyOptions({ autoScale: true })`. `magnet` → `crosshair.mode`. `fontSize` → `layout.fontSize`. `onCrosshair` is called with the same object `setHover` receives.

**Gap history sync**: `PremiumChart` with `scrubT` draws the vertical rule at `x(scrubT)` when `scrubT` is within `[t0, t1]`.

**DetailTabs** (`mt-6`): a strip of four buttons in `t-label`, `px-3 py-2`, active = `text-zinc-100` with a 2 px bottom border in `var(--color-accent)`, inactive `text-zinc-500 hover:text-zinc-300`; `role="tablist"`, arrow keys move between tabs, `aria-selected`. Panels (`max-w-[720px] pt-4`):

| Tab | Content (the extracted components, in this order) |
|---|---|
| Statistics | `StatsSection`, `KeyStatistics` (rendered **open** by default on desktop, no disclosure button — pass `open` and `onToggle={undefined}` → header renders as an `h3` instead of a button), `AboutSection`, `AnalystRatings`, `EarningsSection`, `DetailsSection` (open, same rule), then `UpdatedAgo` |
| News | `AssetNews` (the "Latest {underlying} news" list); when `info.news` is empty, "No recent headlines for {underlying}." in `t-caption text-zinc-500` |
| Trades on | `TradesOn` |
| Also tokenized by | `AlsoTokenizedBy onSwitchAsset={(id) => onSelectAsset(id)}`; when there are no siblings, "Only {issuer} tokenizes {underlying} today." |

The two `open`-less renderings must not change the phone: `KeyStatistics` and `DetailsSection` keep their `<button>` header when `onToggle` is a function (always, on the phone).

**Empty selection** (`assetId == null`): the center shows a centred `t-body text-zinc-400` line "Search for a ticker, or pick one from your watchlist." and nothing else.

### 6.10 Keyboard shortcuts — `useDesktopShortcuts.js`

Mounted once by `DesktopShell`. Listens on `window` `keydown`. **Ignores every event when `event.target` is an `input`, `textarea`, `[contenteditable]`, or inside an open `Sheet` (`[aria-modal="true"]`)**, except Esc. Modifier key: `Ctrl` on Windows/Linux, `⌘` on macOS (`navigator.platform` starts with `Mac` → use `metaKey`). Nothing here runs on phones (the hook is only mounted by the desktop shell).

| Keys | Action | Notes |
|---|---|---|
| `Ctrl+K` | focus symbol search | prevent default (browser address bar) |
| any letter `a–z` (no modifiers) | focus symbol search with that letter typed | `SymbolSearch.focus(letter)` |
| `0–9` or `,` (no modifiers) | open `IntervalPrompt` with that digit (empty for `,`) | Enter applies via `parseIntervalInput(text, mode)`: mode `candles` accepts `1 5 15 60 240 D` (and `1m 5m 15m 1h 4h 1D`); mode `gap` accepts `1D 1W 1M 3M 1Y`; an unknown value snaps to the nearest offered by seconds (log distance, like `coerceTimeframe`); the prompt shows the resolved chip label live; Esc cancels |
| `/` | in Candles mode, focus the first indicator chip; in Gap mode, no-op | placeholder for the Phase 2 dialog; `title` on the chips says "/" |
| `↓` or `Space` | next symbol in the right-column list | wraps at the end; `Space` prevents page scroll |
| `↑` or `Shift+Space` | previous symbol | |
| `Alt+W` | toggle the selected asset in the watchlist | `toggleWatchlist(assetId)` |
| `Alt+A` | open `SetAlertSheet` for the selected asset | only when `asset.underlying` (the phone rule) |
| `Alt+R` | `chartRef.reset()` in Candles mode; no-op in Gap mode | |
| `Alt+L` | toggle log scale (Candles mode) | |
| `Shift+F` | toggle fullscreen | |
| `Esc` | close popovers / prompt / fullscreen (in that order); never closes a `Sheet` (Sheet owns its own Esc) | |
| `Ctrl+/` | open `ShortcutSheet` | a `Sheet` listing this table |
| `Tab` | native focus order; rail → search → toolbar → chart → tabs → right column | make every custom control a real `<button>`; the chart wrapper gets `tabIndex={0}` and `aria-label="Price chart"` |

`Alt+G` (go to date), `Alt+S` (snapshot), drawing hotkeys and trading hotkeys are **not** implemented in Phase 1 and must not be bound.

### 6.11 `src/lib/intervalInput.js` — the contract

```js
// parseIntervalInput('15', 'candles')  → { kind: 'timeframe', id: '15m', exact: true }
// parseIntervalInput('30', 'candles')  → { kind: 'timeframe', id: '15m', exact: false }  // nearest by log-seconds; 1h is farther
// parseIntervalInput('D', 'candles')   → { kind: 'timeframe', id: '1d', exact: true }
// parseIntervalInput('1440','candles') → { kind: 'timeframe', id: '1d', exact: true }
// parseIntervalInput('1W', 'gap')      → { kind: 'range', id: '1W', exact: true }
// parseIntervalInput('2W', 'gap')      → { kind: 'range', id: '1W', exact: false }
// parseIntervalInput('', any)          → null
// parseIntervalInput('xyz', any)       → null
```

Accepts upper/lower case, optional `m`/`h`/`d`/`w`/`y` suffixes, bare numbers as minutes in `candles` mode. Tests cover every line above plus the six `TIMEFRAMES` ids and five `CHART_RANGES` keys round-tripping.

### 6.12 Acceptance — phones byte-identical

Run at **390 × 844** (Chrome device toolbar, iPhone 14) on the branch base and on the branch, with the same seeded `localStorage` (clear it first so the seed watchlist and 'Popular' folder load) and the same asset (`nvidia-xstock`):

1. Home: `document.querySelector('#root').innerHTML` hash is identical before/after (the price values will differ; normalise by replacing every `\$[\d,.]+` and `[+−]\d+\.\d+%` and "…ago" with a placeholder before hashing).
2. Open the asset: the `.screen-in` element's `outerHTML`, normalised the same way, is identical.
3. Toggle Candles, wait for the chart, toggle SMA 20 / EMA 50 / RSI 14: eleven canvases as before; the OHLC caption row is above the chart; "Charts by TradingView" caption present.
4. Open each sheet (folder, alert, share; swap if a wallet is stubbed): they rise from the bottom, phone width, handle bar visible.
5. `TabBar` present and unchanged; `SearchOverlay` full-screen as before.
6. Gaps, Folders, News, Trade screens: innerHTML identical (normalised).
7. Also at **1023 px** wide: everything above holds (the phone tree, the Home desktop table hidden because `lg` has not fired).
8. In the iOS build (or with `window.location.protocol` forced to `capacitor:` in a dev build), at **1024 × 768** and **1366 × 1024**: the phone tree renders with Home's existing `lg` table — exactly today's iPad behaviour, no `DesktopShell`.

Acceptance at **1280 × 800** and **1440 × 900** (web):

9. Top bar 48 px, rail 64 px, right column 360 px (400 at 1536), center the remainder; no horizontal scrollbar at any width from 1024 to 1920.
10. Search: press `n` anywhere → the search field has focus and contains "n"; ↓ ↓ Enter selects the third result; the chart and right column update; the search is empty and blurred.
11. `↓` five times steps down the watchlist, wraps; `Alt+W` removes the asset from the watchlist and the row disappears (undo toast appears).
12. Type `5` → prompt shows "5m"; Enter → in Candles mode the 5m chip is active; in Gap mode type `1W` → the 1W chip.
13. Candles: drag the price axis → Auto chip turns off; click Auto → back on; zoom in with the wheel, wait 35 s (one refresh) → the zoom is kept; switch timeframe → refit.
14. Candles: the crosshair snaps to OHLC; the legend in the top-left updates; token side shows "closes in mm:ss", stock side does not.
15. Gap: hovering the Gap chart moves a vertical rule on the gap-history pane at the same time.
16. Switch asset via the watchlist: mode, interval, indicators and the open tab are unchanged; the chart data changes.
17. `Shift+F` hides the rail and right column; Esc restores.
18. Rail → News: the center shows the News screen at 640 px centred; clicking a digest asset returns the chart with that asset and lights Home. Same for Gaps and Folders; opening a folder switches the right column list to it and the list-name menu shows the folder's name.
19. Bonds chip → `TreasuryYields` above the rows; All → gone.
20. Open Set alert / Add to folder / Share from the right column: a centred dialog, not a bottom sheet; Esc closes; focus returns to the icon.
21. Reload: the same asset, list, mode, interval, tab come back.
22. Light theme (`html.light`): the chart recolours; nothing is invisible.
23. `npm run lint`, `npm run test` (count ≥ today's + the new `search`, `intervalInput`, `sessionCopy`, `pageTitle`, `provenance` tests), `npm run build`.
24. Tab title: with NVDAx open in Candles mode `document.title` reads `NVDAx 12.34 ▲ +0.65%` (a real triangle and a real minus sign, no "OnStock" suffix); switch to Gap → `NVDAx gap +0.42% ▲`; rail → Gaps → `Gaps — OnStock`; back to Home → the quote title returns. On the phone at 390 wide the title is unchanged from today.
25. Hover **Reset**: a 24-px tooltip appears 4 px under the toolbar reading `Reset chart view` with an `Alt + R` chip; every toolbar control has one; the chart toolbar measures 38 px tall.
26. Legend: the token side reads `24/7 · One update every 30 seconds · Raydium by GeckoTerminal`; switch to the stock side after 16:00 ET → `Market closed · Data is delayed · NASDAQ by Yahoo Finance` with a yellow **D** whose tooltip is `Quotes are delayed by 15 min`; the same **D** shows on the stock price in every watchlist row while the stock quote is not live, and on none of them during regular hours with a live quote.

### 6.13 Commit

One commit on the branch. Title along the lines of "Desktop shell: top bar, nav rail, chart-first center, right column". The body should say in prose that the desktop is now a separate shell mounted at 1024 px in browsers only, that the asset screen's phone-width dock from PR #2 is replaced, that chart settings now follow the user across assets, that the tab title is now the quote (or the gap) and the legend states each leg's provenance and delay, that the four `asset/*` extractions are byte-identical on phones and how that was checked, and list the keyboard map. End with:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

## 7. Open questions — only the owner can answer

None of these block Phase 1 as written; each has a default the brief already uses, marked ▸.

1. **Full-bleed or capped?** TradingView is full-width. ▸ Full-bleed at ≥ 1024 (the `--content-max` 1200 px cap is removed on desktop). Reversible with one class.
2. **iPad in the native app.** `lg` fires on an iPad in landscape; the brief keeps the desktop shell **web-only** (`!isNativeApp()`), so the native app stays the phone UI at every width, exactly as today (Home's existing table still shows). ▸ Web-only. If you want the desktop shell on iPad too, drop the `isNativeApp()` clause; `SwapSheet` and wallet connect are the parts that will not work there.
3. **Right column width.** ▸ 320 / 360 / 400 by breakpoint, not user-draggable (draggable is Phase 2, B13, with TradingView's measured 300 default / 200 floor / 296 chart minimum [17 §2.1]). TradingView's default panel (300) leaves a ≈618-px chart at 1024 where OnStock's 320 leaves ≈560; the difference is the phone row's width, and a denser desktop row is the Phase 2 table view.
4. **Right column order.** The mockup put the watchlist above the numbers. At 1024 × 768 the numbers block sits at the bottom and needs a scroll when the list is long. ▸ Keep the approved order; the watchlist gets at least 200 px and the column scrolls.
5. **What "Home" means.** ▸ Home = the chart workspace (the phone Home's jobs are split across the top bar, right column and center). The alternative — Home as a desktop table of the watchlist with the chart elsewhere — contradicts "chart owns the middle".
6. **Does opening a folder switch the right-column list?** ▸ Yes (TradingView: clicking a list makes it the active list). The list-name menu lets the user switch back.
7. **Free-tier caps on folders.** §5 suggests "1 watchlist + existing folders" free. Beta users already have unlimited folders; capping later means taking something away. ▸ Do not cap folders at all in the first paid release; gate alerts, delivery, layouts and export only.
8. **Attribution wording.** "Charts by TradingView" stays; the Lightweight Charts NOTICE asks for a link to tradingview.com (present). If Advanced Charts is adopted, the logo link must lose nothing and gain an announcement post. ▸ No change now.
9. **The takeover screens' own headers.** Gaps / Folders / News / Trade render their phone `Header` (title + avatar) inside the center, so the avatar appears twice (top bar + screen). ▸ Accept in Phase 1; a `hideAvatar` prop on `Header` is a two-line follow-up.
10. **Letters open search.** Any unmodified letter key anywhere on the desktop (outside inputs) jumps to search. TradingView does this; some people find it surprising. ▸ On, with Esc to cancel; can be made opt-out in the Ctrl+/ sheet later.
11. **Theme default on desktop.** TradingView Desktop follows the system by default; OnStock defaults to Dark on every platform. Changing the default affects phones too. ▸ Leave Dark; the Appearance sheet already offers "Match system".
12. **Phase 2's drawing tools: self-built primitives or wait for Advanced Charts?** Building seven tools as primitives is a few weeks; Advanced Charts brings 110 but carries §2.4/§2.11/§4.2 and ~670 KB. ▸ Apply for Advanced Charts now (the application is the owner's, under the OnStock company name, without the "TradingView for tokenized stocks" phrasing); build B3 Measure and B9 right-click first because they need no primitives; decide on B1/B2 when the reply arrives.
13. **Phase 3 ordering.** Server-side alerts with email (C6) versus the 2-up layout (C1). Alerts are what makes a paid tier honest; the 2-up is what makes the desktop feel finished. ▸ C6 first, because §5 depends on it.
14. **"Gaps" or "Screener" on the rail.** The phone says Gaps. ▸ Keep Gaps; TradingView's word is Screener, but the owner's product word is the gap.
15. **Where the long tail lives: the right column or the tabs under the chart.** Teardown 18 §"What this means" #1 proposes TradingView's full Details grammar in the right column — seven titled blocks (Gap, Price ranges, Key stats, Analyst rating, Earnings, Latest news, Profile), each with a "More …" button — while the approved mockup puts Statistics / News / Trades on / Also tokenized by in tabs **under the chart** (A16). Both cannot hold the same numbers. ▸ Keep the owner's tabs; the right column holds the gap panel now and gains only **Price ranges** and **Performance** in Phase 2 (B18), because those two are read at a glance and the rest is read at length. If the owner prefers TradingView's column, B18 grows into the seven blocks and the Statistics tab shrinks to the disclosure tables.
16. **Native push on the free tier.** §5.2 now puts push in the free column because TradingView gives it to Basic [15 §3.14]. It costs nothing per user once built, but it is also the one delivery channel a free user would otherwise pay for. ▸ Free, when it exists; alerts count, duration, email and webhook remain the paid levers.

---

## Sources

This is a synthesis; no web page was read for it. Everything above traces to:

- `docs/research/2026-09-06/tradingview/01-supercharts-anatomy.md` through `13-account-settings-and-notifications.md` (all thirteen surface teardowns, read in full; their own Sources sections list every TradingView URL)
- `docs/research/2026-09-06/tradingview/14-compare-overlays-and-spreads.md`, `15-pricing-table-reconciliation.md`, `16-data-provenance-and-chart-notices.md`, `17-frame-measurements-url-and-title.md`, `18-details-widget-and-right-toolbar-products.md` (the five fillers added after the critic's pass; read in full for this revision — 17's numbers were measured live with DOM APIs on a guest session, 15's cells were read from the pricing page's raw HTML icon classes)
- `docs/research/2026-09-05/desktop-audit.md` and `docs/research/2026-09-05/tradingview-charts-license.md` — on branch `research/2026-09-05` at `ca75c7b` (not on `release/onstock`)
- `docs/design-system.md`, `docs/roadmap.md`
- Code on `release/onstock` at `1ddae1b`: `src/App.jsx`, `src/main.jsx`, `src/index.css`, `src/screens/AssetDetail.jsx`, `src/screens/Home.jsx`, `src/screens/Screener.jsx`, `src/screens/News.jsx`, `src/screens/Trade.jsx`, `src/screens/Folders.jsx`, `src/components/WatchlistPane.jsx`, `src/components/TabBar.jsx`, `src/components/Header.jsx`, `src/components/CandlesPanel.jsx`, `src/components/CandleChart.jsx`, `src/components/DualLineChart.jsx`, `src/components/PremiumChart.jsx`, `src/components/TreasuryYields.jsx`, `src/components/Sheet.jsx`, `src/components/shared.jsx`, `src/overlays/SearchOverlay.jsx`, `src/overlays/SetAlertSheet.jsx`, `src/overlays/ProfileSheet.jsx`, `src/hooks/useMediaQuery.js`, `src/hooks/useChartData.js`, `src/hooks/useCandles.js`, `src/lib/candles.js`, `src/lib/candleSeries.js`, `src/lib/prices.js`, `src/lib/theme.js`, `src/lib/platform.js`, `src/state/PricesContext.jsx`, `src/state/FoldersContext.jsx`, `src/state/AlertsContext.jsx`, `src/data/universe.js`, `vite.config.js`, `package.json`
