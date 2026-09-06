# TradingView teardown 16 — Data provenance on the chart and chart-page notices

Date: 2026-09-06. Filler for the critic's gap #16. Scope: how TradingView **labels, explains and apologises for its data** — the delayed-data marks and their pop-ups, the data-source and data-type switchers, the Symbol Info dialog, every message/warning/notice a chart page can show, the Help Center's "why does my chart look wrong" folders, historical depth as the user meets it, the Table view and CSV export, and how economic data and Treasury yields are named and charted. This is the Help Center's **Data** category (367 articles, the second largest, 22 categories in the index) plus four untouched Chart-category folders, neither of which had a document in the thirteen-file sweep.

Why it matters for OnStock: the product is two feeds with different delays and different provenance (near-live DEX candles from GeckoTerminal against delayed, regular-session-only stock data), so "what am I looking at, how old is it, and where did it come from" is on-thesis rather than decoration. The spec already leans on it (Adapt #9, A13).

Method. (a) The live index at `tradingview.com/support/knowledge-base/` → the **Data** category and its nine folders → every non-list article was fetched; (b) the Chart-category folders "Why I'm getting a message/warning/notice on my chart page?" (5), "Chart and/or indicators are being displayed incorrectly" (16), "Charts are not saving/not syncing" (10), "Chart legend" (2), "Chart legend errors after applying indicators or strategies" (7), "I want to export/download chart data" (1) and the relevant articles from "I can't find a certain feature or setting" (43); (c) the Advanced Charts library docs (Legend, Market Status, Symbology, Trading Sessions, Featuresets, LibrarySymbolInfo, SymbolExt, Datafeed required methods); (d) the **live guest Supercharts page** on 2026-09-06 (NASDAQ:AAPL, then LSE:VOD), from which the legend strings, the Market Status pop-up, the "Switch data type" menu, the canvas context menu and the watchlist tooltips below were read from the accessibility tree; (e) a handful of third-party pages, flagged as such, only where the primary sources were silent. Where a Help Center article shows its answer only in a screenshot, or where the live page would not open a dialog for a guest, the text says **could not verify** rather than guessing.

Vocabulary as TradingView prints it: the top-left readout is the **legend** (library) or **status line** (Help Center); the dot/clock icon in it is the **Open market status**; a delayed feed carries a **D** badge and a **"Data is delayed"** section; the free US-stock source is **Cboe One**; a delayed ticker id carries the suffix `_DL` or `_DLY`. Plans are **Basic / Essential / Plus / Premium / Ultimate** (an **Expert** SKU appears in some articles).

---

## 1. Delay signalling — how the chart says "this is old"

### 1.1 The marks and where they appear

| Mark (verbatim where TradingView names it) | Where it lives | What it means | Source |
|---|---|---|---|
| **D** badge (yellow letter) | Legend, after the symbol title; watchlist rows; Alerts panel | "A 'D' letter displays for other delayed symbols beyond Cboe data" — the symbol's feed is delayed. On the live guest chart, the watchlist showed **D** beside `SPX` and `VIX`; the LSE:VOD legend showed **D** beside "Vodafone Group Public Limited Company · 1 · LSE". | [Alerts real-time/non-real-time], live page |
| **Red icon** (Cboe) | Legend, after the symbol title; Alerts panel | "A red icon appears on charts when data comes from Cboe" — US stocks served from Cboe One (real-time, but not the primary exchange). Real-time primary-exchange symbols "show no red icon". On the live chart AAPL carried the red Cboe icon and a second icon for the market status. | [Alerts real-time/non-real-time], live page |
| **"Data is delayed"** section | Inside the legend's market-status pop-up; also the legend's accessible label | Library: `display_data_mode` (default **Off**) "Enables an icon and the _Data is delayed_ section in the _Legend_." On tradingview.com it is on: the delayed LSE:VOD legend button reads **"Market closed · Data is delayed"**. | [Featuresets], [Legend doc], live page |
| **"Learn more"** button | Under each section of the market-status pop-up | Help Center: "when the chart displays a 'Data is delayed' message, users can click a 'Learn more' button to purchase real-time access" — destination is the real-time market data purchase flow (Settings and billing → Subscriptions → Real-time market data, or the Market Data page). | [Purchase market data] |
| Watchlist tooltip **"Quotes are delayed by 10 min"** / **"Quotes are delayed by 15 min"** | Hover on the **D** badge in a watchlist row | The per-symbol delay stated in minutes (10 min on a CME/Cboe-futures-sourced row, 15 min on the SPX row in the default guest list). | live page |
| Symbol page status line **"Market closed · Last update at Sep 4, 16:59 GMT-7"** | Symbol overview page (`/symbols/NASDAQ-AAPL/`) and the Details section under the watchlist | Session state plus the timestamp of the last tick, in the exchange's offset. LSE:VOD's page printed "Market closed" and "No trades". | live page, symbol pages |
| Ticker suffix **`_DLY`** | Internal ticker id (accessible name "Chart for LSE_DLY:VOD, 1 minute"); `{{exchange}}` alert placeholder | The delayed variant of an exchange feed is a distinct ticker namespace: `LSE_DLY:VOD` for a guest, `LSE:VOD` once real-time is bought. | live page, [Alerts real-time/non-real-time] |
| Order panel / DOM delay | Trading panel | Bid/ask come from the broker: "If market data for a symbol is already delayed on the broker's platform itself, those same delays will be reflected in TradingView's Order Panel and DOM" — buying TradingView's data package does not fix it. | [IB order panel delayed], [Source of real-time data] |

### 1.2 The legend's market-status string

The legend row's status button is one string built from up to three segments joined by " · ". Read verbatim from the live guest chart:

| Symbol | Accessible label of the legend button | Segments |
|---|---|---|
| NASDAQ:AAPL (Cboe One, guest) | **"Market closed · One update every 5 seconds · NASDAQ by Cboe One"** | session state · update cadence · exchange **by** source |
| LSE:VOD (delayed, guest) | **"Market closed · Data is delayed"** | session state · delay flag |

The segments are, in order: (1) the session state — **Market closed**, and by the pop-up copy, pre-market / post-market / open states (labels for the open states **could not verify** on a weekend; the library's `custom_translate_function` example overrides the default "Market closed"); (2) the update cadence for throttled plans — **"One update every 5 seconds"** on Basic; (3) the source line **"NASDAQ by Cboe One"**, i.e. `{listed exchange} by {data source}`. For a delayed feed the second and third segments collapse into **"Data is delayed"**. A "Real-time" or "Delayed by 15 min" wording in the legend itself **could not verify** — the minutes appear in the watchlist tooltip, not the legend.

### 1.3 The Market Status pop-up (click the status icon)

Verbatim from the live guest chart, NASDAQ:AAPL, Sunday 2026-09-06:

| Section header | Body text | Control |
|---|---|---|
| **Market closed** | "Time for a walk — this market is closed. It'll open for pre-market trading in 1 day and 21 hours." Under it a session timeline ruler `00:00 … 24:00` with the session shaded, labelled **"Exchange timezone: New York (UTC-4)"**. | — |
| **One update every 5 seconds** | "Data on our Basic plan is updated once every 5 seconds, even if there are more updates on the market. Paid plans feature faster data updates." | **Learn more** |
| **NASDAQ by Cboe One** | "Real-time data for AAPL is provided by Cboe One exchange. This data is real-time, but it may be slightly different to its official counterpart coming from NASDAQ." | **Learn more** |

Library documentation of the same pop-up: "a pop-up interface that displays trading session information and current market conditions"; the timeline is built from `session` / `subsessions` in `LibrarySymbolInfo` and "reflects market hours in the exchange time zone"; `ICustomSymbolStatusApi` lets an integrator add "custom status indicators" with an SVG icon, a colour (`'rgb(255, 40, 60)'`), a hover tooltip and a dropdown with "titles, explanations, and clickable actions"; `display_market_status` in `disabled_features` hides it. The Help Center's route to turn it off: right-click the status line → **Show Open market status** (or Chart settings → Status line tab → **Open market status**). The pop-up body for a *delayed* symbol (the LSE:VOD "Data is delayed" section) **could not verify** — the guest pane would not open it; the Help Center's description is that the section explains the delay and its "Learn more" leads to the purchase flow.

### 1.4 How delay is stated per exchange

The Market Data / data-coverage page (`tradingview.com/data-coverage/`) is a table of exchange × asset types × **Delayed data** × **Real-time** (non-professional / professional prices). Delays are printed as a bare minute count after the delayed label:

| Exchange | Delayed data | Real-time (non-pro / pro) | Note |
|---|---|---|---|
| NASDAQ Stock Market | Free | $3.00 / $27.00 per month | Delay minutes not printed on the fetched row; the guest watchlist tooltip for a NASDAQ-sourced index read "delayed by 15 min" |
| NYSE | Free | $3.00 / $48.00 | as above |
| NYSE Arca | Free | $3.00 / $25.00 | as above |
| Cboe One | Free | $0.00 / $0.00 | The free real-time default for US stocks |
| Cboe CFE / Cboe CGIF | 10 min / 15 min | — | Futures / indices |
| OTC Markets | 15 min | $3.00 / $50.00 | |
| CME Group | 10 min | $7.00 / $548.00 | |
| LSE, Euronext, HKEX, NSE | 15 min | — | |
| TSE (Tokyo), ASX | 20 min | — | |
| Crypto exchanges | — | free real-time | "Cryptocurrency exchanges provide real-time data without additional charges" |

Other rules from the Data category: `INDEX:DXY` "offers only EOD (end-of-day) data that updates once daily" — use `TVC:DXY`, "this CFD is free with real-time data"; NSE is real-time for non-professionals but delayed for professionals until "the required exchange agreement" is signed, and BSE is delayed for everyone until the package is bought. The library's vocabulary for the same three states is `data_status: "streaming" | "endofday" | "delayed_streaming"` with `delay` = "0 for realtime, -1 for endofday, or seconds for delayed data".

### 1.5 Alerts and the `_DL` / `_DLY` suffix

From "Alerts based on real-time and non-real-time symbols": the Alerts panel shows the red Cboe icon or the **D** letter on delayed symbols; "The prefix of the exchange is only displayed in the alerts manager section", "the prefix is not displayed in the alert dialog. Only the symbol name is indicated"; and the `{{exchange}}` placeholder appends `_DL` or `_DLY` for delayed symbols (cross-ref 07 §3.1). The live page confirms the namespace: a guest's LSE chart is literally `LSE_DLY:VOD`.

### 1.6 The countdown rule (cross-ref 02 §4.2, 09)

"The countdown is not displayed on the chart": with a 15-minute delayed feed "the countdown will only be displayed for the time intervals over 15 minutes"; also hidden on Renko/Kagi/PnF/Line Break/Range, outside trading hours on intraday, and when the PC clock is wrong.

### 1.7 The settlement rule (cross-ref 02 §2.2)

"Can I switch Settlement and Last prices as close for futures?": daily+ bars can close on **Last price** or **Settlement price**; "Watchlist, Details, Screener always use Settlement prices" — so a futures chart and its watchlist row can legitimately disagree by design.

### 1.8 Pre/post-market and 24-hour sessions as provenance

| Item (verbatim) | Where | Behaviour | Source |
|---|---|---|---|
| **ETH** button | Bottom-right of the chart (beside **ADJ**) | Toggles extended-hours bars on intraday intervals. "If a symbol lacks extended hours data, the ETH button will not appear"; the tint is changed or removed in the Symbol tab. | [Extended hours] |
| **RTH** button | Bottom-right (seen live on LSE:VOD) | For CME futures, **Regular Trading Hours** "08:30-15:15 CT" vs **Electronic Trading Hours** (full session); intraday only — "daily candles contain identical data regardless of session type". | [CME RTH/ETH], live page |
| **24h** session option | Symbol tab | For BOATS-supported US stocks combines RTH + ETH + an **Overnight** session; periods are "visually separated on the chart"; watchlists show overnight prices "without separate symbol entries". | [24-hour sessions] |
| **Pre- / Post-Market Price Label** | Price-scale context menu → Labels | A label on the scale and chart for the extended-session price; hidden "if you've enabled trading data outside the session on the intraday interval, because the data is already on the chart". Colours: Chart Settings → Symbol → **Pre- / Post-Market Price Line**. | [Pre/post labels blog] |
| **Pre/post-market price line** | Price-scale gear → Lines | The line for the extended-session price. | [Extended session price line] |
| Screener **Extended Hours** tab / columns | Screener | "This data is available only during an extended session". | [Screener pre/post] |

---

## 2. The two switchers beside the symbol — which is which

01 §1.2 called the button beside the symbol the "Data type switcher" and could not verify its contents. The live page settles it: there are **two different things**, and only one of them is about data provenance.

### 2.1 "Switch data type" — a *view* switcher, not a data-source switcher

The button immediately right of the symbol search has the accessible name **"Switch data type"**. Clicked on the live guest chart it opened this menu (verbatim, grouped as printed):

| Group | Items |
|---|---|
| (top) | **Chart** (checked — the current view) |
| **FUNDAMENTALS** | **Financials**, **Documents** |
| **ANALYSIS** | **Technicals**, **Seasonals**, **News**, **Forecast**, **Community** |
| **ASSETS** | **Options**, **Bonds**, **ETFs** |

Each item swaps the chart pane for another view of the same symbol (the "Getting started with Supercharts" description "technical indicators rating, seasonals, news, and trading ideas" is this menu). It never changes where the price data comes from. Gating: none seen for a guest.

### 2.2 The data *source* — what a US stock is actually fed from, and how to change it

There is **no drop-down on the chart that switches a US stock between Cboe One and NASDAQ**. The source is decided by the account's data entitlements and is only *displayed* (legend "NASDAQ by Cboe One", red icon). Changing it is a purchase or a verification:

| Path (verbatim) | What it does | Gating | Source |
|---|---|---|---|
| Default | "U.S. stock data typically comes from Cboe Exchange by default"; Cboe "accounts for over one fourth (25%+) of the US stock market" and "doesn't have any per-user fees imposed by the exchange" — free real-time on every plan including Basic (throttled to one update per 5 s on Basic per the pop-up). | none | [US stock data free?], [Purchase market data], live page |
| Buy the primary feed | Avatar → **Settings and billing** → **Subscriptions** (under Billing) → **Real-time market data** → **Explore now**; or the Market Data page; or the chart's **Learn more**. After purchase the symbol streams from NASDAQ / NYSE / NYSE Arca and the red icon goes away. | paid plan or trial; "Maximum market data subscriptions allowed" 2/4/6/… per 08 §6; professionals need Ultimate | [Purchase market data], 08 §11 |
| Identify which package | "clicking on a chart's market status indicator … displays the relevant subscription in a dropdown menu"; or type the ticker in symbol search and read the exchange on the right of the row. | — | [Purchase market data] |
| Broker-verified data | Connect the broker in the Trading Panel; real-time data already paid for at the broker is unlocked for 7 days per login (13 §7). "TradingView offers real-time data verification for Interactive Brokers accounts, which prevents users from needing to purchase market data subscriptions twice." | broker account | [IB order panel delayed], 13 §7 |
| Broker **data type** example | PhillipCapital Türkiye: free real-time **BIST_MIXED** (no volume) vs 15-min delayed BIST (with volume). "BIST MIXED is a light package that includes real-time price data for stocks, futures and 2 indices BIST 100 and BIST 30, however, all symbols in this package are provided without the volume data." The switch itself is a broker-menu setting (13 §7); a chart control for it **could not verify**. | broker | [BIST MIXED], 13 §7 |
| Forex provider choice | Not a switch — a different symbol: ICE symbols "are composite … data received from dozens of contributors", "ICE symbols do not have volume data for daily resolutions, and Forex.com symbols do not have volume data for all resolutions"; FXCM/OANDA carry volume on all timeframes. | — | [ICE vs other forex], [No ICE daily volume] |
| Crypto aggregate vs venue | `CRYPTO:` symbols are TradingView-calculated averages ("arithmetic average … from cryptocurrency spot markets listed on TradingView", outliers "different from other sources" excluded); an exchange-prefixed pair is that venue only. | — | [Average crypto prices] |

### 2.3 The Cboe caveat, verbatim

"Is US stock market data free by default?": differences from other sources "typically appear on lower timeframes (i.e. 1 min), on non-active or unpopular tickers and during pre-/post-market sessions" because Cboe has lower volume than the primary exchanges; "Cboe data for US stocks isn't bad or wrong"; primary-exchange data is paid because "we must collect these payments and remit them to the exchange, plus notify them of who's accessing their data". The pop-up repeats it in one line: "This data is real-time, but it may be slightly different to its official counterpart coming from NASDAQ."

---

## 3. The Symbol Info dialog

### 3.1 How it opens

| Route | Detail | Source |
|---|---|---|
| Legend row → hover → **More** (the `···` button, accessible name "More") → **Symbol info** | The legend's hover buttons on the symbol row are "Change symbol", "Change interval", "Flag symbol", "Symbol/interval chart syncing", "Hide", "More" (09 §6.1). Library: featureset `symbol_info` (default On) "Shows the _Symbol Info_ option on the _Legend_ widget." | 09, [Featuresets] |
| Right-click the series | Series context menu carries **Symbol Info** (action id `Chart.Dialogs.ShowSymbolInfo`, 02 §10.4). | 02 |
| Not on the empty canvas | The canvas right-click menu read live is: **Copy price 295.07**, **Paste** (Ctrl+V), **Add alert on AAPL at 295.07…** (Alt+A), **Buy 1 AAPL at 295.07 limit** (Alt+Shift+B), **Sell 1 AAPL at 295.07 stop**, **Add order on AAPL at 295.07…** (Shift+T), **Lock vertical cursor line by time**, **Table view**, **Object tree**, **Remove 1 indicator**, **Settings…** — no Symbol Info there. | live page |

The guest pane would not open the dialog itself, so the **live field order and labels could not verify**. What follows is the field set the dialog is built from (the library's `LibrarySymbolInfo`, whose descriptions say which fields "will be displayed in the chart legend", "in the Symbol Info dialog" or "on the price axes") plus the four labels a third-party walkthrough names.

### 3.2 The field set (library `LibrarySymbolInfo` / `SymbolExt`, verbatim descriptions)

| Field | Type | What the docs say it is / where it shows |
|---|---|---|
| `name` | string | "identifier for a symbol within an exchange, such as `AAPL`" |
| `ticker` | string | internal id "not displayed to users"; "avoid colons unless following TradingView format" |
| `description` | string | "The description of the symbol. Will be displayed in the chart legend for this symbol" |
| `long_description` | string | "optional long(er) description … displayed in the Symbol Info dialog and on the price axes" (featureset `symbol_info_long_description`, default Off) |
| `type` | string | "Category type: stock, futures, bitcoin, forex, index" |
| `exchange` | string | "Traded exchange (current (proxy) exchange). The name will be displayed in the chart legend" |
| `listed_exchange` | string | "The primary exchange where the instrument is listed" |
| `exchange_logo`, `logo_urls` | string / string[] | logos for exchange and symbol (featuresets `show_symbol_logos`, `show_exchange_logos`) |
| `sector`, `industry` | string | classification of the instrument |
| `currency_code` | string | "The currency in which the instrument is traded or some other currency if currency conversion is enabled"; `original_currency_code` = the native one |
| `unit_id`, `original_unit_id`, `unit_conversion_types` | string | unit of measurement and the conversions offered |
| `pricescale` | number | "number of decimal places or fractions that the price has" |
| `minmov`, `minmove2`, `fractional`, `variable_tick_size` | number / bool / string | "number of units that represents the price tick"; "fraction of a fraction"; fractional notation; tick that varies by price level |
| `format` | `SeriesFormat` | how price labels display (price / volume) |
| `volume_precision` | number | decimals for volume |
| `timezone` | string | "time zone of the symbol's exchange" (IANA, e.g. `America/New_York`) |
| `session` | string | "trading hours for the symbol" — `0930-1600`, `24x7`, `1700F-2200`, `0930-1400,1430-1700`, `:2`…`:34567` day suffixes, history `0930-1700#20181114/1100-1800`; **must be in the exchange time zone** |
| `session_display` | string | display form of the session |
| `session_holidays`, `corrections` | string | "days when normal trading sessions do not occur"; per-day session changes as `SESSION:YYYYMMDD` |
| `subsessions`, `subsession_id` | array / string | `regular` / `extended` (premarket / postmarket) definitions |
| `data_status` | enum | `streaming` \| `endofday` \| `delayed_streaming` |
| `delay` | number | "0 for realtime, -1 for endofday, or seconds for delayed data" |
| `expired`, `expiration_date` | bool / unix | "whether this symbol is expired futures contract or not"; the date |
| `isin` | string | International Securities Identification Number |
| `base_name` | string[] | components of a spread, e.g. `['NASDAQ:AAPL', 'NASDAQ:MSFT']` for `AAPL*MSFT` |
| `price_source_id`, `price_sources` | string / object[] | "Price sources appear in the series legend and indicate the origin of values represented by symbol bars" (featureset `symbol_info_price_source`, default Off) |
| `has_intraday`, `has_seconds`, `has_ticks`, `has_daily`, `has_weekly_and_monthly`, `has_empty_bars`, `supported_resolutions`, `*_multipliers` | bool / arrays | which bar sizes exist; `has_empty_bars` = "the datafeed has gaps in data that differ from the default symbol session" |
| `visible_plots_set` | string | "which values the symbol supports, such as open, high, low, close, and volume" (e.g. a yield has no volume) |
| `library_custom_fields` | object | "custom symbol info fields … shown in the Security Info dialog" |

### 3.3 Labels the live dialog is known to print

From a third-party walkthrough of the tradingview.com dialog (TradingCode, "'Symbol Info' window in TradingView" — the page itself returned 403 on fetch; the labels below are from the search index's snippets and are flagged as such): **Exchange** ("the alternative exchange TradingView loads data from when the primary exchange isn't accessible" — e.g. a JPM chart showing 'Cboe BZX'), **Listed Exchange** ("the official (primary) exchange where the instrument trades" — NYSE for JPM), **Currency** ("the currency the instrument trades in, or for currency pairs, the second currency"), **Tick Size** ("the instrument's smallest possible price change … 0.01 for most stocks, 0.25 for the E-mini S&P 500 future, and 0.00001 for most foreign exchange pairs"), **Sector** and **Industry**, and a **Point Value** row (definition not captured). Rows for Description, Symbol, Timezone, Session, ISIN, Price scale / min tick **could not verify** on the live dialog; the symbol *page* profile (verified live) prints **Website**, **Employees (FY)**, **ISIN** `US0378331005`, **CUSIP** `037833100`, **FIGI** `BBG000B9XRY4`, **CFI code** `ESVUFR`, and the header prints **Apple Inc · NASDAQ · Electronic Technology · Telecommunications Equipment**, the price in **USD**, and **"Market closed · Last update at Sep 4, 16:59 GMT-7"**.

Related settings that expose the same facts elsewhere: **Precision** (Chart settings → Symbol; "Default" = "a standard view of prices that the provider sends"); the **Timezone** button on the bottom bar ("clicking on the clock or in the chart settings in the _Symbol_ tab"; library featureset `timezone_menu`); the currency button "at the top of the price scale" and the unit button "on the scale" (§5.7).

---

## 4. Chart-page notices and warnings

Every message a chart page can show that the Help Center documents, with its text, trigger and remedy. The five articles of "Why I'm getting a message/warning/notice on my chart page?" come first, then the others gathered from adjacent folders and the library.

| Notice (verbatim text) | Trigger | Remedy / behaviour | Source |
|---|---|---|---|
| **"Data is delayed"** (legend section; button label "Market closed · Data is delayed") | The symbol's feed is delayed for this account | Click **Learn more** → buy the exchange package (or verify via broker). Not an error. | [Purchase market data], live page |
| **"One update every 5 seconds"** (legend section) | Basic plan / guest on a real-time feed | Informational; "Paid plans feature faster data updates." **Learn more** → pricing. | live page |
| Connection closed pop-up (article title **"Why was the connection closed?"**; button **"Restore connection"**) | "you've reached the limit of the allowed number of connections for your plan" — "Each open chart page counts as one connection"; "the oldest open connection automatically closes, and a notification window appears in that tab"; it "displays how many connections are available for your specific user plan" | Closing the window "leaves you on a disconnected chart — you can only restore it by refreshing the page"; **Restore connection** reconnects "while preserving drawings and chart layout changes" but "will terminate the connection in another tab"; use multi-chart layouts (2/4/8/10/16 charts per tab by plan). Hard cap 200 connections; each browser tab and each app tab counts. | [Connection closed], [Parallel connections] |
| **"Your chart layout was changed"** | "a chart layout has been saved in a different location — such as on another device, in a different browser, or in another browser tab" | Cautionary only: "any modifications they save will overwrite changes made in the other location". | [Layout was changed] |
| **"It's time to clean up!"** | "excessive drawing objects saved on your chart" — a stored-drawings limit | Open **Manage Drawings**, remove unneeded drawings. | [Time to clean up] |
| **"Your chart is too large and cannot be saved"** | "your chart layout exceeds TradingView's maximum size limit" (limit undisclosed) | Delete drawings in **Manage Drawings**, or start a new layout (cross-ref 06 §3.2). | [Chart too large] |
| Blue **Save** sign under the layout name | Unsaved changes in the layout | Save, or enable autosave ("drawing objects and their changes are saved instantly"); "manually saving the layout in each tab separately" when several tabs edit one layout. | [Changes not saved] |
| Cannot create a new layout | Plan's saved-layout limit reached | Check the Pricing page; open the **Open layout** folder to count; delete or upgrade. | [Cannot create layout] |
| Deleted layout | — | "we are unable to restore the layout after it has been deleted." | [Restore deleted layout] |
| **"Ad blocker detected"** | "the platform cannot display advertisements properly" — an extension, Safari/Brave/Opera built-in blocking, a VPN/proxy filtering ads, or antivirus/firewall | Whitelist tradingview.com, turn off built-in blocking, check VPN/DNS/antivirus; the article names no paid plan as the fix (13 §8 notes ad-free starts at Essential). | [Ad blocker] |
| **"Calculation takes too long to execute"** (legend error on an indicator/strategy) | Script exceeds the plan's calculation time: **Basic 20 s; Essential, Plus, Premium 40 s; Ultimate 100 s** (the folder index also lists Expert 60 s) | "Split the script into multiple scripts", limit bars with date/time filtering, optimise the Pine code. | [Calculation too long] |
| **"Memory limits exceeded"** | Script needs more memory than allotted | Optimise (RE10139) or contact the author. | [Memory limits] |
| **"The requested historical offset (X) is beyond the historical buffer's limit (Y)"** | Out-of-bounds history reference in a script | Fix the request / raise buffer (RE10143) or contact the author. | [Historical offset] |
| **"The script cannot rely on more than 10 indicators connected in a sequence"** | Indicator-on-indicator chain deeper than 10 | Consolidate into one Pine script; 24 independent SMAs each on its own EMA is fine — only sequential depth counts. | [10 indicators] |
| **"Maximum number of orders (9000) was reached."**, **"The script creates to many plots (x). The limit is 64"**, **"The script executes too many unique `request.*()` function calls"**, **"Cannot create an order with negative quantity"** | Pine limits | Per-article fixes; all are script-author problems, surfaced as a red error mark on the indicator's legend row. | [Legend errors folder] |
| **Ø** in an indicator's legend values | An indicator with a higher timeframe than the chart and **Wait for timeframe closes** on: "one value per five minutes, while the chart displays five times more bars" | Style → **Line With Breaks**. | [Ø article] |
| **"No data here"** (library) | The datafeed has no bars: `noData: true` in the history callback, or a `has_*` flag false for the resolution | The chart renders the message instead of bars; "set noData to true to prevent further requests". A tradingview.com equivalent for an empty symbol **could not verify** by article; the live symbol page prints **"No trades"** in place of a quote. | [Datafeed required methods], pine-seeds docs (via search), live symbol page |
| **"This symbol is only available on TradingView"** (widgets) | A symbol the embeddable widgets may not display | View it on tradingview.com. | [Widget data FAQ] |
| **"delisted"** label | A `CRYPTO:` aggregate whose "source tickers cease updating … stops calculating and receives a 'delisted' label" | Informational. A Help Center article on delisted *stocks*, their chart notice, and what happens to drawings/alerts **could not verify** (none in the Data or Chart categories; `site:tradingview.com/support "delisted"` returns nothing). Third-party guides say an alert on a delisted/renamed pair "is orphaned" and shows "a warning icon or the chart shows 'No Data'" in Manage Alerts — delete and recreate; flagged as unverified. | [Average crypto prices], third-party (Supa.is) |
| Renamed / merged symbols | — | **Could not verify** an article. What the Help Center does state: drawings are bound to a specific symbol ("If you delete drawing objects on a symbol not currently open on the chart, the 'undo' command will not restore" them; "If you mistakenly delete drawing objects from a symbol, they cannot be restored"), and the classic loss case is the same layout saved from two places ("your chart layout was overridden the moment it was saved"). Expired futures are addressable by full name (`NSE:TATAMOTORSM2025`, month codes F…Z) and show "a special status that will tell you at a glance that the contract has expired" with a **red** expiry icon (grey when not yet expired). | [Lost drawings], [Layouts interaction], [Expired futures], [Expiration date] |
| **"Contract Switch"** icon (circular arrow) and vertical separators | Continuous futures at a roll date | Click → card with the switch date, the expiring and the upcoming contract (clickable; Ctrl+Z returns); Events tab toggles icon and separators. | [Switching contracts] |
| Maintenance / outage | TradingView posts downtime on **status.tradingview.com** ("Scheduled maintenance", "Maintenance", incident history) | No in-chart banner is documented in the Help Center — **could not verify** the on-page text. | [Status page] |
| Browser unsupported / outdated | — | **Could not verify** any Help Center notice. The nearest articles are rendering fixes: **blurry candles** → "press Ctrl +/- to set your browser zoom to 100% and refresh the page"; **colour glitches (artifacts)** → a Chromium rendering bug, "update your browser" or disable hardware acceleration (`chrome://settings/system`). | [Blurry], [Colour glitches] |
| **"Unlock flagged symbols"** modal ("Flag marks are useful for noting points of significance… Gain access to them by signing up for a free account." Button **Join for free**) | A guest clicks Flag symbol in the legend | Sign up. Seen live. | live page |

---

## 5. Data-correctness explanations — "why does my chart look wrong"

### 5.1 The folder "I see an incorrect price and/or a gap in data" (10 articles)

| Article (verbatim title) | The explanation | The remedy / setting |
|---|---|---|
| **The price on my chart differs from the price in the watchlist** | The chart is **Heikin Ashi**: "the Heikin Ashi formula produces calculated prices rather than actual market prices" | Chart settings → **Symbol** → **Show real prices** |
| **Why do the values on the TradingView intraday charts differ from other sources?** | (1) **Odd lots** are filtered: "intraday charts reflect only full trades" (an odd lot is "less than the normal unit of trade … typically fewer than 100 shares"); example AMZN 1-min close $130.50 / vol 13,317 vs exchange $130.36 / 15,863 because the exchange's close "was based on a single-share trade". (2) **Late prints**: since October 2024 OTC "late prints" batched into one minute bar are filtered "to prevent distortion"; older bars keep them. | None — by design |
| **I can't see all historical data for the crypto pair, although it was traded before** | "different exchanges have data starting from various points in time" | Use `CRYPTO:` aggregates ("aggregated data from various markets") or the same pair on another exchange |
| **I have no volume on daily bars for Forex symbols from ICE** | "Our vendor provides volume only for intraday charts from ICE (timeframes lower than 1 day)" | Use FXCM or OANDA symbols |
| **Prices for CBOE:TNX, FVX and TYX are 10 times higher than normal** | They "match data from Cboe.com's official dashboards" — quoted ×10 by the index itself | Chart the spread `CBOE:TNX/10` (the article does not point to `TVC:US10Y`) |
| **Crypto market capitalization data is incorrect/being recalculated** | `CRYPTOCAP:` symbols use "the 125 most popular cryptocurrency pairs", a list that changes, so a refresh can show "slightly different bars"; most are spreads with their own recalculation reasons | None |
| **Why do spikes occur in crypto market capitalization and dominance charts?** | Coins entering/leaving the top-125 or a category (e.g. `TOTALDEFI`) — "a coin with substantial market capitalization … can cause noticeable spikes"; major spikes "can be manually smoothed afterward" | None |
| **Why does TradingView show USD and BTC pairs that are not listed on the exchange?** | "we independently calculate the missing prices of coins in USD and BTC for some popular exchanges (Binance, Bitfinex, and a few more, the list may change), if the exchange itself does not provide such data" — synthetic cross-rates | None |
| **What is the BIST MIXED data subscription?** | Real-time but "without the volume data" | Buy BIST Stocks & Indices or BIST Futures for volume |
| **Can I switch Settlement and Last prices as close for futures?** | §1.7 | **Use settlement as close on daily interval** |

Adjacent: **What is the difference between spot pairs to USD and USDC for Coinbase?** — "USD and USDC markets are unified and have the same chart" on Coinbase, TradingView keeps two charts "for user convenience", except `USDTUSD`/`USDTUSDC` (distinct) and `EURCUSD` (only `EURCUSDC` exists); **How is the BTC Index being calculated?** — `(BITSTAMP:BTCUSD + COINBASE:BTCUSD + BITFINEX:BTCUSD + KRAKEN:BTCUSD)/4` for recent data, Mt. Gox-era exchanges back to July 2010.

### 5.2 The folder "Chart and/or indicators are being displayed incorrectly" (16 articles)

| Article (verbatim title) | Cause | Setting named |
|---|---|---|
| **Candles have disappeared from the chart** | Main series hidden; **Body / Borders / Wick** unchecked or same colour as the background; scale off | Visibility toggle in the legend; Symbol tab checkboxes; **Autoscale** |
| **The color of bars or candlesticks is incorrect** | An indicator "that paints the bars"; or **Color Bars Based on Previous Close** | Hide indicators; untick the option |
| **The chart looks way too compressed** / **My chart looks compressed** | "an indicator, which has levels that are located far from the symbol series" (Pivot Points Standard is the example) — autoscale stretches to include them | Hide/adjust the indicator; right-click the price scale → **Scale price chart only** |
| **Indicator titles, parameters & values disappeared from the legend** | Collapsed | "clicking the _plus_ (+/-) button in the top left corner of the chart" |
| **Indicator moves separately or is not attached to the price** | "set to No Scale or is pinned to a different scale than the main chart symbol" | Right-click → **Pin to Scale** → **Scale A (Pin to Scale A)** / **Right** |
| **When comparing symbols, I only see detached lines on the chart** | Price scale, not percent | **Indexed to 100** (cross-ref 01 §1.3) |
| **The countdown is not displayed on the chart** | §1.6 | **Countdown To Bar Close** |
| **Bar chart values are inaccurate** | **Thick Bars**: "the distortion of the bar height because of its width" — a rendering effect, "not a data accuracy problem" | Use **Thin Bars** |
| **Earnings, splits or dividends labels are not displayed** | Events tab off; or "If a chart is heavily compressed, we hide the dividend, split and earning labels so that they do not make your chart too cluttered" | Chart Settings → **Events**; zoom in |
| **I changed the 'timeframe' setting and now my indicator displays 'Ø'** | §4 | **Line With Breaks** |
| **The Renko chart shows incorrect values and/or is constantly being recalculated** | Bricks are built from the chart timeframe; "When historical data runs out at the current timeframe, TradingView switches to higher timeframes (60-minute, 4-hour, or daily)"; the switch point "shifts forward over time"; "Renko bricks prices, being inherently synthetic … do not reflect market prices at any precise moment in time" | Smaller timeframe = more accurate |
| **The Renko chart is not displayed or is displayed incorrectly** | (same family) | — |
| **I see 'The script cannot rely on more than 10 indicators connected in a sequence' error** | §4 | — |
| **The candles, bars or drawings look blurry** / **Color glitches (artifacts) suddenly appear on the chart** | Browser zoom ≠ 100 %; Chromium rendering bug | §4 |

### 5.3 Holidays, calendars and sessions

The Help Center has no "exchange holidays" article in the Data category; holidays surface through: the library's `session_holidays` / `corrections` fields; the Yield Curves calendar, where "some dates in the calendar are unavailable for selection because markets are closed on those days" (weekends and public holidays, "yield data isn't refreshed"); the countdown, hidden "outside trading hours on intraday"; and the Market Status pop-up's "It'll open for pre-market trading in 1 day and 21 hours". Session honesty rules worth copying: the pop-up counts down to the *next* session including pre-market; the timeline is always in the **exchange** time zone and says so ("Exchange timezone: New York (UTC-4)"); the symbol page prints the **last update** timestamp, not "now".

### 5.4 Volume

"General information on volume data" holds one article: **Volume for main NSE Stock Indices** — index volume is calculated by TradingView as "the sum of the volumes of all index components on the calculation date" (daily = sum of daily component volumes; minute = "the sum of the component volumes for the desired minute"), reflecting composition changes. Other volume rules scattered above: Cboe One volume is a subset of the market (§2.3); odd lots and late prints are filtered (§5.1); ICE forex has no daily volume, Forex.com none at all (§2.2); `TVC:` indices carry no volume while `SP:SPX` / `DJ:DJI` "include volume data representing their component totals"; tick intervals are unavailable on "indices without volume" (01 §1.4).

### 5.5 Inactivity gaps (cross-ref 11 §7)

Library featureset `inactivity_gaps` (default Off): "Allows displaying inactivity gaps on charts. These gaps represent periods within the trading session when there has been no trading activity." Whitespace, only inside the session; `has_empty_bars` tells the library the feed has such gaps.

### 5.6 Adjustments: dividends, contract rolls, expiry

| Control (verbatim) | Where | What it does | Source |
|---|---|---|---|
| **ADJ** button / **Adjust data for dividends** | Bottom-right of the chart (accessible name "Adjust data for dividends"); Supercharts settings | "A dividend-adjusted chart shows the total return of the asset, meaning it adds the dividend paid into the share price." "If you can't find this option, price adjustment for the asset you're currently viewing is not available" (crypto has none). Default state not stated. | [Adjust for dividends], live page |
| **B-ADJ (Adjust for contracts changes)** button / **Adjust for contracts changes** checkbox | Bottom of the chart; chart settings | Back-adjustment for continuous futures: "previous contract data is adjusted using a coefficient calculated from the price difference between the closing prices of the old and new contracts at the roll point". Absent = not yet available for that future. | [Back-adjustment] |
| `1!` / `2!` continuous contracts | Symbol suffix | "1! … the nearest expiration month and rolls over when that contract expires"; "2! … the second nearest"; "rollover periods can cause sudden price jumps or gaps"; only 1! can be traded (CME, EUREX). | [1! and 2!] |
| Switching date | — | Volume-based: the roll happens when "the daily volume of the next contract" exceeds the current one; a per-instrument statistical rule (e.g. "six business days before expiration") is applied consistently through history; GC1! example rolled July 28 for an Aug 29, 2022 expiry. | [Switching date] |
| Contract-switch icons, expiry icon | Chart; Events tab | §4. | [Switching contracts], [Expiration date] |

### 5.7 Currency and unit conversion

| Control | Where | Behaviour | Limits (verbatim) | Source |
|---|---|---|---|---|
| Currency button | "at the top of the price scale … appears by default when you hover over the scale"; look configurable in Chart settings → **Scales** | "the chart is recalculated taking into account the selected currency, including the OHLC values and the last price value in the browser tab title"; indicators follow; star = favourite | "Switching to a different symbol reverts the chart to its original currency"; "Alerts and orders cannot be created on converted charts"; "Drawing objects remain linked only to the specific currency they were created in"; "The Bar Replay feature is unavailable in converted currency mode" | [Convert currency] |
| Unit button | "the button on the scale that displays the current unit" (commodities) | "the chart and indicators will display the price of the selected asset unit"; combine with currency conversion | Same four limits | [Change unit] |

### 5.8 Symbol naming — the folder "I'm unable to find a specific ticker symbol and/or market" (14 articles)

| Convention (verbatim where TradingView states it) | Source |
|---|---|
| `EXCHANGE:SYMBOL`. "Symbols, or tickers, are abbreviations for financial instruments publicly traded or quoted on specific exchanges"; length is an exchange rule ("the NYSE allows up to four characters while Nasdaq permits up to five"); the same company differs by venue (Tata Motors is `500570` on BSE, `TATAMOTORS` on NSE). Search rows print "the symbol characters to the left, description in the middle, and the data source to the right"; filters by asset type and by "country, type, category, source, sector, or exchange". Ctrl+K / Cmd+K opens it. | [Symbol search tips] |
| `TVC:` = "TradingView Charts" — "data has been calculated by TradingView rather than sourced from a specific exchange"; CFDs and derived instruments for indices, commodities and "Government bonds (sourced from Refinitiv)"; `TVC:SPX` vs `SP:SPX`, `TVC:DJI` vs `DJ:DJI` differ (no volume on TVC); "should not be directly compared". | [TVC] |
| `ECONOMICS:` + two-letter ISO 3166-1 country code + indicator abbreviation, e.g. `USGDP`; searchable by typing the id, the `ECONOMICS:` prefix, or the **ECONOMICS** source filter. | [Display economic data] |
| `CRYPTO:` = TradingView-calculated average of listed spot markets; `CRYPTOCAP:` = market-cap/dominance indices (`TOTAL`, `TOTALDEFI`); `INDEX:` = EOD-only index feeds (e.g. `INDEX:DXY`); `CBOE:` = Cboe indices/futures (`CBOE:SPX`, `CBOE:VX1!`, `CBOE:VXM1!`); `FX_IDC:` = ICE composite forex (EURUSD history to 1971 via ECS → EUA → ECU → Euro at fixed ratios). | [Average crypto prices], [Market cap spikes], [DXY EOD], [Cboe blog], [EURUSD 1971] |
| Delayed namespaces `LSE_DLY:`, `{{exchange}}` `_DL`/`_DLY`. | §1.5 |
| `USDT` pairs: `BTCUSDT` and `BTCUSD` are separate watchlist rows even on one venue; Coinbase USD/USDC unified (§5.1). | live page, [USD vs USDC] |
| DEX pools: listed only above per-chain liquidity and volume thresholds that "can change daily"; pools that "lost liquidity and/or trading volume will be deleted from the platform regularly"; "only … most liquid pools with identical token composition" (a more liquid pool replaces a thinner one); find them in the Crypto tab → **DEX** source, or "by token or pool contract address". | [DEX pool] |
| Primary vs secondary listing: the Screener's "Primary listing" crown filter (10 §1) and the Symbol Info dialog's **Listed Exchange** vs **Exchange** rows (§3.3). | 10, §3.3 |
| "I can't find a symbol in the symbol search box" → "make sure that you don't have the exchange or symbol type filter enabled (check the top bar of the symbol search window)". | [Can't find symbol] |
| Expired futures by full code `NSE:TATAMOTORSM2025` (month letters F…Z); weekly-expiry contracts such as `CME:BAB` "cannot be opened on the chart; only active ones are available". | [Expired futures] |

---

## 6. Historical depth as the user meets it

| Item | Detail | Source |
|---|---|---|
| **Historical bars available** (intraday) | Basic 5,000; Essential/Plus 10,000; Premium 20,000; Expert 25,000; Ultimate 40,000; plus "several bars back to the beginning of the week, month or year (depending on the selected chart timeframe)"; "these limits cannot be extended for now due to technical reasons". Daily and up: "We display all available data for daily-based intervals." Deep Backtesting in the Strategy Tester computes "on all historical data available for the selected symbol, and not just on those loaded on the chart". | [Intraday bars and limits], 08 §6 |
| **How to see the deepest historical data?** | Type the ticker, open the chart, "zoom out as needed to see its entire price history": SPX to 1871, DJI to 1896, GOLD to 1833, USOIL to 1861, SILVER to 1802, Coca-Cola/IBM/Exxon from 1968, BTCUSD index from 2010. | [Deepest history] |
| **Go to** (Alt+G) | Dialog with **Date** / **Custom range** tabs; "select the desired date by using the bottom toolbar". The Help Center text for a date before the first bar **could not verify** (the article's answer is a GIF); 09 §10 recorded the behaviour as a red label at the first available bar. | [Go to date], 09 §10 |
| Scrolled past the data | No Help Center text; the library shows "No data here" only when a symbol has no bars at all. Past the first bar the canvas is simply empty (the time scale keeps extending). **Could not verify** any on-canvas caption. | [Datafeed required methods] |
| Renko / higher-timeframe fallback | Bricks beyond the intraday limit are rebuilt from 60-min / 4-hour / daily bars, and that seam moves (§5.2). | [Renko recalculated] |

---

## 7. Two small utilities

### 7.1 Table view

| Item | Detail | Source |
|---|---|---|
| Open | Right-click the chart background → **Table view** (confirmed live, item sits between "Lock vertical cursor line by time" and "Object tree"). | [Table view], live page |
| Content | "each table's row corresponds to a specific point in time, while columns display values for symbols and indicators"; values "match exactly how they appear on the chart"; newest at the top; refreshes automatically; hidden indicators are excluded; the symbol can be changed from the watchlist or by typing. | [Table view] |
| Copy / export / limits / plan | Not stated in the article — **could not verify**. | — |

### 7.2 Export chart data

| Item | Detail | Source |
|---|---|---|
| Path | Upper toolbar (the layout/Manage-layouts dropdown) → **Download chart data…** → choose the chart → **Download**. | [Export chart data], 06 §5.2 |
| Scope | "The data you export is what your chart shows you. If you need more data, scroll the chart left or drag the x-axis and then download a CSV." Includes "tickers and indicators displayed on your chart at the time of download". | [Export chart data] |
| Format / plan | CSV. Columns, time-format options and bar limits are not in the article — **could not verify**; the pricing table lists **Download chart data** as a paid-plan row (08). | [Export chart data], 08 |
| API | "I need access to your API in order to get data or indicator values": there is none for data; the REST API is for brokers. Widgets FAQ: "Users cannot export data, access a public API for data retrieval, or display custom data within widgets." | [API access], [Widget data FAQ] |
| Yield Curves table | **Download and share** button → **Download as CSV file** (no plan stated). | [Yield curves download] |

---

## 8. Economic data and bonds — at index level only

### 8.1 "General information about economic data" (13 articles)

| Article (verbatim title) | What it establishes |
|---|---|
| **What is economic data?** | "data points that describe the state of the country's economy as a whole (GDP, Inflation Rate), the state of a particular industry (Steel Production), or a system (ICU Beds)"; "300 metrics across 200 countries". |
| **How to display economic data values on a chart?** | Id = ISO 3166-1 alpha-2 country code + indicator abbreviation (`USGDP`); type it, use the `ECONOMICS:` prefix, or filter the source to **ECONOMICS**. |
| **Category** / **Source** / **Frequency** / **Units** | The four attributes every series carries: category "groups indicators based on their thematic focus" (Labor, Prices, Government, Business…); source = "the origin or agency responsible for collecting and disseminating the relevant data" (statistical agencies, central banks, government departments); frequency = "the regularity with which data for a specific economic indicator is updated or reported" (monthly employment, quarterly GDP, weekly/annual others); units = "the scale and format in which the values … are expressed" (percent, local currency, points). |
| **What economic data is available in Pine?** | The same ids via `request.economic()`. |
| **TradingView Calendar**, **Economic Calendar**, **Dividend Calendar**, **Earnings and Revenue Calendar**, **IPO Calendar**, **Macro Maps** | The calendar products that surface release dates; not chart provenance. |
| (folder) **List of available economic data** — 318 articles | Not enumerated here by design. |

How a series is charted: a step series at its release frequency (one point per month/quarter), so on an intraday chart it is flat between prints; the Frequency attribute is the only "update cadence" TradingView states — there is no delay badge concept for economic data.

### 8.2 Treasury yields and the Yield Curves page

| Item | Detail | Source |
|---|---|---|
| Symbol naming | Government bond yields are `TVC:` symbols ("Government bonds (sourced from Refinitiv)"), e.g. `TVC:US10Y`, `TVC:US02Y`; Cboe's `CBOE:TNX`/`FVX`/`TYX` are ×10 index quotes (§5.1). | [TVC], [TNX ×10] |
| Yield Curves page | `tradingview.com/yield-curves/`, also a **Yield Curves** button on the right toolbar. Opens on **US government bonds**; **+ Add** other countries. Tenors 1, 3, 6 months and 1, 2, 3, 5, 7, 10, 20, 30 years; **Key tenors** toggle. Two scales: **Tenor scale** and **Linear scale**. Default three curves "today, one month ago, and one year ago"; **Clone** a curve to another date; **Take a snapshot** to share; a table of maturities below the chart. | [Yield Curves overview] |
| Data attribution | "Select market data provided by ICE Data Services." | [Yield Curves overview] |
| FAQ (4) | Disabled calendar dates = market closed (weekends, public holidays); **Heatmap mode** (Settings in the table → Heatmap mode; "lighter hues for lower yields and darker tones for higher yields"); CSV download; a "show the current date without selecting it each time" question. | [Yield curves FAQ folder] |
| Tick intervals | Not available for "TVC: bonds/yields" (01 §1.4). | 01 |

---

## 9. What this means for OnStock

OnStock today (code read on `release/onstock`): `UpdatedAgo.jsx` prints "Updated 12s ago · tap to refresh" with a breathing dot, and swaps in "Pre-market — stock prices still at last close" / "After hours — stock prices at the 4pm close" / "US market closed — stock prices at last close", plus "Connection hiccup — showing prices from 3m ago. Retrying…" and "We can't reach the price feed…"; `AssetDetail.jsx` already labels the two legs separately (`tokenAge` = "12s ago · live"; `stockAge` = "at last close · pre-market" / "at 4pm close · after hours" / "at last close"); `market.js` models pre/regular/post/closed in America/New_York with holidays explicitly not modelled; `CandlesPanel.jsx` captions the stock chart "share candles, regular session only, via Yahoo Finance"; `prices.js` calls anything under $50k 24h volume **Thinly traded**; `services/candles.js` treats a GeckoTerminal 429 as "not an answer" rather than a pool miss; `TreasuryYields.jsx` renders nothing when FRED is unavailable, with series ids `DGS2 / DGS10 / DGS30`. The gaps are that none of this reaches the chart legend, there is no per-exchange statement of *how* delayed, no symbol-facts dialog, no data floor marker, and no honest empty/error states on the chart itself.

1. **Adopt — the three-segment legend string, verbatim shape.** `{session} · {cadence} · {venue} by {source}`: token leg "24/7 · One update every 30 seconds · Raydium by GeckoTerminal", stock leg "Market closed · Data is delayed · NASDAQ by Yahoo Finance". Reason: TradingView puts provenance *in the legend* as a clickable button, not in a footer; OnStock's better copy is stranded under the chart.
2. **Adopt — a "D" badge on the stock leg with a hover tooltip "Quotes are delayed by N min" and the same badge in the watchlist row.** Reason: the watchlist tooltip is the one place TradingView states the delay in minutes; OnStock knows its Yahoo/Finnhub delay and should say the number.
3. **Adapt — the Market Status pop-up as an explanation, not a sale (spec Adapt #9).** Three sections with TradingView's structure but OnStock's copy: "Market closed — opens for pre-market in 1 day 21 h · Exchange timezone: New York (UTC-4)" with the session ruler; "Data is delayed — the share price is Yahoo's regular-session quote, so between 16:00 and 20:00 the token can move on news the stock leg has not printed yet; that is why the gap is caveated in extended hours"; "Solana by GeckoTerminal — pool X on Raydium, 24h volume $Y". "Learn more" opens the Learn card, never a price page.
4. **Adopt — the countdown rule and the settlement rule as written (A13).** No countdown on the stock leg for intervals shorter than its delay; the watchlist, screener and details use one canonical price source and say which (TradingView: settlement everywhere but the chart).
5. **Adapt — a Symbol Info dialog for token facts.** Rows: Symbol, Description, **Exchange** (the DEX/pool) vs **Listed Exchange** (NASDAQ for the underlying), Chain, Mint address, Pool address, Issuer, Backing (1:1 custodied share / synthetic), Currency (USDC/SOL quote), Tick size / precision, **Session** of the underlying (`0930-1600`, `America/New_York`) vs token `24x7`, Data status (streaming / delayed_streaming with the delay), ISIN of the underlying, first available bar. Open it from the legend's **More** and from right-click on the series, exactly where TradingView keeps it. Reason: the field set is the library's `LibrarySymbolInfo`, which is also the schema OnStock would need if it ever adopted Advanced Charts.
6. **Adopt — TradingView's distinction between the "Switch data type" view menu and the data *source*.** OnStock's Gap|Candles toggle is a *view* switcher (keep it beside the symbol, as TradingView does); the source is a fact shown in the legend, not a control. Skip any "choose your feed" dropdown.
7. **Adopt — a notices table with exact copy, mirroring §4.** Stale feed ("Connection hiccup — showing prices from 3m ago" already exists; add it to the chart legend); **delisted token** ("This token no longer trades — last pool activity 14 days ago"; TradingView's own DEX rule of deleting pools that "lost liquidity and/or trading volume" is the precedent for a `delisted` label); **thin pool** (the existing Thinly traded card, moved into the legend as a badge); **API quota hit** ("GeckoTerminal is rate-limiting us — chart data may be up to N minutes old. Retrying…", modelled on the connection-closed pop-up with a **Restore connection**-style retry button); **No data here** for a token with no pool.
8. **Adopt — the data floor, honestly.** Go to date with a red "first available bar" marker, an empty canvas (no invented bars) past the floor, and a Symbol Info row "History from {date}". GeckoTerminal is shallow, Yahoo daily is deep; say so per leg rather than one floor for the chart.
9. **Adapt — the "why does my chart look wrong" folder as OnStock Learn cards.** The five that map directly: chart price ≠ watchlist price (Heikin Ashi → OnStock: gap uses last stock quote, chart uses candle close), missing candle (inactivity gap vs pool outage), volume differs (Cboe subset → GeckoTerminal counts one pool, not all venues), synthetic pairs (TradingView's calculated USD crosses → OnStock's USD price via SOL/USDC route), holidays (TradingView disables calendar dates; OnStock should model NYSE holidays instead of the current "briefly wrong" fallback in `market.js`).
10. **Adapt — Table view and CSV export, both scoped to "what your chart shows".** Table view is cheap on Lightweight Charts data and is the honest way to expose the gap series numerically; CSV stays behind the data-rights question 06 §5.2 raised, and if shipped it exports the visible range only, as TradingView does.
11. **Adapt — ECONOMICS/TVC-style naming for OnStock's macro series.** Keep FRED's `DGS2/DGS10/DGS30` as the storage ids but display them as `US02Y / US10Y / US30Y` with a Source ("FRED, Federal Reserve Board H.15"), Frequency ("daily, prior business day"), Units ("percent") and the 2s10s spread in bp — the four attributes TradingView attaches to every economic series. Reason: the same vocabulary OnStock's users see on TradingView, and it forces the "as of" date onto the row.
12. **Skip — exchange delay pricing, Cboe One vs primary, professional status, BIST-style data types.** OnStock has nothing to sell here and no second feed to switch to.
13. **Skip — the connection-count model.** OnStock's scarce resource is upstream quota, not sockets; the pop-up shape (what happened, what it costs, one button to recover) is worth copying, the counting is not.
14. **Skip — dividend/continuous-futures adjustment controls (ADJ, B-ADJ, 1!/2!).** No futures; the dividend gap between token and share is *content* for the gap chart (an Events marker), not something to adjust away.

---

## 10. Sources (every page actually read)

Help Center — index and categories
- https://www.tradingview.com/support/knowledge-base/
- https://www.tradingview.com/support/categories/data/
- https://www.tradingview.com/support/categories/chart/
- https://www.tradingview.com/support/categories/curves/

Help Center — Data folders
- https://www.tradingview.com/support/folders/43000547053-i-don-t-have-access-to-real-time-data/
- https://www.tradingview.com/support/folders/43000547117-i-m-unable-to-find-a-specific-ticker-symbol-and-or-market/
- https://www.tradingview.com/support/folders/43000547461-i-see-an-incorrect-price-and-or-a-gap-in-data/
- https://www.tradingview.com/support/folders/43000547665-i-want-to-export-data-from-tradingview/
- https://www.tradingview.com/support/folders/43000554058-i-want-to-access-extended-hours-data/
- https://www.tradingview.com/support/folders/43000581130-general-information-about-economic-data/
- https://www.tradingview.com/support/folders/43000586383-general-information-on-volume-data/
- https://www.tradingview.com/support/folders/43000587833-historical-data-length/

Help Center — Chart folders
- https://www.tradingview.com/support/folders/43000547290-chart-and-or-indicators-are-being-displayed-incorrectly/
- https://www.tradingview.com/support/folders/43000547349-charts-are-not-saving-not-syncing/
- https://www.tradingview.com/support/folders/43000550182-why-i-m-getting-a-message-warning-notice-on-my-chart-page/
- https://www.tradingview.com/support/folders/43000561757-i-want-to-export-download-chart-data/
- https://www.tradingview.com/support/folders/43000562090-chart-legend/
- https://www.tradingview.com/support/folders/43000547370-i-can-t-find-a-certain-feature-or-setting/
- https://www.tradingview.com/support/folders/43000548792-chart-legend-errors-after-applying-indicators-or-strategies/
- https://www.tradingview.com/support/folders/43000598353-yield-curves-overview/
- https://www.tradingview.com/support/folders/43000598470-faq/

Help Center — articles (real-time / delay / source)
- [Purchase market data] https://www.tradingview.com/support/solutions/43000471705-how-to-purchase-additional-market-data/
- [US stock data free?] https://www.tradingview.com/support/solutions/43000473924-is-us-stock-market-data-free-by-default/
- [DXY EOD] https://www.tradingview.com/support/solutions/43000474958-i-see-only-eod-data-for-dxy-symbol-and-no-real-time/
- [NSE/BSE] https://www.tradingview.com/support/solutions/43000777677-can-i-access-real-time-futures-and-options-data-from-nse-and-bse/
- [Alerts real-time/non-real-time] https://www.tradingview.com/support/solutions/43000698958-alerts-based-on-real-time-and-non-real-time-symbols/
- [Hide market status] https://www.tradingview.com/support/solutions/43000587214-how-can-i-hide-open-market-status/
- [Legend hover buttons] https://www.tradingview.com/support/solutions/43000539711-how-to-show-hide-settings-and-remove-options-of-an-indicator-or-ticker-symbol/
- [Source of real-time data] https://www.tradingview.com/support/solutions/43000739323-how-does-the-source-of-real-time-data-affect-the-trading-experience/
- [IB order panel delayed] https://www.tradingview.com/support/solutions/43000719859-why-is-the-data-delayed-in-the-order-panel-and-dom-on-my-interactive-brokers-account/
- [BIST MIXED] https://www.tradingview.com/support/solutions/43000609137-what-is-the-bist-mixed-data-subscription/
- [Extended hours] https://www.tradingview.com/support/solutions/43000502023-i-want-to-access-extended-hours-data/
- [CME RTH/ETH] https://www.tradingview.com/support/solutions/43000670909-regular-and-electronic-trading-hours-for-cme-futures/
- [24-hour sessions] https://www.tradingview.com/support/solutions/43000790593-how-to-view-the-24-hour-market-and-overnight-trading-sessions/
- [Extended session price line] https://www.tradingview.com/support/solutions/43000762938-how-do-i-display-the-price-line-for-the-extended-session/
- [Screener pre/post] https://www.tradingview.com/support/solutions/43000502613-how-to-see-the-pre-market-post-market-data-in-the-screener/
- [Timezone] https://www.tradingview.com/support/solutions/43000476526-is-there-a-way-to-change-chart-timezone-or-clock-time-at-the-bottom-of-the-chart/
- [Precision] https://www.tradingview.com/support/solutions/43000690943-i-want-to-change-the-number-of-decimals-on-the-scale/

Help Center — articles (incorrect price / gap)
- https://www.tradingview.com/support/solutions/43000690949-the-price-on-my-chart-differs-from-the-price-in-the-watchlist/
- https://www.tradingview.com/support/solutions/43000710585-why-do-the-values-on-the-tradingview-intraday-charts-differ-from-other-sources/
- https://www.tradingview.com/support/solutions/43000483415-i-can-t-see-all-historical-data-for-the-crypto-pair-although-it-was-traded-before/
- https://www.tradingview.com/support/solutions/43000483450-i-have-no-volume-on-daily-bars-for-forex-symbols-from-ice/
- [TNX ×10] https://www.tradingview.com/support/solutions/43000483455-prices-for-cboe-tnx-fvx-and-tyx-are-10-times-higher-than-normal/
- https://www.tradingview.com/support/solutions/43000540941-crypto-market-capitalization-data-is-incorrect-being-recalculated/
- [Market cap spikes] https://www.tradingview.com/support/solutions/43000743044-why-do-spikes-occur-in-crypto-market-capitalization-and-dominance-charts/
- https://www.tradingview.com/support/solutions/43000703173-why-does-tradingview-show-usd-and-btc-pairs-that-are-not-listed-on-the-exchange/
- [USD vs USDC] https://www.tradingview.com/support/solutions/43000742546-what-is-the-difference-between-spot-pairs-to-usd-and-usdc-for-coinbase/
- https://www.tradingview.com/support/solutions/43000659124-how-is-the-btc-index-being-calculated/
- [Average crypto prices] https://www.tradingview.com/support/solutions/43000717122-where-do-i-find-the-average-prices-of-cryptocurrencies/
- [ICE vs other forex] https://www.tradingview.com/support/solutions/43000480629-what-is-the-difference-between-ice-and-other-forex-providers/
- [NSE index volume] https://www.tradingview.com/support/solutions/43000677770-volume-for-main-nse-stock-indices/

Help Center — articles (chart-page notices)
- [Time to clean up] https://www.tradingview.com/support/solutions/43000484303-i-see-the-it-s-time-to-clean-up-message/
- [Layout was changed] https://www.tradingview.com/support/solutions/43000484320-i-got-a-your-chart-layout-was-changed-message/
- [Chart too large] https://www.tradingview.com/support/solutions/43000484324-i-received-a-your-chart-is-too-large-and-cannot-be-saved-message/
- [Connection closed] https://www.tradingview.com/support/solutions/43000693877-why-was-the-connection-closed/
- [Parallel connections] https://www.tradingview.com/support/solutions/43000694474-parallel-chart-connections/
- [Ad blocker] https://www.tradingview.com/support/solutions/43000763991-how-to-fix-the-ad-blocker-detected-message-on-tradingview/
- [Calculation too long] https://www.tradingview.com/support/solutions/43000579793-i-see-calculation-takes-too-long-to-execute-error/
- [Memory limits] https://www.tradingview.com/support/solutions/43000590233-i-see-the-memory-limits-exceeded-error/
- [Historical offset] https://www.tradingview.com/support/solutions/43000587849-i-see-the-requested-historical-offset-x-is-beyond-the-historical-buffer-s-limit-y-error/
- [10 indicators] https://www.tradingview.com/support/solutions/43000602128-i-see-the-script-cannot-rely-on-more-than-10-indicators-connected-in-a-sequence-error/
- [Ø article] https://www.tradingview.com/support/solutions/43000586466-i-changed-the-timeframe-setting-and-now-my-indicator-displays/
- [Lost drawings] https://www.tradingview.com/support/solutions/43000472965-i-ve-lost-my-chart-drawings/
- [Layouts interaction] https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
- [Changes not saved] https://www.tradingview.com/support/solutions/43000762820-the-changes-i-make-are-not-saved-in-my-layout/
- [Cannot create layout] https://www.tradingview.com/support/solutions/43000762819-i-cannot-create-a-new-layout/
- [Restore deleted layout] https://www.tradingview.com/support/solutions/43000762816-i-accidentally-deleted-my-layout-can-i-restore-it/
- https://www.tradingview.com/support/solutions/43000690945-my-drawings-do-not-sync-in-different-devices/
- https://www.tradingview.com/support/solutions/43000651214-symbols-in-my-watchlist-do-not-contain-the-drawings-i-made-on-charts/
- https://www.tradingview.com/support/solutions/43000543012-how-do-you-change-the-symbol-or-ticker-on-a-chart/
- https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/

Help Center — articles (display incorrectly)
- https://www.tradingview.com/support/solutions/43000472764-candles-have-disappeared-from-the-chart/
- https://www.tradingview.com/support/solutions/43000473886-the-color-of-bars-or-candlesticks-is-incorrect/
- https://www.tradingview.com/support/solutions/43000473898-the-chart-looks-way-too-compressed/
- https://www.tradingview.com/support/solutions/43000762934-my-chart-looks-compressed/
- https://www.tradingview.com/support/solutions/43000473925-indicator-titles-parameters-values-disappeared-from-the-legend-top-left-corner-of-the-chart/
- https://www.tradingview.com/support/solutions/43000775579-indicator-moves-separately-or-is-not-attached-to-the-price/
- https://www.tradingview.com/support/solutions/43000498617-bar-chart-values-are-inaccurate/
- https://www.tradingview.com/support/solutions/43000557641-earnings-splits-or-dividends-labels-are-not-displayed/
- [Renko recalculated] https://www.tradingview.com/support/solutions/43000480330-the-renko-chart-shows-incorrect-values-and-or-is-constantly-being-recalculated/
- [Blurry] https://www.tradingview.com/support/solutions/43000478249-the-candles-bars-or-drawings-look-blurry/
- [Colour glitches] https://www.tradingview.com/support/solutions/43000615657-color-glitches-artifacts-suddenly-appear-on-the-chart/

Help Center — articles (history, utilities, adjustments, naming, economic data)
- [Deepest history] https://www.tradingview.com/support/solutions/43000687053-how-to-see-the-deepest-historical-data/
- [EURUSD 1971] https://www.tradingview.com/support/solutions/43000709754-why-does-the-historical-data-on-fx-idc-eurusd-chart-go-to-1971/
- [Intraday bars and limits] https://www.tradingview.com/support/solutions/43000480679-historical-intraday-data-bars-and-limits-explained/
- [Go to date] https://www.tradingview.com/support/solutions/43000482911-how-to-go-to-the-specific-date-on-the-chart/
- [Table view] https://www.tradingview.com/support/solutions/43000765410-how-to-view-chart-data-as-a-table/
- [Export chart data] https://www.tradingview.com/support/solutions/43000537255-how-to-export-chart-data/
- [API access] https://www.tradingview.com/support/solutions/43000474413-i-need-access-to-your-api-in-order-to-get-data-or-indicator-values/
- [Adjust for dividends] https://www.tradingview.com/support/solutions/43000590597-how-to-adjust-data-for-dividends/
- [Back-adjustment] https://www.tradingview.com/support/solutions/43000685266-how-can-i-enable-backadjustment-for-continuous-futures/
- [Switching contracts] https://www.tradingview.com/support/solutions/43000689313-switching-continuous-futures-contracts/
- [Expiration date] https://www.tradingview.com/support/solutions/43000689603-expiration-date-of-futures-contracts-on-the-chart/
- [Switching date] https://www.tradingview.com/support/solutions/43000691027-how-is-the-switching-date-of-contracts-determined-in-continuous-futures/
- [1! and 2!] https://www.tradingview.com/support/solutions/43000483493-what-are-1-and-2-continuous-futures-contracts/
- [Expired futures] https://www.tradingview.com/support/solutions/43000761913-how-to-open-an-expired-futures-contract-on-the-chart/
- [Convert currency] https://www.tradingview.com/support/solutions/43000692112-how-do-i-convert-chart-data-to-another-currency/
- [Change unit] https://www.tradingview.com/support/solutions/43000658974-how-to-change-the-unit-of-measurement-on-a-chart/
- [Symbol search tips] https://www.tradingview.com/support/solutions/43000746682-tradingview-symbol-search-tips-for-finding-assets/
- [Can't find symbol] https://www.tradingview.com/support/solutions/43000473919-i-can-t-find-a-symbol-in-the-symbol-search-box/
- https://www.tradingview.com/support/solutions/43000473922-what-markets-do-you-support/
- [TVC] https://www.tradingview.com/support/solutions/43000709178-what-does-tvc-stand-for-in-the-instrument-ticker/
- [DEX pool] https://www.tradingview.com/support/solutions/43000729945-i-can-t-find-a-particular-dex-pool-from-the-supported-exchange-on-tradingview/
- https://www.tradingview.com/support/solutions/43000643547-what-is-economic-data/
- [Display economic data] https://www.tradingview.com/support/solutions/43000651423-how-to-display-economic-data-values-on-a-chart/
- https://www.tradingview.com/support/solutions/43000717499-category/
- https://www.tradingview.com/support/solutions/43000717500-source/
- https://www.tradingview.com/support/solutions/43000717501-frequency/
- https://www.tradingview.com/support/solutions/43000717502-units/
- [Yield Curves overview] https://www.tradingview.com/support/solutions/43000758123-tradingview-yield-curves-navigate-bond-rates-and-charts/
- https://www.tradingview.com/support/solutions/43000758677-why-are-some-dates-in-the-calendar-disabled/
- https://www.tradingview.com/support/solutions/43000759140-what-is-the-heatmap-mode/
- [Yield curves download] https://www.tradingview.com/support/solutions/43000760509-how-do-i-download-my-data-from-the-yield-curves-table/

Advanced Charts library docs
- [Legend doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend/
- [Market Status doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/market-status/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/
- https://www.tradingview.com/charting-library-docs/latest/connecting_data/Symbology/
- https://www.tradingview.com/charting-library-docs/latest/connecting_data/Trading-Sessions/
- https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySymbolInfo/
- https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.SymbolExt/
- [Featuresets] https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets/
- [Datafeed required methods] https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/required-methods/

TradingView product pages, blog, widgets, status
- https://www.tradingview.com/data-coverage/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/
- https://www.tradingview.com/symbols/LSE-VOD/
- [Cboe blog] https://www.tradingview.com/blog/en/improved-cboe-data-37524/
- [Pre/post labels blog] https://www.tradingview.com/blog/en/pre-post-market-price-labels-are-now-available-on-charts-20418
- [Widget data FAQ] https://www.tradingview.com/widget-docs/faq/data
- https://www.tradingview.com/widget-docs/widgets/symbol-details/symbol-info/ (JS-rendered; only the tagline was readable)
- [Status page] https://status.tradingview.com/ (via search results; incidents "Scheduled maintenance", "Maintenance")

Live page (read from the accessibility tree and screenshots on 2026-09-06, guest session)
- https://www.tradingview.com/chart/?symbol=NASDAQ%3AAAPL
- https://www.tradingview.com/chart/?symbol=LSE%3AVOD

Third-party (flagged in the text; used only where primary sources were silent)
- TradingCode, "'Symbol Info' window in TradingView" — https://www.tradingcode.net/tradingview/instrument-info-window/ (returned HTTP 403; field labels taken from the search index's snippets only)
- Pineify, "Why Is TradingView 10 Minutes Behind?" — https://pineify.app/resources/blog/why-is-my-tradingview-10-minutes-behind-understanding-data-delays-and-unlocking-real-time (no verbatim UI text; not relied on)
- Supa.is, "TradingView Alert Not Triggering? 12 Fixes" — https://supa.is/article/tradingview-alert-not-triggering-how-to-fix-2026 (the "orphaned alert / No Data" claim for delisted symbols; unverified)
- pine-seeds docs `ui.md` — https://github.com/tradingview-pine-seeds/docs/blob/main/ui.md (search snippet cites the "No data here" chart message; the fetched page did not show it)

Cross-references inside this folder: 01 §1.2/§1.4, 02 §2.2/§3/§4.2/§10.4, 06 §3.2/§5.2, 07 §3.1, 08 §6/§11, 09 §6.1/§6.2/§10, 10 §1, 11 §7, 13 §7/§8; the spec `../onstock-desktop-spec.md` Adapt #9 and A13.
