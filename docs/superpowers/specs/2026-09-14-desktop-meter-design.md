# OnStock desktop: The Meter

Written 2026-09-14. Supersedes the direction of `docs/research/2026-09-06/onstock-desktop-spec.md` (the TradingView-frame adoption spec) for the desktop home screen. That document stays as the record of the Phase 1 build and of the adopt / adapt / skip reasoning; the pieces it built are reused here, re-centred or demoted as listed in section 3.3.

Status: design approved in principle by the owner on 2026-09-14 after seeing the mockup. The owner questions in section 5 are still open; each has a default the plan uses.

Mockup: https://claude.ai/code/artifact/49d2a295-87f7-4e9a-bf17-6a5dc469a7e5 (two artboards at 1440x900: the home, and the chart drill-in with the Indicators panel open).

## 0. The one sentence

OnStock is the gap meter for tokenized stocks: every wrapper of a share read against the share it wraps, with the age of each leg stated, priced in dollars at your size, and a chart you open and mark up when you want to know why. TradingView charts one price. OnStock reads the difference between two prices that never trade at the same time. That object has no chart slot, so it cannot be a TradingView screen.

## 1. Diagnosis: why the built desktop reads as TradingView

At 1440x900 the branch at `6035e11` is the Supercharts silhouette. The tell that it is not TradingView only arrives on reading ("Gap", "vs NVDA", "Also tokenized by"). Five first-glance tells, ranked:

| # | Tell | Where | Class |
|---|---|---|---|
| 1 | Chart as home inside the three-toolbar frame, 48/64/38 px regions | `DesktopShell.jsx`, `index.css` tokens, `App.jsx` | signature, pixels copied |
| 2 | Floating status-line legend (ticker · interval · O H L C · Δ · Vol) with the "{session} · {cadence} · {venue} by {source}" grammar and the yellow D | `ChartWorkspace.jsx`, `provenance.js` | copied |
| 3 | 38 px pill toolbar: interval chips, Indicators, Auto / Latest / Reset / Log with measured label dropping | `ChartToolbar.jsx`, `toolbarDensity.js` | signature, pixels copied |
| 4 | Right column: ticker list over a details header with star / bell / share, full height | `RightColumn.jsx`, `AssetNumbers.jsx` | convention in kind, TradingView in proportion |
| 5 | Icon-only left rail of products | `NavRail.jsx` | signature |

Two more are invisible in a screenshot but loud in use: the hotkey map (any letter opens search, digits open `1 5 15 60 240 D`, Alt+R/L/W/A, Shift+F, Ctrl+/) in `desktopKeys.js` and `IntervalPrompt.jsx`, and the tab title "NVDAx 12.34 ▲ +0.65%" in `pageTitle.js`. Both are copied to the string.

One more fact. Nothing on either chart can be marked up today. No drawing, mark-up or annotation code exists in `desktop/*`, `CandleChart.jsx` or `PremiumChart.jsx`. The owner's one stated chart value ("you should be able to mark up the chart") is unbuilt, and this design schedules it.

The rule that separates what stays from what goes. If Koyfin, Robinhood Legend, Yahoo and Apple Stocks would all have it, it is a convention and it stays: a watchlist, Ctrl+K search, arrow keys through a list, a readable candle chart with indicators and drawing tools, a session word, fullscreen, settings that persist. If only a TradingView user would recognise it by eye or by hand inside a minute, it goes: the chart as home, the three-toolbar frame and its pixel sizes, the OHLC legend and provenance sentence, the interval codes in chrome, the hotkey map, the ▲ title, the icon rail, a permanent drawing rail. Nothing in the colour system is TradingView's. The problem is structural, not chromatic.

Two facts about the TradingView credit, because the owner asked. "Charts by TradingView" is required by the Lightweight Charts licence (Apache-2.0 with a NOTICE) on any page that renders with that library. Today only `CandleChart.jsx` uses the library; `DualLineChart.jsx` and `PremiumChart.jsx` are hand-drawn SVG. This design moves the desktop gap-history pane onto the library (to get mark-up tools and session shading), so the credit appears under that pane too. It is one 11 px line and is not a brand tell.

## 2. Approaches considered

Five strategies were drafted blind and scored by four judges (founder, user, design, engineering). The top three:

**The Meter (38.0/50, every judge's winner).** Home is a Gap Board: one row per tokenized company, a signed gap rule on a shared zero axis, the cheapest wrapper named, wrapper sub-rows underneath. A Readout on the right holds the reading, the gap in dollars at your size, and a gap-history pane as the primary chart. The candle chart with its indicators opens fullscreen from one key. Trade-off: a board of near-zero bars can look quiet on a weekday afternoon, and the plan is dense for one builder. It reuses the most existing code and needs no new data source in the first eight weeks.

**The Briefing (37.0/50).** Home is a reading column whose headline is a sentence: "NVDAx is trading 2.14% below NVIDIA. On $1,000 of NVIDIA the token costs $21.40 less than the shares right now." Cheapest build, most honest copy. Trade-off: it flips the desktop light, splits it from the dark phone, leaves no full chart anywhere, and is read once, so it pulls a holder back less.

**The Holdings desk (36.0/50).** Home is a wallet-read ledger: your tokens beside their shares. Strongest daily pull in principle (roadmap 3.2). Trade-off: only 103 of 711 wrappers carry a mint, all xStocks; the founder's US testers cannot legally hold xStocks or Robinhood tokens; Kraken buyers' tokens never touch a wallet. For the ten people the owner counts, the home would open on a sample address.

**Decision: build The Meter, and graft three things.** From the Briefing, the headline sentence at your size and the US-access card with a source and a checked date; both become the first lines of the Readout. From Holdings, nothing inside 90 days; a read-only Holding lens is an owner question. From the Gap Desk strategy, the implied gap at the quoted fill inside the swap sheet.

Why. A screenshot is a column of signed bars around a centre line, with a number above a single-series pane, and nothing floats over a canvas. It honours last week: `ChartWorkspace`, `IndicatorDialog`, the tabs and the watchlist survive one key away, and the Phase 1 shell stays in the tree until the owner has seen both homes side by side. It is buildable on this data: the first eight weeks add zero new data sources; the three soft spots (Finnhub's 50-quote rotor, percentiles on young pools, the 3.5-day candle window) are handled with bounded claims and copy, not new infrastructure.

Field facts that shape the pitch (verified by fetching the live pages on 2026-09-12): CoinGecko's stocks index now shows one "Price Diff %" per underlying, so "nobody computes the gap" is no longer true in one place. Nobody shows it per issuer, per leg freshness, in dollars, over time, or during a closed session. The pitch is the only honest gap. Dinari now sells tokenized shares to eligible US investors through a broker-dealer; Coinbase launched tokens on Base in August 2026; Robinhood Chain went live in July 2026. The universe and the wrapper ledger need those issuers.

## 3. The design

### 3.1 Positioning, persona, vocabulary

Positioning. OnStock is the gap meter for people who hold or eye tokenized stocks and need to know, before they add or exit a wrapper, what it costs above or below the real share, which issuer charges least, and whether the number can be trusted right now.

Persona. Mara, 34, Lisbon, holds NVDAx (Kraken) and TSLAon (Jupiter). She opens OnStock on Sunday night to see what the weekend did to the premium and whether NVDAon is now cheaper than NVDAx. Her US friend Dan cannot buy xStocks; he uses the same desktop to watch, to argue about whether tokens track the share, and to check which wrappers he can legally hold. Both want one honest number with its age.

Vocabulary OnStock owns: gap (never premium or discount in chrome; Learn keeps the definition), wrapper, issuer, leg, age ("12 s ago", "at Friday's close"; "delayed" only with a number), session (open, pre-market, after hours, overnight), reading, Board, Readout, rule (the bar), tick (the zero), parity, cheapest wrapper, bp apart, at your size, round trip, Monday gap, credible, thin, mark up, Watching, folder.

TradingView words OnStock stops using: symbol, Supercharts, layouts, templates, Save layout, Replay, ideas, "indicators, metrics and strategies" as a trio, interval codes in visible chrome, "Market closed · Data is delayed · NASDAQ by Yahoo Finance" as a sentence, the ▲/▼ title, the lone yellow D, Alt+anything.

### 3.2 The desktop, region by region at 1440x900

Center object: the Gap Board. First landing of the eye: the Board's 240 px gap column, a bank of signed rules on one shared zero axis. Second landing: the Readout's 32 px reading. The only chart on the home is the gap history, and it sits under a number.

```
+------------------------------------------------------------------------------+
| [rule] OnStock   Board  Watching  Folders  News  Trade   [ Search  Ctrl K ]  |
|   o Overnight: the market is shut, tokens still trade.                       |
|                Widest gap COINx +0.59%                     (bell) (avatar)   |  56
+---------------------------------------------------+--------------------------+
| All Stocks ETFs Bonds Watching | Sort: widest gap | On $1,000 of NVIDIA,     |
| Credible only [x]   459 companies · share legs at | NVDAx costs $0.92 more   |
| Fri close                                         | than the shares right now|
+---------------------------------------------------+ $100  $1,000  $10,000    |
| Company   Share · age  Gap vs share · widest wrapper  Wrappers  Cheapest    | NVDAx  NVDAon  NVDAb     |
|---------------------------------------------------+ +0.09%     $0.20 above   |
| COIN Coinbase $175.26 Fri close   |====  +0.59% 3 · 25bp COINon | ---------|----------  |
| TSLA Tesla    $365.44 Fri close   |===   +0.35% 3 · 13bp TSLAon | -2%      0        +2% |
| ...                                               | Token $218.49 · 7 s ago  |
| NVDA NVIDIA   $218.29 Fri close   |=    +0.12% 3 · 7bp  NVDAon  v | Share $218.29 · Fri   |
|   NVDAx xStocks · Solana $218.49 7 s |=  +0.09% $0.20 above Raydium | close · Yahoo, 15 min |
|   NVDAon Ondo · Ethereum $218.40 41 s |= +0.05% $0.11 above cheapest|------------------------|
|   NVDAb bStocks · Solana $218.55 2 m |=  +0.12% $0.26 above Bybit  | At your size ...       |
| MSFT ...                                          | Gap history   Mark up M  |
|                                                   |  ~~~~-----0----~~~~~    |  164
|                                                   | Past day week month year|
|                                                   | Narrower than 71% of its|
|                                                   | half-hour readings this |
|                                                   | week · Charts by TV     |
|                                                   |-------------------------|
|                                                   | Price chart  Open chart C|
|                                                   | Wrapper badges + source |
|                                                   | Watch Alert Folder Trade|
|                                                   | Statistics News Trades on Learn |
+---------------------------------------------------+--------------------------+
   880 px (61%)                                          560 px (39%)
```

**Region A, masthead, 56 px.** The gap-rule mark and "OnStock". Five text tabs at 13 px with an underline on the active one: Board · Watching · Folders · News · Trade. Trade stays for parity with the shipped phone; it opens the existing link-out and wallet-signed swap, never an order ticket. A search field with a Ctrl K hint (`SymbolSearch.jsx`, unchanged). The session dot and the full `SESSION_NOTE` sentence as visible 13 px prose, not a tooltip. The "Widest gap" pill from `SessionStrip.jsx`. Bell, avatar.

**Region B, the Board, 880 px wide.** A 40 px control strip: chips All / Stocks / ETFs / Bonds / Watching, a sort menu labelled "Sort: widest gap" (Widest gap · Most expensive · Cheapest · Most traded), a "Credible only" toggle (default on) that mutes rather than hides |gap| > 25 and thin rows, and an honesty count that names the share leg's real state ("459 companies · share legs at Fri close" when the market is shut; "share leg live on N of 459" when it is open). A 32 px column header: Company · Share · age · Gap vs share · widest wrapper · Wrappers · Cheapest. Then 56 px company rows: logo, ticker, name; share price in tabular figures with an age line; the 240 px gap column with a 6 px rule on the shared zero axis and the signed % beside it; "3 · 25 bp apart"; the cheapest wrapper as a chip. The company row carries its widest wrapper's gap, and the header says so. Right arrow or click expands 40 px wrapper sub-rows on the same column grid (so the zero tick lines up): wrapper ticker, issuer · chain, token price with its age, its own rule, gap %, gap in dollars, venue, "cheapest" chip on the lowest, " · thin" where muted. Rows are virtualised past 40. Sort order is frozen on load and on explicit re-sort; cells update in place, so the 50-quote rotor never reorders the home under the reader. Keys: Up/Down step, Left/Right collapse/expand, Enter fills the Readout, W watch, A alert.

**Region C, the Readout, 560 px, scrolls independently.** The reading head: the sentence first ("On $1,000 of NVIDIA, NVDAx costs $0.92 more than the shares right now") with size pills $100 · $1,000 · $10,000 and a wrapper picker row; the gap at 32 px in the mono face, sign carried by the character, never coloured; "$0.20 above the share"; a 10 px rule with −2% / 0 / +2% labels; two leg lines: "Token $218.49 · 7 s ago · Raydium via GeckoTerminal" and "Share $218.29 · at Friday's close · Yahoo, 15 min delayed". Under it "At your size": gap in dollars per size, and for xStocks wrappers the round trip (gap plus DEX spread) with "spread measured on a $200 trade" until the $1k/$10k quotes land; for Ondo, bStocks and unmapped wrappers the line reads "no DEX quote for this wrapper". Then the gap history at 164 px on the home (320 px was the earlier plan; the mockup showed 164 fits the column without scrolling, and the drill-in has the tall version): a new desktop `GapHistoryPane` on Lightweight Charts with a dashed zero, neutral session shading on Past day and Past week only, range words under the pane, an honest percentile caption, the mark-up palette on right-click or M, and the "Charts by TradingView" caption. Then "Price chart", a 32 px strip: "Open chart (C)". Then the wrapper ledger badges (structure, redemption, US access, chain, each with a source and checked date under one line: "Published terms as read on {site}, checked {date}. Not legal advice."). Then the action row (Watch · Alert · Folder · Share · Trade) and tabs Statistics / News / Trades on / Learn.

**The drill-in.** C or "Open chart" opens the chart workspace fullscreen, reshaped: the same masthead; a 56 px gap header above the canvas (Board back-link with Esc, ticker, reading, dollar line, rule, two legs with ages, actions, Trade); no toolbar row; the price pane with the token leg and the share leg, the share leg drawn flat-dotted through closed sessions so the gap opening overnight is visible; a two-swatch legend (token, share, plus one swatch per active indicator, no live values); OHLC shown only in a crosshair tooltip; the gap pane under the price pane with the spread named in TradingView's own grammar ("NVDAx / NVDA − 1") and any gap indicator's reading; a 40 px bottom strip with Gap | Candles, the range words, an **Indicators** button with a count, Mark up (M), Log scale, a Shortcuts (?) hint and the "Charts by TradingView" credit. The bar countdown goes. Esc returns to the Board with the row still focused.

**The Indicators panel** (owner ask, 2026-09-12: "there should be a button that says indicators that allows you to add and edit indicators"). The Indicators button on the bottom strip opens a 320 px panel docked to the right of the canvas. "On this chart" lists each active indicator as a row: colour swatch, name with its parameters, a hide toggle, an edit toggle, remove. Editing expands the row inline: Length, Source (Close / Open / High / Low / HL2), Colour (four swatches: amber, blue, teal, grey), Width (1 / 2 / 3), Pane (On the price pane / Own pane / On the gap pane), Save as default, Reset, and "Add a second {name}", which is allowed once the second copy's length differs (the current `IndicatorDialog` refuses a duplicate because it cannot edit lengths; this panel is where lengths live). "Add" lists the catalogue with category chips (All / Trend / Momentum / Volatility / Volume), each row showing its default parameters and an Add button. The panel replaces the three fixed SMA 20 / EMA 50 / RSI 14 toggles under the candles on desktop; the phone keeps its toggles. `I` opens the panel from the keyboard.

Sizes come from the 4 px rhythm and the 56 px `AssetRow`: 56, 40, 56, 40, 32. No 48, 64 or 38 anywhere, the drill-in included.

First-glance test after the change. A TradingView user sees a dense table whose middle column is a bank of bars around a centre line, a big signed percentage on the right above a single-series pane, and a masthead with words. No rail, no toolbar row, no legend. After C they see a chart under a number with a strip at its foot, not a chart under toolbars.

### 3.3 What happens to every Phase 1 piece

Deleted once the owner picks the Board after the week-3 preview: `NavRail.jsx`, `IntervalPrompt.jsx`, `lib/intervalInput.js`, `lib/toolbarDensity.js`, and with them `intervalInput.test.js` (17 tests) and `toolbarDensity.test.js` (6). Rewritten with their tests: `desktopKeys.js` (20), `pageTitle.js` (13); `provenance.js` gains exports and keeps its old ones (8 tests untouched). About 64 of 298 `it()` blocks move.

| Piece | File | Action | Why |
|---|---|---|---|
| Shell grid, chart as home | `desktop/DesktopShell.jsx`, `App.jsx` | re-centre behind a `desktopHome` flag | Board + Readout ship beside the untouched Phase 1 shell until the owner picks |
| Top bar | `desktop/TopBar.jsx` | re-centre | 56 px, five words, full session sentence |
| Symbol search | `desktop/SymbolSearch.jsx` | keep | Ctrl+K is universal |
| Session strip | `desktop/SessionStrip.jsx` | keep, move | Sentence promoted from tooltip to prose |
| Icon rail | `desktop/NavRail.jsx` | flag, then delete week 3 | The second most TradingView-shaped element |
| Right column | `desktop/RightColumn.jsx` | rename to `Readout.jsx` | 560 px; the watchlist becomes the Watching lens |
| Asset numbers | `desktop/AssetNumbers.jsx` | re-centre | Gap panel, spread caption and thin note become the reading head |
| Chart workspace | `desktop/ChartWorkspace.jsx` | demote | Fullscreen drill-in with the gap header; OHLC on hover; countdown removed |
| Chart toolbar | `desktop/ChartToolbar.jsx` | rewrite as a 40 px bottom strip | Gap/Candles, range words, Indicators, Mark up, Log scale; Latest, Reset move to the palette |
| Toolbar density | `lib/toolbarDensity.js` | delete | Existed to copy TradingView's label dropping |
| Interval prompt | `desktop/IntervalPrompt.jsx`, `lib/intervalInput.js` | flag, then delete week 3 | Speaks `1 5 15 60 240 D` verbatim |
| Detail tabs | `desktop/DetailTabs.jsx` | keep, move | "Also tokenized by" retired; sub-rows say "cheapest"; Learn tab added |
| Indicator dialog | `desktop/IndicatorDialog.jsx` (untracked, 2026-09-07) | grow into `IndicatorsPanel.jsx` | Docked panel with per-row editing; the `/` binding goes, `I` opens it |
| Shortcut sheet | `desktop/ShortcutSheet.jsx` | keep, rekey | Behind `?` |
| Tooltip | `desktop/Tooltip.jsx` | rename to `Kbd.jsx` | Design-system kbd; measured 13/24/4 px offsets go |
| Shortcut hook | `hooks/useDesktopShortcuts.js` | keep | Plumbing |
| Key map | `lib/desktopKeys.js` | rewrite | Own map, section 3.4 #5 |
| Page title | `lib/pageTitle.js` | rewrite | "NVDAx −2.14% gap · OnStock"; the ▲ form deleted |
| Provenance | `lib/provenance.js` | add | New per-leg exports for desktop; old exports stay for `GapPanel`, `shared.jsx` |
| Watchlist pane | `components/WatchlistPane.jsx` | desktop prop | D badge reads "delayed 15 min" on desktop; phone path byte-identical |
| Screener | `screens/Screener.jsx` | lift into new `desktop/Board.jsx` | Grouping and `spreadBp` reused; its filter-then-subscribe bug and 40-row cap are not |
| Gap history | `components/PremiumChart.jsx` | untouched; new `desktop/GapHistoryPane.jsx` | The phone pane is hand-drawn SVG; the desktop pane is Lightweight Charts |
| Chart attribution | `components/CandleChart.jsx` | keep, and repeat under `GapHistoryPane` | Apache-2.0 notice must sit on the page that renders the chart |
| Accent picker | `lib/accent.js`, `overlays/AppearanceSheet.jsx` | keep | Desktop reads teal only; the phone picker is an owner question |
| Wordmark | `components/Header.jsx` | add `DesktopWordmark` | Phone `Wordmark` unchanged until the owner says |
| Swap sheet | `overlays/SwapSheet.jsx` | one line behind a desktop prop | Implied gap at the fill; phone unchanged |
| Tabs list | `lib/tabs.js` | desktop list | Shared with the phone `TabBar` |
| Branch, 27 header comments | `feat/desktop-tradingview`, `desktop/*.jsx` | rename | New branch `feat/desktop-meter`; comments name the convention, not the competitor |

### 3.4 The signature features

**1. The Gap Board.** One row per company with the meter bank, the cheapest wrapper, issuer spread in bp, per-leg age, wrapper sub-rows, Credible-only, the Watching lens, keyboard stepping. TradingView cannot: it has no issuer-to-underlying map. CoinGecko's stocks page shows one Price Diff % per company with no issuers, ages, dollars or history. Data: `universe.json` has 459 distinct underlyings, 93 with more than one wrapper; issuers Ondo 441, xStocks 107, bStocks 31, and 132 unattributed. The token leg is CoinGecko every 60 s plus the Jupiter fast layer. The share leg is Finnhub `/quote` through `api/finnhub.js`, and `PricesContext.jsx` caps it at `STOCK_QUOTE_CAP = 50` per cycle with a rotor. Honesty fix: the Board subscribes a bounded candidate set independent of premium availability (the 93 multi-wrapper companies, Watching, then top by token volume, at most 150), renders rows as quotes arrive, falls back to the last cached quote with its age shown, and prints the real count in the header. No per-row Yahoo fallback: `api/history.js` is single-symbol. Reuses `Screener.jsx`, `shared.jsx` (`GapBar`, `usePremium`, `PremiumValue`, `AssetRow`), `prices.js`. Effort: two weeks.

**2. The reading and "At your size".** The headline sentence that rewrites at $100 / $1,000 / $10,000, the gap % at display size, gap in dollars, the big rule, both legs with ages in words, and for xStocks the round trip. When thin or outside `isPlausiblePct(n, 25)` the sentence swaps to "The gap on NVDAx reads +18% but only $12K traded today; treat it as noise" and the dollar line is suppressed. TradingView cannot: a derived spread across two feeds plus a DEX quote. Data: `diff`, `stockPrice` from `usePremium`; `services/jupiter.js` `getTokenSpread` at `SPREAD_REF_USD = 200` for the 103 mint-bearing wrappers; later two extra quotes at $1k and $10k for the selected wrapper only, cached 60 s, on the allowlisted `lite-api.jup.ag`. Reuses `GapPanel.jsx` (`STALE_LABEL`), `AssetNumbers.jsx`, `sessionCopy.js`. Effort: days.

**3. Gap history as the primary chart.** A `GapHistoryPane` on Lightweight Charts: the premium series around a dashed zero, neutral session shading as a custom primitive on Past day and Past week, range words, and a caption bounded to the data's real shape. `useChartData.js` serves 1Y at one daily point, so a year of `premium[]` is a year of midnight prints against the prior close; the caption says so: "Wider than 82% of its hourly readings this month" on Past month, "Wider than 82% of its overnight readings over 9 months" on Past year, never "of the past year" bare. Series markers draw Monday opens. TradingView cannot: nobody stores or charts a token-vs-share premium. Data: `buildPremiumSeries` (`useChartData.js`), `CHART_RANGES`, `market.js`. This is new work, not reuse of `PremiumChart.jsx`. Effort: two weeks.

**4. The wrapper ledger and US access.** Per issuer: what the token is (claim on a share, derivative, synthetic), redemption path and minimum, pricing cadence (24/7 DEX or Chainlink 24/5), chain, and "Can I buy this from the US?" in the issuer's exact words: "eligible U.S. investors, per Dinari"; "not available to US persons, per xStocks". Every cell carries a source URL and a checked date, under one line: "Published terms as we read them on {date}. Not legal advice." TradingView cannot: structural facts about wrappers are outside a charting product; rwa.xyz lists them login-gated and never beside a price. Data: new hand-curated `src/data/issuers.json`, zero API cost, monthly review. Reuses `ISSUER_META`, `DetailsSection.jsx`, `AccessGate.jsx`, `LearnCards.jsx`. Effort: days.

**5. Mark up the chart, and edit indicators.** One shared Lightweight Charts primitive set, rendered on both the gap-history pane and the candle drill-in: trend line (L), horizontal level (H), note pin (M), Shift-drag measure. Opened from a right-click palette or the Mark up button, never a permanent rail. Notes persist in `useLocalState` (browser-local) inside these 90 days; Supabase sync is an owner question. The Indicators panel (section 3.2) is the second half of "mark up": add, edit, hide, remove, a second copy with a different length. The key map is nine guarded single keys plus chords: Ctrl+K search; Up/Down, Left/Right, Enter, Esc on the Board; W watch, A alert, C chart, F fullscreen, `?` help; L, H, M, I (indicators) inside a chart. Single keys fire only when focus is outside an input, which `keyContext` already enforces; no letter opens search and no digit opens an interval prompt. TradingView cannot: its drawings sit on one price; these sit on a spread. Effort: three weeks across both panes plus the panel.

**6. Session reconciliation, the Monday gap.** The gap at the last close, the gap now, and after the open "Weekend gap +1.4%, closed to +0.3% at 9:31", plus how much of the week's token volume traded while the share was shut. GeckoTerminal caps 1,000 five-minute candles (about 3.5 days) and Yahoo 5m is allowed only for 1d/5d in `api/history.js`, so the reconciliation shows inside that window and otherwise says "no stored history yet". xStocks only, since it needs a pool. `vercel.json` has no `crons` entry; a stored snapshot is an owner question. Plus one line inside `SwapSheet.jsx`, desktop only: "you would own NVDAx at +1.9% vs the share, not the +1.4% on the Board", from the Jupiter quote `services/swap.js` already fetches. Reuses `useCandles.js`, `market.js`, `sessionCopy.js`, `DailyDigest.jsx`. Effort: a week.

### 3.5 The visual signature

Tokens. The four flat hue-250 surfaces and hairline borders stay exactly as `index.css` has them. On desktop one accent, teal, fixed; the picker is not read inside `DesktopShell`. Gain and loss keep their current pair and are reserved for price change inside the drill-in. The gap is never red or green: the rule carries direction by which side of the tick the fill sits on, the character carries the sign, the fill is the accent. Session shading on the gap panes is a neutral white-alpha band, not the session-open green. Badges never carry a colour of their own (the "Not for US persons" badge is text and border only). No gradients, shadows, glass or motion; bar widths change on data with no transition. Indicator series may use the two colourblind-safe alternates (amber, blue) plus teal and grey, because a data series needs to be told apart from its neighbour; chrome never does.

The one owned object. The gap rule, already `GapBar` in `shared.jsx` with its sqrt scale and hollow parity band, promoted from a 4 px row ornament to the product's mark: 6 px in Board rows, 10 px in the Readout head with 0 under the tick and ±2% at the ends, and a 24 px square (track, centred tick, short fill right) as the desktop wordmark and favicon.

Typography. Prose stays in the system stack and the six existing steps. One addition: JetBrains Mono (OFL, self-hosted Latin subset, one weight, about 30 KB) on a `.num-mono` class applied only inside `DesktopShell`, so every reading, leg, age and column figure shares one instrument texture. `.num` itself is untouched because the phone uses it.

What a screenshot is recognised by. A column of signed bars around one centre line, a large signed percentage above a single series around a dashed zero, numerals in mono. Not a chart under toolbars.

Phones. Byte-identical in these 90 days. Every change above is gated on the desktop media query in `App.jsx` (`min-width: 64rem` and not the native app), a desktop prop, or a desktop-only file. The phone wordmark swap and the phone accent picker are owner questions.

### 3.6 What OnStock says no to

- A price chart as the home screen, or a permanent chart workspace.
- The three-toolbar frame, its pixel sizes, the icon rail, a permanent drawing rail. The drawing tools themselves are kept.
- TradingView's hotkey map, interval codes in visible chrome, the OHLC legend, the provenance sentence, the yellow D, the ▲ title.
- OHLC as the headline of anything.
- Pine, backtesting, replay, multi-chart layouts, DOM, options.
- Social, chat, ideas, comments. Ads, ever.
- Gating anything inside the chart or behind an account.
- Custody, execution, or any "buy" verb; Trade is a wallet-signed link-out with the impact acknowledgement.
- A general portfolio tracker with P&L and tax reports.
- Red or green for the gap; a second brand colour on desktop.
- Calling any number a mispricing when a leg is asleep, or a percentile "of the past year" on daily midnight prints.
- Curated facts without a source, a checked date and "not legal advice".
- A new server secret or table before the owner has said yes to it.

## 4. Delivery: increments and the first plan

This spec is too large for one implementation plan. It decomposes into four, each its own plan and PR, in this order:

| Plan | Weeks | Scope | Shippable on its own? |
|---|---|---|---|
| **A. Board + Readout** (the first plan) | 1 to 3 | `Board.jsx` behind a `desktopHome` flag beside the untouched Phase 1 shell: company rows, wrapper sub-rows on the same grid, Credible-only as a mute, bounded subscription independent of premium, frozen sort, virtualisation, the honest header count. `Readout.jsx` from `RightColumn` and `AssetNumbers`: the sentence with size pills, legs in words, "no DEX quote for this wrapper", action row, tabs. Drill-in reshaped: gap header, no toolbar row, bottom strip, gap-led legend, countdown gone. Own key map, rekeyed `ShortcutSheet`, `pageTitle` gap grammar, new `provenance` exports, `WatchlistPane` desktop prop. Tests rewritten. Return counter (asset opened, lens used, second visit within 7 days) through the existing PostHog hook. Both homes on one preview URL to the ten testers; owner picks the default; on a yes, `NavRail`, `IntervalPrompt`, `intervalInput`, `toolbarDensity` deleted. | Yes: the preview |
| **B. Ledger + signature** | 4 to 5 | `issuers.json` with structure and US access, sourced, dated, in the issuer's words; badges in the Readout and a Board column; `.num-mono` on desktop; `DesktopWordmark` and favicon; the 27 header comments rewritten. | Yes |
| **C. Gap history + mark-up + Indicators panel** | 6 to 8 | `GapHistoryPane` on Lightweight Charts with neutral session shading on day and week, range words, honest percentile captions, Monday markers, attribution caption. The shared mark-up primitives (line, level, note, measure) on both panes, right-click palette, L H M keys, `useLocalState` persistence. `IndicatorsPanel.jsx` grown from `IndicatorDialog.jsx`: per-row editing, a second copy with a different length, `I` key. | Yes |
| **D. Size quotes, alerts, reconciliation, cutover** | 9 to 13 | $1k/$10k Jupiter quotes for the selected wrapper and the round trip; implied gap at the fill behind a desktop prop; drift alerts armed from Board rows; digest superlatives as the Board header line; session reconciliation inside the 3.5-day window; onstock.app cutover; second tester round; Robinhood Chain, Coinbase and Dinari wrappers added to `universe.js` with mint-to-underlying maps where one exists; accessibility pass on the rule; merge to `release/onstock`. | Per item |

Branching. `feat/desktop-meter` opens from `6035e11` so every Phase 1 file is the base. PR #9 is closed in favour of a new PR into `release/onstock`; `feat/domain-onstock` carries the cutover. The uncommitted indicator-dialog work of 2026-09-07 in the main tree (fifteen modified files, `IndicatorDialog.jsx`, `indicatorCatalog.js` and its test) is the seed of Plan C's panel and needs its own commit before Plan A starts, so the two do not tangle.

Testing. Every pure module (`desktopKeys`, `pageTitle`, `provenance`, the Board's grouping and bounding, the sentence builder, the percentile caption) gets unit tests in the existing Vitest suite. The phone stays byte-identical, proven the way Phase 1 was: a DOM-skeleton diff (elements and classes, no text) at 390x844 on fresh loads of `release/onstock` and the branch for home, asset, folders, gaps, news. Desktop is verified live in the preview at 1280 and 1440: regions, no horizontal scroll, the key map, the drill-in and back, the Indicators panel opening and editing a length. Lint and build clean.

## 5. Risks, and the questions only the owner can answer

Risks.

- Finnhub's shared 60/min cannot feed 459 rows. Mitigation: a bounded set of at most 150, cache 60 s open / 30 min closed, last cached quote with its age as the fallback, and the count printed in the header.
- Near-zero bars on a weekday afternoon look quiet. Mitigation: default sort is widest credible gap, the percentile caption makes small readings meaningful, and the Watching lens opens first when it is non-empty.
- Percentiles mislead on young pools or daily prints. Mitigation: the caption names the granularity and the real history length.
- The reconciliation disappears after 3.5 days. Mitigation: "no stored history yet"; the snapshot is an owner call.
- Alerts and notes are browser-local. Mitigation: "fires while OnStock is open" in the alerts copy; sync is an owner call.
- The ledger makes legal-sounding claims from a founder with no entity. Mitigation: dated, sourced, in the issuer's words, "not legal advice" on every card.
- A table home can read as CoinGecko's stocks page. Mitigation: wrapper sub-rows, issuer spread, cheapest, per-leg age, dollars and the meter bank are exactly what CoinGecko lacks.
- The owner approved a chart-first frame a week earlier. Mitigation: both homes ship on the week-3 preview; nothing is deleted before the pick.
- The ten testers are mostly US and cannot hold xStocks. Mitigation: the Board and the ledger answer their questions without a holding; the Watching lens is their hook.

Questions for the owner, each with a default. Plan A proceeds on the defaults for 1, 3, 5, 6 and 7; the rest do not block it.

1. Default home: the Watching lens when it is non-empty, the Board otherwise? Default: yes, sorted by widest credible gap, last lens remembered.
2. A second colour for the gap fill? Default: no; teal, one colour.
3. Nine guarded single keys (W A C F ? and L H M I inside a chart) or chords only? Default: single keys; any-letter search is gone either way.
4. A stored daily gap snapshot (Supabase table written by the once-a-day Vercel cron) so percentiles and the Monday gap become stored fact? Default: not in these 90 days.
5. Trade as the fifth masthead word? Default: yes, for parity with the phone; removal is opt-in.
6. Close PR #9 and open a new PR from `feat/desktop-meter` into `release/onstock`? Default: yes.
7. JetBrains Mono on desktop numerals? Default: yes, one weight; drop it if testers find it cold.
8. Which ten people get the week-3 preview, and is at least one non-US? Default: the current testers.
9. A Holding lens (`api/holdings.js`, a Helius key, any pasted Solana address, 103 xStocks mints only)? Default: after the tester rounds.
10. A Supabase notes table for chart mark-ups? Default: after the tester rounds; browser-local until then.
11. Swap the phone wordmark to the rule, and retire the phone accent picker? Default: wordmark yes as the one phone change; picker stays.

## Sources

- The research workflow of 2026-09-12 (four ground-truth readers, five blind strategies, four judges, three adversarial reviews); the field reader fetched CoinGecko, rwa.xyz, xstocks.com, Kraken, Ondo, Dinari, Coinbase and Robinhood pages live on that date.
- `docs/research/2026-09-06/onstock-desktop-spec.md` and the eighteen-document TradingView teardown beside it.
- `docs/research/2026-09-07/live-teardown/02-robinhood.md` and `03-gap-list.md`.
- `docs/design-system.md`, `docs/roadmap.md`.
- Code on `feat/desktop-tradingview` at `6035e11`: `src/components/desktop/*`, `src/components/shared.jsx`, `src/components/asset/GapPanel.jsx`, `src/screens/Screener.jsx`, `src/state/PricesContext.jsx`, `src/hooks/useChartData.js`, `src/lib/sessionCopy.js`, `src/lib/prices.js`, `src/data/universe.json`, `src/index.css`, `vercel.json`.
