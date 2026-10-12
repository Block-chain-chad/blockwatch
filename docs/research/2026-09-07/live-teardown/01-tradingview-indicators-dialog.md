# TradingView — Indicators dialog, clicked through live

Date: 2026-09-07. Method: opened `tradingview.com/chart/` in a browser **logged out**, clicked every control, and harvested each list by scrolling the virtualised container. Everything below is what the running product showed, not what the Help Center says. Where the two disagree, the live UI wins and the disagreement is called out.

## Where it differs from the Help Center docs (docs/research/2026-09-06/tradingview/04)

| Doc said | Live shows | Note |
|---|---|---|
| Categories: Favorites, Personal, Technicals, **Financials**, Community, Invite-only | PERSONAL: *My scripts*, *Purchased* · BUILT-IN: *Technicals*, **Fundamentals** · COMMUNITY: *Editors' picks*, *Top*, *Trending*, **Marketplace** | "Financials" is **Fundamentals**; **Purchased** and **Marketplace** are not in the docs at all; Favorites and Invite-only do not appear logged out |
| Financials had 4 sub-tabs | Fundamentals has **5**: Income statement, Balance sheet, Cash flow, Statistics, **Forecasts** | Forecasts (analyst estimates) is undocumented |
| — | Column header reads **SCRIPT NAME** under Technicals, **METRIC NAME** under Fundamentals | |
| — | Two entries carry a **BETA** tag: Auto Key Levels, Auto Trendlines. Auto Trend Detector carries **BETA** and **NEW** | |

The dialog is reachable logged out and every built-in can be applied without an account.

## Counts

| Tab | Entries |
|---|---|
| Technicals › Indicators | **128** |
| Technicals › Strategies | **23** |
| Technicals › Profiles | **8** |
| Technicals › Patterns | **18 chart patterns + 49 candlestick patterns** |
| Fundamentals › Income statement | 53 |
| Fundamentals › Balance sheet | 90 |
| Fundamentals › Cash flow | 45 |
| Fundamentals › Statistics | 92 |
| Fundamentals › Forecasts | 30 |

OnStock ships **11**. That is the honest scale of the gap on this one surface.

## Technicals › Indicators (all 128, verbatim, alphabetical as listed)

24-hour Volume · Accumulation/Distribution · Advance Decline Line · Advance Decline Ratio · Advance/Decline Ratio (Bars) · Arnaud Legoux Moving Average · Aroon · Aroon Oscillator · Auto Fib Extension · Auto Fib Retracement · Auto Key Levels *(BETA)* · Auto Pitchfork · Auto Trendlines *(BETA)* · Average Daily Range · Average Directional Index · Average True Range · Awesome Oscillator · Balance of Power · BBTrend · Bollinger Bands · Bollinger Bands %b · Bollinger BandWidth · Bollinger Bars · Bull Bear Power · Chaikin Money Flow · Chaikin Oscillator · Chande Kroll Stop · Chande Momentum Oscillator · Chandelier Exit · Chop Zone · Choppiness Index · Commodity Channel Index · Connors RSI · Coppock Curve · Correlation Coefficient · Cumulative Volume Delta · Cumulative Volume Index · Detrended Price Oscillator · Directional Movement Index · Donchian Channels · Double EMA · Ease of Movement · Elder Force Index · Envelope · Fisher Transform · Gaps · Historical Volatility · Hull Moving Average · Ichimoku Cloud · Kaufman's Adaptive Moving Average · Keltner Channels · Klinger Oscillator · Know Sure Thing · Least Squares Moving Average · Linear Regression Channel · MA Cross · Mass Index · McGinley Dynamic · Median · Momentum · Money Flow Index · Moon Phases · Moving Average Convergence Divergence · Moving Average Exponential · Moving Average Ribbon · Moving Average Weighted · Multi-Time Period Charts · Negative Volume Index · Net Volume · On Balance Volume · Open Interest · Parabolic SAR · Percentage Price Oscillator · Percentage Volume Oscillator · Performance · Pivot Points High Low · Pivot Points Standard · Positive Volume Index · Price Momentum Oscillator · Price Target · Price Volume Trend · Pring's Special K · Rank Correlation Index · Rate Of Change · RCI Ribbon · Relative Strength Index · Relative Vigor Index · Relative Volatility Index · Relative Volume at Time · Rob Booker - Intraday Pivot Points · Rob Booker - Knoxville Divergence · Rob Booker - Missed Pivot Points · Rob Booker - Reversal · Rob Booker - Ziv Ghost Pivots · RSI Divergence Indicator · Seasonality · Simple Moving Average · SMI Ergodic Indicator · SMI Ergodic Oscillator · Smoothed Moving Average · Stochastic · Stochastic Momentum Index · Stochastic RSI · Supertrend · Technical Ratings · Time Weighted Average Price · Trading Sessions · Trend Strength Index · Triple EMA · TRIX · True Strength Index · Ulcer Index · Ultimate Oscillator · Up/Down Volume · Visible Average Price · Volatility Stop · Volume · Volume Delta · Volume Weighted Average Price · Volume Weighted Moving Average · Vortex Indicator · VWAP Auto Anchored · Williams Alligator · Williams Fractals · Williams Percent Range · Woodies CCI · Zig Zag

**Which of these OnStock already has:** Simple Moving Average, Moving Average Exponential, Moving Average Weighted, Volume Weighted Average Price, Bollinger Bands, Average True Range, Relative Strength Index, Stochastic, Moving Average Convergence Divergence, Rate Of Change, On Balance Volume. That is 11 of 128.

**Cheapest real additions from what we already compute** (all are OHLCV-only, no new data source): Donchian Channels, Keltner Channels, Momentum, Awesome Oscillator, Commodity Channel Index, Williams Percent Range, Money Flow Index, Stochastic RSI, TRIX, Double EMA, Triple EMA, Smoothed Moving Average, Hull Moving Average, Volume Weighted Moving Average, Bollinger Bands %b, Bollinger BandWidth, Historical Volatility, Ulcer Index, Detrended Price Oscillator, Percentage Price Oscillator, Price Volume Trend, Accumulation/Distribution, Balance of Power, Chaikin Money Flow, Ease of Movement, Elder Force Index, Envelope, Parabolic SAR, Supertrend, Volatility Stop, Chandelier Exit, Zig Zag, Median, Choppiness Index, Chop Zone, Mass Index, Vortex Indicator, Directional Movement Index, Average Directional Index, Aroon, Aroon Oscillator, Ultimate Oscillator, True Strength Index, Relative Vigor Index, Relative Volatility Index, Coppock Curve, Know Sure Thing, Chande Momentum Oscillator, Connors RSI, Fisher Transform.

That is ~50 more indicators for **no new data**, on maths alone.

**Needs data we do not have:** anything breadth-based (Advance Decline Line/Ratio), Open Interest, Cumulative Volume Delta / Volume Delta / Up-Down Volume (needs tick or bid/ask-classified trades), Price Target and Seasonality (needs analyst + long history), Technical Ratings (a composite, but buildable once the components exist).

## Technicals › Strategies (23)

BarUpDn Strategy · Bollinger Bands Strategy · Bollinger Bands Strategy directed · ChannelBreakOutStrategy · Consecutive Up/Down Strategy · Greedy Strategy · InSide Bar Strategy · Keltner Channels Strategy · MACD Strategy · Momentum Strategy · MovingAvg2Line Cross · MovingAvg Cross · OutSide Bar Strategy · Parabolic SAR Strategy · Pivot Extension Strategy · Pivot Reversal Strategy · Price Channel Strategy · Rob Booker - ADX Breakout · RSI Strategy · Stochastic Slow Strategy · Supertrend Strategy · Technical Ratings Strategy · Volty Expan Close Strategy

Each of these runs a backtest and opens the Strategy Tester panel. OnStock has no backtesting concept at all. **Not recommended** — a backtester implies performance claims, which is a regulatory surface a solo founder should not walk into casually.

## Technicals › Profiles (8)

Time Price Opportunity · Session Time Price Opportunity · Auto Anchored Volume Profile · Fixed Range Volume Profile · Periodic Volume Profile · Session Volume Profile · Session Volume Profile HD · Visible Range Volume Profile

Volume profiles need per-price-level volume, which GeckoTerminal's OHLCV does not carry. A crude Visible Range profile could be approximated by bucketing bar closes weighted by bar volume — honest only if labelled as an approximation.

## Technicals › Patterns

**Chart patterns (18):** All Chart Patterns · Bearish Flag · Bullish Flag · Cup and Handle · Inverted Cup and Handle · Double Bottom · Double Top · Elliott Wave · Head and Shoulders · Inverted Head and Shoulders · Bearish Pennant · Bullish Pennant · Rectangle · Triangle · Triple Bottom · Triple Top · Falling Wedge · Rising Wedge · Auto Trend Detector *(BETA, NEW)*

**Candlestick patterns (49):** *All Candlestick Patterns* · Abandoned Baby (Bearish/Bullish) · Dark Cloud Cover · Doji · Doji Star (Bearish/Bullish) · Downside Tasuki Gap · Dragonfly Doji · Engulfing (Bearish/Bullish) · Evening Doji Star · Evening Star · Falling Three Methods · Falling Window · Gravestone Doji · Hammer · Hanging Man · Harami (Bearish/Bullish) · Harami Cross (Bearish/Bullish) · Inverted Hammer · Kicking (Bearish/Bullish) · Long Lower Shadow · Long Upper Shadow · Marubozu Black · Marubozu White · Morning Doji Star · Morning Star · On Neck · Piercing · Rising Three Methods · Rising Window · Shooting Star · Spinning Top (Black/White) · Three Black Crows · Three White Soldiers · Tri-Star (Bearish/Bullish) · Tweezer Bottom · Tweezer Top · Upside Tasuki Gap

**Candlestick patterns are pure single/multi-bar shape tests on OHLC we already have.** They are the single highest ratio of "looks impressive" to "cost to build" on this entire list — each is a handful of comparisons on 1–3 bars, and they render as a marker on the bar rather than needing a new pane.

## Fundamentals — the five tabs

Full metric lists captured; the headline is that TradingView exposes **310 fundamental metrics** as chartable series. OnStock shows a fixed Key Statistics table.

- **Income statement (53)** — Total revenue through EBITDA/EBIT, with every cost line broken out
- **Balance sheet (90)** — including every property/plant/equipment and accumulated-depreciation sub-line
- **Cash flow (45)** — operating/investing/financing, down to Free cash flow
- **Statistics (92)** — the ratio library: P/E, P/S, P/B, EV/EBITDA, margins, returns, turnover, plus scores (Altman Z, Piotroski F, Beneish M, KZ index, Fulmer H, Springate, Zmijewski, Graham's number, Tobin's Q)
- **Forecasts (30)** — analyst estimates for EPS, revenue, EBITDA, EBIT, net income, debt, book value, operating cash flow, FCF, capex, each in point / rolling / rolling multi-period form

**Relevance to OnStock:** low for now. These describe the *company*, and OnStock's thesis is the gap between a token and its share — a different question. The exception is that a handful (market cap, P/E, dividend yield) already appear in Key Statistics, and the Alpha Vantage MCP tools available in this workspace could serve more of them free if that ever becomes the point.
