# 01 — Supercharts anatomy, region by region

Teardown surface 1 of 13. Written 2026-09-06 for the OnStock desktop build ("on a PC it should be like TradingView").

**How to read this.** TradingView's own Help Center is the primary source for everything below; where the Help Center text did not state something, the entry says *could not verify* rather than guessing. Option names are quoted the way TradingView labels them. Plan names, as the pricing page shows them today, are **Basic** (free), **Essential**, **Plus**, **Premium**, **Ultimate**. There is no "Expert" tier on the pricing page any more, though two older Help Center articles still mention "professional plans (Expert and Ultimate)". Where a feature is gated, the gate comes from the pricing page's comparison table unless noted.

Other surfaces (indicators library, alerts dialog, screener internals, Pine, drawing-tool settings, watchlist internals, etc.) have their own researchers. This document stays on the *anatomy*: what sits where, what it is for, and how it hides, collapses and resizes.

---

## 0. The big picture

TradingView's own description of the page: "Superchart consists of three toolbars and a panel at the bottom, each with a unique purpose." (Getting started with Supercharts)

| Region | TradingView's one-line purpose (verbatim) | How it hides / resizes |
|---|---|---|
| **Upper toolbar** (top) | "Allows you to set up your chart by choosing symbols, chart types, indicators, layouts, etc." | Hidden in **Fullscreen mode** (button "next to the chart's settings"); otherwise always visible. |
| **Left toolbar** | "The Drawings panel with powerful built-in instruments" | Toggle: "click on menu in the upper left corner and show or hide the toolbar by changing the slider position." Also auto-hidden in Fullscreen mode. |
| **Right toolbar** | "Gives you access to watchlists, news, alerts, screeners, etc." | A strip of icons; clicking one opens that widget as a panel between the strip and the chart; clicking it again closes it. The Watchlist/Details pair inside the panel is split by a draggable divider ("Just drag it down to see the hidden sections"). |
| **Bottom panel** | "Allows you to switch between intervals, set the timezone, and customize the price scale" — that is the thin bottom *bar*. Above it, tools such as the Strategy Report open "at the bottom of the screen" as a collapsible panel. | The tool panel expands upward over the chart and is dragged by its top edge (third-party description; TradingView text confirms only that it "opens at the bottom"). |
| **Chart canvas** | "The bottom scale shows you the time and the right scale shows an asset's price." | Price scale and time scale each have their own settings; scale buttons sit "directly below the price scale". |

Two other things live *on* the canvas rather than in a toolbar: the **Status line** (the legend in the top-left of each chart: symbol, OHLC values, indicator values, and small buttons) and the **floating Data Window** tooltip (hold the left mouse button anywhere on the chart).

---

## 1. Upper (top) toolbar

Left to right, as the "Getting started with Supercharts" article walks it.

### 1.1 Symbol search

| Item | Detail (source: Getting started with Supercharts; Spread charts explained) |
|---|---|
| Label | The current symbol's ticker is itself the button. |
| Opens by | "There are two ways to open it: Click the symbol name. Start typing the symbol." |
| Categories | The Help Center lists the asset classes TradingView carries as Stocks, Funds and ETFs, Futures, Forex, Cryptocurrencies, Indices, Bonds, Options, Economic indicators. The exact tab labels inside the search dialog *could not verify* from Help Center text. |
| Spread syntax | Type an expression instead of a ticker: two symbols joined by `–`, `+`, `*` or `/` (example `AAPL / XAUUSD`). "A single spread can include no more than 10 unique symbols." Spread charts repaint (real-time bars from ticks, history from minutes) and "affects alerts set on spread charts". |
| Keyboard | "Change symbol — Start typing a symbol name." |

### 1.2 Data type switcher

Sits beside the symbol. "Provides access to technical indicators rating, seasonals, news, and trading ideas from other users." It swaps the chart pane for a different *view* of the same symbol (Technicals rating, Seasonals, News, Ideas). Exact tab labels beyond those four *could not verify*.

### 1.3 Compare (add symbol)

| Item | Detail (source: How to use the Compare tool; Getting started) |
|---|---|
| Label | "Compare or Add symbol button" |
| Purpose | "examine two or more symbols simultaneously … benchmark one asset against another, spot correlations" |
| Behaviour | "When you add a symbol to a chart, the vertical axis will change from price to percentage. … If you switch it back to price, the chart will collapse unless the price values of the symbols are very close to each other." If lines look detached, "enable Indexed to 100 in the scale settings menu". |
| Dialog placement options (Same % scale / New price scale / New pane) | *could not verify* from Help Center text. |

### 1.4 Chart interval

| Item | Detail (source: Time intervals: a quick introduction and tips; Custom chart intervals; What are second-based intervals; What are tick-based intervals; Understanding range charts; pricing page) |
|---|---|
| Label | "Chart interval" (the button shows the active interval, e.g. `1D`). |
| Menu groups and presets | **Ticks**: 1, 10, 100, 1000 (typed as `1T`, `10T`, `100T`, `1000T`). **Seconds**: 1, 5, 10, 15, 30, 45 (typed `1S`, `10S`…). **Minutes**: 1, 2, 3, 5, 10, 15, 30, 45. **Hours**: 1, 2, 3, 4. **Days**: 1 day, 1 week, 1 month, 3 months, 6 months, 12 months. **Ranges**: 1, 10, 100, 1000. |
| Custom intervals | Menu item "+ Add custom interval…" — "this can be 205 minutes, 82 days, 37 weeks, etc." Also fractional, e.g. "instead of a 2-hour interval, you can set the interval to 2.5-hour interval." Where the custom one appears: in the same dropdown alongside presets. How many can be saved and how to remove one: *could not verify*. |
| Keyboard | "Change interval — Digit or ,". Typing a bare number means minutes; "The maximum available interval when typing in minutes directly from the chart is 1,440 minutes, equal to 24 hours." |
| Favorites | "Select the star icon" next to an interval; favourites "appear on the toolbar for quick access". A "remove button near the star icon" hides presets you don't use. |
| Tick intervals | "Tick-based intervals are pre-set and cannot be customized." Up to 40,000 bars. Not available for indices without volume, options, TVC: bonds/yields, end-of-day symbols, or on Renko / Line break / Kagi / Point & figure ("tick intervals are grayed out and unavailable"). |
| Second intervals | "available for the most liquid symbols, including stocks, indices, cryptocurrencies, and futures". Can show empty candles in quiet periods; ticks don't. |
| Range intervals | A range bar forms when price moves N ticks; "Range" is both a chart type and an interval group. Settings include projection bar colours, "Thin bars", "Phantom bars" (fills untraded gaps with virtual bars). |
| Plan gates (pricing table rows) | "Second-based intervals": Basic ✗, Essential+ ✓. "Tick-based intervals": Basic ✗, Essential+ ✓. "Custom time intervals": Basic ✗, Essential+ ✓. "Custom range bars": Basic ✗, Essential+ ✓. "Historical data by the minute": Essential 180 days, Plus 365 days, Premium/Ultimate All. "Historical data by the second": listed from Plus; All at Premium/Ultimate. "Historical data by the tick": All at Ultimate. "Historical bars available": Basic 5K, Essential 10K, Plus 10K, Premium 20K, Ultimate 40K. |

### 1.5 Chart type

"choose from 20+ chart types." The Help Center's "Chart types available on TradingView" article groups them as follows (names verbatim). Selection: open the chart type menu on the upper toolbar and click one; a chart type's own settings live in **Settings → Symbol** ("This menu automatically adjusts to the chart type you're using").

| Group | Type | What it is / settings named in its Help article | Gate |
|---|---|---|---|
| Line charts | **Line** | Close-to-close line. Settings: Price source (Open, High, Low, Close, (H+L)/2, (H+L+C)/3, (O+H+L+C)/4), Line colour/thickness. | — |
| | **Line with markers** | "built connecting distinct dots (markers) at each data point"; markers hide when zoomed out. | — |
| | **Step line** | "stair-like visualization"; horizontal = stability, vertical = shift; suited to event-driven moves. | — |
| | **Area** | Filled below the line. | — |
| | **HLC area** | "draw three lines of the corresponding price levels and are filled within the ranges, highlighting an asset's volatility." Settings: High line, Low line, Close line, Fill. | — |
| | **Baseline** | "lines to display price levels and shaded areas to show where price is above or below a set percentage." Settings: Price source, Top/Bottom lines, Fill areas, "Base level" (default 50%). | — |
| Bars | **Bars** | OHLC bars. | — |
| | **High-low** | "full-body bars to display trading ranges"; "use only one color to shade bars … without trend bias." | — |
| | **Range** (range bars) | Price-based, "don't factor in time"; one range = one tick. | "Custom range bars" Essential+ |
| Japanese | **Candles** | Standard candlesticks. | — |
| | **Hollow candles** | Hollow bodies on up-closes. | — |
| | **Volume candles** | "vary in thickness depending on the trading volume." Settings: Color based on previous close, Body, Borders, Wick. | — |
| | **Heikin Ashi** | Open = previous (Open+Close)/2; Close = (O+H+L+C)/4; High/Low = extremes of high/open/close and low/open/close. "Current candles are calculated with a delay." Setting "Real prices on price scale". | — |
| Price-based (non-standard) | **Renko** | Settings: Source (Close/OHLC), "Box size assignment method" (ATR / Traditional / Percentage (LTP)), ATR length (default 14), Box size, Percentage (default 1%), Up/Down bars, Projection up/down bars. "Renko brick prices are inherently synthetic" — backtests unreliable. | "Intraday Renko, Kagi, Line Break, Point & Figure charts": Basic ✗, Essential+ ✓ |
| | **Line break** | "Number of lines" (typically 3); a new line only when close breaks the prior lines' range. | same row |
| | **Kagi** | "Box size assignment method", ATR length, "Reversal amount", Percentage; up/down and projected bars. | same row |
| | **Point & figure** | Source, Box size assignment method, "Reversal amount", "One step back building". | same row |
| Indicator-based | **Volume footprint** | Per-candle volume ladder. Settings: Row size "Auto" (0.2 × NormalizedATR) or "Manual" ticks; display "Buy and Sell" / "Delta" / "Total" / "Ladder"; "Apply gradient to background"; Imbalance threshold default "300%". Intrabar source steps from 1 tick → 1 second → 1 minute → 60 minutes depending on chart interval. | "Volume footprint": Basic ✗, Essential+ ✓ |
| | **Session volume profile** | Select "Session volume profile" from the chart type menu. Sections: Volume Profile, Lines (VAH, VAL, POC, developing POC, developing VA), Inputs. | Volume Profile indicators are Essential+; this chart type's own row *could not verify* |
| | **Time price opportunity** (TPO) | Settings: Periods, "Block size" (5m/10m/15m/30m/1h/2h/4h, default 30m), Row size, Ticks per row, Value area, Gradient colors. | *could not verify* |
| Other | **Columns** | "vertical columns stemming from the bottom scale … mostly used for financial data" (GDP, rates, inflation). Settings: Price source, Color bars based on previous close, Up color, Down color. | — |

Cross-type constraints worth knowing: Bar Replay does not work on "Non-standard chart types", spread charts, or tick charts; tick intervals are unavailable on Renko / Line break / Kagi / PnF; strategies on non-standard types "will typically not produce results representing real market conditions".

### 1.6 Indicators, Metrics, and Strategies

The Help Center names the button "Indicators, Metrics, and Strategies" and says its dialog is split into **Technicals**, **Fundamentals**, **Strategies**, and **Store**. Keyboard: "Open indicators — /". Gate: "Indicators per chart" Basic 2, Essential 5, Plus 10, Premium 25, Ultimate 50. (The library itself is another surface.)

### 1.7 Indicator templates

| Item | Detail (source: What are indicator templates; Layouts, charts, drawings, indicators and their interaction) |
|---|---|
| Label | "Indicator Template" button, immediately after Indicators. |
| Menu | "Save indicator template" (and the ability to re-save; the article shows "Save As" in one version). Six built-ins: "Bill Williams' 3 Lines", "Displaced EMA", "MA Exp Ribbon", "Oscillators", "Swing Trading", "Volume Based". |
| What is stored | The indicator set only. "Drawing objects are not saved in the indicator template." |
| Gate | Free: 1 custom template; paid: unlimited (Help Center article). |

### 1.8 Alert

"Set up alerts and manage their notifications to keep track of prices, indicators, strategies, or drawings." The button opens the create-alert dialog; the *list* of alerts is the Alerts widget in the right toolbar (see §3). Gates: "Active price alerts" Basic 3 / Essential 20 / Plus 100 / Premium 400 / Ultimate 1,000; "Active technical alerts on indicators, strategies, and drawings" Basic 20 / Essential 20 / Plus 100 / Premium 400 / Ultimate 1,000; "Active watchlist alerts" Premium 2 / Ultimate 15.

### 1.9 Bar Replay

| Item | Detail (source: How do I turn Bar Replay on?; Bar Replay: how and why to test a strategy in the past; How much data is available for Bar Replay?) |
|---|---|
| Label | "Bar Replay" ("Replay"); "it looks like a video rewind button". |
| Start | Clicking it puts the chart "into the mode of selecting the starting point" — "a blue vertical line with scissors"; click a bar to cut history there. Other starting choices: "Select bar" / "Select date", "Select the first available day", "Random bar". |
| Replay bar controls | "Play" (autoplay; speed adjustable before or during), "Forward" (one step), speed control, "Go to…" (re-pick a start even mid-replay), "Jump to real-time chart", close "X". Keyboard: "Shift + ↓" play/pause, "Shift + →" step forward. A step-*backward* control *could not verify*. |
| Where the bar docks | *could not verify* from Help Center text (the button is on the top toolbar; the control bar appears once replay is on). |
| Not supported | Non-standard chart types, spread charts, tick charts; "Regression Trend and Fixed Range Volume Profile tools don't function during replay"; alerts and real trades stay on live data. |
| Gate | "Bar Replay": Basic ✗, Essential+ ✓. Intraday depth: Essential "now to 6 months back, multiplied by interval in minutes"; Plus "now to 1 year back, multiplied by the interval in minutes"; Premium/Ultimate all history; Ultimate adds tick replay "up to 7 days back". |

### 1.10 Undo / Redo

"All changes on the chart can be managed with the help of the 'Undo' and 'Redo' buttons." Keyboard: Ctrl + Z / Ctrl + Y.

### 1.11 Chart layouts (multi-chart)

| Item | Detail (source: Leveraging multi-chart layouts; How to sync the charts of my layout; How to sync selected charts; TradingView layouts: a quick guide; pricing) |
|---|---|
| Label | The Help Center calls the menu "Layout setup" in one article and the "Select Layout" button in another; both refer to the grid picker on the top toolbar. |
| Purpose | "configure the number and placement of charts. Each layout is a separately saved workspace." |
| Grid choices | Individual arrangement names *could not verify* from Help Center text; the number of charts allowed is the gate below. |
| Charts per tab | Basic 1, Essential 2, Plus 4, Premium 8, Ultimate 16 ("Charts per tab"). |
| Sync toggles in the menu | "Symbol", "Crosshair", "Interval", "Time and date range", "Drawing objects" (only across charts with the same symbol). "You can click the toggle to the right of any of the sync options to turn that option on or off." |
| Partial sync | Instead of all charts: "Symbol/interval chart syncing icon in the Status line or Series context menu" → pick an emoji; "All charts that marked with the same emoji will be synchronized." Uncheck the emoji to leave the group. |
| Focus / maximise | "click the 'Maximize chart' button or press Alt+Enter or Alt+Click on the chart"; "To switch between charts in multi-chart layout, just press Tab." "Every chart in your layout has buttons allowing you to scroll and zoom." |
| Drawing sync modes | "Disabled", "Synchronization by layout" ("Sync drawings in layout"), "Global synchronization" ("Sync drawings globally"). "Switching synchronization modes removes objects from other locations." |

### 1.12 Quick search

| Item | Detail (source: Quick search on TradingView) |
|---|---|
| Label | "Quick search"; keyboard Ctrl + K (⌘ + K on macOS). |
| Finds | drawing tools ("trend line, Fibonacci retracement, or rectangle"), chart features ("open dialogs, insert indicators, add notes"), chart settings ("adjust the scale, change the color theme, or customize labels"), and symbol data by ticker. |
| Tips | Start with "add", "insert", "change", "open"; a "Recent search" list; results can be added to favourites. |

### 1.13 Save / Load layout

| Item | Detail (source: TradingView layouts: a quick guide; Layouts, charts, drawings, indicators and their interaction) |
|---|---|
| What a layout holds | "charts, their settings, drawing tools, and indicators", "even includes drawings"; each has "a unique URL". "watchlists and alerts are not stored in layouts." |
| Menu | "Save layout" (Ctrl + S / Cmd + S), "Autosave" toggle ("created drawing objects and their changes are saved instantly"), "Make a copy", "Open layout" (all layouts not in the recent list; keyboard "."), sharing → "Copy link" ("When sharing the layout, only you can make changes to the chart"). |
| Gate | "Number of saved chart layouts": Basic 1, Essential 5, Plus 10, Premium 10, Ultimate 10. |

### 1.14 Settings (gear)

"To open the settings menu, click the 'Settings' button at the top right corner." The dialog's tabs (How to configure your Supercharts):

| Tab | What it holds (verbatim fragments) |
|---|---|
| **Symbol** | Chart-type-specific style ("adjust colors, opacity, width"), "Data modification section" (stocks / futures / dividends adjustments), "Precision", "Timezone", session. |
| **Status line** | "set the info to display next to the symbol's ticker — logo, title, chart values, and more." |
| **Scales and lines** | Price scale (currency and unit visibility, "scales mode", "price to bar ratio lock", scales position); Price labels and lines ("labels overlapping", "price button to create alerts", "countdown to bar close", formats); Time scale ("display weekdays", date/hours format, "pin chart to the left when changing intervals"). |
| **Canvas** | "Chart basic styles" (background "solid or gradient", grid lines), "Scales", "Buttons", "Margins", crosshair, watermark. |
| **Trading** | "General" (buy/sell buttons, instant order placement, sound notifications) and "Appearance" ("Profit & loss", reverse button, execution labels). |
| **Alerts** | Alert line colour, "Only active alerts", "Automatically hide toasts". |
| **Events** | Dividends, stock splits, earnings, economic events, ideas ("Only your own ideas / people you follow / all public ideas"), "News notifications on the chart". |
| **Template** | Save and manage chart-settings templates (named in the article's tab list; contents *could not verify*). |

Price-scale modes named by the article: Regular, Percent, "Indexed to 100", Logarithmic.

### 1.15 Fullscreen mode

"The fullscreen button is located next to the chart's settings and allows you to analyze the chart without any additional noise." The drawing toolbar "is hidden in the fullscreen mode" (charting-library featureset note). A dedicated keyboard shortcut *could not verify*.

### 1.16 Take a snapshot

Camera icon. Menu actions (How to share a snapshot): save the chart image to disk, copy the image "to the buffer", "copying link to the chart image", "sending it directly to X (ex-Twitter)". "Snapshots don't expire." Keyboard: "Take snapshot, saving URL to clipboard — Alt + S".

### 1.17 Trade

"Provides connection to Paper Trading and the integrated brokers." Opens the broker list / the Trading Panel (see §4.2).

### 1.18 Publish

"share ideas on the current market state." Also offers "Speak your mind" → a Minds post (How to use Minds).

---

## 2. Left toolbar (drawings)

Tools are "divided into subgroups based on instrument type"; each group is one button that fans out. Names verbatim from "Drawing tools available on TradingView".

| Group | Tools |
|---|---|
| **Cursors** | Cross, Dot, Arrow, Demonstration, Magic, Eraser. (The floating Data Window toggle also lives in this cursor menu.) |
| **Trend tools** | Trendline, Ray, Info line, Extended line, Trend angle, Horizontal line, Horizontal ray, Vertical line, Crossline, Parallel channel, Regression trend, Flat top/bottom, Disjoint channel, Pitchfork, Inside pitchfork, Schiff pitchfork, Modified Schiff pitchfork. |
| **Fibonacci and Gann tools** | Fibonacci retracement, Trend-based fib extension, Fib channel, Fib time zone, Fib speed resistance fan, Trend-based fib time, Fib circles, Fib spiral, Fib speed resistance arcs, Fib wedge, Pitchfan, Gann box, Gann square fixed, Gann square, Gann fan. |
| **Patterns** | XABCD pattern, Cypher pattern, Head and shoulders pattern, ABCD pattern, Triangle pattern, Three drives pattern, Elliott waves patterns, Cyclic lines, Time cycles, Sine line. |
| **Forecasting and measurement tools** | Long and short position tools, Position forecast, Bars pattern, Ghost feed, Sector, Anchored VWAP, Fixed range volume profile, Anchored volume profile, Price range, Date range, Date and price range. |
| **Geometric shapes** | Rectangle, Rotated rectangle, Path, Circle, Ellipse, Polyline, Triangle, Arc, Curve, Double curve, Brush, Highlighter, Arrow, Arrow marker, Arrow marks. |
| **Annotation tools** | Text, Note, Price note, Pin, Table, Callout, Comment, Price label, Signpost, Image, X posts and ideas. |
| **Icons** | "Add emojis and stickers." |

Utility buttons under the groups (verbatim): **Measure** ("Gauge distances between bars"; also Shift + Click), **Zoom in**, **Magnets** ("Strong magnet", "Weak magnet"; "Stick drawings to the nearest open, high, low, or close prices"), **Snap to indicators**, **Keep drawing** ("Add multiple objects consecutively"), **Lock all drawings**, **Hide options** ("Hide drawings, indicators, positions/orders, or all"), **Sync drawings options** ("Mirror the drawings from the initial layout to additional layouts"), **Remove options** ("Delete drawings, indicators, or both").

Favourites: any tool can be starred and appears in a floating favourites strip (How to favorite Indicators, Financials, Drawing Tools, and Timeframes).

Show/hide: "click on menu in the upper left corner and show or hide the toolbar by changing the slider position." Keyboard for common tools: Alt + T trend line, Alt + H horizontal line, Alt + V vertical line, Alt + C cross line, Alt + F Fib retracement, Alt + Shift + R rectangle; Ctrl + Alt + H hides all drawings.

---

## 3. Right toolbar (widgets)

A vertical strip of icons. Each opens a panel beside the chart; the "Getting started" article's own list, in its order, with what each is for (verbatim where quoted):

| Widget | What it is for | Details known from the Help Center |
|---|---|---|
| **Watchlist** | "Track symbols" | Opens with the "Watchlist icon on the right-hand toolbar". `+` adds via symbol search; rows drag to reorder; click a column header to sort; "Add section" under the list name creates dividers; three-dot menu adds/removes metrics, toggles logo / ticker / description, and switches "data table or standard row views". Default metrics: Last price, Price change, Percent change, Volume, Extended hours change. "Watchlist can contain no more than 1000 symbols" (pricing: Basic 30 "Symbols per watchlist", paid 1,000). Hotlists open from the list name → "Open list…" or Shift + W. **Advanced view** (pie-chart icon) opens a full-page table with tabs Overview (Price / Financials / Performance / Risk / Technicals), Earnings, Dividends, News, plus "Download list as TXT" and sharing; import is "Upload list…" (comma-separated `EXCHANGE:SYMBOL` in .txt). Keyboard: ↓ / Space next symbol, ↑ previous, Alt + W add current symbol. |
| **Details** | "check their financial and technical data" | Lives in the same panel *below* the Watchlist: "clicking any symbol in your watchlist opens the Symbol details section right below the list." Divider is draggable — "The Watchlist section is most likely minimized. Just drag it down." The Minds entry is "a purple box in the symbol details panel". |
| **News** | "explore the latest news" | "aggregates the latest news for all symbols currently in your watchlist." Separate from the full **News Flow** page. Chart-side news markers are controlled by Settings → Events → "News notifications on the chart". |
| **Alerts** | "Manage price and technical alerts" | The list of active/inactive alerts and their log (tab names *could not verify*). |
| **Object tree and Data window** | "Manage drawings or indicators that you've applied to the chart" | One button, two tabs. Object tree: "hide, show, or remove the drawings, indicators and/or symbols"; "Visual order can also be set in the Object Tree window"; multi-select with Ctrl / Cmd then "Settings"; drawings can be grouped. Data window: exact per-bar values; keyboard Alt + D (third-party); the floating variant appears "right under your cursor" while holding the left mouse button, toggled "from the cursor menu located in the left toolbar". |
| **Hotlists** | Market movers | Not its own icon — reached through the Watchlist name menu ("Open list…") or Shift + W. Lists: "Volume gainers", "Percent change gainers/losers", "Percent range gainers/losers", "Gap gainers/losers", "Percent gap gainers/losers"; country/exchange filters; "Each list updates in real time"; can be favourited or duplicated into a watchlist. |
| **Screeners** | "Access screeners without leaving the chart" | Stock Screener, ETF Screener, Bond Screener, Crypto Coins Screener, CEX Screener, DEX Screener, Pine Screener — "directly from the right-hand toolbar". Filter panel collapses via "the arrow in the upper-right corner". Auto refresh "every 10 seconds, every 1 minute, or never"; "Save screen", "Make a copy", "Create new screen"; CSV export. |
| **Pine Editor** | "Create custom indicators using Pine Script®" | Opens from "the Pine icon on the right toolbar". Default is a floating window; can be **docked** to the right, **detached** to a new window/tab, or placed in the bottom panel. Buttons: "Add to the chart", "Publish script"; script-name menu (Save, duplicate, rename, version history, new indicator/strategy/library, Open, recent); three-dot menu (editor settings, Profiler mode, Pine logs, "Open editor" in new window/tab). |
| **Calendars** | "Track economic events and company activity" | Economic Calendar, Earnings Calendar, Dividend Calendar, IPO Calendar. Economic filters: "Countries", "High importance", period (today / tomorrow / this week…), "Categories menu", "Time zone"; columns "Actual", "Forecast", "Prior". Overlay on the chart via Settings → Events. |
| **News Flow** | "Explore industry news" | The full news hub. |
| **Portfolio** | "Track investment performance" | — |
| **Fundamental Graphs** | "Access stock and crypto metrics" | — |
| **Yield Curves** | "Explore bond rates" | — |
| **Options** | "Find trading instruments" | — |
| **Macro Maps** | "View worldwide economic trends" | — |
| **Community Feed** (Ideas / Minds) | "Access Minds, ideas, and community indicators" | Minds is "a social media feed where traders gather to chat, follow, and discuss specific symbols"; the feed "automatically updates when you change symbols on the chart". Ideas on the chart itself are toggled in Settings → Events. |
| **Chats** | Public and private chats | Public chats were "in the toolbar on the right side of the page"; TradingView is retiring public chats on 2026-09-30, leaving "one-to-one chats and private group chats". |
| **Notifications** | "Check social network activity" | Comments, mentions, and other activity. |
| **Help Center** | "Access TradingView information" | Also the "?" that opens the shortcuts overlay. |
| **Trading** (Order panel / DOM) | Order ticket | Opened by the "Trade" button; "A tool appears on the right side with two tabs: Order and DOM." |

Widget-bar behaviour: the strip stays; the open panel takes width from the chart; the charting-library's version of this bar is limited to "Watchlist, Details, and News" — the full site adds everything above. Panel width resizing by drag *could not verify* from Help Center text (column width inside the watchlist is adjustable per "I want to change the width of my watchlist columns").

---

## 4. Bottom panel (tool panel above the bottom bar)

Historically the bottom panel held Pine Editor, Strategy Tester, the Screener and the Trading Panel as tabs. Two of those have moved to the right toolbar: the Pine Editor now "launches via the Pine icon on the right toolbar" (with a bottom-panel *mode* still offered), and the screeners open "directly from the right-hand toolbar". What the Help Center still places at the bottom:

| Panel | Where / how it opens | What is inside (verbatim where quoted) |
|---|---|---|
| **Strategy Tester / Strategy Report** | "The Strategy Report opens at the bottom of the screen" when a strategy is added. | Tabs: "Overview", "Performance", "Trades analysis", "Risk/performance ratios", "List of trades". Overview toggles "Buy&hold" and "Trades run-up&drawdown"; date-range selector. "Only one strategy can run on a chart at a time." Deep Backtesting is referenced but its gate *could not verify* here. |
| **Trading Panel** | "Find the Trading panel at the bottom"; "Select Paper Trading from the available brokers". | Broker list first; once connected, "four tabs will appear at the bottom: Positions, Orders, Account Summary and Notification Log" (iBroker example; tab set can vary per broker). Top row: "a menu with the main settings for trading, a button to disconnect trading and a button to choose another broker", account ID and sub-account switcher. Disconnect via "the trading menu in the top-right" → "Log out Paper Trading or See the brokers list". Paper Trading is "available to all TradingView users". |
| **DOM** (Depth of Market) | Trade button → right-side tool, tabs "Order" and "DOM". | Requires a broker with Level 2. Elements: placed orders, Asks, Bids, order cells (click = limit, Ctrl + click = stop), cancel buttons per column, centering button, position size, P&L (money / pips / %), "Flatten", "Reverse", "CXL ALL", Quantity field, "Buy Mkt" / "Sell Mkt". Colours: green limit, red stop, yellow stop-limit; blue long / red short. Adjustable price step for Level-2 brokers. Keyboard: Shift + B / Shift + S market orders, Shift + Alt + B / S limit, Shift + Alt + C centre DOM. |
| **Pine Editor (bottom mode)** | One of the editor's placement options. | See §3. |
| **Replay bar** | Appears when Bar Replay is on. | See §1.9. |

Collapse / resize: the Help Center says only that these open "at the bottom". A third-party walkthrough (Mr. Chartist, dated 2026-04-01) describes the behaviour as "Clicking a tab label expands it upward over the chart; dragging its top edge resizes it," and clicking the active tab again collapses it. Treat that as unverified by TradingView itself.

---

## 5. The bottom bar and the status line

### 5.1 Bottom bar (time-scale strip)

What TradingView says it does: "switch between intervals, set the timezone, and customize the price scale."

| Control | Detail |
|---|---|
| Date-range buttons | "Preset intervals like '1D' for one trading day, or 'All' for historical data." These *zoom the visible range* (they are not the bar interval). The full label set between 1D and All *could not verify* from Help Center text. |
| "Go to" | "you can go to a specific date or create a custom range in the 'Go to' menu"; keyboard "Go to date — Alt + G". |
| Time zone / clock | Click the clock "at the bottom bar" (or Settings → Symbol). "To match the time to the relevant trading exchange, select 'Exchange.'" |
| Price-scale buttons | Formerly here; now "directly below the price scale": Auto, Log, %, "Indexed to 100", and a gear for scale settings. Right-clicking the scale also opens them. With several scales, "click on the letter that indicates the scale". Keyboard: Alt + L log, Alt + P percent, Alt + I invert, Alt + R reset chart. |

### 5.2 Status line (legend)

Top-left overlay on every chart pane. Configured in Settings → **Status line**: "set the info to display next to the symbol's ticker — logo, title, chart values, and more." The multi-chart syncing emoji button also lives here ("Symbol/interval chart syncing icon in the Status line"). To show values across all charts as the crosshair moves, enable "Crosshair" sync in the layout menu. Individual checkbox labels *could not verify* from Help Center text.

### 5.3 Floating Data Window

"a floating data window that appears right under your cursor" while holding the left mouse button; works "Even if the values in the status line are collapsed or hidden"; toggle in the cursor menu of the left toolbar.

---

## 6. Keyboard map that touches this anatomy

From the Advanced Charts / Trading Platform shortcut reference (labels verbatim):

| Action | Keys |
|---|---|
| "Open Quick Search" | Ctrl + K |
| "Open indicators" | / |
| "Load chart layout" / "Save chart layout" | . / Ctrl + S |
| "Undo" / "Redo" | Ctrl + Z / Ctrl + Y |
| "Change symbol" / "Change interval" | type ticker / digit or , |
| "Move chart 1 bar" left/right; "further" | ← → ; Ctrl + ← → |
| "Zoom in" / "Zoom out" | Ctrl + ↑ / Ctrl + ↓ (also Ctrl + wheel) |
| "Go to date" | Alt + G |
| "Take snapshot, saving URL to clipboard" | Alt + S |
| "Reset chart" / "Invert series scale" / log / percent | Alt + R / Alt + I / Alt + L / Alt + P |
| "Start keyboard navigation" | Alt + Z or Tab |
| "Switch between charts" / reverse | Tab or Shift + → / Shift + Tab or Shift + ← |
| "Toggle maximize chart" | Alt + Enter or Alt + Click |
| "Add symbol to watchlist" | Alt + W |
| Watchlist next / previous | ↓ or Space / ↑ or Shift + Space |
| "Hide all drawings" | Ctrl + Alt + H |
| Replay play/pause, step | Shift + ↓, Shift + → |

---

## 7. Plan gating summary (pricing page rows, verbatim labels)

| Row | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| "Charts per tab" | 1 | 2 | 4 | 8 | 16 |
| "Indicators per chart" | 2 | 5 | 10 | 25 | 50 |
| "Number of saved chart layouts" | 1 | 5 | 10 | 10 | 10 |
| "Symbols per watchlist" | 30 | 1,000 | 1,000 | 1,000 | 1,000 |
| "Active price alerts" | 3 | 20 | 100 | 400 | 1,000 |
| "Historical bars available" | 5K | 10K | 10K | 20K | 40K |
| "Bar Replay" | ✗ | ✓ | ✓ | ✓ | ✓ |
| "Second-based intervals" / "Tick-based intervals" / "Custom time intervals" / "Custom range bars" | ✗ | ✓ | ✓ | ✓ | ✓ |
| "Volume footprint" / "Volume Profile indicators" | ✗ | ✓ | ✓ | ✓ | ✓ |
| "Intraday Renko, Kagi, Line Break, Point & Figure charts" | ✗ | ✓ | ✓ | ✓ | ✓ |
| "Native multi-monitor support" | ✗ | ✗ | ✗ | ✓ | ✓ |

The pricing fetch also returned a row "Number of watchlists: 1" for every plan; that reads like a scrape artefact and *could not verify* — the Help Center only states the 1,000-symbol cap.

---

## What this means for OnStock

OnStock today: a phone-first React app; desktop (`lg:` breakpoint) already splits `AssetDetail` into a 28rem `WatchlistPane` aside plus a content column; candles come from GeckoTerminal at 1m/5m/15m/1h/4h/1D (stock side only 5m and 1D via Yahoo, delayed); a Gap|Candles toggle; SMA20/EMA50/RSI14 on Lightweight Charts v5; watchlists/folders; price + gap-drift alerts; trades route out to Jupiter.

1. **Adopt — the three-toolbar frame.** Top strip (symbol, interval, chart mode, indicators, alert, layout, settings), left strip (tools), right strip (widgets), thin bottom bar (range buttons, timezone, scale). It is the layout every trader already has in muscle memory, and OnStock's `AssetDetail` desktop split is already half of it.
2. **Adopt — the right toolbar as *icons that open panels*, not a fixed sidebar.** Today `WatchlistPane` is a permanent 28rem aside. Make it the first widget of a strip: Watchlist, Details (issuer / mint / pool / underlying), Gap news feed, Alerts, Treasury yields. Reuse the "Details lives below Watchlist behind a draggable divider" pattern for symbol facts.
3. **Adapt — interval menu with favourites on the bar.** Show OnStock's six intervals as star-able favourites in the top strip (TradingView's favourites pattern), grey out the ones the stock side cannot serve instead of silently coercing (`coerceTimeframe` currently lands on the nearest). Skip custom / second / tick intervals: GeckoTerminal does not serve them.
4. **Adapt — chart-type menu, but only types the data can honour.** Candles, Hollow candles, Bars, Line, Area, Baseline, Step line, HLC area are all pure re-renderings of OHLC and cheap on Lightweight Charts. Baseline with "Base level" = 0 is a natural rendering for the **gap** series (above/below the share price). Skip Renko/Kagi/PnF/Line break/Range/Volume footprint/TPO — they need tick or intrabar data OnStock does not have.
5. **Adapt — Gap|Candles becomes the "data type switcher".** TradingView's switcher beside the symbol (chart / technicals / seasonals / news / ideas) is the same idea as OnStock's Gap|Candles toggle. Put it in the top strip, and add "Token", "Stock", "Gap" as the three data types rather than hiding the side switch inside CandlesPanel chips.
6. **Adopt — Compare, with the twist OnStock is built for.** TradingView's Compare switches the axis to percent. OnStock's Dual-line gap chart *is* a compare of token vs share; on desktop expose "Indexed to 100" and "%" scale buttons under the price scale so the same overlay can be read either way.
7. **Adopt — status line + floating data window.** The legend (symbol, OHLC, indicator values) and a hold-to-read tooltip cost little and replace the phone-style "tap a bar" pattern on a mouse.
8. **Adopt — multi-chart layouts, small.** A 2-up (token left, share right, crosshair + time-range synced) is the single most on-thesis layout OnStock can offer; TradingView's "Crosshair" and "Time and date range" sync toggles are the model. Skip 8/16-chart grids and emoji sync groups.
9. **Adapt — Save/Load layout as "views".** OnStock already persists folders; a saved *view* (asset + interval + chart type + indicators + right-panel state, one URL) is TradingView's layout minus drawings. Autosave by default; skip the layout count gating.
10. **Skip — the left drawing toolbar, for now.** Lightweight Charts has no drawing primitives; building trend lines, fibs and shapes is a project of its own, and the gap thesis is read from data not drawings. Keep only Measure and a Zoom-in tool if anything.
11. **Skip — Bar Replay, Strategy Tester, Pine Editor, DOM, Trading Panel.** OnStock never holds funds or executes trades; trades route out to Jupiter. A "Trade" button that opens the Jupiter route in the right-hand order-panel slot matches the TradingView position without the machinery.
12. **Adapt — Alerts widget in the right strip.** OnStock's price + gap-drift alerts already exist; give them TradingView's shape: a top-strip Alert button that opens the create dialog pre-filled with the current asset, and a right-strip list.
13. **Adopt — Quick search (Ctrl + K).** `SearchOverlay` already exists; add commands ("open Treasury yields", "switch to 1h", "add SMA") alongside symbols. Cheap, and the keyboard map (Ctrl + K, `/`, digits for interval, Alt + W add to watchlist, Alt + G go to date) is worth copying wholesale.
14. **Adopt — Settings gear with tabbed dialog.** Symbol / Scales / Canvas / Events is the right home for OnStock's appearance sheet plus new desktop choices (timezone "Exchange" vs local, show tokenization-news markers on the chart, show Treasury events).
15. **Skip — Minds, Chats, Ideas, Notifications, Portfolio, Options, Macro Maps.** Social and broker features with no counterpart in the OnStock thesis; the news feed and Treasury yields already cover the "context" slots.

---

## Sources

TradingView Help Center (primary):

- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/
- https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/
- https://www.tradingview.com/support/solutions/43000703407-chart-types-available-on-tradingview/
- https://www.tradingview.com/support/folders/43000547460-learn-more-about-chart-types/
- https://www.tradingview.com/support/solutions/43000758617-advanced-intraday-chart-types/
- https://www.tradingview.com/support/solutions/43000502298-spread-charts-explained/
- https://www.tradingview.com/support/solutions/43000724995-understanding-volume-candle-charts/
- https://www.tradingview.com/support/solutions/43000745273-what-are-line-with-markers-charts/
- https://www.tradingview.com/support/solutions/43000745272-how-to-use-step-line-charts/
- https://www.tradingview.com/support/solutions/43000709062-how-to-use-a-high-low-close-area-chart/
- https://www.tradingview.com/support/solutions/43000690232-baseline-charts-explained/
- https://www.tradingview.com/support/solutions/43000673912-learn-to-use-column-charts/
- https://www.tradingview.com/support/solutions/43000677196-understanding-high-low-charts/
- https://www.tradingview.com/support/solutions/43000726164-volume-footprint-charts-a-complete-guide/
- https://www.tradingview.com/support/solutions/43000725590-time-price-opportunity-charts-explained/
- https://www.tradingview.com/support/solutions/43000745275-session-volume-profile-charts-explained/
- https://www.tradingview.com/support/solutions/43000619436-understanding-heikin-ashi-charts/
- https://www.tradingview.com/support/solutions/43000502284-understanding-renko-charts/
- https://www.tradingview.com/support/solutions/43000502273-introduction-to-line-break-charts/
- https://www.tradingview.com/support/solutions/43000502272-learn-to-use-kagi-charts/
- https://www.tradingview.com/support/solutions/43000502276-learn-using-point-and-figure-charts/
- https://www.tradingview.com/support/solutions/43000474007-what-s-range-interval-and-how-do-i-select-it/
- https://www.tradingview.com/support/solutions/43000747934-time-intervals-a-quick-introduction-and-tips/
- https://www.tradingview.com/support/solutions/43000543883-custom-chart-intervals-personalizing-your-analysis/
- https://www.tradingview.com/support/solutions/43000762068-what-are-second-based-intervals/
- https://www.tradingview.com/support/solutions/43000709225-what-are-tick-based-intervals/
- https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/
- https://www.tradingview.com/support/solutions/43000512928-how-can-i-enable-disable-the-drawings-toolbar/
- https://www.tradingview.com/support/solutions/43000629990-leveraging-multi-chart-layouts-in-your-analysis/
- https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/
- https://www.tradingview.com/support/solutions/43000761094-how-to-sync-selected-charts/
- https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/
- https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
- https://www.tradingview.com/support/solutions/43000543048-what-are-indicator-templates/
- https://www.tradingview.com/support/solutions/43000543053-how-to-use-the-compare-tool/
- https://www.tradingview.com/support/solutions/43000659671-quick-search-on-tradingview-find-anything-super-fast/
- https://www.tradingview.com/support/solutions/43000482537-how-to-share-a-snapshot/
- https://www.tradingview.com/support/solutions/43000474024-how-do-i-turn-bar-replay-on/
- https://www.tradingview.com/support/solutions/43000712747-bar-replay-how-and-why-to-test-a-strategy-in-the-past/
- https://www.tradingview.com/support/solutions/43000692816-how-much-data-is-available-for-bar-replay/
- https://www.tradingview.com/support/solutions/43000754966-demo-features-on-tradingview/
- https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/
- https://www.tradingview.com/support/solutions/43000771546-watchlist-advanced-view-mode/
- https://www.tradingview.com/support/solutions/43000482906-i-cannot-see-my-watchlist-only-the-instrument-s-details-are-displayed/
- https://www.tradingview.com/support/solutions/43000611193-how-many-symbols-can-i-add-to-the-watchlist/
- https://www.tradingview.com/support/solutions/43000487233-how-to-import-or-export-a-watchlist/
- https://www.tradingview.com/support/solutions/43000665060-how-can-i-share-my-watchlist/
- https://www.tradingview.com/support/solutions/43000487210-i-want-to-add-or-remove-columns-to-the-watchlist/
- https://www.tradingview.com/support/folders/43000549989-how-to-manage-my-lists/
- https://www.tradingview.com/support/solutions/43000762029-discover-market-movers-with-tradingview-hotlists/
- https://www.tradingview.com/support/solutions/43000690226-how-to-use-minds-and-what-they-are-made-for/
- https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/
- https://www.tradingview.com/support/solutions/43000474299-how-can-i-change-the-visual-order-layer-of-indicators-drawings-candles/
- https://www.tradingview.com/support/solutions/43000707391-tradingview-calendar-key-economic-and-corporate-events/
- https://www.tradingview.com/support/solutions/43000759911-economic-calendar-track-all-major-market-events/
- https://www.tradingview.com/support/solutions/43000714735-how-to-enable-disable-news-notifications-on-the-chart/
- https://www.tradingview.com/support/solutions/43000694285-how-to-enable-the-display-of-ideas-on-the-chart/
- https://www.tradingview.com/support/solutions/43000591339-using-public-chats/
- https://www.tradingview.com/support/solutions/43000718885-tradingview-screeners-walkthrough/
- https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/
- https://www.tradingview.com/support/solutions/43000764138-tradingview-strategy-report-how-to-start/
- https://www.tradingview.com/support/solutions/43000516459-depth-of-market-dom-what-it-is-and-how-traders-can-use-it/
- https://www.tradingview.com/support/solutions/43000479975-how-to-connect-or-disconnect-a-paper-trading-account/
- https://www.tradingview.com/support/solutions/43000640821-ibroker-how-to-start-trading-and-how-to-place-orders/
- https://www.tradingview.com/support/solutions/43000756695-how-to-trade-on-tradingview/
- https://www.tradingview.com/support/solutions/43000480183-price-scale-settings-are-gone-from-the-bottom-toolbar/
- https://www.tradingview.com/support/solutions/43000482911-how-to-go-to-the-specific-date-on-the-chart/
- https://www.tradingview.com/support/solutions/43000476526-is-there-a-way-to-change-chart-timezone-or-clock-time-at-the-bottom-of-the-chart/
- https://www.tradingview.com/support/solutions/43000665052-how-to-enable-status-line-on-all-charts-in-layout/
- https://www.tradingview.com/support/solutions/43000764889-symbols-you-can-analyze-and-trade-on-tradingview/
- https://www.tradingview.com/support/solutions/43000623399-desktop-app-keyboard-shortcuts/
- https://www.tradingview.com/pricing/

TradingView developer docs and blog:

- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Toolbars
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/object-tree
- https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/
- https://www.tradingview.com/blog/en/floating-data-window-under-your-cursor-52715

Third-party, used only for the bottom-panel collapse/drag behaviour and the Alt + D shortcut:

- https://mrchartist.com/learn/tradingview/bottom-menu-screener-pine/

Pages attempted but not readable (returned only navigation chrome or 403/404): https://www.tradingview.com/support/shortcuts/ , https://in.tradingview.com/support/shortcuts/ , https://www.tradingview.com/support/solutions/43000728828-news-flow-your-daily-hub-for-financial-news/ , https://www.tradingcode.net/tradingview/keyboard-hotkeys/ , https://www.tradingview.com/support/solutions/43000474153-how-do-i-find-symbols/ .
