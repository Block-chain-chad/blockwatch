# 14 — Compare, overlays and spread charts

How TradingView puts two symbols on one chart. Written 2026-09-06 as a filler for the gap the critic found in the teardown: 01 §1.3 gave Compare nine lines and marked the dialog's placement options *could not verify*; spreads got one row in 01 §1.1; 02 and 09 mention "Scale price chart only" and the percent axis in passing; `../onstock-desktop-spec.md` Adapt #1 ("The Gap chart IS Compare, permanently") and Skip #20 (spreads) had no document behind them. Token-vs-share on one chart is OnStock's product, so this is the surface that matters most.

**Plain-English primer.** *Compare* adds a second symbol's line on top of the chart you are looking at. Because two symbols rarely trade at the same price level, TradingView flips the vertical axis from dollars to *percent change since the first visible bar*, so both lines start at the same point and you can see which one ran ahead. *A spread* is different: instead of two lines, you type a formula (`AAPL / XAUUSD`) and TradingView draws one line that is the result of the arithmetic. OnStock's "gap" is, in TradingView's vocabulary, a spread (`TOKEN / STOCK − 1`) that is drawn as an overlay.

**How this was verified.** Four kinds of source, in this order of trust:

1. Help Center articles (raw HTML fetched and read in full, not summaries).
2. The Advanced Charts (charting library) documentation — same engine as the website, so its labels and featuresets are authoritative for what the code can do, but the website may hide some of it.
3. The website's own English string tables. The chart page (`tradingview.com/chart`) loads a webpack runtime that lists 609 language chunks (`en.<id>.<hash>.js`) on `static.tradingview.com`; every one was downloaded and searched. A label found there is verbatim what the live UI prints; where a label lives in the *same chunk* as the Compare dialog strings, that is noted. Strings read from minified *code* (not the dictionaries) are marked "read from code" and should be treated as inference.
4. A short live guest session on `tradingview.com/chart/?symbol=NASDAQ:AAPL` in the Claude Code browser pane. It confirmed the dialog and legend labels and one parenthesis test before the pane was closed; the steps it did not reach are marked *could not verify live*.

The pricing table was read from the pricing page's raw HTML (the tick/cross SVG classes `checkIcon-…` / `crossIcon-…`), not from a summary.

---

## 1. The Compare dialog

### 1.1 The button and the dialog shell

| Item | Verbatim | Where it lives / notes | Source |
|---|---|---|---|
| Toolbar button, accessible name on the live page | **"Compare symbols"** | Third button on the upper toolbar, after **Symbol search** and **Switch data type**; the icon is a "+" in a circle. | live page (accessibility tree) |
| Help Center name for the same button | **"Compare or Add symbol button"** | "simply click on the 'Compare or Add symbol button' on the toolbar along the top of the chart." The Getting-started article: "This button allows you to choose an additional symbol to display on the chart together with the current symbol." | [Compare tool], [Getting started] |
| Same button in the string table | **"Compare or Add Symbol"** | In the base chart dictionary (`en.98390`) — used as the button's title/Quick-search entry. Library featureset `header_compare`: "Shows the Compare or Add Symbol button on the header panel." | string table, [Featuresets] |
| Library action id | `Chart.Dialogs.ShowCompareOrAddSymbol` (enum member `ChartDialogsShowCompareOrAddSymbol`) | Also `Watchlist.AddSymbolToCompare` and `Watchlist.AddSelectedSymbolsToCompare` — the watchlist can push symbols into Compare directly. The watchlist string "Add symbols from the table to compare them in the chart" exists in the tables. | [ActionId], string table |
| Dialog title | **"Compare symbols"** | `data-dialog-name="Compare symbols"` on the live page. | live page |
| Close button | **"Close menu"** | Top-right of the dialog. | live page |
| Search box placeholder | **"Symbol, ISIN, or CUSIP"** | Same search engine as Symbol Search (ISIN/CUSIP lookup works here too). | live page |
| First section header (guest, nothing added yet) | **"RECENT SYMBOLS"** | For a fresh guest the "recent" list is pre-seeded with **SPX** (S&P 500, SP), **NDQ** (US 100 Index, TVC), **DJI** (Dow Jones Industrial Average, DJ), **NI225** (Japan 225 Index, TVC), **DEU40** (GERMAN STOCK INDEX (DAX), XETR), **UKX** (UK 100 INDEX, FTSE) — the Help Center's "Several popular symbols are already listed, which you can select to add to the chart." Recents are stored per dialog (setting key `CompareDialog.recent`, read from code), separately from Symbol Search's recents. | live page, [Compare tool], code |
| Section for what is already on the chart | **"Added symbols"** | Same string chunk as the dialog (`en.75721`). Third-party: uncheck a symbol here to remove it from the chart. | string table, [Tradamaker] |
| Filters | The dialog shares the Symbol Search filter strings: **"All types"**, **"All sources"**, **"All exchange types"**, **"All sectors"**, **"All categories"**, group headers **"Categories"**, **"Exchange types"**, **"Sources"**, **"Sectors"**, **"Types"**. | Third-party: "Asset class filters and exchange/brokerage options are available to narrow results." Exact filter layout in the Compare dialog *could not verify live*. | string table, [Tradamaker] |
| Spread operators inside the dialog | Strings **"Show spread operators"** / **"Hide spread operators"** and the operator names **"Addition"**, **"Subtraction"**, **"Multiplication"**, **"Division"**, **"Exponentiation"**, **"Reciprocal"** sit in the same chunk as the dialog. | Library featureset `compare_symbol_search_spread_operators`: "Shows the spread operators in the Compare symbol dialog." On the live guest dialog the only `<button>` elements were **Close menu** and the three placement buttons, so whether the operator row is shown on the website's Compare dialog *could not verify live* (it may render as non-button toggles, or be hidden). | string table, [Featuresets], live page |
| Plan gate | None. Pricing row **"Compare symbols"**: Basic ✓, Essential ✓, Plus ✓, Premium ✓, Ultimate ✓. | Raw pricing HTML: five `checkIcon` cells. | [Pricing] |

### 1.2 The three placement buttons

Verified live: hovering a result row reveals three buttons, in this order, with exactly these labels.

| Button (verbatim) | What it does to the chart | What it does to the axis | Source |
|---|---|---|---|
| **"Same % scale"** | Adds the symbol as a line on the *main series' pane and scale*. | The main scale switches to **Percent**. Help Center: "When you add a symbol to a chart, the vertical axis will change from price to percentage. The percentage shown is the price movement for whatever period is currently visible on the chart. This is absolutely necessary. If you switch it back to price, the chart will collapse unless the price values of the symbols are very close to each other." (Their example: Google vs Apple "about $500 apart… both data series flatten out and the chart loses its effectiveness.") | live page, [Compare tool] |
| **"New price scale"** | Adds the symbol on the same pane but attached to a *new* price scale in its own currency/price units. | A second scale appears; when a pane has more than one scale the gear under each scale is replaced by a **letter** (A, B, …) that opens that scale's menu. Library: "Users can add new price scales via the Compare symbol dialog by selecting New price scale. The library allows users to have up to eight price scales on the chart. However, only one price scale can be displayed on mobile applications." | live page, [Price scale doc], [Configure Supercharts] |
| **"New pane"** | Adds the symbol in a *new pane below*, with its own scale. | The main scale is untouched. | live page, [Tradamaker], [Pineify compare] |
| **"Same scale"** (string only) | A fourth label exists in the same chunk. It is the non-percent variant of the first button ("same scale, keep price units"). When the website shows it instead of "Same % scale" *could not verify live*; the guest dialog showed the "%" wording. | — | string table |

**The axis after removal.** The Help Center does not say whether the scale returns to **Regular** when the last compared symbol is removed. The library exposes `Chart.PriceScale.TogglePercentage` as a plain toggle (no "auto-revert" action is listed). *Could not verify live* — the browser session ended before the removal step. Treat "the scale stays in Percent until you switch it back" as the safe assumption and test it if it matters.

### 1.3 Limits that touch Compare

| Limit | Detail | Source |
|---|---|---|
| Scales per pane | "up to eight price scales" (library). | [Price scale doc], [Indicator placement] |
| Indicators per layout | In-app message: **"Studies limit exceeded: {number} studies per layout. Please, remove some studies."** Pricing row "Indicators per chart": Basic 2, Essential 5, Plus 10, Premium 25, Ultimate 25 (08 §4). | string table, [08] |
| Do compared symbols count against that? | Read from code: the plan-limit counter is called with `dontCountVolume`, `dontCountOverlay`, `dontCountCompare` all true — i.e. Volume, Overlay and Compare studies are **excluded** from the per-chart indicator count. Inference from minified code; no Help Center sentence says this. | code |
| Mobile | One price scale only (library). | [Price scale doc] |

---

## 2. What a compared symbol looks like once it is on the chart

### 2.1 Which study it really is

Read from code: the website checks `Overlay@tv-basicstudies` and `Compare@tv-basicstudies` (`isCompareOrOverlayStudy`), and the string tables carry both study titles (`Overlay_study`, `Compare_study`). The library documents the two studies as:

| Study | Created by | Inputs | What it cannot do | Source |
|---|---|---|---|---|
| **Overlay** | `createStudy('Overlay', true, false, { symbol: 'IBM' })` | `symbol` | — supports **"Allow extend time scale"** and symbol logos in the legend. Default style **Line**. | [Indicators doc], [OverlayIndicatorOverrides] |
| **Compare** | `createStudy('Compare', false, false, { source: 'open', symbol: 'IBM' })` | `symbol`, `source` | "unlike Overlay, this indicator does not support the Allow extend time scale feature or logos in the Legend." Default plot colour `#9C27B0` (purple), line width 2, plot type `line`. | [Indicators doc], [CompareIndicatorOverrides] |

Both get `currencyId = null, unitId = null` on creation (read from code) — a compared series is not currency-converted with the main series.

### 2.2 The legend row

The legend ("status line") is "a list of series and indicators at the top-left corner of any chart" and its position cannot be changed. Each added study gets its own row under the main symbol row. Accessible names read from the live page:

| Row | Buttons (verbatim accessible names, in order) | Notes | Source |
|---|---|---|---|
| Main symbol row | **"Change symbol"**, **"Change interval"**, **"Flag symbol"**, **"Symbol/interval chart syncing"**, **"Hide"**, **"More"** | Plus the exchange label ("NASDAQ — NASDAQ Stock Market"), OHLC values and change. | live page |
| A study row (Volume shown live) | **"Hide"**, **"Show interval settings"**, **"Settings"**, **"Source code"**, **"Remove"**, **"More"** | Library legend doc names the same set: Hide, Settings, Remove, More, Source code. Featuresets: `edit_buttons_in_legend` "Shows the Hide, Settings, and Remove buttons in the Legend for indicators", `show_hide_button_in_legend`, `format_button_in_legend` "Shows the Settings button", `delete_button_in_legend` "Shows the Remove button". | live page, [Legend doc], [Featuresets] |
| The compared symbol's row | Same row type as a study. Help Center: "Simply move your cursor over the title bar in the top left corner of the chart and buttons will appear automatically." Third-party: a gear appears on hover; "Hover over the added symbol in the upper left and click **Remove**." | The exact button set on a compared-symbol row *could not verify live* (session ended before adding one); expect the study set minus "Source code". | [Hide/Settings/Remove], [Tradamaker], [Eightcap] |
| Whole legend | Button **"Hide indicator legend"** collapses the study rows. | | live page |

Legend extras from the library: `show_symbol_logo_in_legend` ("Display the main symbol's logo within the Legend"), `hide_resolution_in_legend`, `hide_unresolved_symbols_in_legend` ("Shows unresolved symbols in the chart legend and data window" — relevant when a compared ticker cannot be resolved), and `legend_context_menu` for the right-click menu.

### 2.3 Default colour and the Settings dialog

| Item | Detail | Source |
|---|---|---|
| Default colour | Library Compare study: `#9C27B0`. Third-party: "TradingView automatically assigns different colors to each overlaid symbol." The website's exact first/second colours *could not verify live*. | [CompareIndicatorOverrides], [Pineify overlay] |
| Style choices | The Overlay study's `style` accepts: **Bar** (0), **Candle** (1), **Line** (2, default), **Area** (3), **HollowCandle** (4), **Baseline** (5), **HiLo** (6), **Column** (7), **HLCArea** (8), **LineWithMarkers** (14), **Stepline** (15). So a compared symbol can be drawn as candles or bars, not only a line. | [OverlayIndicatorOverrides] |
| Other Overlay properties | `showPriceLine` (default false — the compared series has no last-price line unless you turn it on), `allowExtendTimeScale` (default false), `minTick`. | [OverlayIndicatorOverrides] |
| Compare-study properties | `plot.color`, `plot.linewidth` (2), `plot.linestyle` (0), `plot.plottype` (line), `plot.trackprice` (false), `plot.transparency` (0), `source` (`compare.source`, e.g. `"high"`). The website input label **"Price source"** exists in the string tables as a generic study input; that it is the Compare study's `source` label *could not verify*. | [CompareIndicatorOverrides], [Indicator overrides], string table |
| Dialog mechanics (third-party) | Gear → "Custom preference window" → adjust "style, color, and visibility" → **OK**. A **Defaults** dropdown offers **"Save as Default"** and **"Reset Settings"**; saved defaults "apply to symbols in the order they're added, not to individual instruments." | [Tradamaker] |
| Currency / unit | Not offered for a compared series (see §2.1). | code |

### 2.4 Removing a compared symbol

| Way | Verbatim | Source |
|---|---|---|
| Legend | hover the row → **"Remove"** | live page (study row), [Eightcap] |
| Compare dialog | open it again → **"Added symbols"** → uncheck | [Tradamaker], string table |
| Object tree | Right toolbar button **"Object tree and data window"**; Help Center: "hide, show, or remove the drawings, indicators and/or symbols." Library: the object tree is "a feature that allows managing (hiding, showing, or removing) drawings, indicators, and symbols on the chart." Compared symbols are listed there as symbols. | live page, [Restore hidden], [Object tree doc] |
| Context menu | Right-click the series → the study context menu (strings **"Remove"**, and the chart-wide **"Remove indicators"** / **"Remove drawings"**). | string table |
| Keyboard | No dedicated shortcut documented. | — |

### 2.5 Persistence and the symbol-name label

| Question | Answer | Source |
|---|---|---|
| Is it stored in the layout? | Yes — it is a study, and studies are part of a saved chart layout (06 §1). "Add this symbol to entire layout" is a string in the pane context-menu chunk, i.e. a compared symbol can be pushed to every chart of a multi-chart layout, like an indicator. | [06], string table |
| Does it survive changing the main symbol? | In the library a study stays when the main symbol changes. Third-party advice ("Save your layout configuration so overlay patterns follow when switching symbols") implies the same on the website. No primary sentence found — *could not verify*. | [Pineify overlay] |
| "Symbol name label" | Chart settings → **Scales and lines** → price-labels block → **"Symbol name label"** (string verified; 02 §4.2). Library featureset `auto_enable_symbol_labels`: **"Shows the symbol name label when comparing symbols."** — i.e. adding a compared symbol switches the ticker tags on the price scale on, so you can tell which last-value tag belongs to which line. Override `scalesProperties.showSymbolLabels`; action `Chart.PriceScale.Labels.ToggleSymbolNameLabelsVisibility`. | string table, [Featuresets], [Price scale doc], [ActionId] |
| Time scale | Library: featureset `secondary_series_extend_time_scale` "enables the *Allow extend time scale* option within the *Compare symbol* dialog"; example BTCUSD vs AAPL — "the upper chart allows the Overlay study to extend the time scale, while the bottom chart does not," showing "the points on the time scale where only BTCUSD has data." Default off: the compared 24/7 symbol is clipped to the main symbol's bars. The string **"Allow extend time scale"** is in the website's Compare-dialog chunk; where it is shown on the website *could not verify live*. | [Extending time scale], [Indicators doc], string table |

---

## 3. Scale modes for a two-series chart — as a workflow

The four modes, as TradingView defines them ([Configure Supercharts]; see 02 §10.1 for the same table):

| Mode (verbatim) | Definition |
|---|---|
| **Regular** | "A linear scale that uses absolute values in price changes… The distance between $40 and $80 on such a scale would be the same as between $400 and $440." |
| **Percent** | "A linear scale that uses percentage values in price changes to plot the price line. Each price change here is represented by a fixed distance from the chart's starting point." |
| **Indexed to 100** | "This scale is perfect for comparing completely different values that might seem incomparable. The first value here on the chart is set to 100. To calculate the following values, we add the percentage change of each symbol relative to the first value to 100." The 2018 launch post: "take the first value on the chart and set it to 100 for all the symbols that you want to compare… make a comparative assessment of price changes of symbols traded in completely different price ranges with a different volatility." Example there: DJI vs SPX, which are "two detached lines that can't be compared" until indexed. |
| **Logarithmic** | "an exponential scale that uses percentage changes in price… spacing between $40 and $80 would be ten times larger than between $400 and $440." |

The workflow, step by step, for a main symbol plus one compared symbol:

| Step | What you do | What TradingView does | Labels involved (verbatim) | Source |
|---|---|---|---|---|
| 1 | Add the second symbol with **Same % scale**. | Main scale flips to **Percent**; both lines start at 0 % at the first *visible* bar. Scroll or zoom and the anchor moves — the Help Center's "for whatever period is currently visible". Shortcut **Alt + P** toggles Percent (09 §6.3). | Price-scale right-click / gear menu: **Regular**, **Percent**, **Indexed to 100**, **Logarithmic** (radio group); **Auto (fits data to screen)** | [Compare tool], [09] |
| 2 | Lines look "detached" (one far above the other). | Help Center article "When comparing symbols, I only see detached lines on the chart": "enable **Indexed to 100** in the scale settings menu". Both lines are re-based to 100 at the first visible bar. Library action `Chart.PriceScale.ToggleIndexedTo100`. | **Indexed to 100** | [Detached lines], [Indexed blog], [ActionId] |
| 3 | You switch back to **Regular** to read dollars. | Both lines share one dollar axis; if their levels differ the chart "will collapse". | **Regular** | [Compare tool] |
| 4 | You want dollars for both without the collapse. | Remove and re-add with **New price scale**, or right-click the compared series → **Pin to scale** → **"Pin to new right scale"** / **"Pin to new left scale"**. The pane now shows two scales, each with a letter instead of the gear; each scale has its own mode (there are separate `Chart.Series.PriceScale.Toggle…` actions for the main series' scale). | **"Pin to new left scale"**, **"Pin to new right scale"**, **"Pin to left scale"**, **"Pin to right scale"**, **"Pin to scale {label}"** (with "(hidden)" variants), **"No scale (fullscreen)"**; the status line reads **"Pinned to left scale"** / **"Pinned to right scale"** / **"Pinned to scale {label}"** | string table (`en.99139`), [Price scale link moved], [ActionId] |
| 5 | Put one scale on each side. | Right-click a scale → **"Move scale to left"** / **"Move scale to right"** (the item flips depending on where the scale is). Chart settings → Scales and lines also lets you "choose either the left or right side for the scale." | **"Move scale to left"**, **"Move scale to right"** | string table, [Configure Supercharts], [Scales side] |
| 6 | Autoscale keeps zooming out to fit the compared line. | Turn on **Scale price chart only** — "will disable scaling of indicators or other chart elements" (autoscale fits the main series only; the compared series may leave the visible range). Library `scalesProperties.scaleSeriesOnly`, action `Chart.PriceScale.ToggleAutoScaleSeriesOnly`. | **"Scale price chart only"** | [Configure Supercharts], [02] |
| 7 | Too many scales. | Right-click any scale → **Merge All Scales Into One** → **On The Left** / **On The Right** (Help Center wording); the string tables print **"Merge all scales into one"**, **"Merge all scales to the left"**, **"Merge all scales to the right"**. Actions `Chart.PriceScale.MergeAllScales[ToLeft|ToRight]`. | as listed | [Merge scales], string table, [ActionId] |
| 8 | Move a series to another pane instead. | Series/indicator context menu → **"Move to"** → **"New pane above"**, **"New pane below"**, **"Existing pane above"**, **"Existing pane below"**. Actions `Chart.Source.MergeUp/MergeDown/UnmergeUp/UnmergeDown`. | as listed | string table, [Indicator placement], [ActionId] |
| Trap | You turn **Logarithmic** off. | "Beware: turning off logarithmic scale returns the chart to the regular price scale even if the previously chosen was Percent or Indexed to 100." So Log → off lands on **Regular**, not back on Percent. **Alt + L** toggles log; **Alt + I** inverts (09). | **Logarithmic**, **Invert scale** | [Configure Supercharts], [09] |

Other scale-menu items you will meet on the way (verbatim from the string tables): **"Auto (fits data to screen)"**, **"Lock price to bar ratio"**, **"Invert scale"**, **"Labels"**, **"No overlapping labels"**, **"Symbol name label"**, **"Symbol last price label"**. Featureset `hide_price_scale_if_all_sources_hidden`: "Hides the price scale if all indicators or series attached to the price scale are hidden" — hide the compared series and its dedicated scale disappears with it.

---

## 4. Spread / expression symbols

A spread is typed into **Symbol Search** (not the Compare dialog) in place of a ticker. Help Center: "Enter the first variable (symbol, number etc.) in the 'Symbol Search' window. Enter one of the four operators: Subtraction ( – ), addition ( + ), multiplication ( * ), or division ( / ), followed by a space. Enter the second variable in the 'Symbol Search' window."

| Item | Detail | Source |
|---|---|---|
| Operators (Help Center) | **–**, **+**, **\***, **/** — four. Example: `AAPL / XAUUSD` "will create a comparison of Apple stock vs. gold by dividing Apple stock's prices by gold prices." | [Spread charts] |
| Operators (app string tables) | The Symbol Search / Compare chunk names six: **"Addition"**, **"Subtraction"**, **"Multiplication"**, **"Division"**, **"Exponentiation"**, **"Reciprocal"**, behind a **"Show spread operators"** / **"Hide spread operators"** toggle. Library featuresets: `show_spread_operators` "Shows the spread operators in the Symbol Search dialog", `hide_exponentiation_spread_operator` "(^)", `hide_reciprocal_spread_operator` "(1/x)", `studies_symbol_search_spread_operators` "Shows the spread operators for some indicators in the Settings dialog." So `^` and `1/x` exist in the engine; the Help Center documents only four. | string table, [Featuresets] |
| Spacing rule | Help Center says the operator is "followed by a space", but its own examples are written without spaces (`1/EURUSD`, `BBY/EURUSD`, `AAPL/XAUUSD`, `TSX:META–NASDAQ:META`, `BTCUSD-BTCEUR×EURUSD`) and the Symbol Search tips article says "just type in NVDA+AAPL and press 'Enter'". Spaces are tolerated, not required. | [Spread charts], [Symbol search tips] |
| Numbers as operands | Allowed: "the first variable (symbol, number etc.)"; example inversion `1/EURUSD`. So `AAPL*2` and `1/AAPL` follow the documented grammar. | [Spread charts] |
| Parentheses | Help Center is silent. **Live test:** loading `tradingview.com/chart/?symbol=(NASDAQ:AAPL+NASDAQ:MSFT)/2` as a guest gave a chart whose tab title became **"(AAPL+MSFT)/2"** — the expression was accepted and resolved into a symbol name with the parentheses kept. Whether bars rendered for it could not be confirmed (the pane closed before the read-back), so record this as "parentheses are accepted by the parser; rendering not confirmed." | live test |
| Exchange prefixes | Use `EXCHANGE:SYMBOL` per leg for arbitrage spreads: `TSX:META–NASDAQ:META`. Options legs work too (in-app help: type `OPRA:AMZN250530C180.0+OPRA:AAPL250530P110.0` "into the Symbol search field and press the [Enter] key"). | [Spread charts], string table (`en.80560`) |
| Unique-symbol cap | "A single spread can include no more than 10 unique symbols." In-app messages: "A single spread can include no more than {count} unique symbols. Please double-check your spread formula." and "Please note that the maximum allowed number of unique symbols in a single spread formula is {count} symbols." In-app help title: "I can't add more than 10 symbols in the formula/spread". | [Spread charts], string table |
| How intraday bars are built | "Spreads for intraday charts are calculated by taking the open, high, low, and close of each 1-minute bar and then recompiling them into the selected interval. This approach is the only method that results in correct spread charts. We handle all necessary calculations on our servers and display the finished spread chart." | [Spread charts] |
| Repainting | "Spread charts can get repainted. The reason for this is that real-time bars are built on tick data, whereas historical bars are built from minute data… real-time and historical data in a spread chart may differ. When you refresh a chart, the bars may mismatch… This affects alerts set on spread charts." | [Spread charts] |
| Effect on alerts | Separate article "Issue with alert on a spread symbol": the alert server "processes data received in real-time, whereas the chart server can partially compute historical data, so the bars built on both servers can mismatch"; "there is currently no solution… we strongly advise not to set alerts on spread charts." | [Spread alert issue] |
| Saving an expression | "To avoid losing your equation, add it to your watchlists." In-app help for the watchlist: "click on the 'Add symbol' button in the watchlist interface. Choose a ticker by using the Up/Down arrow key… enter an operator… select the next ticker from the results… finally press the [Enter] key." Then "you will be able to open the options spread chart with just one click." | [Symbol search tips], string table |
| Mobile | "To open a spread option chart in the mobile app, you need to use the '=' sign before the formula." | string table (`en.80560`) |
| Pricing row | **"Intraday charts based on custom formulas (spreads)"**: Basic ✗, Essential ✗, **Plus ✓**, Premium ✓, Ultimate ✓ (raw HTML: two `crossIcon` cells then three `checkIcon` cells). The plan cards call the same thing **"Charts based on custom formulas"** and show it disabled on Basic. Daily and higher intervals on a spread are free; the in-app refusal string is **"Intraday spread data is not available"** (code path `intradaySpreadNotPermitted`). | [Pricing], string table, code |
| Chart features that refuse spreads | **Bar Replay**: "Non-standard chart types, spread charts, tick charts" are unsupported (01 §1.9); in-app: "Bar Replay isn't available for the current symbol." **Tick intervals**: the Help Center's list of symbols without ticks (indices without volume, options, TVC bonds/yields, end-of-day symbols) does not name spreads — *could not verify*. **Currency conversion / unit conversion** are separate Bar Replay refusals ("Bar Replay isn't available with currency conversion."). Read from code: the symbol type `spread` is on a `SYMBOL_TYPE_BLACK_LIST` together with `economic` for at least one widget (which one *could not verify*). | [01], string table, code |
| Pine | Reference note in the app: 'Please note that spreads (e.g., "AAPL+MSFT*TSLA") do not always return reliable data with this function.' (on `request.security`). | string table |
| Common uses (Help Center's own list) | Inversions (`1/EURUSD`), currency conversions (`BBY/EURUSD`), instrument comparisons (`AAPL/XAUUSD`), exchange arbitrage (`TSX:META–NASDAQ:META`), crypto arbitrage (`BTCUSD-BTCEUR×EURUSD`), pairs trading (ratio + Bollinger Bands at 2.2 standard deviations; "position sizing should match dollar values rather than share quantities"). | [Spread charts] |

---

## 5. Alerts on a compared symbol or a spread

| Case | What TradingView says | Source |
|---|---|---|
| Alert on the **spread symbol itself** (e.g. `AAPL/MSFT` crossing 8) | Counts as a **Price alert** — the type article lists "an alert on the spread symbol" among its Price examples, provided the operator is Crossing / Crossing Up / Crossing Down / Greater Than / Less Than. But see §4: "we strongly advise not to set alerts on spread charts." | [Alerts by type], [Spread alert issue] |
| Alert that uses a **compared (overlay) symbol** | Counts as a **Technical alert**: "An alert is considered Technical if any of the following conditions are met: the alert uses an overlay symbol, indicator, drawing or strategy…" | [Alerts by type] |
| How the Condition dropdown lists it | The dropdown lists the symbol first, then every study on the chart; a compared symbol is a study, so it appears under its own ticker like any indicator ("Open the Alert manager, click the Create alert button, and select the desired indicator from the Condition dropdown"). Exact wording of the entry for a compared symbol *could not verify live* (guests cannot open the alert dialog). | [Technical alerts] |
| Multi-condition alerts | "All conditions must use the same symbol." Whether an overlay counts as "the same symbol" *could not verify*. | [Multi-condition] |
| `{{ticker}}` / `{{exchange}}` for a spread | The placeholder article defines `{{ticker}}` as "ticker of the symbol used in alert (AAPL, BTCUSD, etc.)" and `{{exchange}}` as "exchange of the symbol used in alert (NASDAQ, NYSE, CME, etc)", with `_DL`/`_DLY` appended for delayed symbols. It says nothing about spreads — *could not verify*. Given the live chart titled a spread as its expression text ("(AAPL+MSFT)/2"), expect `{{ticker}}` to carry the expression and `{{exchange}}` to be empty or the first leg's exchange, but treat that as a guess. | [Placeholders], live test |

---

## 6. Built-in comparison indicators (the non-Compare routes)

| Indicator (verbatim) | Where | Inputs / Style (verbatim where documented) | What it gives you instead of Compare | Source |
|---|---|---|---|---|
| **Correlation Coefficient (CC)** | Indicators → Technicals (04 §3 lists it as a pane study) | Inputs: **Symbol** ("The second instrument which will then be compared to the original instrument on the chart"), **Length** (default 20), **Source** (default Close). Style: **Correlation** (visibility, colour, thickness, style; default **Area**), **Level** lines at 1, 0, −1. "Head to Indicators & Strategies and then search for Correlation Coefficient… a box will appear asking you to type in the asset you want to compare." | A single −1…+1 line in a pane: *how much* the two move together, not *where* they are. | [CC] |
| **Performance** | Indicators (04 §3) | "the current percentage change in prices of one or more symbols, over a set of chosen time periods, in a heatmap-style table." Inputs: **Include chart symbol**, **Symbol list** (comma-separated, e.g. "NASDAQ:AAPL"), **Timeframe list** (D/W/M/Y/YTD units, e.g. "1D, 1W, 1M"), **Positive color** / **Negative color**, **Color intensity cutoff (%)**, **Table position**, **Table width (%)** (100), **Table height (%)** (95). Formula `100 * (CurrentValue − PastValue) / PastValue`. | A table of period returns for several symbols — the "who ran ahead" question answered as numbers. | [Performance] |
| **Overlay** / **Compare** as studies | Engine ids `Overlay@tv-basicstudies`, `Compare@tv-basicstudies`; titles present in the string tables. | Inputs as §2.1. | Whether either is *listed* in the website's Indicators dialog (as opposed to being created by the Compare button) *could not verify live*; community scripts named "Compare"/"Overlay" dominate a search there. | code, string table |
| Pine `request.security()` | Any custom script | — | The scripted way to overlay a second symbol with full control (offset, timeframe); the Pine note in §4 warns that spreads as the security ticker are unreliable. | string table |

---

## 7. Multi-chart layout vs Compare

From 06 §4: a user reaches for a **2-chart layout** instead of Compare when the two symbols need *different chart types or intervals*, when each needs its own indicators and drawings, or when the two lines' price levels make one axis useless — with **Symbol** sync off, **Crosshair** sync on (so the status-line values of both charts update together), and optionally **Date range** sync on so scrolling one scrolls both. Compare wins when the question is "which one ran ahead over the visible window" — one axis, one crosshair, one legend — and loses the moment you need to *read a price* on the second symbol, because the shared axis is in percent. The gap product is the second case pretending to be the first: the two legs are in the same currency at almost the same level, so a shared dollar axis is readable and the "collapse" TradingView warns about never happens.

---

## What this means for OnStock

OnStock today: `DualLineChart.jsx` draws token and stock as two SVG lines "overlaid on a shared time + dollar scale" with hover/drag scrubbing and a readout; `CandleChart.jsx` is lightweight-charts v5 (`^5.2.1`) with a right price scale, a volume histogram on a blank `priceScaleId`, SMA/EMA overlays and an RSI pane. lightweight-charts exposes `PriceScaleMode` (`Normal`, `Logarithmic`, `Percentage`, `IndexedTo100`) on `priceScale().applyOptions({ mode })`, a `left` price scale, `priceScaleId` per series, `autoscaleInfoProvider`, and per-series `title`/`lastValueVisible`.

1. **Adapt — keep the dollar axis as the default for the token|stock overlay; offer Percent and Indexed to 100 as modes.** TradingView flips to Percent because arbitrary symbols differ in level; OnStock's two legs are the same asset at almost the same price, so **Regular** is the readable default and the gap is literally the vertical distance. Ship the mode radio (**Regular / Percent / Indexed to 100 / Logarithmic** in TradingView's words) on the candles chart via `priceScale.mode`; Percent/Indexed then answer "which leg ran ahead" without hiding the gap by default. (Spec Adapt #1 now has its document.)
2. **Adapt — anchor Indexed to 100 deliberately.** TradingView re-bases at the *first visible bar*, so the index shifts as you scroll. For a gap product a fixed anchor (token listing date, or the session open) is more honest; expose "since visible start" (TradingView's behaviour) and "since listing" as two anchors.
3. **Adopt — a left price scale for the stock leg is the "New price scale" mechanic, but ship it as an option, not the default.** Two axes hide the gap; use it only for the Percent/Indexed cases where the legs are re-based anyway. lightweight-charts: `priceScaleId: 'left'`, `leftPriceScale: { visible: true }`; letter the scales the way TradingView does (A/B) only if a third scale ever exists — it will not.
4. **Adopt — "Scale price chart only".** Autoscale on the token candles alone so a stale or gapped stock line cannot pull the range; `autoscaleInfoProvider` on the stock series returning `null` does this in one line.
5. **Adopt — the symbol-name label on the axis, auto-enabled when two series share a scale** (`auto_enable_symbol_labels`). `title: 'AAPLx'` / `'AAPL'` with `lastValueVisible: true` on both series; without it two last-value tags on one axis are unreadable, which is exactly why TradingView auto-enables it.
6. **Adapt — expose the gap as a literal spread in TradingView's grammar, but do not build a parser.** Print `AAPLx / AAPL − 1` (their operators, their spacing) as the gap pane's legend title and in the alert dialog, so a TradingView user reads it as a spread at a glance. Free-form expressions stay out: the Help Center's own repaint warning and its "strongly advise not to set alerts on spread charts" show how much support burden a general spread engine drags in, and OnStock's audience wants one spread.
7. **Skip #20 stands, with a sharper reason.** Replace the spec's "free-form expressions are noise for this audience" with: "the gap *is* OnStock's spread; TradingView gates intraday spreads behind Plus and refuses Bar Replay and alerts on them because they repaint — OnStock computes one spread server-side from the same two feeds and can make it first-class instead." Keep Exponentiation/Reciprocal/options legs out.
8. **Adopt — the repaint honesty, translated.** TradingView's spread repaints because real-time ticks and historical minutes disagree; OnStock's gap "repaints" because the stock leg is delayed while the token is live. Put the same one-line caveat TradingView puts on spreads on the gap series and on the drift alert ("the stock leg is delayed; the gap at trigger time can differ from the gap you see later"). This is the 07 §1 "overlay symbol → technical alert" rule turned into copy.
9. **Adapt — alerts on the overlay leg.** TradingView counts an alert on a compared symbol as a *technical* alert and warns against alerts on spread symbols. OnStock's gap-drift alert is that technical alert; add a plain **price** alert on the stock leg only if the delayed-data caveat is shown in the dialog, and never on intraday intervals shorter than the delay (TradingView's own countdown rule for delayed symbols).
10. **Adopt — Correlation Coefficient (token, stock) as a pane indicator.** It is the one built-in TradingView ships for exactly this question, with three inputs (Symbol, Length 20, Source Close) and levels at 1/0/−1; `indicators.js` can add it beside RSI in an afternoon. **Adapt — Performance** as a row in the gap panel: gap change over 1D / 1W / 1M rather than a heatmap table.
11. **Adapt — the legend row for the stock leg.** TradingView's compared symbol gets Hide / Settings / Remove / More. OnStock's stock leg is permanent, so: **Hide** (the existing `showStock`), **Settings** (Line / Candles / Area style — TradingView's Overlay study allows candles, which is the right way to show the stock's OHLC beside token candles), no **Remove**.
12. **Adapt — "Allow extend time scale", reversed.** TradingView clips the compared symbol to the main symbol's bars unless the option is on. OnStock's main axis must be the token's 24/7 clock and the *stock* is the leg with holes; draw the stock leg flat-dotted through closed sessions rather than clipping the token to market hours.
13. **Adopt — no gating on Compare.** TradingView gives Compare to the free tier and gates only intraday spreads; OnStock's free desktop keeps the full overlay and every scale mode (08 §12's rule).
14. **Skip — "New pane" for the stock leg and "Merge all scales".** A stock leg in its own pane defeats the product, and with at most two scales there is nothing to merge; the gap history pane below the candles (spec Adapt #2) is the only "New pane" OnStock needs.
15. **Skip — a 2-chart layout as the way to see token and share side by side** (06 §4 / spec Adapt #10) until Phase 3; the overlay already is the comparison, and TradingView users only fall back to two charts when the levels differ, which they do not here.

---

## Sources (every page actually read)

Help Center

- https://www.tradingview.com/support/solutions/43000543053-how-to-use-the-compare-tool/
- https://www.tradingview.com/support/solutions/43000502298-spread-charts-explained/
- https://www.tradingview.com/support/solutions/43000477709-when-comparing-symbols-i-only-see-detached-lines-on-the-chart/
- https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/
- https://www.tradingview.com/support/solutions/43000485562-how-can-i-merge-all-price-scales-into-one-on-the-left-or-right-side/
- https://www.tradingview.com/support/solutions/43000480236-how-to-place-all-the-scales-on-the-right-or-left/
- https://www.tradingview.com/support/solutions/43000480202-the-link-to-the-price-scale-setting-is-gone-from-the-indicators-symbol-settings-window/
- https://www.tradingview.com/support/solutions/43000565621-how-do-i-enable-disable-the-currency-unit-label-on-the-price-scale/
- https://www.tradingview.com/support/solutions/43000539711-how-to-show-hide-settings-and-remove-options-of-an-indicator-or-ticker-symbol/
- https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/
- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/
- https://www.tradingview.com/support/solutions/43000746682-tradingview-symbol-search-tips-for-finding-assets/
- https://www.tradingview.com/support/solutions/43000478406-issue-with-alert-on-a-spread-symbol/
- https://www.tradingview.com/support/solutions/43000696403-alerts-separation-by-type/
- https://www.tradingview.com/support/solutions/43000763315-getting-started-with-technical-alerts/
- https://www.tradingview.com/support/solutions/43000763312-learn-how-to-configure-alerts/
- https://www.tradingview.com/support/solutions/43000761492-multi-condition-alerts/
- https://www.tradingview.com/support/solutions/43000531021-how-to-use-a-variable-value-in-alert/
- https://www.tradingview.com/support/solutions/43000502022-correlation-coefficient-cc/
- https://www.tradingview.com/support/solutions/43000736064-performance/

Blog and pricing

- https://www.tradingview.com/blog/en/indexed-to-100-scale-new-compare-tool-8979/
- https://www.tradingview.com/blog/en/new-release-of-stable-charting-library-and-trading-terminal-v1-14-12097/ (only the "indexing at 100 was added to price scales" line)
- https://www.tradingview.com/pricing/ (raw HTML; rows "Compare symbols" and "Intraday charts based on custom formulas (spreads)")

Advanced Charts (charting library) documentation

- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/indicators/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/indicators/indicator-placement/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/object-tree/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Symbol-Search/
- https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets/
- https://www.tradingview.com/charting-library-docs/latest/customization/overrides/indicator-overrides/
- https://www.tradingview.com/charting-library-docs/latest/custom_studies/Studies-Extending-The-Time-Scale/
- https://www.tradingview.com/charting-library-docs/latest/api/enums/Charting_Library.ActionId/
- https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.OverlayIndicatorOverrides/
- https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.CompareIndicatorOverrides/

Live website and its string tables

- https://www.tradingview.com/chart/?symbol=NASDAQ:AAPL (guest; Compare dialog, legend rows, toolbar accessibility names)
- https://www.tradingview.com/chart/?symbol=(NASDAQ:AAPL+NASDAQ:MSFT)/2 (parenthesis test; tab title "(AAPL+MSFT)/2")
- https://static.tradingview.com/static/bundles/runtime.c19e6b1def7a100191c2.js (chunk map used to enumerate the 609 `en.*` dictionaries)
- https://static.tradingview.com/static/bundles/en.98390.d6895db633f8b2b73223.js (base chart strings: "Compare or Add Symbol", scale menu, "Symbol name label")
- https://static.tradingview.com/static/bundles/en.75721.7a9e2b8b2fdfe5c315f2.js (Compare dialog: "Same % scale", "New price scale", "New pane", "Same scale", "Added symbols", "Allow extend time scale", operator names)
- https://static.tradingview.com/static/bundles/en.99139.ee3999dd5924e7ee2ef8.js (series context menu: "Pin to …", "Move to", "No scale (fullscreen)")
- https://static.tradingview.com/static/bundles/en.88190.ffb9a71045d3d79293d0.js ("Merge all scales to the left/right", Quick-search actions)
- https://static.tradingview.com/static/bundles/en.80560.27483e389bc8d6c5f523.js (in-app help: spread formulas, 10-symbol messages, mobile "=" prefix)

Third-party (gap-filling only, flagged in the text)

- https://tradamaker.com/tradingview-overlay-charts/
- https://pineify.app/resources/blog/how-to-overlay-two-charts-in-tradingview-a-complete-guide-for-traders
- https://www.eightcap.com/labs/using-overlay-charts-in-tradingview-for-comparative-analysis-the-must-have-guide/

Not readable (403): https://pineify.app/resources/blog/how-to-compare-charts-in-tradingview , https://chartchampions.com/object-tree-in-tradingview/ , https://nexusfi.com/a/platforms/tradingview-spread-charts — search snippets from the first were used for the "New pane" wording only.

Teardown cross-references: [01] `01-supercharts-anatomy.md` §1.1, §1.3, §1.5, §1.9; [02] `02-chart-settings-dialog.md` §4.1, §4.2, §10.1; [04] `04-indicators-and-strategies.md` §3; [06] `06-layouts-and-multichart.md` §4; [07] `07-alerts.md` §1; [08] `08-plans-and-gating.md` (pricing rows); [09] `09-interactions-and-shortcuts.md` §6.3.
