# 18 — The Details widget, the symbol's data blocks and the right-toolbar product panels

Written 2026-09-06 as a filler for the gap the critic found in the teardown: the Details section under the watchlist and the five product panels at the bottom of the right toolbar (Yield Curves, Fundamental Graphs, Portfolio, Options, Macro Maps) had each been described from one Help-Center sentence, yet spec A2 ("Right column = watchlist over details"), Adapt #3 (Details → the gap panel) and Adapt #7 (Yield Curves → `TreasuryYields`) are Phase-1 decisions built on them.

**How this was read.** Two sources, kept apart in the tables:

- **Live** — the guest (logged-out) Supercharts page at `tradingview.com/chart/?symbol=…`, opened in a headless browser at a 1600 × 1000 viewport on 2026-09-06 (Sat, US markets closed, crypto open). The Details section was read for **NASDAQ:AAPL**, **BITSTAMP:BTCUSD**, **SP:SPX**, **FX:EURUSD** and **TVC:US10Y**; the Settings checklist was opened for each; the Products menu and the Yield Curves, Options, Macro Maps and Portfolio overlays were opened from inside the chart. Labels below are transcribed from the DOM, so casing and punctuation are TradingView's.
- **Help Center / blog / pricing** — the articles listed under Sources. Where the Help Center says one thing and the live page shows another, both are recorded.

**What a guest cannot see** (each is marked *could not verify* where it matters): the "Metrics" button and "Add note" both open the **Sign in** dialog for a guest; the index's news block reads "Sign in to read exclusive news"; **Fundamental Graphs** and **News Flow** are not in the guest Products menu at all, so the Fundamental Graphs section is built from the standalone page and its Help-Center article. Nothing on any logged-in account was read.

Plan names as the pricing page prints them: **Basic** (free), **Essential**, **Plus**, **Premium**, **Ultimate**.

---

## 0. Where these things live: the right toolbar and the Products menu

The right toolbar (`data-name="right-toolbar"`, the `widgetbar-tabs` strip) as a guest sees it, top to bottom, with each button's tooltip verbatim:

| Position | Tooltip (verbatim) | `data-name` | What it opens |
|---|---|---|---|
| top | **Watchlist, details, and news** | `base` | The Watchlist panel, split into the Watchlist section above and the Details section below by a draggable handle (`widgetbar-widgethandle`, 5 px tall) — the subject of §1 |
| | **Alerts** | `alerts` | Alerts panel (07) |
| | **Object tree and data window** | `object_tree` | Object tree (03) |
| (gap) | | | |
| lower group | **Screeners** | `screener-dialog-button` | Screener overlay (10) |
| | **Pine** | `pine-dialog-button` | Pine Editor |
| | **Calendars** | `calendar-dialog-button` | Calendars overlay (10) |
| | **Community** | `community-hub-button` | Community feed |
| | **Notifications** | `notifications-button` | Notifications |
| | **Products** | `products-button` (`data-qa-id="products-button"`) | The menu below |
| bottom | **Help Center** | `help-button` | Help |

**The Products menu** (guest, verbatim, two groups):

| Group | Items |
|---|---|
| **Products** | Screeners · Pine Editor · Calendars · Portfolio · Yield Curves · Options · Macro Maps |
| **Social** | Community · Notifications |

The Help Center's "Getting started with Supercharts" list for the same strip is longer — "Watchlist, details, and news; Alerts; Object tree and data window; Screeners; Pine Editor; Calendars; News Flow; Portfolio; Fundamental Graphs; Yield Curves; Options; Macro Maps" — with these one-line descriptions:

| Item (verbatim) | Help-Center description (verbatim) |
|---|---|
| Portfolio | "Track your investments performance against benchmarks and assess your risk-profile." |
| Fundamental Graphs | "Access stock and crypto fundamental metrics." |
| Yield Curves | "Explore bond rates and find the best fixed-income assets." |
| Options | "Find your perfect instruments for both speculative trading and hedging." |
| Macro Maps | "See worldwide trends with economic indicators from around the globe." |

So **News Flow and Fundamental Graphs are absent from the guest's Products menu**; whether they appear for a logged-in Basic account *could not verify*.

**How a product opens ("as an overlay").** Choosing any Products item opens a dialog (`js-dialog`) that sits over the right half of the chart, to the left of the toolbar strip (at the 1600-wide viewport the overlay was ~512 px wide and the chart kept drawing underneath it). Every overlay has the same three header buttons, verbatim: **Move overlay to split-view**, **Collapse panel**, **Close**. The Help Center's wording: "Here you can access watchlists, news, alerts, and other products in the Overlay sheet via the Products menu at the bottom", and (IPO calendar article) "you can use the overlay sheet available on any TradingView page, even while charting". The screener/calendar/news articles' point stands for these five too: the overlay hosts the **same full product** as the standalone page (`/yield-curves/`, `/options/`, `/macro-maps/`, `/portfolios/`), not a cut-down widget.

**Split view.** "The Split view mode can help you better organize your workspace while charting. It prevents screeners, calendars, options, and other widgets from overlapping your chart"; the control is **Move overlay to split-view**; the panel then "defaults to 50% screen width", the layout "automatically saves widget size and positioning, reappearing when reopening the chart", several widgets can be pinned at once, and their toolbar icons disappear once pinned. Supercharts only.

**Desktop-app memory.** Release 3.2.0 (2026-06-03): "every tab now remembers the Watchlist along with its width and height, the products opened as overlays". Release 3.3.0 (2026-07-02): "Macro Maps now appears in the product list on the New Tab". Release 2.9.0 (2024-08-19) added "Options" to the New Tab's Products section. The New Tab's "Individual tools panel" (13 §10a) picks from Screeners, Heatmaps, Calendars, News Flow, Portfolios, Yield Curves, Options, Fundamental Graphs, Markets and Community tools. The website has no per-tab memory beyond the overlay's own size/position save above.

---

## 1. The Details section (under the Watchlist)

### 1.1 Anatomy

Single-click a watchlist row and "the Symbol details section" opens "right below the list. The contents of this section dynamically change depending on the instrument type." If only Details is visible, "The Watchlist section is most likely minimized. Just drag it down to see the hidden sections."

The live section has a fixed header row and a scrolling body:

| Part | Content (verbatim labels) | Notes |
|---|---|---|
| Header row | symbol logo + **AAPL**, then three icon buttons with tooltips **Metrics**, **Add note**, **Settings** | `Metrics` carries `data-qa-id="details-metrics-button"`. For a guest, **Metrics** and **Add note** both open the **Sign in** dialog ("Sign in · Continue with Google · Show more options · or · Email · Do not have an account? Sign up"). The Help Center's "expand button to open full-screen" is this button in today's UI — the full-screen content *could not verify* without an account. |
| Identity block (not hideable) | name (a link to the symbol page, e.g. `/symbols/NASDAQ-AAPL/`), exchange (**NASDAQ** / **BITSTAMP** / **SP** / **FXCM** / **TVC**), type tags (**Electronic Technology · Telecommunications Equipment** for a stock — links to the sector and industry market pages; **Spot · Crypto**; **Index**; **Forex**; **Bond**) | |
| Quote block (not hideable) | price, currency (**USD**; **POINT** for SPX; **%** for US10Y), a feed badge (**D** = delayed, **R** = real-time, with a tooltip such as "Real-time"), change and change %, session line **Market closed** / **Market open**, **Last update at Sep 4, 16:59 GMT-7** | The `Last update at …` line is the only cadence statement TradingView makes; the Help Center has none. |
| Body | The blocks in §1.3–1.7, each with a title and a trailing button (`More info`, `More financials`, `More seasonals`, `More technicals`, `See forecast`, `More bonds`, `More on options`, `Keep reading`, `Browse community posts`) | Trailing buttons are `<button>`s, not links, so their targets were inferred from the symbol-page tab names (§1.9) — *inferred, not verified*. |

Panel behaviour: Watchlist above, Details below, one draggable divider; the Details body scrolls on its own; the whole widget bar width is draggable (the watchlist measured 576 px at 1600 wide). The section is account-wide, not part of a layout (06).

### 1.2 The Settings (gear) checklist — the hideable blocks

Opening **Settings** shows a checkbox list. Help Center: "click on the settings button and select the information that you want to see in this place on all your devices." Read live for all five symbols:

| # | Item (verbatim) | Default on a fresh guest session | Rendered block(s) it controls (from the live panels) | Shown for |
|---|---|---|---|---|
| 1 | **Bid & Ask** | off | bid price × bid size and ask price × ask size (crypto shows sizes: `79,972 ×1.69032228` / `79,972 ×0.1872316`; forex shows two prices `1.16130` / `1.16138`; bond `4.850` / `4.846`; nothing rendered for AAPL with the market closed) | all |
| 2 | **Price ranges** | off | **DAY'S RANGE** low–high bar and **52WK RANGE** low–high bar (styled `Day's Range` / `52wk Range` on forex and bond) | all |
| 3 | **Latest news** | on | stock/crypto: the **Key facts** card (three-sentence summary + **Keep reading**); forex/bond: a **News** block holding one economic-calendar headline + **More events**; index: "Sign in to read exclusive news" | all |
| 4 | **Notes** | on | the note area / **Add note** (§2) | all |
| 5 | **Key stats** | on | **Key stats** (§1.3, §1.4) | stock, crypto |
| 6 | **Pricing model** | on | not rendered for any of the five symbols — presumably the fund block (Premium/Discount to NAV, AUM, expense ratio are the Help Center's "Key data points" for ETFs); *could not verify* | funds? |
| 7 | **Earnings** | on | **Earnings** bar chart | stock |
| 8 | **Dividends** | on | **Dividends** | stock |
| 9 | **Financials** | on | **Income statement** | stock |
| 10 | **Performance** | on | **Performance** 1W 1M 3M 6M YTD 1Y | all |
| 11 | **Seasonals** | on | **Seasonals** (three years + **More seasonals**) | stock, crypto, index, forex (not rendered for the bond) |
| 12 | **Technicals** | on | **Technicals** gauge + **More technicals** | stock, crypto, index, forex (not rendered for the bond) |
| 13 | **Analysts** | on | **Analyst rating** gauge + **1 year price target** + **See forecast** | stock |
| 14 | **Bonds** | on | **Highest YTM bonds** + **More bonds** (stock); **Yield curve** + **Key terms** (bond) | stock, bond |
| 15 | **Community** | on | **Browse community posts** (Minds) | all |
| 16 | **Profile** | on | **Profile** | stock, crypto, index |
| 17 | **Options** | on | **ATM IV term structure** / **Volatility curve (N days)** + **More on options** | stock, index — the item itself is absent from the forex and bond checklists (16 items) |

Sync: the article's "on all your devices" is the only statement; for a guest the two toggles flipped in this session survived a symbol change within the tab — where a guest's choice is stored *could not verify*. The blog (2022-03-23) frames the same feature: "a 'Settings' button to customize which information displays in the symbol details section, with preferences syncing across devices".

Two things are outside the checklist: the identity/quote header (always on) and **Key facts**, which follows **Latest news**.

### 1.3 US stock — NASDAQ:AAPL, block by block (live, in order)

| Block title (verbatim) | Fields / contents (verbatim) | Trailing control |
|---|---|---|
| (header) | `A` `AAPL` · `Apple Inc` · `NASDAQ` · `Electronic Technology` · `Telecommunications Equipment` · `319.97` `USD` `−8.24` `−2.51%` · `Market closed` · `Last update at Sep 4, 16:59 GMT-7` | — |
| Bid & Ask (off by default) | no values rendered while the market was closed | — |
| Price ranges (off by default) | `317.86` **DAY'S RANGE** `328.93` · `225.95` **52WK RANGE** `344.57` | — |
| **Key facts** | "Apple (AAPL) to hold product event Sept 9. Bloomberg says foldable iPhone may lead; chief product officer John Ternus to lead. Traders: watch launch date, product focus, and hardware push." | **Keep reading** |
| **Key stats** | **Next earnings report** `In 53 days` · **Volume** `39.61 M` · **Average Volume (30D)** `47.70 M` · **Market capitalization** `4.67 T` | — |
| **Earnings** | bar chart, x-axis `Q4 '25` `Q1 '26` `Q2 '26` `Q3 '26` `Q4 '26`, y-axis `0.00`–`3.20`, legend **Actual** / **Estimate**, a `53` day count | **More info** |
| **Dividends** | donut `12.04%` with legend **Earnings retained** / **Payout ratio (TTM)** · **Dividend yield TTM** `0.33%` · **Last payment** `0.27` · **Last ex-dividend date** `Aug 10, 2026` · **Last payment date** `Aug 13, 2026` | **More info** |
| **Income statement** | toggle **Annual** / **Quarterly**; bars `'21`–`'25`; y-axis `0.00`–`440.00 B` and a right axis `20%`–`28%`; legend **Revenue** · **Net income** · **Net margin %** | **More financials** |
| **Performance** | `0.99%` **1W** · `3.43%` **1M** · `2.27%` **3M** · `23.72%` **6M** · `17.53%` **YTD** · `34.19%` **1Y** | — |
| **Seasonals** | monthly heat strip for `2026` `2025` `2024` | **More seasonals** |
| **Technicals** | gauge with scale **Strong sell · Sell · Neutral · Buy · Strong buy**, reading `Neutral` | **More technicals** |
| **Analyst rating** | same gauge scale, reading `Neutral`; **1 year price target** `332.70` `(3.98%)` | **See forecast** |
| **Highest YTM bonds** | three rows of maturity date + yield: `Aug 8, 2062` `6.02%` · `Jul 31, 2042` `6.00%` · `Aug 5, 2061` `6.00%` | **More bonds** |
| **ATM IV term structure** | x-axis `1W` `2W` `1M` `2M` `3M` `6M` `9M` `1Y`, y-axis `20.0%`–`28.4%`; a second chart titled **Volatility curve (33 days)** | **More on options** |
| (Community) | **Browse community posts** | — |
| **Profile** | **Website** `apple.com` · **Employees (FY)** `166 K` · **ISIN** `US0378331005` · **CUSIP** `037833100` · **FIGI** `BBG000B9XRY4` · **CFI code** `ESVUFR` · a company description paragraph | — |

Compared with the Help Center's enumeration ("A quick market summary, Flash news, Key fundamental and technical stats, Information on related bonds, ETFs holding the stock, Options data, Seasonals, Company profile"): "Flash news" is the **Key facts** card today; "ETFs holding the stock" was **not** rendered in the guest panel (it is a symbol-page section, §1.9) — *could not verify* whether an account sees an ETF block.

### 1.4 Crypto pair — BITSTAMP:BTCUSD (live)

| Block title | Fields / contents |
|---|---|
| (header) | `BTCUSD` · `Bitcoin / U.S. Dollar` (link to `/symbols/BTCUSD/?exchange=BITSTAMP`) · `BITSTAMP` · `Spot` · `Crypto` · `79,972` `USD` `+142` `+0.18%` · **Market open** (no "Last update" line while open) |
| Bid & Ask | `79,972` `×1.69032228` · `79,972` `×0.1872316` (price × size) |
| Price ranges | `79,600` **DAY'S RANGE** `80,106` · `57,735` **52WK RANGE** `126,272` |
| **Key facts** | "BTCUSD rallied to about $81,000 and neared key resistance near $83,000. Traders tracked ETF flows and Fed comments on rate restraint as price eyed a test or breach of $83,000." · **Keep reading** |
| **Key stats** | **Volume** `230.95` · **Average Volume (30D)** `1.97 K` · **Trading volume 24h** `20.10 B` · **Market capitalization** `1.61 T` |
| **Performance** | `2.22%` 1W · `24.44%` 1M · `26.32%` 3M · `16.83%` 6M · `−8.60%` YTD · `−27.74%` 1Y |
| **Seasonals** | `2026` `2025` `2024` · **More seasonals** |
| **Technicals** | gauge `Neutral` · **More technicals** |
| (Community) | **Browse community posts** |
| **Profile** | **Website** `bitcoin.org` · **Source code** `github.com` · **Explorers** `blockchain.info` · **Whitepaper** `bitcoin.org` · **Community** `reddit.com` — each an outbound link |

No Earnings/Dividends/Financials/Analysts/Bonds/Options blocks render for a crypto pair even though the checklist still lists them. The symbol *page* for BTCUSD has more (Fully diluted market cap, Circulating supply, Max supply, Total supply, Open interest, Liquidations (24h), Funding rate under "Key stats"; a "Derivatives" section; an "ETFs" section) — the widget shows the four Key stats above only. The Help Center's "Crypto" folder (63 articles) defines the fuller vocabulary: Market capitalization, Fully diluted market capitalization, Volume in USD 24h, Volume / Market Cap, Total supply, Circulating supply, Maximum supply, TVL, NVT, Velocity, address metrics, social metrics (AltRank, Galaxy Score, Sentiment %, Social dominance %), All-time high, Category, Contract, Website, Explorers, Source code, Community, Whitepaper, Liquidity on crypto DEXs, Transactions / Buys / Sells, Traders / Unique buyers / Unique sellers, Trading volume / Buy volume / Sell volume, Fully Diluted Valuation (FDV), Network, Rank.

### 1.5 Index — SP:SPX (live)

| Block title | Fields / contents |
|---|---|
| (header) | `SPX` · `S&P 500 Index` · `SP` · `Index` · `7,718.60` **D** `POINT` `−29.11` `−0.38%` · `Market closed` · `Last update at Sep 4, 13:33 GMT-7` |
| Bid & Ask | two unlabeled values `7,676.83` / `7,747.21` rendered in the Bid & Ask slot — which is which *could not verify* |
| Price ranges | `7,706.12` **DAY'S RANGE** `7,750.19` · `6,316.91` **52WK RANGE** `7,816.70` |
| Latest news | **Sign in to read exclusive news** |
| **Performance** | `−0.21%` 1W · `−0.68%` 1M · `2.40%` 3M · `14.03%` 6M · `12.22%` YTD · `19.55%` 1Y |
| **Seasonals** | `2026` `2025` `2024` · **More seasonals** |
| **Technicals** | gauge `Neutral` · **More technicals** |
| **ATM IV term structure** | `1W`…`1Y`, `9.0%`–`17.4%`; **Volatility curve (30 days)** · **More on options** |
| (Community) | **Browse community posts** |
| **Profile** | **Website** `—` · **Employees (FY)** `—` · **ISIN** `US78378X1072` · **CUSIP** `78378X107` · **FIGI** `BBG000H4FSM0` |

The symbol page adds "Key data points" (Volume, Previous close, Open, Day's range), "Index info", "Largest holdings"; the widget shows none of those for an index.

### 1.6 Forex pair — FX:EURUSD (live)

| Block title | Fields / contents |
|---|---|
| (header) | `EURUSD` · `Euro / U.S. Dollar` · `FXCM` · `Forex` · `1.16130` **R** `USD` `−0.00126` `−0.11%` · `Market closed` · `Last update at Sep 4, 14:22 GMT-7` (the last digit of the price is rendered larger, pip-style) |
| Bid & Ask | `1.16130` · `1.16138` |
| Price ranges | `1.15844` **Day's Range** `1.16331` · `1.13245` **52wk Range** `1.20828` |
| **News** | one economic headline ("US NY FED NOWCAST STAFF MODEL SEES US Q3 GDP GROWTH RATE AT 2.3% …") · **More events** |
| **Performance** | `−0.33%` 1W · `0.52%` 1M · `0.02%` 3M · `0.59%` 6M · `−1.07%` YTD · `−0.31%` 1Y |
| **Seasonals** | `2026` `2025` `2024` · **More seasonals** |
| **Technicals** | gauge `Neutral` · **More technicals** |
| (Community) | **Browse community posts** |

The Settings checklist for forex has 16 items (no **Options**). No Profile block renders.

### 1.7 Bond yield — TVC:US10Y (live)

| Block title | Fields / contents |
|---|---|
| (header) | `US10Y` · `US Government Bonds 10 YR Yield` (link to `/symbols/TVC-US10Y/`) · `TVC` · `Bond` · `4.784` **R** `%` `+0.012` `+0.25%` · `Market closed` · `Last update at Sep 4, 14:08 GMT-7` |
| Bid & Ask | `4.850` · `4.846` |
| Price ranges | `4.748` **Day's Range** `4.810` · `3.926` **52wk Range** `4.816` |
| **News** | "US yields rise, but inflation data next week seen key to Fed outlook" · **More events** |
| **Yield curve** | a small curve chart · **More info** |
| **Key terms** | **Coupon** `4.63%` · **Maturity date** `Aug 14, 2036` · **Time to maturity** `9 years` · **Yield** `4.78%` |
| **Performance** | `2.40%` 1W · `3.57%` 1M · `6.86%` 3M · `15.72%` 6M · `14.15%` YTD · `13.50%` 1Y |
| (Community) | **Browse community posts** |

Neither Seasonals nor Technicals renders for the bond, although both are ticked in its 16-item checklist. The Help Center's "Key data points" folder defines the bond terms: **Coupon** ("the periodic interest payment made to bondholders by the issuer"), **Maturity date**, **Time to maturity**; and, for every class, **Previous close** ("The price at which a financial instrument ended its trading session on the previous trading day"), **Open**, **Day's range** ("The difference between the lowest and highest prices at which a financial instrument has traded during a particular trading session").

### 1.8 Update cadence

- The header's **Last update at …** line is the only timestamp; it disappears while the market is open (BTCUSD showed "Market open" and its price moved 79,941 → 79,972 during the session, i.e. the quote block streams).
- Price ranges, Bid & Ask and Performance move with the quote; Key facts / News are per-headline; Earnings, Dividends, Income statement, Analysts, Bonds, Options and Profile come from the fundamentals feed — the Help Center states no refresh interval for any of them (*could not verify*). The financial-data FAQ only warns that "financial data may differ from that shown in corporate reports" and that some companies lack quarterly data.

### 1.9 Where the trailing buttons go (inferred from the symbol page's tabs)

The symbol page `tradingview.com/symbols/EXCHANGE-TICKER/` carries the tabs **Overview, Financials, Documents, News, Community, Technicals, Forecasts, Seasonals, Options, ETFs, Bonds, More** (10 §9, 05 §3). Matching each widget button to the page it names:

| Widget button | Symbol-page destination (verbatim page title / heading) | What is there |
|---|---|---|
| name link | `/symbols/NASDAQ-AAPL/` — Overview | Key stats (Market capitalization, Dividend yield (indicated), Price to earnings Ratio (TTM), Basic EPS (TTM), Net income (FY), Revenue (FY), Shares float, Beta (1Y)); Upcoming earnings (Next report date, Report period, EPS estimate, Revenue estimate); Employees; Company info (Sector, Industry, CEO, Website, Headquarters, Founded, IPO date, ISIN, CUSIP, FIGI, CFI code); Financials; News; Ideas; Technicals; Analyst rating; Seasonals; Highest yielding bonds; ETFs holding the stock; FAQ |
| **More info** (Earnings) / **More financials** | `/financials-overview/` — "Fundamentals and stats" with sub-tabs **Overview, Statements, Statistics, Dividends, Earnings, Segments** | Key Facts, About, Valuation, Valuation Ratios (Annual/Quarterly), Growth and Profitability, Dividends, Financial Health |
| **More seasonals** | `/seasonals/` — "Historical seasonal performance" | year pickers, **Average** / **Percent** display options |
| **More technicals** | `/technicals/` — "Indicators' summary" | interval pills 1 minute … 1 month, gauges **Oscillators / Summary / Moving Averages**, Oscillators / Moving Averages / Pivots tables |
| **See forecast** | `/forecast/` — "Price target", "Analyst rating", "EPS", "Revenue" | max/min/consensus target, analyst counts, annual and quarterly estimate vs reported |
| **More bonds** | `/bonds/` — "Corporate debt securities" | columns **Symbol, YTW %, Price %, Coupon %, Maturity date, Outstanding amt, Face value, S&P rating, Fitch rating, Moody's rating, Issuer** |
| **More on options** | `/options/` — "Contracts overview" | tabs **Chain, Volatility, Build your own strategy**; view toggle **Calls / Puts / Calls and puts / More**; **All expirations**, **±6 strikes**, **Spread** (§6) |
| **Browse community posts** | `/minds/` — "Real-time market insights" | Minds posts; composer "What's on your mind about AAPL? Post" |
| **More events** (forex/bond) | Economic calendar (10) | — *inferred* |

These are inferences from names; the buttons carry no `href`. Treat as *not verified*.

### 1.10 Minds in the Details section

Help Center: "Another way to access Minds is to open the right rail in the symbol details. There, you'll find Minds in the purple box." and "This setup allows you to chart any symbol while simultaneously keeping up with what traders are discussing on the Minds feed for that specific symbol." Live, the guest sees only the **Browse community posts** button (the Community checklist item); the purple feed itself was not rendered for a guest — *could not verify* the logged-in look. (10 §9 already recommends skipping Minds.)

### 1.11 The "Symbol info…" dialog and the chart's right-click menu

The chart's right-click menu (read live on BTCUSD) shows where the same data is reachable from the canvas, verbatim: "Add alert on BTCUSD at 79,972… Alt + A", "Add order on BTCUSD at 79,972… Shift + T", "Add indicator/strategy on BTCUSD…", "Symbol info…", "Metrics", "Copy price 79,972", "Paste Ctrl + V", "Table view", "Visual order", "Move to", "Pin to scale (now right)", "Hide", "Add BTCUSD to watchlist", "Add text note for BTCUSD Alt + N", "Settings…". So **Metrics** and the note command exist on the chart as well as in the Details header.

---

## 2. Notes (text notes per symbol)

| Element | Label / behaviour (verbatim where quoted) | Source |
|---|---|---|
| Add a note | Four ways (Help Center): "Alt/Option + N"; the chart "More" menu on the data series or right-click on the chart (live label: **Add text note for BTCUSD  Alt + N**); the context menu of a quote list or screener; the Details widget's **Add note** button ("or select an existing note to edit"). "simply enter your text in the window and click the Add note button" | 43000667881; live |
| Where the button is | Details header, middle icon (pencil), tooltip **Add note**; the **Notes** checklist item hides the block | live |
| Multiple notes | "multiple notes per symbol with timestamps"; creation dates are kept | blog 29971 (2022-03-23) |
| All notes | "the **All notes** button in the upper right corner of the widget" lists "symbols containing notes"; "click on one of the symbols to see the associated text notes without changing the symbol on the chart" | 43000667897 |
| Watchlist marker | "Symbols with notes have a corresponding icon in the watchlist" | 43000667897 |
| Old / orphan notes | "All old notes not associated with a symbol will be collected in the **NON-SYMBOL RELATED NOTES** group" | 43000667897 |
| Management | a "centralized screen displays notes across all symbols, where users can edit and delete them" | blog 29971 |
| Guest | **Add note** opens the **Sign in** dialog | live |
| Length / format limits | not stated anywhere — *could not verify* (plain text is all the articles show) | — |
| Storage / sync | notes are described as private ("add a private text note for the symbol, which you can access anytime later") and reachable from any symbol list, and the same blog says Details preferences sync across devices; the articles never say where notes are stored. Server-side storage is the reasonable inference from "access anytime later" plus the sign-in gate — *inferred* | 43000745825, 29971 |
| Plan gating | none stated on the pricing page | 08 |

---

## 3. Yield Curves

### 3.1 Where and what

- **Where**: Products → **Yield Curves** (overlay in the chart; also the Help Center's "From Supercharts right toolbar via 'Yield Curves' button"), or the standalone page `tradingview.com/yield-curves/` ("Global Yield Curves: Explore & Compare Yields"). The bonds market page `tradingview.com/markets/bonds/` links to it from its FAQ and its own "Global yield curves" section.
- **What** (Help Center, verbatim): "a visual tool that displays changes in bond yields on a single chart"; "Yield Curves gather bond data and display it on two different scale types" — "Tenor scale: Used to represent bonds by their maturities and evaluate their risk exposure … The spacing between maturity points reflects the level of uncertainty — the greater the spacing, the greater the risk" and "Linear scale: Represents data in which unit changes, such as bond's yield and time to maturity, are displayed with equal spacing."
- **Default view**: US Treasuries, three curves — today, one month ago, one year ago.
- **Gating**: pricing row "Yield Curves" = Yes on all five plans (08 §6).

### 3.2 Controls (live overlay, 2026-09-06)

| Where | Control (verbatim) | What it does |
|---|---|---|
| Overlay header | **Move overlay to split-view** · **Collapse panel** · **Close** | §0 |
| Title row | **Yield Curves**; tabs **Chart** · **Map** · **More** | Chart is the default; Map is a choropleth (§3.4); More — its menu did not open for a guest, *could not verify* |
| Chart-tab toolbar | **Settings** · **Download and share** · **Collapse table** · **Maximize table** | |
| Settings menu | **Key tenors** (toggle) · **Scale settings**: **Tenor scale** / **Linear scale** · **Table settings**: **Heatmap mode** | Help Center: "'Key tenors' — activate them to view the most commonly traded bonds with key maturities, which are also used as benchmarks"; heatmap mode "allows you to visually assess bond yields based on their maturity" with "lighter hues" for lower and "darker tones" for higher yields |
| Download and share menu | **Chart snapshot**: **Download image** · **Copy image** · **Copy link** · **Open in new tab** · **Tweet image**; **Table data**: **Download as CSV file** | Help Center: "Click the Download and share button → Select Download as CSV file" — no plan gate stated |
| Table **Compare yields** | header columns **Country** · **On date** · tenors **1M 3M 6M 1Y 2Y 3Y 5Y 7Y 10Y 20Y 30Y** (key tenors on; with Key tenors off the standalone page also lists **2M** and **4M**) | one row per curve |
| Each row | flag + **USA** · date cell **Current: Sep 6, 2026** / **1 month ago: Aug 6, 2026** / **1 year ago: Sep 6, 2025** · one yield per tenor (each a link to the tenor's symbol, e.g. `TVC-US01MY`, `TVC-US10Y`) · row buttons **Clone** · **Delete** | Help Center: "find the 'Clone' button and press it to create a new curve for the same government bond. Change the bond dates if you want to compare it with previous values." |
| Under the table | **Add** | "To compare different countries' bonds, press the '+ Add' button and select the one you want to view and compare." |
| Date cell | a calendar with presets **Current date · Yesterday's date · A week ago · A month ago · A year ago** | FAQ: presets exist so you need not "manually select it each time"; weekends and public holidays are disabled because "markets are closed on those days" and "yield data is not updated" |
| Chart tab | **Take a snapshot** "next to the scale menu" | Help Center |

### 3.3 Symbols it is built from

Every cell links to a `TVC:` constant-maturity yield symbol; the ones seen: `TVC:US01MY` … `TVC:US30Y` (the bonds page also names `TVC:US10Y`, `TVC:US30Y`, `TVC:GB10Y`, `TVC:DE10Y`, `TVC:FR10Y`, `TVC:CN10Y`, `TVC:JP10Y`). The bonds page's "Yield heatmap" runs 1-month … 30-year across US, EU, UK, Germany, France, Italy, Canada, Japan, India.

### 3.4 Map tab (live)

Controls: **Bond tenor** (selector) · a colour legend `1%` `2%` `5%` `10%` `20%` · **Take a snapshot**. It colours countries by the chosen tenor's yield.

### 3.5 Things the page does *not* have

- **A spread between two tenors**: no spread control exists on the page, in its Settings, or in any of the five Help-Center articles (*checked, absent*). The Supercharts route is an expression symbol (05 documents `NVDA+AAPL`-style expressions; `TVC:US10Y-TVC:US02Y` follows the same grammar — *inferred*) or the FRED series page `/symbols/QUANDL-FRED/T10Y2Y/` ("10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity").
- **Historical playback / animation**: none. Comparison is by adding dated rows. Help Center: "Supercharts allow you to study the past, while Yield Curves project bonds' rates into the future" and "Yield Curves is a nationwide bond comparison tool."

### 3.6 The five Help-Center articles (category "Yield Curves", 5 articles)

| Folder | Title (verbatim) | URL |
|---|---|---|
| Yield Curves overview | TradingView Yield Curves: navigate bond rates and charts | `/support/solutions/43000758123-…` |
| FAQ | Why are some dates in the calendar disabled? | `/support/solutions/43000758677-…` |
| FAQ | What is the heatmap mode? | `/support/solutions/43000759140-…` |
| FAQ | How do I download my data from the Yield Curves table? | `/support/solutions/43000760509-…` |
| FAQ | Is it possible to display data for the current date in the table without having to manually select it each time? | `/support/solutions/43000761011-…` |

### 3.7 How a yield symbol charts in Supercharts

Live on `TVC:US10Y`: the chart opens as **candles** on a daily interval; the price scale is the yield level (`4.784` printed with `%` as the unit in the Details header, change `+0.012` and `+0.25%` — so "change %" is the percent change of the yield, not a change in percentage points); the Details header tags it `TVC · Bond` with a real-time **R** badge. 01 §1.5 records the **Columns** chart type as "mostly used for financial data" (GDP, rates, inflation) — it is an option, not the default here. Help Center: "On Supercharts, you can choose one particular bond (e.g., the 10-year US Treasuries) and linearly look at its changes over time."

---

## 4. Fundamental Graphs

| Aspect | Verbatim / detail | Source |
|---|---|---|
| Where | "hover over the 'Products' dropdown menu and select 'Fundamental graphs'"; standalone `tradingview.com/fundamental-graphs/` ("Fundamental Graphs — Financial Ratios Charted"). Absent from the guest's in-chart Products menu; the Help Center lists it as a right-toolbar item ("Fundamental Graphs: Access stock and crypto fundamental metrics") — logged-in toolbar *could not verify* | live; 43000746464 |
| What | "compare multiple publicly traded companies and funds by their financial metrics … a tool for fundamental analysis that helps you assess whether a company is fairly valued"; "For stocks, data is collected from financial statements. For funds, NAV reports, fact sheets, and other published data" | 43000763376 |
| Page controls (standalone, guest) | title **Untitled graph**; **Symbols** list (seeded `AAPL`, `GOOGL`) + **Add**; checkbox **Show price charts**; **Metrics** (count) + **Add**; period buttons **1 year · 3 years · 5 years · 10 years · All time**; **Saved** | live fetch of the page |
| Metric picker | "Add or remove up to nine symbols and nine different metrics at once" | blog 53091 (2025-08-06) |
| View modes | **Show all** ("Displays every metric for every selected symbol") · **Metrics by symbol** ("Focus on all metrics for one active symbol") · **Symbols by metric** ("Compare how each symbol performs for a single selected metric") | blog 53091 |
| Period / scale | date range via the buttons "beneath the chart"; scale "Regular, logarithmic, percentage, or indexed to 100" from the settings button "in the upper right corner" | blog 53091 |
| Compare companies | the symbol list itself (up to nine) | blog 53091 |
| Export / share | "Automatic URL generation for chart configurations" and a snapshot; **Saved** graphs. CSV export: not mentioned — *could not verify* | blog 53091 |
| Gate | pricing row **Fundamental Graphs → Date ranges**: **Up to 5y** (Basic, Essential, Plus) / **All** (Premium, Ultimate) | pricing page |
| Caveat | "Not all symbols and metrics are suited for this analysis — for example, the interest rate is both a symbol on TradingView and a financial metric, but … fundamental metrics from company statements don't apply" | 43000763376 |
| Related gate | "Financials (fundamental stock data)" and "Global economic data" rows: the fetch of the pricing page on 2026-09-06 read Financials as Plus+ and Global economic data as Premium+, whereas 08 §6 read both as Yes on all plans — the two reads disagree; *could not verify* which is current | pricing page |

Financials Help-Center category: 543 articles in 13 folders (Common questions 7, Income Statements 55, Balance Sheet 69, Cash Flow 46, Statistics 124, Earnings/Splits/Dividends 6, Overview 21, Crypto 63, Futures 4, Key data points 11, ETF 39, Bonds 91, IPO data 7). There is no "Fundamental Graphs" folder; the one article is filed under Financials.

---

## 5. Portfolio (index level)

### 5.1 The overlay for a guest (live)

Title **Portfolios**, four creation cards with subtitles, verbatim: **Upload CSV file** "Quickly transfer all transactions from a file" · **Create manually** "Add only the transactions you want by hand" · **Add from watchlist** "Choose from saved watchlists and customize transactions" · **Import from Paper Trading** "Choose an account to add trades from". (The Help Center's "Portfolio page" article names the cards "Create new by hand", "Add from Watchlist", "Import CSV file"; the live labels above are newer.)

### 5.2 What the product shows (Help Center)

| Area | Contents (verbatim labels) |
|---|---|
| Portfolio card | portfolio name, "date of the last structure update", value, **Total gain %**, **Annualized yield**, number of active instruments; a three-dot menu to delete or edit settings |
| Summary bar | **Portfolio value** ("current total value … taking into account free cash and the current value of open positions") · **Cash** · **Unrealized gain** · **Total gain** / **Realized gain** · **Annualized yield** |
| Tab **Overview** | **Portfolio change** (modes **Value** / **Performance**; periods **1 month · 3 months** (default) **· 6 months · Year to date · 1 year · All time**; lines **Portfolio** / **Benchmark**) · **Distribution** (by **Assets · Asset types · Sectors · Currency**; columns **Asset type, Portfolio Value, Allocation, Unrealized Gain, Unrealized Gain %**) · **Daily gainers and losers** · **Upcoming earnings** (**Today & Yesterday**, **Next 14 Days**; columns **Symbol, Date, Time, Estimate EPS, Actual EPS, Surprise, Market cap**) · **Upcoming dividends** (filter by **ex-date** or **pay date**, default ex-date, 14-day horizon; columns **Symbol, Amount, Ex-date, Pay date, Dividend yield**) · **News** |
| Tab **Holdings** | table modes **Position · Price · Financials · Performance · Risk · Technicals**; controls **Display sold**, **Summary** (Minimum / Maximum / Average / Median), **Group By** (Currency / Symbol type / Sector / Exchange). Position columns: **Allocation, Qty, Avg price, Last price, Invested, Value, Unrealized gain, Unrealized gain %, Daily gain, Daily gain %, Total dividend, Total gain, Total gain %, Annualized yield** |
| Tab **Transactions** | "order logs with asset purchases and sales, paid commissions, and cash deposits or withdrawals" |
| Tab **Analysis** | **Portfolio profitability** (monthly bars, portfolio vs benchmark, periods = calendar years + **TTM**, time-weighted return) · **Beta** · **Sharpe ratio** · **Sortino ratio** · **Holdings performance** · **Dividends** · **Profit** |

### 5.3 How holdings get in

| Method | Detail |
|---|---|
| Manually | **Create manually** → settings (**Portfolio name** ≤ 128 chars, **Show description** ≤ 1,200, **Benchmark**, **Risk-free rate**, **Currency** — fixed after creation) → then add transactions. Types: **Buy, Sell** (fields **Side, Symbol, Date, Price, Quantity, Commission, Notes**); **Deposit, Withdrawal, Taxes and fees** (**Date, Amount, Notes**); **Dividend** (**Symbol, Date, Total Dividend, Notes**); **Split** (**Symbol, Date, Split ratio, Notes**) |
| From a watchlist | one Buy per instrument at the price on the chosen **Portfolio start date**, quantity 1, zero commission; unsupported types excluded; "corresponding cash transactions will not be added automatically" |
| CSV | columns **Symbol, Side, Qty, Fill Price, Commission, Closing Time**; "Maximum file size — 25 MB"; **Merge** (default, duplicates skipped) or **Replace full transaction history**; a sample file is offered; a format error names the line and nothing is imported |
| From the Trading Panel | Trading Panel → **Export Data** → **History**; "Only trades with the field Status set to Filled will be added"; import via Transactions → Import or during creation (12 §3) |
| From Paper Trading | **Import from Paper Trading** → **Connect** → **Trading account** drop-down + the same settings; "If the number of transactions or instruments exceeds the limits of the current subscription level, the portfolio will not be created" |
| Supported types | "Stocks, Funds, Forex, Crypto"; "only a limited range of instruments can be added" — no bonds, options, commodities |

### 5.4 Limits and sharing

| Row (pricing page, verbatim) | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Number of portfolios | 1 | 3 | 4 | 5 | 7 |
| Holdings per portfolio | 20 | 50 | 75 | 100 | 150 |
| Transactions per portfolio | 2,000 | 5,000 | 5,000 | 5,000 | 5,000 |

(The overview article still says "Currently, you can create up to three portfolios" — stale against the table.) Sharing: settings → **Share portfolio** toggle → share the page URL; viewers see "Username, Subscription level, Overview charts, Transactions, Holdings, Analysis charts, Portfolio name"; "Editing is not available for other users" (13 §3 adds **Copy link** and "Make a copy" for logged-in visitors). The Portfolio Help-Center category has 49 articles in 9 folders (Portfolio Management 8, Transaction Management 5, Portfolio Summary 4, Overview 5, Holdings 1, Transactions 1, Analysis 7, FAQ 15, Portfolio tips 3).

---

## 6. Options and Macro Maps (recorded for completeness)

### 6.1 Options

| Aspect | Verbatim / detail |
|---|---|
| Where | Products → **Options** (overlay), `tradingview.com/options/` ("Options Chain — Put & Call Options Overview"), symbol page **Options** tab, Symbol Search **Options** tab. With a symbol that has no options (US10Y) the overlay defaulted to **ES1!** |
| Overlay tabs (live) | **Chain · Strategy builder · Strategy finder · Volatility · Volume · More**; symbol picker |
| Chain filters (live) | **Expiration** (**All expirations**) · **±6 strikes** · **Spread** · views **Calls / Puts / Calls and puts / More** · **Change sort** · **Customize columns** |
| Chain default columns (live) | calls side **Delta, BE, IV, Theor, Bid × Ask, Distance, Volume**, centre **Strike**, puts side mirrored; rows grouped by expiration (**September 8 · 2 DTE · E2B**, …) |
| Chain (Help Center) | views **Calls-only / Puts-only / Straddle** (default); Expiration presets and date ranges; Strikes presets ("N strikes above/below", "±5%"); Spread presets **Tight / Medium / Wide**; 24 columns (Volume, Distance, Relative distance, Bid, Ask, Spread, Theoretical price, Last traded price, Bid/Ask %, Annualized %, Intrinsic value, Time value, Bid/Ask IV, IV spread, Break-even, Delta, Gamma, Vega, Theta, Rho); gear: table view, strike sort, columns; a row-details pane with payoff diagrams |
| Strategy builder | **Handbook** (standard strategies by outlook) / **My Strategies**; **+ New position** chain dialog with **B** / **S** buttons; positions table **Strike, Type, Expiration, B/S, Price**; **Adjust** → **Set prices / Scale / Shift**; menu **Rename / Make a copy / Delete**; article set: Expiration, Strategy, Width, Action, Quantity, Chart / Options Board selector, Max Loss / Max Profit, Win Rate, Breakeven, Chart, What-if scenarios, Broker positions, Net cost, Lot size |
| Strategy finder | `/options/strategy-finder/`; required: predicted price range + time horizon; optional **Strategy types**, **Spread width** (in strikes), **Moneyness** (ATM/OTM/ITM), **Symmetric strikes**; ranks by reward-to-risk |
| Volume | `/options/volume/`; views **Heatmap** (default) / **By Expiration** / **By Strike**; filters **Interval** (1 week … All), **Display** (Calls, Puts, Calls and puts, Sum of calls and puts), **Strikes** (±10/±20/±30 strikes, All) |
| Gating | no pricing row; the Help-Center articles state none — *could not verify* any gate |

Options Help-Center category: 33 articles (Options strategy builder 15, Options chain 1, Options common terms 15, Options strategy finder 1, Options volume 1).

### 6.2 Macro Maps

| Aspect | Verbatim / detail |
|---|---|
| Where | Products → **Macro Maps** (overlay; blog: "Head over to the Products menu in the right panel and open Macro Maps"), `tradingview.com/macro-maps/` ("Macro Maps — Global Macroeconomic Trends") |
| Indicator chips (live) | **Inflation Rate · Interest Rate · GDP · Unemployment Rate · Government Debt to GDP · More** |
| Map controls (live) | colour legend `3%` `4%` `6%` `9%` `30%` (hover a range to highlight countries — blog 2.0); a date slider **Nov 1914 … Sep 1970 … Jul 2026** ("Historical data selection for any past date"); **Zoom in · Zoom out · Reset zoom**; region **G20**; **Map extras** (blog 2.0: table view of all countries + latest economic news); **Take a snapshot** |
| Table (live) | columns **Country · Value / Observation**; rows such as `USA USIRYY 3.4% Jul 2026` — each value is a TradingView economic symbol |
| Blog history | launched 2025-09-16 ("see how different countries stack up on key metrics"; search, favorites, one-click add to chart from the tooltip); **Macro Maps 2.0** 2026-03-09 (readable colours, compact tooltip, interactive legend, snapshot page with a back-to-maps button, table view, news) |
| Gating | none stated — *could not verify* |

No Help-Center category exists for Macro Maps (or Fundamental Graphs); both are documented by blog posts only.

---

## 7. The Products button and the Overlay sheet — summary of the model

1. The right toolbar holds **three account-wide panels** (Watchlist+Details, Alerts, Object tree) that dock beside the chart and take width from it, plus a lower group of **product launchers** that open full products as overlays.
2. Every overlay shares one header vocabulary — **Move overlay to split-view · Collapse panel · Close** — and can be pinned into a saved split view at 50 % width.
3. The overlay's contents are the standalone product, unchanged (same tabs, same filters, same download menus).
4. The **Products** button at the bottom is the catch-all for products without their own icon; what it lists depends on account state (guest: 7 products + 2 social).
5. Memory: the website saves the split-view size/position with the chart; the desktop app additionally remembers, per tab, the watchlist's width and height and "the products opened as overlays" (3.2.0).

---

## What this means for OnStock

Read against `docs/research/2026-09-06/onstock-desktop-spec.md` (A2, Adapt #3, Adapt #7, §6.8 `RightColumn` / `AssetNumbers` / `GapPanel`) and the code at `src/screens/AssetDetail.jsx`, `src/services/stocks.js`, `api/finnhub.js`, `api/_geckoterminal.js`, `src/components/TreasuryYields.jsx`, `src/services/rates.js`.

1. **Adopt — TradingView's block grammar for `AssetNumbers`: a fixed identity/quote header, then titled blocks in a fixed order, each with one trailing "More …" button.** The exact list and order for OnStock's right column, mapped to what the data already supports:

   | # | OnStock block (title to print) | TradingView equivalent | Fields OnStock can fill today | Source in the code |
   |---|---|---|---|---|
   | 0 | header: ticker, name, `issuer · chain` tags, token price with its age, share price with its age, session chip, "Last update at …" | identity + quote header | all exist in `GapPanel` / `AssetDetail` | `PricesContext`, `UpdatedAgo` |
   | 1 | **Gap** (gap %, gap bar, both legs) | none — this is the thesis | exists | `GapPanel` |
   | 2 | **Price ranges**: `24H RANGE` (token) · `DAY'S RANGE` (stock) · `52WK RANGE` (stock) | Price ranges | `ts.low24h/high24h`; `stockQuote.dayLow/dayHigh`; `metrics.low52/high52` | GeckoTerminal; Finnhub `quote` `l`/`h`; Finnhub `metric` `52WeekHigh/Low` |
   | 3 | **Key stats** (token column / share column): Volume 24h · Market capitalization · Average Volume (10D) · Previous close · Open · P/E (TTM) · EPS (TTM) · Dividend yield · Beta · Circulating supply · All-time high | Key stats + the Overview page's Key stats | all already rendered in `AssetDetail` §"Statistics" | GeckoTerminal `volume_usd.h24`, market cap; Finnhub `profile2.marketCapitalization`, `metric` `10DayAverageTradingVolume`, `peTTM`, `epsTTM`, dividend yield, `beta`; `quote` `pc`/`o` |
   | 4 | **Analyst rating** (gauge + counts) | Analysts | exists as `AnalystRatings` | Finnhub `recommendation` |
   | 5 | **Earnings** (last quarters actual vs estimate) | Earnings | exists as `EarningsSection` | Finnhub `earnings` |
   | 6 | **Latest news** (symbol-filtered tokenization feed + company news) | Latest news / Key facts | exists (`TokenizationNews`, Finnhub `news`) | `api/news.js`, Finnhub `company-news` |
   | 7 | **Profile**: Issuer · Chain · Underlying · Website · Explorer (contract) · Employees (FY) · description | Profile (crypto's Website/Source code/Explorers pattern + stock's About) | `DetailsSection` + `AboutSection` today; add the contract/explorer link | `universe.js`, Finnhub `profile2.weburl` |

   **Drop** (no source, or not the thesis): Dividends block beyond the yield figure, Income statement, Seasonals, Technicals gauge (a 26-indicator vote OnStock does not compute — printing a gauge from SMA/EMA/RSI alone would be misleading), Highest YTM bonds, ATM IV / Options, Community, Bid & Ask (OnStock's spread line from the two quotes stays in the Gap block, where it belongs), Next earnings report (needs an earnings-calendar endpoint that is not in the Finnhub allowlist — defer, do not fake it).

2. **Adopt — "DAY'S RANGE / 52WK RANGE" as two-sided range bars, labelled per leg.** TradingView's two bars are the most-read block after the price; OnStock has the four numbers already (`CompareRow "Range (1d)"`) and the honest twist is one bar per leg with different ages.

3. **Adopt — the hide-blocks gear, synced to the account.** Copy TradingView's model exactly: a checklist of block titles (the seven above), all on by default, stored per user. Persist as a JSON column on the Supabase profile row (e.g. `details_blocks: {ranges:true, keyStats:true, …}`) with `localStorage` as the guest fallback and the sign-in prompt on first toggle — the same gate TradingView shows a guest on **Add note**. Cheap, and it is the only personalisation TradingView offers on this panel.

4. **Adapt — "Last update at …" plus a delayed/real-time badge in the header.** TradingView prints `D`/`R` and a timestamp; OnStock's two legs each need their own (`token · 12 s ago`, `stock · delayed 15 min, 16:59`). This is Adapt #9's "delayed" badge, placed where TradingView places it.

5. **Adapt — per-symbol notes (Phase 2).** One table `notes(user_id, asset_id, body, created_at)`; **Add note** in the block header; Alt+N; a dot on the watchlist row for symbols with a note; all notes listed on the account sheet. Skip "NON-SYMBOL RELATED NOTES" (an artefact of TradingView's migration) and skip rich text. Gate on sign-in exactly as TradingView does.

6. **Adapt — `TreasuryYields` takes one idea from Yield Curves: dated comparison rows.** TradingView's default is three rows — **Current**, **1 month ago**, **1 year ago** — across the key tenors. FRED's CSV already returns the full history for free, so `TreasuryYields` can show the same three rows for 2Y/10Y/30Y (and add `DGS3MO` and `DGS5` to `MATURITIES`, since 3M and 5Y are TradingView's key tenors) with no new upstream. Keep OnStock's `twosTensSpreadBp` line: TradingView's page has **no** tenor-spread control at all, so this is a place where OnStock is already ahead; do not remove it to "match".

7. **Skip — the rest of Yield Curves** (Map tab, heatmap mode, Clone, country **Add**, CSV download, snapshot). Tokenized bond products are priced off the US curve only; a world map is context for nobody in the OnStock universe.

8. **Skip — Fundamental Graphs.** It needs multi-year statement history (income statement, cash flow, ratios) for up to nine companies; the Finnhub allowlist has profile/quote/metric/earnings only, and the panel is orthogonal to the gap thesis. If a later phase wants one chart, it is "Revenue / Net income" for the underlying, and even that is a symbol-page feature, not a right-column one.

9. **Defer — Portfolio, with a different model than TradingView's.** TradingView's portfolio is a *transaction ledger* (Buy/Sell/Deposit/Dividend/Split, CSV import, benchmark, Sharpe/Sortino) — 49 Help-Center articles of complexity. OnStock's roadmap Portfolio item should instead read holdings from the connected Solana wallet (no manual transactions, no CSV), show each holding with its live gap, and stop there: no P&L accounting, no benchmark, no risk ratios. TradingView's **Holdings** column set (Allocation, Qty, Last price, Value, Daily gain %) is the right vocabulary when it comes; its "Upcoming Earnings" block is not.

10. **Skip — Options.** Tokenized stocks have no listed options; the ATM-IV block, chain, builder, finder and volume have no counterpart. Recorded above so nobody re-opens the question.

11. **Skip — Macro Maps.** The Treasury curve already fills OnStock's macro slot, and TradingView itself treats Macro Maps as a standalone product reached through the Products button rather than a symbol block. The one transferable detail is the **indicator-chip row + date slider** pattern if OnStock ever adds CPI/FOMC context — not now.

12. **Adapt — the Products/Overlay model becomes the desktop rail's takeover rule, already in the spec.** OnStock's spec replaces the centre with Gaps/Folders/News/Trade; TradingView instead overlays the product on the chart and offers **Move overlay to split-view**. Phase 1 keeps the takeover; Phase 3 can add split view for **News beside the chart** (the one product a gap trader reads while watching a chart). Persist "what was open and how wide" in the existing `bw.desktop.*` localStorage keys — that is the web equivalent of the desktop app's per-tab overlay memory.

13. **Adopt — guest gating the TradingView way.** Everything in the Details panel is visible to a guest except the two account features (notes, and the index's exclusive news); the gate is a sign-in dialog on the action, not a blurred panel. `AccessGate` should gate notes and the synced block preferences the same way and leave every number visible.

14. **Skip — a "Metrics" full-screen button.** Its content could not be verified for a guest, and OnStock's symbol page (the Statistics tab in the spec's §6.9) already is the full-screen view; the right column needs only the trailing "More …" buttons that jump to the matching tab.

---

## Sources

Live (guest, headless browser, 2026-09-06):

- https://www.tradingview.com/chart/?symbol=NASDAQ%3AAAPL
- https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD
- https://www.tradingview.com/chart/?symbol=SP%3ASPX
- https://www.tradingview.com/chart/?symbol=FX%3AEURUSD
- https://www.tradingview.com/chart/?symbol=TVC%3AUS10Y (and, from inside it, the Products menu and the Yield Curves, Options, Macro Maps and Portfolio overlays)

Help Center — watchlist, Details, notes:

- https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/
- https://www.tradingview.com/support/solutions/43000662506-how-to-customize-the-details-section/
- https://www.tradingview.com/support/solutions/43000667881-how-to-add-a-text-note-to-a-symbol/
- https://www.tradingview.com/support/solutions/43000667897-how-to-check-all-text-notes/
- https://www.tradingview.com/support/solutions/43000482906-i-cannot-see-my-watchlist-only-the-instrument-s-details-are-displayed/
- https://www.tradingview.com/support/solutions/43000771546-watchlist-advanced-view-mode/
- https://www.tradingview.com/support/solutions/43000690226-how-to-use-minds-and-what-they-are-made-for/
- https://www.tradingview.com/support/solutions/43000696301-using-minds/
- https://www.tradingview.com/support/categories/watchlist/
- https://www.tradingview.com/support/knowledge-base/
- https://www.tradingview.com/blog/en/symbol-details-updates-29971/

Help Center — Supercharts frame, overlay sheet, desktop:

- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/
- https://www.tradingview.com/support/solutions/43000753069-simple-steps-to-split-view-mode/
- https://www.tradingview.com/support/solutions/43000673888-tradingview-desktop-releases-and-release-notes/

Help Center — Yield Curves:

- https://www.tradingview.com/support/categories/curves/
- https://www.tradingview.com/support/folders/43000598353-yield-curves-overview/
- https://www.tradingview.com/support/folders/43000598470-faq/
- https://www.tradingview.com/support/solutions/43000758123-tradingview-yield-curves-navigate-bond-rates-and-charts/
- https://www.tradingview.com/support/solutions/43000758677-why-are-some-dates-in-the-calendar-disabled/
- https://www.tradingview.com/support/solutions/43000759140-what-is-the-heatmap-mode/
- https://www.tradingview.com/support/solutions/43000760509-how-do-i-download-my-data-from-the-yield-curves-table/
- https://www.tradingview.com/support/solutions/43000761011-is-it-possible-to-display-data-for-the-current-date-in-the-table-without-having-to-manually-select-it-each-time/
- https://www.tradingview.com/yield-curves/
- https://www.tradingview.com/markets/bonds/

Help Center — Portfolio:

- https://www.tradingview.com/support/categories/portfolio/ (and its nine folders: 43000598040, 43000598046, 43000598041, 43000598042, 43000598043, 43000598044, 43000598045, 43000598039, 43000599243)
- https://www.tradingview.com/support/solutions/43000760937-tradingview-portfolios-track-your-assets-know-your-trades/
- https://www.tradingview.com/support/solutions/43000756011-portfolio-page/
- https://www.tradingview.com/support/solutions/43000756012-portfolio-settings/
- https://www.tradingview.com/support/solutions/43000756008-how-to-create-a-portfolio-manually/
- https://www.tradingview.com/support/solutions/43000756009-how-to-create-a-portfolio-from-a-watchlist/
- https://www.tradingview.com/support/solutions/43000756014-how-to-add-transactions-via-file-import/
- https://www.tradingview.com/support/solutions/43000756013-types-of-transactions-and-how-to-add-them/
- https://www.tradingview.com/support/solutions/43000784041-how-to-create-a-portfolio-via-import-from-paper-trading/
- https://www.tradingview.com/support/solutions/43000756243-how-to-create-a-portfolio-from-trading-history-in-the-tradingview-trading-panel/
- https://www.tradingview.com/support/solutions/43000787587-how-to-share-your-portfolio/
- https://www.tradingview.com/support/solutions/43000756018-overview-portfolio-change/
- https://www.tradingview.com/support/solutions/43000756102-overview-portfolio-distribution/
- https://www.tradingview.com/support/solutions/43000756104-overview-upcoming-earnings-and-dividends/
- https://www.tradingview.com/support/solutions/43000756132-holdings-page/
- https://www.tradingview.com/support/solutions/43000756016-portfolio-summary-portfolio-value-and-cash/
- https://www.tradingview.com/support/solutions/43000756106-analysis-portfolio-profitability/
- https://www.tradingview.com/support/solutions/43000756140-why-can-t-all-asset-types-be-added/
- https://www.tradingview.com/portfolios/

Help Center — Options:

- https://www.tradingview.com/support/categories/options/ (folders 43000591071, 43000598760, 43000598763, 43000599847, 43000602009)
- https://www.tradingview.com/support/solutions/43000760837-options-chain-overview/
- https://www.tradingview.com/support/solutions/43000707214-options-strategy-builder-design-your-trades-with-precision/
- https://www.tradingview.com/support/solutions/43000774565-options-strategy-finder-simplify-strategy-discovery/
- https://www.tradingview.com/support/solutions/43000789608-options-volume-visualize-trading-activity/
- https://www.tradingview.com/options/
- https://www.tradingview.com/options/strategy-finder/
- https://www.tradingview.com/options/volume/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/options/

Help Center / blog — Fundamental Graphs, Financials, Macro Maps:

- https://www.tradingview.com/support/solutions/43000763376-fundamental-graphs-learn-to-chart-financial-metrics/
- https://www.tradingview.com/blog/en/smarter-insights-with-fundamental-graphs-53091
- https://www.tradingview.com/fundamental-graphs/
- https://www.tradingview.com/support/categories/financials/
- https://www.tradingview.com/support/folders/43000590567-key-data-points/
- https://www.tradingview.com/support/folders/43000590139-overview/
- https://www.tradingview.com/support/folders/43000590536-crypto/
- https://www.tradingview.com/support/folders/43000562459-common-questions-about-financial-data/
- https://www.tradingview.com/support/solutions/43000543506-how-to-access-financial-data-on-tradingview/
- https://www.tradingview.com/support/solutions/43000761837-earnings-report-date/
- https://www.tradingview.com/support/solutions/43000703651-previous-close/
- https://www.tradingview.com/support/solutions/43000703653-day-s-range/
- https://www.tradingview.com/support/solutions/43000703824-coupon/
- https://www.tradingview.com/blog/en/fundamental-analysis-is-now-available-on-tradingview-15448/
- https://www.tradingview.com/blog/en/macro-maps-on-tradingview-53883
- https://www.tradingview.com/blog/en/updated-macro-maps-56960/
- https://www.tradingview.com/blog/en/map-view-on-economic-indicator-pages-58839/
- https://www.tradingview.com/macro-maps/

Symbol pages (block titles for §1.9):

- https://www.tradingview.com/symbols/NASDAQ-AAPL/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/financials-overview/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/seasonals/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/technicals/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/forecast/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/bonds/
- https://www.tradingview.com/symbols/NASDAQ-AAPL/minds/
- https://www.tradingview.com/symbols/BTCUSD/
- https://www.tradingview.com/symbols/SPX/
- https://www.tradingview.com/symbols/EURUSD/
- https://www.tradingview.com/symbols/TVC-US10Y/

Pricing and widget docs:

- https://www.tradingview.com/pricing/
- https://www.tradingview.com/widget-docs/widgets/symbol-details/
- https://www.tradingview.com/widget-docs/widgets/symbol-details/symbol-info/
- https://www.tradingview.com/widget-docs/widgets/symbol-details/fundamental-data/

Repo files read (branch as checked out at `C:/Users/m/Coding/blockwatch`):

- `docs/research/2026-09-06/onstock-desktop-spec.md`; teardown files 00, 01, 05, 06, 08, 10, 12, 13 in this folder
- `src/screens/AssetDetail.jsx`, `src/components/TreasuryYields.jsx`, `src/services/rates.js`, `src/services/stocks.js`, `src/hooks/useStockInfo.js`, `api/finnhub.js`, `api/history.js`, `api/_geckoterminal.js`
