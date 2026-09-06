# TradingView teardown 03 — Drawing tools

Surface 3 of 13. Reference material for OnStock's desktop ("on a PC it should be like TradingView").
Researched 2026-09-06 from TradingView's own Help Center, Advanced Charts / Trading Platform docs, and TradingView blog and TradingView-authored ideas. Third-party pages were used only to corroborate hotkeys.

How to read this file:

- Labels in `code font` are TradingView's own wording, copied from the source named in the row.
- "per the article" means the source describes the option but the fetch tool paraphrased it; the option exists, the exact capitalisation may differ.
- **Could not verify** means exactly that. Nothing in this file is invented to fill a gap.
- Plan names used by TradingView today: Basic (free), Essential, Plus, Premium, Expert, Ultimate.
- A caveat that affects the whole file: TradingView's Help Center pages are JavaScript-rendered. Text and GIF captions came through; the GIFs themselves (which often carry the exact dialog layout) did not. Where a dialog's exact wording lives only in a GIF, the row says so.

---

## 0. Where drawings live and how every drawing is edited

### 0.1 The left toolbar (the "drawing panel")

| Fact | Detail | Source |
|---|---|---|
| Location | `All available drawing tools are located in the panel on the left hand side. They are divided into subgroups based on instrument type.` Example given: `the 3rd group contains the Gann and Fibonacci drawing tools.` | [I can't find drawing tools](https://www.tradingview.com/support/solutions/43000473103-i-can-t-find-drawing-tools-fib-retracement-trend-line-or-other/) |
| Group order (top to bottom) | Cursors → Trend line tools → Gann and Fibonacci tools → Patterns → Forecasting and measurement tools → Geometric shapes → Annotation tools → Icons; then the utilities (Measure, Zoom in, Magnet, Keep drawing, Lock all drawings, Hide options, Sync drawings options, Remove options). The catalog article groups its sections in this order. | [Drawing tools available on TradingView](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/) |
| Toolbar hidden? | `you might have hidden it` — `Click the profile icon in the top left corner and set to display it again.` A second article: `click on menu in the upper left corner and show or hide the toolbar by changing the slider position`. | [I can't find drawing tools](https://www.tradingview.com/support/solutions/43000473103-i-can-t-find-drawing-tools-fib-retracement-trend-line-or-other/), [How can I enable/disable the drawings toolbar?](https://in.tradingview.com/support/solutions/43000512928-how-can-i-enable-disable-the-drawings-toolbar/) |
| Favorites | `click on the star symbol located next to the name or icon of this tool`; favourited drawing tools then appear `in the toolbar right on your chart` (a floating favourites strip). Advanced Charts docs call this the `Add to favorites` button and a `favorites toolbar`; it can be disabled with the `items_favoriting` featureset. | [How to favorite Indicators, Financials, Drawing Tools, and Timeframes?](https://www.tradingview.com/support/solutions/43000662392-how-to-favorite-indicators-financials-drawing-tools-and-timeframes/), [Advanced Charts: Drawings](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/) |
| Full-screen | In the embeddable library `the toolbar is hidden in the fullscreen mode` unless `side_toolbar_in_fullscreen_mode` is enabled. Not verified for tradingview.com itself. | [Advanced Charts: Drawings](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/) |

### 0.2 The floating toolbar (appears when a drawing is selected)

Documented pieces of it, gathered from the per-tool articles:

| Control | What it does | Source |
|---|---|---|
| Colour / line / fill swatches | Change colour of `text, lines or fill` for the selected drawing(s); works on a multi-selection and on an Object Tree group. | [How to change the color of multiple tools at once?](https://www.tradingview.com/support/solutions/43000677803-how-to-change-the-color-of-multiple-tools-at-once/) |
| `Settings` (gear) | Opens the properties dialog. Also reachable by double-clicking the drawing. | [How to add text to channel drawing tools](https://www.tradingview.com/support/solutions/43000710744-how-to-add-text-to-channel-drawing-tools/), [Note drawing tool](https://www.tradingview.com/support/solutions/43000737571-note-drawing-tool/) |
| `Templates` button | Save / apply a drawing template for that tool type (see §10). | [Advanced Charts: Saving and loading](https://www.tradingview.com/charting-library-docs/latest/saving_loading/), [Apply a template to several tools](https://www.tradingview.com/support/solutions/43000677801-how-to-apply-a-template-to-several-tools-of-the-same-type-at-once/) |
| Clock icon | Create an alert on the drawing (`select condition, periodicity and notification method`). Present on Trendline, Horizontal line/ray, Ray, Extended line, Rectangle, Parallel channel, Arrow, Fib retracement. Alerts are surface 8's territory; only noted here. | e.g. [Trendline drawing tool](https://www.tradingview.com/support/solutions/43000518095-trendline-drawing-tool/) |
| Three-dots menu | Carries `Intervals visibility` quick options (see §11). | [Faster setup of visibility on intervals](https://www.tradingview.com/blog/en/faster-setup-of-visibility-on-intervals-34613) |
| `Reverse` | Long/Short position only — flips the levels around the entry. Also in the context menu. | [How to reverse a position](https://www.tradingview.com/support/solutions/43000744866-how-to-reverse-a-position-drawn-on-a-chart-with-the-long-or-short-position-tool/) |
| Add row / column | Table tool only. | [Table drawing tool](https://www.tradingview.com/support/solutions/43000744162-table-drawing-tool/) |

### 0.3 The right-click (context) menu on a drawing

Verbatim list from the Ghost feed article (it enumerates the standard menu): save as `template`, `Visual order`, `Visibility on interval`, `Object tree`, `Clone` and `Copy`, `Lock`, `Hide`, `remove`. Add to that: `Sync in layout` / `Sync globally` (sync article), `Reverse` (position tools), and `Intervals visibility` (blog wording for the same visibility submenu). Sources: [Ghost feed drawing tool](https://www.tradingview.com/support/solutions/43000748168-ghost-feed-drawing-tool/), [My drawings do not get synchronized](https://www.tradingview.com/support/solutions/43000629998-my-drawings-do-not-get-synchronized-across-charts-or-layouts/), [Faster setup of visibility on intervals](https://www.tradingview.com/blog/en/faster-setup-of-visibility-on-intervals-34613).

`Visual order` sub-items (Bring to front / Send to back / etc.): **could not verify** the exact labels; the article shows them only in a GIF. Source: [How can I change the visual order/layer](https://www.tradingview.com/support/solutions/43000474299-how-can-i-change-the-visual-order-layer-of-indicators-drawings-candles/).

### 0.4 The settings dialog — the tabs every drawing shares

Almost every per-tool article describes the same dialog shape. The tab names as the articles use them:

| Tab | What lives there | Notes |
|---|---|---|
| `Style` | Line colour/opacity/thickness/style, backgrounds, extend options, labels, stats checkboxes. | On lines, the stats set is `Price range`, `Percent change`, `Change in pips`, `Bars range`, `Date/time range`, `Distance`, `Angle`, plus `Always show stats` and a stats-position dropdown. |
| `Text` | Enable text, the text box, colour, font size, bold/italic, alignment along the line, `Text Wrap` on box tools. | Text can also be edited by clicking the text field directly on the chart. |
| `Coordinates` | `Price 1` / `Price 2` … each as a bar number plus a price (Trend angle uses an angle in degrees; Signpost uses `vertical position %`). | Numbering goes up to `Price 7` on Three drives. |
| `Visibility` | Which chart intervals show the drawing. Articles describe it as `intraday and daily timeframes`; the interval-group headings inside the tab (ticks/seconds/ranges etc.) **could not verify**. | See §11. |
| `Inputs` | Only on calculation tools: Regression trend, Ghost feed, Long/Short position (account, risk, lot), Volume profile tools. | |
| `Displacement` | Appears when several objects are selected: applies `addition, subtraction, multiplication, division` to all selected coordinates at once. | [How to move multiple drawing objects](https://www.tradingview.com/support/solutions/43000682552-how-to-move-multiple-drawing-objects-at-the-same-time/) |

Sources for the shared shape: [Trendline](https://www.tradingview.com/support/solutions/43000518095-trendline-drawing-tool/), [Ray](https://www.tradingview.com/support/solutions/43000518113-ray-drawing-tool/), [Extended line](https://www.tradingview.com/support/solutions/43000518131-extended-line-drawing-tool/), [Callout](https://www.tradingview.com/support/solutions/43000516978-callout-drawing-tool/), [Signpost](https://www.tradingview.com/support/solutions/43000791744-signpost-drawing-tool/), [Three drives](https://www.tradingview.com/support/solutions/43000570172-three-drives-pattern-drawing-tool/).

---

## 1. Cursors

Verbatim from the catalog article. Invoked from the top button of the left toolbar (hover/click opens the list). No per-cursor hotkeys documented.

| Cursor | TradingView's description (verbatim) | Extra |
|---|---|---|
| `Cross` | `The default cursor.` | |
| `Dot` | `Similar to the cross — choose whichever you like most.` | |
| `Arrow` | `The classic arrow without a crosshair.` | |
| `Demonstration` | `For enhancing your video ideas and live sessions.` | |
| `Magic` | `For adding some wizardly glamour to your analysis.` | |
| `Eraser` | `For fixing anything that isn't just how you want it to be.` | Click a drawing to delete it. With `Ctrl`/`⌘` held it erases a *part* — e.g. one Fib level: `Select the Eraser, hold Ctrl or ⌘, and then press on a Fib level you want to remove. You can also remove levels by holding Ctrl / ⌘ and mouse wheel click.` Library shortcut list: `Partially erase: Eraser + Ctrl`. |

Sources: [Drawing tools available on TradingView](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/), [How to remove specific Fibonacci Retracement levels?](https://www.tradingview.com/support/solutions/43000543443-how-to-remove-specific-fibonacci-retracement-levels/), [Advanced Charts: Keyboard shortcuts](https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/).

---

## 2. Trend line tools

Group 2 on the toolbar. The catalog article sub-groups them as **Lines**, **Channels**, **Pitchforks**.

### 2.1 Lines

| Tool | What it is | Invoke | Settings dialog (tabs → options) | Source |
|---|---|---|---|---|
| `Trendline` | Two-point line. | Toolbar; hotkey `Alt + T` (Mac `⌥ + T`); two clicks. `Shift` while drawing snaps to multiples of 45°. | **Style**: Line (colour, opacity, thickness, style; arrow ends `left`/`right`), `Middle point`, `Price labels`, Stats checkboxes `Price range`, `Percent change`, `Change in pips`, `Bars range`, `Date/time range`, `Distance`, `Angle` + position dropdown, `Always show stats`. **Text**: text on/off, colour, size, bold/italic, alignment. **Coordinates**: `Price 1`, `Price 2` (bar # + price). **Visibility**. Alert via clock icon. | [Trendline](https://www.tradingview.com/support/solutions/43000518095-trendline-drawing-tool/), [45° lines](https://www.tradingview.com/support/solutions/43000537268-how-to-draw-lines-at-a-45-angle/) |
| `Ray` | `The first point of a ray defines the origin, and the second point defines the direction`; extends indefinitely one way. | Toolbar; two clicks. | Same Style/Text/Coordinates/Visibility set as Trendline (Line with arrow ends, `Middle Point`, `Price Labels`, Stats + `Always Show Stats`). Alert via clock. | [Ray](https://www.tradingview.com/support/solutions/43000518113-ray-drawing-tool/) |
| `Info line` | A trendline that `automatically calculates and displays ... the absolute price change, percentage change, distance in bars and time, and the angle of the line`. | Toolbar; click, drag, click. | **Style**: Line (colour, opacity, thickness, solid/dashed/dotted, arrows), `Extend` left/right, `Stats` visibility, `Stats position`. **Text**: colour, opacity, size, bold/italic. **Coordinates**. **Visibility**. | [Info line](https://www.tradingview.com/support/solutions/43000791601-info-line-drawing-tool/) |
| `Extended line` | `extends indefinitely in any direction` (both ways). | Toolbar; two clicks. | Style: Line + arrow ends, `Middle point`, `Price labels`, Stats set + `Stats position` + always-show. Text. Coordinates. Visibility. Alert. | [Extended line](https://www.tradingview.com/support/solutions/43000518131-extended-line-drawing-tool/) |
| `Trend angle` | Line plus a label with `the angle in degrees relative to the horizontal axis`. | Toolbar; click, drag, click. | **Style**: Line; `Extend` (left / right / both / none); `Middle point`; `Price labels`; Info: `Stats` dropdown (price range / percent change / pips / bars range), `Stats position` (left / center / right / auto), `Always show stats`. **Coordinates**: first point (bar + price) and `the exact angle (in degrees)`. **Visibility**. | [Trend angle](https://www.tradingview.com/support/solutions/43000791602-trend-angle-drawing-tool/) |
| `Horizontal line` | Infinite horizontal level. | Toolbar; hotkey `Alt + H` (`⌥ + H`) at the hovered price; one click. | **Style**: Line; `Price label` (show value on the price axis). **Text**: text beside the line, colour, opacity, size, bold/italic, alignment dropdowns. **Coordinates**: price only. **Visibility**. Alert via clock. | [Horizontal line](https://www.tradingview.com/support/solutions/43000518124-horizontal-line-drawing-tool/) |
| `Horizontal ray` | Horizontal level that `only extends in one direction from left to right`. | Toolbar; one click. | Style: Line, Price label. Text. Coordinates: price + bar number. Visibility. Alert. | [Horizontal ray](https://www.tradingview.com/support/solutions/43000518121-horizontal-ray-drawing-tool/) |
| `Vertical line` | Infinite vertical line at a bar. | Toolbar; hotkey `Alt + V` (`⌥ + V`); one click. | Style: Line; `Extend` (`extends the vertical line through the Indicator panes`); `Time label`. Text (with orientation). Coordinates: bar number. Visibility. Alert. | [Vertical line](https://www.tradingview.com/support/solutions/43000518093-vertical-line-drawing-tool/) |
| `Crossline` | `two perpendicular lines and a reference point at the crossing`; shows price and date labels at the intersection. | Toolbar; hotkey `Alt + C` (`⌥ + C`); one click. | Style: colour, thickness, style, label toggles. Coordinates: price + bar. Visibility. | [Crossline](https://www.tradingview.com/support/solutions/43000477747-crossline-drawing-tool/) |

### 2.2 Channels

| Tool | What it is | Invoke | Settings dialog | Source |
|---|---|---|---|---|
| `Parallel channel` | Two parallel lines from three clicks (`first point`, `second point to define the channel's slope`, `third point` for the parallel). | Toolbar; three clicks. `Shift` snaps to 45°. | **Style**: channel levels (colour, opacity, thickness, style; extra levels with custom ratios), `Extend Left Line`, `Extend Right Line`, `Background` (fill + opacity). **Text** (position/alignment relative to the lines). **Coordinates**: `#1`, `#2`, `Price offset` (`level 1 in relation to level 0`). **Visibility**. Alert. | [Parallel channel](https://www.tradingview.com/support/solutions/43000518117-parallel-channel-drawing-tool/), [Text on channel tools](https://www.tradingview.com/support/solutions/43000710744-how-to-add-text-to-channel-drawing-tools/) |
| `Regression trend` | Linear-regression base line with `upper and lower bands which are set a user defined number of standard deviations away`. | Toolbar; two clicks. | **Inputs**: `Upper Deviation`, `Lower Deviation`, `Use Upper Deviation`, `Use Lower Deviation`, `Source`. **Style**: `Base`, `Up`, `Down` (line + fill each), `Extend Lines` (right), `Pearson's R`. **Coordinates**: bar numbers for point 1 and 2. **Visibility**. | [Regression trend](https://www.tradingview.com/support/solutions/43000518108-regression-trend-drawing-tool/) |
| `Flat top/bottom` | `a shape that is completely flat at the top or bottom` — one angled line plus one horizontal boundary. | Toolbar; click, drag, click for the trendline, third click for the flat boundary. | **Style**: Line (colour/opacity/thickness/style, start/end markers), `Extend` dropdown (left / right / both), `Prices` (price labels + font), `Background`. **Text**. **Visibility**. | [Flat top/bottom](https://www.tradingview.com/support/solutions/43000791603-flat-top-bottom-drawing-tool/) |
| `Disjoint channel` | Channel whose two lines are not parallel. | Toolbar; click, drag, click, third click for the second boundary. | **Style**: Line (+ endpoint markers), `Extend` (left / right / both / none), `Prices` (labels, background, font, bold/italic), `Background`. **Text**: `Text Box`, formatting, alignment. **Visibility**. | [Disjoint channel](https://www.tradingview.com/support/solutions/43000791604-disjoint-channel-drawing-tool/) |

### 2.3 Pitchforks

All four are one tool family; the Style tab has a `Style` dropdown that converts between them. Three clicks each (points 1–2 form the base trend, point 3 above/below point 2).

| Tool | Difference | Settings dialog | Source |
|---|---|---|---|
| `Pitchfork` (catalog calls it `Classic pitchfork`) | Median line from point 1 through the midpoint of 2–3. | **Style**: `Extend Lines` (right), `Median` (colour/thickness/style), additional lines (default 2 sets, up to 9, each with colour/thickness/style), `Use one color`, `Background` (+opacity), `Style` dropdown (original / Schiff / modified Schiff / inside). **Coordinates**: `Price 1..3`. **Visibility**. | [Pitchfork](https://www.tradingview.com/support/solutions/43000518141-pitchfork-drawing-tool/) |
| `Schiff pitchfork` | Origin `located at 1/2 the vertical distance and 1/2 the horizontal distance between the high and low points (first two points set)`. | Same dialog. | [Schiff pitchfork](https://www.tradingview.com/support/solutions/43000518140-schiff-pitchfork-drawing-tool/) |
| `Modified Schiff pitchfork` | Median `originates from a point that is exactly halfway between Point A and Point B`. | Same dialog; the article names `Levels` (custom or Fibonacci ratios). | [Modified Schiff pitchfork](https://www.tradingview.com/support/solutions/43000791609-modified-schiff-pitchfork-drawing-tool/) |
| `Inside pitchfork` | Origin also at the half-way point; article text is near-identical to Schiff's. | Same dialog. | [Inside pitchfork](https://www.tradingview.com/support/solutions/43000518146-inside-pitchfork-drawing-tool/) |

---

## 3. Gann and Fibonacci tools

Group 3 on the toolbar.

### 3.1 Fibonacci

| Tool | What it is / how to draw | Settings dialog | Source |
|---|---|---|---|
| `Fib retracement` (catalog: `Fibonacci retracement`) | Two-point tool; horizontal levels between the points. `24 customizable Fibonacci levels` (`values between 0-1 being internal retracements, values over 1 being external, and values below 0 being extensions`). Hotkey `Alt + F` (`⌥ + F`). | **Style**: `Trend Line` (visibility, colour, thickness, style), `Levels Line` (thickness, style), `Extend lines left`, `Extend lines right`, per-level checkboxes with value/colour/opacity, `Use One Color`, `Background` (+opacity), `Reverse`, `Prices` (show price beside level), levels as values or percents, label position, `Fib levels based on log scale`. **Coordinates**. **Visibility**. Alerts (cross a level / enter a channel). Individual levels can be erased with `Eraser + Ctrl`. | [Fibonacci retracement](https://www.tradingview.com/support/solutions/43000518158-fibonacci-retracement-drawing-tool/), [Extend fib lines](https://www.tradingview.com/support/solutions/43000542398-how-to-extend-fibonacci-retracement-lines/), [Remove fib levels](https://www.tradingview.com/support/solutions/43000543443-how-to-remove-specific-fibonacci-retracement-levels/) |
| `Trend-based fib extension` | Three points: start of move, end of move, end of retracement; extension levels projected from point 3. Article cites `0.618, 1.0, and 1.618` as the key targets. | **Style**: `Trend Line`, `Levels Line`, `Extend Lines Left/Right`, `Use one color`, `Reverse` (`reflects it vertically`), `Fib levels based on log scale`, custom text on level lines, label position. Coordinates. Visibility. | [Trend-based fib extension](https://www.tradingview.com/support/solutions/43000518137-trend-based-fib-extension-drawing-tool/) |
| `Fib channel` (catalog: `Fibonacci channel`) | Three clicks: two for the base trendline, third for the width of the `0`–`1` channel; parallel Fib lines follow. Defaults include `0, 0.382, 0.618, 1, and 1.618`. | Style: line thickness/style, extension direction (left / right / both / none), per-level visibility + colour, one colour, background + opacity, prices toggle, values vs percents, label position (horizontal + vertical), font size. Coordinates. Visibility. | [Fibonacci channel](https://www.tradingview.com/support/solutions/43000791610-fibonacci-channel-drawing-tool/) |
| `Fib time zone` | Draw a base trend line; vertical lines placed at Fibonacci-sequence multiples of its length (`0, 1, 1, 2, 3, 5, 8, 13, 21...`). | Style: initial line (visibility/colour/thickness/style), `Use one color`, background + opacity, labels. Coordinates (two points). Visibility. | [Fib time zone](https://www.tradingview.com/support/solutions/43000518155-fib-time-zone-drawing-tool/) |
| `Trend-based fib time` | Three points; `vertical lines appear based on the Fibonacci sequence` scaled to the trend. Default levels not stated. | Style: trend line, per-level visibility/colour/opacity, one colour, background, labels + position. Coordinates (three points). Visibility. | [Trend-based fib time](https://www.tradingview.com/support/solutions/43000518136-trend-based-fib-time-drawing-tool/) |
| `Fib speed resistance fan` | Two points; fan lines above (time) and below (price) at percentage splits of the move (`one-third and two-thirds` cited as common). | Style: `Price levels` / `Time levels` checkboxes with colour+opacity and custom values, `Labels` (left/right/top/bottom), `Grid` (visibility, colour, thickness, style), `Background`, `Reverse`. Coordinates `Price 1/2`. Visibility. | [Fib speed resistance fan](https://www.tradingview.com/support/solutions/43000518156-fib-speed-resistance-fan-drawing-tool/) |
| `Fib speed resistance arcs` | Trend line high→low; arcs cross it at Fibonacci percentages; `up to 11` levels. | Style: `Trend Line`, additional levels (colour/opacity/thickness), `Background`, `Levels` labels (left/right/top/bottom), `Full Circles` (`appends another arc to the existing one, so you can get a full circle`). Coordinates. Visibility. | [Fib speed resistance arcs](https://www.tradingview.com/support/solutions/43000518157-fib-speed-resistance-arcs-drawing-tool/) |
| `Fib circles` | Trend line between two extremes; circles at `11 different levels` on key ratios. `Shift` while drawing gives a 45° base and round circles. | Style: `Trend Line`, per-circle visibility/colour/opacity/thickness/value, `Use One Color`, `Levels` labels, `Coeffs As Percents`, `Background`. Coordinates. Visibility. Article notes settings can be `save[d] ... as templates`. | [Fib circles](https://www.tradingview.com/support/solutions/43000518159-fib-circles-drawing-tool/) |
| `Fib spiral` (catalog: `Fibonacci spiral`) | Click centre, drag radius/orientation, click. | Style: line (colour/opacity/thickness/style), `Counterclockwise` checkbox. Coordinates `Price 1` (centre) / `Price 2`. Visibility. | [Fibonacci spiral](https://www.tradingview.com/support/solutions/43000791611-fibonacci-spiral-drawing-tool/) |
| `Fib wedge` | `a set of arcs spreading out of the point of a trend's beginning`, two points. | Style: trend lines (visibility/colour/opacity/thickness), additional levels + custom ratios, one colour, background + opacity, level labels. Visibility. | [Fib wedge](https://www.tradingview.com/support/solutions/43000518153-fib-wedge-drawing-tool/) |
| `Pitchfan` | Three points (trend start, trend end, first correction extreme); fan rays at Fibonacci coefficients. Listed under Fibonacci in the catalog. | Style: `Median`, additional levels, `Use one color`, `Background`. Coordinates (3). Visibility. | [Pitchfan](https://www.tradingview.com/support/solutions/43000518143-pitchfan-drawing-tool/) |

### 3.2 Gann

| Tool | What it is / how to draw | Settings dialog | Source |
|---|---|---|---|
| `Gann box` | Two points defining a price × time box; user-set `price and time levels`. Needs a scale where `a unit of price would correspond a unit of time`. | Style: `Price Levels` / `Time Levels` (visibility, colour, opacity, custom values), `Labels` (left/right/top/bottom), `Backgrounds` (+opacity), `Use one color`, `Angles` (corner rays), `Reverse` (`rotates the drawing around main points (reflects it diagonally)`). Coordinates `Price 1/2`. Visibility. Library shortcut list: `Gann box fixed increments: Hold Shift`. | [Gann box](https://www.tradingview.com/support/solutions/43000518152-gann-box-drawing-tool/), [Shortcuts](https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/) |
| `Gann square` | Two points; square with fans and arcs. `Shift`-drag an anchor preserves the price/bar ratio. | Style: `Reverse`, `Fans`, `Arcs`, `Price/Time Levels` (corner metrics), `Price/Bar Ratio`. Coordinates. Visibility. | [Gann square](https://www.tradingview.com/support/solutions/43000518149-gann-square-drawing-tool/) |
| `Gann square fixed` | Square grid (`Levels`) + `Fans` + `Arcs` anchored to a pivot. What "fixed" changes vs `Gann square`: **could not verify** (article does not compare). | Style: `Levels` (0–5 with colour/thickness), `Fans`, `Arcs`, `Use one color`, `Background`, `Reverse`. Coordinates (2). Visibility. | [Gann square fixed](https://www.tradingview.com/support/solutions/43000791675-gann-square-fixed-drawing-tool/) |
| `Gann fan` | Nine angles from a pivot: `1x1` (45°), `2x1`, `3x1`, `4x1`, `8x1`, `16x1` and their inverses. | Style: per-angle visibility/colour/opacity/thickness/style, `Use one color`, `Background`, `Labels`. Coordinates (2). Visibility. | [Gann fan](https://www.tradingview.com/support/solutions/43000518151-gann-fan-drawing-tool/) |

---

## 4. Patterns

Group 4. Catalog sub-groups: harmonic/classic patterns, `Elliott waves patterns`, and **Cycles**.

| Tool | Points | What it shows | Settings dialog | Source |
|---|---|---|---|---|
| `XABCD pattern` | 5 (`X, A, B, C, D`) | Draws the four legs and the Fibonacci ratios between them; article lists Gartley / Butterfly / Crab / Bat ratios. | `Label` (text colour, font, size, bold, italic), `Border` (colour, thickness), `Background` (fill + opacity), Coordinates (5), Visibility. | [XABCD pattern](https://www.tradingview.com/support/solutions/43000569909-xabcd-pattern-drawing-tool/) |
| `Cypher pattern` | 5 | `automatically draws the connecting borders, shades the interior, and displays the calculated Fibonacci ratios`; B = 0.382–0.618 of XA, C = 1.13–1.414 ext of XA, D = 0.786 of XC. | Label, Border (colour/thickness/style), Background. Coordinates (5). Visibility. | [Cypher harmonic pattern](https://www.tradingview.com/support/solutions/43000791680-cypher-harmonic-pattern-drawing-tool/) |
| `ABCD pattern` | 4 | Legs AB, BC, CD with ratio labels; article names `AB=CD`, `Classic ABCD`, `ABCD extension`. | Label (colour, opacity, size, bold, italic), Border. Coordinates `Price 1–4`. Visibility. | [ABCD pattern](https://www.tradingview.com/support/solutions/43000570202-abcd-pattern-drawing-tool/) |
| `Triangle pattern` | 4 (A, B, C, D alternating highs/lows) | Symmetrical / ascending / descending triangle. | Label, Border, Background, Coordinates (4), Visibility. | [Triangle pattern](https://www.tradingview.com/support/solutions/43000570208-triangle-pattern-drawing-tool/) |
| `Three drives pattern` | 7 | Three drives with two retracements; ratio labels. | Label, Border, Coordinates `Price 1–7`, Visibility. | [Three drives pattern](https://www.tradingview.com/support/solutions/43000570172-three-drives-pattern-drawing-tool/) |
| `Head and shoulders` | 7 (left shoulder, valley, head, valley, right shoulder, neckline …) | Labelled H&S formation. Dialog options: **could not verify** (article is educational; no settings text). | — | [Head and shoulders](https://www.tradingview.com/support/solutions/43000570149-head-and-shoulders-drawing-tool/) |
| Elliott waves — library names `Elliot impulse wave (12345)`, `Elliot correction wave (ABC)`, `Elliot triangle wave (ABCDE)`, `Elliot double combo wave (WXY)`, `Elliot triple combo wave (WXYXZ)` (the library spells it "Elliot"; the Help Center says `Elliott waves patterns`) | 5 / 3 / 5 / 3 / 5 | Multi-point wave labels. Settings dialog (wave degree selector, label style): **could not verify** — there is no Help Center article for the Elliott tools and the overrides doc page 404'd. | — | [Advanced Charts: Drawings list](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/Drawings-List/), [Catalog](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/) |
| `Cyclic lines` (Cycles) | 2 vertical lines | `repeating vertical lines will appear equidistant apart and will appear indefinitely into the future`. | Style: `Lines` (colour, opacity, thickness, style). Coordinates (2 points, price + bar). Visibility. Templates can be saved. | [Cyclic lines](https://www.tradingview.com/support/solutions/43000518161-cyclic-lines-drawing-tool/) |
| `Time cycles` (Cycles) | 2 | Vertical lines projecting the interval forward, with alternating shaded fills. | Style: `Line`, `Background` (alternating fill, colour, opacity). Coordinates `Price 1/2`. Visibility. | [Time cycles](https://www.tradingview.com/support/solutions/43000791682-time-cycles-drawing-tool/) |
| `Sine line` (Cycles) | 2 | Sine wave; second point sets `amplitude and frequency`. | Style: line colour/opacity/thickness/style. Coordinates `Price 1/2`. Visibility. | [Sine line](https://www.tradingview.com/support/solutions/43000791685-sine-line-drawing-tool/) |

---

## 5. Forecasting and measurement tools

Group 5. Catalog sub-groups: **Forecasting**, **Volume-based**, **Measurers**. (The library's own list also names `Date range`, `Price range`, `Date and price range`, `Bars pattern`, `Ghost feed`, `Sector`, `Fixed range volume profile`, `Long position`, `Short position`, `Position forecast`.)

### 5.1 Position tools

| Tool | What it is | Invoke | Settings dialog | On-chart readout | Source |
|---|---|---|---|---|---|
| `Long position` | Entry line with a green profit zone above and a red loss zone below; drag the zone edges to set target and stop. | Toolbar; one click at the entry, then drag handles. `Reverse` in the context menu / floating panel flips it to a short. | **Inputs**: `Account Size` (`total account balance used for risk and position size calculations`), `Lot Size` (`minimal amount of traded instruments`), `Risk` (absolute or `% of your account size`), `Entry Price`, `Leverage` (`affects margin requirements`), `Profit Level` and `Stop Level` each as `Ticks` (auto-converted from tick size) or `Price`; quantity precision. **Style**: Lines (colour, thickness), `Stop Color`, `Target Color`, Text (colour, size), `Price labels`, `Stats` (which data shows), `Compact stats mode` (`Shortens the position performance tags`), `Always show stats`. **Coordinates**. **Visibility**. | Target and stop `in price, percentage, and ticks`, profit and loss amounts, `Qty`, risk/reward ratio, PnL, and account balance at target / at stop. | [Long position](https://www.tradingview.com/support/solutions/43000517002-long-position-drawing-tool/), [How to use long and short position tools](https://www.tradingview.com/support/solutions/43000475660-how-to-use-long-and-short-position-drawing-tools/), [Reverse a position](https://www.tradingview.com/support/solutions/43000744866-how-to-reverse-a-position-drawn-on-a-chart-with-the-long-or-short-position-tool/) |
| `Short position` | Mirror of Long: `set an entry point and assume a short position from that point`. | Same. | Same inputs/style/visibility. No differences documented. | Same. | [Short position](https://www.tradingview.com/support/solutions/43000516992-short-position-drawing-tool/) |
| `Position forecast` | `place an entry and an exit price for a trade` and set duration by extending the line; the tool then marks the outcome as success or failure as price develops. | Toolbar; two points. | **Style**: line (colour/opacity/thickness), Source/Target text + background colours, Source/Target borders, Success/Failure result-box text + backgrounds, transparency. **Coordinates**: `Price 1` (source), `Price 2` (target). **Visibility**. | Source and target boxes; success/failure box. | [Position forecast](https://www.tradingview.com/support/solutions/43000517004-position-forecast-drawing-tool/) |

### 5.2 Other forecasting

| Tool | What it is | Settings dialog | Source |
|---|---|---|---|
| `Bars pattern` (article title: "Bar pattern") | `copies your price bars, creates a drawing out of them and lets you drag it around the chart`. | Style: `Color` (+transparency), `Mirrored`, `Flipped`, `Mode` = `Bars`, `Line`, `OpenClose`, `LineOpen`, `LineHigh`, `LineLow`, `LineHL2`. Visibility. | [Bar pattern](https://www.tradingview.com/support/solutions/43000517006-bar-pattern-drawing-tool/) |
| `Ghost feed` | `helps you extrapolate recent price actions` by drawing hypothetical candles from a click point in the chosen direction. | **Inputs**: `Avg HL in minticks`, `Variance` (ticks). **Style**: body, edge, wick colours; transparency. **Coordinates**: price; bar position (`300` = current bar). **Visibility**. | [Ghost feed](https://www.tradingview.com/support/solutions/43000748168-ghost-feed-drawing-tool/) |
| `Sector` | Three points: origin, a point `moving horizontally to the right ... in the future`, and `an estimated price` — a wedge-shaped projection. | Style: `Background` (fill, transparency), `Border` (colour, thickness). Visibility. | [Sector](https://www.tradingview.com/support/solutions/43000516995-sector-drawing-tool/) |

### 5.3 Volume-based

| Tool | What it is | Settings dialog | Gating | Source |
|---|---|---|---|---|
| `Anchored VWAP` | One click sets the anchor; plots `the volume-weighted average price ... starting from a user-selected point`. | Double-click the line: `Color`, `Thickness`. Bands/source options: **could not verify** from the article. | Not stated in the article. | [Anchored VWAP](https://www.tradingview.com/support/solutions/43000669764-anchored-vwap-drawing-tool/) |
| `Fixed range volume profile` | Two clicks (start bar, end bar); volume histogram by price for that range. | `Rows Layout` / `Row Size`: `Number of Rows` or `Ticks Per Row`; `Volume`: `total` / `up/down` / `delta`; `Value Area Volume` (%); `Extend Right`. Coordinates `#1 (bar)`, `#2 (bar)`. | Pricing page lists a `Volume Profile indicators` row as paid-only; whether that row governs the *drawing* variants: **could not verify**. | [Fixed range volume profile](https://www.tradingview.com/support/solutions/43000707985-fixed-range-volume-profile-drawing-tool/) |
| `Anchored volume profile` | One click; profile `from the manually selected starting point to the end of the available bars`. | Same `Rows Layout`/`Row Size`, `Volume`, `Value Area Volume`; Coordinates `#1 (bar)`. | As above. | [Anchored volume profile](https://www.tradingview.com/support/solutions/43000707989-anchored-volume-profile-drawing-tool/) |

### 5.4 Measurers

| Tool | How to draw | Readout | Settings dialog | Source |
|---|---|---|---|---|
| `Price range` | Two points placed vertically. | `absolute value, percentage change, and pips (ticks)`. | Style: line (colour, thickness, opacity), `Border`, `Background`, extend checkboxes (vertical/horizontal), Info stats checklist (price range, %, pips, bars, elapsed time, `volume`), label text + background. **Text** tab (`Enter text and click OK`). Coordinates. Visibility. | [Date and price range tools](https://www.tradingview.com/support/solutions/43000516996-date-and-price-range-drawing-tools/), [Text on range tools](https://www.tradingview.com/support/solutions/43000692906-how-to-add-text-to-range-tools/) |
| `Date range` | Two points placed horizontally. | Number of bars, elapsed time, optional accumulated volume. | Same. | Same |
| `Date and price range` | Two points diagonally. | Both of the above in one label. | Same. | Same |

---

## 6. Geometric shapes

Group 6. The catalog also lists `Arrow`, `Arrow marker`, `Arrow marks` here (the library lists the arrow *marks* under Annotation).

| Tool | How to draw | Settings dialog | Source |
|---|---|---|---|
| `Rectangle` | Click-drag (two points). `Shift` = perfect square. Library hotkey `Alt + Shift + R`. | **Style**: `Border` (colour, thickness, line type), `Middle Line` (on/off + colour/thickness/type), `Background` (visibility, colour, opacity), `Extend Right`, `Extend Left`. **Text** (colour, size, font style, location; editable in the centre of the shape). **Coordinates**. **Visibility**. Alert via clock. | [Rectangle](https://www.tradingview.com/support/solutions/43000516984-rectangle-drawing-tool/), [Shortcuts](https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/) |
| `Rotated rectangle` | Three clicks: first corner; drag for `length and angle of the first edge`, click; drag perpendicular for width, click. | Style: `Border` (colour, thickness, solid/dashed/dotted), `Background` (+colour picker/opacity). Visibility. | [Rotated rectangle](https://www.tradingview.com/support/solutions/43000791738-rotated-rectangle-drawing-tool/) |
| `Path` | Click successive anchor points; finish with double-click or `Esc`. | Line settings/arrow ends: **could not verify** (article covers usage only). | [Path](https://www.tradingview.com/support/solutions/43000791739-path-drawing-tool/) |
| `Circle` | Click centre, move, click to fix the radius. Keeps its shape when the scale changes (article recommends the lock price-to-bar-ratio scale option if that matters). | Border (colour, thickness, transparency), Background (colour, transparency, can be off), **Text** tab, Visibility. | [Circle](https://www.tradingview.com/support/solutions/43000662172-circle-drawing-tool/), [Text in circle/ellipse](https://www.tradingview.com/support/solutions/43000672263-how-do-you-add-text-to-a-circle-or-ellipse/) |
| `Ellipse` | Drag; `Shift` = circle. | Style: `Border` (colour, thickness), `Background` (visibility, colour, opacity). Text tab. Visibility. | [Ellipse](https://www.tradingview.com/support/solutions/43000516988-ellipse-drawing-tool/) |
| `Polyline` | Click points; `once the last point is connected with the first point of the figure, the shape will be completed`; or double-click / right-click / `Esc` to leave it open. | Style: `Border` (colour, thickness), `Background` (visibility, colour, opacity). Visibility. | [Polyline](https://www.tradingview.com/support/solutions/43000516986-polyline-drawing-tool/) |
| `Triangle` | Three points. | Border (colour, thickness), Background (visibility, colour, opacity), Coordinates (3), Visibility. | [Triangle](https://www.tradingview.com/support/solutions/43000516814-triangle-drawing-tool/) |
| `Arc` | Article does not state the click count (cup-and-handle example). | `Border` (colour, thickness), `Background` (visibility, colour, opacity). Visibility. | [Arc](https://www.tradingview.com/support/solutions/43000516989-arc-drawing-tool/) |
| `Curve` / `Double curve` | Click start, drag, click end; then `click and pull the curves themselves` to bend. | Style: `Line` (colour, opacity, thickness, solid/dashed/dotted; endpoint markers), `Extend` (left / right / both), `Background` (+colour/opacity). Coordinates. Visibility. | [Curve and double curve](https://www.tradingview.com/support/solutions/43000791740-curve-and-double-curve-drawing-tools/) |
| `Brush` | Freehand. | Style: `Line` (colour, thickness), `Background` (visibility, colour, opacity). Visibility. | [Brush](https://www.tradingview.com/support/solutions/43000516987-brush-drawing-tool/) |
| `Highlighter` | Click-hold, drag, release; `strokes are translucent`. | Settings not described in the article. | [Highlighter](https://www.tradingview.com/support/solutions/43000791735-highlighter-drawing-tool/) |
| `Arrow` | Click-drag; a trendline with an arrowhead. | Style: `Line` (colour, opacity, thickness, style; arrow/normal ends), Stats (`Price range`, `Percent change`, `Change in pips`, `Bars range`, `Date/time range`, `Distance`, `Angle`, `Always show stats`), Text, Coordinates, Visibility, alert. | [Arrow](https://www.tradingview.com/support/solutions/43000518134-arrow-drawing-tool/) |
| `Arrow marker` | Click start, drag, click end; arrowhead at the second point; `text signature` attachable. | Not detailed in the article. | [Arrow marker](https://www.tradingview.com/support/solutions/43000791736-arrow-marker-drawing-tool/) |
| `Arrow marks` (`Arrow mark up`, `Arrow mark down`; library also lists `Arrow mark left`, `Arrow mark right`) | One click. `Green ... for the arrow mark up and red ... for the arrow mark down by default`; `The size of the arrow marks is fixed and cannot be changed`. | Style: colour. Text (colour, opacity, size, bold/italic). Coordinates (price + bar). Visibility. | [Arrow marks](https://www.tradingview.com/support/solutions/43000518087-arrow-marks-drawing-tools/) |
| `Flag mark` | One click; blue by default, fixed size. | Style: colour. Coordinates. Visibility. | [Flag mark](https://www.tradingview.com/support/solutions/43000518085-flag-mark-drawing-tool/) |

---

## 7. Annotation tools

Group 7. Catalog list: `Text, Note, Price note, Pin, Table, Callout, Comment, Price label, Signpost, Image, X posts and ideas, Icons`.

| Tool | What it is | Settings dialog | Source |
|---|---|---|---|
| `Text` | Text box attached to a chart point; `moves along with the chart as the user scrolls`. The article contrasts it with an `anchored text box` that stays put on screen (the library lists `Anchored note`; a separate Help Center article for the anchored variant **could not verify**). | **Text**: General (colour, size, bold, italic), `Text Box`, `Background` (visibility, colour, opacity), `Border` (visibility, colour), `Text Wrap`. **Visibility**. | [Text](https://in.tradingview.com/support/solutions/43000516983-text-drawing-tool/) |
| `Note` | `place a comment directly on the chart with a link to the selected price level`; found in `the annotation tools section on the left panel`. | Colour and text style, via double-click or the floating-panel `Settings` button. | [Note](https://www.tradingview.com/support/solutions/43000737571-note-drawing-tool/) |
| `Price note` | `a text box containing the exact price value of the selected point, connected to that point by a line`. Click the price, drag the label, click. | Label (text colour, size, bold/italic, background colour/opacity, border colour/opacity), Connector (line colour/opacity), custom text, Coordinates, Visibility. | [Price note](https://www.tradingview.com/support/solutions/43000791741-price-note-drawing-tool/) |
| `Pin` | Small icon storing a note that is `hidden by default, but instantly becomes visible whenever you click on the pin icon`. | Style (pin colour). Text (formatting, note field, background toggle + colour/opacity, border toggle). Coordinates. Visibility. | [Pin](https://www.tradingview.com/support/solutions/43000791743-pin-drawing-tool/) |
| `Table` | Resizable grid; type into cells; rows/columns added `using the floating toolbar or the context menu` (new column to the right, new row below the selected cell); can be `anchored to a specific point on the screen`. | **Style**: background colour/opacity, border colour, font colour/size, cell text alignment. **Visibility**. | [Table](https://www.tradingview.com/support/solutions/43000744162-table-drawing-tool/) |
| `Callout` | `similar to a comment` but the text container can be dragged away from the anchor; two points. | **Text**: General Options (colour, size, bold/italic), Text Box, Background (colour, opacity), Border (colour, opacity, thickness, style), `Text Wrap`. **Coordinates**: `Price 1` (anchor), `Price 2` (container). **Visibility**. | [Callout](https://www.tradingview.com/support/solutions/43000516978-callout-drawing-tool/) |
| `Comment` | Text bubble with a pointer: `a smaller, more targeted notation than a text box`. | Text: General Options (colour, size), text box, Background (colour, opacity), `Border Color`. Coordinates. Visibility. | [Comment](https://www.tradingview.com/support/solutions/43000516981-comment-drawing-tool/) |
| `Price label` | Bubble with pointer that `always contains price inside`. | Text (colour, size, opacity), background (colour, opacity), border (colour, opacity). Coordinates. Visibility. | [Price label](https://www.tradingview.com/support/solutions/43000518083-price-label-drawing-tool/) |
| `Signpost` | Anchor + vertical stem + label; `can only be extended strictly vertically`. | **Style**: `Emoji pin` checkbox (+ emoji picker, background colour). **Text**: size, bold/italic, text box. **Coordinates**: `Price 1` as `vertical position %` + bar. **Visibility**. | [Signpost](https://www.tradingview.com/support/solutions/43000791744-signpost-drawing-tool/) |
| `Image` | `JPG and PNG`, `must not exceed 2mb`, max 2000×2000 px; drag onto the chart or `Ctrl+V`; resize by corner handles. | Interval visibility, rename, transparency, replace image via the preview. `some limitations apply` on allowed pictures (link to policy; plan gating not stated). | [How to insert images on the chart](https://www.tradingview.com/support/solutions/43000632957-how-to-insert-images-on-the-chart/) |
| `X posts and ideas` | Paste a link to an X post or a TradingView idea; `placed on the timeline according to the exact time it was posted`; drag the container. | None beyond the link. | [How to paste X posts or ideas](https://www.tradingview.com/support/solutions/43000662394-how-to-paste-x-posts-or-ideas-onto-the-chart/) |
| `Icons` (with an `emojis tab` at the bottom of its menu; the library labels the group `Icons, Stickers, and Emojis`) | Place an icon/emoji at a point. Emojis also work `in any drawing tool with a Text settings field`. | Not detailed. | [How to chart with emojis](https://www.tradingview.com/support/solutions/43000662396-how-to-chart-with-emojis/), [Drawings list](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/Drawings-List/) |

---

## 8. Chart-management utilities at the bottom of the toolbar

Verbatim descriptions from the catalog article and the Supercharts guide.

| Button | Catalog wording | Supercharts-guide wording | Detail | Source |
|---|---|---|---|---|
| `Measure` | `you can measure the distance between bars in either direction and see the price changes.` | `Gauge the distance between bars.` | Quick form: `click on the start point and then on the end point while holding the Shift key`. Library list: `Measure tool: Hold Shift + Click`. Readout contents and how it dismisses: **could not verify** in text (GIF only). | [Measure Tool quickly](https://www.tradingview.com/support/solutions/43000537228-how-to-use-measure-tool-quickly/), [Shortcuts](https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/) |
| `Zoom in` | `magnify a particular area of the chart to scrutinize a specific section.` | `See closer the selected area.` | Drag a box; chart zooms to it. | [Catalog](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/), [Supercharts](https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/) |
| `Magnets` (`Weak magnet` / `Strong magnet`) | `Make the drawings "stick" to the nearest price point.` | `Stick drawings to the nearest open, high, low, or close prices.` | `Strong Magnet ... pulls the drawing points to chart values (bars), regardless of the distance`; `Weak Magnet ... pulls the drawing points to chart values (bars) when you are drawing near them.` Button on the left toolbar; `the icon should turn blue when enabled`. Temporary invert: `Hold CTRL/Command and start drawing an element` (library: `Toggle magnet mode: Ctrl + Move point`). Since 2025-03-11 the magnet menu has `Snap to indicators`. | [Drawing points don't snap](https://www.tradingview.com/support/solutions/43000472715-drawing-points-don-t-snap-to-ohlc-values-correctly/), [Magnet Mode](https://www.tradingview.com/support/solutions/43000722509-magnet-mode/), [Magnet snaps to indicators](https://www.tradingview.com/blog/en/magnet-snaps-to-indicators-instantly-50979) |
| `Keep drawing` (library label: `Stay in drawing mode`) | `Choose this if you need to add multiple objects to the chart successively.` | `Add multiple objects to the chart consecutively.` | Toggle; while on, the selected tool stays active after each drawing. Which label the live site shows today: both wordings are TradingView's; **could not verify** which is current. | [Catalog](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/), [Drawings list](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/Drawings-List/) |
| `Lock all drawings` | `This option prevents accidental movement of drawings.` | `Prevent their accidental movement.` | Toggle. Per-drawing `Lock` is in the context menu. Hotkey: **could not verify**. | Same + [Ghost feed](https://www.tradingview.com/support/solutions/43000748168-ghost-feed-drawing-tool/) |
| `Hide options` | `Sometimes it's easy to overdo it with drawings and indicators and get lost in all of them.` | `Hide drawings, indicators, positions and orders, or all of them.` | A submenu; the four choices are those named in the guide. Exact item labels: **could not verify**. Hotkey `Ctrl + Alt + H` = `Hide all drawings` (library list). Restoring: `Object Tree and Data Window` button on the right toolbar. | [Supercharts](https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/), [Restore hidden drawings](https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/), [Shortcuts](https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/) |
| `Sync drawings options` | `you can make them appear on other layouts.` | `Mirror the drawings from the initial layout to additional layouts.` | Globe icon, `always available on the left toolbar, even if you have only one chart open`. See §12. | [Drawings synchronization across layouts](https://www.tradingview.com/blog/en/drawings-synchronization-across-layouts-39890) |
| `Remove options` | `you can delete drawings, indicators, or both.` | `Delete drawings, indicators, or both.` | Library labels it `Remove X Drawings` (X = count). | [Drawings list](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/Drawings-List/) |

---

## 9. Object tree (and Data window)

| Fact | Detail | Source |
|---|---|---|
| Where | Right toolbar button `Object tree and data window` (`Manage drawings or indicators that you've applied to the chart.`); TradingView's own idea says `click the Object Tree icon at the bottom right of your chart`. In the embeddable library it is on the left toolbar (Advanced Charts) or right toolbar (Trading Platform); featureset `show_object_tree`. | [Supercharts](https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/), [Object Tree idea](https://www.tradingview.com/chart/USDJPY/9VHrCCy9-How-to-create-beautiful-charts-with-the-Object-Tree), [Library: Object tree](https://www.tradingview.com/charting-library-docs/latest/ui_elements/object-tree) |
| What it lists | `drawings, indicators, and symbols` on the chart, with per-row `hide, show, or remove`. | [Restore hidden drawings](https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/) |
| Groups | `select the drawings you want in a group with Ctrl or Shift and then click Create group`; `Name your groups and put them in the order you need`; `Turn on and off the visibility of different groups`. | [Manage Your Charts with the Updated Object Tree](https://www.tradingview.com/blog/en/new-object-tree-15090) |
| Z-order | `Quickly move one or several drawings along a Z-order` (drag in the tree); `Visual order can also be set in the Object Tree window`. | Same + [Visual order](https://www.tradingview.com/support/solutions/43000474299-how-can-i-change-the-visual-order-layer-of-indicators-drawings-candles/) |
| Bulk edit | `Delete drawings in bulk by selecting several drawings using Ctrl or Shift`; select several objects or a group → drop-down → `Settings`; group colour via floating toolbar; `Visibility on intervals` on a multi-selection. | [Blog](https://www.tradingview.com/blog/en/new-object-tree-15090), [Visibility for several objects](https://www.tradingview.com/support/solutions/43000660419-i-want-to-customize-the-visibility-for-several-objects/), [Colour of multiple tools](https://www.tradingview.com/support/solutions/43000677803-how-to-change-the-color-of-multiple-tools-at-once/) |
| Data window tab | The button name pairs `Object tree` with `data window`; the Data Window's contents belong to another surface. Per-row icons (eye/lock) and exact tab labels: **could not verify** (GIF only). | — |

---

## 10. Drawing templates

| Fact | Detail | Source |
|---|---|---|
| Definition | `a set of properties of a particular drawing. This can include the drawing's line style, text alignment, and more.` | [Library: Saving and loading](https://www.tradingview.com/charting-library-docs/latest/saving_loading/) |
| Where | `the Templates button on the floating drawing toolbar`; also the drawing's context menu (`Save the drawings as a template for later use`). | Same; [Ghost feed](https://www.tradingview.com/support/solutions/43000748168-ghost-feed-drawing-tool/) |
| Apply to many at once | `select tools of the same type, such as arrows`, then pick the template from the floating toolbar's template button or `select the template to be applied in the open context menu`. | [Apply a template to several tools](https://www.tradingview.com/support/solutions/43000677801-how-to-apply-a-template-to-several-tools-of-the-same-type-at-once/) |
| Per-tool evidence | Fib circles: `save those changes as templates`; Cyclic lines, Trend-based fib time: same phrasing. | [Fib circles](https://www.tradingview.com/support/solutions/43000518159-fib-circles-drawing-tool/) |
| Menu wording (`Save As…`, `Apply Defaults`, `Save As Default`) | **Could not verify** — no Help Center article names the items; the library only names the `Templates` button. | — |
| Gating | Free to all on tradingview.com as far as the Help Center shows; in the embeddable product it is `Available in Trading Platform only` (featureset `drawing_templates`). | [Library: Saving and loading](https://www.tradingview.com/charting-library-docs/latest/saving_loading/) |

---

## 11. Visibility per interval

| Fact | Detail | Source |
|---|---|---|
| Per-drawing | `Open the drawing object settings, select Visibility tab and enable intervals where the drawing will be displayed.` | [How to set drawing visibility on different intervals](https://www.tradingview.com/support/solutions/43000484410-how-to-set-drawing-visibility-on-different-intervals/) |
| Quick path | Right-click the drawing (or the three dots on the floating toolbar / indicator legend) → `Intervals visibility` → one of the `quick interval visibility options`, which `set the appropriate settings in the Visibility tab`. | [Quickly adjust visibility](https://www.tradingview.com/support/solutions/43000686263-how-to-quickly-adjust-visibility-of-a-drawing-or-indicator/), [Blog](https://www.tradingview.com/blog/en/faster-setup-of-visibility-on-intervals-34613) |
| Many at once | Select several objects on the chart or in the Object tree → drop-down → `Visibility on intervals` (`in relation to the current interval`). | [Visibility for several objects](https://www.tradingview.com/support/solutions/43000660419-i-want-to-customize-the-visibility-for-several-objects/) |
| The quick option labels | Names such as "Current interval and above/below/only": **could not verify** — every source says "quick options" without listing them. | — |
| Interval groups inside the tab | Articles say the tab covers `intraday and daily timeframes`. Whether ticks / seconds / ranges rows exist on the live site: **could not verify** (the library override page 404'd). | [Fib circles](https://www.tradingview.com/support/solutions/43000518159-fib-circles-drawing-tool/) |
| Behaviour | A drawing hidden on the current interval is still stored and reappears on intervals where it is enabled (Ghost feed article: `Drawings persist when changing timeframes`). | [Ghost feed](https://www.tradingview.com/support/solutions/43000748168-ghost-feed-drawing-tool/) |

---

## 12. Sync drawings across charts and layouts

| Mode | Meaning (verbatim where possible) | Source |
|---|---|---|
| Disabled (default) | `drawing objects will be saved only on a specific chart of a particular layout`. `Disabling synchronization on a drawing object removes it from other charts.` | [Layouts, charts, drawings, indicators](https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/) |
| `Sync in layout` | Drawings on the current symbol appear on every chart of the same symbol in the active layout. | [My drawings do not get synchronized](https://www.tradingview.com/support/solutions/43000629998-my-drawings-do-not-get-synchronized-across-charts-or-layouts/) |
| `Sync globally` | `Drawing objects will be synchronized across all charts and layouts`, including new ones. `Switching the global synchronization mode on a drawing object will remove it from all other layouts.` | Same |
| Where to set | (a) the globe button on the left toolbar sets the mode for *new* drawings; (b) each drawing's context menu has `Sync in layout` / `Sync globally`; groups sync like objects. | [Blog](https://www.tradingview.com/blog/en/drawings-synchronization-across-layouts-39890) |
| Requirements | Same symbol only. `Objects are globally synchronized between different windows/tabs/devices in real-time only when the layouts autosave is enabled.` Without autosave it syncs after a manual save. Global sync is for `users with paid plans`. | Same + [Layouts article](https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/) |
| Undo caveat | `If you delete drawing objects on a symbol not currently open on the chart, the 'undo' command will not restore the drawing objects.` | [Layouts article](https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/) |

---

## 13. Selecting, moving, cloning — and the hotkey table

### 13.1 Interaction rules

| Action | How | Source |
|---|---|---|
| Multi-select | `hold Ctrl/Command key and click on the drawing or choose required area on the chart` (Ctrl/⌘ + drag a rectangle). Then `move, delete or copy all the chosen items simultaneously`. In the Object tree: Ctrl or Shift click. | [How to select several objects](https://www.tradingview.com/support/solutions/43000537219-how-to-select-several-objects/), [Blog](https://www.tradingview.com/blog/en/new-object-tree-15090) |
| Clone | `select the item that should be cloned, hold Ctrl/Command and then drag the figure`; works on a multi-selection. | [How to clone drawings](https://www.tradingview.com/support/solutions/43000537251-how-to-clone-drawings/) |
| Constrain drag | `Holding Shift while dragging drawings allows you to move items strictly horizontally/vertically`. | [Drag horizontally/vertically](https://www.tradingview.com/support/solutions/43000538248-how-to-drag-drawings-horizontally-vertically/) |
| Nudge | Keyboard arrows: `1 bar` horizontally, `1 mintick` vertically. | Same |
| Precise multi-move | `Displacement` tab in the properties of a multi-selection. | [Move multiple objects](https://www.tradingview.com/support/solutions/43000682552-how-to-move-multiple-drawing-objects-at-the-same-time/) |
| Delete | `Delete`/`Backspace` (third-party lists), the Eraser cursor, or `Remove` in the menu; TradingView's own idea also notes middle-mouse-wheel click removes the hovered object. | [Keyboard shortcuts idea](https://www.tradingview.com/chart/DXY/j9Ua6Ks4-Keyboard-shortcuts-Analyze-create-and-study-charts-faster/) |

### 13.2 Hotkeys

Caveat: TradingView's official hotkey page (`tradingview.com/support/shortcuts/`) is JavaScript-rendered and returned an empty body to the fetcher (also tried the India mirror and `curl`). The combos below come from TradingView's Advanced Charts shortcut doc (primary), TradingView-authored ideas (primary), the individual tool articles, and two third-party lists that agree with them. Mac = replace `Alt` with `⌥`, `Ctrl` with `⌘`.

| Action (label as sourced) | Keys | Source |
|---|---|---|
| `Draw Trend line` | `Alt + T` | Library shortcuts; TV idea |
| `Draw Horizontal line` | `Alt + H` | Library; Horizontal line article |
| `Draw Vertical line` | `Alt + V` | Library; Vertical line article |
| `Draw Cross line` | `Alt + C` | Library; Crossline article |
| `Draw Fib retracement` | `Alt + F` | Library; TV idea |
| `Draw Rectangle` | `Alt + Shift + R` | Library |
| `Draw Square` | Rectangle + `Shift` | Library; Rectangle article |
| `Draw Circle` | Ellipse + `Shift` | Library; Ellipse article |
| `Draw 45° angle` | Trend line / Channel + `Shift` | Library; 45° article |
| `Gann box fixed increments` | Hold `Shift` | Library |
| `Measure tool` | Hold `Shift` + click | Library; Measure article |
| `Toggle magnet mode` | `Ctrl` + move point | Library; Magnet Mode article |
| `Partially erase` | Eraser + `Ctrl` | Library; Fib levels article |
| `Hide all drawings` | `Ctrl + Alt + H` | Library |
| `Clone drawing` | `Ctrl` + drag | Library; Clone article |
| `Select multiple` | Hold `Ctrl` + click | Library |
| `Move horizontally/vertically` | Drag + `Shift` | Library |
| `Move left / right / up / down` | `←` `→` `↑` `↓` | Library |
| `Copy object` / `Paste object` | `Ctrl + C` / `Ctrl + V` | Library |
| `Undo` / `Redo` | `Ctrl + Z` / `Ctrl + Y` | Library |
| Add text note for the symbol | `Alt + N` | third-party lists only; not confirmed on a TradingView page |
| Lock all drawings; Stay in drawing mode; Object tree; Replay | **could not verify** any hotkey | — |

Library source: [Advanced Charts: Keyboard shortcuts](https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/). TV ideas: [Keyboard shortcuts! Analyze, create, and study charts faster](https://www.tradingview.com/chart/DXY/j9Ua6Ks4-Keyboard-shortcuts-Analyze-create-and-study-charts-faster/), [How To Use TradingView Hotkeys and Shortcuts](https://www.tradingview.com/chart/GC1!/l3H7kI3z-How-To-Use-TradingView-Hotkeys-and-Shortcuts/). Third-party corroboration: [FindingProStocks](https://www.findingprostocks.com/p/tradingview-keyboard-shortcuts.html), [FinancialTechWiz](https://www.financialtechwiz.com/post/tradingview-shortcuts/).

---

## 14. The Replay tool (`Bar Replay`)

Strictly it lives on the top toolbar, not the drawing panel, but it was asked for here.

| Fact | Detail | Source |
|---|---|---|
| Start | `Click the Bar Replay button on the top panel of the chart to open the replay panel.` (`it looks like a video rewind button`). The chart enters start-point selection; click the bar to start from. | [How do I turn Bar Replay on?](https://www.tradingview.com/support/solutions/43000474024-how-do-i-turn-bar-replay-on/), [Demo features](https://www.tradingview.com/support/solutions/43000754966-demo-features-on-tradingview/) |
| Controls named in the article | `Play` (`start autoplay. You can adjust the speed before or during replay`), `Forward` (`move one step forward`), `Go to...` (`select a historical part of the chart to change the starting point`), `Jump to real-time chart`. Pause is described as media-player style. The list of speed values (10x/3x/1x/…): **could not verify**. | Same |
| Replay interval | Dropdown `on the simulator control panel to the right of the replay speed`; `the amount of time that corresponds to one data update`. Minimums: `1 second` on second charts, `1 minute` on intraday and daily, `1-day` only on weekly/monthly. In multi-chart layouts only intervals that `evenly divide` every chart's interval are offered; auto-selection picks the current interval (single chart) or the largest common interval (multi-chart). | [How to select replay interval](https://www.tradingview.com/support/solutions/43000739158-how-to-select-replay-interval-for-the-bar-replay/) |
| Works with | Multiple synchronized charts, drawings and indicators; not with spread charts, tick charts, or certain profile tools (per the article). | [How do I turn Bar Replay on?](https://www.tradingview.com/support/solutions/43000474024-how-do-i-turn-bar-replay-on/) |
| Trading in replay | Before `Play` you can set `initial capital, base currency, and commission size`; orders/positions and an Overview / Performance / Trades analysis follow. (Surface for paper trading, not this one.) | [Learn to trade on historical data](https://www.tradingview.com/support/solutions/43000691889-learn-to-trade-on-historical-data/) |
| Data depth by plan | Daily and daily-based intervals: `all available data on the chart` for every plan. Intraday: Essential = `6 months × interval multiplier` (1m → 6 mo, 5m → 30 mo, 15m → 90 mo); Plus = `1 year × interval multiplier`; Premium/Expert/Ultimate = all stored data. Seconds-based: Premium+ only (from 2022-08-17). Tick data: Ultimate only, `7 days back`. | [How much data is available for Bar Replay?](https://www.tradingview.com/support/solutions/43000692816-how-much-data-is-available-for-bar-replay/) |
| Pricing-page row `Bar Replay` | Two fetches of the JS-rendered pricing page disagreed on the Basic column (checkmark vs dash). **Could not verify** the free tier's exact replay entitlement from the pricing page; the data article above is the reliable statement. | [Pricing](https://www.tradingview.com/pricing/) |

---

## 15. Plan gating — what is actually documented

| Feature | Gating | Confidence |
|---|---|---|
| Drawing tools themselves | Every Help Center article assumes any user has them. The pricing page shows a row `110+ smart drawing tools`; one fetch put a dash under Basic, but JS rendering makes the table unreliable. **Could not verify** what the row restricts. | low |
| `Sync globally` | `users with paid plans` (blog). | medium |
| Bar Replay intraday depth | Essential 6 mo×, Plus 1 yr×, Premium+ all; seconds Premium+; ticks Ultimate. | high |
| Volume profile drawing tools | Pricing row `Volume Profile indicators` is paid-only; the drawing variants' gating **could not verify**. | low |
| Drawing templates | No gating documented on tradingview.com. | medium |
| Image tool | `some limitations apply` (content policy), plan not stated. | medium |
| Maximum drawings per chart/layout | Not documented anywhere fetched. **Could not verify.** | — |

---

## 16. What this means for OnStock

Context from the code: OnStock's chart is `src/components/CandleChart.jsx` on lightweight-charts v5 (`createChart`, `addSeries` for candles/volume/SMA/EMA/RSI, `createPriceLine`, `subscribeCrosshairMove`). Lightweight-charts ships no drawing tools; v5's series/pane **primitives** API is the sanctioned way to draw custom objects on the canvas, and TradingView publishes reference plugins (trend line, rectangle, vertical line, etc.). Everything below assumes drawings are built as primitives, stored per symbol, and persisted to Supabase.

1. **Adopt — the settings-dialog skeleton (`Style` / `Text` / `Coordinates` / `Visibility`).** One dialog shape for every drawing is what makes 100+ tools learnable. Build the dialog once with a schema per tool.
2. **Adopt — a small first set: `Horizontal line`, `Horizontal ray`, `Trendline`, `Rectangle`, `Text`, `Price range` / `Date range`, `Vertical line`.** These are the tools traders reach for daily and each is ~one primitive. Ship with the same hotkeys (`Alt+H`, `Alt+T`, `Alt+V`) so muscle memory transfers.
3. **Adopt — `Measure` with Shift+click.** Cheapest high-value tool: two clicks, a box, `Δ price / % / bars / time`. OnStock already has the crosshair subscription needed to read coordinates.
4. **Adopt — Magnet with `Weak`/`Strong` and a `Ctrl`-hold override.** Snapping to OHLC is essential on token candles, which are thin and gappy at 1m/5m. Weak as default.
5. **Adopt — `Stay in drawing mode`, `Lock all drawings`, `Hide all drawings` (Ctrl+Alt+H), and a `Remove all drawings` with a count.** Four toggles, trivially cheap, and users expect them at the bottom of the rail.
6. **Adapt — the Object tree.** OnStock shows candles, gap line, SMA/EMA/RSI, alert lines and (soon) drawings; a right-side tree with eye/lock icons and groups is the right home for all of it. Skip TradingView's Data Window tab; OnStock's tooltip already covers it.
7. **Adapt — `Visibility` per interval, but with OnStock's fixed set (1m/5m/15m/1h/4h/1D).** Six checkboxes, no ranges/ticks/seconds rows. Add the quick options (`current only`, `current and above`, `all`) since OnStock's interval list is short enough to make them obvious.
8. **Adapt — Sync drawings across the Gap|Candles toggle, not across layouts.** OnStock has no multi-chart layouts yet; the equivalent question is "does a horizontal line at $310 on the token chart also show on the stock chart and on the gap chart?" Price-space drawings should sync token↔stock (same price axis); the gap series is in percent space and needs its own drawings. Make that rule explicit in the UI the way TradingView's `Sync in layout` / `Sync globally` is.
9. **Adapt — `Long position` / `Short position` as a "gap trade planner".** Keep the `Account Size` / `Risk` / `Entry` / `Target` / `Stop` inputs and the R:R readout, but let the target/stop be expressed as a *gap* percentage as well as a price; route the resulting size to the Jupiter hand-off. This is the one tool that turns OnStock's thesis into an action.
10. **Adapt — `Anchored VWAP` and `Fixed range volume profile`.** Token volume from GeckoTerminal makes both computable; a `Fixed range volume profile` on the token vs the delayed Yahoo stock is a genuinely OnStock-flavoured view. Anchor tools need one click each, cheap on the primitive API.
11. **Adapt — drawing templates as "save as default per tool".** Implement `Save as default` / `Apply default` only; named template libraries are overkill until users ask.
12. **Skip — Gann, Fibonacci fans/arcs/spirals/wedges, pitchforks, harmonic XABCD/Cypher/Three drives, Elliott, cycles.** Heavy to build, rarely used by the gap-trader persona, and lightweight-charts has no reference primitives for them. A plain `Fib retracement` is the only one worth reconsidering later.
13. **Skip — Image, X posts/ideas, Icons/Emojis/Stickers, Table, Brush/Highlighter/Path.** Social and decorative; OnStock has no idea-publishing loop.
14. **Skip — Bar Replay.** Replay needs its own data engine and OnStock's stock leg is delayed anyway; the value of replaying a *gap* is unproven. Revisit only if the gap series becomes tradable enough that back-practising it matters.
15. **Adopt — the interaction rules as a whole: Ctrl+drag clone, Shift-constrained drag, arrow-key nudge, Ctrl/⌘ multi-select, `Delete`, undo/redo.** They cost little once a primitive knows how to hit-test, and they are the difference between "has drawings" and "feels like TradingView".

---

## Sources

TradingView Help Center (primary):

- https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/
- https://www.tradingview.com/support/folders/43000547459-i-d-like-to-learn-more-about-various-drawing-tools/
- https://www.tradingview.com/support/folders/43000561752/
- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/
- https://www.tradingview.com/support/solutions/43000473103-i-can-t-find-drawing-tools-fib-retracement-trend-line-or-other/
- https://in.tradingview.com/support/solutions/43000512928-how-can-i-enable-disable-the-drawings-toolbar/
- https://www.tradingview.com/support/solutions/43000662392-how-to-favorite-indicators-financials-drawing-tools-and-timeframes/
- https://www.tradingview.com/support/solutions/43000472715-drawing-points-don-t-snap-to-ohlc-values-correctly/
- https://www.tradingview.com/support/solutions/43000722509-magnet-mode/
- https://www.tradingview.com/support/solutions/43000537228-how-to-use-measure-tool-quickly/
- https://www.tradingview.com/support/solutions/43000537219-how-to-select-several-objects/
- https://www.tradingview.com/support/solutions/43000537251-how-to-clone-drawings/
- https://www.tradingview.com/support/solutions/43000537268-how-to-draw-lines-at-a-45-angle/
- https://www.tradingview.com/support/solutions/43000538248-how-to-drag-drawings-horizontally-vertically/
- https://www.tradingview.com/support/solutions/43000682552-how-to-move-multiple-drawing-objects-at-the-same-time/
- https://www.tradingview.com/support/solutions/43000677801-how-to-apply-a-template-to-several-tools-of-the-same-type-at-once/
- https://www.tradingview.com/support/solutions/43000677803-how-to-change-the-color-of-multiple-tools-at-once/
- https://www.tradingview.com/support/solutions/43000484410-how-to-set-drawing-visibility-on-different-intervals/
- https://www.tradingview.com/support/solutions/43000686263-how-to-quickly-adjust-visibility-of-a-drawing-or-indicator/
- https://www.tradingview.com/support/solutions/43000660419-i-want-to-customize-the-visibility-for-several-objects/
- https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/
- https://www.tradingview.com/support/solutions/43000474299-how-can-i-change-the-visual-order-layer-of-indicators-drawings-candles/
- https://www.tradingview.com/support/solutions/43000629998-my-drawings-do-not-get-synchronized-across-charts-or-layouts/
- https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
- https://www.tradingview.com/support/solutions/43000474024-how-do-i-turn-bar-replay-on/
- https://www.tradingview.com/support/solutions/43000692816-how-much-data-is-available-for-bar-replay/
- https://www.tradingview.com/support/solutions/43000691889-learn-to-trade-on-historical-data/
- https://www.tradingview.com/support/solutions/43000739158-how-to-select-replay-interval-for-the-bar-replay/
- https://www.tradingview.com/support/solutions/43000754966-demo-features-on-tradingview/
- https://www.tradingview.com/support/solutions/43000475660-how-to-use-long-and-short-position-drawing-tools/
- https://www.tradingview.com/support/solutions/43000517002-long-position-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516992-short-position-drawing-tool/
- https://www.tradingview.com/support/solutions/43000744866-how-to-reverse-a-position-drawn-on-a-chart-with-the-long-or-short-position-tool/
- https://www.tradingview.com/support/solutions/43000517004-position-forecast-drawing-tool/
- https://www.tradingview.com/support/solutions/43000517006-bar-pattern-drawing-tool/
- https://www.tradingview.com/support/solutions/43000748168-ghost-feed-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516995-sector-drawing-tool/
- https://www.tradingview.com/support/solutions/43000669764-anchored-vwap-drawing-tool/
- https://www.tradingview.com/support/solutions/43000707985-fixed-range-volume-profile-drawing-tool/
- https://www.tradingview.com/support/solutions/43000707989-anchored-volume-profile-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516996-date-and-price-range-drawing-tools/
- https://www.tradingview.com/support/solutions/43000692906-how-to-add-text-to-range-tools/
- https://www.tradingview.com/support/solutions/43000518095-trendline-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518113-ray-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791601-info-line-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518131-extended-line-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791602-trend-angle-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518124-horizontal-line-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518121-horizontal-ray-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518093-vertical-line-drawing-tool/
- https://www.tradingview.com/support/solutions/43000477747-crossline-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518117-parallel-channel-drawing-tool/
- https://www.tradingview.com/support/solutions/43000710744-how-to-add-text-to-channel-drawing-tools/
- https://www.tradingview.com/support/solutions/43000518108-regression-trend-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791603-flat-top-bottom-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791604-disjoint-channel-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518141-pitchfork-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518140-schiff-pitchfork-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791609-modified-schiff-pitchfork-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518146-inside-pitchfork-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518143-pitchfan-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518158-fibonacci-retracement-drawing-tool/
- https://www.tradingview.com/support/solutions/43000542398-how-to-extend-fibonacci-retracement-lines/
- https://www.tradingview.com/support/solutions/43000543443-how-to-remove-specific-fibonacci-retracement-levels/
- https://www.tradingview.com/support/solutions/43000518137-trend-based-fib-extension-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791610-fibonacci-channel-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518155-fib-time-zone-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518136-trend-based-fib-time-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518156-fib-speed-resistance-fan-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518157-fib-speed-resistance-arcs-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518159-fib-circles-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791611-fibonacci-spiral-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518153-fib-wedge-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518152-gann-box-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518149-gann-square-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791675-gann-square-fixed-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518151-gann-fan-drawing-tool/
- https://www.tradingview.com/support/solutions/43000569909-xabcd-pattern-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791680-cypher-harmonic-pattern-drawing-tool/
- https://www.tradingview.com/support/solutions/43000570202-abcd-pattern-drawing-tool/
- https://www.tradingview.com/support/solutions/43000570208-triangle-pattern-drawing-tool/
- https://www.tradingview.com/support/solutions/43000570172-three-drives-pattern-drawing-tool/
- https://www.tradingview.com/support/solutions/43000570149-head-and-shoulders-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518161-cyclic-lines-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791682-time-cycles-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791685-sine-line-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516984-rectangle-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791738-rotated-rectangle-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791739-path-drawing-tool/
- https://www.tradingview.com/support/solutions/43000662172-circle-drawing-tool/
- https://www.tradingview.com/support/solutions/43000672263-how-do-you-add-text-to-a-circle-or-ellipse/
- https://www.tradingview.com/support/solutions/43000516988-ellipse-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516986-polyline-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516814-triangle-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516989-arc-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791740-curve-and-double-curve-drawing-tools/
- https://www.tradingview.com/support/solutions/43000516987-brush-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791735-highlighter-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518134-arrow-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791736-arrow-marker-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518087-arrow-marks-drawing-tools/
- https://www.tradingview.com/support/solutions/43000518085-flag-mark-drawing-tool/
- https://in.tradingview.com/support/solutions/43000516983-text-drawing-tool/
- https://www.tradingview.com/support/solutions/43000737571-note-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791741-price-note-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791743-pin-drawing-tool/
- https://www.tradingview.com/support/solutions/43000744162-table-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516978-callout-drawing-tool/
- https://www.tradingview.com/support/solutions/43000516981-comment-drawing-tool/
- https://www.tradingview.com/support/solutions/43000518083-price-label-drawing-tool/
- https://www.tradingview.com/support/solutions/43000791744-signpost-drawing-tool/
- https://www.tradingview.com/support/solutions/43000632957-how-to-insert-images-on-the-chart/
- https://www.tradingview.com/support/solutions/43000662394-how-to-paste-x-posts-or-ideas-onto-the-chart/
- https://www.tradingview.com/support/solutions/43000662396-how-to-chart-with-emojis/
- https://www.tradingview.com/pricing/ (JS-rendered; two fetches disagreed — treated as low confidence)

TradingView docs, blog and TradingView-authored ideas (primary):

- https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/Drawings-List/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/
- https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/
- https://www.tradingview.com/charting-library-docs/latest/saving_loading/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/object-tree
- https://www.tradingview.com/blog/en/new-object-tree-15090
- https://www.tradingview.com/blog/en/drawings-synchronization-across-layouts-39890
- https://www.tradingview.com/blog/en/faster-setup-of-visibility-on-intervals-34613
- https://www.tradingview.com/blog/en/magnet-snaps-to-indicators-instantly-50979
- https://www.tradingview.com/chart/DXY/j9Ua6Ks4-Keyboard-shortcuts-Analyze-create-and-study-charts-faster/
- https://www.tradingview.com/chart/GC1!/l3H7kI3z-How-To-Use-TradingView-Hotkeys-and-Shortcuts/
- https://www.tradingview.com/chart/USDJPY/9VHrCCy9-How-to-create-beautiful-charts-with-the-Object-Tree
- https://www.tradingview.com/chart/MSFT/LvtcO9it-How-To-Add-Drawings-To-Your-Chart (video only; text confirms the feature names)

Third-party (corroboration of hotkeys only):

- https://www.findingprostocks.com/p/tradingview-keyboard-shortcuts.html
- https://www.financialtechwiz.com/post/tradingview-shortcuts/

Attempted and not usable: `https://www.tradingview.com/support/shortcuts/` and its India mirror (empty JS-rendered body), `…/charting-library-docs/latest/ui_elements/drawings/Drawings-Overrides/` (404), the Help Center's own search endpoint (403), DuckDuckGo/Bing HTML search (CAPTCHA / no results).
