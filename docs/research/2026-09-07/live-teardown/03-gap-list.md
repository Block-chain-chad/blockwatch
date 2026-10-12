# OnStock vs TradingView and Robinhood — what to build, ranked

Date: 2026-09-07. This is the point of the exercise. Sources: `01-tradingview-indicators-dialog.md`, `02-robinhood.md`, and the 19-file Help-Center teardown at `docs/research/2026-09-06/tradingview/`.

Ranked by **value per unit of work**, not by how impressive it sounds. Everything in Tier 1 needs no new data source, no paid plan, and no purchase.

---

## Tier 1 — free, no new data, do these first

### 1. Write the "Tokenized stocks explained" Learn track
**Cost: writing only. No code.**

Nobody has written this. Robinhood's Learn library has five tracks and not one covers what a tokenized stock actually is. Meanwhile Robinhood's own prospectus says Stock Tokens are *"tokenised debt securities … economic exposure … do not grant investors any legal or beneficial rights in, or against the issuer of, those underlying securities."*

Cards, titled as questions the way Robinhood titles theirs:
- *What is a tokenized stock?*
- *Do I own the actual share?* — the honest answer, quoting the issuers' own language
- *Why does the token price differ from the share price?* — this is the app
- *What happens when the market is closed?* — already modelled in `lib/market.js`
- *Who can actually buy these?* — the US-person restriction
- *What is a stablecoin? What are gas fees?*

This is the single best thing on the list. It is the app's thesis, it differentiates from both competitors, and it costs a weekend of writing.

### 2. Say the gap in money, at a size the reader picks
**Cost: small. One component, no new data.**

Robinhood's crypto page leads with a table of *how much crypto you'd actually receive* on each venue at $10 / $100 / $1,000. Not basis points — units and dollars.

OnStock shows `+0.85%`. The stronger sentence is **"on $1,000 of NVDA, buying the token instead of the share costs you $8.50 right now."** Same number, expressed as money, at a size the reader chose. Add a $100 / $1k / $10k toggle to the gap panel.

### 3. Candlestick patterns
**Cost: moderate maths, zero new data. Highest impressiveness-to-effort ratio on the list.**

TradingView ships **49** of them. Each is a handful of comparisons on one to three bars of OHLC we already have — Hammer, Engulfing, Doji, Morning/Evening Star, Three White Soldiers, Harami, Marubozu, Tweezer, Tasuki Gap. They render as a marker on the bar, so no new pane, no new scale, no settings dialog.

### 4. Finish the indicator work already started
**Cost: ~1 day.** Two pieces:
- **The settings dialog.** The catalogue and legend shipped this session, but a row's parameters cannot be edited — you get SMA 20 or nothing. TradingView's dialog is Inputs / Style / Visibility; OnStock needs Inputs (length, source) and Style (colour, line width) to be useful. This also unlocks two SMAs at different lengths, which the dialog currently refuses for exactly this reason.
- **~50 more indicators for free.** Every one of these is OHLCV-only maths on data already loaded: Donchian, Keltner, Momentum, Awesome Oscillator, CCI, Williams %R, Money Flow Index, Stochastic RSI, TRIX, DEMA, TEMA, SMMA, Hull MA, VWMA, BB %b, BB BandWidth, Historical Volatility, Ulcer Index, DPO, PPO, Price Volume Trend, Accumulation/Distribution, Balance of Power, Chaikin Money Flow, Ease of Movement, Elder Force Index, Envelope, Parabolic SAR, Supertrend, Volatility Stop, Chandelier Exit, Zig Zag, Median, Choppiness, Chop Zone, Mass Index, Vortex, DMI, ADX, Aroon, Ultimate Oscillator, TSI, Relative Vigor, Relative Volatility, Coppock, KST, Chande Momentum, Connors RSI, Fisher Transform.

11 → ~60 indicators with no new dependency.

### 5. Drawing tools
**Cost: real, but it is the biggest single hole.**

OnStock has **none**. TradingView's left rail, as enumerated live: Cross, Trendline, Fib retracement, XABCD pattern, Long position, Brush, Text, Icon, Measure, Zoom, Magnet mode, Keep drawing, Lock drawings, Hide all drawings, Remove objects.

The founder's own words: *"it's like tradingview because you should be able to mark up the chart."* Right now you cannot mark up the chart at all. A first pass of **trendline, horizontal line, text, and measure** covers most of what people actually draw.

### 6. Fix the wallet-connect ladder
**Cost: ~30 lines. Already scoped.**

`TradeButton` sends you to Jupiter even when Phantom is installed in the browser. It never offers to connect. "Connect wallet" exists in exactly one place — buried in the Profile sheet. Add the middle rung.

---

## Tier 2 — worth doing, needs a bit of plumbing

### 7. Scroll back through history on any timeframe
**Already scoped.** Token side fetches exactly 300 bars once; the stock side a fixed window. `api/candles.js` does not accept a `before_timestamp` cursor at all. Needs the proxy to take a bar-grid-quantised cursor (so it does not mint unbounded edge-cache keys), the services to page and prepend, and the chart to fetch near the left edge.

### 8. Dynamic linking between panes
Robinhood Legend's best idea: *"Link widgets to create synced groups. Instantly update symbols across layouts, tabs, even multiple monitors."* OnStock's panes already share one asset implicitly. Making the link explicit — and letting a pane opt out, so the gap panel can stay pinned to NVDAx while you browse other charts — is what turns three regions into one instrument.

### 9. `/api/coingecko` proxy
The last upstream still called directly from the browser. It is why the console fills with 429s. Copy the `api/rates.js` pattern.

### 10. Make "Trades on" answer a real question
Today: three static pills. Should be: each venue linked to that token's page there, with 24h volume and pool liquidity — which GeckoTerminal already returns for the pools we chart. "Where can I trade this, and is there depth?"

### 11. Layout presets
Legend ships templates *"optimized for stock trading, options trading, or market monitoring."* OnStock's equivalent: a **Gap watch** preset and a **Chart focus** preset. Cheap once the shell can save a layout.

---

## Tier 3 — blocked on money or an outside party

### 12. Server-side alerts
Designed already. **Blocked on Vercel Pro ($20/mo)** — Hobby cron cannot run more than once a day and a more frequent schedule fails deployment. Note that Robinhood groups *"custom price alerts"* under **Advanced trading tools**, which supports treating this as a flagship feature rather than plumbing.

### 13. Track Robinhood Chain Stock Tokens
Robinhood is issuing tokenized NVDA, GOOGL and AAPL on its own Arbitrum L2. That is a third issuer alongside xStocks/Backed and Ondo, and its gap against the real share is exactly OnStock's number. Blocked on whether a public onchain price feed exists for them yet — worth checking, not worth assuming.

### 14. Read the Robinhood MCP tool schemas before designing any order flow
This workspace has Robinhood MCP tools available (`get_equity_quotes`, `get_option_chains`, `get_watchlists`, `create_alert`, `place_equity_order`, `review_equity_order` …). That is the same API surface their Agentic Trading product exposes, and reading it shows the real data model for an order ticket — order types, review step, tradability checks — without an account. Do this before building OnStock's own trade flow.

---

## Explicitly not recommended

- **Strategy backtesting.** TradingView ships 23 built-in strategies and a Strategy Tester. A backtester makes implicit performance claims; that is a regulatory surface a solo founder without an entity should not walk into.
- **The fundamentals library.** TradingView exposes **310** fundamental metrics. They describe the *company*. OnStock's question is the gap between a token and its share — a different question. The handful that matter are already in Key Statistics.
- **Volume profiles.** Need per-price-level volume, which GeckoTerminal's OHLCV does not carry. An approximation from bar closes would be a guess dressed as a measurement.
- **Pine Script / community scripts.** 150,000 user scripts is a moat built over a decade, and it requires a script engine, a sandbox, and moderation.

---

## Appendix — every control in TradingView's chart, enumerated live

Captured from the running product's accessibility tree, logged out. This is the "every button" inventory.

**Top toolbar:** Symbol search · Switch data type · Compare symbols · Interval (1 day) · Chart type (Candles) · **Indicators, metrics, and strategies** · Indicator templates · Create alert · Bar replay · Undo · Redo · Layout setup · Save all charts · Manage layouts · Quick search · Settings · Fullscreen mode · Take a snapshot · Publish · Share your idea with the trade community

**Left drawing rail:** Cross · Trendline · Fib retracement · XABCD pattern · Long position · Brush · Text · Icon · Measure · Zoom in · Magnet mode *("snaps drawings placed near price bars to the closest OHLC value")* · Keep drawing · Lock drawings and indicators · Hide all drawings · Remove objects

**On the chart:** Change symbol · Change interval · a data-provenance button reading *"Holiday · One update every 5 seconds · NASDAQ by Cboe One"* · Hide indicator legend

**Bottom bar:** nine range presets, each of which sets a range *and* an interval — *1 day in 1 minute intervals* · *5 days in 5 minutes* · *1 month in 30 minutes* · *3 months in 1 hour* · *6 months in 2 hours* · *Year to date in 1 day* · *1 year in 1 day* · *5 years in 1 week* · *All data in 1 month* — plus **Go to** (jump to a date), **Timezone**, and **Adjust data for dividends**

**Right sidebar:** Watchlist, details, and news · Alerts · Object tree and data window · Screeners · Pine · Calendars · Community · Notifications · Products · Help Center

Two details worth copying cheaply:
- **Range presets carry an interval.** TradingView's "3M" means *3 months in 1 hour bars*. OnStock's range chips change the window but not the bar length, which is why a year of 5-minute bars is a request nobody wants. Binding the two is a small change with a real payoff.
- **The provenance button is a control, not a caption.** *"Holiday · One update every 5 seconds · NASDAQ by Cboe One"* is clickable. OnStock already computes all three of those facts for the legend — session, refresh rate, source — and shows them as static text.
