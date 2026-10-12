# TradingView teardown — surface 04: Indicators & Strategies

Date: 2026-09-06. Researcher: read-only pass over TradingView's Help Center, Pine Script docs, Advanced Charts (charting library) docs and pricing page. Every label below is quoted the way TradingView writes it. Where a page only showed something in a screenshot my fetcher could not read, or where two TradingView pages disagree, the entry says **could not verify** rather than guessing.

Scope guard: this file covers the Indicators dialog, the built-in indicator catalogue, how one indicator is configured, panes and scales as they relate to indicators, indicator templates, per-plan limits, Pine Script / Pine Editor at a summary level, and the Strategy Tester's outputs. Chart types, drawing tools, alerts, layouts, watchlists, screeners, the Financials *page*, and the trading panel belong to other surfaces.

---

## 1. Where indicators live in the UI

| Thing | Verbatim label | Where | What it does | Plan |
|---|---|---|---|---|
| The button | **"Indicators, metrics, and strategies"** (the Help Center also shortens it to "Indicators") | Supercharts upper toolbar | Opens the Indicators dialog | All |
| Keyboard shortcut | **`/`** | Anywhere on the chart | Opens the same dialog (Pine docs: "use the forward slash / keyboard shortcut") | All |
| Favorites shortcut | star icon next to the button | Toolbar, next to the Indicators button | A dropdown of the scripts you have starred ("Analysis tools are in the dropdown menu or in the Favorites tab") | All |
| Indicator Templates | **"Indicator Templates"** button (Help Center: "the Indicator Template button") | Toolbar, next to Indicators | Save / apply bundles of indicators (section 6) | All (count gated, see section 7) |
| Legend / status line | top-left of every pane | On the chart | One row per indicator with its title, arguments, current values and hover buttons (section 4) | All |
| Object Tree | **"Object Tree and Data Window"** button | Right toolbar | Lists every indicator, drawing and symbol; hide / show / remove from here, and change **"Visual Order"** | All |
| Pine Editor | **"Pine"** icon | Right toolbar (also as a bottom tab in older layouts) | Write and run your own scripts (section 8) | All |
| Strategy Tester | opens by itself when a strategy is added | Bottom panel | Backtest report (section 9) | All (Deep Backtesting gated) |

Sources: Pine docs *Primer / First steps*; Help Center 43000543506, 43000662392, 43000543048, 43000484389, 43000763320, 43000764138.

---

## 2. The Indicators dialog — structure

The dialog has a search box at the top and a list of categories down the left. Categories as TradingView names them (Pine docs, *First steps*), in order:

| Left-pane category | Verbatim | What is inside | Notes |
|---|---|---|---|
| Favorites | **"Favorites"** | "the scripts you have 'favorited' by clicking on the star that appears to the left of the script name when you hover over it" | The same list feeds the toolbar star dropdown |
| Personal | **"Personal"** | "the scripts you have written and saved in the Pine Editor. They are saved on TradingView's servers." | Your own Pine scripts |
| Technicals | **"Technicals"** | "groups most TradingView built-in scripts, organized in four categories" — **"Indicators"**, **"Strategies"**, **"Profiles"**, **"Patterns"** | "Most are written in Pine Script and available for free." A separate Help Center note says the Volume Profile indicators "have moved to a separate tab in the Built-ins section" — that tab is the **Profiles** sub-category |
| Financials | **"Financials"** | "all built-in indicators that display financial metrics. The contents of that tab and the subcategories they are grouped into depend on the symbol currently open on the chart." | Four groups: **"Income Statement"**, **"Balance Sheet"**, **"Cash Flow"**, **"Statistics"** (section 3.10) |
| Community | **"Community"** (also "Community Scripts") | "Over 150,000 user-published scripts". Sort/filter chips: **"Editors' picks"** ("Hand-selected open-source scripts"), **"Top"** ("Most popular all-time scripts"), **"Trending"** ("Recently popular scripts") | Also reachable from the homepage: "Community" menu > "Indicators and strategies"; a script page has a **"Use on chart"** button that opens a chart with it applied |
| Invite-only scripts | **"Invite-only scripts"** | Scripts whose author has granted you access | "This tab appears as soon as a user is given access to an Invite-Only script … If this tab is not shown in your Indicators Library, it means that you have not been given permission to use any Invite-Only script." Access "is not included in any plan" |

Behaviour: "Clicking on one of the listed indicators or strategies loads the script on your chart." Older Help Center pages (2019-era "simple steps") call the two top groups "Technicals" and "Fundamentals"; the current labels are **Technicals** and **Financials**.

Published-script visibility types you see in Community (Help Center 43000482573):

| Type | Verbatim meaning | Who can publish |
|---|---|---|
| **"Open"** (open-source) | "Every user is able to see a source code of your script, apply it to the chart & add it to favorites" | Any plan |
| **"Protected"** | "Every user can add this script to the chart or favorites, but only the author can see the source code" | Pricing page lists "Publish protected scripts" from Plus upward — could not verify from the Help Center itself |
| **"Invite-Only"** | "Nobody can add it to a chart without explicit permission from the author and only the author can see the source code" | "Premium users only" (Help Center); pricing page shows "Publish invite-only scripts" on Essential — the two pages disagree; could not resolve |

A private script shows "a small 'lock' icon that appears to the right of its name."

Sources: Pine docs *Primer / First steps*; Help Center 43000543626, 43000653375, 43000653372, 43000653373, 43000482573, 43000615189, 43000555216, 43000662392, 43000543506.

---

## 3. The built-in catalogue (Technicals + Financials)

TradingView's Help Center folder **"Built-in Indicators"** holds one article per built-in (209 articles at fetch time, plus 8 in the **"Volume Profiles"** folder). The dialog itself presents Technicals › Indicators as a flat alphabetical list — the groupings below are mine, for reading; the names are verbatim article titles. A handful of articles in the folder are explainer pieces rather than indicators (marked *). Anything TradingView ships that has no Help Center article (e.g. Accelerator Oscillator, Gator Oscillator, individual older candlestick patterns, built-in strategies) is listed as **could not verify**.

### 3.1 Moving averages and average-price lines

| Name (verbatim) | Overlay / pane | Note |
|---|---|---|
| Simple Moving Average | overlay | |
| Exponential Moving Average | overlay | |
| Weighted Moving Average | overlay | |
| Smoothed Moving Average | overlay | |
| Hull Moving Average | overlay | |
| Double Exponential Moving Average (EMA) | overlay | title as written |
| Triple EMA | overlay | |
| Arnaud Legoux Moving Average | overlay | |
| Kaufman's Adaptive Moving Average (KAMA) | overlay | |
| Least Squares Moving Average | overlay | |
| McGinley Dynamic | overlay | |
| Volume-Weighted Moving Average (VWMA) | overlay | |
| Moving Averages | overlay | one script, several lines |
| Moving Average Ribbon | overlay | |
| MA Cross | overlay | |
| MovingAvg Cross | overlay | |
| MovingAvg2Line Cross | overlay | |
| Median | overlay | |
| Linear Regression | overlay | |
| Volume Weighted Average Price (VWAP) | overlay | |
| VWAP Auto Anchored | overlay | |
| Time Weighted Average Price | overlay | |
| Visible Average Price | overlay | average of what is on screen |

The older "simple steps" article also describes preset MA sets: "Six Simple Moving Averages (periods 10, 20, 30, 50, 100 and 200), Six Exponential Moving Averages of the same periods" — these are what **Technical Ratings** uses, not separate dialog entries; could not verify them as dialog rows.

### 3.2 Trend, direction and auto-drawn levels

| Name (verbatim) | Overlay / pane |
|---|---|
| Average Directional Index (ADX) | pane |
| Directional Movement (DMI) | pane |
| Aroon Indicator | pane |
| Aroon Oscillator | pane |
| Ichimoku Cloud | overlay |
| Parabolic SAR (SAR) | overlay |
| Supertrend | overlay |
| Vortex Indicator | pane |
| Chande Kroll Stop | overlay |
| Chandelier Exit | overlay |
| Volatility Stop | overlay |
| Chop Zone | pane |
| Choppiness Index (CHOP) | pane |
| Trend Strength Index | pane |
| Mass Index | pane |
| Zig Zag | overlay |
| BBTrend | pane |
| Auto Trendlines | overlay |
| Auto key levels | overlay |
| Auto Fib Retracement | overlay |
| Auto Fib Extension | overlay |
| Auto Pitchfork | overlay |
| Pivot Points Standard | overlay |
| Pivot Points High Low | overlay |
| Rob Booker - ADX Breakout / Rob Booker - Knoxville Divergence / Rob Booker Intraday Pivot Points / Rob Booker Missed Pivot Points / Rob Booker Reversal / Rob Booker Ziv Ghost Pivots | mixed |
| Technical Ratings | pane (a Buy/Sell gauge built from the MA and oscillator sets) |
| Multi-Time Period Charts indicator | overlay (draws higher-timeframe boxes) |

### 3.3 Momentum / oscillators

| Name (verbatim) | Pane |
|---|---|
| Relative Strength Index (RSI) | pane |
| RSI divergence indicator | pane |
| Stochastic (STOCH) | pane |
| Stochastic RSI (STOCH RSI) | pane |
| Stochastic Momentum Index (SMI) | pane |
| Moving average convergence divergence (MACD) indicator | pane |
| Commodity Channel Index (CCI) | pane |
| Woodies CCI | pane |
| Momentum | pane |
| Rate of Change (ROC) | pane |
| Williams %R (%R) | pane |
| Ultimate Oscillator (UO) | pane |
| Awesome Oscillator (AO) | pane |
| Chande Momentum Oscillator (CMO) | pane |
| Connors RSI (CRSI) | pane |
| Coppock Curve | pane |
| Detrended Price Oscillator (DPO) | pane |
| Fisher Transform | pane |
| Know Sure Thing (KST) | pane |
| Percentage Price Oscillator (PPO) | pane |
| Price Momentum Oscillator (PMO) | pane |
| Pring's Special K | pane |
| Rank Correlation Index (RCI) | pane |
| RCI Ribbon | pane |
| Relative Vigor Index | pane |
| SMI Ergodic Indicator / SMI Ergodic Oscillator | pane |
| TRIX | pane |
| True Strength Index | pane |
| Balance of Power (BOP) | pane |
| Bull Bear Power | pane |
| Correlation Coefficient (CC) | pane (correlation of the chart symbol to a second symbol) |
| Performance | pane/table (period returns) |

### 3.4 Volatility, bands and channels

| Name (verbatim) | Overlay / pane |
|---|---|
| Average True Range (ATR) | pane |
| Average Daily Range (ADR) indicator | pane |
| Bollinger Bands (BB) | overlay |
| Bollinger Bands %b (%b) | pane |
| Bollinger BandWidth (BBW) | pane |
| Bollinger Bars | overlay |
| Donchian Channels (DC) | overlay |
| Keltner Channels (KC) | overlay |
| Envelope (ENV) | overlay |
| Historical Volatility | pane |
| Relative Volatility Index | pane |
| Ulcer Index | pane |

### 3.5 Volume

| Name (verbatim) | Overlay / pane |
|---|---|
| Volume | pane (TradingView's Volume can also be shown in the main pane; see 5.4) |
| 24-hour Volume | pane |
| Accumulation Distribution (ADL) | pane |
| Chaikin Money Flow (CMF) | pane |
| Chaikin Oscillator | pane |
| Cumulative Volume Delta | pane |
| Volume Delta | pane |
| Ease of Movement (EOM) | pane |
| Elder's Force Index (EFI) | pane |
| Klinger Oscillator | pane |
| Money Flow (MFI) | pane |
| Net Volume | pane |
| On Balance Volume (OBV) | pane |
| Price Volume Trend (PVT) | pane |
| Percentage Volume Oscillator (PVO) | pane |
| Negative Volume Index (NVI) / Positive Volume Index (PVI) | pane |
| Relative Volume at Time | pane |
| Up/Down Volume | pane |

### 3.6 Volume Profiles (Technicals › Profiles)

Help Center folder "Volume Profiles" lists exactly these indicators: **Fixed Range Volume Profile**, **Session Volume Profile**, **Session Volume Profile HD**, **Periodic Volume Profile**, **Visible Range Volume Profile**, **Auto Anchored Volume Profile**. Common plotted elements: "Point of Control (POC)", "Value area (VA)", VAH / VAL, "Developing point of control", "Developing value area". Inputs: "user-defined parameters such as number of rows and time period" (exact input labels: could not verify). There is also a separate *drawing tool* "Fixed range volume profile" (other surface). Plan: the pricing page's "Volume Profile indicators" row read as a checkmark on Essential and above in one fetch and on all plans in another — **could not verify whether Basic has them**.

### 3.7 Breadth

| Name (verbatim) |
|---|
| Advance/Decline Line |
| Advance/Decline Ratio |
| Advance/Decline Ratio (Bars) |
| Cumulative Volume Index (CVI) |

### 3.8 Bill Williams

| Name (verbatim) |
|---|
| Williams Alligator |
| Williams Fractal |
| Awesome Oscillator (AO) |

The default indicator template **"Bill Williams' 3 Lines"** exists (section 6). "Accelerator Oscillator" and "Gator Oscillator": could not verify as current built-ins (no Help Center article).

### 3.9 Patterns (Technicals › Patterns)

Path, verbatim: "You can find our automatic tools in the 'Indicators' menu on the upper toolbar. From there, click 'Technicals' and head to the 'Patterns' tab." Pattern search covers "the most recent 600 bars/candles/price points displayed. If you need to go further back in time, you can use Bar Replay mode."

Chart patterns — one indicator per pattern plus the combined **"All Chart Patterns"**, which finds: "Bullish Flag," "Bearish Flag," "Bullish Pennant," "Bearish Pennant," "Double Top," "Double Bottom," "Triple Top," "Triple Bottom," "Head And Shoulders," "Inverse Head And Shoulders," "Rising Wedge," "Falling Wedge," "Triangle," "Rectangle," "Cup and Handle," "Inverted Cup and Handle." Its inputs: **"Patterns display"** ("All, Awaiting and Reached, Only Awaiting, Last Awaiting"), **"Price Targets"** ("All, Only Awaiting, Awaiting and Reached, None"), **"In Progress"** ("Search for emerging patterns"). The Help Center also names an **Elliott Waves** pattern indicator and a **Head and Shoulders** pattern indicator individually. Pricing row "Auto chart patterns": checkmark on every plan.

Candlestick patterns — a **"Candlestick Patterns"** menu with one indicator per pattern plus **"All Candlestick Patterns"** ("searches for all available patterns simultaneously"; you pick patterns and "bullish or bearish" signals in its settings). The 17 added in the 2019 expansion, verbatim: Dark Cloud Cover, Piercing, Morning Doji Star, Evening Doji Star, Harami Cross (Bearish), Harami Cross (Bullish), Tweezer Bottom, Tweezer Top, Rising Three Methods, Falling Three Methods, Rising Window, Falling Window, On Neck, Upside Tasuki Gap, Downside Tasuki Gap, Doji Star (Bullish), Doji Star (Bearish). The pre-existing set (Doji, Hammer, Engulfing, etc.): **could not verify the exact list**.

### 3.10 Financial / fundamental overlays (the Financials tab)

Reached via "Indicators, metrics, and strategies button on the top panel and select the Financials tab". Four groups, verbatim with TradingView's definitions:

| Group | Definition (verbatim) | Example metric names (verbatim, from the Pine financial-data list) |
|---|---|---|
| **Income Statement** | "information on a company's income, costs, profits, and losses over a period of time" | "Total revenue", "Gross profit", "Operating income", "EBIT", "EBITDA", "Net income", "Diluted earnings per share", "Cost of goods sold", "Income tax" |
| **Balance Sheet** | "a company's assets, liabilities, and shareholders' equity" | "Total assets", "Total liabilities", "Cash & equivalents", "Long term debt", "Net debt", "Book value per share", "Goodwill, net" |
| **Cash Flow** | "cash inflows and outflows of a company over a specific period" | "Cash from operating activities", "Cash from investing activities", "Cash from financing activities", "Free cash flow", "Capital expenditures", "Common dividends paid" |
| **Statistics** | financial ratios such as "price-to-earnings, price-to-sales, and price-to-book" | "Altman Z-score", "Current ratio", "Debt to equity ratio", "Gross margin %", "Net margin %", "Return on equity %" |

Period choices: "fiscal year (annual), quarter (quarterly), or trailing twelve months (TTM)" — in Pine the period codes are **FY**, **FQ**, **FH**, **TTM**. How a Financials metric is drawn once added (columns vs line, own pane): could not verify from the Help Center text. Separately, TradingView publishes a built-in Pine script **"Financials on Chart"** that "displays your choice of up to 9 fundamentals on your chart" as a table. Other fundamentals-flavoured built-ins in the Technicals list: **Dividend Yield**, **Analyst price forecast**, **Price target - indicator**.

### 3.11 Derivatives / sentiment built-ins (crypto & futures symbols)

Open Interest; Funding rate*; Liquidation data*; Long / Short Ratio Accounts; Long Short Accounts %; Top trader long/short accounts; Top trader long/short accounts ratio; Top trader long/short positions; Top trader long/short positions ratio; Basis; Premium; Index price; Mark price; Understanding crypto open interest*.

### 3.12 On-chain built-ins (crypto symbols)

1 year active supply %; Active addresses with contracts; Addresses with balance ≥ X (% of supply); Addresses with balance ≥ X (USD); Average transaction volume; Block height; Blocks mined; Created UTXOs; Difficulty; El Salvador Government balance; ETF balances; ETF flows; US spot crypto ETF balances; US spot crypto ETF flows; Ethereum new deposits / new unique depositors / new value staked / total number of deposits / total unique depositors / total value staked; Hash Rate; Held tokens in addresses ≥ X (% of supply / tokens / USD); Large transaction volume; Mean / Median block interval; Mean block size in bytes; Mean / Median gas used; Mean / Median transaction fees; Mean / Median transaction gas limit; Mean / Median transaction gas price; Mean transaction size in bytes; Mean / Median transfer volume; Mean / Median UTXO value created; Mean / Median UTXO value spent; Power-Law Model; Realized market cap; Receiving addresses; Sending addresses; RVT ratio, 90 days; Spent Output Profit Ratio (SOPR); Spent UTXOs; Stock-to-Flow Ratio in USD; Supply Equality Ratio; Total block size in bytes; Total gas used; Total transactions size in bytes; Total UTXO value created; Total UTXO value spent; Total UTXOs; Transaction fees; Transaction rate; Transfer count; Transfer rate.

### 3.13 Time / session / miscellaneous

Trading Sessions; Seasonality; Learn using seasonals*; Moon Phases.

### 3.14 Built-in strategies (Technicals › Strategies)

The sub-category exists (Pine docs). The individual built-in strategy names: **could not verify** (no Help Center list was reachable; WebSearch budget exhausted before a source was found).

Sources: Help Center folders 43000587405, 43000587408; articles 43000502040, 43000690464, 43000706927, 43000543506, 43000564727; blog "New Candlestick Patterns, Now All in One Place"; script page "Financials on Chart".

---

## 4. Per-indicator controls in the legend (status line)

Hover the indicator's row in the top-left of its pane: "Simply move your cursor over the title bar in the top left corner of the chart and buttons will appear automatically." Verbatim button names as the Help Center uses them:

| Control | Verbatim | What it does |
|---|---|---|
| Show/Hide | eye icon; Help Center calls the state "Hide" | Hides the plot without removing it (restore from the legend or "Object Tree and Data Window") |
| Settings | **"Settings"** ("the gear icon to change the settings of an indicator") | Opens the settings dialog (section 5). Double-clicking the plot also opens it |
| More | **"More"** ("the three horizontal dots") | Context menu — same as right-clicking the indicator name or its plot |
| Remove | trash icon ("click the trash icon to remove an indicator") | Removes the indicator |
| Collapse legend | **"+/- button in the top left corner"** | Shows / hides indicator titles in the status line |

Items reachable from the **More** / right-click menu, verbatim where sourced:

| Menu item | Verbatim | Sub-options |
|---|---|---|
| Add indicator on this one | **"Add indicator/Strategy on…"** | Picks another script that will use this indicator's plot as its input ("Sources used as external inputs must come from indicators, not strategies"; "Not all indicators can be calculated based on another indicator due to various technical nuances") |
| Move between panes | **"Move to"** (Help Center writes "Move To") | **"New pane above"**, **"New pane below"**, **"Existing pane above"**, **"Existing pane below"** (charting-library docs). Moving to the main chart pane = "Existing pane above/below" onto the price pane, or "Just drag it manually" |
| Scale binding | **"Pin to Scale"** | **"No Scale"**, **"Left"**, **"Right"**, **"Scale A"** ("Pin to Scale A") — see 5.4 |
| Layering | **"Visual Order"** | Sub-items (bring to front, etc.): could not verify verbatim |
| Interval visibility | **"Intervals visibility"** | Quick options that "set the appropriate settings in the Visibility tab"; option names could not verify verbatim |
| Source code | `{}` icon ("the source code `{}` icon next to a loaded script") | Opens the script in Pine Editor read-only; **"Create a working copy"** to edit |
| Apply to whole layout | (name could not verify) | Help Center: "apply a single indicator to all charts in a layout via the indicator's context menu" |
| Alerts | "Add alert on …" | Belongs to the alerts surface — not covered here |

Chart-wide switches that decide what the legend shows live in **Chart settings → Status line** ("Here, you can set the info to display next to the symbol's ticker — logo, title, chart values, and more"). The Help Center names the indicator rows there as "Indicator titles", and separately refers to "Indicator titles, parameters & values"; exact checkbox labels for arguments/values: could not verify. Rule of precedence, verbatim: "An indicator's settings control whether any plot values appear in that indicator's status line and price scale, while a chart's settings control whether status line and price scale values appear at all in any indicators on that chart."

Sources: 43000539711, 43000506677, 43000474048, 43000762829, 43000482921, 43000482922, 43000775579, 43000474299, 43000686263, 43000473925, 43000748166, 43000692404, 43000659666; Pine docs *First steps*; charting-library *Indicator placement*.

---

## 5. Configuring one indicator — the Settings dialog

Open with the gear, double-click, or **"Settings"** in the context menu. The dialog is titled with the indicator's name and always has these tabs (Pine docs: "The 'Settings' dialog always contains the 'Style' and 'Visibility' tabs"; "Inputs" appears when the script declares inputs).

### 5.1 "Inputs" tab

Everything here is generated from the script's `input.*()` calls, so the row set differs per indicator. Widget types and how they render (Pine docs *Concepts / Inputs*):

| Pine input | Renders as |
|---|---|
| `input.int()` / `input.float()` | number field with up/down arrows, or a dropdown if `options` given |
| `input.bool()` | checkbox |
| `input.color()` | colour picker |
| `input.string()` | text field, or dropdown if `options` given |
| `input.text_area()` | multi-line text (up to 40,960 characters) |
| `input.timeframe()` | timeframe dropdown |
| `input.symbol()` | symbol search widget |
| `input.session()` | session / "hh:mm" fields |
| `input.source()` | dropdown of price values (open/high/low/close/hl2/hlc3/ohlc4/hlcc4) **or other scripts' plots** — this is the second way to do indicator-on-indicator |
| `input.time()` | date-time fields plus a vertical marker on the chart |
| `input.price()` | number plus a horizontal marker on the chart |
| `input.enum()` | dropdown of enum titles |

Organisation: `group` puts rows under a section heading; `inline` puts several widgets on one line; `tooltip` adds a "?" icon. Two rows TradingView adds automatically when a script uses `indicator(timeframe=…)`: **"Timeframe"** and **"Wait for timeframe closes"** (compute the indicator on a higher timeframe than the chart, and whether to update it only when that higher bar closes).

Common labels you will see on the stock built-ins (e.g. RSI, MA): **"Length"**, **"Source"**, and for the MA-based ones a smoothing block — exact wording per indicator could not verify for all 200; the pattern above is how they are produced.

Bottom of the dialog: a **"Defaults"** dropdown with **"Save as default"** ("open the properties of the indicator and in the dropdown 'Defaults' menu select 'Save as Default'") and **"Reset settings"** ("you can always reset to the initial settings by clicking the 'Reset settings' button"). Saved defaults apply to every new copy of that indicator.

### 5.2 "Style" tab

"Settings are automatically generated in the indicator's 'Style' tab for every plot visual in the script." Per plot:

| Control | What it is |
|---|---|
| checkbox | show/hide that plot |
| colour swatch | colour picker (unless the script colours dynamically) |
| plot style dropdown | "line, step line, histogram, cross, area, columns, or circles" |
| line width | thickness |
| **"Precision"** | decimals shown in the status line and on the price scale ("Format/Precision") |
| drawing-type checkboxes | one checkbox per drawing *type* (lines, boxes, labels, tables) — "Drawing visuals … have only a checkbox per drawing type" |
| **"Labels on price scale"** | show the value tag on the axis for this indicator |
| **"Values in status line"** | show the number(s) in the legend row |

Quirk from the docs: "Disabling a plot from the indicator's 'Style' settings and then reactivating it causes the plot to revert to `display.all`, unless the indicator is reset to its default settings." An **"Outputs"** section listing calculated values: could not verify the label.

### 5.3 "Visibility" tab

"open the settings menu, go to the 'Visibility' tab and select the timeframe or interval at which you want to display the indicator." Shared with drawing tools ("The visibility of indicators is configured in line with drawing tools"). The tab has a checkbox per interval family with a from/to range; the family names (Ticks, Seconds, Minutes, Hours, Days, Weeks, Months, Ranges) are visible only in TradingView's screenshots — **could not verify verbatim**. The right-click **"Intervals visibility"** shortcut writes into this tab.

### 5.4 Pane placement and scales (indicator-specific parts only)

Default placement rule (charting-library docs): "Price indicators (e.g., Moving Average, Bollinger Bands) return values in the same range as their source" and land on the source pane with its price scale; "Non-price indicators (e.g., Stochastic) return values in a different range" and get "a new pane with a new price scale". A Pine script fixes this with `indicator(overlay=true|false)`.

| Action | How | Verbatim |
|---|---|---|
| Move to another pane | right-click name or plot, or legend "More" | **"Move to"** → "New pane above" / "New pane below" / "Existing pane above" / "Existing pane below"; or "select the indicator and move it to another pane by using your mouse" |
| Put two indicators in one pane | same "Move to → Existing pane …" | Each keeps its own scale unless pinned to the same one |
| Merge an indicator into the price pane | "Move to" onto the price pane, or drag | Help Center 43000482921 |
| Pin to a scale | right-click plot or legend name → **"Pin to Scale"** | "No Scale" (the plot "floats" and does not move with the chart), "Left", "Right", "Scale A" ("Pin to Scale A"). To make an overlay track price: "Select the same scale as your main chart (usually 'Scale A' or the 'Right' scale)" |
| Merge every scale into one axis | right-click any price scale | **"Merge All Scales Into One"** → **"On The Left"** / **"On The Right"** |
| Pane housekeeping | pane buttons at the right edge (enable in Chart Settings → Canvas) | **"Collapse Pane"** button; "minimize/restore the panel by double-clicking anywhere in the pane with the Ctrl / ⌘ key pressed". Move-pane-up/down and delete-pane buttons exist but their labels could not verify |
| Limit | — | "A pane can contain up to eight price scales" (charting-library docs) |

Sources: Pine docs *Inputs*, *Visuals / Overview*; blog "Set your own default settings for indicators"; 43000480333, 43000659666, 43000686263, 43000762829, 43000482921, 43000482922, 43000775579, 43000485562, 43000665813; charting-library *Indicator placement*.

---

## 6. Indicator templates

Definition, verbatim: "Indicator templates are a way of grouping several indicators together into a single package, which you can later apply to any chart." What is stored: the indicators **with their current settings**, plus the interval, plus optionally the symbol.

| Element | Verbatim | Notes |
|---|---|---|
| Toolbar button | **"Indicator Templates"** | Next to the Indicators button |
| Save | **"Save indicator template"** → **"Save Indicator Template"** dialog | Name field; checkbox **"Remember Symbol"** ("check the 'Remember Symbol' box. Once you've applied this template, the saved symbol will simultaneously be applied to the chart"). The blog says the interval is remembered as standard; a separate "Remember Interval" checkbox could not verify |
| Apply | click a template in the dropdown | "When applying a template, existing indicators are removed and replaced with the template's indicators." |
| Warning | — | "Drawing objects are not saved in the indicator template, so they are removed from the additional indicator panels when using templates." |
| Built-in templates | **"Bill Williams' 3 Lines"**, **"Displaced EMA"**, **"MA Exp Ribbon"**, **"Oscillators"**, **"Swing Trading"**, **"Volume Based"** | Six defaults shipped with every account |
| Delete / rename | — | could not verify the exact menu items |

Related: templates are per chart, not per layout; "Indicators are not synchronized between layouts and the charts in them" but you can apply "all indicators from one chart to others using the chart context menu option."

Sources: 43000543048, 43000692404; blog "Indicator Templates With a Saved Symbol".

---

## 7. Limits by plan

From the pricing page comparison table (row labels verbatim). Plans: **Basic** (free), **Essential** ($12.95/mo billed annually), **Plus** ($29.95), **Premium** ($59.95), **Ultimate** ($199.95). The Pine docs also mention an **Expert** tier between Premium and Ultimate for data limits; it is not in the public table I fetched.

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| **"Indicators per chart"** | 2 | 5 | 10 | 25 | 50 |
| **"Indicator on indicator"** | 1 | 1 | 9 | 24 | 49 |
| **"Custom indicator templates"** | 1 | could not verify (cell rendered as a dash/checkmark to my fetcher; TradingView's layout implies more than 1) | same | same | same |
| **"Historical bars available"** | 5K | 10K | 10K | 20K | 40K |
| **"Volume Profile indicators"** | could not verify | ✓ | ✓ | ✓ | ✓ |
| **"Auto chart patterns"** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **"Pine Script®"** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **"Strategy backtesting"** | ✓ ("Basic report metrics") | ✓ | ✓ | ✓ | ✓ |
| **"Deep backtesting"** | — | see note | ✓ | ✓ | ✓ |
| **"Publish invite-only scripts"** / **"Publish protected scripts"** | — | listed at Essential / Plus in one fetch | | | |

Deep Backtesting note: the Help Center article says "This feature is available for Premium and higher plan users"; the pricing table read as available from Plus (one fetch) or Essential (another). Treat the Help Center statement as authoritative and the exact lower bound as **could not verify**.

Pine-level limits that also bite regardless of plan (Pine docs *Writing / Limitations*): 64 plot counts per script; 40 unique `request.*()` calls (64 on Ultimate); execution budget 20 s on Basic, 40 s otherwise; 500 ms per loop per bar; 50 displayed lines/boxes/labels by default (500 max), 9 tables; 100,256 compiled tokens per script; strategies capped at 9,000 orders normally and 1,000,000 with Deep Backtesting; chart bars by plan "5,000 (basic), 10,000 (Essential/Plus), 20,000 (Premium), 25,000 (Expert), 40,000 (Ultimate)".

Sources: tradingview.com/pricing; 43000666265; Pine docs *Limitations*.

---

## 8. Pine Script and the Pine Editor — summary level

**What it is.** "Pine Script® is a programming language developed by TradingView, used for writing proprietary indicators and strategies that can be added to your chart and used in technical analysis." Current version **v6**. "Pine Script is cloud-based" — scripts "run on our servers", not in the browser. Script kinds: **indicators** (`indicator()`), **strategies** (`strategy()` — "include logic to issue trading orders and can be backtested and forward-tested"), and **libraries** (`library()`, reusable functions).

**Where the editor is.** "Click the 'Pine' icon on the right toolbar"; it "opens as a floating panel" by default, can be docked ("dock the editor to the right side of the chart"), detached to its own window, or moved with the **"Move to bottom"** option. Every built-in is readable: the `{}` icon next to a loaded script opens it read-only; **"Create a working copy"** makes it editable.

**Editor controls (verbatim).**

| Area | Items |
|---|---|
| Script-name menu | "Save script, Make a copy, Rename, Access Version history, Create new Indicator, strategy, or library, Open script, Choose recently used scripts" |
| Action buttons | **"Add to the chart"** ("Apply the current script to your chart for testing or visualization"), **"Publish script"** ("Share your script with the community") |
| Editor settings | **"Suggestions as you type"** (autocomplete), **"Minimap"**, **"Line length guide"** |
| Developer tools | **Profiler** mode, **Pine logs** |
| Shortcuts | word wrap Alt+Z / Option+Z; **F1** Command Palette (font size etc.) |

Saved scripts land in the dialog's **Personal** tab; published ones in **Community** as Open / Protected / Invite-only. Help resources TradingView points at: the User Manual, the Pine Script Reference, the primer, the built-in open-source indicators, Community Scripts, the Pine chat and Stack Overflow.

Sources: 43000561836, 43000763320; Pine docs *Welcome*, *First steps*, *Limitations*.

---

## 9. Strategy Tester — outputs

Opening: add any script whose first line is `strategy()` ("Technicals → Strategies or Community"); "the Strategy Report opens automatically when you add any strategy" at the bottom of the screen. Strategy plots and trade markers also draw on the chart itself.

### 9.1 Header controls

| Control | Verbatim / behaviour |
|---|---|
| Strategy name + settings gear | opens the same Settings dialog as an indicator, plus a **"Properties"** tab (9.4) |
| **Deep Backtesting** toggle | "On the right, you will see a toggle to activate the Deep Backtesting mode. Then, you can select the necessary date and click Generate report." Results "are only shown in the Strategy Report tab and are not displayed on the chart"; a pink icon marks the mode; **"Update report"** after edits; **"Reset to chart session"** to leave. Limits "up to two million bars and one million trades". Premium+ per Help Center |
| Absolute / Percentage switch | "The chart defaults to Absolute values (currency), but you can switch to Percentage" |
| Date range selector | on the Overview / Key stats chart |

### 9.2 Tabs — two generations of the report

TradingView redesigned the report in 2026. The Help Center "how to start" article still describes the older tab set; the Pine docs describe the current one. Both are recorded because users will see either depending on rollout.

Older / Help Center tab set: **"Overview"**, **"Performance"**, **"Trades analysis"**, **"Risk/performance ratios"**, **"List of trades"** (+ **"Properties"** on published reports). "Performance" shows every metric "for all trades, as well as for longs and shorts" (columns All / Long / Short).

Current / Pine-docs tab set: **"Metrics"** and **"Trades"** (+ **"Properties"** on published reports: "Date range", "Symbol info", "Strategy inputs", "Strategy properties"). Metrics is split into five blocks; "Most tables reveal a 'Show description' icon next to a metric's name when hovering, opening Help Center details."

### 9.3 Every metric, by block (verbatim)

| Block | Metrics |
|---|---|
| **Key stats** | Total P&L; Max equity drawdown; Total trades; Profitable trades; Profit factor — plus the **Performance chart**: "Cumulative PnL", "Buy and Hold (Blue line)", "Trades excursions (Vertical bars)" with "Favorable excursion (green bar) … (MFE)" and "Adverse excursion (red bar) … (MAE)", and "Run-ups and drawdowns" layer; tooltip shows trade number/type, cumulative PnL, excursions, buy-and-hold value |
| **Return details** | Initial capital; Open profit/loss; Net profit/loss; Gross profit; Gross loss; Profit factor; Commission paid; Expected payoff per trade; Buy & hold return; Outperformance; Sharpe ratio — with "Profit structure" and "Benchmarking" graphs |
| **Risk-adjusted performance** | Sharpe ratio; Sortino ratio (older report also listed "Margin calls" here) |
| **Trades analysis** | Total trades; Winning trades; Losing trades; Percent profitable; Average P&L; Average winning trade; Average losing trade; Ratio avg win/avg loss; Largest winning trade; Largest losing trade; Average bars in trades — with "Returns distribution" histogram and "Trades distribution" donut |
| **Equity run-ups and drawdowns** | Average run-up duration; Average drawdown duration; Max equity run-up; Max equity drawdown; Profit/loss to max drawdown ratio |
| **Capital efficiency** | Compound annual growth rate (CAGR); Minimum account size; Overall return percentage; Margin calls; Average margin per trade; Maximum margin used |
| **Trades** tab columns | Trade number (older: "Trade #"); Type; Date and time; Signal; Price; Size (older: "Position size"); Return (older: "Net P&L"); Favorable excursion; Adverse excursion; Cumulative P&L; Duration (bars). "Trades are arranged chronologically by execution of entry orders. By default, the last trade is at the very top"; click "Trade #" to reverse; "Clicking on any entry or exit will scroll your chart to the corresponding bar" |

### 9.4 The strategy "Properties" tab (inputs that change the report)

Verbatim field names from the Pine docs: **Initial capital**; **Account currency** (Help Center: "Base currency"); **Order size** with units "Contracts / Currency / % of equity"; **Pyramiding** ("Maximum number of open trades from entry orders"); **Commission** (several types); **Verify price for limit orders**; **Slippage**; **Margin for long positions**; **Margin for short positions**; **Recalculate** — "After order is filled", "On every tick", "On bar close"; **Historical bar detail** / bar magnifier — "'High' option for Premium/Ultimate plans; controlled via `use_bar_magnifier`"; **Using standard OHLC** (fill orders on real prices when the chart is Heikin Ashi). TradingView's own warning: "Strategy orders are filled using the chart's OHLC values", so "exercise caution when using strategies on non-standard chart types" (Renko, Kagi, P&F, Range).

Sources: 43000764138, 43000681733, 43000681735, 43000681683, 43000681737, folder 43000587044, 43000666199, 43000666265, 43000481029; Pine docs *Strategies*.

---

## What this means for OnStock

OnStock today: `src/lib/indicators.js` has pure `sma`, `ema`, `rsi`, `vwap` (null-padded, same-length arrays); `CandleChart.jsx` toggles `sma20` / `ema50` as overlays and adds/removes a fixed-height `rsi14` pane (lightweight-charts v5 panes). There is no dialog, no per-indicator settings, no templates, and the gap series is a separate Gap|Candles mode rather than an indicator.

1. **Adopt — one "Indicators" entry point with search and a `/` shortcut.** TradingView's whole catalogue hangs off one button + one keystroke. OnStock's desktop needs a searchable list, not three checkboxes; the list can be short (a dozen items) and still use the same shape (Favorites at top, "Technicals", "OnStock" for gap-native series).
2. **Adapt — treat "Gap", "Stock (delayed)", "Treasury yield" as indicators in the same list, not as chart modes.** TradingView's Financials tab shows the pattern: symbol-dependent metrics living beside technicals and dropping into their own pane. The gap series in its own pane under the token candles, with the stock close as an overlay pinned to the same scale, is exactly the "Existing pane below" / "Pin to Scale A" mechanic — and it lets Gap|Candles become "both at once" instead of a toggle.
3. **Adopt — the three-tab settings dialog: Inputs / Style / Visibility.** Even with four indicators, users expect "Length", "Source", colour, line width, "Precision", "Values in status line", and a per-interval Visibility rule (e.g. hide the 1D SMA on the 1m chart). Generate the Inputs tab from a small schema per indicator, the way Pine generates it from `input.*()`.
4. **Adopt — "Defaults → Save as default / Reset settings".** Cheap (localStorage or the user's Supabase profile) and it is the single most-used indicator convenience on TradingView.
5. **Adopt — legend rows with hover buttons (hide / settings / more / remove) and the +/- collapse.** This is the desktop affordance the phone UI lacks; the "More" menu is where Move to, Pin to scale and "Add alert on…" (OnStock's existing price + gap-drift alerts) belong.
6. **Adapt — panes and scales, but with a small fixed menu.** Implement "Move to → New pane above/below, Existing pane above/below" and "Pin to Scale → Right / Left / No Scale". lightweight-charts v5 already has panes; OnStock currently hard-codes the RSI pane at index 1 and 80 px — replace with a pane list the user can reorder, collapse (TradingView's "Collapse Pane") and resize.
7. **Adopt — indicator templates with "Remember Symbol" / interval.** OnStock already has watchlists/folders; a template that restores "SMA20 + EMA50 + Gap pane + RSI on 1h" per symbol group is the desktop equivalent of a saved view. Ship 2-3 named defaults the way TradingView ships six ("Oscillators", "Volume Based"…), e.g. "Gap watch", "Momentum", "Yield overlay".
8. **Adapt — the indicator-on-indicator idea for the gap.** TradingView's "Add indicator/Strategy on…" plus `input.source` lets an RSI run on another plot. OnStock's most useful version is RSI / SMA / Bollinger *of the gap series* (gap mean-reversion is the thesis). Expose the gap as a selectable "Source".
9. **Adapt — a modest catalogue, chosen for gap trading.** From the built-in groups, the ones that matter for OnStock's data are: VWAP (already coded), Bollinger Bands and Keltner Channels on the gap, ATR and Historical Volatility, MACD, Correlation Coefficient (token vs stock — TradingView has this built in), Relative Volume at Time, Volume Delta. Skip breadth, Bill Williams, on-chain and candlestick patterns.
10. **Skip — Pine Script and a Pine Editor.** A scripting language, server-side execution and a community library are TradingView's moat and years of work; OnStock's audience is a security-cautious beginner and a small token universe. A JSON/schema-driven indicator definition is enough.
11. **Skip — the Strategy Tester in full; adapt one idea from it.** OnStock routes trades out to Jupiter and has no order engine, so a backtester is out of scope. What *is* worth copying is the "Buy & hold" vs "Cumulative P&L" equity chart as a **gap-close backtest**: "if you had bought the token whenever the gap exceeded X and sold on close, here is the curve." That reuses the gap series and needs no order model.
12. **Adopt — honest limits and warnings in the UI.** TradingView states data limits ("Historical bars available", 600-bar pattern lookback) and non-standard-chart caveats plainly. OnStock should label the stock series "delayed" and the 1m token candles' history depth in the same place indicators are added.
13. **Skip — per-plan gating of indicator counts.** OnStock has no tiers; the only limit worth enforcing is a rendering sanity cap (e.g. 10 per chart), stated in the dialog like TradingView does.
14. **Adapt — Financials-style "symbol-dependent" tab.** TradingView's Financials tab changes contents by symbol. OnStock's equivalent: an "Underlying" tab that offers the Yahoo OHLC, Treasury yield, and the tokenization news markers only when the token has a mapped stock — and hides itself otherwise.

---

## Sources (every URL actually read)

- https://www.tradingview.com/pine-script-docs/primer/first-steps/
- https://www.tradingview.com/pine-script-docs/concepts/inputs/
- https://www.tradingview.com/pine-script-docs/visuals/overview/
- https://www.tradingview.com/pine-script-docs/concepts/strategies/
- https://www.tradingview.com/pine-script-docs/writing/limitations/
- https://www.tradingview.com/pine-script-docs/welcome/
- https://www.tradingview.com/pricing/
- https://www.tradingview.com/support/solutions/43000543626-tradingview-indicators-simple-steps-to-get-started/
- https://www.tradingview.com/support/solutions/43000543506-how-to-access-financial-data-on-tradingview/
- https://www.tradingview.com/support/solutions/43000564727-what-financial-data-is-available-in-pine/
- https://www.tradingview.com/support/solutions/43000760059-how-to-read-financial-statements/
- https://www.tradingview.com/support/solutions/43000482573-what-are-the-different-types-of-published-scripts/
- https://www.tradingview.com/support/solutions/43000653372-why-i-do-not-have-an-invite-only-scripts-tab-in-my-indicators-library/
- https://www.tradingview.com/support/solutions/43000555216-how-to-try-indicators-and-strategies-from-the-community-on-your-chart/
- https://www.tradingview.com/support/solutions/43000662392-how-to-favorite-indicators-financials-drawing-tools-and-timeframes/
- https://www.tradingview.com/support/folders/43000587405-built-in-indicators/
- https://www.tradingview.com/support/folders/43000587408-volume-profiles/
- https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/
- https://www.tradingview.com/support/solutions/43000653375-i-cannot-find-the-volume-profile-indicators/
- https://www.tradingview.com/support/solutions/43000690464-auto-chart-patterns-on-tradingview/
- https://www.tradingview.com/support/solutions/43000706927-all-chart-patterns/
- https://www.tradingview.com/blog/en/new-candlestick-patterns-20461/
- https://www.tradingview.com/support/solutions/43000480333-how-to-adjust-the-indicator-settings/
- https://www.tradingview.com/support/solutions/43000659666-i-want-to-hide-the-values-of-individual-indicators/
- https://www.tradingview.com/support/solutions/43000686263-how-to-quickly-adjust-visibility-of-a-drawing-or-indicator/
- https://www.tradingview.com/blog/en/customizable-indicator-visibility-25782/
- https://www.tradingview.com/support/solutions/43000539711-how-to-show-hide-settings-and-remove-options-of-an-indicator-or-ticker-symbol/
- https://www.tradingview.com/support/solutions/43000506677-how-do-i-remove-or-customize-an-indicator/
- https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/
- https://www.tradingview.com/support/solutions/43000473925-indicator-titles-parameters-values-disappeared-from-the-legend-top-left-corner-of-the-chart/
- https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/
- https://www.tradingview.com/support/solutions/43000474048-how-to-apply-an-indicator-or-strategy-to-another-indicator/
- https://www.tradingview.com/support/solutions/43000474299-how-can-i-change-the-visual-order-layer-of-indicators-drawings-candles/
- https://www.tradingview.com/support/solutions/43000762829-how-to-move-an-indicator-to-the-main-pane/
- https://www.tradingview.com/support/solutions/43000482921-how-can-i-merge-the-chart-and-indicator-into-one-pane/
- https://www.tradingview.com/support/solutions/43000482922-how-to-place-two-indicators-on-one-pane/
- https://www.tradingview.com/support/solutions/43000775579-indicator-moves-separately-or-is-not-attached-to-the-price/
- https://www.tradingview.com/support/solutions/43000485562-how-can-i-merge-all-price-scales-into-one-on-the-left-or-right-side/
- https://www.tradingview.com/support/solutions/43000665813-how-to-collapse-separate-panes/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/indicators/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/indicators/indicator-placement
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Panes-And-Scales-Behavior/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend/
- https://www.tradingview.com/support/solutions/43000543048-what-are-indicator-templates/
- https://www.tradingview.com/blog/en/indicator-templates-with-a-saved-symbol-19213/
- https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
- https://www.tradingview.com/support/solutions/43000561836-what-is-pine-script/
- https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/
- https://www.tradingview.com/support/solutions/43000764138-tradingview-strategy-report-how-to-start/
- https://www.tradingview.com/support/solutions/43000681733-overview-tab/
- https://www.tradingview.com/support/solutions/43000681735-performance-chart/
- https://www.tradingview.com/support/solutions/43000681683-performance-summary-tab/
- https://www.tradingview.com/support/solutions/43000681737-list-of-trades-tab/
- https://www.tradingview.com/support/folders/43000587044-i-d-like-to-know-more-about-values-in-the-strategy-tester-report/
- https://www.tradingview.com/support/solutions/43000666199-what-is-deep-backtesting/
- https://www.tradingview.com/support/solutions/43000666265-how-deep-backtesting-works/
- https://www.tradingview.com/support/solutions/43000481029/ (strategies on non-standard chart types)
- Search-result snippets (not fetched in full): blog "Set your own default settings for indicators" (blognew.tradingview.com …/set-your-own-default-settings-for-indicators-859/), Help Center 43000614331 Technical Ratings, 43000615189 Private invite-only scripts, 43000653373 Why cannot I use an Invite-Only indicator, script page "Financials on Chart" (tradingview.com/script/Lbxl9OqZ-Financials-on-Chart/).
