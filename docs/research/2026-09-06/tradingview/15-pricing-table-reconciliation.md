# 15 — The pricing table, read from the HTML, and every cell the sweep got wrong

TradingView teardown, filler 2 (gap 15). Read date: 2026-09-06.

This file is an errata sheet. It does not rewrite documents 00–13; it states, for every row of TradingView's pricing comparison table, what the page actually renders per plan, and then lists each place in the sweep that says something different. The spec's §5 (the paid tier) and the index's "everything works on Basic" claim are re-checked at the end.

Plain-language summary of why the sweep disagreed with itself: the comparison table draws its "yes", "no" and "unlimited" cells as **SVG icons with no text**. A text-based fetcher sees an empty cell, so a row of five check marks reads as nothing, a "1 / ∞ / ∞ / ∞ / ∞" row reads as "1", and a row like "✗ / 2 / 4 / 6 / ∞" reads as "2 / 4 / 6" with every number shifted one plan to the left. Different documents guessed differently at the blanks. Reading the raw HTML removes the guessing, because each icon has a class name that says what it is.

---

## 1. Method — how each cell was read, so it can be audited

**Fetch.** `curl` of `https://www.tradingview.com/pricing/` with a desktop browser User-Agent, 2026-09-06, 1,199,165 bytes of HTML. No JavaScript was run; everything below is in the served HTML.

**Where the table is.** One `<table>` (288,758 characters) inside `div.tableWrapper-hD7fs6sz`. Its `<thead>` has six `<th>` cells: a blank feature cell followed by `headerProductCell-hD7fs6sz` cells reading, in order, **Basic, Essential, Plus, Premium, Ultimate**. There is no Expert column.

**Section headings.** Rows of the form `<tr class="sectionRow-kmq7zKYA"><th class="sectionName-kmq7zKYA">…</th>…</tr>`. The page has **16** section headings, not the 13 the task list named: Charts, Bar Replay, Technical analysis, Strategy backtesting, Watchlists, Portfolios, Alerts, Fundamental Graphs, Screeners, Data, Trading, Social, Ad-free, Mobile apps, Desktop app, Support. (The first section's heading is the word "Charts" in the `<thead>` itself.) 109 feature rows in total.

**Cells.** Each `<td class="contentCell-kmq7zKYA">` holds a `<p class="value-kmq7zKYA">` containing either text or exactly one icon span. The icon classes, matched literally:

| Rendered as | HTML class matched | Written below as |
|---|---|---|
| check mark | `checkIcon-kmq7zKYA` | ✓ |
| cross | `crossIcon-kmq7zKYA` | ✗ |
| infinity sign | `infinityIcon-kmq7zKYA` | ∞ |
| text (number, "All", "180 days", "1 mo.", "Regular"…) | none — plain text in the `<p>` | quoted verbatim |

No cell contained more than one icon, and no cell was empty.

**Tooltips.** The `(i)` icon after a row label is `span.tooltipTitle-kmq7zKYA … apply-common-tooltip` with a `title` attribute. For 15 rows the `title` is a real sentence (reproduced below). For 91 rows it is the literal string **"Click to learn more"** — the on-click panel's text is loaded by script and is **not in the HTML** (could not read). Three rows have no tooltip icon at all: "Symbols per watchlist", "Custom columns and sorting", "Date ranges".

**Cross-check rendering.** The same HTML carries a second, card-style rendering of the whole table (`section-xEhUCIWO` / `sectionRow-xEhUCIWO`, with `checkIcon-xEhUCIWO` etc.). All 109 row labels, tooltips and cells were compared with the `<table>` rendering: **zero disagreements** on any cell present (that rendering omits the fifth cell on some rows; wherever it prints a cell, it matches).

**Plan cards.** Above the table, each paid card lists 20 `li.itemFeatures-nfEnZiMz` bullets; excluded features carry the extra class `disableFeature-nfEnZiMz` (greyed out on screen). Card bullets are marketing phrasings ("Custom timeframes", "Chart data export", "Multiple watchlists", "Bar Replay") and are noted where they explain a document's misreading. The Basic card has no bullet list; its text is "Free, until you're ready", "$0 forever", "Sign up", "No credit card needed".

**Prices.** From the page's embedded `application/prs.init-data+json` block, key `shopconf.all_products` (`cost` = monthly billing, `cost_annual` = per-month price billed annually), and the visible card strings.

**Help Center cross-checks.** Every article named in a "Corroboration" cell below was fetched and read on 2026-09-06 (URLs in Sources). "— (page only)" means no TradingView article read states the number; the cell rests on the HTML alone. "could not verify" is used only where the HTML itself does not settle a cell (the Expert column, mostly).

---

## 2. Prices and the hidden Expert SKU

Toggle above the cards: **"Monthly"** / **"Annually"** with the badge **"Save up to 17% 😍"** (emoji is in the HTML).

| Column / product | `shopconf` id | Monthly billing (`cost`) | Annual billing, per month (`cost_annual`) | Card text | Trial button |
|---|---|---|---|---|---|
| **Basic** | (none) | $0 | $0 | "$0 forever", "No credit card needed" | "Sign up" |
| **Essential** | `pro` | $14.95 | $12.95 | "Special price: $12.95 / mo" · "billed annually" · "Save $24 a year" (08 §2; the "a year" string is present, the dollar figure sits in a separate span) | "Try free for 30 days" |
| **Plus** | `pro_realtime` | $34.95 | $29.95 | "Special price: $29.95 / mo" | "Try free for 30 days" |
| **Premium** | `pro_premium` | $69.95 | $59.95 | "Special price: $59.95 / mo" | "Try free for 30 days" |
| **Expert** (not a column) | `pro_expert`, `"is_expert": true`, `upgrade_weight: 8` | $119.95 | $99.95 | not shown on the page; schema.org `Product` "Expert", "TradingView Expert Account", `price: 119.95`, `priceValidUntil: 2026-10-06` | could not verify (no card) |
| **Ultimate** | `pro_premium_expert`, `"is_expert": true`, `upgrade_weight: 16` | $239.95 | $199.95 | "Special price: $199.95 / mo" | "Try free for 14 days" |

Two facts about the annual discount that the spec needs (see §6): Essential's own annual saving is **13.4 %** ($14.95 → $12.95); the **17 %** on the badge is Ultimate's ($239.95 → $199.95 = 16.7 %). "Save up to 17%" is a ceiling, not the Essential rate.

Footnotes under the cards, verbatim: "Only the Ultimate plan is available for professional users. Learn more about who qualifies as a professional." and "TradingView, Inc. is registered for sales tax purposes in certain countries. As a result, depending on your location, a sales tax could be added to your final bill." The Ultimate card also lists "Ability to buy professional market data".

Expert discount SKUs in `shopconf.discounts`: `pro_expert_60_discount` ("Expert Early Bird", 60 % annual) and others; Essential and Plus "Early Bird" SKUs (30 %/40 %) also exist. These are offer mechanisms, not list prices.

**Expert column, where a TradingView page states a number** (everything else in the Expert column is "could not verify"):

| Row | Expert value | Source |
|---|---|---|
| Charts per tab | **10** — "10 charts in one layout for Expert plans, and 16 charts in one layout for Ultimate plans" | Help Center 43000693877 "Why was the connection closed?" |
| Historical bars available | **25,000** — "Expert plans have access to 25000 bars, and Ultimate plans can have the maximum number of historical intraday bars, which is 40000" | Help Center 43000480679 |
| Bar Replay, time-based history | **All** — "Premium and professional plans (Expert and Ultimate) … allow you to play absolutely all time-based data available in TradingView's data storage" | Help Center 43000692816 |
| Historical data by the tick | not Expert — "Ultimate users also have access to historical tick data" | Help Center 43000692816 |
| Time limit for making calculations | 08 §5 reports "Expert: 60 seconds" from 43000579793; my read of that article on 2026-09-06 returned only "20 seconds (for Basic plan), 40 seconds (for Essential, Plus and Premium plans), 100 seconds (for Ultimate plan)" — **could not verify** the Expert figure |
| Signature / Website fields | 13 §3 reports "Premium, Expert & Ultimate: + Website" from the social-links article (not re-read here) |

---

## 3. The authoritative table — every row, every section

Column order is the page's: Basic · Essential · Plus · Premium · Ultimate. "Tooltip" is the `title` attribute verbatim; "Click to learn more" is shortened to **(click)**. "Corroboration" is the TradingView article read that states the same limit, or "— (page only)".

### 3.1 Charts

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Charts per tab | 1 | 2 | 4 | 8 | 16 | (click) | 43000693877: "Essential users can open 2 charts per one tab, Plus users can open up to 4 charts, and Premium users can open up to 8 charts per one tab … 10 charts in one layout for Expert plans, and 16 charts in one layout for Ultimate plans". 43000692404: "from 1 to 16 charts in the layout". Cards: "2/4/8/16 charts per tab". |
| Number of saved chart layouts | 1 | 5 | 10 | ∞ | ∞ | (click) | — (page only; 43000692404 states no count) |
| Custom time intervals | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | 43000543883 describes the feature, states no plan. Cards: "Custom timeframes" enabled from Essential. |
| Second-based intervals | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | 43000762068 lists "1, 5, 10, 15, 30, and 45 seconds", states no plan. |
| Tick-based intervals | ✗ | ✗ | ✗ | ✗ | ✓ | (click) | 43000709225 lists "1T, 10T, 100T, and 1,000T", states no plan. |
| Intraday Renko, Kagi, Line Break, Point & Figure charts | ✗ | ✗ | ✓ | ✓ | ✓ | (click) | 43000758617 describes the four types, states no plan. Cards: bullet greyed (`disableFeature`) on Essential, enabled from Plus. |
| Custom range bars | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | Cards: enabled from Essential. |
| Intraday charts based on custom formulas (spreads) | ✗ | ✗ | ✓ | ✓ | ✓ | (click) | Cards: "Charts based on custom formulas" greyed on Essential, enabled from Plus. |
| Download chart data | ✗ | ✗ | ✓ | ✓ | ✓ | (click) | 43000537255 "How to export chart data" describes the menu, states no plan. Cards: "Chart data export" greyed on Essential, enabled from Plus. |
| Customizable chart types | 17 | 17 | 17 | 21 | 21 | (click) | The four Premium-only types are the Technical-analysis rows below (TPO, Volume footprint, Volume candles) plus one not named on the page — could not verify which. |
| Compare symbols | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Dividend-adjusted charts | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Interactive earnings, splits and dividends | ✓ | ✓ | ✓ | ✓ | ✓ | "Companies report earnings, issue dividends, and sometimes do stock splits. All these actions often affect stock prices in a significant way - so we've laid them on top of the price for easy viewing." | — |
| Historical annual financial data on charts | 7 years | 20 years | 20 years | 20 years | 20 years | (click) | — |
| Historical quarterly financial data on charts | 8 years | 8 years | 8 years | 8 years | 8 years | (click) | — |
| Extended trading hours | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Simultaneous chart connections | 2 | 10 | 20 | 50 | 200 | (click) | 43000694474: "up to 200 simultaneous chart connections"; "Once the limit is reached, the oldest connection (the earliest opened tab) will get closed." Cards: "10/20/50/200 parallel chart connections". |

### 3.2 Bar Replay

There is **no row labelled "Bar Replay"** in the table; "Bar Replay" is a card bullet (enabled on every paid card) and a section heading. What the table gates is the *depth* of replayable history:

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Historical data by day and higher timeframes | All | All | All | All | All | (click) | 43000692816 gives no Basic sentence; 43000474024 and 43000475470 (the two "turn it on / it doesn't work" articles) state no plan. The row is the only TradingView-authored statement that Basic can replay daily+ data. |
| Historical data by the minute | ✗ | 180 days | 365 days | All | All | (click) | 43000692816: "Essential users have access to 6 months of 1-minute data. For a 2-minute interval, this limit is doubled…"; "Plus users have access to one year of 1-minute data…"; Premium/Expert/Ultimate "absolutely all time-based data". |
| Historical data by the second | ✗ | ✗ | ✗ | All | All | (click) | 43000692816: "For all time intervals, whether it's 1 hour, 1 minute, or even 1 second, you'll get access to the maximum depth of data history" (Premium and professional plans). |
| Historical data by the tick | ✗ | ✗ | ✗ | ✗ | 7 days | (click) | 43000692816: "Ultimate users also have access to historical tick data in Bar Replay. Tick-based historical data is available for up to 7 days back from the current time." |
| Indicators Replay | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Trading in Bar Replay | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |

### 3.3 Technical analysis

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| 400+ pre-built most popular indicators | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| 100K+ community-powered indicators | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Indicator on indicator | 1 | 1 | 9 | 24 | 49 | (click) | Cards: "Indicators on indicators" enabled from Essential (the table says Basic also gets 1). |
| Indicators per chart | 2 | 5 | 10 | 25 | 50 | "Indicators are important tools for market research. Free accounts support up to 2 indicators per chart, Essential supports 5, Plus handles 10, and Premium accounts unlock up to 25 indicators per chart!" | Cards: "5/10/25/50 indicators per chart". |
| Financials per chart | 1 | 4 | 7 | 10 | 25 | (click) | — |
| Custom indicator templates | 1 | ∞ | ∞ | ∞ | ∞ | (click) | 43000543048 "What are indicator templates" states no count — page only. |
| 110+ smart drawing tools | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Volume Profile indicators | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | Cards: "Volume profile" enabled from Essential. |
| Time Price Opportunities | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | Blog 2024-04-11 "Time Price Opportunity (TPO) — now a chart type": "The TPO chart type is available to all users with a Premium subscription and above." Cards: "Time price opportunity" greyed on Essential and Plus. (43000725590 and 43000713306 state no plan.) |
| Volume footprint | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | 43000726164 mentions only "1 tick (for professional plans)" as an intrabar source — page only for the Premium gate. |
| Volume candles | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | Blog 2024-04-04 "New chart type — Volume candles": "the new chart type is available to users with a Premium subscription or higher." (43000724995 states no plan.) |
| Pine Script® | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Candlestick patterns recognition | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Auto fib retracement | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Multi-timeframe analysis | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Time limit for making calculations | 20s | 40s | 40s | 40s | 100s | (click) | 43000579793: "20 seconds (for Basic plan), 40 seconds (for Essential, Plus and Premium plans), 100 seconds (for Ultimate plan)". |
| Auto chart patterns | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | — (page only) |

### 3.4 Strategy backtesting

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Basic report metrics | ✓ | ✓ | ✓ | ✓ | ✓ | "See key stats to map your trading strategy." | — |
| Advanced report metrics | ✗ | ✓ | ✓ | ✓ | ✓ | "Get all backtesting metrics for a complete picture of your strategy performance." | — |
| Export trades in CSV | ✗ | ✓ | ✓ | ✓ | ✓ | "Save trades data as CSV files for further analysis." | — |
| Export report in XLSX | ✗ | ✓ | ✓ | ✓ | ✓ | "Save backtesting data as XLSX files for further analysis." | — |
| Deep backtesting | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | 43000666265 "How Deep Backtesting works": "This feature is available for Premium and higher plan users."; "The limit of available historical data is up to two million bars and one million trades." |
| High detalization of historical bars | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | — |
| Each history tick execution | ✗ | ✗ | ✗ | ✓ | ✓ | "Add extra strategy recalculations using data from every tick. Together with historical bars detalization, you get the best backtest quality." | — |

### 3.5 Watchlists

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Number of watchlists | 1 | ∞ | ∞ | ∞ | ∞ | (click) | 43000611193 and 43000745825 state no list count — page only. Cards: "Multiple watchlists" enabled from Essential. |
| Symbols per watchlist | 30 | 1,000 | 1,000 | 1,000 | 1,000 | (no tooltip icon) | 43000611193: "Watchlist can contain no more than 1000 symbols." (no Basic figure — page only for 30) |
| Flagged symbols colors | 1 | 7 | 7 | 7 | 7 | (click) | Blog 2018-10-29 "The evolution of flagged symbols" (older state): "Free users only have the basic kit with the red color."; "Pro/Pro+/Premium subscribers have all 5 colors". The count has since grown to 7. |
| Import/export | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Custom columns and sorting | ✓ | ✓ | ✓ | ✓ | ✓ | (no tooltip icon) | — |

### 3.6 Portfolios

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Number of portfolios | 1 | 3 | 4 | 5 | 7 | (click) | — |
| Holdings per portfolio | 20 | 50 | 75 | 100 | 150 | (click) | — |
| Transactions per portfolio | 2,000 | 5,000 | 5,000 | 5,000 | 5,000 | (click) | — |

### 3.7 Alerts

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Active price alerts | 3 | 20 | 100 | 400 | 1,000 | (click) | 43000690941: "800 active alerts (400 price alerts + 400 technical alerts)" (Premium); "2000 active alerts (1000 price alerts + 1000 technical alerts)" (Ultimate). 43000696403 defines Price vs Technical and gives the "802 alerts in total" example. Cards: "20/100/400/1,000 price alerts". |
| Active technical alerts on indicators, strategies, and drawings | ✗ | 20 | 100 | 400 | 1,000 | (click) | Same two articles. Cards: "20/100/400/1,000 technical alerts". Basic: the cell is a `crossIcon`, i.e. **zero**. |
| Active watchlist alerts | ✗ | ✗ | ✗ | 2 | 15 | (click) | 43000739708 states no plan. Cards: "0 watchlist alerts" (greyed) on Essential and Plus, "2" Premium, "15" Ultimate. |
| Alert durations | 1 mo. | 2 mo. | 2 mo. | ∞ | ∞ | (click) | — (page only) |
| Webhook notifications | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | 43000529348 states no plan (only "webhook alerts are only allowed when 2-factor authentication is enabled") — page only for the gate. |
| Multi-condition alerts | ✗ | ✗ | ✓ | ✓ | ✓ | (click) | 43000761492: "Available with the Plus plan and above, multi-condition alerts count as just one technical alert toward your limit." Cards: greyed on Essential, enabled from Plus. |
| Alerts on financial metrics | ✗ | ✗ | ✓ | ✓ | ✓ | (click) | — (page only) |
| Second-based alerts | ✗ | ✗ | ✗ | ✓ | ✓ | "Get real-time alerts on a second-based chart. Create alerts for price, indicators or specific drawings and get notified when they happen each second." | Blog 2020-02-17 "Alerts Are Now Available for Second Resolutions": "alerts created on a second-based interval chart are only available to TradingView members who subscribe to a Premium plan". |

Not on the table but plan-gated in the Help Center: **news alerts** — 43000762838: "Users without a subscription can keep one news alert active, while paid plan holders can track up to 10 different flows simultaneously."

### 3.8 Fundamental Graphs

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Date ranges | Up to 5y | Up to 5y | Up to 5y | All | All | (no tooltip icon) | — |

### 3.9 Screeners

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Stock, ETF, DEX, crypto screeners | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| 150+ exchanges from 50+ countries | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| 500+ fundamental and technical fields | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Multiple markets | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Chart view mode | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Watchlists as filters | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Flagged symbols colors | 1 | 7 | 7 | 7 | 7 | (click) | (same as Watchlists) |
| Screeners with auto refresh | 1 min | 10 sec / 1 min | 10 sec / 1 min | 10 sec / 1 min | 10 sec / 1 min | "Catch new movers with results updated automatically. Or turn off this function if you want to slow down updates." | — |
| Data export | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Timeframes | D W M | All | All | All | All | (click) | — |
| Pine Screener | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | — |

### 3.10 Data

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Fastest data flow | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Maximum market data subscriptions allowed | ✗ | 2 | 4 | 6 | ∞ | (click) | — (page only). `shopconf` prices the add-ons themselves: e.g. `exchange-us-stocks` (NYSE, NASDAQ, NYSE Arca, NASDAQ GIDS, OTC) $9.95, `exchange-nyse` $3.00, `exchange-nasdaq` $3.00, `exchange-cme-full` $7.00, `exchange-dbg` (FWB, XETR) $8.00, `exchange-lse_ls` $5.00, `exchange-tsx` $12.00, `exchange-asx` $16.00, `exchange-six` $12.00, `exchange-hkex` $18.00, `exchange-opra` $2.00 — monthly, non-professional. |
| Historical bars available | 5K | 10K | 10K | 20K | 40K | (click) | 43000480679: "5000 bars/candles"; "for Essential and Plus account holders it is doubled to 10000 bars and for Premium holders it's quadrupled to 20000"; "Expert plans have access to 25000 bars, and Ultimate plans … 40000"; "We display all available data for daily-based intervals." Cards: "10K/10K/20K/40K historical bars". |
| Dedicated backup data feed | ✗ | ✓ | ✓ | ✓ | ✓ | "Your data is extra secure with a dedicated redundant data server with a separate hosting provider. Should the main feed experience an issue, your data will automatically flow from the back up - making sure you never skip a beat." | — |
| Financials (fundamental stock data) | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Global economic data | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Real-time context news | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Hotlists | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Economic and earnings calendars | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Yield Curves | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |

### 3.11 Trading

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Trade through selected brokers | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Simulated (paper) trading | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Chart trading | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Depth of Market (DOM) trading | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Active community contests | ✗ | 3 | 5 | 10 | 25 | "Increase the number of paper trading contests you can create. Each live or upcoming competition counts as one." | — |
| Ability to create public contests | ✗ | ✗ | ✗ | ✓ | ✓ | "Create paper trading contests that are visible and open to all users." | — |

### 3.12 Social

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Exclusive badge next to your name | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Signature and Website fields | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | 13 §3 (trial-signature article): "Free & free trial users are unable to access this feature." — that article says paid; the table says Premium+. Both were not re-read here. |
| Publish invite-only indicators | ✗ | ✗ | ✗ | ✓ | ✓ | (click) | 43000482573: "Invite-Only script publishing is available to Premium users only." |
| Publish protected scripts | ✗ | ✓ | ✓ | ✓ | ✓ | "Only authors can see their scripts' source code" | 43000482573 states no plan for protected scripts — page only. |
| Publish public ideas and scripts | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Video ideas | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Minds | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Comments on public ideas and scripts | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |

### 3.13 Ad-free

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Charts | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | Cards: "No ads" on every paid card. |
| Social network | ✗ | ✓ | ✓ | ✓ | ✓ | (click) | — |

### 3.14 Mobile apps

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Always at your fingertips | ✓ | ✓ | ✓ | ✓ | ✓ | "Our advanced cloud-based infrastructure means you have access to the world of finance 24/7. Multiple channels ensure secure and reliable data streaming." | — |
| Fully synced — 100% | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Native push alerts notifications | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Android and iOS Widgets | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |

### 3.15 Desktop app

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Desktop experience | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |
| Native multi-monitor support | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | Blog 2022-04-27 "Multi-monitor support now free on desktop app": "all users of our free plan will now have multi-monitor support."; "removes the limit on open windows"; needs desktop 1.0.6+. 43000611543: "You can open as many windows of TradingView Desktop as you need." |
| Tab linking by symbol between windows | ✓ | ✓ | ✓ | ✓ | ✓ | (click) | — |

### 3.16 Support

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip | Corroboration |
|---|---|---|---|---|---|---|---|
| Customer support | ✗ | Regular | Priority | Priority | First Priority | "Paid subscribers can send questions to customer support team at any moment. Our specialists respond to all inquiries during business hours: Monday - Friday, 4 AM - 3 PM EST." | 43000590947 "Self-help resources for free users" carries the FAQ line "I can't write a ticket, how can I contact support or get help on my issue?" |

### 3.17 What Basic actually lacks (for the "everything works on Basic" claim)

Counting the table: of 109 rows, Basic has a `crossIcon` in **46** and a smaller number or shorter window than Ultimate in 23 more (counted from the parsed rows; "Flagged symbols colors" appears twice, once under Watchlists and once under Screeners). The capabilities (not counts) Basic does not have at all: custom / second / tick intervals; intraday Renko-Kagi-Line Break-P&F; custom range bars; intraday spreads; chart data download; 4 of the 21 chart types (TPO, Volume footprint, Volume candles + one unnamed); Volume Profile indicators; Auto chart patterns; intraday Bar Replay; advanced backtest metrics, CSV/XLSX export, deep backtesting; watchlist import/export; every technical alert; watchlist, multi-condition, financial-metric and second-based alerts; webhooks; fastest data flow and backup feed; any real-time exchange add-on; screener data export, intraday screener timeframes, Pine Screener; every Social row; ad-free; support tickets. What Basic keeps in full: all standard chart types, the indicator library (2 per chart, 1 on 1), 110+ drawings, extended hours, compare, dividend adjustment, event markers, daily+ replay, Pine Script, pattern recognition, the desktop app with multi-monitor and tab linking, paper/broker/chart/DOM trading, screeners on D/W/M, financials, calendars, news, hotlists, yield curves, native push.

---

## 4. Corrections — every document and section that disagrees with the table

"Spec impact" refers to `../onstock-desktop-spec.md`. "none" means the spec never leaned on that cell.

| # | Document : section (line) | What it says | Authoritative cell(s) | Why it went wrong | Spec impact |
|---|---|---|---|---|---|
| 1 | 00 index : "The things that make TradingView feel like TradingView", item 16 | "Everything works on Basic. No capability is withheld from the free plan; what scales with price is counts, delivery and depth." | §3.17: 46 Basic cells are ✗, including intervals, 4 chart types, Volume Profile, auto patterns, all technical alerts, webhooks, exports. | Generalised from the Charts rows a fetcher could read (numbers) while the icon rows read as blank. | **Yes** — spec §5.1 cites this item as precedent ("That is also exactly how TradingView's own Basic plan is shaped"). See §6 bullet 1. |
| 2 | 00 index : 08 summary (1) and 08 : "What this means" #1 | "Basic has every capability — all chart types, all indicators, extended hours…" / "Basic column has every chart type, every indicator". | "Customizable chart types" 17 vs 21; "Volume Profile indicators" ✗; "Auto chart patterns" ✗; TPO / footprint / volume candles ✗. | Same as #1. | Same as #1. |
| 3 | 01 : §1.4 table, "Plan gates" (line 66) | "Second-based intervals": Essential+ ✓. | ✗ ✗ ✗ ✓ ✓ — **Premium+**. | Blank icon cells; the doc assumed the first ✓ was Essential. | none (GeckoTerminal floor is 1 m). |
| 4 | 01 : §1.4 (line 66); 09 : intro (line 12) | "Tick-based intervals": Essential+ ✓ / "second-based and tick-based intervals (Essential and higher)". | ✗ ✗ ✗ ✗ ✓ — **Ultimate only**. | Same. | none. |
| 5 | 01 : §1.4 (line 66) | "Historical data by the second": "listed from Plus". | ✗ ✗ ✗ All All — **Premium+** (43000692816). | Same. | none. |
| 6 | 01 : §1.5 (line 87), §7 (line 326) | "Intraday Renko, Kagi, Line Break, Point & Figure charts": Basic ✗, Essential+ ✓. | ✗ ✗ ✓ ✓ ✓ — **Plus+** (Essential card greys the bullet). | Same. | none. |
| 7 | 01 : §1.5 (line 91), §7 (line 325) | "Volume footprint": Essential+ ✓. | ✗ ✗ ✗ ✓ ✓ — **Premium+**. | Same; also merged with the Volume Profile row, which really is Essential+. | none. |
| 8 | 01 : §1.5 (line 85) | "Volume candles": "—" (no gate). | ✗ ✗ ✗ ✓ ✓ — **Premium+** (blog 2024-04-04). | Row not found by the fetcher. | none. |
| 9 | 01 : §1.5 (line 93) | "Time price opportunity": could not verify. | "Time Price Opportunities" ✗ ✗ ✗ ✓ ✓ — **Premium+** (blog 2024-04-11). | Same. | none. |
| 10 | 01 : §1.8 (line 113) | "Active technical alerts…": **Basic 20** / Essential 20 / … | ✗ 20 100 400 1,000 — **Basic 0**. | The Basic cross rendered as nothing and the doc back-filled with the next value. | none — spec §5.2 already says "3 price / 0 technical". |
| 11 | 01 : §1.9 (line 124), §7 (line 323) | "Bar Replay": Basic ✗, Essential+ ✓. | No such row. Bar Replay section: "Historical data by day and higher timeframes" = **All on every plan incl. Basic**; only intraday depth is gated. | Read from the card bullet "Bar Replay" (paid cards only), not the table. | none (spec skips Bar Replay). |
| 12 | 01 : §1.13 (line 157), §7 (line 319); 11 : §8.4 (line 309) | "Number of saved chart layouts": 1 / 5 / 10 / **10 / 10**. | 1 / 5 / 10 / **∞ / ∞** (`infinityIcon`). | The infinity icon has no text; the docs repeated the last number they could read. | none — spec §5.2 "1 / unlimited" already matches; the correction *strengthens* it. |
| 13 | 01 : §7 (line 327) | "Native multi-monitor support": ✗ ✗ ✗ ✓ ✓. | ✓ on all five plans (blog 2022-04-27; 43000611543). | Blank icon cells, filled by an old memory of the pre-2022 gate. | none. |
| 14 | 01 : §7 (line 329) | "Number of watchlists: 1 for every plan … reads like a scrape artefact, could not verify". | 1 / ∞ / ∞ / ∞ / ∞. | It *was* a scrape artefact — of the ∞ icon, not the "1". | none — spec §5.2 "1 watchlist … / unlimited" matches. |
| 15 | 03 : §14 (line 382) | "Pricing-page row `Bar Replay` … Basic column (checkmark vs dash) … could not verify". | See #11. | Same as #11. | none. |
| 16 | 03 : §15 (line 390) | "`110+ smart drawing tools`: one fetch put a dash under Basic … could not verify what the row restricts". | ✓ ✓ ✓ ✓ ✓ — restricts nothing. | Blank icon cell. | none. |
| 17 | 04 : §7 table | "Custom indicator templates": Basic 1, paid "could not verify (dash/checkmark)". | 1 / ∞ / ∞ / ∞ / ∞. | Infinity icon. | none. |
| 18 | 04 : §7 table | "Volume Profile indicators": Basic could not verify. | Basic ✗ (Essential+ ✓). | Cross icon. | none. |
| 19 | 04 : §7 table | "Auto chart patterns": ✓ on all five plans. | ✗ ✗ ✗ ✓ ✓ — **Premium+**. | Cross icons read as blank, then assumed ✓. | none. |
| 20 | 04 : §7 table + note | "Deep backtesting": "— / see note / ✓ / ✓ / ✓"; lower bound could not verify. | ✗ ✗ ✗ ✓ ✓ — **Premium+**, and 43000666265 says the same. | Cross icons. | none. |
| 21 | 04 : §7 table | "Publish invite-only / protected": "listed at Essential / Plus in one fetch". | Protected: ✗ ✓ ✓ ✓ ✓ (**Essential+**). Invite-only: ✗ ✗ ✗ ✓ ✓ (**Premium+**; 43000482573). | Column shift. | none. |
| 22 | 05 : §1.7 table | "Number of watchlists": 1 / **1** / 1,000 / 1,000 / 1,000. | 1 / ∞ / ∞ / ∞ / ∞. | The ∞ cells read blank; the "1,000" from the *next* row (symbols) was pulled up. | none. |
| 23 | 05 : §1.7 table; 01 §7 and 08 §8 already correct | "Symbols per watchlist": 30 / **30** / 1,000 / 1,000 / 1,000. | 30 / 1,000 / 1,000 / 1,000 / 1,000. | Column shift from the row above. | none. |
| 24 | 05 : §1.6 (Colors, Change a color, Rename rows) and §1.7 table | "Flagged symbols colors": 1 / **1** / 7 / 7 / 7; colour changes "Plus+"; "Basic/Essential: red only". | 1 / 7 / 7 / 7 / 7 — **Essential** already has 7. | Column shift. | none — spec §4 item 17 skips flag colours regardless. |
| 25 | 05 : §1.7 table | "Custom columns and sorting": Basic —. | ✓ on all five. | Check icons read blank. | none. |
| 26 | 07 : §3.2 (line 98) | "Alerts on financial metrics … Listed on every plan including Basic." | ✗ ✗ ✓ ✓ ✓ — **Plus+**. | Cross icons read blank, assumed ✓. | none (spec §4 item 19 skips fundamentals alerts). |
| 27 | 07 : §3.7 (line 160), §8 table | "Multi-condition alerts: pricing page ticked on every plan including Basic … could not resolve" vs Help Center Plus+. | ✗ ✗ ✓ ✓ ✓ — **Plus+**; the page and 43000761492 agree. Resolved. | Same. | none. |
| 28 | 07 : §3.8 (line 165), §8 table | "Second-based alerts: tick on every plan including Basic; treat the pricing page as current." | ✗ ✗ ✗ ✓ ✓ — **Premium+**; the 2020 blog is still right. | Same. | none. |
| 29 | 07 : §4.8 (line 270), §8 table | "Webhook URL … All plans per pricing page." | ✗ ✓ ✓ ✓ ✓ — **Essential+** (Basic no). | Same. | none — spec §5.2 puts webhook on the paid side already; 13 §6b had it right. |
| 30 | 07 : §8 table, "Alert durations" | Premium: "pricing fetch inconsistent ('—' once, '2 mo.' once)". | 1 mo. / 2 mo. / 2 mo. / **∞ / ∞**. | Infinity icon. | none — spec §5.2 paid "Open-ended" matches TradingView's Premium+, not Essential/Plus (2 mo.). Fine for a one-tier product; noted in §6. |
| 31 | 07 : §8 table columns "Expert", "Elite" | Two professional columns "behind a client-side tab". | The HTML has no Elite product anywhere (`shopconf` lists `pro_expert` and `pro_premium_expert` only) and no hidden tab; Expert is a SKU without a column. | Speculation. | none (spec §4 item 11 skips the ladder). |
| 32 | 08 : §4 intro | "Bar Replay … available on every plan including Basic for daily-and-higher data" (correct) but cites the Help Center for it. | Correct cell; the corroboration is the table row only — none of the three replay articles read states a Basic rule. | Attribution, not a value error. | none. |
| 33 | 09 : intro (line 12) | "Bar Replay on intraday intervals (paid plans)" — correct; "second-based and tick-based intervals (Essential and higher)" — see #4. | — | — | none. |
| 34 | 10 : §1 (line 39), "What this means" #1 (line 486) | "Data export" listed among Basic features; "CSV export … is a free-tier feature everywhere". | ✗ ✓ ✓ ✓ ✓ — **Essential+**; Basic has no screener export. | Check/cross icons read blank. | **Yes** — spec §5.2 already puts screener CSV export on the paid side, so the spec is right and 10's reason for "adopt as free" is wrong. Keep the spec cell. |
| 35 | 10 : §4 (line 266) | "Economic and earnings calendars" under Essential+ … could not verify what the gate covers. | ✓ on all five — no gate. | Same. | none. |
| 36 | 10 : §5 (line 354) | "Real-time context news is Essential+". | ✓ on all five. | Same. | none. |
| 37 | 10 : §6 (line 375) | "Video ideas Premium+". | ✗ ✓ ✓ ✓ ✓ — **Essential+**. | Same. | none. |
| 38 | 10 : §7 (line 381) | "Hotlists Essential+". | ✓ on all five. | Same. | none (spec adapts hotlists as free "Gap lists" anyway). |
| 39 | 12 : §8 | All four Trading rows ✓ on every plan. | Correct. | — | none. |
| 40 | 13 : intro (line 7) | Expert "the pricing page fetch did not list — could not verify on the pricing page". | Expert is in the page's `shopconf` as `pro_expert` ($119.95 / $99.95), just not a column. | Fetcher cannot see script data. | none. |
| 41 | 13 : §6b (line 115) | "Native push alerts notifications — all *paid* plans on the pricing page; push articles say all users (conflict noted)". | ✓ on all five incl. Basic — **no conflict**. | Check icons read blank. | Minor — see §6 bullet 9 (push could be free on OnStock too). |
| 42 | 13 : §8 (line 170), §13 (line 281) | "Maximum market data subscriptions allowed: **Basic 2, Essential 4, Plus 6** (Premium/Ultimate unlisted)"; "2 market-data subscriptions" among free-plan limits. | ✗ / 2 / 4 / 6 / ∞ — **Basic none**, Essential 2, Plus 4, Premium 6, Ultimate ∞. | The textbook column shift: the Basic cross has no text, so every number moved one plan left and the ∞ vanished. | none (spec skips add-ons). |
| 43 | 13 : §12 (line 252) | "Publish public ideas and scripts — Premium+ on the pricing page". | ✗ ✓ ✓ ✓ ✓ — **Essential+**. | Column shift. | none. |
| 44 | 13 : §12 (line 253) | "Scripts: Invite-only: Essential+; protected: Plus+; public: Premium+". | Protected **Essential+**; invite-only **Premium+** (43000482573); public ideas/scripts **Essential+**. | Column shift by one, twice. | none. |
| 45 | 06 : §3.1 | 1 / 5 / 10 / ∞ / ∞ and Expert 10 charts per tab. | Correct on every cell checked; Expert saved layouts and connections rightly "could not verify". | — | none. |
| 46 | 08 : §§3–10 | All 109 cells. | **Correct on every cell** against the HTML; 08 is the document the others should have deferred to. One nit: 08 §4's Help-Center attribution for Basic daily replay (#32). | — | none. |
| 47 | Spec : §5.2 "Price" row | "annual ≈17 % lower (TradingView's 'Save up to 17%')". | Essential 13.4 % ($14.95 → $12.95); Plus 14.3 %; Premium 14.3 %; Ultimate 16.7 %. "Up to 17 %" is Ultimate's rate. | The badge is a ceiling. | **Yes** — small wording change, §6 bullet 8. |

Documents 02 (line 58, "17 on Basic/Essential/Plus and 21 on Premium/Ultimate") and 12 (§8) match the table and need no correction.

---

## 5. Which rows moved — so readers know these numbers drift

The table is a snapshot; TradingView's own posts show which cells have changed and in which direction.

| Row | Earlier state (TradingView source) | Today (this table) | Direction |
|---|---|---|---|
| Native multi-monitor support (Desktop app) | Paid only until 2022-04-27: "all users of our free plan will now have multi-monitor support" (blog). Doc 01 §7's ✗ ✗ ✗ ✓ ✓ is this pre-2022 state. | ✓ on every plan | loosened |
| Active alerts, Basic | 2023-03-13 "It's doubled now": "Basic — 2, Pro — 40, Pro+ — 200, Premium — 800", split into "P is for Price" and "T is for Technical"; June 2023 update: Basic "6 alerts … 5 price alerts and 1 technical alert". | 3 price + **0** technical | **tightened** (6 → 3, technical removed) |
| Active alerts, paid | Pro 40 → Essential 20 + 20; Pro+ 200 → Plus 100 + 100; Premium 800 → 400 + 400 (43000690941 still prints "800 active alerts (400 price alerts + 400 technical alerts)"); Ultimate "2000 (1000 + 1000)". | 20/20 · 100/100 · 400/400 · 1,000/1,000 | unchanged in total; renamed |
| Active watchlist alerts | Not on the 2023 posts (feature is newer); 07 §8 quotes a blog "Expert 10". | ✗ ✗ ✗ 2 15 | new row |
| Flagged symbols colors | 2018-10-29 blog: free = red only; "Pro/Pro+/Premium subscribers have all 5 colors". | 1 / 7 / 7 / 7 / 7 | loosened (5 → 7) |
| Second-based alerts | 2020-02-17 blog: Premium only. | ✗ ✗ ✗ ✓ ✓ | unchanged (Premium+) |
| Volume candles, Time Price Opportunities (chart types) | Launched 2024-04-04 and 2024-04-11 as "Premium subscription or higher". | ✗ ✗ ✗ ✓ ✓ | unchanged |
| Multi-condition alerts | Help Center: "Available with the Plus plan and above". | ✗ ✗ ✓ ✓ ✓ | unchanged |
| Number of saved chart layouts | Doc 01/11 print 10 for Premium/Ultimate — an older or misread value; the HTML today draws ∞. 06 §3.1 notes third-party June-2026 comparisons already saying "Unlimited". | 1 / 5 / 10 / ∞ / ∞ | loosened at Premium+ (if the 10 was ever real — could not verify) |
| Plan names | Pro → Essential, Pro+ → Plus (Help Center text still says "PRO+ & Premium" in places — 08 §1). Expert dropped from the public table but still sold (`pro_expert`). | Basic · Essential · Plus · Premium · Ultimate | renamed |
| Prices | A third-party report dates a rise to 2026-04-10 (08 §2, could not verify the date). `priceValidUntil: 2026-10-06` in the page's schema.org data suggests the next review window. | $14.95 / $34.95 / $69.95 / ($119.95) / $239.95 monthly | up |

Practical rule: re-fetch the HTML (not a rendered scrape) before quoting any cell in a document that will be read months later, and check the `infinityIcon` / `crossIcon` classes rather than the text.

---

## What this means for OnStock

Re-checking spec §5.2 (the Free / Paid table) and §5.1 against the corrected numbers. Context: OnStock's data is GeckoTerminal token candles (1m–1D), delayed Yahoo stock OHLC, the gap series, Treasury yields and a tokenization news feed; it has watchlists/folders, price and gap-drift alerts, a Gap|Candles toggle, SMA/EMA/RSI, and routes trades to Jupiter.

1. **Adapt — spec §5.1's precedent sentence.** "That is also exactly how TradingView's own Basic plan is shaped (index item 16)" is false: TradingView gates intervals, four chart types, Volume Profile, auto patterns and bar depth *inside* the chart on Basic (§3.17). OnStock's never-gate-the-chart rule is right, but its reason is the Advanced Charts licence (§2.4, §2.7), not TradingView's example. Reword the sentence and index item 16 so the rule does not look like it rests on a misreading.
2. **Adopt — keep "Alerts (active): 3 price + 1 gap-drift" free.** TradingView Basic is confirmed at 3 price / 0 technical (`crossIcon`), and has been cut from 6 to 3 since June 2023. OnStock's free tier is deliberately one gap-drift alert more generous; no change.
3. **Adopt — keep webhook on the paid side.** "Webhook notifications" is ✗ on Basic and ✓ from Essential — the cheapest paid plan. Doc 07's "all plans" was wrong; the spec cell was right.
4. **Adopt — keep "Saved layouts: 1 / unlimited".** The table is 1 / 5 / 10 / ∞ / ∞; unlimited is the Premium+ reading and OnStock's single paid tier can simply be that. No change.
5. **Adopt — keep "Watchlists: 1 free / unlimited paid" and no symbol cap.** Confirmed 1 / ∞ lists and 30 / 1,000 symbols. With a universe of ~700 tokenized names, a 30-symbol free cap would bite real users; §7 Q7 already decided not to cap folders. No change.
6. **Adopt — keep exports paid, and note TradingView's two rungs.** Screener "Data export" is Essential+, chart "Download chart data" is Plus+. Doc 10's "free-tier feature everywhere" was a misread. Spec §5.2 puts both gap-series CSV and screener CSV on the paid side; keep, and if a second paid rung ever appears, chart export is the natural upper-rung item.
7. **Adopt — keep "Screener: 60 s free / 10 s paid".** Matches "1 min" vs "10 sec / 1 min" exactly.
8. **Adapt — spec §5.2 price wording.** Change "annual ≈17 % lower (TradingView's 'Save up to 17%')" to "annual 13–17 % lower (TradingView: Essential 13.4 %, Ultimate 16.7 %, badge 'Save up to 17%')". A $12.95 → ~$11 annual price is the like-for-like comparison, not $12.95 → $10.75.
9. **Adapt — consider native push free.** "Native push alerts notifications" is ✓ on Basic (doc 13's "paid plans" was a misread). Spec §5.2 lists push under paid ("+ push when native alerts exist"). Push is retention, costs nothing per user once built, and the cheapest competitor gives it away; move it to the free column when the Capacitor app gets native alerts.
10. **Adopt — "Alert duration: 1 month free / open-ended paid" is fine.** TradingView is 1 mo. / 2 mo. / 2 mo. / ∞ / ∞; OnStock's paid tier equals TradingView's Premium here, which is generous but consistent with item 4.
11. **Skip — nothing in the corrections adds a gate.** Every corrected cell (seconds/ticks, TPO, footprint, volume candles, auto patterns, deep backtesting, financial-metric alerts, second-based alerts, market-data add-ons, invite-only scripts) is on features OnStock already skips in §4. The errata change no adopt/skip decision.
12. **Adopt — "Support: docs + email free / priority paid" stays.** TradingView Basic cannot open a ticket at all; OnStock's free email support is a small, honest advantage worth stating on the pricing page.
13. **Skip — do not copy the alert cut.** TradingView reduced Basic alerts from 6 to 3 and removed technical alerts. OnStock's free tier should not be tuned downward to match; the licence argument (§5.1) and the beta users' expectations (§7 Q7) both point the other way.
14. **Adopt — cite 08 and this file, not 01/05/07/10/13, for any plan number.** 08's 109 cells all match the HTML; the others carry the misreadings listed in §4. When the spec's §5 is next edited, its footnotes should point at `08-plans-and-gating.md` and `15-pricing-table-reconciliation.md`.

---

## Sources

Read in full on 2026-09-06 (raw HTML via `curl`, or WebFetch):

- https://www.tradingview.com/pricing/ — raw HTML: comparison `<table>` (16 section rows, 109 feature rows, `checkIcon-kmq7zKYA` / `crossIcon-kmq7zKYA` / `infinityIcon-kmq7zKYA`, `title` tooltips), the card-style rendering (`-xEhUCIWO` classes), plan cards (`itemFeatures-nfEnZiMz`, `disableFeature-nfEnZiMz`), toggle and badge text, footnotes, `application/prs.init-data+json` → `shopconf.all_products` / `discounts`, schema.org `Product` "Expert"; also fetched rendered for the card prices and section order
- https://www.tradingview.com/support/solutions/43000480679-historical-intraday-data-bars-and-limits-explained/ — 5,000 / 10,000 / 20,000 / 25,000 (Expert) / 40,000 bars; daily "all available data"
- https://www.tradingview.com/support/solutions/43000692816-how-much-data-is-available-for-bar-replay/ — Essential 6 months × interval, Plus 1 year × interval, Premium/Expert/Ultimate all, Ultimate ticks 7 days
- https://www.tradingview.com/support/solutions/43000690941-how-to-get-more-active-alerts-per-subscription/ — Premium 800 (400 + 400), Ultimate 2000 (1000 + 1000)
- https://www.tradingview.com/support/solutions/43000696403-alerts-separation-by-type/ — Price vs Technical definitions; "802 alerts in total"
- https://www.tradingview.com/support/solutions/43000611193-how-many-symbols-can-i-add-to-the-watchlist/ — "no more than 1000 symbols"
- https://www.tradingview.com/support/solutions/43000694474-parallel-chart-connections/ — 200 connections; oldest tab closes
- https://www.tradingview.com/support/solutions/43000666265 — "How Deep Backtesting works": Premium and higher; 2 million bars / 1 million trades
- https://www.tradingview.com/support/solutions/43000579793 — "Calculation takes too long to execute": 20 s / 40 s / 100 s
- https://www.tradingview.com/support/solutions/43000693877-why-was-the-connection-closed/ — charts per tab incl. "10 charts in one layout for Expert plans"
- https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/ — "from 1 to 16 charts in the layout"
- https://www.tradingview.com/support/solutions/43000482917-how-can-i-see-several-charts-in-one-tab/ — no plan numbers
- https://www.tradingview.com/support/solutions/43000761492-multi-condition-alerts/ — "Available with the Plus plan and above … one technical alert"
- https://www.tradingview.com/support/solutions/43000762838-news-alerts/ — 1 news alert free, 10 flows paid
- https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/ — 2FA requirement; no plan stated
- https://www.tradingview.com/support/solutions/43000739708-watchlist-alerts-your-trading-edge/ — no plan stated
- https://www.tradingview.com/support/solutions/43000537255/ — "How to export chart data"; no plan stated
- https://www.tradingview.com/support/solutions/43000762068-what-are-second-based-intervals/ — 1/5/10/15/30/45 s; no plan stated
- https://www.tradingview.com/support/solutions/43000709225-what-are-tick-based-intervals/ — 1T/10T/100T/1,000T; no plan stated
- https://www.tradingview.com/support/solutions/43000543883-custom-chart-intervals-personalizing-your-analysis/ — no plan stated
- https://www.tradingview.com/support/solutions/43000758617-advanced-intraday-chart-types/ — Renko/Kagi/Line Break/P&F; no plan stated
- https://www.tradingview.com/support/solutions/43000724995-understanding-volume-candle-charts/ — no plan stated
- https://www.tradingview.com/support/solutions/43000726164-volume-footprint-charts-a-complete-guide/ — "1 tick (for professional plans)" only
- https://www.tradingview.com/support/solutions/43000725590-time-price-opportunity-charts-explained/ — no plan stated
- https://www.tradingview.com/support/solutions/43000713306-time-price-opportunity-tpo-indicator/ — no plan stated
- https://www.tradingview.com/support/solutions/43000543048-what-are-indicator-templates/ — no count stated
- https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/ — no counts stated
- https://www.tradingview.com/support/solutions/43000482573-what-are-the-different-types-of-published-scripts/ — "Invite-Only script publishing is available to Premium users only"
- https://www.tradingview.com/support/solutions/43000611543-how-to-open-multiple-app-windows/ — "as many windows … as you need"
- https://www.tradingview.com/support/solutions/43000474024-how-do-i-turn-bar-replay-on/ — mechanics only; no plan stated
- https://www.tradingview.com/support/solutions/43000475470-bar-replay-doesn-t-work-there-is-no-replay-toolbar/ — unsupported chart types only
- https://www.tradingview.com/support/solutions/43000590947-self-help-resources-for-free-users/ — "I can't write a ticket…"
- https://www.tradingview.com/blog/en/multi-monitor-support-free-on-desktop-app-31209/ — 2022-04-27, free plan multi-monitor, v1.0.6+
- https://www.tradingview.com/blog/en/more-alerts-for-each-plan-31701/ — 2023-03-13, "Basic — 2, Pro — 40, Pro+ — 200, Premium — 800"; June 2023 Basic "5 price alerts and 1 technical alert"
- https://www.tradingview.com/blog/en/flagged-lists-improved-9521/ — 2018-10-29, red only free, 5 colours Pro/Pro+/Premium
- https://www.tradingview.com/blog/en/alerts-for-second-resolutions-16646/ — 2020-02-17, Premium only
- https://www.tradingview.com/blog/en/new-chart-type-volume-candles-43863/ — 2024-04-04, Premium or higher
- https://www.tradingview.com/blog/en/time-price-opportunity-chart-type-43965/ — 2024-04-11, Premium and above

Seen only as search-result excerpts (not relied on for any cell): a Help Center line "The 'Bar Replay' mode works only for time-frames greater than daily in free accounts" (article not identified; the two replay articles fetched do not contain it) and a line "Users with free subscriptions can save 1 custom indicator template, while users with paid subscriptions can enjoy unlimited number of custom templates" (source article not identified; 43000543048 does not contain it). Both agree with the table but are marked page-only above.

Repo files read: `docs/research/2026-09-06/tradingview/00-teardown-index.md`, `01-supercharts-anatomy.md`, `02-chart-settings-dialog.md`, `03-drawing-tools.md`, `04-indicators-and-strategies.md`, `05-watchlist-and-symbol-search.md`, `06-layouts-and-multichart.md`, `07-alerts.md`, `08-plans-and-gating.md`, `09-interactions-and-shortcuts.md`, `10-screeners-heatmaps-news.md`, `11-appearance-and-theming.md`, `12-trading-panel-and-brokers.md`, `13-account-settings-and-notifications.md`, `docs/research/2026-09-06/onstock-desktop-spec.md` (§5, §7).
