# 08 — Plans and feature gating

TradingView teardown, surface 8 of 13. Read date: 2026-09-06.

Scope: which plans exist, what each costs, and exactly which features are held back at each tier. Everything here comes from the public pricing page (fetched twice: once rendered, once as raw HTML so every table row and tooltip could be read), the Help Center, TradingView's own blog, and the Advanced Charts licence agreement. Third-party review sites were consulted only to confirm names; where they disagree with TradingView's own pages, TradingView's pages win and the disagreement is noted.

How to read the tables: option names are quoted exactly as TradingView labels them. "Yes" / "No" reproduce the check-mark and cross icons on the comparison table. "∞" reproduces the infinity icon. A blank means the row was not present for that plan. "Could not verify" means no TradingView-authored page stated it.

---

## 1. The plan ladder — verified names

TradingView's public pricing page has **five** columns:

| Column on pricing page | Internal product id (from the page's `shopconf` data) | Notes |
|---|---|---|
| **Basic** | (none — free account) | The free plan. The page's tagline for it: "Free, until you're ready". Third-party sites call it "Free"; TradingView's own column header is "Basic". |
| **Essential** | `pro` | The old "Pro" plan, renamed. Trial button: "Try free for 30 days". |
| **Plus** | `pro_realtime` | The old "Pro+" plan, renamed. Trial button: "Try free for 30 days". |
| **Premium** | `pro_premium` | Name unchanged. Trial button: "Try free for 30 days". |
| **Ultimate** | `pro_premium_expert` | Trial button: "Try free for 14 days". Footnote under the cards: "Only the Ultimate plan is available for professional users. Learn more about who qualifies as a professional." |

**About "Expert".** The task asked to verify an Expert tier. Findings:

- It is **not a column** on the public comparison table today (Basic / Essential / Plus / Premium / Ultimate only).
- It **does exist as a product** in the pricing page's embedded shop configuration: id `pro_expert`, name "Expert", description "TradingView Expert Account", flag `"is_expert": true`, price `cost: 119.95`, `cost_annual: 99.95`. The page also emits a schema.org `Product` for "Expert" at `price: 119.95`. Discount SKUs exist for it (`expert_60_discount`, `expert_70_discount`, `expert_80_blackfriday_2025`).
- Several Help Center articles still describe "Professional plans (Expert and Ultimate)" with Expert-specific limits: **25,000 historical intraday bars** and a **60-second** calculation limit (see §4 and §6).
- The professional-status article says a professional user "will need the Ultimate plan" and never mentions Expert.

Reading: Expert is a real, purchasable SKU aimed at professional-status accounts but is no longer marketed on the comparison table; it sits between Premium and Ultimate. Third-party sites quoting Expert at "$199.95/mo" and a further "Elite" tier **could not be verified** on any TradingView page; the on-page data says $119.95 / $99.95 and there is no "Elite" product in the shop config.

**Enterprise.** Below the cards: "Enterprise plans — Need 100+ subscriptions? Get in touch to find the best option for your business." No price.

**Legacy names you will still meet in Help Center text:** "Pro" (= Essential), "Pro+" (= Plus). One export article still says "available on PRO+ & Premium plans".

---

## 2. Prices

Source: the pricing page's `shopconf` data (`cost` = monthly billing, `cost_annual` = per-month price when billed annually) and the visible card text ("Special price: $12.95 / mo billed annually — Save $24 a year", etc.). The annual toggle reads "Annually — Save up to 17%".

| Plan | Monthly billing | Annual billing (per month) | Annual total (computed: ×12) | Page's stated saving | Trial |
|---|---|---|---|---|---|
| **Basic** | $0 | $0 | $0 | — | n/a ("No credit card needed" is not on the page; the card just shows "$0") |
| **Essential** | $14.95 | $12.95 | $155.40 | "Save $24 a year" | 30 days |
| **Plus** | $34.95 | $29.95 | $359.40 | "Save $60 a year" | 30 days |
| **Premium** | $69.95 | $59.95 | $719.40 | "Save $120 a year" | 30 days |
| **Expert** (hidden SKU) | $119.95 | $99.95 | $1,199.40 | not shown | `expert_trial_length: 14` in shop config (could not verify a visible button) |
| **Ultimate** | $239.95 | $199.95 | $2,399.40 | "Save $480 a year" | 14 days |

Notes:

- USD, GBP and EUR carry the same numerals (e.g. `cost_GBP: 14.95`, `cost_EUR: 14.95`). Other currencies are priced separately in the shop config (INR, KRW, BRL, PLN, SEK, etc.).
- Promotional SKUs exist on the page: "Essential Early Bird" (30% and 40% annual discounts, `offer_type: early_access`), "Plus Early Bird" (40%), and Expert discounts up to 80% (Black Friday 2025). These are offer mechanisms, not list prices.
- Tax line on the page: "TradingView, Inc. is registered for sales tax purposes in certain countries. As a result, depending on your location, a sales tax could be added to your final bill."
- A third-party report that TradingView raised prices on 2026-04-10 is consistent with the current numbers ($14.95/$34.95/$69.95/$239.95 monthly) but the date itself **could not be verified** on a TradingView page.

### 2.1 Billing mechanics (pricing-page FAQ, verbatim where quoted)

| Topic | What TradingView says |
|---|---|
| Payment methods | "Acceptable payment methods include all major credit cards, PayPal accounts, Apple Pay, and crypto payments. Additionally, on our mobile apps, you can use any payment method supported by the App Store or Google Play." |
| Crypto | "you can pay for both monthly and annual plans using cryptocurrency — either directly or via Binance Pay. Payments are securely processed by Triple-A." Select the "Crypto" tab on the Order page. |
| Payment processors named | Braintree (a PayPal company), Checkout, Razorpay, dLocal, Triple-A. "TradingView does not store any of your payment credentials." |
| Cancel | "You can cancel your subscription anytime and it will not auto-renew after the current paid term. Paid service will remain active for the duration of the paid term. A canceled trial will stop immediately after cancellation." |
| Refunds | "Refunds are available for annual plans only and must be requested within 14 calendar days of payment... There are no refunds for upgrades to a more expensive plan, monthly plans or market data, even if the subscription is cancelled on the same day as the payment has gone through. Please note that users who filed a chargeback/dispute request or a claim are not eligible for a refund." The Help Center adds: refunds are also possible "within 14 days of the automatic renewal of your annual subscription plan"; App Store purchases "can be refunded only by the store"; Google Play purchases can be refunded via the store or TradingView. |
| Upgrade (annual) | "All remaining days of your current plan will be automatically converted into equivalent value days on the new tier... the remaining period of your subscription will be reduced and your next payment date will be switched." |
| Downgrade | "your current plan will stay exactly as it is until its subscription date. Then, once it expires, your new downgraded plan will go live at the selected rate." |
| Trial rules (Help Center) | One trial per user. Cancel at Settings and billing → Subscriptions → Cancel trial. You can switch a running trial up to Ultimate, "however, if the number of days remaining in the lower-level trial is over or equals 14, you will have only 14 days on the Ultimate level." Downgrading an Ultimate trial to a lower plan is not permitted. Mobile-app trials can only be changed on the platform where they were started. |
| Mobile-store subscriptions | Cannot be managed on the website; cancel auto-renewal in Google Play / App Store. |

---

## 3. Charts group (pricing table section "Charts")

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Where it lives / what it does |
|---|---|---|---|---|---|---|
| Charts per tab | 1 | 2 | 4 | 8 | 16 | The multi-chart layout picker on the top toolbar ("Layout setup" in the layouts guide). Cards phrase it "2 charts per tab", "16 charts per tab". |
| Number of saved chart layouts | 1 | 5 | 10 | ∞ | ∞ | Saved layouts (the layout name menu, top toolbar). |
| Custom time intervals | No | Yes | Yes | Yes | Yes | "+ Add custom interval…" at the bottom of the "Chart interval" dropdown; or type minutes directly (max typed value 1,440 minutes per the time-intervals article, seen in a search excerpt). Cards call it "Custom timeframes". |
| Second-based intervals | No | No | No | Yes | Yes | "Chart interval" dropdown, or type `1S`, `10S`. Intervals: 1, 5, 10, 15, 30, 45 seconds. "available for the most liquid symbols, including stocks, indices, cryptocurrencies, and futures." |
| Tick-based intervals | No | No | No | No | Yes | Intervals 1T, 10T, 100T, 1,000T. Not for indices without volume, options, TVC: bonds/yields, end-of-day symbols; continuous futures only current + previous contract. Do not support Renko / Line Break / Kagi / P&F. |
| Intraday Renko, Kagi, Line Break, Point & Figure charts | No | No | Yes | Yes | Yes | Chart-type menu; these types on intraday intervals only (daily+ is open to all). |
| Custom range bars | No | Yes | Yes | Yes | Yes | Chart-type menu → Range with a custom range value. |
| Intraday charts based on custom formulas (spreads) | No | No | Yes | Yes | Yes | Symbol search accepts expressions (e.g. `AAPL/MSFT`); intraday intervals on those need Plus+. Cards call it "Charts based on custom formulas". |
| Download chart data | No | No | Yes | Yes | Yes | Upper-toolbar dropdown → "Download chart data…" → pick chart → "Download". CSV. "The data you export is what your chart shows you." Cards call it "Chart data export". |
| Customizable chart types | 17 | 17 | 17 | 21 | 21 | Count of chart styles in the chart-type menu. |
| Compare symbols | Yes | Yes | Yes | Yes | Yes | "Compare" button, top toolbar. |
| Dividend-adjusted charts | Yes | Yes | Yes | Yes | Yes | "ADJ" toggle, bottom-right of chart. |
| Interactive earnings, splits and dividends | Yes | Yes | Yes | Yes | Yes | Tooltip: "Companies report earnings, issue dividends, and sometimes do stock splits... we've laid them on top of the price for easy viewing." |
| Historical annual financial data on charts | 7 years | 20 years | 20 years | 20 years | 20 years | Financials-on-chart series depth. |
| Historical quarterly financial data on charts | 8 years | 8 years | 8 years | 8 years | 8 years | Same. |
| Extended trading hours | Yes | Yes | Yes | Yes | Yes | "ETH" button bottom-right of intraday charts, or Settings → Symbol tab. "Not all exchanges have Extended Hours data" — if none, the ETH button is hidden. **Not plan-gated.** |
| Simultaneous chart connections | 2 | 10 | 20 | 50 | 200 | "Each tab you open... counts as one connection." At the cap "the oldest connection automatically closes" with a pop-up; a "Restore connection" option exists but "will terminate the connection in another tab." Cards call it "parallel chart connections". |

---

## 4. Bar Replay group (pricing table section "Bar Replay")

Bar Replay itself (the "Replay" button on the top toolbar) is available on **every plan including Basic** for daily-and-higher data; the plan ladder governs how far back intraday replay reaches.

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Tooltip / Help Center detail |
|---|---|---|---|---|---|---|
| Historical data by day and higher timeframes | All | All | All | All | All | "On daily and higher timeframe charts, we display all available data that we have. Our Bar Replay mode uses this same data as well." |
| Historical data by the minute | No | 180 days | 365 days | All | All | Essential: "6 months of 1-minute data, 12 months of 2-minute data, 18 months of 3-minute data, and so on" (window = 6 months × interval in minutes; 5-min = 30 months, 15-min = 90 months). Plus: 1 year × interval (2-min = 2 years, 15-min = 15 years). Premium+: "all intraday data available in TradingView's data storage" (AAPL 1-minute reaches back to January 2000). |
| Historical data by the second | No | No | No | All | All | "all seconds-based data available in TradingView's data storage, starting from August 2022" (Help Center: 17 August 2022; continuous futures and some synthetic symbols capped at 30 days). |
| Historical data by the tick | No | No | No | No | 7 days | "Get access to 7 days of 1-tick data." |
| Indicators Replay | Yes | Yes | Yes | Yes | Yes | Indicators recalculate as replay advances. |
| Trading in Bar Replay | Yes | Yes | Yes | Yes | Yes | Paper-trade inside replay. |

Help Center phrasing worth keeping: "Premium and professional plans (Expert and Ultimate) provide even more historical intraday data for Bar Replay and allow you to play absolutely all time-based data available in TradingView's data storage." A blog post titled "Bar Replay gets a precision upgrade: 1-second update interval available" appeared in search results with a "Premium and higher" claim; the post itself was not read, so treat that gating as **could not verify**.

---

## 5. Technical analysis group

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Notes |
|---|---|---|---|---|---|---|
| 400+ pre-built most popular indicators | Yes | Yes | Yes | Yes | Yes | "Indicators" button, top toolbar. |
| 100K+ community-powered indicators | Yes | Yes | Yes | Yes | Yes | Same dialog, "Community" tab. |
| Indicator on indicator | 1 | 1 | 9 | 24 | 49 | Apply an indicator to another indicator's output (indicator's "More" menu → "Add indicator/strategy on…"). Not every indicator supports it. |
| Indicators per chart | 2 | 5 | 10 | 25 | 50 | Tooltip: "Free accounts support up to 2 indicators per chart, Essential supports 5, Plus handles 10, and Premium accounts unlock up to 25 indicators per chart!" |
| Financials per chart | 1 | 4 | 7 | 10 | 25 | Financials overlays (Indicators dialog → "Financials"). |
| Custom indicator templates | 1 | ∞ | ∞ | ∞ | ∞ | Indicators dialog → "Templates". |
| 110+ smart drawing tools | Yes | Yes | Yes | Yes | Yes | Left drawing toolbar. |
| Volume Profile indicators | No | Yes | Yes | Yes | Yes | Session Volume Profile, Session Volume Profile HD, Fixed Range Volume Profile, Visible Range Volume Profile, Anchored Volume Profile — plus drawing-tool versions (Fixed range volume profile, Anchored volume profile). Historical depth follows "Historical bars available". |
| Time Price Opportunities | No | No | No | Yes | Yes | TPO chart style. |
| Volume footprint | No | No | No | Yes | Yes | Footprint chart style. |
| Volume candles | No | No | No | Yes | Yes | Chart style. |
| Pine Script® | Yes | Yes | Yes | Yes | Yes | Pine Editor, bottom panel. |
| Candlestick patterns recognition | Yes | Yes | Yes | Yes | Yes | Built-in indicators. |
| Auto fib retracement | Yes | Yes | Yes | Yes | Yes | Built-in indicator. |
| Multi-timeframe analysis | Yes | Yes | Yes | Yes | Yes | Indicator inputs can use a different timeframe. |
| Time limit for making calculations | 20s | 40s | 40s | 40s | 100s | Per-script compute budget; overrun shows "Calculation takes too long to execute". Help Center adds **Expert: 60 seconds**. |
| Auto chart patterns | No | No | No | Yes | Yes | Pattern-recognition indicators. |

---

## 6. Data group (pricing table section "Data") — including historical bars

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Notes |
|---|---|---|---|---|---|---|
| Fastest data flow | No | Yes | Yes | Yes | Yes | Paid plans get the faster update stream. |
| Maximum market data subscriptions allowed | No | 2 | 4 | 6 | ∞ | Number of real-time exchange add-ons an account may hold (see §11). Basic cannot buy any. |
| Historical bars available | 5K | 10K | 10K | 20K | 40K | Intraday bars loaded on a chart. Help Center: 5,000 (Basic), 10,000 (Essential/Plus), 20,000 (Premium), **25,000 (Expert)**, 40,000 (Ultimate); "these limits cannot be extended for now due to technical reasons"; a few bars are added back to the start of the week/month/year. Daily and higher: "We display all available data for daily-based intervals." |
| Dedicated backup data feed | No | Yes | Yes | Yes | Yes | Tooltip: "a dedicated redundant data server with a separate hosting provider." |
| Financials (fundamental stock data) | Yes | Yes | Yes | Yes | Yes | |
| Global economic data | Yes | Yes | Yes | Yes | Yes | |
| Real-time context news | Yes | Yes | Yes | Yes | Yes | |
| Hotlists | Yes | Yes | Yes | Yes | Yes | |
| Economic and earnings calendars | Yes | Yes | Yes | Yes | Yes | |
| Yield Curves | Yes | Yes | Yes | Yes | Yes | |

Related, from the "Strategy backtesting" section: "Deep backtesting" (Premium+) runs on "all data available in TradingView's data storage" with a hard cap of "2 million bars" per calculation, independent of the chart's bar limit.

---

## 7. Strategy backtesting group

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Basic report metrics | Yes | Yes | Yes | Yes | Yes |
| Advanced report metrics | No | Yes | Yes | Yes | Yes |
| Export trades in CSV | No | Yes | Yes | Yes | Yes |
| Export report in XLSX | No | Yes | Yes | Yes | Yes |
| Deep backtesting | No | No | No | Yes | Yes |
| High detalization of historical bars | No | No | No | Yes | Yes |
| Each history tick execution | No | No | No | Yes | Yes |

All live in the "Strategy Tester" bottom panel.

---

## 8. Watchlists group

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Notes |
|---|---|---|---|---|---|---|
| Number of watchlists | 1 | ∞ | ∞ | ∞ | ∞ | Cards call it "Multiple watchlists". |
| Symbols per watchlist | 30 | 1,000 | 1,000 | 1,000 | 1,000 | Help Center: "Watchlist can contain no more than 1000 symbols." |
| Flagged symbols colors | 1 | 7 | 7 | 7 | 7 | The flag colour next to each symbol. |
| Import/export | No | Yes | Yes | Yes | Yes | Watchlist menu → Import list… / Export list… |
| Custom columns and sorting | Yes | Yes | Yes | Yes | Yes | |

**"Enhanced watchlists"**: no row with that label exists on the pricing page. The nearest things are (a) the Help Center's "Watchlist advanced view mode" (click "the pie chart icon in the upper right corner" of the watchlist; adds fundamentals, performance, risk, technicals, earnings, dividends and news tabs) — the article states **no plan requirement**; and (b) "Active watchlist alerts" (Premium 2 / Ultimate 15, §9). Whether anything is marketed as "enhanced watchlists" **could not be verified**.

---

## 9. Alerts group

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Notes |
|---|---|---|---|---|---|---|
| Active price alerts | 3 | 20 | 100 | 400 | 1,000 | Definition: alert uses "only a symbol... and a price value" with condition Crossing / Crossing Up / Crossing Down / Greater Than / Less Than. |
| Active technical alerts on indicators, strategies, and drawings | No | 20 | 100 | 400 | 1,000 | Definition: uses "an overlay symbol, indicator, drawing or strategy", or Entering/Exiting/Inside/Outside Channel, Moving Up/Down (or %), or has multiple conditions. |
| Active watchlist alerts | No | No | No | 2 | 15 | One alert applied to every symbol on a list; "The alert will still trigger if you add a new symbol to the watchlist after creating the alert." |
| Alert durations | 1 mo. | 2 mo. | 2 mo. | ∞ | ∞ | Cards call ∞ "Alerts that don't expire". |
| Webhook notifications | No | Yes | Yes | Yes | Yes | Alert dialog → Notifications → "Webhook URL". |
| Multi-condition alerts | No | No | Yes | Yes | Yes | Several conditions in one alert. |
| Alerts on financial metrics | No | No | Yes | Yes | Yes | |
| Second-based alerts | No | No | No | Yes | Yes | Tooltip: "Get real-time alerts on a second-based chart... get notified when they happen each second." |

Each type is counted independently, so Premium's 400 + 400 + 2 gives "up to 802 total alerts simultaneously". History: the blog post "More alerts for each plan" (2023-03-13) split the single limit into price and technical categories (Basic 2 → later 6, Pro 40, Pro+ 200, Premium 800); the Help Center page "How to get more active alerts per subscription" still lists "Premium — 800 active alerts (400 price + 400 technical)" and "Ultimate — 2000 (1000 + 1000)". Today's table shows Basic at 3 price / 0 technical. News alerts (search excerpt from the "News alerts" article, not read in full): 1 for free users, up to 10 flows on paid plans — **could not verify** directly.

---

## 10. Everything else on the pricing table

### Portfolios

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Number of portfolios | 1 | 3 | 4 | 5 | 7 |
| Holdings per portfolio | 20 | 50 | 75 | 100 | 150 |
| Transactions per portfolio | 2,000 | 5,000 | 5,000 | 5,000 | 5,000 |

### Fundamental Graphs

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Date ranges | Up to 5y | Up to 5y | Up to 5y | All | All |

### Screeners

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Stock, ETF, DEX, crypto screeners | Yes | Yes | Yes | Yes | Yes |
| 150+ exchanges from 50+ countries | Yes | Yes | Yes | Yes | Yes |
| 500+ fundamental and technical fields | Yes | Yes | Yes | Yes | Yes |
| Multiple markets | Yes | Yes | Yes | Yes | Yes |
| Chart view mode | Yes | Yes | Yes | Yes | Yes |
| Watchlists as filters | Yes | Yes | Yes | Yes | Yes |
| Flagged symbols colors | 1 | 7 | 7 | 7 | 7 |
| Screeners with auto refresh | 1 min | 10 sec / 1 min | 10 sec / 1 min | 10 sec / 1 min | 10 sec / 1 min |
| Data export | No | Yes | Yes | Yes | Yes |
| Timeframes | D W M | All | All | All | All |
| Pine Screener | No | No | No | Yes | Yes |

### Trading

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Trade through selected brokers | Yes | Yes | Yes | Yes | Yes |
| Simulated (paper) trading | Yes | Yes | Yes | Yes | Yes |
| Chart trading | Yes | Yes | Yes | Yes | Yes |
| Depth of Market (DOM) trading | Yes | Yes | Yes | Yes | Yes |
| Active community contests | No | 3 | 5 | 10 | 25 |
| Ability to create public contests | No | No | No | Yes | Yes |

### Social

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Exclusive badge next to your name | No | Yes | Yes | Yes | Yes |
| Signature and Website fields | No | No | No | Yes | Yes |
| Publish invite-only indicators | No | No | No | Yes | Yes |
| Publish protected scripts | No | Yes | Yes | Yes | Yes |
| Publish public ideas and scripts | No | Yes | Yes | Yes | Yes |
| Video ideas | No | Yes | Yes | Yes | Yes |
| Minds | No | Yes | Yes | Yes | Yes |
| Comments on public ideas and scripts | No | Yes | Yes | Yes | Yes |

### Ad-free

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Charts | No | Yes | Yes | Yes | Yes |
| Social network | No | Yes | Yes | Yes | Yes |

So: **Basic shows ads on charts and on the social feed; every paid plan is ad-free** (cards: "No ads"). Two side doors exist: the Help Center says "You can enjoy a clean charting experience without ads if your broker has a Platinum plan" (broker-sponsored ad removal), and the "Ad blocker detected" article confirms free charting "is supported by ads" — free users must allow ads or upgrade.

### Mobile apps

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Always at your fingertips | Yes | Yes | Yes | Yes | Yes |
| Fully synced — 100% | Yes | Yes | Yes | Yes | Yes |
| Native push alerts notifications | Yes | Yes | Yes | Yes | Yes |
| Android and iOS Widgets | Yes | Yes | Yes | Yes | Yes |

### Desktop app (multiple monitors / tabs)

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Desktop experience | Yes | Yes | Yes | Yes | Yes |
| Native multi-monitor support | Yes | Yes | Yes | Yes | Yes |
| Tab linking by symbol between windows | Yes | Yes | Yes | Yes | Yes |

Multi-monitor was paid until the blog post "Multi-monitor support now free on desktop app" (2022-04-27): it "removes the limit on open windows" for free-plan users; needs desktop v1.0.6+; new window via Ctrl/Cmd+N or by detaching a tab; works with "Tab Linking and Crosshair Sync". Help Center: "You can open as many windows of TradingView Desktop as you need" and windows/positions are restored on launch if you use Exit rather than closing each window. The practical cap on tabs is "Simultaneous chart connections" (§3), not a window limit.

### Support

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Customer support | No | Regular | Priority | Priority | First Priority |

Tooltip: "Paid subscribers can send questions to customer support team at any moment. Our specialists respond to all inquiries during business hours: Monday - Friday, 4 AM - 3 PM EST." Free users are pointed at "Self-help resources for free users". Cards call Ultimate's level "First priority support".

---

## 11. Real-time market data add-ons (per exchange, professional vs non-professional)

This is a **second price list layered on top of the plan**, because exchanges charge per-user fees that TradingView passes through.

**What is free by default**

- Cryptocurrency exchanges: real-time, no charge (Help Center: "Cryptocurrency exchanges provide real-time data without additional charges").
- US stocks: real-time from **Cboe** by default on every plan, including Basic — "It doesn't have any per-user fees imposed by the exchange, meaning you can use it in real-time without paying for it." Caveat from the same article: Cboe volume is lower than the primary exchanges, so 1-minute charts, thin tickers and pre/post-market can look different and update less often.
- Everything else that carries exchange fees (NASDAQ, NYSE, NYSE Arca, OTC, CME, most non-US stock exchanges) is **delayed** unless bought.

**How add-ons work**

- Pricing-page FAQ: "All extra real-time and intraday data for exchanges — NASDAQ, NYSE, NYSE ARCA, OTC, CME, etc. — are available to be added separately to your account. To add data, you first need to have one of our paid plans or to be a trial member."
- Per-account cap = "Maximum market data subscriptions allowed" (Essential 2, Plus 4, Premium 6, Ultimate ∞; Basic none).
- Purchase path (Help Center): Avatar → Settings and billing → Subscriptions → Real-time market data; or the Market Data page; or click "Learn more" on a chart's "Data is delayed" banner.
- Billing: monthly per exchange, on top of the plan. "There are no refunds for... market data." Purchased data "is only available on the TradingView website" — it does **not** flow to embedded TradingView widgets.
- Example package actually priced on a TradingView page: the **"US Stock Markets"** bundle at "$9.95 per month" for "non-professional subscribers only" — NYSE stocks and ETFs, NYSE Arca stocks and ETFs, NASDAQ stocks and ETFs, NASDAQ GIDS indices, OTC Markets stocks ("You save $7.05 per month" versus buying separately). Older blog example (2018): FWB/Xetra $8/mo, BCBA $10/mo. A general per-exchange price list was not captured; third-party sites quote "$2–$10 per month" per exchange for non-professionals, which **could not be verified** on a TradingView page.

**Professional vs non-professional**

- Help Center definitions: professional usage "relates to general business activity where market data is used to make investment decisions on behalf of an employer, or engages in trading between businesses or entities. Additionally, any user registered with a financial regulatory body (e.g. FINRA, NFA, CSA etc) is also considered a professional." Non-professional "presumes that a person uses TradingView and market data only for their own personal investment decisions" and requires an individual (not a business) who is not subscribing as a principal, officer, partner, employee or agent of any business. There are eleven conditions; failing any one makes you professional.
- Consequence: "Professional users must purchase professional market data subscriptions" at exchange-set professional rates, and only the **Ultimate** plan is offered to them ("Only the Ultimate plan is available for professional users"; "you'll need the Ultimate plan"). The Ultimate card lists "Ability to buy professional market data".
- Status is self-declared and editable: Settings and billing → Subscriber status → "Update".
- Professional data rates were not published on any page read; third-party claims of "5 to 80 times the retail rate" **could not be verified**.

---

## 12. The Advanced Charts licence — why charts cannot be paywalled

OnStock today renders with **Lightweight Charts** (`lightweight-charts ^5.2.1` in `package.json`; `src/components/CandleChart.jsx`), which is open source under Apache 2.0 and carries none of the conditions below. They apply only if OnStock ever moves to **Advanced Charts** (the "Charting Library") or the **Trading Platform**.

From the "Free Advanced Charts Agreement", version **v.0626.FAC** (the PDF linked from the docs):

- **§2.4 "Implementations (Free Offering Only)"** — "This license is intended for Implementations as a public access service (as a free offering only, and whether account registration is required or not), and not for private, personal or internal uses (such as blogs, research papers, or other unpublished media). To enable TradingView to monitor and verify compliance with this Agreement, Client will provide TradingView with free, unlimited access to any services, products, websites, or applications that include an Implementation, in a manner that permits TradingView to view the Implementation as Client's other clients and users do."
- **§2.7 "No Login"** — the client may display the library on a public website "available to any visitor without the need to login", and must tell users in its terms that they may not reuse content commercially.
- **§2.2** — the client hosts the library itself and "integrate[s] the Client's own Market Data feed streaming and history"; TradingView supplies no data.
- **§2.5** — the library must not be placed in any public code repository, and projects using it must not be open source in a way that exposes the library code; anyone the integration is distributed to needs their own licence.
- **§2.11 "Marketing Requirements"** — the client must show TV Branding on its site (§3.2) **and** publish at least one blog post/news article announcing the partnership or another TradingView-approved placement with a contextual backlink.
- **§3.2 "TV Branding"** — attribution link to tradingview.com, never altered or obscured, "without any nofollow, ugc, or sponsored link attributes".
- **§4.2** — either party may terminate on sixty (60) days' written notice; **§4.4** — on termination all licences end and the client "will immediately discontinue its Implementations".

The docs' Introduction page compresses this to: Advanced Charts is "available for free provided that the TradingView attribution remains visible and the implementation environment is public (not for private use or behind a paywall)". The "Free Charting Libraries" page adds that Advanced Charts and Trading Platform licences "are only available to companies for use in public web projects and/or applications" — not to individuals for "personal use, hobbies, studies, or testing" — and that "our source code is not provided" (unlike Lightweight Charts, "open-source under the Apache 2.0 license").

What the agreement does **not** say: it never defines "free offering" beyond the words above, and it never enumerates which features around the chart may be paid. The only safe reading is that the chart, as presented to any visitor, must be usable without paying and without a mandatory login. Anything narrower (e.g. "the chart is free but 1-minute history is paid") is an interpretation TradingView would have to bless in writing; the contact given is platforms@tradingview.com.

---

## What this means for OnStock

Context assumed: OnStock's data is GeckoTerminal token candles (1m/5m/15m/1h/4h/1D), delayed Yahoo stock OHLC, the gap series, Treasury yields and a tokenization news feed; it already has watchlists/folders, alerts (price + gap drift), a Gap|Candles toggle, SMA/EMA/RSI, and routes trades to Jupiter. Its known cost driver is upstream API quota (the roadmap measured Finnhub's shared 60 calls/minute), not rendering.

1. **Adopt — a genuinely complete free tier.** TradingView's Basic column has every chart type, every indicator, extended hours, bar replay on daily data, compare, paper trading, the desktop app and multi-monitor. It gates *quantity*, not *capability*. OnStock's free desktop should show the full gap chart, both candle sets, all timeframes and the three indicators; a crippled free chart is both bad practice and a future licence problem.
2. **Adopt — gate counts, not features: alerts.** TradingView's cleanest lever is 3 → 20 → 100 → 400 → 1,000 active alerts, split into "price" and "technical" pools with independent counters. OnStock's two alert kinds (price, gap drift) map directly: e.g. free = 3 price + 1 gap-drift, paid = far more. Counting is enforced server-side (Vercel functions), never inside the chart, so it is clause-safe.
3. **Adopt — alert lifetime and delivery as paid perks.** "Alert durations" (1 mo. free → ∞ paid) and "Webhook notifications" (paid only) are outside the chart and cheap to build. Webhooks for gap-drift alerts would be a real reason for a desk user to pay.
4. **Adopt — watchlist shape.** "Number of watchlists: 1 / ∞" and "Symbols per watchlist: 30 / 1,000" is the exact pattern. OnStock already has folders; cap free at one folder of ~30 tokenized names (the whole tokenized-stock universe is small today, so pick a free cap that still fits it) and lift the cap when paid.
5. **Adapt — saved layouts and charts per tab.** "Number of saved chart layouts 1/5/10/∞" and "Charts per tab 1/2/4/8/16" are the desktop-shaped gates. For OnStock: free = 1 chart, 1 saved layout; paid = 2–4 charts (token vs stock side by side, or two issuers of the same company) and unlimited layouts. Keep the *single* chart fully free.
6. **Adapt — refresh cadence instead of "chart connections".** TradingView charges for "Simultaneous chart connections" (2 → 200) and "Screeners with auto refresh" (1 min free vs 10 sec paid). OnStock's equivalent cost is polling; a slower free poll (e.g. 60 s) and a faster paid one (e.g. 10–15 s) on the gap table/screener is defensible and matches the roadmap's need to protect API quota. Do not slow the chart's own candle loading — keep that identical across tiers.
7. **Adapt — history depth, carefully.** "Historical bars available 5K/10K/20K/40K" and the intraday-replay windows (180 d / 365 d / All) are TradingView's most profitable gates, but they live *inside the chart*. On Lightweight Charts this is fine today; under Advanced Charts it is the grey zone. If adopted, gate only the *bulk download/export* of deep history (see next item) and get written confirmation before gating on-chart depth.
8. **Adopt — export as a paid feature.** "Download chart data" (Plus+), "Export trades in CSV", "Data export" on screeners — all paid on TradingView. A CSV export of the gap series and token/stock candles is exactly the kind of thing a quant-curious user pays for, and it is a button beside the chart, not the chart.
9. **Skip — real-time data add-ons and the professional/non-professional regime.** These exist because exchanges charge per-user fees. OnStock's DEX candles are free real-time and its stock data is delayed Yahoo; there is nothing to resell. Revisit only if OnStock ever licenses exchange data, at which point the eleven non-professional conditions and pro-rate data become mandatory, not optional.
10. **Skip — second/tick intervals, TPO/footprint, deep backtesting, Pine.** GeckoTerminal's floor is 1 minute, and these features are irrelevant to a gap tracker. Do not invent tiers around them.
11. **Skip — ads.** "Ad-free" is Essential's headline benefit because Basic carries ads. OnStock has no ads and should not add them to create an upsell; it would cost trust with a security-cautious audience for pennies.
12. **Adapt — the ladder itself.** Five tiers exist to price-discriminate across 100 million users. OnStock needs two: Free and one paid plan roughly in Essential/Plus territory ($10–$30/mo), with an annual price around 17% lower (TradingView's "Save up to 17%"), a 30-day trial, cancel-anytime, and a plain refund rule. Add an "Enterprise / contact us" line only when a desk actually asks.
13. **Adopt — support as a tier line.** "Customer support: — / Regular / Priority / First Priority" with published hours costs nothing to promise on a two-tier product: free = docs and email, paid = priority reply.
14. **Adopt — the clause-proof monetization already in the roadmap.** The Jupiter integrator fee ("the fee switch", roadmap §2.3) is revenue that never touches the chart and is unaffected by any charting licence. It should be the first lever, with the paid tier second.
15. **Skip — moving to Advanced Charts unless a specific feature demands it.** Lightweight Charts has no attribution, no marketing obligation (§2.11 requires a partnership blog post and backlink), no 60-day termination exposure (§4.2) and no free-offering clause (§2.4). Every gate in this list works on the current library; the case for switching would have to be a feature, not price.

---

## Sources

TradingView pages read in full (WebFetch and/or raw HTML):

- https://www.tradingview.com/pricing/ — plan cards, comparison table (all sections and tooltips), FAQ, tax note, `shopconf` product/price data, schema.org Product entries, trial buttons
- https://www.tradingview.com/support/solutions/43000473385-i-d-like-to-learn-more-about-different-subscription-plans/ — points to the pricing page
- https://www.tradingview.com/support/solutions/43000677382-what-is-the-difference-between-professional-and-non-professional-subscriptions/ — professional/non-professional definitions; Ultimate for professionals
- https://www.tradingview.com/support/solutions/43000715287-how-can-i-change-my-subscriber-status-professional-non-professional/ — Settings and billing → Subscriber status → Update
- https://www.tradingview.com/support/solutions/43000471705-how-to-purchase-additional-market-data/ — add-on purchase path; crypto free; Cboe default
- https://www.tradingview.com/support/solutions/43000473924-is-us-stock-market-data-free-by-default/ — Cboe real-time free; primary exchanges paid
- https://www.tradingview.com/us-markets-bundle — "US Stock Markets" bundle, $9.95/mo, non-professional only
- https://www.tradingview.com/blog/en/market-data-affordable-now-6477 — 2018 per-exchange price examples
- https://www.tradingview.com/support/solutions/43000692816-how-much-data-is-available-for-bar-replay/ — replay windows per plan; seconds from Aug 2022; ticks 7 days on Ultimate
- https://www.tradingview.com/support/solutions/43000480679-historical-intraday-data-bars-and-limits-explained/ — 5K/10K/20K/25K (Expert)/40K bars
- https://www.tradingview.com/support/solutions/43000668210-how-much-data-is-available-for-deep-backtesting/ — 2 million-bar cap
- https://www.tradingview.com/support/solutions/43000762068-what-are-second-based-intervals/ — 1/5/10/15/30/45 s; menu path
- https://www.tradingview.com/support/solutions/43000709225-what-are-tick-based-intervals/ — 1T/10T/100T/1,000T; exclusions
- https://www.tradingview.com/support/solutions/43000543883-custom-chart-intervals-personalizing-your-analysis/ — "+ Add custom interval…"
- https://www.tradingview.com/support/solutions/43000502023-i-want-to-access-extended-hours-data/ — ETH button; Settings → Symbol
- https://www.tradingview.com/support/solutions/43000537255/ — "Download chart data…", CSV
- https://www.tradingview.com/support/solutions/43000611193-how-many-symbols-can-i-add-to-the-watchlist/ — 1,000 symbols
- https://www.tradingview.com/support/solutions/43000771546-watchlist-advanced-view-mode/ — pie-chart icon; no plan gate stated
- https://www.tradingview.com/support/solutions/43000739708-watchlist-alerts-your-trading-edge/ — watchlist alert behaviour
- https://www.tradingview.com/support/solutions/43000690941-how-to-get-more-active-alerts-per-subscription/ — Premium 800 / Ultimate 2000
- https://www.tradingview.com/support/solutions/43000696403-alerts-separation-by-type/ — price vs technical definitions; 802 example
- https://www.tradingview.com/blog/en/more-alerts-for-each-plan-31701/ — 2023 alert split
- https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/ — layouts usage (no plan numbers)
- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/ — no plan gating stated
- https://www.tradingview.com/support/solutions/43000579793/ — calculation limits 20/40/40/40/(60 Expert)/100 s
- https://www.tradingview.com/support/solutions/43000694474-parallel-chart-connections/ — connection counting; 200 cap; "Restore connection"
- https://www.tradingview.com/support/solutions/43000611543-how-to-open-multiple-app-windows/ — unlimited desktop windows
- https://www.tradingview.com/blog/en/multi-monitor-support-free-on-desktop-app-31209 — free since 2022-04-27
- https://www.tradingview.com/support/solutions/43000754968-ad-free-trading-on-the-chart/ — broker Platinum ad removal
- https://www.tradingview.com/support/solutions/43000471709-i-would-like-to-cancel-my-free-trial/ — cancel trial path
- https://www.tradingview.com/support/solutions/43000587245-i-have-a-trial-but-i-want-to-switch-my-trial-plan-how-can-i-do-this/ — trial switching rules
- https://www.tradingview.com/support/solutions/43000485430-i-ve-paid-for-a-subscription-and-would-like-to-get-a-refund/ — store refund rules
- https://www.tradingview.com/support/solutions/43000471716-i-was-billed-automatically-for-1-year-and-would-like-to-have-a-refund/ — 14-day annual-renewal refund
- https://www.tradingview.com/support/solutions/43000765990/ — "Is there a cost for using TradingView?" (broker-integration article; confirms optional paid plans)
- https://www.tradingview.com/support/solutions/43000481029/ — fetched while locating the plans article; it is about strategies on non-standard chart types and was not used
- https://s3.amazonaws.com/tradingview/charting_library_license_agreement.pdf — "Free Advanced Charts Agreement" v.0626.FAC (§§2.2, 2.4, 2.5, 2.7, 2.11, 3.2, 4.2, 4.4 quoted)
- https://www.tradingview.com/charting-library-docs/latest/introduction/ — "not for private use or behind a paywall"
- https://www.tradingview.com/charting-library-docs/latest/getting_started — redirect stub to Introduction
- https://www.tradingview.com/free-charting-libraries/ — companies only; Lightweight Charts Apache 2.0; platforms@tradingview.com
- https://www.tradingview.com/advanced-charts/ — marketing page ("Free and feature-rich"); no licence text

Seen only as search-result excerpts (not read in full; claims from them are marked "could not verify" above):

- https://www.tradingview.com/support/solutions/43000747934-time-intervals-a-quick-introduction-and-tips/ (1,440-minute typed maximum)
- https://www.tradingview.com/support/solutions/43000762838-news-alerts/ (1 vs 10 news alerts)
- https://www.tradingview.com/blog/en/1-second-update-interval-in-bar-replay-53338 (Premium+ 1-second replay)
- Third-party pricing round-ups used only to cross-check names and the April 2026 price change: stockbrokers.com, chartwisehub.com, quantroutine.com, financialtechwiz.com, chartinglens.com, brokerchooser.com

Repo files consulted for the OnStock section: `package.json` (`lightweight-charts ^5.2.1`), `src/components/CandleChart.jsx`, `src/state/AlertsContext.jsx`, `src/state/FoldersContext.jsx`, `docs/roadmap.md` (Finnhub 60 calls/min; "fee switch").
