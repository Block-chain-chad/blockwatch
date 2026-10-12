# TradingView teardown — surface 05: Watchlist and Symbol Search

Date: 2026-09-06. Part of the 13-surface TradingView teardown that is the reference material for OnStock's desktop ("on a PC it should be like TradingView").

Scope of this file: the **Watchlist** panel (columns, sorting, resizing, sections, flags and colored flags, multiple lists, import/export, symbol caps per plan, the Details section under the list, display modes, Advanced view), the **Symbol Search** dialog (search by ticker/name, asset-type tabs, exchange/source filters, the flag and plus buttons, recent items), the **symbol info page** (Overview / Financials / Technicals / News / Ideas / Minds and the other tabs), how a **symbol change** propagates across a multi-chart layout, and the **mini quick-chart on hover**. Charts, alerts, screeners, layouts and the other surfaces belong to their own files and are only mentioned where the watchlist touches them.

How to read the tables: "Label" is the option text exactly as TradingView writes it (quoted from the Help Center, TradingView blog or the live symbol page); "Where" is the menu path or panel; "Plan" is the tier that unlocks it if gated. Where a claim could not be confirmed from a source I actually read, it says **could not verify** rather than guessing. Source numbers in square brackets point at the Sources list at the end.

Plan names used below are the ones on today's pricing page: **Basic** (free), **Essential**, **Plus**, **Premium**, **Ultimate** [16]. Older TradingView blog posts use the retired names Pro / Pro+ / Premium; the watchlist-alerts blog also mentions an "Expert" tier [31]. Where a source uses old names I say so.

---

## 1. The Watchlist panel

### 1.1 Where it lives and how it opens

| Item | Label (verbatim) | Where | What it does | Plan | Source |
|---|---|---|---|---|---|
| Open the panel | "Watchlist" icon | Right-hand toolbar (the "right rail") on Supercharts; the same widget also exists on non-chart pages such as the symbol page and screener | Opens the watchlist side panel. The watchlist is account-wide: "watchlists can be treated as separate widgets that are account-wide, not belonging to a particular chart or layout." | all | [1], [20] |
| Panel is split in two | (no label) "Watchlist" section above, "Details" section below, with a draggable divider | Inside the panel | The lower part is the symbol's Details section. If you only see Details, "The Watchlist section is most likely minimized. Just drag it down to see the hidden sections." | all | [10] |
| Add a symbol | "+" button | Top of the panel, next to the list name | Opens the Symbol Search dialog. "New symbols will appear at the bottom of your watchlist." Drag-and-drop to reorder. | all | [1] |
| Add the chart's current symbol | "Alt+W" / "⌥ W" | Keyboard, while a chart is open | "To add a currently viewing ticker to the opened watchlist, you can use Alt+W or ⌥ W shortcut." | all | [21], [24] |
| Panel width | drag the panel edge | Right rail | Not documented in the Help Center as a discrete option — **could not verify** the exact min/max. | — | — |

### 1.2 The list-name dropdown (the "watchlist settings menu")

Clicking the **list name** at the top of the panel opens a dropdown. Labels below are as the "Mastering the TradingView watchlists" article and its sibling articles write them [1], [4], [12], [13], [31].

| Label (verbatim) | What it does | Plan | Source |
|---|---|---|---|
| "Create a new one" / "Create new list…" | Makes a new, empty watchlist. (The Help Center's overview says "Create a new one"; the exact dialog string was not visible to me — treat the wording as approximate.) | Basic and Essential are limited to **1 watchlist**; Plus and above get **1,000** | [1], [16] |
| "Open list…" (hotkey **Shift+W**) | Opens a dialog listing all your lists plus the predefined hotlists; hover a list title in this dialog to reveal the remove button (this is how you delete a list). | all | [12], [13] |
| "Rename" | Renames the current list. | all | [1] |
| "Make a copy" | Duplicates the current list. | all | [1] |
| "Add a section" / "Add section" | Inserts a named divider at the bottom of the list (see 1.5). | all | [1], [5] |
| "Clear the list" | Removes every symbol from the current list. | all | [1] |
| "Import" / "Upload list…" | Imports a `.txt` file of symbols (see 1.8). The dedicated article calls the item "Upload list…" and reaches it by right-clicking the list name; the overview article calls it "Import". | Essential+ ("Import/export" is a paid-plan row on the pricing page) | [4], [1], [16] |
| "Add a watchlist alert" / "Add alert on the list…" | Creates one alert that watches every symbol in the list (alerts are surface 07; listed here only because the entry point is in this menu). | Premium+ for active watchlist alerts (2 on Premium, 10 on "Expert", 15 on Ultimate per the blog; the pricing page extract I read disagreed — verify on the live pricing table) | [1], [30], [31], [16] |
| "Favorites" (starred lists) | Star a list so it sits at the top of the dropdown. | all | [1] |
| Hotlists ("Volume gainers", "Percent change gainers/losers", "Percent range gainers/losers", "Gap gainers/losers", "Percent gap gainers/losers") | Predefined, auto-updating lists of market movers, filterable by country/exchange; reached through "Open list…" / Shift+W. | not stated | [11] |
| Colored flag lists ("Red list", etc.) | The dynamic lists fed by flagging (see 1.6). | Basic: red only | [13], [14], [16] |

Deleting a list: "Open list…" (or Shift+W) → hover the list title → click the remove button. Restrictions: a flagged (colored) list "is automatically deleted once all its content is cleared" and "The Red list is a default item and can not be deleted." [12], [13]

### 1.3 The three-dot menu (columns, symbol elements, view mode)

The **three-dot button** ("three-dotted button") sits "in the corner to the right of the list name" [2].

| Label / control | What it does | Plan | Source |
|---|---|---|---|
| Column toggles (enable/disable each column) | "enable/disable the required columns in the menu that appears." | "Custom columns and sorting" is a paid row: Essential and above | [2], [16] |
| Symbol elements: "logo", "ticker", "description" | "Toggle symbol elements (logo, ticker, description)". Symbols "may be displayed as a ticker or as a description; logos can be added." | all | [1], [2] |
| "Table view" (toggle) | On = classic multi-column table ("Table view mode"); off = the minimalistic mode that shows "price and change stats together right next to a symbol" with no column settings, mimicking the mobile app. "The table view for watchlists is no longer available in browsers on mobile devices." | all | [15] |

### 1.4 Columns, sorting and resizing

**Which columns exist.** The Help Center is explicit that the set is fixed: "At the moment it is not possible to add any columns other than the ones that are already available." The available ones are listed as **"Last"**, **"Change"**, **"Change %"**, **"Volume"** and **"Extended Hours Last values"**; the overview article phrases the same set as last price, price change, percent price change, volume and "price change during extended hours". For anything else TradingView points you at the Screener, which "allows users to add multiple columns to its set-up." [6], [1]

| Column (verbatim) | Meaning / calculation | Source |
|---|---|---|
| "Last" | Last traded price. | [6] |
| "Change" | "the change … from the previous daily bar. The data in the watchlist is set to 1D interval by default, therefore the change and change % values are also calculated on 1D interval." Caveat for crypto: exchanges reset the daily bar in different time zones (UTC, UTC+8, …), so check the symbol's exchange timetable. | [9] |
| "Change %" | Same reference as Change, in percent. | [9] |
| "Volume" | Session volume. | [6] |
| "Extended Hours Last" (and the extended-hours change values) | Pre/post-market last price and change for symbols that have an extended session. | [6], [1] |

**Sorting.** "To sort your symbols by any of these data points, simply click the metric's name at the top of the column." Clicking a column header cycles **ascending → descending → original (custom) order** on the third click. Sorting "takes place within sections". If you sort by accident, a **circular-arrow ("round arrow") button** restores the previous order, but note "many actions on lists (adding, removing, or moving symbols) update the sort state and cause the new order to be saved" — only the most recent order is recoverable. [1], [18], [5], [8]

**Resizing.** Column widths are draggable: "move the mouse cursor over the name of the required column, find the right border, hold down the left mouse button, and drag the border to the desired column width." Widths are stored in the browser's local storage (i.e. per browser, not per account). [7]

**Custom columns.** Not possible (see above). [6]

### 1.5 Sections (dividers)

| Item | Label / gesture | Source |
|---|---|---|
| Create | Right-click the symbol **above which** you want the divider → "Add section". Or list-name dropdown → "Add a section" (goes to the bottom). | [5], [1] |
| Name / rename | Sections "can be named", renamed, moved and deleted. | [5], [17] |
| Move | Drag the section; "Sections can be renamed, moved, or removed." | [1], [17] |
| Sort behaviour | "Sorting takes place within sections" — a column sort reorders symbols inside each section, it does not mix sections. | [17] |
| Collapse / expand | **could not verify** from the Help Center. | — |
| Export encoding | Exported `.txt` files contain "the names of watchlist sections and tickers"; in the embeddable library the convention is a `###` prefix ("###TOP SECTION") which is the same on-disk convention — I could not verify that the web export uses exactly `###`. | [3], [22] |

### 1.6 Flags and colored flags

| Item | Label / gesture | Detail | Plan | Source |
|---|---|---|---|---|
| Flag a symbol | Click the **flag icon** to the left of a symbol in the watchlist, in the Screener, on the chart (symbol header), in hotlists and on Markets/symbol pages; or **Alt+Enter** ("Alt (Opt) + Enter marks symbols with the enabled color"); or context menu → "Flag SYMBOL". | Flagged symbols "are automatically added to a separate list in the Watchlist – Flagged list." | all (red) | [14], [19], [25] |
| Bulk flag | Select several rows with Shift/Ctrl → "Flag All Selected". | | all | [14] |
| Colors | Pricing page row **"Flagged symbols colors"**: Basic 1, Essential 1, Plus 7, Premium 7, Ultimate 7. The 2018 blog introduced 5 colors (red plus "4 new colors") and a third-party walkthrough names them red, orange, green, purple, blue; the two colors added since are **could not verify** by name. | Each color "corresponds to a dynamic list". | Basic/Essential: red only; Plus+: 7 | [16], [19], [26] |
| Change a color | "Changing the flag color on a symbol or an entire list can be easily accessed through the context menu." "The last used color is enabled by default." | | Plus+ | [19] |
| One list per symbol | "A symbol can be part of only one list, hence you can't have two identical symbols in two lists" (applies to the colored lists). | | | [19] |
| Rename a colored list | "You can also give a unique name to your list" (paid plans; blog says Pro/Pro+/Premium). | | Plus+ | [19] |
| Red list is permanent | "The Red list is a default item and can not be deleted." Other colored lists vanish automatically when emptied. | | | [13], [12] |
| Flags in the Screener | Screener header → "Watchlist filter" lists "all of your colored and custom watchlists"; the flag icon in the Screener also filters by color; screener rows you flag land in the Flagged list. | | | [25], [19], [32] |

### 1.7 Multiple lists, limits per plan

Pricing page rows (labels verbatim) [16], cross-checked with the Help Center [23]:

| Pricing-page row | Basic (free) | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| "Number of watchlists" | 1 | 1 | 1,000 | 1,000 | 1,000 |
| "Symbols per watchlist" | 30 | 30 | 1,000 | 1,000 | 1,000 |
| "Flagged symbols colors" | 1 | 1 | 7 | 7 | 7 |
| "Import/export" | — | ✓ | ✓ | ✓ | ✓ |
| "Custom columns and sorting" | — | ✓ | ✓ | ✓ | ✓ |
| "Active watchlist alerts" | — | (see note in 1.2) | | | |

The Help Center's own limit article simply says "Watchlist can contain no more than 1000 symbols." [23]. Prices shown on the page I read (annual billing): Essential $12.95/mo, Plus $29.95/mo, Premium $59.95/mo, Ultimate $199.95/mo [16].

Moving symbols between lists: the 2020 update made it "easier to move symbols between different lists, meaning you can quickly start a new list or group different assets all at once" (drag or context menu). [17], [18]

### 1.8 Import / export

| Direction | Label (verbatim) | Where | Format | Source |
|---|---|---|---|---|
| Export | "Download list as TXT" | Advanced view → the quotes table → the download button ("Click this button to export a .txt file containing the names of watchlist sections and tickers") | `.txt` | [3], [4] |
| Import | "Upload list…" | Right-click / click the list name in the right toolbar | `.txt`; "symbols should have the exchange prefix and comma separated" (e.g. `NASDAQ:AAPL,NYSE:IBM`) | [4] |
| Plan | "Import/export" row: Essential and above | | | [16] |

**CSV is not a supported watchlist format** — the Help Center says `.txt` only. (TradingView's CSV export is for chart data, a different surface.) [4]

### 1.9 Sharing a list

"open the list's advanced view mode and then click to share it on your social networks." Recipients get a link that shows the list in the Advanced-view format "as long as you don't turn off sharing mode", and "can copy the list to themselves, so that they can work on it on their own." No plan gating stated. [27]

### 1.10 Advanced view (the "pie chart" button)

Open: "open your watchlist and click the pie chart icon in the upper right corner." It "transforms watchlists into screening tools". [3]

| Tab / control (verbatim) | Contents | Source |
|---|---|---|
| "Overview" tab, table mode "Price" | Last, Chg%, Chg, Volume, Avg Vol (10), Market Cap | [3] |
| "Overview" → "Financials" | Revenue, EPS, P/E Ratio, Beta, Dividend, Yield | [3] |
| "Overview" → "Performance" | % change over 1 week, 1 month, 3 months, YTD, 1 year, 5 years, all-time | [3] |
| "Overview" → "Risk" | Beta (1Y/3Y/5Y), Volatility (1D/1W/1M) | [3] |
| "Overview" → "Technicals" | Tech rating, MA Rating, Os Rating, RSI (14), Mom (10), AO, CCI (20) | [3] |
| "Earnings" tab | Date, Time, Estimate EPS, Actual EPS, Surprise %, Market cap (from the Earnings Calendar) | [3], [1] |
| "Dividends" tab | Amount, Ex-dividend date, Payment date, Dividend yield | [3] |
| "News" tab | "aggregates the latest news for all symbols in your watchlist" | [3], [1] |
| "Currency in USD" toggle | Converts non-USD symbols to USD; upper-right | [1], [3] |
| "Summary values" row | Minimum, maximum, average, median for the visible column | [1], [3] |
| "Grouping" / "Group by" | No group, Custom section, Currency, Symbol type, Sector, Exchange | [1], [3] |
| Pie charts | Distribution of the list by symbol type and by sector | [3] |
| Share, Download list as TXT | See 1.8 and 1.9 | [3], [27] |

Plan: the article states no tier; **could not verify** gating.

### 1.11 The Details section (a.k.a. the Details widget)

Single-click a symbol in the list and "the Symbol details section" opens "right below the list. The contents of this section dynamically change depending on the instrument type." [1]

| Element | Label (verbatim) | Detail | Source |
|---|---|---|---|
| Stock contents | (blocks) quick market summary, "Flash news", key fundamental and technical stats, related bonds, ETFs holding the stock, options data, "Seasonals", company profile | The overview article's enumeration for stocks. Other asset classes show different blocks (crypto/forex/futures lists are not enumerated in the Help Center — **could not verify**). | [1] |
| Embedded-library baseline | bid/ask prices, trading hours, day price range | What the `details` widget shows in the licensed Trading Platform build; the web site's version is the richer one above. | [28] |
| Expand | expand button → full-screen symbol details | "Click expand button to open full-screen". | [1] |
| Customize | "Settings" button (gear) | "click on the settings button and select the information that you want to see in this place on all your devices." Preferences sync across devices. | [29], [33] |
| Notes | "Add note" button; "All notes" button (upper right); "NON-SYMBOL RELATED NOTES" group | Text notes per symbol; also via **Alt/Option + N**, the chart "More" menu, right-click on the chart, or the quote-list/screener context menu. Symbols with notes show an icon in the watchlist; "All notes" lists them and lets you read a note "without changing the symbol on the chart". | [34], [35], [33] |
| Minds in Details | "purple box" with the Minds feed | Reached from "Symbol details: Open the right rail and locate Minds in the purple box". | [36] |
| Latest news by symbol | (block) | Added March 2022 together with notes and the Settings button. | [33] |

### 1.12 Watchlist keyboard shortcuts

From the Advanced Charts shortcut page (which mirrors the web platform) and the Help Center [24], [11], [12], [21], [14], [34]:

| Shortcut | Action (verbatim where available) |
|---|---|
| "↓ or Space" | "Switch to next symbol" |
| "↑ or Shift + Space" | "Switch to previous symbol" |
| "Shift + ↓" / "Shift + ↑" | "Select next symbol" / "Select previous symbol" |
| "Ctrl + A" | "Select all symbols" |
| "Alt + W" | "Add symbol to watchlist" |
| Alt + Enter | Flag / unflag with the enabled color |
| Shift + W | "Open list…" dialog (lists + hotlists) |
| Alt/Option + N | Create a text note |
| macOS | "⌘/⌥/⇧ instead of Ctrl/Alt/Shift" |

### 1.13 Behaviours worth knowing

- **Watchlist ↔ layout independence.** "Layouts and charts are in no way connected to watchlists." Clicking through a watchlist re-uses the current layout/chart; drawings are per symbol, so "If you change symbols within the same layout, drawings will disappear" unless "Sync drawings in layout" / "Sync drawings globally" is on. [20], [37]
- **Screener → watchlist.** Select rows with Shift/Ctrl → right-click → "Add Selected Symbols To Watchlist" (lands in a new list); or just flag them. [32]
- **Watchlist → screener.** Screener header "Watchlist filter"; you can "save a screen with the Watchlist filter already applied"; creating/deleting a list updates that menu automatically. [25]
- **Sort state is saved.** See 1.4 — the list's order is persisted server-side after any add/remove/move. [8]

---

## 2. The Symbol Search dialog

### 2.1 Opening it

| Method | Detail | Source |
|---|---|---|
| Hotkey | "Ctrl+K" (Windows) / "Cmd+K" (macOS) | [38] |
| Click | "the search box next to the main menu", or on Supercharts "the 'Symbol Search' button in the left toolbar" (the symbol name at the top-left of the chart) | [38] |
| Just type | "You can also open it by simply starting to type in Supercharts" ("Change symbol: Start typing a symbol name") | [38], [24] |
| From the watchlist | the "+" button | [1] |

Note: Ctrl/Cmd+K on Supercharts opens the **Quick Search** dialog, which searches symbols *and* drawings, chart features, chart settings and "Metrics and data"; it keeps a **"Recent search"** list "so next time you need the same feature, you won't have to type it out again". [39], [40]

### 2.2 Search input behaviour

| Behaviour | Detail | Source |
|---|---|---|
| By ticker | "Enter exact symbol characters (e.g., 'OIL'). Note that different symbols may share identical characters, so verify via description." | [38] |
| By name / related term | Type a keyword; e.g. "pound" "returns all British Pound–related symbols like GBPUSD." | [38] |
| Exchange prefix | `EXCHANGE:SYMBOL` (e.g. `NASDAQ:AAPL`, `NSE:RELIANCE`) jumps straight to that listing. For EOD symbols that never appear in suggestions, "enter the complete symbol designation using the format prefix:symbol_name and press Enter." | [41], [42] |
| Spreads / equations | Type an expression such as `NVDA+AAPL` "to view the compound price"; "Save equations to watchlists to retain them." | [38] |
| Uppercasing | Typed letters are shown in upper case (library default `uppercase_instrument_names`). | [43] |
| Result row | "symbol (left), description (middle), data source (right)" — e.g. "GBPUSD | British Pound/US Dollar | FXCM"; exchange and symbol logos are shown when available. | [38], [43] |
| Options tab | "displays underlyings rather than specific contracts. Clicking an underlying reveals the option chain" (Supercharts only). | [38] |
| Can't find it | "make sure that you don't have the exchange or symbol type filter enabled (check the top bar of the symbol search window)." | [42] |

### 2.3 Asset-type tabs and per-tab filters

Help Center list of tabs: "stocks, funds, futures, forex pairs, cryptocurrencies, bonds, economic data, and options"; a third-party walkthrough shows the on-screen tab labels as **All, Stocks, Funds, Futures, Forex, Crypto, Indices, Bonds, Economy, Options** (third-party — verify the exact casing on the live dialog). [38], [41]

"Each tab also has its own filter where you can set the country, type, category, source, sector, or exchange according to your needs." [38]

| Filter (verbatim) | Example values (from the sources) | Tabs | Source |
|---|---|---|---|
| "Country" ("All Countries") | USA → NASDAQ, NYSE, CBOE, OTC; India → NSE, BSE; UK → LSE; Germany → XETRA, FWB | Stocks, Funds, … | [38], [41] |
| "Type" | Common Stock, Preferred Stock, Depositary Receipts / "Depository Receipt (ADR/GDR)", Warrant | Stocks | [41], [44] |
| "Category" | not enumerated — **could not verify** | | [38] |
| "Source" | the data source / exchange or broker feed shown at the right of each row (e.g. FXCM) | Forex, Crypto | [38] |
| "Sector" | Finance, Technology Services, Health Technology, Consumer Durables, Electronic Technology "and 20+" more | Stocks | [41] |
| "Exchange" | one exchange, e.g. NASDAQ | most tabs | [38], [42] |
| Crypto symbol types (from the crypto screener, same vocabulary) | "Spot", "Futures", "Perpetual Futures" | Crypto | [44] |
| "Primary Listing" | Screener filter (with a crown icon) that hides secondary listings; documented for the Screener, **could not verify** it is exposed inside the search dialog. | — | [45] |

Filters combine: "search only Technology sector stocks from India, of Common Stock type." [41]

### 2.4 Row actions: flag, plus, launch, overview

| Control | Detail | Source |
|---|---|---|
| Plus icon | In the watchlist-opened search, "click the plus icon next to it" to add; the symbol goes to the bottom of the list. | [1] |
| Flag icon | Present on search rows; a third-party post describes clicking "the 🚩 icon next to any symbol in the search panel", choosing one of 7 colors, and the symbol appearing under that color in the Watchlist. The Help Center confirms flags exist on "standalone pages" and Markets pages but does not describe the search dialog explicitly — treat the in-dialog flag as **verified by third party only**. | [14], [46] |
| Hover actions | "Hover over results to access: 'Launch chart' … 'See overview'" (the latter opens the symbol page). | [38] |
| "More symbols…" | In screener/alert contexts a "More symbols…" button "opens the search symbol dialog where you can select one or a few symbols." | [47] |
| Recent | The **Quick Search** dialog keeps a "Recent search" list; a dedicated "recent symbols" section inside the plain Symbol Search dialog is **could not verify**. | [39] |

---

## 3. The symbol info page

URL pattern `tradingview.com/symbols/EXCHANGE-TICKER/` (e.g. `/symbols/NASDAQ-AAPL/`). Reached from search ("See overview"), from the watchlist Details expand button, or from any ticker link. [38], [1]

### 3.1 Tabs (as rendered on NASDAQ:AAPL, 2026-09-06)

| Tab (verbatim) | What it holds | Source |
|---|---|---|
| "Overview" | Blocks in order: "Key stats today", "Key stats", "Upcoming earnings", "Employees", "Company info", "Financials", "Community forum", "News", "Ideas", "Technicals", "Analyst rating", "Seasonals", "Highest yielding bonds", "ETFs holding the stock", "Frequently asked questions". The ETF block shows up to 11 funds with a link to the full ETFs tab. | [48], [51] |
| "Financials" | Left nav: "Overview", "Statements", "Statistics", "Dividends", "Earnings", "Segments", "More"; period toggle "Annual" / "Quarterly"; Overview sub-blocks "Valuation", "Growth and Profitability", "Dividends", "Financial health". Line items sit "in columns and rows, with drop-down arrows to go deeper into subsections". | [49], [52] |
| "Documents" | Earnings documents (quarterly/annual reports, earnings transcripts), corporate events (M&A, investor days), SEC filings; AI "Quick insights" and full summaries for documents from June 2024 on, with links to the source text; filters for annual / quarterly / transcripts. | [53] |
| "News" | Heading "Latest headlines"; table columns Time, Instrument, Headline, Provider. | [50] |
| "Community" | Sub-tabs "Trade ideas" and "Minds" (plus "More"). The Help Center older wording calls this "Discussions". | [54], [55], [36] |
| — "Trade ideas" | Heading "In-depth trading ideas"; sort "Most recent" / "Most popular"; "Videos only" filter; cards carry title, blurb, chart thumbnail, author, Long/Short badge, comment/like counts, video length. | [55] |
| — "Minds" | Heading "Real-time market insights"; composer "What's on your mind about AAPL?" + "Post"; posts show avatar, name, plan badge, timestamp, `$SYMBOL` tag, text, boosts, optional snapshot. Rules: use the `$SYMBOL` hashtag, don't repost Ideas, post in the right symbol's feed; actions boost / comment / share / report. | [54], [36] |
| "Technicals" | Gauge labels "Strong sell", "Sell", "Neutral", "Buy", "Strong buy"; interval picker 1m, 5m, 15m, 30m, 1h, 2h, 4h, 1D, 1W, 1M + "More"; three gauges "Oscillators", "Moving Averages", "Summary"; 11-row Oscillators table (RSI(14), Stochastic %K(14,3,3), CCI(20), ADX(14), Awesome Oscillator, Momentum(10), MACD Level(12,26), Stochastic RSI Fast(3,3,14,14), Williams %R(14), Bull Bear Power, Ultimate Oscillator(7,14,28)); 16-row Moving Averages table (EMA/SMA 10/20/30/50/100/200, Ichimoku, VWMA, Hull MA); "Pivots" with Classic, Fibonacci, Camarilla, Woodie, DM × R3…S3. | [56] |
| "Forecasts" | 1-year price-target block (max / min / average from N analysts), "Analyst rating" gauge "Based on N analysts giving stock ratings in the past 3 months", "EPS" and "Revenue" estimate tables with "Annual" / "Quarterly" toggles and columns "Reported", "Estimate", "Surprise". | [57] |
| "Seasonals" | Month-by-month seasonality (not fetched in detail — **could not verify** the exact blocks). | [48] |
| "Options" | Option chain (calls, puts, bid/ask, implied volatility). | [38], [48] |
| "ETFs" | Every fund holding the stock: market value of the position, weight, expense ratio, AUM, performance; sub-tabs "Performance", "Fund flows", "Dividends", "NAV performance". | [51] |
| "Bonds" | The issuer's bonds ("Highest yielding bonds" on Overview links here). | [48] |

The tab set varies by asset class (crypto and forex pages have fewer tabs) — **could not verify** the exact crypto tab list from the Help Center.

---

## 4. Symbol change across a layout

| Gesture | Effect | Source |
|---|---|---|
| **Single click** a watchlist row | Loads the symbol on the **active** chart of the layout and opens its Details below the list ("When you click on a symbol in the watchlist, it will change on the chart"). | [1], [58] |
| **Double-click** a watchlist row | Changes the symbol on **all** charts of the multi-chart layout, "even when syncing is disabled". | [58] |
| Symbol sync on | "Select Layout" button on the main toolbar → sync toggles for Symbol, Crosshair, Interval, Time, Date range. With Symbol sync on, "all of the charts in your current layout will lock to the symbol that you select." | [59] |
| Selective sync groups | Status line / Series context menu → "Chart Syncing" button → pick an emoji; charts sharing an emoji sync symbol and interval; uncheck to leave the group. | [59] |
| Between browser/desktop tabs | TradingView Desktop: "Set the same color tag to a few tabs, and they will start following the ticker change made in any of them." Works chart↔chart and screener↔chart. | [60] |
| Persistence | "When you open your layout, it'll display the latest used interval and symbol." Symbol is per chart; indicators are per chart; drawings are per symbol unless drawing-sync is enabled. | [37], [61] |
| ↑ / ↓ / Space | Step to the previous/next watchlist symbol on the active chart (see 1.12). | [24] |

---

## 5. The mini quick-chart on hover

What I could verify:

- **Symbol Search rows**: hover reveals "Launch chart" and "See overview" buttons — an action popover, not a chart. [38]
- **Ticker Tag (embeddable widget)**: "a compact inline 'pill' that displays a symbol's logo and daily change, expanding into a detailed chart pop-up on hover"; the widget "What's new" page describes "inline mini charts and hover popovers" where "hovering reveals a chart or a multi-period performance grid." This is the hover-chart pattern TradingView ships, but as an embed widget for third-party sites. [62], [63]
- **Mini Chart widget**: "a symbol's price and change percentages, alongside a stripped-back chart view" — an embed, not a hover. [64]
- **Floating data window**: on the chart itself, click-and-hold shows an in-depth data window under the cursor (blog, Nov 2024) — this is a chart feature, not a watchlist hover. [65]
- **Watchlist rows**: I found **no Help Center or blog article describing a hover mini-chart inside the web watchlist**. The mobile "Chart Preview" feature (tap a symbol for a simple chart, second tap for the full chart) exists for iPhone/iPad. **Could not verify** a desktop-watchlist hover chart; do not assume it exists. [66]

---

## 6. Consolidated quick reference (labels only)

Watchlist panel: "Watchlist" · "+" · list-name menu: "Create a new one", "Open list…" (Shift+W), "Rename", "Make a copy", "Add a section", "Clear the list", "Import" / "Upload list…", "Add a watchlist alert" / "Add alert on the list…", "Favorites" · three-dot menu: column toggles, "logo" / "ticker" / "description", "Table view" · columns: "Last", "Change", "Change %", "Volume", "Extended Hours Last" · right-click row: "Add section", "Flag SYMBOL", "Flag All Selected", change flag color · Advanced view (pie icon): "Overview" ("Price", "Financials", "Performance", "Risk", "Technicals"), "Earnings", "Dividends", "News", "Currency in USD", "Summary values", "Group by", "Download list as TXT", share · Details: expand, "Settings", "Add note", "All notes", "NON-SYMBOL RELATED NOTES" · hotkeys: ↓/Space, ↑/Shift+Space, Shift+↓/↑, Ctrl+A, Alt+W, Alt+Enter, Alt+N.

Symbol Search: Ctrl/Cmd+K · tabs All, Stocks, Funds, Futures, Forex, Crypto, Indices, Bonds, Economy, Options · filters "Country", "Type", "Category", "Source", "Sector", "Exchange" · row = symbol | description | source · hover "Launch chart" / "See overview" · plus icon · flag icon · `EXCHANGE:SYMBOL` · expressions like `NVDA+AAPL` · Quick Search "Recent search".

Symbol page tabs: "Overview", "Financials", "Documents", "News", "Community" ("Trade ideas", "Minds"), "Technicals", "Forecasts", "Seasonals", "Options", "ETFs", "Bonds".

---

## What this means for OnStock

OnStock today: one hidden `__watchlist__` folder plus user folders (`src/state/FoldersContext.jsx`), a sidebar `WatchlistPane` that re-uses the phone `AssetRow` (ticker, gap, sparkline), and a `SearchOverlay` with ranked ticker/name matching, "popular" shortcuts, recent views and new listings. Mapping the teardown onto the desktop build:

1. **Adopt — a real table view with a fixed, small column set and click-to-sort.** TradingView refuses custom columns and ships five; OnStock's five should be *Last (token)*, *Stock (delayed)*, *Gap %*, *Chg % 1D*, *Volume*, with header-click cycling asc → desc → manual and a "restore order" arrow. The gap is the thesis, so it is a column, not a hover.
2. **Adopt — the "Table view" toggle.** Keep today's compact row (price + change beside the name, exactly TradingView's minimalistic mode) as the default on narrow sidebars and let the user switch to the table when the pane is wide. Persist the choice like TradingView does (local, not account).
3. **Adopt — sections/dividers inside a list, with sort-within-section.** Folders already exist; a `###`-style divider inside the watchlist (xStocks / Backed / Ondo, or "long ideas" / "hedges") is cheaper than more folders and matches the mental model. Store it as a marker row in `assetIds`.
4. **Adapt — flags, but as one color, keyed to the gap.** TradingView's 7 colors are a paid upsell; OnStock's users want one thing: "is this token trading off from its share?" Ship one flag (Alt+Enter) that pins a symbol to an automatic "Flagged" list, and consider a second, *automatic* colored state driven by gap-drift alerts rather than hand-chosen colors.
5. **Adapt — the Details section under the list.** The click-to-open panel beneath the watchlist is the right home for OnStock's per-token facts (issuer, chain, backing, delayed-stock last, gap, 24h volume, Treasury-yield context) and a "Trade on Jupiter" button. Add TradingView's "Settings" idea: let the user hide blocks and sync that preference to the account.
6. **Adapt — import/export as `.txt` with prefix, plus CSV.** TradingView only does comma-separated `EXCHANGE:SYMBOL` `.txt`. OnStock should accept both a plain ticker list and its own `issuer:TICKER` form, and import a pasted TradingView export (strip the `NASDAQ:` prefix, map to the liquid xStocks listing the way `popularPick` already does). Export should include divider names.
7. **Adopt — single-click vs double-click semantics.** Single click = change the active chart (and open Details); double-click = change every chart in a multi-chart gap layout. Also ↑/↓/Space to step through the list. This is the one behaviour desktop users will bring with them from TradingView.
8. **Adopt — search dialog tabs and filters.** Replace the flat overlay with tabs that match OnStock's universe — All / Stocks / ETFs & indices / Treasuries / News — and filters for *Issuer* (xStocks, Backed, Ondo…), *Chain*, *Liquidity* (hide thinly traded). Row layout copies TradingView's three columns: symbol | description | source (here: issuer + chain).
9. **Adopt — hover actions on search rows, not a hover chart.** "Launch chart" / "See overview" / plus / flag on hover is verified; a hover mini-chart in the watchlist is not something TradingView ships on desktop. Keep OnStock's sparkline in the row instead of building a hover chart.
10. **Adapt — "recent" in search.** OnStock already has `getRecentViews`; surface it as a "Recent" group at the top of an empty query, the way Quick Search keeps "Recent search".
11. **Adapt — the symbol page tabs.** OnStock's asset detail should grow tabs, but only the ones it has data for: *Overview* (key stats + gap), *Chart* (Gap | Candles), *Technicals* (SMA/EMA/RSI summary gauge, copy the Strong sell → Strong buy scale and the interval pills that match GeckoTerminal's 1m/5m/15m/1h/4h/1D), *News* (the tokenization feed with Time / Instrument / Headline / Provider columns). Skip Financials, Documents, Forecasts, Options — no data source.
12. **Skip — Ideas and Minds.** Social publishing is a whole product; OnStock has no community and should not fake one.
13. **Skip — hotlists and Advanced-view fundamentals (Earnings, Dividends, P/E).** OnStock has no fundamentals feed. A gap-ranked "movers" list (largest premium / discount today) is the OnStock-native equivalent and is cheap to compute from data it already has.
14. **Skip — plan-gated limits.** Don't cap symbols per list or number of lists; the limits exist to sell upgrades, and OnStock's universe is ~700 tokens.
15. **Adopt — account-wide watchlists independent of layouts.** TradingView explicitly keeps lists separate from chart layouts. OnStock already does this (FoldersContext is global, synced to Supabase); keep it that way when multi-chart layouts arrive.

---

## Sources

Every URL below was fetched and read for this document.

1. https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/
2. https://www.tradingview.com/support/solutions/43000487210-i-want-to-add-or-remove-columns-to-the-watchlist/
3. https://www.tradingview.com/support/solutions/43000771546-watchlist-advanced-view-mode/
4. https://www.tradingview.com/support/solutions/43000487233-how-to-import-or-export-a-watchlist/
5. https://www.tradingview.com/support/solutions/43000615520-how-to-add-a-section-to-the-watchlist/
6. https://www.tradingview.com/support/solutions/43000653364-i-want-to-add-my-own-columns-to-the-watchlist/
7. https://www.tradingview.com/support/solutions/43000660016-i-want-to-change-the-width-of-my-watchlist-columns/
8. https://www.tradingview.com/support/solutions/43000611192-i-accidentally-clicked-the-sort-button-how-do-i-return-the-previous-order-of-symbols/
9. https://www.tradingview.com/support/solutions/43000653369-how-are-change-and-change-calculated-in-the-watchlist/
10. https://www.tradingview.com/support/solutions/43000482906-i-cannot-see-my-watchlist-only-the-instrument-s-details-are-displayed/
11. https://www.tradingview.com/support/solutions/43000762029-discover-market-movers-with-tradingview-hotlists/
12. https://www.tradingview.com/support/solutions/43000645262-how-to-delete-a-list/
13. https://www.tradingview.com/support/solutions/43000645264-how-to-delete-the-red-list/
14. https://www.tradingview.com/blog/en/introducing-flagged-symbols-7443/
15. https://www.tradingview.com/blog/en/minimalistic-display-mode-for-watchlist-41721/
16. https://www.tradingview.com/pricing/
17. https://www.tradingview.com/blog/en/new-watchlist-features-21389/
18. https://www.tradingview.com/blog/en/updated-watchlist-on-tradingview-17501/
19. https://tradingview.com/blog/en/flagged-lists-improved-9521
20. https://www.tradingview.com/support/solutions/43000651214-symbols-in-my-watchlist-do-not-contain-the-drawings-i-made-on-charts/
21. https://www.tradingview.com/support/solutions/43000542366-how-to-quickly-add-a-symbol-to-the-watchlist/
22. https://www.tradingview.com/charting-library-docs/latest/trading_terminal/Watch-List/
23. https://www.tradingview.com/support/solutions/43000611193-how-many-symbols-can-i-add-to-the-watchlist/
24. https://www.tradingview.com/charting-library-docs/latest/getting_started/Shortcuts/
25. https://www.tradingview.com/support/solutions/43000724549-how-to-scan-watchlist-or-flagged-list/
26. https://www.tradingheroes.com/tradingview-flagged-symbols/ (third party — color names only)
27. https://www.tradingview.com/support/solutions/43000665060-how-can-i-share-my-watchlist/
28. https://www.tradingview.com/charting-library-docs/latest/trading_terminal/
29. https://www.tradingview.com/support/solutions/43000662506-how-to-customize-the-details-section/
30. https://www.tradingview.com/support/solutions/43000739708-watchlist-alerts-your-trading-edge/
31. https://www.tradingview.com/blog/en/watchlist-alerts-on-tradingview-49839/
32. https://www.tradingview.com/support/solutions/43000473930-how-to-add-the-screener-search-results-to-the-watchlist/
33. https://www.tradingview.com/blog/en/symbol-details-updates-29971/
34. https://www.tradingview.com/support/solutions/43000667881-how-to-create-a-text-note/
35. https://www.tradingview.com/support/solutions/43000667897-how-to-check-all-text-notes/
36. https://www.tradingview.com/support/solutions/43000690226-how-to-use-minds-and-what-they-are-made-for/
37. https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/
38. https://www.tradingview.com/support/solutions/43000746682-tradingview-symbol-search-tips-for-finding-assets/
39. https://www.tradingview.com/support/solutions/43000659671-quick-search-on-tradingview-find-anything-super-fast/
40. https://www.tradingview.com/blog/en/quick-search-across-the-platform-27720
41. https://www.tradingview.com/chart/RELIANCE/myIBlQDk-How-to-Use-the-TradingView-Search-Bar-Efficiently/ (community post — tab labels and filter examples)
42. https://www.tradingview.com/support/solutions/43000473919-i-can-t-find-a-symbol-in-the-symbol-search-box/ and https://www.tradingview.com/support/solutions/43000717544-why-can-t-i-find-my-symbols-in-the-symbol-search-box/
43. https://www.tradingview.com/charting-library-docs/latest/ui_elements/Symbol-Search/
44. https://www.tradingview.com/support/solutions/43000753163-symbol-type/
45. https://www.tradingview.com/support/solutions/43000639570-how-to-see-primary-listed-symbols-for-the-relevant-market-what-is-the-show-primary-exchange-symbols-only-filter-for/
46. https://www.threads.com/@rrohit_singh_lodhi/post/DIGWQdZRQbw/ (third party — flag icon in the search panel; seen only as a search-result snippet)
47. https://www.tradingview.com/support/solutions/43000732561-filter-by-symbol/ (seen as a search-result snippet for "More symbols…")
48. https://www.tradingview.com/symbols/NASDAQ-AAPL/
49. https://www.tradingview.com/symbols/NASDAQ-AAPL/financials-overview/
50. https://www.tradingview.com/symbols/NASDAQ-AAPL/news/
51. https://www.tradingview.com/blog/en/etfs-on-stock-symbol-pages-54202/
52. https://fxnewsgroup.com/forex-news/platforms/tradingview-updates-financials-tab/ (third party — seen as a search snippet describing the Financials tab layout)
53. https://www.tradingview.com/blog/en/ai-powered-documents-57510/
54. https://www.tradingview.com/symbols/NASDAQ-AAPL/minds/
55. https://www.tradingview.com/symbols/NASDAQ-AAPL/ideas/
56. https://www.tradingview.com/symbols/NASDAQ-AAPL/technicals/
57. https://www.tradingview.com/symbols/NASDAQ-AAPL/forecast/
58. https://www.tradingview.com/support/solutions/43000473336-how-do-i-change-the-ticker-symbol-for-all-charts-of-layout-simultaneously/
59. https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/
60. https://www.tradingview.com/support/solutions/43000673893-symbol-syncing-between-tabs/
61. https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
62. https://www.tradingview.com/widget-docs/widgets/tickers/ticker-tag/
63. https://www.tradingview.com/widget-docs/whats-new/ (seen as a search snippet: "inline mini charts and hover popovers")
64. https://www.tradingview.com/widget-docs/widgets/charts/mini-chart/ (seen as a search snippet)
65. https://www.tradingview.com/blog/en/floating-data-window-under-your-cursor-52715/ (seen as a search snippet)
66. https://kr.tradingview.com/chart/AAPL/obGo9UF3-Introducing-our-new-Chart-Preview-feature (seen as a search snippet — mobile Chart Preview)
67. https://www.tradingview.com/support/categories/watchlist/ and https://www.tradingview.com/support/folders/43000549989-how-to-manage-my-lists/ (category index used to enumerate the articles above)
68. https://www.tradingview.com/features/
69. https://www.tradingview.com/widget-docs/widgets/watchlists/
