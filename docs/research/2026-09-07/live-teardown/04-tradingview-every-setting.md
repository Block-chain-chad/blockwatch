# TradingView — every settings panel, opened and read live

Date: 2026-09-07, logged out, no account created. This closes the gaps the Help-Center pass left as *could not verify*.

## How I got in without an account

The chart **ships with the Volume indicator already applied**. So there is no need to add an indicator in order to open an indicator's settings — the signup wall only guards the *community* script library (100,000+ public scripts), not the built-ins and not any settings dialog.

Three working entry points, all free:
1. **Double-click a plot** → that indicator's Settings dialog.
2. **Right-click the legend** → the status-line context menu, whose last item is **Settings…** → the full Chart Settings dialog.
3. **Hover the legend row** → the inline eye / settings / remove / more buttons appear.

What stays gated logged out: community scripts, saved layouts, indicator templates, saved alerts, and anything with a server side.

---

## 1. Per-indicator Settings — verified

Dialog title is the indicator's own name ("Vol"). Three tabs: **Inputs · Style · Visibility**. Footer: **Defaults ▾ · Cancel · Ok**.

### Inputs
Generated from the script's declared inputs. For Volume:
- **MA Length** `20` (number field)
- ☐ **Color based on previous close** (checkbox)

### Style
- ✔ **Volume** — per plot: checkbox, **colour swatch with an opacity slider**, and a **plot-style** control
  - **Growing** [green + opacity]
  - **Falling** [red + opacity]
- ☐ **Volume MA** — [colour + opacity] [line-style control]
- **OUTPUT VALUES**
  - **Precision** `Default ▾`
  - ✔ **Labels on price scale**
  - ✔ **Values in status line**
- **INPUT VALUES**
  - ✔ **Inputs in status line**

### Visibility — *this was "could not verify" before; now confirmed*
Eight interval families, each a checkbox plus a **from–to numeric range with a dual slider**:

| Family | Default range |
|---|---|
| Ticks | (checkbox only) |
| Seconds | 1 – 59 |
| Minutes | 1 – 59 |
| Hours | 1 – 24 |
| Days | 1 – 366 |
| Weeks | 1 – 52 |
| Months | 1 – 12 |
| Ranges | (checkbox only) |

### Defaults ▾
Exactly two items: **Reset settings** · **Save as default**.

**For OnStock:** the shape to copy is Inputs (the params the catalogue already declares) + a trimmed Style (colour, line width, precision, "values in legend"). Skip Visibility — OnStock has six timeframes, not eight families. Copy **Save as default / Reset settings**; it is two lines of localStorage and it is the difference between setting a length once and setting it every time.

---

## 2. Chart Settings — all seven tabs

Reached by right-clicking the legend → **Settings…**, or the toolbar gear. Left nav: **Symbol · Status line · Scales and lines · Canvas · Trading · Alerts · Events**. Footer: **Template ▾ · Cancel · Ok**.

### Symbol
- **CANDLES**: ☐ Color bars based on previous close · ✔ Body [up/down swatches] · ✔ Borders [up/down] · ✔ Wick [up/down]
- **DATA MODIFICATION**: ☐ Adjust data for dividends ⓘ · **Precision** `Default ▾` · **Timezone** `UTC ▾`

### Status line
- **INSTRUMENT**: ✔ Logo · ✔ **Title** `Name ▾` · ✔ Chart values · ✔ Bar change values · ☐ Volume · ☐ Last day change values · ✔ **Buy/sell buttons** *("Displays buy and sell buttons directly on the chart")*
- **INDICATORS**: ✔ **Titles** → ✔ **Inputs** (nested under Titles) · ✔ **Values**
- ✔ **Background** with an opacity slider

The same set appears as the legend's right-click menu: Symbol title · Chart values · Bar change values · Volume · Last day change values · Show Buy/Sell buttons · Indicator titles · Indicator inputs · Indicator values · Settings…

**For OnStock:** the nesting is the insight — *Titles* has *Inputs* as a child, so you choose between `RSI`, `RSI 14`, and `RSI 14 51.94` independently. The legend built this session always prints all three.

### Scales and lines
- **PRICE SCALE**: Currency and Unit `Visible on mouse over ▾` · Scale modes (A and L) `Visible on mouse over ▾` · ☐ Lock price to bar ratio `0.8306635` · Scales placement `Auto ▾`
- **PRICE LABELS & LINES**: ✔ No overlapping labels · ✔ Plus button ⓘ · ✔ **Countdown to bar close** · **Symbol** `Value, line ▾` + colour + `Value according to s… ▾` · **Indicators and financials** `Value ▾` · **Pre/post/night market** `Value, line ▾` with **three separate colour swatches** · **High and low** `Hidden ▾` · **Bid and ask** `Hidden ▾`
- **TIME SCALE**: ✔ Day of week on labels

**Two findings that matter to OnStock.** First, *Countdown to bar close* is a first-class setting — OnStock ships this already, which is a rare case of being ahead. Second, **TradingView separates pre-market, post-market and *night* market as three distinct, separately-coloured states.** `lib/market.js` models four sessions (pre / regular / post / closed), and "closed" is doing double duty for both the overnight window and the weekend. For a 24/7 token charted against a 9:30–4:00 share, the overnight session is precisely when the gap is most interesting and least explicable — it deserves to be its own state with its own colour, not to be lumped in with Saturday.

### Canvas
- **CHART BASIC STYLES**: Background `Solid ▾` + swatch · ✔ Vertical grid lines · ✔ Horizontal grid lines · Crosshair (colour + style) · Watermark `Replay mode ▾`
- **SCALES**: Text [colour] `12 ▾` · Lines [colour]
- **BUTTONS**: Navigation `Visible on mouse over ▾` · Pane `Visible on mouse over ▾`
- **MARGINS**: Top `10 %` · Bottom `8 %` · **Right `10 bars`**

The right margin is measured **in bars**, not pixels — which is what keeps the last candle off the edge at every zoom. OnStock sets `rightOffset: 2`; TradingView's default is 10.

### Trading
- **GENERAL**: ✔ Buy/sell buttons · ☐ **One-click trading** ⓘ *("Instantly place, edit, cancel orders, or close positions without confirmation")* · ☐ Execution sound [volume] `Alarm Clock ▾` · ☐ Show only rejection notifications
- **APPEARANCE**: ✔ Positions and orders ⓘ → ☐ **Reverse position button** *("Adds the reverse button next to the open position on the chart")* · ✔ **Project order for market orders** *("Shows a project order on the chart before sending a market order")* · ✔ **Profit and loss value** → ✔ Positions `Money ▾`, ✔ Brackets `Money ▾` · ✔ Execution marks ⓘ → ☐ Execution labels · ✔ Extended price lines across the entire chart width

This is the whole "trade on the chart" surface that Robinhood Legend also leads with. Note **P&L shown in `Money ▾`** — the same money-versus-percent choice recommended for OnStock's gap readout.

### Alerts
- **CHART LINE VISIBILITY**: ✔ Alert lines [colour] · ✔ Only active alerts
- **NOTIFICATIONS**: ✔ Alert volume [slider] · ✔ Automatically hide toasts ⓘ

Alerts draw a **line on the chart at the trigger price**. OnStock's alerts are invisible on the chart — a drift threshold has no mark anywhere. A horizontal line at the price target is nearly free and makes the alert legible.

### Events
☐ **Ideas** `All ideas ▾` ⓘ · ✔ **Dividends** · ✔ **Splits** · ✔ **Earnings** → ☐ Earnings breaks · ✔ **Latest news** · ☐ News notification

These are the small glyphs on the time axis. **OnStock already has earnings data and a news feed** and draws neither on the chart. Marking earnings dates and news on the gap chart is a genuine "why did it move" feature built from data already in hand.

---

## 3. The drawing rail — the scale of the hole

Each of the ~15 rail buttons opens a flyout of related tools. Opening just **one** of them (Trendline) gives 17 tools in three groups, each with a keyboard shortcut:

**LINES** — Trendline `Alt+T` · Ray · Info line · Extended line · Trend angle · Horizontal line `Alt+H` · Horizontal ray `Alt+J` · Vertical line `Alt+V` · Crossline `Alt+C`
**CHANNELS** — Parallel channel · Regression trend · Flat top/bottom · Disjoint channel
**PITCHFORKS** — Pitchfork · Schiff pitchfork · Modified Schiff pitchfork · Inside pitchfork

The rail's top level, for reference: Cross · Trendline · Fib retracement · XABCD pattern · Long position · Brush · Text · Icon · Measure · Zoom · Magnet mode · Keep drawing · Lock drawings and indicators · Hide all drawings · Remove objects.

OnStock has **zero** drawing tools. A first pass of **Trendline, Horizontal line, Text and Measure** — four of the seventeen in one flyout — covers most of what anyone actually draws, and each needs only mouse capture plus a persisted `{type, points, style}` per asset.

---

## 4. The right-hand panel, seen live

Opening **Watchlist, details and news** gives a stacked column, not a single widget:

- **Watchlist** grouped by section — INDICES (SPX, NDQ, DJI, VIX, DXY), STOCKS (AAPL, TSLA, NFLX), FUTURES (USOIL, GOLD…) — with columns **Symbol · Last · Chg · Chg%**
- Below it, a **Details** panel for the selected symbol: name, exchange, sector/industry, big price with change, session state (**✳ Holiday**), and **"Last update at Sep 4, 16:59 GMT-7"**
- **✦ Key facts** — an AI-written paragraph with a **Keep reading ›** link. On AAPL: *"Apple (AAPL) hosts Sept 9 keynote at Apple Park. Traders: expected reveals include foldable iPhone, iPhone 18 Pro/Max, Siri AI updates, Apple Watch Series 12/Ultra 4, and AirPods 5."*
- **Key stats** — Next earnings report (in 52 days) · Volume · Average Volume (30D) · …

**For OnStock:** two things. The watchlist is **grouped by category with headers**, which OnStock's flat list is not — and OnStock already has categories (Stocks / ETFs / Bonds) sitting in filter chips instead. And the Details panel puts **session state and last-update time next to the price**, which OnStock computes but shows only in the chart legend.
