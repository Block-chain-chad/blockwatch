# TradingView teardown — surface 10 of 13: Screeners, Heatmaps, Calendars, News, Ideas/Minds, Markets

Date: 2026-09-06. Scope: everything that sits **around** the chart — the Screener family, the Heatmaps, the four Calendars, News Flow (and news on the chart / news by symbol), the Ideas + Minds social layer (briefly), and the Markets pages. The chart itself, watchlists, alerts, indicators, drawing tools, layouts, and account/pricing mechanics belong to other surfaces and are only mentioned where an item here hooks into them.

How to read this: every option name in `code` or "quotes" is TradingView's own label as printed in the Help Center or on the page. Where a plan tier is stated it comes from the pricing page's feature grid. Where I could not find a primary source I say **could not verify** rather than guess. A Sources list of every URL actually read is at the end, then the OnStock mapping.

Plan tiers referenced below (pricing page, annual billing): `Basic` (free), `Essential` ($12.95/mo), `Plus` ($29.95/mo), `Premium` ($59.95/mo), `Ultimate` ($199.95/mo).

---

## 0. Where all of this lives (the two doors)

TradingView exposes every tool on this surface from two places, and the Help Center repeats this for each one:

| Door | Path (verbatim) | Notes |
|---|---|---|
| Site header | `Products` dropdown → `Screeners` / `Heatmaps` / `Calendars` / `News Flow` | Main-page navigation. The screener articles say e.g. "Products dropdown → Screeners → Stocks". |
| Supercharts right toolbar | `Products` button (bottom of the right toolbar) → the "Overlay sheet" | The Supercharts getting-started article: the right toolbar has `Watchlist`, `Alerts`, `Object tree and data window`, `Screeners` ("Open and switch between TradingView screeners to browse markets without leaving your chart"), `Pine Editor`, `Calendars` ("Track the most important economic events and companies' activity"), `News Flow` ("Explore industry news and see what's moving the markets"), `Portfolio`, `Fundamental Graphs`, `Yield Curves`, `Options`, `Macro Maps`, `Community feed`, `Notifications`, `Help Center`. |

The important design fact: the screener, calendar and news are **the same full product** whether opened from the site or from inside the chart; the chart just hosts them in an overlay sheet. Nothing is a cut-down "widget" version.

---

## 1. The Screener family

### 1.1 Which screeners exist

| Screener (verbatim) | One-line purpose (features page / Help Center, verbatim) | Default sort |
|---|---|---|
| `Stock Screener` | "Helps you find world stocks by hundreds of filters — from dividend yield and financial multipliers to performance and technicals" | "Local region market sorted by market capitalization" |
| `ETF Screener` | "Allows you to pinpoint exchange-traded funds that match your investment goals, analyzing everything from the size of assets under management to performance metrics" | "the US ETF market sorted by Assets Under Management (AUM)" |
| `Bond Screener` | "Navigates the bond market with precision, offering filters for yield, maturity, credit rating, and more" | could not verify |
| `Crypto Coins Screener` | "Allows you to analyze crypto coins by tons of filters — market caps, circulating supply, address metrics, and even social media virality" | "Rank — a cryptocurrency's overall position based on calculated market capitalization" |
| `CEX Screener` (menu label `CEX pairs`) | "Helps traverse trading pairs across 40+ centralized exchanges comparing cryptos by trade volume and technicals" | "sorted by default by their trading volume over the previous 24 hours" |
| `DEX Screener` (menu label `DEX pairs`) | "Simplifies the world of decentralized trading by offering insights into liquidity pools, token pairs, and transaction activity across decentralized exchanges" | 24-hour trading volume |
| `Pine Screener` | "scan your custom watchlists and indices using Pine Script®" | n/a (it is a scan, not a table) |
| `AI Screener` (beta, inside the Stock Screener) | "helps you turn a vague screening idea into a ready-to-use Screener setup in seconds" | n/a |

Pricing-page claims for the whole family (all tiers including `Basic` unless noted): "Stock, ETF, DEX, crypto screeners", "150+ exchanges from 50+ countries", "500+ fundamental and technical fields", "Multiple markets", "Chart view mode", "Watchlists as filters", "Data export". Gated: "Flagged symbols colors" — 1 color on `Basic`, 7 colors `Essential`+; "Screeners with auto refresh" — 1 min on `Basic`, 10 sec / 1 min `Essential`+; "Pine Screener" — `Premium` and `Ultimate` only.

### 1.2 The common shell (every screener shares this)

The "screeners walkthrough" article describes one shell reused by every asset class.

| Region of the screen | Control (verbatim) | What it does |
|---|---|---|
| Top-left | Screener switch menu | "enables instant switching between asset class screeners" |
| Top-left | Current screen name → dropdown | Opens the **Screens menu** (below) |
| Screens menu | `Save screen` | Stores "Current filter set; Current sorting; A set of columns combined into a custom column set; Current view mode". Shortcut `Ctrl + S` (Win) / `Cmd + S` (Mac) |
| Screens menu | `Make a copy` | "opens the duplicate in a new tab" |
| Screens menu | `Rename` | "allows you to change and save the name of the screen" |
| Screens menu | `Export screen results` | "saves your screen's data in a CSV file" |
| Screens menu | `Create new screen` | Shortcut `Shift + N`; "generates a fresh screen with inactive popular filters in the top panel" |
| Screens menu | `Recently used` | "access five most recent screens" |
| Screens menu | `Open screen…` | Loads saved custom screens **or** the preset "popular" screens |
| Screens menu | autosave toggle | "All subsequent actions will be saved automatically", the `Save` button hides, saves "2 seconds after each edit"; per screener type; custom screens only ("not popular ones") |
| Screens menu | delete | "Once a screen is deleted, it cannot be restored." Popular (preset) screens cannot be deleted |
| Toolbar | undo / redo arrows | `Ctrl+Z / Ctrl+Y` (Win), `Cmd+Z / Cmd+Y` (Mac); "history buffer tracks up to 100 steps" |
| Top panel | Filters row | `+` button or `Shift + F` opens the filter dialog; `Shift + H` "toggles between expanded and collapsed filter panel views"; `Hide filters` button collapses the panel |
| Top panel (Stock/ETF only) | Market region pill | Shows the current market; `More markets…`; `Multi-select` toggle "to screen two or more regions simultaneously"; `Primary listing` toggle |
| Results table, upper-left | `Table view` / `Chart view` toggle | Chart view = "Grid display of charts instead of rows; includes chart type, timeframe, layout settings" — chart types "bars, candles, or lines" |
| Results table | Column-set tabs | "ready-made column sets"; `+` to build a custom set |
| Results table | Column header click | sort |
| Results table | Column header right-click | `Customize column`, choose sorting type, reposition, remove; `Column settings` "for time period adjustments" |
| Results table | Row right-click | `Add Selected Symbols To Watchlist` (multi-select with `Shift`/`Ctrl`); flagging a symbol "automatically adds them to the Flagged List in the Watchlist" |
| Right-side settings (cogwheel) | Symbol logo toggle; description toggle; stock type toggle; currency toggle | display switches |
| Right-side settings | Auto-refresh | options "10 seconds, 1 minute, or never" (10 s is `Essential`+ per pricing) |
| Right-side settings | Base / "Financials currency" selector | "USD, EUR, JPY, GBP, etc." — Stock/ETF only |

Sharing: "Share your complete configuration including filters, sorting, columns, and watchlists with other traders" (save-custom-screen article).

### 1.3 The filter model

From the "How to use filters in screener" article:

| Action | Verbatim |
|---|---|
| Add | "On the top panel, open the filters menu by clicking the "+" button or using the "Shift + F" shortcut." |
| Preset parameters | "Some filters have only these and can't be customized. Just click on the currently working filter and choose what you need" |
| Manual setup | "Some filters allow you to adjust inputs for more personalization. In the same dialog, apply the necessary conditions" |
| Remove one | "In the filter editing dialog, click the bin icon." |
| Reset one | "click 'Reset.' The filter will remain on the top panel for later use." |
| Reset menu | `Reset all filters` — "resets all active filters in the top bar"; `Remove inactive filters` — "removes inactive filters only"; `Remove all filters` — "removes all filters (active and inactive)" |

Note the active/inactive distinction: a filter chip can sit in the top bar **inactive** (a saved slot) without constraining results. A new screen ships with "inactive popular filters" already in the bar.

The exact comparison operators inside the dialog (Above / Below / Between etc.) are not enumerated in the Help Center: **could not verify** verbatim.

Two special filters worth calling out because they explain empty results (the "Why is my Screener empty?" article):

- `Last trade time` — "excludes any symbols that have not been traded during the current session of the selected market."
- `Primary listing` — "if enabled, excludes all secondary listings on the selected market from the results." The dedicated article: AAPL "also lists its ticker on other international exchanges, such as the Italian market"; setting the filter to `Yes` keeps only main listings; "The Crown icon indicates when the main listing filter is active." Reachable from the Market pill **or** as an ordinary filter via `Add Filter` → `Primary Listing`.
- Watchlist as a source — "Some symbols in your list may not be available in this specific type of Screener, or they might not currently meet the criteria of your applied filters."

Earnings-date filters (own article) — the two filters and their fixed options:

| Filter | Options (verbatim) |
|---|---|
| `Recent Earnings Date` — "companies whose publication date of the last report is in the specified time period" | `Current trading day`, `Previous day`, `Previous 5 days`, `This week`, `Previous week`, `This month` |
| `Upcoming Earnings Date` — "companies whose publication date of the next report is in the specified time interval" | `Current trading day`, `Next day`, `Next 5 days`, `This week`, `Next week`, `This month` |

Caveats stated: dates "are aligned on the day the report was published in the symbol exchange's time zone" and upcoming dates "may be inaccurate, as they are often based on analyst forecasts."

### 1.4 Stock Screener — filter categories, column sets, presets

**Filter categories** (Stock Screener article):

| Category (verbatim) | Contents (verbatim) |
|---|---|
| `Security info` | "country, sector, exchange, issuer, and target price" |
| `Market data` | "price, volume, turnover, beta, and gaps" |
| `Technicals` | "moving averages, crossovers, oscillators, volatility bands, volume indicators, and popular candlestick patterns" — customizable: RSI, Momentum, EMA, SMA, Keltner Channels |
| `Financials` | "Statement-driven metrics (P&L, Balance Sheet, Cash Flow) with period selectors for TTM, quarterly, semiannual, and annual data, plus per-share metrics" |
| `Dividends` | "ex-dates, pay dates, yields, payout ratios" |
| `Valuation` | "P/E, EV/EBITDA, P/B, PEG, market cap" |
| `Growth` | "revenue, EPS, EBITDA, FCF growth rates" |
| `Margins and ratios` | "profitability and risk metrics" |

**Default column sets** (the tabs above the table), in the order the article lists them: `Overview`, `Performance`, `Technicals`, `Extended hours`, `Forecasts`, `Valuation`, `Dividends`, `Profitability`, `Income statement`, `Balance sheet`, `Cash flow`, `Per share`. The live market-movers pages show the same tab strip as `Overview, Performance, Technicals, Valuation, Dividends, Profitability, Income statement, Balance sheet, Cash flow, More`.

**The `Overview` column set as actually rendered** (read off the Top Gaining US Stocks page, which is the screener engine embedded in a Markets page): `Symbol`, `Chg %`, `Price`, `Vol`, `Rel vol`, `Mkt cap`, `P/E`, `EPS dil TTM`, `EPS dil growth TTM YoY`, `Div yield % TTM`, `Sector`, `Analyst rating`.

**Rating columns** (two Help Center articles):

- `Technical Rating` = average of 26 indicator votes (each −1 / 0 / +1). Moving averages (15): "Simple and Exponential MAs with different lengths (10, 20, 30, 50, 100, and 200), Hull MA (9), VWMA (20), and Ichimoku Cloud (9, 26, 52)". Oscillators (11): "RSI (14), Stochastic (14, 3, 3), CCI (20), ADX (14, 14), Awesome Oscillator, Momentum (10), MACD (12, 26, 9), Stochastic RSI (3, 3, 14, 14), Williams %R (14), Bull Bear Power (13), and UO (7, 14, 28)". There are three columns: `Moving Averages Rating`, `Oscillators Rating`, `Technical Rating` ("combined ratings for all of the indicators mentioned above").
- Thresholds: `Strong Sell` "below -0.5"; `Sell` "below -0.1 and above or equal to -0.5"; `Neutral` "-0.1 to 0.1"; `Buy` "above 0.1 and below or equal to 0.5"; `Strong Buy` "above 0.5".
- `Analyst rating` = "the consensus of broker recommendations for a security", "collected and aggregated by our provider (FactSet)". Values: `Strong Sell`, `Sell`, `Neutral`, `Buy`, `Strong Buy`, plus `No-rating`.

**Preset ("popular") screens.** The Help Center only says presets are "carefully preconfigured filters designed to help you discover interesting companies", opened via the screen name → `Open screen…`. The names inside that dialog could not be read from the Help Center (**could not verify** as a list). What *is* verifiable is the identical collection exposed as the US-stocks "market movers" pages, which run the same engine (see §7): `All stocks`, `Top gainers`, `Biggest losers`, `Large-cap`, `Small-cap`, `Largest employers`, `High-dividend`, `Highest net income`, `Highest cash`, `Highest profit per employee`, `Highest revenue per employee`, `Most active`, `Pre-market gainers`, `Pre-market losers`, `Pre-market most active`, `Pre-market gap`, `After-hours gainers`, `After-hours losers`, `After-hours most active`, `Unusual volume`, `Most volatile`, `High beta`, `Best performing`, `Highest revenue`, `Most expensive`, `Penny stocks`, `Pink sheet`, `Overbought`, `Oversold`, `All-time high`, `All-time low`, `52-week high`, `52-week low`.

**AI Screener** (beta, Stock Screener only): icon "in the upper-left corner of the filter panel", shortcut `Shift + A`; prompt "6-164 characters"; it will "apply matching filters, select relevant columns, and configure sorting" (example: "golden cross in India" → SMA filters, market set, technical columns, sorted by Technical Rating). "available to all paid users. Request limits depend on the subscription tier"; limit "resets automatically on the first day of every month at 00:00 UTC"; unsupported on mobile; failure text: "AI couldn't map to existing filters. Try rephrasing your request."

### 1.5 ETF Screener

| Filter category (verbatim) | Contents (verbatim) |
|---|---|
| `Security Info` | "General fund details, such as exchange, issuer, tax form, and overarching strategy." |
| `Market Data` | "Core trading metrics covering regular and extended-hours trading activity." |
| `Technicals` | "Technical indicators and studies that can be applied directly as filtering parameters" (RSI, Stoch RSI, Momentum, EMA, SMA, Keltner Channels) |
| `Analysis` | "Key fund features and fundamental fund metrics." |
| `Dividends` | "Income-focused filters including frequency, tax treatment, yield, and annual dividend amounts." |

Column sets: `Overview` (price, price × volume, AUM, asset class), `Performance`, `Extended hours`, `Fund flows`, `Dividends`, `NAV performance` ("Net Asset Value percentage changes"), `Holdings` ("Geographic region, management style, tracked index, leverage factor"), `Risk` ("Beta and volatility metrics"), `Technicals`. Has the `Primary listing` toggle like stocks.

Worth flagging for OnStock: the ETF screener already carries a **price-vs-NAV** notion (`NAV performance` column set) — the nearest thing on TradingView to a "gap" column.

### 1.6 Crypto Coins Screener

Aggregated per coin, "without reference to a specific market and exchange"; price is "calculated as averages across supported exchanges".

| Filter category (verbatim) | Contents (verbatim) |
|---|---|
| `Coin info` | "General information, such as price, trading volume, and category" |
| `Market data` | "Historical data covering gains, losses, and volatility" |
| `Valuation` | "Specific metrics designed for crypto valuation analysis" |
| `Holders` | "Insights into wallet addresses, their balances, and overall profitability" |
| `Transactions` | "On-chain data tracking average transaction sizes, coin volumes" |
| `Sentiment` | "Community sentiment based on social media dominance" |
| `Technicals` | RSI, Stoch RSI, Momentum, EMA, SMA, Keltner Channels |

Column sets: `Overview` (Rank, price, market cap, circulating supply), `Performance`, `Valuation` ("Coin velocity metrics"), `Addresses` ("Daily active addresses and new funds added"), `Transactions` ("Total number of transactions, volume in both coins and USD"), `Sentiment`, `Technicals`.

### 1.7 CEX Screener (`CEX pairs`)

"traded spot pairs, futures, and perpetual contracts from all centralized exchanges available on TradingView".

| Filter category | Contents (verbatim) |
|---|---|
| `Security info` | "General information about the base and quote currencies, the exchange, and the symbol type" |
| `Market data` | "Core metrics covering price action, trading volume, gaps, and volatility" |
| `Valuation` | "Metrics showing fully diluted market cap and standard market capitalization" |
| `Technicals` | RSI, Stoch RSI, Momentum, EMA, SMA, Keltner Channels |

Column sets: `Overview` ("exchange name, current price, trading volume, and technical rating"), `Performance`, `Technicals`.

### 1.8 DEX Screener (`DEX pairs`)

"pairs from decentralized exchanges" with on-chain activity — the closest cousin to OnStock's data (OnStock's token candles come from GeckoTerminal, a DEX aggregator).

| Filter category | Contents (verbatim) |
|---|---|
| `Pool Info` | exchange, "fully diluted valuation (FDV)", liquidity depth, blockchain network |
| `Market Data` | "Core metrics covering price action, trading volume, volatility, and historical performance." |
| `Trading Activity` | transaction counts, unique buyers/sellers, buy/sell ratios |
| `Technicals` | RSI, Stoch RSI, Momentum, EMA, SMA, Keltner Channels |

Column sets: `Overview` (Network, exchange name, price, total liquidity, FDV), `Performance`, `Transactions` ("Transaction counts, buy/sell breakdown, liquidity changes"), `Trading Volume` ("Buy/sell volume metrics by timeframe"), `Traders` ("Unique buyers and sellers over specific intervals"), `Technicals`. Which chains/DEXes are covered is not enumerated in the article: **could not verify**.

### 1.9 Pine Screener (`Premium`/`Ultimate`)

Path `Products → Screeners → Pine`. Workflow: "Select the source (watchlist or index)" → "Select an indicator" → "Set filtering criteria" → "Scan". Hard limits stated: "Only one indicator per screen"; "calculates data based on only the last 500 bars"; timeframes "1, 5, 15, 30" min, "1, 2, 4" h, 1D/1W/1M, no custom; "Indices are supported as a source up to a maximum of 4,000 symbols"; "No more than five separate `request.*()` calls"; "You can scan only one screen at a time"; rescan required after any change; unsupported inputs `input.timeframe()`, `input.symbol()`, `input.time()`. The indicator must output a supported plot type "(plot, plotbar, plotcandle, plotchar, plotshape, plotarrow, hline) OR an alertcondition()".

---

## 2. Heatmaps

Three heatmaps: `Stock Heatmap`, `ETF Heatmap`, `Crypto Coins Heatmap` (Help Center "from global trends to details"). The features page: "Grouped by sector to explore each one in detail" with "filters and quick stats".

### 2.1 Source selector

| Heatmap | Source options (verbatim where available) |
|---|---|
| Stocks | "Select specific index or entire country's market" |
| ETFs | "Choose specific countries for fund display" |
| Crypto | "All coins, excluding Bitcoin, excluding stablecoins, or DeFi" |

### 2.2 `Size by`

"Size by — defines what the size of each cell represents". Defaults and alternatives:

| Stocks | ETFs | Crypto coins |
|---|---|---|
| `Market cap` (default: "Total market value of the company's outstanding shares") | `AUM` (default: "Total market value of the investments managed by the fund") | `Market cap` (default: "Total value of the circulating supply of the coin") |
| `Volume 1D / 1W / 1M` | `Volume 1D / 1W / 1M` | `FD Market cap` |
| `Price × Volume (Turnover) 1D / 1W / 1M` | `Price × Volume (Turnover) 1D / 1W / 1M` | `Volume in USD 24h` |
| `Mono size` | `Mono size` | `Mono size` |

### 2.3 `Color by`

"Color by — defines what the color of each cell represents". Default is `Change 1D, %` ("or Change 24h, % for crypto") — "green for gains, red for losses, grey for minimal change".

| Group | Options (verbatim) |
|---|---|
| Price change | `Change 1h`, `4h`, `1D` (%) |
| Performance | `1W`, `1M`, `3M`, `6M`, `YTD`, `1Y` (%) |
| Extended hours (stocks) | `Pre-market change`, `Post-market change` (%) |
| Activity & volatility (stocks) | `Relative Volume`, `Volatility 1D (%)`, `Gap (%)` |
| ETFs (additional) | `NAV total return`, `Top weight`, `Beta` |
| Crypto (additional) | `Volume change`, `Volume in USD` |

Per-map summary from the overview article: Stocks `Change / Performance / Pre-market/Post-market change / Relative Volume / Volatility / Gap`; ETFs `Change / Performance / NAV total return / Top weight / Volatility / Beta`; Crypto `Change / Performance / Volume change / Volume in USD / Volatility / Gap`.

Note: TradingView's `Gap` here means the open-vs-prior-close price gap, **not** OnStock's token-vs-share gap. Same word, different thing.

### 2.4 Grouping and view modes

- Stocks "Grouped by sector"; ETFs "Organized by asset class"; Crypto "Displayed on a single level without hierarchical grouping".
- Four modes: "Classic with grouping", "Classic without grouping", "Mono Size with grouping", "Mono Size without grouping". In Monosize mode the size parameter still "affect[s] symbol sorting".
- Drill-down: "Clicking on a group's name opens a detailed, zoomed-in heatmap containing only the symbols within that group."

### 2.5 Display settings (cogwheel)

| Setting (verbatim) | Options (verbatim) |
|---|---|
| `Title` | `None`, `Symbol ticker`, `Symbol description` |
| Symbol logo | on / off |
| `Display value` | `None`; "Second value - equal to the selected color parameter"; `Symbol Price`; "Third value - equal to the chosen size parameter" |
| Color scheme | `Classic`, `Color-blind`, `Monochrome` ("The last two options are designed for users with color vision deficiencies") |
| Grouping | "No group mode" / "Grouped mode (default)" |
| Size mode | "Monosize mode" / "Standard mode" |
| Fullscreen | button "in upper right corner" |

Toolbar camera (share) icon: `Download as image`, `Copy to clipboard`, `Copy direct link`, share to X or Facebook.

### 2.6 Legend, ranges, hover

- "Each range in the legend is a button, so the legend also works as a filter" — clicking a range hides/shows those tiles. Example from the range article: hiding "five intermediate segments (−2 to +2)" leaves only "the +3 and −3 ranges".
- Range logic: the system "Determines the most suitable legend type", "Detects the minimum and maximum values of the selected metric", "Divides this span into a set of value ranges (segments)"; "Each range is assigned a specific color"; ranges "recalculate dynamically when you switch metrics or change filters". The set-up article gives the daily-change example "from −3% to +3%". Whether the ±3% band is fixed or derived per dataset: **could not verify** beyond those two statements.
- Hover shows "exact price, selected Size by metric, and selected Color by metric".
- Plan tier: none stated in any heatmap article.

---

## 3. Calendars

The "TradingView Calendar" article: four tools — `Economic Calendar`, `Earnings Calendar`, `Dividend Calendar`, `IPO Calendar` (the earnings article also names a `Revenue` calendar as a sibling view). Access: `Products` → `Calendars`, or "directly via the overlay sheet within Supercharts" (right toolbar → `Calendars`). Pricing page lists "Economic and earnings calendars" under `Essential`+; the public calendar web pages loaded without a login during this research, so exactly what that gate covers (probably the in-chart panel / event overlays) **could not verify**.

### 3.1 Economic Calendar

Page copy: "dates for important economic events and releases that could potentially influence specific asset prices or whole markets"; "more than 300,000 economic indicators from over 190 countries", with an option to show G20 members only.

| Element | Verbatim |
|---|---|
| Columns | `Actual` — "Shows the actual reported value of the indicator (as opposed to what was expected)"; `Forecast` — "Shows the market's expected forecast for the indicator"; `Prior` — "Displays the previous value of the indicator so you can see the full scale and trend" |
| Importance | "A small bar graph next to each country illustrating the importance of the event" |
| `High importance` toggle | shows only "events with the highest market-moving potential" |
| Countries | "Select specific nations" or `Entire world` |
| Period | "upcoming events, past reports from yesterday, or scheduled announcements for today, tomorrow, or this week"; page: "select the necessary week in the Calendar on the upper toolbar or pick a specific day" |
| Categories menu | "interest rates, inflation, bonds, etc." |
| Time zone | "to your local time zone" |
| Event click | "launch dedicated charts, access the indicator's symbol page, or Add to calendar via Google Calendar integration" |
| Event body | "short explainers of the events and forecasts from experts" |

Exact list of category names: **could not verify**.

### 3.2 Earnings Calendar (and Revenue)

Page: reports "released by companies", oldest at top, newest/future at bottom; "the report's time and company name, estimated and actual EPS, surprise, and the company's market capitalization"; sortable by any metric; upper-panel filters "choose a time period, country, and time zone".

| Column (verbatim) | Definition (verbatim) |
|---|---|
| `Estimated EPS / Revenue` | — |
| `Actual EPS / Revenue` | — |
| `Surprise` | "the percentage difference between the estimate and the actual reported number" |
| `Market Cap` | — |

Report timing icons (Dividend article, same convention): Sun = before market open, Moon = after market close.

Related: the Portfolio section's "Upcoming Earnings" shows `Today & Yesterday` and `Next 14 Days`, columns `Symbol, Date, Time, Estimate EPS, Actual EPS, Surprise percentage, Market cap`.

### 3.3 Dividend Calendar

Columns: `Amount` — "How much money the company is going to pay shareholders for each share they hold"; `Ex-date` — "The cutoff day. You must purchase the stock before this date to be entitled to the upcoming dividend payout"; `Pay date`; `Dividend yield` — "the annual dividend payout relative to the current stock price". Portfolio's "Upcoming Dividends" filters "by ex-date or pay date", default "ex-date with a 14-day horizon".

### 3.4 IPO Calendar

Access `Products → Calendars → IPO`. Columns: `Date`, `Exchange`, `Offer price`, `Shares offered`, `Deal amount`, `Market cap`. "view a schedule of upcoming public offerings, monitor the performance of previous IPOs"; search by company/ticker and "filtering by region or exchange" (search summary of the same article).

### 3.5 Calendar events **on the chart** (the Events tab)

`Chart settings` (gear) → `Events` tab:

| Checkbox (verbatim) | Effect |
|---|---|
| `Dividends` | "colored circles" on the time scale; Dividend article: "blue D markers along the time scale" |
| `Splits` | colored circles |
| `Earnings` | "Earnings & Revenue markers appear along the bottom time scale" |
| `Show Economic Events on Chart` | economic-event dots (for non-stock symbols: "key global economic events pulled directly from the Calendar") |
| `Latest news` | "purple lightning icon at the time scale with the latest updates for the selected symbol" |
| `News update notification on chart` | toast "in the lower-left corner of the chart window" — "To read the news in full, simply click on it" |

What the earnings/economic markers show on click: **could not verify** from the Help Center.

---

## 4. News

### 4.1 News Flow (the hub)

Blog launch post: "Our newest screener, designed specifically so you don't miss out on the most essential updates from the world's financial news." Layout: "filter panel, filtered results sorted by publication time, and selected news displayed in split-screen format rather than pop-ups"; "New headlines flash twice"; keyboard navigation; `Esc` closes the split screen; live updates "without page refresh".

Open it from `Products` (main page) or the Supercharts right toolbar `Products` → `News Flow`. First view is the `Full feed`: "all events from every news bureau, covering every country, every category, and every asset type".

Saved feeds: set filters, click the current feed name, choose `Create News Flow...` "to save customized filter settings for later access via dropdown menu".

**Filters** ("News Flow's filters overview"; every filter except Watchlist allows multiple selections):

| Filter (verbatim) | Definition (verbatim) |
|---|---|
| `Watchlist` | "news related to the instruments in your watchlist" |
| `Instrument` | "filters news by one or more specific trading instruments (tickers)" |
| `Market` | "filters news by instrument type/asset class (stocks, ETFs, crypto, forex, etc.)" |
| `Sector` | "news by economic sector classification" |
| `Corporate Activity` | "news by various types of corporate activity" |
| `Economics` | "macroeconomic topic (categories of economic data or areas of the economy: GDP, employment, prices, taxes, etc.)" |
| `Country` | "filters news by geographic (country) classification" |
| `Provider` | "a source that publishes the news: news agencies, financial media, and other outlets such as Reuters, Dow Jones Newswires, or TradingView" — "keep only the sources you trust or want to follow in your feed" |
| `Format` | "Flash, Important, Top stories, Key facts" |

The public `/news/` page exposes the same taxonomy as sections: `Top stories`; `Markets` (`Stocks`, `ETFs`, `Crypto`, `Forex`, `Indices`, `Futures`, bonds…); `Corporate activity` (`IPOs`, `Earnings`, `Earnings calls`, `Dividends`, `Share buybacks`, `Strategy, business, and products`, `Mergers and acquisitions`, `Management`, `Insider trading`, `ESG and regulation`); `Crypto` (`Market`, `Security`, `Crypto ETFs`, `Regulation`, `Pegs & reserves`, `Fundraising`, `Adoption`, `Tokenomics`, `Exchanges`, `Technology`, `People`); `Economics` (`GDP`, `Labor`, `Prices`, `Health`, `Money`, `Trade`, `Government`, `Business`, `Consumer`, `Housing`, `Taxes`); `Top providers`.

### 4.2 Providers

`/news/top-providers/` lists (verbatim): Reuters, MarketWatch, Dow Jones Newswires, Trading Economics, ShareCast, dpa-AFX, Mace News, BusinessWire, TradingView, MarketBeat, Barchart, CME Group, GlobeNewswire, Quartr, Quartr Insights, Beincrypto, Zacks, Stock Story, Market Index. The Dow Jones blog post claims "TradingView offers more than 100 news providers" and names the Dow Jones feeds `Dow Jones Equity Trader`, `Dow Jones Commodity Trader`, `Dow Jones Global News Select`, plus Wall Street Journal and Barron's content; "Most Dow Jones news require that you're logged into your account. No Pro, Pro+, Premium tiers are required to read though — just register to read on!" (older tier names, pre-rename). Pricing page today: "Real-time context news" is `Essential`+ — what "context" means versus the free feed **could not verify**.

### 4.3 News on the chart / by symbol

- Right toolbar `News Flow` panel: the older blog says "the news will automatically update and reflect the ticker on your chart" — i.e. the panel is symbol-scoped by default and follows the active chart symbol.
- Time-scale markers and toast: see §3.5 (`Latest news`, `News update notification on chart`).
- Watchlist panel: "News aggregates the latest news for all symbols currently in your watchlist" (watchlists article via search).
- Symbol page `News` tab (e.g. NVDA): tabs `Overview`, `Financials`, `Documents`, `News`, `Community`, `Technicals`, `Forecasts`, `Seasonals`, `Options`, `ETFs`, `Bonds`, `More`; the news list is titled `Latest headlines` with columns `Time`, `Instrument`, `Headline` (provider attribution inline). Per-page sub-filters (e.g. press releases only): **could not verify**.

### 4.4 The embeddable News widget (Charting Library / Trading Platform docs)

For completeness, because it documents the data contract TradingView expects of a news item: the widget "displays latest news on a symbol, exchange, or symbol type"; each item has `title`, source name, published timestamp, short description, optional external link. Enabled with `news: true` in `widgetbar`. Feed via `rss_news_feed` (`url` may contain `{SYMBOL}`, `{TYPE}`, `{EXCHANGE}`; `name` "is displayed underneath the news"; a per-symbol-type key like `stock` overrides `default`) or `news_provider` (`GetNewsFunction` → `GetNewsResponse` of `newsItem`). "requires quote data" (`getQuotes`, `subscribeQuotes`, `unsubscribeQuotes`).

---

## 5. Ideas and Minds (the social layer, briefly)

| Item | Verbatim facts |
|---|---|
| `Ideas` | "mid-to-long-form research, akin to blog posts that are chart-focused". `/ideas/` tabs `Popular`, `Editors' picks`; filters `All ideas` / `Videos only`; sort `Most recent` / `Most popular`. Card: symbol, `Long`/`Short`, author, boosts, comments, chart thumbnail. Publish dialog required fields: "Title your work (required)", "Provide a description (required)", "Select a category (required)", "Mark your idea as long, neutral, or short (required)"; optional related ideas and "Smart tags". Editing/deleting "only within 15 minutes after publishing". Sub-15-minute timeframes "can only be published privately or sent in chat or Minds". `Update Idea` function for follow-ups. |
| `Minds` | "built for short-form content — quick thoughts, chart observations, or trading insights that don't require a full-fledged Idea post". Symbol-scoped: "The feed updates when you change symbols on your chart"; on symbol pages under `Discussions`; in Supercharts `Publish` → `Speak your mind`; shown "in a purple box" on the symbol right rail. "$" hashtag symbol links; chart snapshot attach; boost / comment / share / report. Rule: "Minds are not meant to promote your already published ideas". |
| Tiers | Pricing page: "Publish public ideas and scripts" `Essential`+; "Minds" `Essential`+; "Comments on public ideas and scripts" `Essential`+; "Video ideas" `Premium`+. |

---

## 6. Hotlists (auto-lists in the Watchlist menu)

Not a screener, but the bridge between screener and watchlist. "Dynamic lists of stocks experiencing significant changes—think of them as pre-curated watchlists". Names: `Volume gainers`, `Percent change gainers / losers`, `Percent range gainers / losers`, `Gap gainers / losers`, `Percent gap gainers / losers`. Scope: "all exchanges in the U.S." or "a single specific market, like the Nasdaq or the Tokyo Stock Exchange". Path: watchlist name → `Open list…`, or `Shift + W`. "Each list updates in real time". Pricing: "Hotlists" `Essential`+.

---

## 7. Markets pages

### 7.1 `/markets/` landing

Sections (verbatim labels): `Indices` (S&P 500, Nasdaq 100, Dow 30, US 2000 small cap, Nasdaq Composite; `World indices`), `US Stocks` (`Highest volume stocks`, `Most volatile stocks`, `Stock gainers`, `Stock losers`, community trends), Earnings & IPO calendars, `World Stocks` (by market cap, by employees), `Cryptocurrency` (`Crypto market cap ranking`, `TVL ranking`, `Crypto gainers`, `Crypto losers`), Futures & Commodities, Forex & Currencies (pairs + currency indices), Government Bonds (US 1Y–30Y, 10Y cross-country), Corporate Bonds, `ETFs` (by volume, AUM growth, returns, dividend yield), `Economy` (US GDP, inflation, unemployment; an economic heatmap by country; `Economic Calendar`).

### 7.2 `/markets/stocks-usa/`

`Market summary` (S&P 500), sector performance (1-month), `Earnings Calendar`, `Most active`, `Unusual volume`, ideas, `Community trends`, `Stock collections` — the market-movers set listed in §1.4 (each is a screener page with the column-set tab strip and, for the gainers page, the explanatory line "the biggest daily growth in price" plus the caveat "there's always a risk of retracement"). Also IPO Calendar, sector heatmap, FAQ.

### 7.3 `/markets/cryptocurrencies/`

`Market summary` (BTC, ETH, BNB, XRP, SOL, TRX, DOGE USD pairs); `Crypto total market cap` (TOTAL), `Stablecoin market cap` (STABLE.C), `Bitcoin dominance`, `Volmex implied volatility` (BVIV / EVIV); ideas filtered `Popular` / `Recent` / `Video`; `Community trends`; rankings by market cap, TVL, daily gainers, daily losers; collections `All coins`, `Total value locked rank`, `DeFi coins`, `Gainers`, `Losers`, `Large-cap`, `Small-cap`, `Most traded`, plus address/transaction/volatility/liquidation lists.

### 7.4 `/markets/indices/`

`Market summary` (SPX, NDX, DJI, US2000USD, IXIC, NYA); international (NI225, UKX, DAX, PX1, FTMIB, IBC, SSE, Hang Seng, Nifty 50, IBovespa); collections `All indices`, `Major world indices`, `US indices`, `S&P sectors`, `Currency indices`, regional (Americas, Europe, Asia, Pacific, Middle East, Africa); ideas; FAQ.

The pattern across all three: **summary strip → screener-backed tables → ideas → collections → FAQ**, with every table being a saved screen and every collection link opening the screener engine with a preset applied.

---

## Sources (every URL actually read)

Primary — TradingView pages and Help Center
- https://www.tradingview.com/pricing/
- https://www.tradingview.com/features/
- https://www.tradingview.com/screener/ (header only rendered)
- https://www.tradingview.com/heatmap/stock/ (header only rendered)
- https://www.tradingview.com/heatmap/crypto/ (header only rendered)
- https://www.tradingview.com/economic-calendar/
- https://www.tradingview.com/markets/stocks-usa/earnings/
- https://www.tradingview.com/news/
- https://www.tradingview.com/news/top-providers/
- https://www.tradingview.com/symbols/NASDAQ-NVDA/news/
- https://www.tradingview.com/ideas/
- https://www.tradingview.com/markets/
- https://www.tradingview.com/markets/stocks-usa/
- https://www.tradingview.com/markets/stocks-usa/market-movers-gainers/
- https://www.tradingview.com/markets/cryptocurrencies/
- https://www.tradingview.com/markets/indices/
- https://www.tradingview.com/support/solutions/43000718866-tradingview-stock-screener-trade-smarter-not-harder/
- https://www.tradingview.com/support/solutions/43000718885-tradingview-screeners-walkthrough/
- https://www.tradingview.com/support/solutions/43000718745-how-to-use-filters-in-screener/
- https://www.tradingview.com/support/solutions/43000718804-how-to-save-custom-screen/
- https://www.tradingview.com/support/solutions/43000474432-how-to-export-screener-data/
- https://www.tradingview.com/support/solutions/43000635878-why-is-my-screener-empty-why-are-there-no-matches-in-the-screener/
- https://www.tradingview.com/support/solutions/43000639570-how-to-see-the-primary-listed-symbols-for-the-relevant-market-what-is-the-primary-listing-filter-for/
- https://www.tradingview.com/support/solutions/43000734922-how-do-earnings-date-filters-work-in-the-screener/
- https://www.tradingview.com/support/solutions/43000473930-how-to-add-the-screener-search-results-to-the-watchlist/
- https://www.tradingview.com/support/solutions/43000475547-what-do-the-ratings-in-the-screener-mean/
- https://www.tradingview.com/support/solutions/43000614331-technical-ratings/
- https://www.tradingview.com/support/solutions/43000747299-analyst-rating/
- https://www.tradingview.com/support/solutions/43000742436-tradingview-pine-screener-key-features-and-requirements/
- https://www.tradingview.com/support/solutions/43000785770-how-to-use-the-ai-screener/
- https://www.tradingview.com/support/solutions/43000718742-crypto-coins-screener-discover-hidden-gems/
- https://www.tradingview.com/support/solutions/43000746110-cex-screener-discover-crypto-trading-pairs-centralized/
- https://www.tradingview.com/support/solutions/43000744465-dex-screener-a-way-to-decentralize-your-trades-and-investments/
- https://www.tradingview.com/support/solutions/43000746345-what-is-the-difference-between-crypto-%D1%81oins-dex-and-cex-screeners/
- https://www.tradingview.com/support/solutions/43000718743-what-is-the-etf-screener/
- https://www.tradingview.com/support/categories/screener/
- https://www.tradingview.com/support/folders/43000591054-how-to-work-with-heatmap/
- https://www.tradingview.com/support/solutions/43000707144-how-to-set-up-a-heatmap-what-is-size-by-and-color-by/
- https://www.tradingview.com/support/solutions/43000766446-tradingview-heatmaps-from-global-trends-to-details/
- https://www.tradingview.com/support/solutions/43000707156-how-to-set-up-the-display-of-the-heatmap/
- https://www.tradingview.com/support/solutions/43000707158-how-to-change-the-color-of-heatmaps/
- https://www.tradingview.com/support/solutions/43000773646-range-calculation-and-color-logic-of-the-heatmaps/
- https://www.tradingview.com/support/solutions/43000707391-tradingview-calendar-key-economic-and-corporate-events/
- https://www.tradingview.com/support/solutions/43000759911-economic-calendar-track-all-major-market-events/
- https://www.tradingview.com/support/solutions/43000759912-what-are-earnings-and-revenue-calendars/
- https://www.tradingview.com/support/solutions/43000759913-introduction-to-dividend-calendar/
- https://www.tradingview.com/support/solutions/43000773798-tradingview-ipo-calendar-master-upcoming-offerings/
- https://www.tradingview.com/support/solutions/43000756104-overview-upcoming-earnings-and-dividends/
- https://www.tradingview.com/support/solutions/43000494799-how-can-i-enable-disable-colored-circles-of-earnings-splits-or-dividends-on-a-chart/
- https://www.tradingview.com/support/solutions/43000494798-how-can-i-enable-disable-colored-circles-dots-of-economic-events-on-a-chart/
- https://th.tradingview.com/support/solutions/43000728828/ (News Flow hub article; the www URL returned 404 to the fetch tool, this mirror served the English text)
- https://www.tradingview.com/support/solutions/43000732560-news-flow-s-filters-overview
- https://www.tradingview.com/support/solutions/43000732565-filter-by-provider/
- https://www.tradingview.com/support/solutions/43000762029-discover-market-movers-with-tradingview-hotlists/
- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/
- https://www.tradingview.com/support/solutions/43000690226-how-to-use-minds-and-what-they-are-made-for/
- https://www.tradingview.com/support/solutions/43000696301-using-minds/
- https://www.tradingview.com/support/solutions/43000591338-publishing-and-updating-ideas/
- https://www.tradingview.com/support/solutions/43000589083-how-can-i-publish-an-idea/
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/news/

Primary — TradingView blog
- https://www.tradingview.com/blog/en/latest-news-on-chart-41557
- https://www.tradingview.com/blog/en/dow-jones-newswires-on-tradingview-36656
- https://www.tradingview.com/blog/en/customized-real-time-updates-news-flow-46582

Search-result snippets only (not opened in full; used solely to locate the primary articles above): Google-style web searches restricted to tradingview.com/support and tradingview.com/blog.

Not opened / not verifiable in this pass: the individual articles inside the Screener category's "Features and tools" (13), "calculations and formulas" (21) and "FAQ" (8) folders beyond those listed; the Bond Screener articles; the ETF heatmap page.

---

## What this means for OnStock

OnStock today: token candles from GeckoTerminal (1m/5m/15m/1h/4h/1D), Yahoo delayed stock OHLC, the gap series, Treasury yields, a Google-News tokenization feed (six fixed queries + a per-symbol lane, client-side source whitelist), watchlists/folders, price + gap-drift alerts, a Gap|Candles toggle, SMA/EMA/RSI, Jupiter trade routing, and a phone Screener that groups one row per underlying with sorts `Widest gap` / `Most expensive` / `Cheapest` and chips `All / Stocks / ETFs / Bonds`.

1. **Adopt — the screener shell (screen name → `Open screen…`, `Save screen`, `Make a copy`, `Export screen results`, column-set tabs, `Hide filters`).** The desktop Screener should stop being a sorted list and become a table with named, saveable screens; TradingView proves that presets and user screens can share one menu. CSV export is cheap and the pricing page shows it is a free-tier feature everywhere.
2. **Adapt — column sets, but ours are gap-shaped.** Instead of `Overview / Performance / Valuation …`, ship `Overview` (token, underlying, issuer, gap %, token price, share price), `Gap` (gap now / 1h / 1D / 7D range, gap drift, issuer spread in bp), `Liquidity` (GeckoTerminal 24h volume, pool liquidity, trades, buyers/sellers — the DEX Screener's `Transactions` / `Traders` sets are the template), and `Technicals` (the SMA/EMA/RSI we already compute). Keep the row-per-underlying grouping; TradingView's `Primary listing` toggle with its crown icon is the exact same idea (hide secondary listings) and is a good label to borrow: "Primary issuer only".
3. **Adopt — the active/inactive filter chip model with `Reset all filters` / `Remove inactive filters` / `Remove all filters`.** Our `MAX_CREDIBLE_GAP = 25` and the thin-market exclusion are hidden filters today; on desktop make them visible chips (`Credible gaps only`, `Liquid markets only`) so a power user can turn them off, the way TradingView exposes `Last trade time` and explains empty results.
4. **Adopt — the heatmap, with `Color by = Gap %` and `Size by = 24h volume | Liquidity | Mono size`.** This is the single best fit on the whole surface: the thesis is the gap, and a treemap coloured by gap with the legend-as-filter (click the ±0.5% band to hide the boring middle) is a one-screen answer to "who is mispriced right now". Group by issuer (Ondo / xStocks / bStocks) and by sector; keep `Classic / Color-blind / Monochrome` schemes.
5. **Adapt — the colour legend range.** TradingView's daily-change legend runs about −3%…+3% with a grey middle. For gap %, a fixed ±2% band with a grey zone at ±0.25% matches the spread magnitudes the phone screener already sees (QQQ spans ~33 bp across issuers). Do not auto-scale per dataset or a quiet day will look like a crisis.
6. **Adapt — Hotlists → "Gap lists" in the watchlist `Open list…` menu.** `Widest premium`, `Widest discount`, `Gap flipped sign today`, `Most traded tokens 24h`, `Fastest gap drift`. They cost nothing beyond the sorts we already have and give the watchlist pane the same "pre-curated list" affordance TradingView gates behind Essential.
7. **Adapt — Earnings markers on the chart (`Events` tab: `Earnings`, `Dividends`, `Splits`).** For the *underlying* share, earnings and ex-dividend dates are exactly when the token-vs-share gap misbehaves (the token trades through the after-hours print; a dividend is not passed through identically by every issuer). We have a Finnhub function in `api/`; use it for dates and draw the markers on both the Candles and the Gap views. Skip the economic-event dots.
8. **Adapt — a "Sessions" calendar instead of the Economic calendar.** OnStock's macro event is not CPI, it is "NYSE closed, token still trading". A slim calendar of market holidays, early closes and the daily 16:00–09:30 ET window, drawn as shaded bands on the gap chart, is more useful than 300,000 indicators. Keep Treasury yields where they are; do not build a general economic calendar (no data source, no differentiation).
9. **Adopt — News Flow's filter vocabulary for our feed: `Watchlist`, `Instrument`, `Provider`, `Format`.** We already parse Google News RSS server-side and whitelist sources client-side; exposing the whitelist as a `Provider` filter, and scoping to the current watchlist, is a small change. `Format` maps to our two lanes (tokenization beat vs company headlines). Keep the fixed-query design (never free-text, per `api/news.js`).
10. **Adapt — news on the chart.** The `Latest news` purple-lightning marker on the time scale is worth copying for the per-symbol lane; the lower-left toast (`News update notification on chart`) is not — with a 30-minute edge cache we cannot honestly call anything "breaking".
11. **Adopt — the symbol page's `Latest headlines` table (`Time`, `Instrument`, `Headline` with provider inline).** That is a better desktop layout for the per-ticker news than the phone card stack, and it is what the AssetDetail right rail should hold.
12. **Skip — Ideas and Minds.** A social layer needs moderation, house rules and a 15-minute edit window policy; none of that is OnStock's job, and the owner is security-cautious. If community ever matters, link out.
13. **Skip — Pine Screener and AI Screener.** Both require a scripting runtime or an LLM round-trip and monthly quotas; our filter space is small enough that named presets cover it.
14. **Skip — Crypto Coins / CEX screeners and the multi-market region selector.** OnStock is one market (Solana-side tokens vs their US underlyings). The only screener cousin that matters is the DEX Screener, and only for its column vocabulary (`Pool Info`, `Trading Activity`, `Traders`), which we get from GeckoTerminal already.
15. **Adopt — the Markets-page pattern for a desktop Home: summary strip → screener-backed tables → collections.** `Tokenized total market cap`, `By issuer`, `Gap gainers / losers`, then the collections (`All tokens`, `Widest gaps`, `Most traded`, `New listings`). Every table is a saved screen, every collection link opens the Screener with that preset — one engine, many doors, exactly as TradingView does it.
