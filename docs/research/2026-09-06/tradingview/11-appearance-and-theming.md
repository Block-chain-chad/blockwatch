# TradingView teardown — surface 11: Appearance and theming

Date: 2026-09-06. Part of the 13-surface TradingView teardown that is the reference material for OnStock's desktop ("on a PC it should be like TradingView").

Scope of this file: the site-wide **dark/light theme switch** and how it persists; the **Chart settings** dialog as far as it controls looks — the **Canvas** tab (background solid vs gradient, grid lines, pane separator, crosshair, watermark, scale text size and colours, navigation/pane buttons, margins), the **Symbol** tab's style conventions (candle body / borders / wick, "Color bars based on previous close", line gradients, precision, timezone, session and the extended-hours tint), the **Status line** tab, the **Scales and lines** tab (scale placement left/right, scale modes Regular / Percent / Indexed to 100 / Logarithmic, auto-scale, lock ratio, invert, labels and lines, date and time formats), **session breaks** and **extended-hours shading**, **chart templates** and the **Template** dropdown, **"Apply to all"** and default behaviour, what persists **per chart / per layout / per symbol / per account**, the **accessibility** story, and the **default colour values** TradingView ships. Chart types themselves, indicators, drawings, alerts, layouts as a saving system, and the trading panel belong to other surfaces and are only mentioned where an appearance option lives inside them.

How to read the tables: "Label" is the option text exactly as TradingView writes it, quoted from the Help Center, the TradingView blog, or the Charting Library documentation (the library is the same engine as Supercharts and its docs are the only place TradingView publishes default colour values — where I cite a library default I say so, because the hosted site can differ). "Where" is the menu path or panel. "Plan" is the tier that unlocks it if gated. Where a claim could not be confirmed from a source I actually read it says **could not verify** rather than guessing. Source numbers in square brackets point at the Sources list at the end.

A note on method: TradingView's Help Center article on chart settings [1] describes the dialog tab by tab in prose but does not screenshot-transcribe every checkbox, so for a handful of options (the exact wording of the session-break toggle, the Template dropdown items, the "Scales mode" choices) the verbatim label is not in any primary text I could read. Those are flagged. Plan names are today's: **Basic** (free), **Essential**, **Plus**, **Premium**, **Ultimate** [70].

---

## 0. The one-paragraph summary

TradingView has exactly two themes (Light and Dark) switched from the main menu, the Desktop app's Settings, or the mobile app's Menu → gear → "Theme"; the choice is remembered per login and in browser local storage [2], [3], [4], [5]. Everything else about looks lives in one dialog — **Chart settings** — opened from a gear on the top toolbar, a gear at the bottom of the chart, or by double-clicking the bars [1]. Its tabs are **Symbol**, **Status line**, **Scales and lines**, **Canvas**, **Trading**, **Alerts**, **Events**, plus a **Template** dropdown for saving the whole colour set [1]. Chart settings are stored **per chart** (each chart in a layout can differ), a layout keeps them as you move between symbols, and there is an **"Apply to all"** button to copy one chart's settings across a multi-chart layout [12], [13], [15]. No appearance option is gated by plan — the pricing page has no row for themes, templates or colours [70]. The library that powers it ships light-theme defaults of a **#ffffff** solid background (gradient by default in dark), grid lines at **rgba(42, 46, 57, 0.06)**, a dashed **#9598A1** 1-px crosshair, up/down colours **#089981 / #F23645**, and a 12-px scale font in **#131722** [53].

---

## 1. The theme switch (site-wide Light / Dark)

### 1.1 Where it lives

| Surface | Label (verbatim) | Where | What it does | Source |
|---|---|---|---|---|
| Web (tradingview.com) | Light / Dark (a slider) | "move the slider in the pull-down menu of the upper button in the left" — i.e. the main menu at the top-left of the page | "You can always choose whether to have Light or Dark charts and interface. Turn on our Dark theme, if you prefer a more relaxed view." The article does not name the slider itself; it only says the choice is between "Light and Dark interfaces". | [2] |
| Web (alternate entry) | (theme menu) | "a menu in the top right corner of the interface" — the theme-persistence article points here; the site has evolved and both articles are live | Same switch. | [3] |
| Web (chart right-click) | "Color theme" | — | Widely shown in walkthroughs as a right-click item on the chart, but **could not verify** from any TradingView text I read. Treat as unconfirmed. | — |
| TradingView Desktop app | "Use system theme" (default) · "Dark" · "Light" | Settings; also "the theme switcher on the main app menu which is called by clicking three dots at the top right" | "TradingView Desktop follows your system's theme by default. This includes changing the app theme immediately when the system theme has changed, with full support for the Auto mode on macOS." The Desktop product page repeats it: "Automatically follows the system theme and dynamically switches between light and dark modes based on the OS preferences with the Auto appearance mode in macOS and Windows". | [4], [6] |
| iOS / Android app | "Theme" → "Light" or "Dark" | "Open the Menu screen from the bottom toolbar" → "Tap on the gear-wheel button in the top right corner" → "Tap the Theme setting" → "Select Light or Dark" | The mobile article adds a detail worth copying: if your chart's colours are non-standard, the app prompts whether to keep your custom chart format or apply the new theme's colours to it. | [5] |
| Android (history) | Dark Mode | — | Android got "Dark Mode" in August 2019, so the mobile theme is a much later addition than the web one. | [8]-blog listing, see [71] |

### 1.2 What the theme changes

- The web article's wording is "Light or Dark charts **and** interface" — one switch recolours both the chart canvas and the surrounding UI [2].
- In the engine, the theme sets the defaults of every chart property that is theme-dependent. The library reference is explicit about one: `paneProperties.backgroundType` is `'solid'` by default "In the dark theme, the default value is 'gradient'." [53], [54]. So **Dark is gradient-by-default; Light is solid-by-default.**
- The crosshair label has separate per-theme backgrounds: `scalesProperties.crosshairLabelBgColorLight` = `#131722` and `scalesProperties.crosshairLabelBgColorDark` = `#363A45` (the "Light" value is the dark ink used in the light theme, and vice-versa) [53].
- Library integrators get the same two values programmatically: `theme: "light" | "dark"` in the constructor, `changeTheme()` at runtime, `getTheme()` to read it. "The chart layout does not contain buttons to switch the theme in the UI" — hosts must build their own switch [55]. A known wrinkle the docs call out: "If you restore the chart that has the dark theme, you may see a black chart background in the light theme." — i.e. saved chart state carries theme-coloured properties with it, and restoring it under the other theme shows the wrong background until the theme is re-applied [55]. That is the same class of problem the mobile app's "keep your format or apply the theme" prompt exists to solve [5].

### 1.3 How the theme persists (and why it sometimes doesn't)

Quoted from "Why my color theme isn't getting saved?" [3]:

- "The first time you open our website without logging in to your TradingView account, you see the system's theme (either light or dark)." — the anonymous default is `prefers-color-scheme`.
- "Default theme is defined by the browser's theme. It is saved when you log in and log out and is also kept in the settings for your next visit to our platform." — once chosen, it is stored with the account and mirrored into local storage.
- "if your browser clears local storage, the color theme setting you selected will not be saved and instead the default color theme will be applied." — the remedy list is: set your preferred system theme, disable "Clear history when browser closes", or add tradingview.com to the browser's cookie exceptions.

The Help Center even has a **folder** named "Why my color theme isn't getting saved?" containing that single article [72] — a signal of how often it is asked.

### 1.4 The palette underneath (library documentation)

Two mechanisms are published for hosts of the Charting Library; they show how TradingView's own theme is built.

**Custom themes API** — `custom_themes: { light: {...}, dark: {...} }` [56]. Each theme is seven base colours, each a 19-shade ramp from lightest to darkest, plus `white` and `black`:

| Token | Default hue | Used for (verbatim) |
|---|---|---|
| `color1` | Blue | buttons, dialogs, interactive elements |
| `color2` | Grey | toolbars, separators, secondary UI |
| `color3` | Red | error states, negative values |
| `color4` | Green | positive values, success states |
| `color5` | Orange | warnings, neutral highlights |
| `color6` | Purple | additional accent elements |
| `color7` | Yellow | additional accent elements |
| `white` / `black` | #ffffff / #000000 | background elements / text and foreground |

The palette drives "Toolbars, dialogs, context menus, tooltips, buttons, chart background, main series bars, grid, axes." Runtime: `widget.customThemes()` → `applyCustomThemes()` / `resetCustomThemes()` [56]. The point for OnStock: TradingView's theme is a **ramp per hue**, not a handful of hex values — every shade of blue/grey/red/green in the UI is a step on a 19-stop scale.

**CSS Color Themes** — a `custom_css_url` stylesheet may redefine `--tv-color-*` custom properties, scoped `:root:not(.theme-dark)` for light and `.theme-dark:root` for dark [57]. The documented variable set (names only; the page does not publish the stock values):

`--tv-color-platform-background`, `--tv-color-pane-background`, `--tv-color-toolbar-button-background-hover`, `--tv-color-toolbar-button-background-expanded`, `--tv-color-toolbar-button-background-active`, `--tv-color-toolbar-button-background-active-hover`, `--tv-color-toolbar-button-text`, `--tv-color-toolbar-button-text-hover`, `--tv-color-toolbar-button-text-active`, `--tv-color-toolbar-button-text-active-hover`, `--tv-color-item-active-text`, `--tv-color-toolbar-toggle-button-background-active`, `--tv-color-toolbar-toggle-button-background-active-hover`, `--tv-color-toolbar-divider-background`, `--tv-color-toolbar-save-layout-loader`, `--tv-color-bar-mark-background-color`, `--tv-color-popup-background`, `--tv-color-popup-element-text`, `--tv-color-popup-element-text-hover`, `--tv-color-popup-element-background-hover`, `--tv-color-popup-element-divider-background`, `--tv-color-popup-element-secondary-text`, `--tv-color-popup-element-hint-text`, `--tv-color-popup-element-text-active`, `--tv-color-popup-element-background-active`, `--tv-color-popup-element-toolbox-text`, `--tv-color-popup-element-toolbox-text-hover`, `--tv-color-popup-element-toolbox-text-active-hover`, `--tv-color-popup-element-toolbox-background-hover`, `--tv-color-popup-element-toolbox-background-active-hover` [57].

Note the split: **platform background** (the page) and **pane background** (the chart) are separate tokens, and every toolbar state (rest / hover / expanded / active / active-hover) has its own text and background colour. The theme is applied by a class on the root element (`.theme-dark`), which is the same mechanism OnStock uses (`html.light`) — TradingView just defaults the other way.

Other constructor-level appearance knobs (library only, no hosted-site equivalent): `toolbar_bg` ("A background color of the toolbars"), `custom_font_family` ("Changes the font family used on the chart"), `loading_screen` (spinner colours), `header_widget_buttons_mode` [68].

### 1.5 Plan gating

None. The pricing table has rows for "Charts per tab", "Saved chart layouts" and "Indicators per chart" but "does not list distinct entries for custom themes, colour themes, chart templates, indicator templates, or extended hours/sessions as separate feature rows" [70]. Theme, Canvas, templates and scale modes are available on **Basic**.

---

## 2. The Chart settings dialog

### 2.1 Opening it

| Entry | Label / gesture | Source |
|---|---|---|
| Top toolbar | "the gear button on the upper toolbar" | [1] |
| Bottom of chart | "or at the bottom of the chart" (the gear beside the timezone clock; it opens the price-scale settings, whose "More settings…" leads to the full dialog) | [1], [14] |
| Direct | "double-click on the price line or bars" | [1] |
| Legend | The "Settings" button that appears on the legend row (library featureset `format_button_in_legend`, On by default) | [58] |
| Keyboard (Desktop app) | "Open Settings dialog: Windows, Linux: Ctrl + , macOS: Cmd + ," — this is the **app** settings, not chart settings | [50] |

### 2.2 The tabs, in order

Verbatim from the article's table of contents [1]: **Symbol** · **Status line** · **Scales and lines** · **Canvas** (sub-sections *Chart basic styles*, *Scales*, *Buttons*, *Margins*) · **Trading** (sub-sections *General*, *Appearance*) · **Alerts** · **Events** · then "More price scale settings" and **Template**.

The dialog is context-sensitive: "chart settings can differ when it comes to the chart type and symbol. Symbol section changes according to the chart type you choose, and corporate events like stock splits are impossible for Bitcoin." [1]. In the library, whole pages can be removed (`show_chart_property_page`, `property_pages`, `chart_property_page_trading`, `chart_property_page_scales`, `chart_property_page_right_margin_editor` — all On by default) [58].

### 2.3 The Template dropdown

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| "Template" | Bottom-left of the Chart settings dialog | "You can always save your chart settings and change them promptly through this menu." | [1] |
| (library) "Chart settings → Template" | same | A chart template is "A set of colors used for the main series. For example, this can include candle up/down colors, wick colors, line colors, background colors, and more." | [65] |
| (dropdown items) "Apply Defaults" / "Save As Default" / "Save As…" | inside the Template dropdown | **Could not verify from a primary source.** A Reddit thread surfaced by search quotes the reset path as "Chart settings -> Template -> Apply defaults" [73]; TradingView's own texts never spell the items out. Treat the item names as approximate. | [73] |

What a saved chart template actually contains, from the library's `ChartTemplateContent` interface: `chartProperties` (with `paneProperties` and `scalesProperties`), `mainSourceProperties` ("Series properties (for example chart style, etc)") and a `version` [67]. So a template = **canvas + scales + the main series' style**, and nothing else — no indicators (those are *indicator templates*, section 8.3), no drawings, no symbol, no interval.

---

## 3. The Canvas tab

Everything below is the hosted product's option list from [1], with the engine's default value from the library reference [53] where one exists (light theme unless stated). Line-style enumerations come from the same reference (`LineStyle.Solid` / `Dotted` / `Dashed`; `GridLinesMode` "both" and, by construction, vert / horz / none).

### 3.1 Chart basic styles

| Label (verbatim) | Choices | Engine default (light) | What it does | Source |
|---|---|---|---|---|
| Background | "solid or gradient" — one colour picker, or two for a top-to-bottom gradient | `paneProperties.backgroundType = 'solid'`; `'gradient'` **in the dark theme**; `background`, `backgroundGradientStartColor`, `backgroundGradientEndColor` all `'#ffffff'` | "choose the background color and set it for solid or gradient." The gradient was introduced Sep 2020: "Choose two colors. The linear gradient will fill the background of the chart from top to bottom." At launch it sat in an "Appearance" tab; that tab has since been renamed Canvas. | [1], [23], [53] |
| Grid lines | "vertical only, horizontal only, vertical and horizontal together, or none", each with colour and opacity | `gridLinesMode = "both"`; `vertGridProperties.color` and `horzGridProperties.color` = `'rgba(42, 46, 57, 0.06)'`; style `LineStyle.Solid` | "choose which grid lines you want to see … Choose their colors and opacity for more customization." Note the default is a 6 %-alpha ink, not a fixed grey — it composites on any background. | [1], [53] |
| Pane separator | colour, opacity | `paneProperties.separatorColor = '#EBEBEB'` | Only appears once an indicator pane exists: "the line between the price part of the chart and indicators." | [1], [53] |
| Crosshair | colour, opacity, "thickness and style" | `crossHairProperties.color = '#9598A1'`, `style = LineStyle.Dashed`, `width = 1`, `transparency = 0` (transparency only applies when the colour is given as hex) | "For Crosshair, that follows your cursor, you can set its color and opacity as well as your preferred thickness and style." A related trap: "only 'Cross' and 'Dot' cursor types support the crosshair, while 'Arrow' and 'Eraser' types do not" — the cursor-type menu on the left toolbar can make the crosshair vanish regardless of these settings. | [1], [46], [53] |
| Watermark | colour, opacity (visibility toggle implied by the section) | (not in `ChartPropertiesOverrides`; set through the Watermark API or the `symbolWatermark` user setting, e.g. `{ "visibility": "true", "color": "rgba(244, 67, 54, 0.25)" }`) | "Watermark displays the chosen symbol and time interval. Here, available settings are colors and opacity as well." The library adds that the default watermark shows "a symbol ticker, interval, and description", lives at "Settings → Canvas → Watermark", and TradingView "recommends allowing users to enable watermarks themselves rather than forcing them programmatically". Ticker, interval and description can be toggled individually via `tickerVisibility()`, `intervalVisibility()`, `descriptionVisibility()`; `setContentProvider()` replaces the text entirely. | [1], [60], [66] |

### 3.2 Scales (text and lines)

| Label (verbatim) | Choices | Engine default | What it does | Source |
|---|---|---|---|---|
| Text (size) | a size picker | `scalesProperties.fontSize = 12` | "Scales are located to the right and at the bottom of the chart. Choose a scale for the text size that works for you." A Reddit answer surfaced by search says the range is "from 10 to 40" [74] — third-party, **could not verify** the bounds from TradingView. | [1], [53] |
| Text (colour) | colour picker | `scalesProperties.textColor = '#131722'` | "For better visibility, try changing colors for both text and lines." Setting it equal to the background is a documented support case: "the text color is likely the same as your background" → fix in "canvas settings → Text color". | [1], [34], [53] |
| Lines (colour) | colour picker | `scalesProperties.lineColor = 'rgba(42, 46, 57, 0)'` — i.e. the axis border is **fully transparent by default** | The hairline between the pane and the scales. | [1], [53] |

No option exists anywhere in the hosted dialog for the **UI font family** or the size of legend / status-line text; only the axis text is sized here. (The library's `custom_font_family` is an integrator-only constructor option [68].)

### 3.3 Buttons

| Label (verbatim) | What it does | Source |
|---|---|---|
| Navigation buttons | "located at the bottom of the chart. They help you zoom in or out, scroll to the left or to the right, or reset the chart view." Visibility toggle. | [1] |
| Pane buttons | "allow you to manage chart panes — move them up and down, collapse, maximize, and remove them." Visibility toggle. | [1] |

### 3.4 Margins

| Label (verbatim) | Engine default | What it does | Source |
|---|---|---|---|
| Top / Bottom (pane margins) | `paneProperties.topMargin = 10`, `bottomMargin = 8` (percent of pane height reserved above/below the auto-scaled series) | "choose the distance between the price line and the upper, bottom, or right edges of the chart." | [1], [53] |
| Right | (library: "Right margin" field, `chart_property_page_right_margin_editor` On; `show_percent_option_for_right_margin` Off — bars by default, percent optional) | Empty space after the last bar. | [1], [58] |

---

## 4. The Symbol tab — the "Style" conventions

The tab is chart-type-aware: "This menu automatically adjusts to the chart type you're using and lists settings specific to each type. Generally, here you can choose your chart's look — adjust colors, opacity, width, and other parameters." [1]

### 4.1 Candles (and the up/down colour system)

| Label (verbatim) | Engine default | What it does | Source |
|---|---|---|---|
| "Color bars based on previous close" | `candleStyle.barColorsOnPrevClose = false` (same key for bars) | Colours each candle by its close vs the **previous** close instead of its own open/close. Off by default. | [21], [53] |
| "Body" | `drawBody = true`; `upColor = "#089981"`, `downColor = "#F23645"` | Toggle plus an up colour and a down colour. | [21], [53] |
| "Borders" | `drawBorder = true`; `borderUpColor = "#089981"`, `borderDownColor = "#F23645"` (single-colour fallback `borderColor = "#378658"`) | Toggle plus up/down colours. | [21], [53] |
| "Wick" | `drawWick = true`; `wickUpColor = "#089981"`, `wickDownColor = "#F23645"` (single-colour fallback `wickColor = "#737375"`) | Toggle plus up/down colours. | [21], [53] |

The candlestick article's framing is the useful sentence: you can customise candles "by adjusting their colors and assignment type to bullish and bearish" [21] — i.e. TradingView treats *which bars count as up* ("Color bars based on previous close") as a first-class style choice alongside the colours themselves. Hollow candles and Heikin Ashi carry the identical property set (`hollowCandleStyle.*`, `haStyle.*`) with the same defaults [53].

TradingView's **current** up/down pair is `#089981` / `#F23645` [53]. (OnStock's design-system doc cites `#26a69a` / `#ef5350`; that was TradingView's older Material-400 pair — the engine has since moved to the more saturated teal/red above. Both are documented TradingView values, just from different eras.)

### 4.2 Bars, lines, areas, baseline

| Style | Labels / keys | Engine default | Source |
|---|---|---|---|
| Bars | "Thin bars" (`barStyle.thinBars = true`), "HLC bars" (`barStyle.dontDrawOpen = false`), `upColor`/`downColor` as candles | thin, open tick drawn | [53] |
| Line, Line with markers, Step line | "Line" setting with a **"Solid"** / **"Gradient"** dropdown: "Open chart settings → Head to the Symbol tab → Find the Line setting and select the Gradient option from the drop-down menu." Gradient exposes two colours, per-colour transparency and line thickness. | `lineStyle.color = "#2962FF"`, `linewidth = 2`, `linestyle = Solid`, `priceSource = "close"` | [22], [53] |
| Area | `areaStyle.color1 = "rgba(41, 98, 255, 0.28)"`, `color2 = "#2962FF"`, `linecolor = "#2962FF"`, `linewidth = 2`, `transparency = 100` | blue fill fading to transparent | [53] |
| Baseline | `baseLevelPercentage = 50`, `topLineColor = "#089981"`, `bottomLineColor = "#F23645"`, `baselineColor = "#758696"`, line widths 2 | green above / red below a mid-line | [53] |

The brand blue `#2962FF` is TradingView's single-series colour everywhere a direction is not being shown (line, area, alert-drawing highlights `scalesProperties.axisLineToolLabelBackgroundColorCommon = '#2962FF'`, `axisHighlightColor = 'rgba(41, 98, 255, 0.25)'`) [53].

### 4.3 Data modification (the non-colour half of the Symbol tab)

| Label (verbatim / as described) | Choices | What it does | Source |
|---|---|---|---|
| Session | "regular or extended hours" (library labels: "Regular Trading Hours" / "Extended Trading Hours"; `mainSeriesProperties.sessionId = 'regular' | 'extended'`) plus, for BOATS-supported US stocks, "24h" | "For stocks and funds, select a session (pick regular or extended hours)". See section 7 for the shading. | [1], [9], [59] |
| Extended hours tint | colour / opacity | "There you can also change or remove the tint that highlights Extended Hours data on the chart by default." | [8] |
| "Electronic trading hours background" | colour, opacity | Futures only: on by default on intraday intervals; adjust or disable via colour/opacity. | [10] |
| Adjust data for contract changes | toggle | "For futures … allows back-adjustment in continuous futures to remove the price gap". | [1] |
| Adjust for dividends | toggle | "adjust data if you want more precise charts that account for a company's dividends distribution". | [1] |
| Precision | "Default" plus fixed decimal steps | "choose the price format to display on the price scale and in values near the symbol's status line." "Default" = "a standard view of prices that the provider sends." Library key `mainSeriesProperties.minTick = "default"`. | [1], [41], [53] |
| Timezone | list of zones plus "Exchange" | "You can set a particular timezone or choose 'Exchange' so that the chart will automatically switch to this exchange's time." Also reachable by "clicking on the clock" at the bottom bar. | [1], [43] |

---

## 5. The Status line tab (the legend)

"Here, you can set the info to display next to the symbol's ticker — logo, title, chart values, and more. Try turning on/off each of them to see the results." [1]. The library's Legend page and override list give the individual controls [61], [53]:

| Option (label as documented) | Engine default | What it does | Source |
|---|---|---|---|
| Logo | (`show_symbol_logo_in_legend` On) | Symbol logo before the title. | [1], [58] |
| Title | dropdown "Description" / "Ticker" / "Ticker and description" (`statusViewStyle.symbolTextSource = "description"`) | What the first line of the legend says. | [61], [53] |
| Exchange / Interval in title | `statusViewStyle.showExchange = true`, `showInterval = true` | e.g. "AAPL · 1D · NASDAQ". | [53] |
| Chart values (OHLC) | `legendProperties.showSeriesOHLC = true` | The O H L C readout of the bar under the cursor. | [1], [53] |
| Bar change values | `showBarChange = true` | Change and % change of that bar. | [53] |
| Volume | `showVolume = false` | Off by default. | [53] |
| Last day change values | `showLastDayChange = false` (UI option gated behind featureset `legend_last_day_change`, Off) | Daily change/percent from the quote feed. | [53], [58] |
| Indicator titles / arguments / values | `showStudyTitles`, `showStudyArguments`, `showStudyValues` all `true` | The per-indicator legend rows. A per-indicator override lives in each indicator's Style tab ("Labels on the price scale", "Values in the status line"), but "if the settings … are disabled globally … values and labels won't be displayed for individual indicators" — global wins. | [44], [53] |
| Background | `showBackground = true`, `backgroundTransparency = 50` | A translucent plate behind the legend text. | [53] |
| Market status icon | (`display_market_status` On) | The open/closed/pre/post glyph next to the title. | [58] |
| Buttons | (`show_hide_button_in_legend`, `format_button_in_legend`, `delete_button_in_legend`, all On) | Hover reveals Hide / Settings / Remove. | [58] |

Related but outside the dialog: the **floating data tooltip** ("in-depth information about the symbol and indicators … when you click and hold the left mouse button") is toggled from the **cursor-type menu in the left toolbar**, not from Status line [45]; and to show indicator values on every chart of a layout at once you enable **"Crosshair synchronization"** in the "Select Layout" menu [48].

---

## 6. The Scales and lines tab and the price-scale menu

### 6.1 In the dialog

"There are three main sections." [1]

| Section (verbatim) | Options (as the article names them) | Engine keys / defaults | Source |
|---|---|---|---|
| Price scale | "currency and unit visibility, scales mode, price to bar ratio lock, and scales position" | `priceScaleSelectionStrategyName = 'auto'` ("left", "right", or "spread evenly (auto)"); `priceAxisProperties.autoScale = true`; `alignLabels = true`. The currency/unit item is reached as "Scales and Lines tab → Currency and Units" with a display-mode dropdown. "Scales mode" choices — **could not verify** the dropdown text. | [1], [32], [53] |
| Price labels and lines | "labels overlapping, price button to create alerts, countdown to bar close, as well as symbol values, high/low, and other values format, visibility, and colors" | `showSeriesLastValue = true`, `showStudyLastValue = true`, `showSymbolLabels = false`, `showStudyPlotLabels = false`, `showBidAskLabels = false`, `showPrePostMarketPriceLabel = true`, `showPriceScaleCrosshairLabel = true`, `showTimeScaleCrosshairLabel = true`; `showPriceLine = true` (width 1), `showPrevClosePriceLine = false` (`#555555`), `showCountdown = false`, `highLowAvgPrice.highLowPriceLinesVisible = false`, `averageClosePriceLineVisible = false`, `bidAsk.visible = false` (`#2962FF` bid / `#F7525F` ask, dotted). The "Plus button" ("creates alerts, orders, and horizontal lines") is also here. | [1], [42], [53] |
| Time scale | "display weekdays, choose date and hours format, and also pin chart to the left when changing intervals" | "Day of week on labels" checkbox; "Date format" dropdown (default is regional — "yyyy-mm-dd for the Korean, Japanese, Chinese and Taiwanese sites" — and **applies globally to all charts**); "Time hours format" (library featureset `scales_time_hours_format`); "Save chart left edge position when changing interval" (blog: Nov 2024). | [1], [26], [27], [39], [40], [58] |

### 6.2 The price-scale context menu ("More price scale settings")

Reached by "the gear button at the bottom of the price scale", by right-clicking the scale, or — with several scales — by clicking "the letter that indicates the scale" [1], [36]. The article walks through it in order:

| Label (verbatim) | Shortcut | What it does | Source |
|---|---|---|---|
| Reset price scale / "Auto" | (the "Auto button" on the scale; "If you are unable to find the Auto button, check its visibility settings") | "automatically adjusts the price line to the screen size, and turns on the Auto mode, which fits data to your screen." | [1], [33] |
| Scale price chart only | — | "will disable scaling of indicators or other chart elements." (`scalesProperties.scaleSeriesOnly = false`) | [1], [53] |
| Invert scale | **Alt+I** / **⌥ I** | "the increase in price is shown from top to bottom." (`priceAxisProperties.isInverted = false`) | [1], [30], [31], [53] |
| Regular | — | "A linear scale that uses absolute values in price changes … The distance between $40 and $80 on such a scale would be the same as between $400 and $440." | [1] |
| Percent | — | "A linear scale that uses percentage values in price changes … Each price change here is represented by a fixed distance from the chart's starting point." (`percentage = false`) | [1], [53] |
| Indexed to 100 | — | "The first value here on the chart is set to 100. To calculate the following values, we add the percentage change of each symbol relative to the first value to 100." (`indexedTo100 = false`) | [1], [53] |
| Logarithmic | (Alt+L per third-party shortcut lists — **could not verify** from TradingView) | "an exponential scale that uses percentage changes in price … spacing between $40 and $80 would be ten times larger than between $400 and $440". Warning verbatim: "turning off logarithmic scale returns the chart to the regular price scale even if the previously chosen was Percent or Indexed to 100." (`log = false`) | [1], [53] |
| (placement) left / right | — | "you can choose either the left or right side for the scale on the chart." Help Center: "In the chart settings, you can set the right or left side of a chart to place all the price scales". A literal "Both" option **could not verify**; both sides are populated when different series are pinned to different sides. | [1], [29] |
| "Merge All Scales Into One" → "On The Left" / "On The Right" | — | "To merge all visible price scales into one column on the left or right side, open the menu of any scale and select Merge All Scales Into One -> On The Left/On The Right." | [28] |
| "Pin to scale" → "Pin to scale A" (per indicator, from its three-dot menu) | — | Moves an indicator onto the main series' scale; this is also the fix for "blank space next to the price scale" caused by a pane whose scale sits on the opposite side. Library values: `new-right`, `new-left`, `no-scale`, `as-series`; a pane holds at most **eight** price scales, after which new ones fall to No Scale. | [38], [64] |
| (hiding) | — | There is no hide toggle: "The scale is always displayed if something is attached to it. The price scale is hidden if nothing is attached to it." Use "no scale" or move everything to the other side. | [35] |
| Labels / Lines submenus | — | "In Labels and Lines, choose the information you want to see on the chart." The Lines submenu holds "Pre/post-market price line". | [1], [11] |
| Countdown to bar close | — | (`countdown` featureset On; `showCountdown = false`) | [58], [53] |

---

## 7. Sessions: breaks, extended-hours shading, 24h

| Thing | Label / where | Colour (engine default) | What it does | Source |
|---|---|---|---|---|
| Session breaks | **Events** tab of Chart settings; also "the right-click context menu of the time scale" | drawn as **blue vertical lines** | "Blue vertical lines on an intraday chart indicate session breaks. You can disable their display in the Events settings" — the exact checkbox wording **could not verify**; the article only names the tab. | [7] |
| Extended-hours tint | Symbol tab → Session, and the **"ETH"** button "in the bottom right corner" | Library defaults: pre-market `"rgba(200,0,0,0.08)"` (red 8 %), post-market `"rgba(0,0,200,0.08)"` (blue 8 %), out-of-session `"rgba(0,0,0,0.2)"` — keys `backgrounds.preMarket.color`, `backgrounds.postMarket.color`, `backgrounds.outOfSession.color` | "You can display the Extended Hours data on intraday charts either by choosing the ETH option in the bottom right corner or in the Symbol tab in the Settings menu." Since Aug 2020 the two tints are separately editable: "you can now change the colors for pre- and post-trade periods on the chart". If the exchange has no ETH data "the ETH button won't appear". | [8], [24], [59] |
| Session toggle button | bottom toolbar | — | "Use the session toggle button in the bottom toolbar of the chart to switch directly between regular, extended hours, and 24h sessions without opening Settings." | [9] |
| 24h / overnight | Symbol tab → Session → "24h" | — | "Trading periods are visually separated on the chart, so you can clearly see where the overnight markets begin and end without breaking the continuity of the price series." US stocks on BOATS only; "Daily and higher timeframes continue to follow the main exchange session." Labels in the blog: "Regular Trading Hours (RTH)", "Extended Hours (ETH)", "Overnight Session (24h)". | [9], [25] |
| Pre/post-market price line and label | price-scale gear → "Lines" → "Pre/post-market price line"; label `showPrePostMarketPriceLabel = true` | — | Shows the extended-session last price as a line even while viewing RTH. | [11], [53] |
| Electronic session (futures) | Symbol tab → "Electronic trading hours background" | on by default, intraday only | Colour and opacity; disable by zeroing opacity. | [10] |
| Inactivity gaps | Chart settings checkbox (library featureset `inactivity_gaps`, Off) | — | "periods with no trading activity" render as whitespace, only "within the trading session". | [69] |

The design signal: TradingView shades **session state as a background wash at ~8 % alpha in a hue that is not the up/down pair** (red-ish pre, blue-ish post), draws **breaks as thin vertical rules**, and keeps the price direction colours for candles only. Session and direction never share a channel.

---

## 8. Templates, defaults, "Apply to all", and what persists where

### 8.1 The four kinds of saved thing

From the library's saving/loading overview, which mirrors the hosted product [65]:

| Kind | Definition (verbatim) | Where saved / applied |
|---|---|---|
| Chart layout | "A single chart in Advanced Charts or a group of charts in Trading Platform. The chart layout includes drawings, indicators, and various chart settings, such as colors and styles." | Save button / Ctrl+S; autosave toggle [13], [20] |
| Chart template | "A set of colors used for the main series. For example, this can include candle up/down colors, wick colors, line colors, background colors, and more." | "Chart settings → Template" |
| Indicator template | "A set of applied indicators and their settings, such as inputs and styles." | Indicator templates button on the top toolbar; "Save indicator template" with a "Remember Symbol" checkbox (the interval is remembered too) [17], [18] |
| Drawing template | "A set of properties of a particular drawing. This can include the drawing's line style, text alignment, and more." | Drawing's toolbar; "the last template that was used will be saved as default" [75] |
| User settings | "Settings that remain regardless of the applied chart layout. They are stored separately from chart layouts" — e.g. resolution, chart style, right/bottom widget-bar view, watchlist, trading preferences. Stored in `localStorage` unless the host supplies a `settings_adapter`. | [66] |

### 8.2 Scope rules (per chart / per layout / per symbol / per account)

| Rule (verbatim where possible) | Source |
|---|---|
| "Chart settings: background color, lines, candles, etc. The settings can be different for each chart in the layout." and "These settings are not synchronized between layouts." | [12] |
| "Each layout is a separately saved workspace, and the charts within them retain their own settings and can be customized independently." | [14] |
| "When navigating between symbols, your layout keeps its settings such as appearance and indicators." — i.e. **appearance is NOT per symbol**; it belongs to the chart slot inside the layout and follows you from ticker to ticker. | [13] |
| "Settings are individual for each chart" → the **"Apply to all"** button in Chart settings copies one chart's settings to every chart in the layout (Blog 2018: "lets you apply changes made in the chart settings to all charts in a single window"). | [15], [16] |
| Drawings are the exception: they are stored against the **symbol within a layout** (and optionally synced layout-wide or globally), never against a watchlist; "Layouts and charts are in no way connected to watchlists." | [12], [49] |
| "Date format" is global: "applies globally across all charts viewed". | [40] |
| Theme is per account plus local storage (section 1.3). | [3] |
| The mobile app's "default chart" is simply "the last chart you viewed in either the web browser or on the TradingView Desktop app". | [19] |
| Layout changes need Save/autosave; unsaved changes show a blue "Save" under the layout name; in multiple tabs "manually save in each tab". | [20] |
| Library persistence: `save_chart_properties_to_local_storage` and `use_localstorage_for_settings` are both On by default, so chart properties survive reloads even without a saved layout. | [58] |

### 8.3 What "default" means on TradingView

There is **no single "Default template"** article. The pieces are:

- Chart: the Template dropdown's reset-to-defaults item (approximate wording "Apply defaults", third-party only [73]) restores the engine's theme defaults for the Canvas/Symbol/Scales properties in section 3–6.
- Indicators: each indicator's settings dialog has a "save as default at the very bottom" (third-party wording) so the next insertion uses your inputs and colours [75].
- Drawings: last-used template becomes the default for that tool [75].
- Layout: the app opens the last-viewed layout, not a designated default [19].

### 8.4 Plan limits that touch this surface

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate | Source |
|---|---|---|---|---|---|---|
| Charts per tab | 1 | 2 | 4 | 8 | 16 | [70] |
| Saved chart layouts | 1 | 5 | 10 | 10 | 10 | [70] |
| Indicators per chart | 2 | 5 | 10 | 25 | 50 | [70] |

Chart templates, indicator templates, themes and extended hours have **no row** on the pricing page [70]. (The Help Center's ETH article also "does not specify which subscription tier is required" [8].)

---

## 9. Accessibility

| Item | What TradingView says (verbatim where possible) | Source |
|---|---|---|
| Standard | "We aim to meet a minimum standard of Level AA success criteria as defined by WCAG 2.2." The website is "designed to meet the WCAG 2.2 Level AA standards"; the chart is "actively working" toward it; "Some of our widgets" are fully accessible. | [51] |
| Keyboard | Website: "All elements on our website are accessible via keyboard navigation" with Tab / Shift+Tab and a "Skip Content" button. Chart: Tab navigation for "top bar, drawings panel, right and bottom panels". Library default: **Alt+Z** starts chart keyboard navigation, then Tab and arrows; the `accessible_keyboard_shortcuts` featureset (Off) makes Tab the entry and moves chart-switching to Shift+→ / Shift+←. | [51], [52], [58] |
| Screen readers | "fully compatible with screen readers" with "Clear and structured headings". Library: VoiceOver (macOS); Narrator, JAWS, NVDA (Windows). Featuresets `aria_crosshair_price_description` ("Announces, via the screen reader, the price when the crosshair is moved") and `aria_detailed_chart_descriptions` (both Off by default). | [51], [52], [58] |
| Contrast | "Sufficient color contrast for both light and dark themes" is a stated priority; library: "Colors on the chart are compliant with the WCAG 2.2 AA standard." | [51], [52] |
| User-facing accessibility settings | **None found.** No high-contrast mode, no colour-blind palette, no reduced-motion toggle, no UI font scaling in the hosted product — **could not verify** any such option. The only lever is the general one: every chart colour is user-editable in Chart settings, plus the Canvas text-size picker. | [51], [1] |
| Feedback | inclusion.feedback@tradingview.com, "only for accessibility issues". | [51] |

---

## 10. Consolidated defaults sheet (engine, light theme unless noted)

For a designer wanting one table to copy from. All from `ChartPropertiesOverrides` [53] except the session backgrounds [59].

| Property | Default |
|---|---|
| Pane background | `#ffffff` solid; **gradient in dark theme** (start/end both `#ffffff` in light) |
| Grid (vert & horz) | `rgba(42, 46, 57, 0.06)`, solid, mode "both" |
| Pane separator | `#EBEBEB` |
| Crosshair | `#9598A1`, dashed, width 1, transparency 0 |
| Crosshair label background | light `#131722` / dark `#363A45` |
| Scale text | 12 px, `#131722` |
| Scale border line | `rgba(42, 46, 57, 0)` (invisible) |
| Auto-scale margins | top 10 %, bottom 8 % |
| Candle up / down | `#089981` / `#F23645` (body, border and wick alike) |
| Bar up / down | `#089981` / `#F23645`, thin bars on |
| Line | `#2962FF`, width 2 |
| Area | `rgba(41, 98, 255, 0.28)` → `#2962FF` |
| Baseline | top `#089981`, bottom `#F23645`, base `#758696`, level 50 % |
| Previous-close line | `#555555`, width 1, hidden |
| Bid / ask lines | `#2962FF` / `#F7525F`, dotted, hidden |
| Drawing-on-axis highlight | `rgba(41, 98, 255, 0.25)`; label `#2962FF`, active `#143EB3` |
| Legend background | shown, 50 % transparency |
| Pre-market / post-market / out-of-session wash | `rgba(200,0,0,0.08)` / `rgba(0,0,200,0.08)` / `rgba(0,0,0,0.2)` |
| Price scale placement strategy | `auto` |
| Session | `regular` |

---

## 11. OnStock's design system vs TradingView — where they agree and conflict

What OnStock ships today (read from `docs/design-system.md`, `src/index.css`, `src/lib/theme.js`, `src/lib/accent.js`, `src/overlays/AppearanceSheet.jsx`, `src/components/CandleChart.jsx`, `src/components/DualLineChart.jsx`):

- Theme: `Dark` (default) / `Light` / `Match system`, stored in `localStorage` key `bw.theme.v1`, applied as `html.light`; `Match system` listens to `prefers-color-scheme`. Plus a user-chosen **accent** (Teal / Violet / Amber / Sky — "Green and rose are deliberately absent … a brand accent must never impersonate a signal").
- Surfaces: four oklch steps at hue 250; borders are white-at-alpha (`0.06 / 0.10 / 0.16`); "no shadows, no nested cards, no gradient fills on surfaces".
- Direction: `--color-gain #3fb950` / `--color-loss #f85149`, with colour-blind alternates blue/amber; **session** colours declared separately (`--color-session-open/overnight/closed`).
- Charts: Lightweight Charts v5 (TradingView's own open-source engine) with a **transparent** solid background, grid = `--border-subtle`, axis = `--border-default`, crosshair = zinc-600, candles borderless with wick = body colour, 11 px axis text, "Charts by TradingView" as a caption rather than a watermark, RSI in a second pane; the Gap chart is hand-rolled SVG with three dashed horizontal rules and a scrub crosshair.

| Topic | TradingView | OnStock | Verdict |
|---|---|---|---|
| Two themes, remembered per user, system-following on Desktop/anonymous | Light + Dark; "Use system theme" only on Desktop; anonymous = system | Dark + Light + Match system, all on web | **Agree** — OnStock already exceeds the web product by offering system-follow everywhere. |
| Dark background is a **gradient** by default | `backgroundType = 'gradient'` in dark | "gradient fills on surfaces" banned; chart background transparent | **Conflict** — a deliberate one. TradingView's dark gradient is a subtle vertical fade; OnStock's rule is flat surfaces separated by hairlines. Keep OnStock's rule (see bullets). |
| Grid lines as low-alpha ink | `rgba(42,46,57,0.06)` — 6 % alpha of a near-black, so it works on any background | `--border-subtle` = `rgb(255 255 255 / 0.06)` | **Agree** exactly in principle (alpha hairlines, 6 %); OnStock inverts the ink for dark-first. |
| Axis border line invisible | `lineColor` alpha 0 | axis = `--border-default` (10 % white) | **Minor conflict** — TradingView draws no axis rule at all; OnStock draws one. OnStock's is consistent with its border-led separation; keep. |
| Crosshair | dashed grey `#9598A1`, 1 px, label plates on both scales | solid zinc-600 1 px, label plates on `surface-2` | **Agree** in substance; TradingView's default is dashed. |
| Up/down colours | `#089981` / `#F23645`; wick and border default to the same pair | `#3fb950` / `#f85149`; borders off, wick = body | **Agree** on structure (one pair carries body/wick/border). OnStock's pair is GitHub's, not TradingView's — both are off-full-chroma, which is the point. |
| "Color bars based on previous close" | first-class option | not offered | **Gap** — see bullets. |
| Session vs direction colours | separate: session wash at 8 % alpha in red/blue, breaks as blue rules, market-status icon in legend | separate tokens declared, but the CandleChart draws **no session shading or breaks** | **Agree** in tokens, **gap** in the chart. |
| Watermark | symbol + interval + description, colour/opacity, user-toggleable | none; attribution caption instead | **Skip** — OnStock's choice is the cleaner one; TradingView itself recommends letting users opt in. |
| Scale text size | user picker (12 px default) | fixed 11 px | **Conflict** (minor) — desktop users with large monitors will want a step up. |
| Price-scale placement left/right/merge | yes | right only (Lightweight Charts supports left/right/overlay per series) | **Gap** relevant to the Gap|Candles toggle: two price scales (token vs stock) is exactly what "left/right" is for. |
| Scale modes Regular / Percent / Indexed to 100 / Logarithmic | yes, with the log-off-resets-to-regular warning | none | **Gap** — Percent / Indexed to 100 is the mode that makes a stock-vs-token overlay honest. Lightweight Charts has `mode: Normal / Logarithmic / Percentage / IndexedTo100` built in. |
| Per-chart settings, layout carries them across symbols, "Apply to all" | yes | single global theme; no per-chart settings yet | **Agree with intent** — OnStock has no multi-chart, so "global" is the right level for now. |
| Chart template = colour set only | yes | n/a | **Skip** for now. |
| Accessibility settings | none user-facing; WCAG 2.2 AA target; every colour editable | colour-blind alternates as tokens; `prefers-reduced-motion` honoured; 4.5:1 target | **OnStock is ahead** — TradingView exposes no colour-blind palette; OnStock has one designed but not surfaced in the Appearance sheet. |
| Font | system font on chart; family not user-editable | system stack, tabular figures | **Agree**. |
| Theme restore bug ("black chart background in the light theme") | documented | CandleChart re-reads tokens on every `html.class` mutation, so no stale colours | **OnStock avoids it** by construction. |

---

## What this means for OnStock

1. **Adopt — the two-level theme model, one class on `<html>`.** TradingView's `.theme-dark` root class and separate *platform* vs *pane* background tokens are exactly OnStock's `html.light` + `--surface-0` … `--surface-3`. Nothing to change; keep the chart background transparent so the pane is `surface-0` [57].
2. **Skip — the dark-theme gradient background.** TradingView defaults dark to a gradient [53]; OnStock's system bans gradient fills on surfaces and separates with hairlines instead. The ban is the more legible choice for a data table beside a chart, and it costs nothing to keep.
3. **Adopt — alpha grid lines at 6 %.** Already identical in spirit (`--border-subtle` 6 % white vs TradingView's 6 % near-black) [53]. Keep the grid, keep it that faint, and do not add a dotted style option.
4. **Adapt — "Color bars based on previous close" as a single toggle in the Candles panel.** TradingView treats which bars count as up as a style choice [21]. For a tokenized stock that trades through the underlying's close, "vs previous close" is often the more truthful colouring; Lightweight Charts can do it by precomputing per-bar `color`. One checkbox, no colour pickers.
5. **Adopt — session shading and session breaks on the Candles chart, in the session tokens, never in gain/loss.** TradingView washes pre/post-market at ~8 % alpha in a non-directional hue and draws breaks as thin vertical rules [7], [59]. OnStock's chart has the tokens (`--color-session-overnight` amber) but draws nothing. For the thesis — the gap opens when the stock is closed and the token is not — shading the "stock closed, token trading" span on the candle chart is the single most on-thesis appearance feature in this whole surface. Lightweight Charts v5 supports this via a background-band primitive or a low-alpha area series behind the candles.
6. **Adopt — a "Regular / Percent" scale-mode toggle on the Candles chart and "Indexed to 100" on the Gap chart's stock-vs-token overlay.** TradingView's four modes exist for this exact comparison ("perfect for comparing completely different values") [1]. Lightweight Charts exposes `priceScale.mode` natively. Copy TradingView's warning behaviour too: leaving log returns to Regular, not to the previous mode.
7. **Adapt — left/right price scales for the two legs.** TradingView's placement options and "Merge All Scales Into One" [28], [29] are what a stock-vs-token overlay needs on desktop: token on the right scale, stock on the left, or both merged when in Percent mode. Do not add a placement *setting*; pick the placement per chart mode.
8. **Adapt — an axis text-size step (Small / Default / Large) in the Appearance sheet, applied to the chart's `layout.fontSize` and the `t-caption` readouts.** TradingView's Canvas → Scales text picker is the only font control in the product [1] and the one desktop users hit first. Keep it to three steps to stay inside the six-step type scale.
9. **Skip — the symbol/interval watermark.** TradingView itself says to let users opt in [60]; OnStock's "Charts by TradingView" caption covers attribution without a wash behind the candles.
10. **Skip — chart templates and "Apply to all".** They solve a multi-chart, many-colour-picker problem [15], [65] OnStock does not have. If per-chart colour pickers ever ship, a template is just a saved token set; design it then.
11. **Adopt — TradingView's persistence rules as the spec for desktop: settings belong to the chart slot, not the symbol, and follow you across tickers** [13]. The docked desktop layout (watchlist left, asset right) should keep timeframe, Gap|Candles, indicators and scale mode in the right pane as the user clicks down the list — exactly what "your layout keeps its settings" means.
12. **Adopt — remember appearance server-side once accounts exist, mirror to `localStorage`.** TradingView's most-asked theme question is "why isn't my theme saved" and the answer is cleared local storage [3]. OnStock currently stores `bw.theme.v1` / `bw.accent.v1` in `localStorage` only; Supabase is already a dependency.
13. **Adapt — surface the colour-blind pair in the Appearance sheet.** TradingView exposes no such option at all [51]; OnStock already has `--color-gain-alt` / `--color-loss-alt` designed. A third row under Accent ("Direction colours: Green/Red · Blue/Amber") is a genuine differentiator, and the sign-carried-by-the-character rule means it is safe to ship.
14. **Skip — the accent picker's expansion.** TradingView has no brand accent (its `#2962FF` is a fixed series colour [53]). OnStock's four accents already exclude green/rose for the right reason; do not add more.
15. **Adopt — keyboard reachability for the chart controls on desktop** (Tab into the timeframe row, Gap|Candles toggle, indicator toggles) and announce the crosshair value to screen readers on the Candles chart, mirroring `aria_crosshair_price_description` [52], [58]. TradingView ships these Off by default; OnStock can ship them On because the readout row already exists as text.

---

## Sources

Primary — TradingView Help Center
1. https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/ — How to configure your Supercharts (tabs Symbol, Status line, Scales and lines, Canvas, Trading, Alerts, Events, More price scale settings, Template)
2. https://www.tradingview.com/support/solutions/43000478062-how-to-enable-disable-dark-theme/ — How to enable/disable Dark theme
3. https://www.tradingview.com/support/solutions/43000635798-why-my-color-theme-isn-t-getting-saved/ — Why my color theme isn't getting saved?
4. https://www.tradingview.com/support/solutions/43000671628-how-do-i-switch-the-app-to-dark-or-light-color-theme/ — Desktop app: Use system theme / Dark / Light
5. https://www.tradingview.com/support/solutions/43000506669-how-do-i-turn-on-the-dark-theme/ — mobile: Menu → gear → Theme
6. https://www.tradingview.com/support/solutions/43000671618-why-do-i-use-tradingview-desktop-instead-of-the-web-version/ — What is TradingView Desktop (system theme)
7. https://www.tradingview.com/support/solutions/43000762935-i-cannot-remove-blue-vertical-lines-on-my-chart/ — session breaks
8. https://www.tradingview.com/support/solutions/43000502023-i-want-to-access-extended-hours-data/ — ETH button, extended-hours tint
9. https://www.tradingview.com/support/solutions/43000790593-how-to-view-the-24-hour-market-and-overnight-trading-sessions/ — 24h session
10. https://www.tradingview.com/support/solutions/43000747246-how-can-i-highlight-electronic-session-on-futures/ — Electronic trading hours background
11. https://www.tradingview.com/support/solutions/43000762938-how-do-i-display-the-price-line-for-the-extended-session/ — Lines → Pre/post-market price line
12. https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/ — per-chart settings, not synced between layouts
13. https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/ — layout keeps appearance across symbols; Ctrl+S; autosave
14. https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/ — gear near timezone; each layout's charts retain settings
15. https://www.tradingview.com/support/solutions/43000762822-how-to-apply-the-same-settings-to-all-charts/ — "Apply to all"
16. https://www.tradingview.com/blog/en/change-settings-multiple-charts-layout-one-click-8600/ — "Apply to All" (2018)
17. https://www.tradingview.com/support/solutions/43000543048-what-are-indicator-templates/
18. https://www.tradingview.com/blog/en/indicator-templates-with-a-saved-symbol-19213/ — "Remember Symbol"
19. https://www.tradingview.com/support/solutions/43000690947-how-to-change-the-default-chart-that-loads-in-the-app/
20. https://www.tradingview.com/support/solutions/43000762820-the-changes-i-make-are-not-saved-in-my-layout/
21. https://www.tradingview.com/support/solutions/43000745269-introduction-to-candlestick-charts-and-patterns/ — Symbol tab: Color bars based on previous close, Body, Borders, Wick
22. https://www.tradingview.com/blog/en/line-charts-gradient-customization-49252/ — Line: Solid / Gradient (Dec 2024)
23. https://www.tradingview.com/blog/en/new-chart-gradients-20981/ — gradient background (Sep 2020)
24. https://www.tradingview.com/blog/en/charting-pre-and-post-trade-periods-19986/ — separate pre/post colours (Aug 2020)
25. https://www.tradingview.com/blog/en/overnight-session-59441/ — RTH / ETH / 24h labels
26. https://www.tradingview.com/blog/en/lock-chart-position-switch-intervals-48558/
27. https://www.tradingview.com/support/solutions/43000740649-how-can-i-keep-chart-position-in-time-after-applying-a-new-interval/ — "Save chart left edge position when changing interval"
28. https://www.tradingview.com/support/solutions/43000485562-how-can-i-merge-all-price-scales-into-one-on-the-left-or-right-side/
29. https://www.tradingview.com/support/solutions/43000480236-how-to-place-all-the-scales-on-the-right-or-left/
30. https://www.tradingview.com/support/solutions/43000475599-how-to-invert-reverse-the-chart-price-scale/
31. https://www.tradingview.com/support/solutions/43000542381-how-to-invert-the-price-scale/ — Alt+I
32. https://www.tradingview.com/support/solutions/43000565621-how-do-i-enable-disable-the-currency-unit-label-on-the-price-scale/
33. https://www.tradingview.com/support/solutions/43000762826-how-to-enable-autoscale/
34. https://www.tradingview.com/support/solutions/43000762828-i-cannot-see-prices-on-the-price-scale/
35. https://www.tradingview.com/support/solutions/43000480245-i-can-t-hide-the-price-scale/
36. https://www.tradingview.com/support/solutions/43000480183-price-scale-settings-are-gone-from-the-bottom-toolbar/
37. https://www.tradingview.com/support/solutions/43000480202-the-link-to-the-price-scale-setting-is-gone-from-the-indicators-symbol-settings-window/
38. https://www.tradingview.com/support/solutions/43000762933-how-to-remove-the-blank-space-next-to-the-price-scale/ — Pin to scale
39. https://www.tradingview.com/support/solutions/43000692911-how-to-enable-day-of-week-on-labels/
40. https://www.tradingview.com/support/solutions/43000473989-how-do-i-change-the-date-format/
41. https://www.tradingview.com/support/solutions/43000690943-i-want-to-change-the-number-of-decimals-on-the-scale/ — Precision
42. https://www.tradingview.com/support/solutions/43000645256-how-to-enable-the-plus-button-on-the-price-scale/
43. https://www.tradingview.com/support/solutions/43000476526-is-there-a-way-to-change-chart-timezone-or-clock-time-at-the-bottom-of-the-chart/
44. https://www.tradingview.com/support/solutions/43000659666-i-want-to-hide-the-values-of-individual-indicators/
45. https://www.tradingview.com/support/solutions/43000759580-how-to-enable-disable-floating-data-tooltip/
46. https://www.tradingview.com/support/solutions/43000472769-i-can-t-see-the-crosshair-line/
47. https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/
48. https://www.tradingview.com/support/solutions/43000665052-how-to-enable-status-line-on-all-charts-in-layout/
49. https://www.tradingview.com/support/solutions/43000651214-symbols-in-my-watchlist-do-not-contain-the-drawings-i-made-on-charts/
50. https://www.tradingview.com/support/solutions/43000623399-hotkeys/ — Desktop app hotkeys (Ctrl+, opens Settings)

Primary — TradingView accessibility and Charting Library documentation (same engine as Supercharts)
51. https://www.tradingview.com/accessibility/ — Accessibility Statement (WCAG 2.2 AA)
52. https://www.tradingview.com/charting-library-docs/latest/getting_started/accessibility/
53. https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartPropertiesOverrides/ — every pane / scale / series property with its default (read from the page HTML directly)
54. https://www.tradingview.com/charting-library-docs/latest/customization/overrides/chart-overrides/
55. https://www.tradingview.com/charting-library-docs/latest/customization/theme/
56. https://www.tradingview.com/charting-library-docs/latest/customization/styles/custom-themes/
57. https://www.tradingview.com/charting-library-docs/latest/customization/styles/CSS-Color-Themes/
58. https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets/
59. https://www.tradingview.com/charting-library-docs/latest/connecting_data/Extended-Sessions/ — pre/post/out-of-session default colours
60. https://www.tradingview.com/charting-library-docs/latest/ui_elements/watermarks/
61. https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend/
62. https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale/
63. https://www.tradingview.com/charting-library-docs/latest/ui_elements/Time-Scale/
64. https://www.tradingview.com/charting-library-docs/latest/ui_elements/indicators/indicator-placement/
65. https://www.tradingview.com/charting-library-docs/latest/saving_loading/ — definitions of layout / chart template / indicator template / drawing template / user settings
66. https://www.tradingview.com/charting-library-docs/latest/saving_loading/user-settings/
67. https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartTemplateContent/
68. https://www.tradingview.com/charting-library-docs/latest/core_concepts/Widget-Constructor/
69. https://www.tradingview.com/charting-library-docs/latest/ui_elements/Chart/ — inactivity gaps

Primary — TradingView marketing pages and Help Center indexes
70. https://www.tradingview.com/pricing/
71. https://www.tradingview.com/features/ and https://www.tradingview.com/blog/en/?s=dark+theme (blog search; Android Dark Mode, Aug 2019)
72. https://www.tradingview.com/support/categories/chart/ plus the folders https://www.tradingview.com/support/folders/43000549291-how-to-adjust-the-scales-on-a-chart/ , https://www.tradingview.com/support/folders/43000547370-i-can-t-find-a-certain-feature-or-setting/ , https://www.tradingview.com/support/folders/43000578567-how-to-work-in-the-multi-chart-mode/ , https://www.tradingview.com/support/folders/43000547349-charts-are-not-saving-not-syncing/ , https://www.tradingview.com/support/folders/43000561752-shortcuts-and-tips/ , https://www.tradingview.com/support/folders/43000579050-supercharts-learn-how-everything-works/

Third-party (used only to fill gaps, and marked as such in the text)
73. Reddit r/TradingView "factory reset" thread, as quoted in a Yahoo search snippet: "Chart settings -> Template -> Apply defaults" (the thread itself could not be fetched)
74. Reddit r/TradingView "Adjustable font size", as quoted in a Yahoo search snippet: Canvas → scales text "from 10 to 40"
75. https://friendofthetrend.com/tradingview/how-to-reset-charts/ and https://tradamaker.com/tradingview-templates/ — per-indicator "save as default"; drawing "last template … saved as default"

OnStock sources read for the comparison: `docs/design-system.md`, `src/index.css`, `src/lib/theme.js`, `src/lib/accent.js`, `src/overlays/AppearanceSheet.jsx`, `src/components/CandleChart.jsx`, `src/components/DualLineChart.jsx`, `package.json` (lightweight-charts ^5.2.1).
