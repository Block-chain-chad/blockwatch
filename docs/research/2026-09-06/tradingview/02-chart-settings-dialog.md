# TradingView teardown — surface 02: the Chart settings dialog (the gear)

*Researched 2026-09-06 for the OnStock desktop build. Scope: everything reachable from the gear button — every tab, every option — plus the price-scale, time-scale, pane, legend and chart-canvas right-click menus that feed the same settings. Other surfaces (toolbar, chart types, indicators, drawings, alerts UI, layouts, watchlist…) belong to their own teardowns and are only mentioned where an option in this dialog points at them.*

## How to read this document

- **Verbatim** option names are shown in `code` or **bold** exactly as TradingView's own Help Center / docs print them. Where the Help Center only describes an option in prose (no exact label), the name is given in plain text and flagged *(label not verified)*.
- **Where it lives** is the tab and section inside the dialog, or the context menu that also exposes it.
- **Tier**: TradingView's pricing table does not gate anything inside this dialog by plan (see §11). The one hard gate found is data-driven, not plan-driven (countdown vs. delayed data). Everything else: no gate found.
- TradingView ships the same engine in two forms: the website (tradingview.com/chart, "Supercharts") and the embeddable **Advanced Charts** library. The library's public docs list every override property, action ID and featureset by name, which is the most precise public record of what the dialog contains. When a Help Center article and the library docs disagree on a label, the Help Center wins for the website UI and the discrepancy is noted.
- Everything below was read from the pages listed in §13. Nothing is inferred from memory; where a claim couldn't be verified it says so.

---

## 1. How the dialog opens and how it is shaped

| Fact | Detail | Source |
|---|---|---|
| Entry points | The **gear button on the upper toolbar**; the **gear at the bottom of the chart** (next to the price scale / time-zone control); **double-click on the price line or on the bars/candles**; **right-click the chart → Settings**. | [Configure Supercharts], [Getting started], [24h session], [Day of week] |
| Tabs (left rail), in order | **Symbol**, **Status line**, **Scales and lines**, **Canvas**, **Trading**, **Alerts**, **Events**. **Template** is a dropdown at the bottom-left of the dialog, not a tab. | [Configure Supercharts] (article's table of contents lists them in that order) |
| Tabs change with context | "chart settings can differ when it comes to the chart type and symbol. Symbol section changes according to the chart type you choose, and corporate events like stock splits are impossible for Bitcoin." The **Pane separator** row only appears once there is a second pane. | [Configure Supercharts], [Chart overrides] |
| Dialog is movable | "You can even move this settings window around if it obstructs your view" — third-party, but consistent with library featureset `constraint_dialogs_movement` ("Keeps the dialogs within the chart"). | [Brown Report], [Featuresets] |
| Persistence | Chart settings are stored per chart, but some Scales options are global: the **Date format** "will apply to all charts that you view". Settings can be saved/applied via **Template**. | [Date format], [Configure Supercharts] |
| Library action IDs | Opening the dialog is action `Chart.Dialogs.ShowGeneralSettings`; there are direct actions for the **Symbol** tab (`…SymbolTab`), the **Status line** tab (`…LegendTab`) and the **Scales** tab (`…ScalesTab`) — i.e. the legend's own menu and the price scale's own menu deep-link into the matching tab. | [ActionId] |

---

## 2. Tab: Symbol

The Symbol tab has two halves: the **chart-style block** at the top (whose rows change with the chart type chosen in the toolbar) and a **Data modification** block underneath, followed by the price-line/label rows.

### 2.1 Chart-style block (varies by chart type)

The Help Center documents the Candles and Bars sections explicitly; the library override list names the property groups for every style, which tells you what rows exist for each.

**Candles** section (chart type = Candles):

| Option (verbatim) | What it does | Library property | Source |
|---|---|---|---|
| **Color bars based on previous close** | "the color of each bar will be determined by whether its close price is higher (green) or lower (red) than the close price of the previous bar, rather than by the bar's own open and close prices." | `candleStyle.barColorsOnPrevClose` | [Candlesticks], [ChartPropertiesOverrides] |
| **Body** (checkbox + up/down colour swatches) | "Change the color and fill of the candles' bodies." | `candleStyle.drawBody`, `upColor`, `downColor` | [Candlesticks], [ChartPropertiesOverrides] |
| **Borders** (checkbox + up/down colour swatches) | "Change the color of the candles' edges." | `candleStyle.drawBorder`, `borderUpColor`, `borderDownColor` | same |
| **Wick** (checkbox + up/down colour swatches) | "Change the color of the candles' wick." | `candleStyle.drawWick`, `wickUpColor`, `wickDownColor` | same |

Library defaults for reference: up `#089981`, down `#F23645` (the Renko defaults on the overrides page use the same pair) — [ChartPropertiesOverrides].

**Bars** section (chart type = Bars):

| Option (verbatim) | What it does | Library property | Source |
|---|---|---|---|
| **Color bars based on previous close** | as above | `barStyle.barColorsOnPrevClose` | [Bar charts] |
| **HLC bars** | "Disables the opening prices." | `barStyle.dontDrawOpen` | [Bar charts] |
| **Up color / Down color** | "Change the colors for bullish or bearish bars." | `barStyle.upColor` / `downColor` | [Bar charts] |
| **Thin bars** | "Adjust the thickness of the bars for better visibility." | `barStyle.thinBars` | [Bar charts] |

**Other chart types** — the library lists a property group per style, i.e. a section of rows appears for whichever style is active: Line (`lineStyle`: color, line style, line width, **price source**), Baseline (`baselineStyle`: base level %, top/bottom line colours & widths, fill colours, transparency), Stepline, Volume candles, Area, HLC Area (separate high/low/close line widths & styles), HLC bars, Line With Markers, Hollow Candles (`hollowCandleStyle` — same body/border/wick trio), Heikin Ashi (`haStyle` — same trio + colour-on-prev-close), Columns, High-low, Renko, Line Break (`pbStyle`), Kagi, Point-and-Figure (`pnfStyle`), each with "projection" colours where applicable. Line-type styles carry a **Price source** row (`priceSource`, default `"close"`). Exact on-screen labels for these non-candle sections were not found in the Help Center — *(labels not verified)*. — [Chart overrides], [ChartPropertiesOverrides]

Chart types available also depend on plan: "Customizable chart types" is 17 on Basic/Essential/Plus and 21 on Premium/Ultimate — [Pricing]. (Which four are gated is another surface's job.)

### 2.2 Data modification block

| Option | Where / values | What it does | Source |
|---|---|---|---|
| **Session** *(label per 24h article; the Configure article says "select a session")* | Symbol tab, "For stocks and funds". Values: regular hours, extended hours, and **24h** where supported ("Go to the Symbol tab and select 24h under Session"). Also switchable from the **session toggle button in the bottom toolbar** and the **ETH** button in the bottom-right. | Regular = "excluding pre- and post-market data"; extended = "including pre- and post-market data"; 24h merges RTH + ETH + overnight for "BOATS-supported US stocks" into one 24/5 intraday series. Intraday only ("extended sessions are only visible on intraday resolutions"). "If no Extended Hours data for the symbol is available, the ETH button will not be shown… the Extended Hours option in the Settings menu will still be present, but it will not change anything". | [Configure Supercharts], [24h session], [Extended hours], [Extended sessions doc] |
| Extended-hours **tint** colours | Symbol tab, next to the session control: "There you can also change or remove the tint that highlights Extended Hours data on the chart by default." Library exposes `backgrounds.preMarket.color`, `backgrounds.postMarket.color`, `backgrounds.outOfSession.color` and says "Users can adjust the subsession colors in the Chart settings dialog". | Shades the pre-market / post-market bars. | [Extended hours], [Extended sessions doc] |
| **Adjust for contract changes** *(label not verified; prose: "adjust data for contract changes")* | Symbol tab, futures only | "allows back-adjustment in continuous futures to remove the price gap" | [Configure Supercharts] |
| **Adjust for dividends** *(label not verified; prose: "For dividends, adjust data")* | Symbol tab, stocks | "if you want more precise charts that account for a company's dividends distribution as it can greatly impact the chart's outlook." | [Configure Supercharts] |
| **Use settlement as close on daily interval** | Symbol tab, futures & continuous contracts; also a **set** button at the bottom of the chart | Chooses whether daily+ bars close on the **Last price** ("the real last trade that closed the trading day") or the **Settlement price** (exchange-calculated). Default: settlement ON for futures. Field is absent on intraday intervals. "Watchlist, Details, Screener always use Settlement prices". | [Settlement] |
| **Precision** | Symbol tab. Values: **Default** plus a list of decimal counts (library `minTick` list runs 1, 10, 100 … 100000000 decimal steps and 1/2 … 1/320 fractional steps) | "choose the price format to display on the price scale and in values near the symbol's status line." "Set Default to get a standard view of prices that the provider sends." | [Configure Supercharts], [Decimals], [Chart overrides] |
| **Timezone** | Symbol tab; also the **clock at the bottom of the chart** | "You can set a particular timezone or choose 'Exchange' so that the chart will automatically switch to this exchange's time." Library ships ~100 IANA zones (`Etc/UTC`, `America/New_York`, …) and allows custom aliases. | [Configure Supercharts], [Timezone article], [Time zones doc] |

### 2.3 Price lines and labels drawn from the Symbol tab

These rows toggle horizontal lines on the chart (their price-scale *labels* are toggled separately under Scales and lines — see §4). The library's `Chart.Lines.*` action group is the exact set:

| Line (name as the library/Help Center calls it) | Toggle / styling | Notes | Source |
|---|---|---|---|
| **Last price line** *(Help Center prose: "price line"; library: "Main series price line")* | `showPriceLine` (default **on**), `priceLineWidth` (default 1), `priceLineColor` | The dotted line at the current price. Action `Chart.Lines.ToggleSeriesPriceLineVisibility`. | [Chart overrides], [ChartPropertiesOverrides], [ActionId] |
| **Previous close price** line | `showPrevClosePriceLine` (default **off**), `prevClosePriceLineColor` (default `#555555`), width 1 | Horizontal line at yesterday's close. Older blog phrasing: "tick the 'Previous Close Price Line' box". Action `Chart.Lines.ToggleSeriesPrevCloseLineVisibility`. | [ChartPropertiesOverrides], [ActionId], search snippet of the 2018 blog (page now 404 — *exact current label not verified*) |
| **Bid and Ask Lines** | Symbol tab → **Bid and Ask Lines**; colours via **Bid and Ask Lines Settings** (`bidAsk.bidLineColor`, `askLineColor`, `lineStyle` default dotted, `lineWidth`) | "Lines and labels on the price scale can be enabled and disabled independently". Action `Chart.Lines.ToggleBidAskLinesVisibility`. Needs a quote feed with bid/ask. | [Bid/Ask blog], [ChartPropertiesOverrides], [ActionId] |
| **High/low price lines** | `highLowAvgPrice.highLowPriceLinesVisible`, `highLowPriceLinesColor`, `highLowPriceLinesWidth` | Lines at the visible range's high and low. Action `Chart.Lines.ToggleHighLowLinesVisibility`. | [Chart overrides], [ChartPropertiesOverrides], [ActionId] |
| **Average close price** line | `highLowAvgPrice.averageClosePriceLineVisible`, `averagePriceLineColor`, `averagePriceLineWidth`; in the library it is hidden unless featureset `show_average_close_price_line_and_label` is on | Action `Chart.Lines.ToggleAverageLineVisibility`. | [Featuresets], [ChartPropertiesOverrides], [ActionId] |
| **Pre/post market price line** | Action `Chart.Lines.TogglePrePostMarketPriceLineVisibility`; label counterpart `scalesProperties.showPrePostMarketPriceLabel` (default on) | Shown only while the chart displays the *regular* session and the market is in pre/post; "if the chart is set to display the extended session, the lines will not be visible, as the data is already displayed". | [ActionId], [ChartPropertiesOverrides], search snippet of the library "Extended sessions" page |

*Where these rows sit:* the Configure article groups "symbol values, high/low, and other values format, visibility, and colors" under **Scales and lines → Price labels and lines**, while the Bid/Ask blog places **Bid and Ask Lines** on the **Symbol** tab. TradingView has moved these rows between the two tabs over the years; treat "Symbol tab = the lines, Scales and lines tab = their scale labels" as the current split, per the bid/ask blog's own wording ("lines… on the chart" vs "labels on the price scale").

---

## 3. Tab: Status line

"Here, you can set the info to display next to the symbol's ticker — logo, title, chart values, and more." The library calls this the **Legend** ("a list of series and indicators at the top-left corner of any chart… the legend position cannot be changed"). Every row here also exists as a right-click toggle on the legend itself (`Chart.Legend.Toggle…` actions).

| Option (verbatim where known) | What it does | Library property / action | Source |
|---|---|---|---|
| **Logo** | Shows the symbol's logo before its name (library: needs `show_symbol_logo_in_legend`). | featuresets `show_symbol_logos`, `show_symbol_logo_in_legend` | [Legend doc], [Configure Supercharts] |
| **Title** (dropdown) | Choose what the legend prints: **Description**, **Ticker**, or **Ticker and description**. | `mainSeriesProperties.statusViewStyle.symbolTextSource` (default `"description"`); `showExchange`, `showInterval` control the exchange suffix and interval chip | [Legend doc], [ChartPropertiesOverrides] |
| Symbol (row toggle) | Hides/shows the symbol row entirely. | `Chart.Legend.ToggleSymbolVisibility`, `legendProperties.showSeriesTitle` | [ActionId], [ChartPropertiesOverrides] |
| **Open market status** | The little clock/dot that says whether the market is open, pre-market, post-market or closed; clicking it opens the **Market Status** pop-up with the session timeline (exchange time zone). "right-click on the Status line… select **Show Open market status**" or "Chart settings dialog on the Status line tab". | featureset `display_market_status`; action `Chart.Legend.ToggleOpenMarketStatusVisibility` | [Market status blog], [Market Status doc], [ActionId] |
| **OHLC values** | Open/High/Low/Close of the bar under the cursor (or the last bar). | `legendProperties.showSeriesOHLC` (default true); `Chart.Legend.ToggleOhlcValuesVisibility` | [ChartPropertiesOverrides], [ActionId] |
| **Bar change values** | The change and % change of that bar. Library can colour it by sign (`legend_bar_change_colors_based_on_value`, action `Chart.Legend.ToggleBarChangeColor`). | `legendProperties.showBarChange` (default true); `Chart.Legend.ToggleBarChangeValuesVisibility` | same |
| **Last day change values** | Daily change and % (needs quote data; library hides the row unless `legend_last_day_change` is enabled). | `legendProperties.showLastDayChange` (default false); `Chart.Legend.ToggleLastDayChangeValuesVisibility` | [Legend doc], [ActionId] |
| **Volume** | The bar's volume in the legend. | `legendProperties.showVolume` (default **false**); `Chart.Legend.ToggleVolumeVisibility` | [ChartPropertiesOverrides], [ActionId] |
| Price source | Shows which price feed (e.g. last/mid) the series uses, when the symbol offers several. | featureset `symbol_info_price_source`; `Chart.Legend.TogglePriceSourceVisibility` | [Featuresets], [ActionId] |
| **Indicator titles** | Indicator names in the legend. | `legendProperties.showStudyTitles`; `Chart.Legend.ToggleIndicatorTitlesVisibility` | same |
| **Indicator arguments** | The inputs after the name, e.g. `20, close`. Library hides boolean args unless `dont_show_boolean_study_arguments` is off. | `legendProperties.showStudyArguments`; `Chart.Legend.ToggleIndicatorArgumentsVisibility` | same |
| **Indicator values** | Live readings of each plot. Per-indicator override: Indicator settings → **Style** → **Values in the status line** (and **Labels on the price scale**). "if the settings… are disabled globally… values and labels won't be displayed for individual indicators." | `legendProperties.showStudyValues`; `Chart.Legend.ToggleIndicatorValuesVisibility` | [Hide values], [ActionId] |
| Background (+ transparency) | Draws a translucent plate behind the legend text. | `legendProperties.showBackground` (default true), `backgroundTransparency` (default 50) | [ChartPropertiesOverrides] |
| Wrap text | Third-party sources mention a **Wrap text** row — *could not verify* in TradingView's own docs. | — | [Moneysukh] |

Related behaviours:
- The `+`/`−` button at the top-left of the chart collapses the indicator lines of the legend ("show/hide indicator titles in the legend (status line) by clicking the plus (+/-) button") — [Legend gone].
- The legend shows values for **all** charts in a layout only when **Crosshair synchronization** is on in the layout menu — [Status line on all charts].
- Mobile shows only "Last and Daily Change values" until you long-press a bar — [OHLC mobile].
- The **Data is delayed** badge (a **D** icon) appears in the legend when the feed is delayed — [Legend doc].
- Hovering the legend reveals per-item buttons: **Hide**, **Settings**, **Remove**, plus an ellipsis menu; the resolution chip is editable in place — [Featuresets] (`edit_buttons_in_legend`, `legend_inplace_edit`, `hide_resolution_in_legend`).

---

## 4. Tab: Scales and lines

"Here, you can choose what labels and values will be displayed on the price and time scales. There are three main sections." — [Configure Supercharts]

### 4.1 Section: Price scale

| Option | Values | What it does | Source |
|---|---|---|---|
| **Currency** and **Unit** (Help Center: "the **Currency and Units** menu item"; library: separate **Currency** and **Unit** context menus) | display modes for whether the currency code / unit of measure is printed on the price scale | "Set the currency and unit visibility". Library shows them only with featuresets `pricescale_currency` / `pricescale_unit`. Currency conversion (viewing a symbol in another currency) hangs off the same menu. | [Currency label], [Featuresets], [Price scale doc] |
| Scale mode — **Regular**, **Percent**, **Indexed to 100**, **Logarithmic** | radio-style; also on the price-scale gear menu and as `Chart.PriceScale.ToggleRegular/TogglePercentage/ToggleIndexedTo100/ToggleLogarithmic` | See §9.2 for the definitions. "Beware: turning off logarithmic scale returns the chart to the regular price scale even if the previously chosen was Percent or Indexed to 100." | [Configure Supercharts], [ActionId] |
| **Auto** (fits data to screen) | toggle; also the **Auto** button on the price scale | "Reset price scale automatically adjusts the price line to the screen size, and turns on the Auto mode, which fits data to your screen." "enable the Auto button located on the price scale… if users cannot locate the Auto button… check its visibility settings". | [Configure Supercharts], [Autoscale] |
| **Scale price chart only** | toggle | "will disable scaling of indicators or other chart elements" — autoscale considers only the main series. Library: `scalesProperties.scaleSeriesOnly`, action `Chart.PriceScale.ToggleAutoScaleSeriesOnly`. | [Configure Supercharts], [ChartPropertiesOverrides] |
| **Invert scale** | toggle | "the Price Scale is inverted and the increase in price is shown from top to bottom." AAPL inverted = USD priced in Apple shares. | [Invert], [Configure Supercharts] |
| **Lock price to bar ratio** (+ ratio value) | toggle + number | Keeps the vertical-to-horizontal proportion fixed when you scroll/zoom, so angles of trend lines stay constant. Action `Chart.Scales.ToggleLockPriceToBarRatio`. Help Center describes only "price to bar ratio lock". | [Configure Supercharts], [ActionId] |
| **Scales placement** *(third-party label; Help Center: "choose either the left or right side for the scale")* | Left / Right | Which side the main price scale sits on. Library: `priceScaleSelectionStrategyName`, actions `Chart.PriceScale.MoveToLeft/MoveToRight`. Up to **eight** price scales per chart in the library; mobile shows one. | [Scales side], [Price scale doc], [ActionId] |

### 4.2 Section: Price labels and lines

"Configure labels overlapping, price button to create alerts, countdown to bar close, as well as symbol values, high/low, and other values format, visibility, and colors." — [Configure Supercharts]

| Option | What it does | Library / action | Source |
|---|---|---|---|
| **Symbol name label** | Prints the ticker on the price scale next to its last-value label. | `scalesProperties.showSymbolLabels`; `Chart.PriceScale.Labels.ToggleSymbolNameLabelsVisibility`; auto-enabled when comparing symbols (`auto_enable_symbol_labels`) | [Chart overrides], [ActionId], [Featuresets] |
| **Symbol last price label** (+ display mode) | The coloured last-price tag on the scale. Mode: show the **price**, the **percentage**, or the **value according to the scale** (library `seriesLastValueMode`, default `LastValueAccordingToScale`). | `scalesProperties.showSeriesLastValue`; `Chart.PriceScale.Labels.ToggleSeriesLastValueVisibility` | [ChartPropertiesOverrides], [ActionId], [Moneysukh] |
| Symbol previous close value label | Label at yesterday's close. | `Chart.PriceScale.Labels.ToggleSymbolPrevCloseValueVisibility` | [ActionId] |
| **Indicator name label** | Prints indicator names on the scale. | `Chart.PriceScale.Labels.ToggleIndicatorsNameLabelsVisibility`; `showStudyPlotLabels` | [ActionId], [Chart overrides] |
| **Indicator last value label** | The per-plot value tags. Per-indicator override in Indicator settings → Style → **Labels on the price scale**. | `scalesProperties.showStudyLastValue`; `Chart.PriceScale.Labels.ToggleIndicatorsValueLabelsVisibility` | [Hide values], [ActionId] |
| **Bid and Ask Labels** | Tags at bid and ask. "Open the price scale context menu, go to **Labels**, then click on **Bid and Ask Labels**." Independent of the lines. | `scalesProperties.showBidAskLabels` (default false); `Chart.PriceScale.Labels.ToggleBidAskLabelsVisibility` | [Bid/Ask blog], [ActionId] |
| High/low price labels | Tags at the visible high and low. | `highLowAvgPrice.highLowPriceLabelsVisible`; `…ToggleHighLowPriceLabelsVisibility` | [Chart overrides], [ActionId] |
| Average close price label | Tag at the average close. | `averageClosePriceLabelVisible`; `…ToggleAveragePriceLabelVisibility` | same |
| Pre/post market price label | Tag for the pre/post-market last price while showing the regular session. | `scalesProperties.showPrePostMarketPriceLabel` (default true) | [ChartPropertiesOverrides] |
| **No overlapping labels** | Nudges scale labels apart so they don't stack. | `mainSeriesProperties.priceAxisProperties.alignLabels` (default true); `…ToggleNoOverlappingLabelsVisibility` | [ChartPropertiesOverrides], [ActionId] |
| **Plus button** | "The plus button is next to the price scale and quickly creates alerts, orders, and horizontal lines." Toggle here or "right-clicking on the price axis and selecting Plus button". Even when off, **Alt+Ctrl** (Win) / **⌥⌘** (Mac) makes it appear under the cursor. | `Chart.PriceScale.ToggleAddOrderPlusButtonVisibility`; featureset `chart_crosshair_menu` | [Plus button], [Plus anywhere], [ActionId] |
| **Countdown to bar close** | Timer inside the last-price tag. "right-click on the Price Scale and ensure that 'Countdown To Bar Close' is checked". Not shown for Renko/Kagi/PnF/Line Break/Range (no fixed interval), outside trading hours on intraday, or when the PC clock is wrong. **Delayed data gate:** "if… you have a symbol with data delayed by 15 minutes, the countdown will only be displayed for the time intervals over 15 minutes." Works on D/W/M too. | `mainSeriesProperties.showCountdown` (default false); `Chart.PriceScale.ToggleCountdownToBarCloseVisibility`; featureset `countdown` | [Countdown], [ChartPropertiesOverrides], [ActionId] |
| Crosshair labels on the scales | Whether the crosshair's price and time readouts appear on the axes (and their colours). | `showPriceScaleCrosshairLabel`, `showTimeScaleCrosshairLabel`, `crosshairLabelBgColorLight/Dark` | [Chart overrides] |
| Scales **text** colour / **lines** colour / **text size** | Listed under Canvas → Scales in the Help Center (see §5.2); the library groups them as `scalesProperties.textColor`, `lineColor`, `fontSize` (default 12). | — | [Configure Supercharts], [ChartPropertiesOverrides] |

### 4.3 Section: Time scale

"This section allows you to display weekdays, choose date and hours format, and also pin chart to the left when changing intervals." — [Configure Supercharts]

| Option (verbatim) | What it does | Source |
|---|---|---|
| **Date format** | Pick the date layout for the time axis and crosshair (e.g. dd-mm-yyyy). "This setting will apply to all charts that you view". Default is yyyy-mm-dd on the Korean, Japanese, Chinese and Taiwanese sites. Library featureset `scales_date_format`. | [Date format], [Featuresets] |
| **Time hours format** | 12h vs 24h clock on the axis. Library featureset `scales_time_hours_format`. | [Featuresets] |
| **Day of week on labels** | "The day of the week will be displayed on the timeline label." | [Day of week] |
| **Save chart left edge position when changing interval** | "you can switch from an interval of 1 hour to an interval of 30 minutes, and the chart will maintain the position in history." | [Left edge] |
| **Session breaks** | The blue vertical lines between sessions on intraday charts. Toggle from "the right-click context menu of the time scale" (action `Chart.SessionBreaks.ToggleVisibility`). The Help Center article says it is also in "the Events settings"; the Configure article does not list it under Events — *tab location not verified; the time-scale menu is the reliable path.* | [Session breaks], [ActionId] |

---

## 5. Tab: Canvas

"In this tab, you can add some style to your chart… it's separated into four sections." — [Configure Supercharts]. (Older blog posts call this tab **Appearance**; the library featuresets still say "Settings → Appearance" for the same rows.)

### 5.1 Section: Chart basic styles

| Option | Values | What it does | Library property (default) | Source |
|---|---|---|---|---|
| **Background** | **Solid** / **Gradient** + colour(s) | "choose the background color and set it for solid or gradient." | `paneProperties.backgroundType` ('solid'; 'gradient' in dark theme), `background` (#ffffff), `backgroundGradientStartColor`, `backgroundGradientEndColor` | [Configure Supercharts], [ChartPropertiesOverrides] |
| **Grid lines** | **Vert and horz** / **Vert only** / **Horz only** / **None** *(Help Center prose: "vertical only, horizontal only, vertical and horizontal together, or none")* + colour & opacity per direction, plus line style | "Choose their colors and opacity for more customization." | `gridLinesMode` ("both"), `vertGridProperties.color/style`, `horzGridProperties.color/style` (rgba(42,46,57,0.06), solid) | same |
| **Pane separator** | colour + opacity | "the line between the price part of the chart and indicators… If you choose an indicator, the Pane separator setting will appear." | `paneProperties.separatorColor` (#EBEBEB) | same |
| **Crosshair** | colour, opacity, **thickness**, **style** (dashed / solid / dotted) | "For Crosshair, that follows your cursor, you can set its color and opacity as well as your preferred thickness and style." | `crossHairProperties.color` (#9598A1), `style` (Dashed), `transparency` (0), `width` (1) | same |
| **Watermark** | on/off, colour, opacity; library additionally lets ticker / interval / description visibility be toggled | "Watermark displays the chosen symbol and time interval. Here, available settings are colors and opacity as well." Library: "Settings → Canvas → Watermark". | `symbolWatermark` settings-adapter key; `watermark()` API with `tickerVisibility()`, `intervalVisibility()`, `descriptionVisibility()`, `color()` | [Configure Supercharts], [Watermarks doc] |

### 5.2 Section: Scales

| Option | What it does | Source |
|---|---|---|
| **Text** colour, **Lines** colour, and a **text size** picker for the scales | "Scales are located to the right and at the bottom of the chart. Choose a scale for the text size that works for you. For better visibility, try changing colors for both text and lines." | [Configure Supercharts]; library `scalesProperties.textColor / lineColor / fontSize` |

### 5.3 Section: Buttons

| Option (verbatim) | What it does | Source |
|---|---|---|
| **Navigation buttons** | "located at the bottom of the chart. They help you zoom in or out, scroll to the left or to the right, or reset the chart view." Library featureset `show_zoom_and_move_buttons_on_touch` governs the touch variant. | [Configure Supercharts], [Featuresets] |
| **Pane buttons** | "allow you to manage chart panes — move them up and down, collapse, maximize, and remove them." Must be on for the **Collapse Pane** button to show ("make sure that the visibility of the pane buttons is enabled in the Chart Settings, on the Canvas tab"). | [Configure Supercharts], [Collapse panes] |

### 5.4 Section: Margins

| Option | Values | What it does | Source |
|---|---|---|---|
| **Top margin** | percent | Auto-scale headroom above the highest visible price. Library `paneProperties.topMargin` default **10**. | [Configure Supercharts], [ChartPropertiesOverrides] |
| **Bottom margin** | percent | Space below the lowest price. Library `bottomMargin` default **8**. | same |
| **Right margin** | bars (library can also offer percent via `show_percent_option_for_right_margin`) | "the distance between the price line and the… right edges of the chart" — empty space to the right of the last bar. Library featureset `chart_property_page_right_margin_editor` "Shows the Right margin field in Settings → Appearance". | [Configure Supercharts], [Featuresets] |

---

## 6. Tab: Trading

"In this tab, you can prepare your chart for placing orders and retrieving information from them. It is separated into two sections — General and Appearance." Only meaningful with Paper Trading or a connected broker. — [Configure Supercharts]

### 6.1 Section: General

| Option (verbatim) | What it does | Source |
|---|---|---|
| **Buy and sell buttons** *(prose: "display buy and sell buttons")* | "allow you to easily place orders by the market price." Action `Trading.SellBuyButtonsToggleVisibility`. | [Configure Supercharts], [ActionId] |
| **Instant order placement** | "for the quantity window to emerge between the buy and sell buttons… choose the amount of the asset you want to trade." Note: "will appear only if your broker is connected." | [Configure Supercharts] |
| **Play sound for executions** | Pick the sound played when an order fills. | same |
| **Notifications** | **Rejection only** (only rejected orders notify) or **All events** ("filled ones, placed, and other"). | same |

### 6.2 Section: Appearance

| Option (verbatim) | What it does | Source |
|---|---|---|
| **Positions** | Show open positions on the chart. Sub-option **Profit & loss** in **money**, **ticks**, or **percents**. Caveat: percent "will display the percent changes in price rather than the actual percent gains or loss for the position" (leverage ignored). | [Configure Supercharts], [Positions and orders] |
| **Reverse button on hover** | Button appears over the P&L value; "allows you to instantly reverse your position." Action `Trading.ReversePosition`. | [Configure Supercharts], [ActionId] |
| **Orders** | "see your open order's values for this particular symbol." | [Configure Supercharts] |
| **Brackets profit & loss** | Units for bracket (TP/SL) orders: money / ticks / percents. | same |
| **Executions** | "displayed as red arrows for executed sell orders and as blue arrows for executed buys." | same; [Executions] |
| **Execution labels** | "price values of such orders appearing near the price scale." | same |
| **Extended price line for positions and orders** | Extends the order/position line across the chart "to help you with identifying price levels." | same |
| **Orders and position alignment** | Label placement **right**, **left**, or **center**. | same |
| **Orders, Executions, and Positions on screenshots** | Include trading objects in snapshots. Library featureset `snapshot_trading_drawings`. | same; [Featuresets] |

---

## 7. Tab: Alerts

"These are the settings only for the alerts' appearance." — [Configure Supercharts]

| Option (verbatim) | What it does | Source |
|---|---|---|
| **Alert lines** (+ colour) | Draw a horizontal line where each price alert sits. Also toggled by right-clicking the line or its scale label → **Alert lines**. | [Alert line], [Configure Supercharts] |
| **Only active alerts** | Hide expired / stopped alerts' lines "if you don't need the expired ones or those that are not active to disturb you". | [Configure Supercharts] |
| **Alert volume** | Slider for the alert sound level. | same |
| **Automatically hide toasts** | "the pop-up alert notifications will hide automatically after 20 seconds." | same |

---

## 8. Tab: Events

"This section gives you an overview of the community ideas and upcoming corporate events, such as dividends, stock splits, and earnings and revenue reports." Rows depend on the asset type: "For stocks… Dividend reports, Stock splits, Earnings and revenue reports. For other symbols like indices and futures… economic events that come from the Economic Calendar." — [Configure Supercharts], [Calendar article snippet]

| Option (verbatim) | What it does | Source |
|---|---|---|
| **Ideas** | Idea markers near the price line, coloured **green / red / orange** for bullish / bearish / neutral. Sub-choice of whose: "only your own ideas, ideas of people you follow, or all public ideas for the selected instrument." Also configurable by right-clicking an idea label. | [Configure Supercharts], [Ideas] |
| **Dividends** | Coloured circle on the time scale at each ex-dividend date with the payment. | [Configure Supercharts], [Events circles] |
| **Splits** | Marker at split dates with the ratio (article walks through a 10:1 example). | same |
| **Earnings** | Marker per report with "report dates, estimated and reported revenue, and more"; a **More financials** button links to the Financials page. | [Configure Supercharts] |
| **Earnings break** | "will plot the line from the events labels on the date scale up for enhanced visibility" (a vertical line at each report). | same |
| **Latest news** | Purple lightning icon on the time scale with "the fact of the day for that symbol" and a link into **News flow**. | same; [News blog] |
| **News notifications** / **News notifications on the chart** *(the 2019 blog said "News update notification on chart")* | Toast in the lower-left when a headline lands; "open Chart settings → Events tab → turn off News notifications on the chart." | [News notifications], [News blog] |
| **Show Economic Events on Chart** | Coloured dots for Economic-Calendar releases (indices, futures, FX…). | [Economic events] |
| **Session breaks** | One Help Center article places it here as well as on the time-scale menu (see §4.3). | [Session breaks] |

Rendering caveat: "If a chart is heavily compressed, we hide the dividend, split and earning labels so that they do not make your chart too cluttered." — [Events not displayed]. Library-side these are "marks" (`Chart.Marks.ToggleVisibility`) — [ActionId].

---

## 9. Template (bottom of the dialog)

"You can always save your chart settings and change them promptly through this menu." Saves the whole dialog's state under a name and re-applies it later (distinct from indicator templates and layouts, which are other surfaces). — [Configure Supercharts]

---

## 10. The context menus that feed the same settings

### 10.1 Price-scale gear ("More settings…") and price-scale right-click

"another way to access settings is the gear button at the bottom of the price scale — click **More settings…** to open the window we've just described." When more than one scale exists, the gear is replaced by the scale's **letter** (A, B…) and you click the letter. — [Configure Supercharts], [Price scale doc]

Items (right-click the price axis, or the gear):

| Item (verbatim where documented) | Effect | Source |
|---|---|---|
| **Reset price scale** | "automatically adjusts the price line to the screen size, and turns on the Auto mode". Only offered when the scale is in a non-default state; not offered merely because the scale was moved left or set to log. Action `Chart.PriceScale.Reset`. | [Configure Supercharts], [Price scale doc] |
| **Auto** | Toggle autoscale. `Chart.PriceScale.ToggleAutoScale`. | [Autoscale], [ActionId] |
| **Scale price chart only** | Autoscale ignores indicators/compare series. | [Configure Supercharts] |
| **Invert scale** | Flip the axis. | [Invert] |
| **Regular** / **Percent** / **Indexed to 100** / **Logarithmic** | See table below. | [Configure Supercharts] |
| **Move scale to left** / **Move scale to right** *(website Help Center: "Move to left/right")* | Relocate this scale. | [Price scale doc] |
| **Merge All Scales Into One** → **On The Left** / **On The Right** | Collapse every visible scale into one column. | [Merge scales] |
| **Labels** (submenu) | Symbol name / last price / previous close / indicator names / indicator values / **Bid and Ask Labels** / high-low / average / no-overlap — the `Chart.PriceScale.Labels.*` group. | [Bid/Ask blog], [ActionId] |
| **Lines** (submenu; library `Chart.Lines`) | Price line / previous close / bid-ask lines / high-low / average / pre-post market line. | [ActionId] |
| **Countdown To Bar Close** | See §4.2. | [Countdown] |
| **Plus button** | See §4.2. | [Plus button] |
| **Lock price to bar ratio** | `Chart.Scales.ToggleLockPriceToBarRatio`. | [ActionId] |
| **More settings…** | Opens the dialog on **Scales and lines** (`Chart.Dialogs.ShowGeneralSettings.ScalesTab`). | [Configure Supercharts], [ActionId] |

Scale visibility rule (no checkbox exists): "The scale is always displayed if something is attached to it. The price scale is hidden if nothing is attached to it." To hide a scale, pin its indicators to another scale or **No scale**; to show one, attach something. Blank space beside a scale means another pane uses a scale on the opposite side — fix with **Pin to scale → Pin to scale A** from the indicator's three-dot menu. — [Hide scale], [Scale not shown], [Blank space]

**The four scale modes, as TradingView defines them** — [Configure Supercharts]:

| Mode | Definition (paraphrased from the article) |
|---|---|
| **Regular** | Linear, absolute values: "The distance between $40 and $80… would be the same as between $400 and $440." |
| **Percent** | Linear in % change from "the chart's starting point" (the first visible bar). |
| **Indexed to 100** | First visible value = 100; every later value is 100 + % change. "perfect for comparing completely different values". |
| **Logarithmic** | Spacing proportional to % change: $40→$80 is "ten times larger than between $400 and $440". |

### 10.2 Time-scale right-click

Documented items: **Session breaks** toggle (`Chart.SessionBreaks.ToggleVisibility`); **Reset time scale** (`Chart.TimeScale.Reset`); **Go to…** — "you can go to a specific date or create a custom range in the 'Go to' menu" (`Chart.Dialogs.ShowGoToDate`, featureset `go_to_date`); the **Time zone** list is a separate dropdown on the bottom toolbar (featureset `timezone_menu`, action `Chart.ChangeTimeZone`) — [Session breaks], [Getting started], [ActionId], [Featuresets]. Whether **Date format** / **Day of week on labels** also appear on this menu *could not be verified* — they are confirmed only in the dialog.

### 10.3 Chart canvas right-click (empty area)

The Help Center never prints this menu in full. Confirmed items and their library action IDs:

| Item | Evidence |
|---|---|
| **Reset chart view** | Navigation-button description "reset the chart view"; `Chart.Scales.Reset`; third-party: "Resets the chart to its original position by centering the view and removing any zooming or panning" — [Configure Supercharts], [ActionId], [Marketmates snippet] |
| **Trade** → **Create new order…** | Third-party walkthrough; `Trading.TradeFromChart`, `Trading.AddOrder` — [Marketmates snippet], [ActionId] |
| **Add alert** (at the clicked price) | Plus-button article ("create an alert" at the cursor price); alert creation from chart is documented — [Plus anywhere] |
| **Copy price** | `Chart.Clipboard.CopyPrice` — [ActionId] |
| **Paste** | Library context-menu example removes the existing **Paste** item (`{ text: "-Paste" }`), proving it is a stock item; `Chart.Clipboard.PasteSource` — [Context menu doc], [ActionId] |
| **Lock vertical cursor line by time** | `Chart.Crosshair.LockVerticalCursor` — [ActionId] |
| **Add symbol to watchlist** | `Chart.AddSymbolToWatchList` — [ActionId] |
| **Object tree…** / **Data window** | `Chart.ObjectTree.Show`, `Chart.DataWindow.Show` — [ActionId] |
| **Hide drawings / indicators / positions & orders / all** and **Remove drawings / indicators / both** | Listed as left-toolbar "Hide options" and "Remove options"; actions `Chart.RemoveAllLineTools`, `Chart.RemoveAllIndicators`, `Chart.RemoveAllIndicatorsAndLineTools` — [Getting started], [ActionId] |
| **Settings…** | "Right-click on the chart and scroll down to 'Settings.'" — [Brown Report], [24h session] |

Exact display strings and order on tradingview.com for this menu *could not be verified* from primary sources; the action IDs above are the authoritative inventory.

### 10.4 Right-click on a series, indicator or drawing

Per-object menus carry: **Visual Order** → Bring to front / Bring forward / Send backward / Send to back (`Chart.Source.VisualOrder.*`; also from the Object Tree); **Move to** → new pane / above / below / merge (`Chart.Source.MoveToPane`, `MergeUp/Down`, `UnmergeUp/Down`); **Pin to scale** → scale A / new left / new right / **No scale** (`Chart.Source.ChangePriceScale`, `MoveToOtherScale`, `MoveToNoScale`); visibility by interval (`Chart.Source.IntervalsVisibility` → All / Current / Current and above / Current and below); and for the symbol itself, **Symbol Info** (`Chart.Dialogs.ShowSymbolInfo`). Drawings add Hide / Show / Lock / Anchor / Clone / Templates / Settings. — [Visual order], [Merge pane], [Move pane], [Blank space], [ActionId]

### 10.5 Pane buttons / pane menu

Per pane (top-right buttons, or the pane context menu — library featureset `pane_context_menu`): **Move pane up** / **Move pane down**, **Collapse pane** / **Restore pane**, **Maximize** / **Minimize**, **Delete pane** (`Chart.PaneControls.*`). Keyboard: "minimize/restore the panel by double-clicking anywhere in the pane with the Ctrl / ⌘ key pressed." Buttons only render when **Pane buttons** (Canvas → Buttons) is on. — [Collapse panes], [Configure Supercharts], [ActionId], [Featuresets]

### 10.6 Legend (status line) right-click

Mirrors §3: **Show Open market status**, OHLC / bar change / volume / last-day-change / indicator titles-arguments-values toggles, plus an entry that opens the dialog on the Status line tab (`Chart.Dialogs.ShowGeneralSettings.LegendTab`). Library featureset `legend_context_menu`. — [Market status blog], [ActionId], [Featuresets]

---

## 11. Plan tiers — what is and isn't gated

From the current pricing comparison table ([Pricing]); ✓ read off the row icons (check vs. cross glyph):

| Row | Basic (free) | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| **Extended trading hours** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Customizable chart types** | 17 | 17 | 17 | 21 | 21 |
| Charts per tab | 1 | 2 | 4 | 8 | 16 |
| Indicators per chart | 2 | 5 | 10 | 25 | 50 |
| Ad-free | ✗ | ✓ | ✓ | ✓ | ✓ |

Nothing inside the Chart settings dialog (candle styling, scale modes, labels, countdown, canvas, alerts appearance, events) appears as a row in the comparison table, so no plan gate was found for any option in this document. The two real gates are data-side: the **countdown** cannot show on intervals shorter than the feed's delay, and **Bid and Ask** lines/labels need a quote feed that carries bid/ask (delayed feeds lack it — *inferred from the countdown rule and the bid/ask blog; not stated outright, could not verify*). The **Instant order placement** window needs a connected broker.

---

## 12. What this means for OnStock

OnStock today (`src/components/CandleChart.jsx`, lightweight-charts 5.2): transparent solid background from theme tokens, both grid directions, dashed crosshair with surface-coloured axis labels, custom price formatter, a volume overlay on a hidden scale, SMA20/EMA50 overlays, an RSI pane with 30/70 hairlines, an OHLC caption above the chart standing in for the legend, `fitContent()` on every data push, and no user-facing settings at all. Mapping the teardown onto the desktop build:

1. **Adopt — a Symbol tab with `Body / Borders / Wick` up-down colour pairs and `Color bars based on previous close`.** lightweight-charts exposes exactly these (`upColor/downColor/borderUpColor/…/wickUpColor`), so it is a settings surface, not chart work. Reason: it is the single most-used row in TradingView's dialog and the one every "how to customise" walkthrough starts with.
2. **Adopt — `Last price line` + `Previous close price` line, with the previous-close default OFF as TradingView does.** OnStock already suppresses `priceLineVisible` on every series; expose it. Reason: on a delayed Yahoo stock series, "where did yesterday close" is the reference the gap is measured against, so the prev-close line is more load-bearing for OnStock than for TradingView.
3. **Adapt — the price-scale mode menu, but only `Regular / Percent / Logarithmic`; skip `Indexed to 100`.** lightweight-charts has `mode: Normal | Logarithmic | Percentage | IndexedTo100`, so all four are free — but Indexed-to-100 exists for comparing unrelated symbols, and OnStock's comparison is already a first-class series (the gap). Reason: Percent is what makes token-vs-stock overlays readable when the two prices differ in scale; log is a one-line option.
4. **Adopt — a "scale price chart only" behaviour by default (`autoscaleInfoProvider` on overlays).** TradingView's own support article "The chart looks way too compressed" is about indicators dragging autoscale; OnStock's RSI already pins 0–100, do the same for anything else that joins the main pane.
5. **Adapt — `Countdown to bar close` on the GeckoTerminal token series only.** Token candles are near-live; the Yahoo stock series is delayed, and TradingView's rule ("countdown only for intervals over the delay") means a stock-side countdown would lie. lightweight-charts has no built-in countdown; render it as the last-value axis label text or a small tag. Reason: cheap, useful, and the delay rule gives a principled reason not to show it on the stock side.
6. **Adopt — the Status line rows `OHLC values`, `Bar change values`, `Volume`, `Indicator values`, and a `Title: Ticker / Description / Ticker and description` dropdown.** OnStock's caption already is a legend; move it into the chart's top-left and make its rows toggleable. Reason: this is the desktop idiom the owner asked for and it costs nothing in data.
7. **Adapt — an `Open market status` chip that shows Regular / Pre-market / After hours / Closed for the stock leg, and "24/7" for the token leg.** OnStock already has `src/lib/market.js` (NY sessions, DST-aware). Reason: the gap behaves differently while the stock is closed and the token still trades; TradingView's Market Status pop-up (session timeline in exchange time) is the model.
8. **Adapt — `Session` = Regular / Extended is meaningful only if the Yahoo feed carries pre/post bars; otherwise show the ETH tint bands on the token series as "stock market closed" shading.** TradingView's own rule: the Extended option is present but "will not change anything" when the data isn't there. Reason: shading when the reference market is shut is the visual answer to "why is the gap widening at 3 a.m."
9. **Adopt — `Timezone` with an `Exchange` entry plus UTC and the browser zone.** Token candles arrive in UTC, stock candles in America/New_York; TradingView's dual path (bottom-toolbar clock + Symbol tab) is the pattern. Reason: mis-aligned zones are the fastest way to misread a gap on intraday.
10. **Adopt — `Precision` with `Default` + decimal counts.** OnStock's `formatPrice` already varies decimals; expose the override because tokenized stocks trade at sub-cent spreads where the gap needs 3–4 decimals.
11. **Adopt — Canvas: `Background` (solid; skip gradient), `Grid lines` mode Vert/Horz/Both/None, `Crosshair` style, `Top/Bottom/Right margin`.** All map one-to-one onto `layout`, `grid`, `crosshair`, `scaleMargins` and `timeScale.rightOffset` in lightweight-charts. Reason: these are the rows a desktop user expects to find, and they are pure options.
12. **Adapt — `Watermark` as the ticker + interval, default OFF.** lightweight-charts 5 ships a `TextWatermark` pane primitive. OnStock deliberately moved attribution out of the canvas; keep that, but a faint "AAPLx · 15m" is useful in a multi-chart desktop grid. Reason: helps in a layout, noise on a single chart.
13. **Adopt — Alerts tab: `Alert lines` (colour), `Only active alerts`, `Automatically hide toasts`.** OnStock already has price and gap-drift alerts; drawing them as `createPriceLine` on the relevant series is the TradingView pattern, and gap alerts should draw on the gap series when the Gap toggle is on.
14. **Adapt — Events tab: `Earnings`, `Dividends`, `Splits` markers on the stock leg (from Yahoo) and the tokenization news feed as the `Latest news` lightning marker; `Earnings break` as a vertical line.** Reason: splits and dividends are exactly the moments a tokenized share and the real share can decouple (the token may not pass the dividend through), so the markers explain gap spikes. Skip `Ideas` and `Show Economic Events` (no source).
15. **Skip — the whole Trading tab (positions, orders, executions, bracket P&L, reverse-on-hover) and the Plus button's order path.** OnStock routes trades out to Jupiter and holds no positions; a `Plus` button that only offers **Add alert** and **Draw horizontal line** is the right subset.
16. **Skip — Indexed-to-100, Lock price to bar ratio, Adjust for contract changes, Use settlement as close, Currency/Unit menus.** Reasons: no futures, no multi-currency, no drawing tools to keep angles for (yet), and "Adjust for dividends" is moot until OnStock has a split/dividend-adjusted stock history to toggle.
17. **Adopt — a `Template` save/apply at the bottom of the dialog, stored per user (Supabase) not per chart.** Reason: TradingView's biggest desktop convenience is that one saved settings set follows you; OnStock's watchlists/folders already have a user-level store to hang it on.

---

## 13. Sources (every page actually read)

Primary — TradingView Help Center
- [Configure Supercharts] How to configure your Supercharts — https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/
- [Getting started] Getting started with Supercharts — https://www.tradingview.com/support/solutions/43000746464-tradingview-supercharts-all-you-need-to-know/
- [Candlesticks] Introduction to candlestick charts and patterns — https://www.tradingview.com/support/solutions/43000745269-introduction-to-candlestick-charts-and-patterns/
- [Bar charts] Understanding bar charts — https://www.tradingview.com/support/solutions/43000672403-understanding-bar-charts/
- [Countdown] The countdown is not displayed on the chart — https://www.tradingview.com/support/solutions/43000476233-the-countdown-is-not-displayed-on-the-chart/
- [Autoscale] How to enable Autoscale — https://www.tradingview.com/support/solutions/43000762826-how-to-enable-autoscale/
- [Scales folder] How to adjust the scales on a chart? (folder index) — https://www.tradingview.com/support/folders/43000549291-how-to-adjust-the-scales-on-a-chart/
- [Currency label] How do I enable / disable the currency / unit label on the price scale? — https://www.tradingview.com/support/solutions/43000565621-how-do-i-enable-disable-the-currency-unit-label-on-the-price-scale/
- [Merge scales] How can I merge all price scales into one on the left or right side? — https://www.tradingview.com/support/solutions/43000485562-how-can-i-merge-all-price-scales-into-one-on-the-left-or-right-side/
- [Invert] How to invert/reverse the chart price scale — https://www.tradingview.com/support/solutions/43000475599-how-to-invert-reverse-the-chart-price-scale/
- [Scales side] How to place all the scales on the right or left? — https://www.tradingview.com/support/solutions/43000480236-how-to-place-all-the-scales-on-the-right-or-left/
- [Hide scale] I can't hide the price scale — https://www.tradingview.com/support/solutions/43000480245-i-can-t-hide-the-price-scale/
- [Scale not shown] The price scale is not displayed — https://www.tradingview.com/support/solutions/43000480249-the-price-scale-is-not-displayed/
- [Blank space] How to remove the blank space next to the price scale — https://www.tradingview.com/support/solutions/43000762933-how-to-remove-the-blank-space-next-to-the-price-scale/
- [Plus button] How to enable the Plus Button on the price scale — https://www.tradingview.com/support/solutions/43000645256-how-to-enable-the-plus-button-on-the-price-scale/
- [Plus anywhere] How to create an order, alert, and price line anywhere on the chart — https://www.tradingview.com/support/solutions/43000699223-how-to-create-an-order-alert-and-price-line-anywhere-on-the-chart/
- [Session breaks] I cannot remove blue vertical lines on my chart — https://www.tradingview.com/support/solutions/43000762935-i-cannot-remove-blue-vertical-lines-on-my-chart/
- [Left edge] How can I keep chart position in time after applying a new interval? — https://www.tradingview.com/support/solutions/43000740649-how-can-i-keep-chart-position-in-time-after-applying-a-new-interval/
- [Date format] How do I change the date format? — https://www.tradingview.com/support/solutions/43000473989-how-do-i-change-the-date-format/
- [Day of week] How to enable Day of week on labels — https://www.tradingview.com/support/solutions/43000692911-how-to-enable-day-of-week-on-labels/
- [Timezone article] Is there a way to change chart timezone or clock time at the bottom of the chart? — https://www.tradingview.com/support/solutions/43000476526-is-there-a-way-to-change-chart-timezone-or-clock-time-at-the-bottom-of-the-chart/
- [Decimals] I want to change the number of decimals on the scale — https://www.tradingview.com/support/solutions/43000690943-i-want-to-change-the-number-of-decimals-on-the-scale/
- [Extended hours] I want to access Extended Hours data — https://www.tradingview.com/support/solutions/43000502023-i-want-to-access-extended-hours-data/
- [24h session] How to view the 24 hour market and overnight trading sessions — https://www.tradingview.com/support/solutions/43000790593-how-to-view-the-24-hour-market-and-overnight-trading-sessions/
- [Settlement] Can I switch Settlement and Last prices as close for futures? — https://www.tradingview.com/support/solutions/43000685268-can-i-switch-settlement-and-last-prices-as-close-for-futures/
- [Status line on all charts] How to enable status line on all charts in layout — https://www.tradingview.com/support/solutions/43000665052-how-to-enable-status-line-on-all-charts-in-layout/
- [Legend gone] Indicator titles, parameters & values disappeared from the legend — https://www.tradingview.com/support/solutions/43000473925-indicator-titles-parameters-values-disappeared-from-the-legend-top-left-corner-of-the-chart/
- [Hide values] I want to hide the values of individual indicators — https://www.tradingview.com/support/solutions/43000659666-i-want-to-hide-the-values-of-individual-indicators/
- [OHLC mobile] I can't see OHLC, indicator values and the crosshair cursor — https://www.tradingview.com/support/solutions/43000502564-i-can-t-see-ohlc-indicator-values-and-the-crosshair-cursor/
- [Compressed] The chart looks way too compressed — https://www.tradingview.com/support/solutions/43000473898-the-chart-looks-way-too-compressed/
- [Positions and orders] Positions and orders — https://www.tradingview.com/support/solutions/43000763362-positions-and-orders/
- [Executions] Execution history on the chart — https://www.tradingview.com/support/solutions/43000754947-execution-history-on-the-chart/
- [Alert line] How to enable/disable the Alert Line on the chart — https://www.tradingview.com/support/solutions/43000645260-how-to-enable-disable-the-alert-line-on-the-chart/
- [Events circles] How can I enable/disable colored circles of earnings, splits or dividends on a chart? — https://www.tradingview.com/support/solutions/43000494799-how-can-i-enable-disable-colored-circles-of-earnings-splits-or-dividends-on-a-chart/
- [Economic events] How can I enable/disable colored circles/dots of economic events on a chart? — https://www.tradingview.com/support/solutions/43000494798-how-can-i-enable-disable-colored-circles-dots-of-economic-events-on-a-chart/
- [Events not displayed] Earnings, splits or dividends labels are not displayed — https://www.tradingview.com/support/solutions/43000557641-earnings-splits-or-dividends-labels-are-not-displayed/
- [Ideas] How to enable the display of ideas on the chart? — https://www.tradingview.com/support/solutions/43000694285-how-to-enable-the-display-of-ideas-on-the-chart/
- [News notifications] How to enable/disable news notifications on the chart? — https://www.tradingview.com/support/solutions/43000714735-how-to-enable-disable-news-notifications-on-the-chart/
- [Collapse panes] How to collapse separate panes? — https://www.tradingview.com/support/solutions/43000665813-how-to-collapse-separate-panes/
- [Move pane] How to move an indicator to the main pane — https://www.tradingview.com/support/solutions/43000762829-how-to-move-an-indicator-to-the-main-pane/
- [Merge pane] How can I merge the chart and indicator into one pane? — https://www.tradingview.com/support/solutions/43000482921-how-can-i-merge-the-chart-and-indicator-into-one-pane/
- [Visual order] How can I change the visual order/layer of indicators, drawings & candles? — https://www.tradingview.com/support/solutions/43000474299-how-can-i-change-the-visual-order-layer-of-indicators-drawings-candles/
- [Trading Sessions indicator] Trading Sessions — https://www.tradingview.com/support/solutions/43000729030-trading-sessions/ (read; it is an indicator, not a dialog setting — cited only to rule it out)

Primary — TradingView blog
- [Bid/Ask blog] You can now display Bid and Ask Labels on the price scale and Bid and Ask Lines on the chart — https://www.tradingview.com/blog/en/display-bid-ask-labels-and-levels-19761/
- [Market status blog] You Can Now Hide the Open Market Status on TradingView Charts — https://www.tradingview.com/blog/en/hide-open-market-status-on-tradingview-charts-18555/
- [News blog] Latest news right on the chart — https://www.tradingview.com/blog/en/latest-news-on-chart-41557/
- [Collapse blog] Collapse panes for space gains — https://www.tradingview.com/blog/en/collapse-pane-feature-31026/
- [Date blog] Introducing Date Format selection — https://www.tradingview.com/blog/en/select-date-time-format-10662/
- (Previous day's closing price blog, 2018 — URL now returns 404; only the search-result snippet was available.)

Primary — TradingView pricing
- [Pricing] https://www.tradingview.com/pricing/

Primary — Advanced Charts (charting library) documentation
- [Chart overrides] https://www.tradingview.com/charting-library-docs/latest/customization/overrides/chart-overrides/
- [ChartPropertiesOverrides] https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartPropertiesOverrides/
- [ActionId] https://www.tradingview.com/charting-library-docs/latest/api/enums/Charting_Library.ActionId/
- [Featuresets] https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets/
- [Context menu doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/context-menu/
- [CreateContextMenuParams] https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.CreateContextMenuParams/
- [Price scale doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale/
- [Time scale doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/Time-Scale/
- [Legend doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend/
- [Watermarks doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/watermarks/
- [Market Status doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/market-status/
- [Time zones doc] https://www.tradingview.com/charting-library-docs/latest/ui_elements/timezones/
- [Extended sessions doc] https://www.tradingview.com/charting-library-docs/latest/connecting_data/Extended-Sessions/
- [Trading sessions doc] https://www.tradingview.com/charting-library-docs/latest/connecting_data/Trading-Sessions/

Third-party (gap-filling only; labels from these are flagged in the text)
- [Brown Report] TradingView Complete Tutorial Part 1: How to customize your chart settings — https://thebrownreport.com/tradingview-complete-tutorial-part-1-how-to-customize-your-chart-settings/
- [Quantum Algo] TradingView Charts Setup & Customization Guide — https://www.quantum-algo.com/blog/guides/tradingview-charts-setup-complete-guide/ (read; contains errors — e.g. places crosshair and bid/ask under "Settings → Trading" — so nothing was taken from it)
- [Moneysukh] How to Set Up, Adjust, Save, Clear, Reset TradingView Chart Settings — https://learn.moneysukh.com/how-to-set-up-save-reset-tradingview-chart/ (search-result snippet only; page is JS-rendered)
- [Marketmates snippet] How to Use TradingView — https://marketmates.com/learn/forex/how-to-use-tradingview/ (search-result snippet only)
