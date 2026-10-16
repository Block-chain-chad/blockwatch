# TradingView teardown — surface 09: Interactions and shortcuts

Date: 2026-09-06. Scope: how a person *drives* a TradingView Supercharts chart — every documented keyboard shortcut, mouse behaviour, touch gesture, right-click menu, and the small quality-of-life details (auto-scale, scale locks, last-price label, countdown, data window, go-to-date, crosshair sync). Other surfaces (toolbar anatomy, settings dialog, indicators, watchlists, layouts, alerts, plans, screeners) are covered by their own documents and are only referenced here where a shortcut or gesture lands on them.

How this was verified:

- **Primary source is the Help Center hotkey list** at `tradingview.com/support/shortcuts/`. That page is rendered by JavaScript (a plain fetch returns only the footer), so it was opened in a browser and its list read directly. Every row in the tables below marked "official list" is transcribed from it verbatim. The page shows Windows/Linux keys; TradingView's own articles say to use **⌥ (Option)** for **Alt** and **Cmd** for **Ctrl** on macOS, and the Desktop-app article gives explicit Mac variants.
- **Live Supercharts** (`tradingview.com/chart/`, logged-out guest, AAPL, 1D) was opened on 2026-09-06 and its right-click menus, toolbar button labels and dialogs were read from the page. Rows marked "live menu" are verbatim from that session; TradingView changes menu wording from time to time, so treat those as "as of today".
- Help Center articles, TradingView blog posts, the Advanced Charts (embeddable library) docs and the Lightweight Charts docs fill in behaviour that the hotkey list does not explain. The library docs describe *TradingView's own chart engine*, and Lightweight Charts is the library OnStock already uses, so its defaults are quoted where Supercharts' Help Center is silent.
- Anything not found in one of those sources is marked **could not verify**. Nothing below is invented.

Plan gating for this surface: keyboard shortcuts, mouse and touch behaviours, crosshair, measure, go-to-date, countdown, data window and snapshots are **not** plan-gated in any source read. The gated items that touch this surface are: charts per layout (Basic 1, Essential 2, Plus 4, Premium 8, Ultimate 16 — so Tab / Shift+Tab / Alt+Enter only matter from Essential up), Bar Replay on intraday intervals (paid plans), second-based and tick-based intervals (Essential and higher), and "Tab linking by symbol between windows" (Desktop app, all plans). Source: pricing page.

---

## 1. Keyboard shortcuts — Chart (official list)

All rows are from the Help Center hotkey list unless a source column says otherwise. "Mac" column: ⌥ for Alt, Cmd for Ctrl per TradingView's convention.

| Action (verbatim) | Windows / Linux | Mac | Notes and source |
|---|---|---|---|
| Quick search | Ctrl + K | Cmd + K | Opens the command/quick-search box in the header ("Quick search" button, `header-toolbar-quick-search`). Symbol Search article confirms "Ctlr+K for Windows and Cmd+K for macOS". |
| Open indicators | / | / | Opens the "Indicators, metrics, and strategies" dialog. Library featureset `insert_indicator_dialog_shortcut` — "Enables the Open indicator shortcut (/)". |
| Open data window | Alt + D | ⌥ + D | Opens the right-toolbar "Object tree and data window" panel on its **Data window** tab (see §11). |
| Load Chart Layout | . (Dot) | . | |
| Save Chart Layout | Ctrl + S | Cmd + S | Library featureset `save_shortcut`. |
| Change symbol | Any letter key | Any letter key | Tooltip on the list: "Start typing the name of the symbol you need — and Symbol Search with your query will open automatically". Help Center: "type the name asset you're looking for directly into your keyboard. A search box will appear". In Symbol Search, ↑ / ↓ move between results and Enter selects (official TradingView idea post; the Help Center article itself does not spell out the arrow keys). Library featureset `symbol_search_hot_key`. |
| Change interval | Any number key, or , (Comma) | same | Tooltip: "Type in a digit for minute charts, or the first letter of a word for other resolutions (i.e. 1, 5, 30, 60, 1440, 5S, 30S, H, 2H, 6H, D, 5D, 3W, 6M)". So: a bare number = minutes; suffix **S** = seconds, **H** = hours, **D** = days, **W** = weeks, **M** = months; a comma opens the same interval prompt. Library featureset `show_interval_dialog_on_key_press` — "Opens the Change Interval dialog when users type digits or press the comma key". |
| Switch between sessions | Alt + Shift + E | ⌥ + Shift + E | Tooltip: "For example switch between Extended and Regular trading hours". |
| Move chart 1 bar to the left | ← | ← | |
| Move chart 1 bar to the right | → | → | |
| Zoom in | Ctrl + ↑ | Cmd + ↑ | |
| Zoom out | Ctrl + ↓ | Cmd + ↓ | |
| Move chart to left/right | Shift + Mouse wheel | Shift + Mouse wheel | |
| Focused zoom | Ctrl + Mouse wheel | Cmd + Mouse wheel | Official idea post: "hold Ctrl or ⌘ buttons on your keyboard while zooming" to zoom into a specific place. Library featureset `right_bar_stays_on_scroll` governs whether "the bar under the mouse cursor stays in the same place" when zooming. |
| Replay play/pause | Shift + ↓ | Shift + ↓ | Blog "Hotkeys for the Bar Replay": "Shift + ↓" activates/deactivates playback. |
| Replay step forward | Shift + → | Shift + → | Same blog: advances one bar. |
| Move further to the left | Ctrl + ← | Cmd + ← | |
| Move further to the right | Ctrl + → | Cmd + → | |
| Move chart to the first bar | Alt + Shift + ← | ⌥ + Shift + ← | |
| Move chart to the last bar | Alt + Shift + → | ⌥ + Shift + → | |
| Undo | Ctrl + Z | Cmd + Z | Undo works only for objects on the symbol currently on the chart; deleting drawings on a symbol not open on the chart cannot be undone (Help Center "Layouts, charts, drawings…"). |
| Redo | Ctrl + Y | Cmd + Y | |
| Switching between charts in multi-charts layout | Tab, or Shift + Tab | same | Shift + Tab = previous chart (blog 20914). Only meaningful with 2+ charts (Essential and up). |
| Toggle maximize chart | Alt + Enter, or Alt + Click | ⌥ + Enter, or ⌥ + Click | Help Center "How to maximize a chart in multichart layout" — also the "Maximize Chart" button in the lower-right corner of a chart. |
| Toggle maximize pane | DoubleClick | DoubleClick | Double-click an indicator pane (e.g. RSI) to fill the chart with it; again to restore. |
| Toggle collapse pane | Ctrl + DoubleClick | Cmd + DoubleClick | Help Center "How to collapse separate panes": also the "Collapse Pane" button in the pane's right corner (visibility set in Chart Settings → Canvas). |
| Add alert | Alt + A | ⌥ + A | Creates an alert at the cursor's price. |
| Go to date | Alt + G | ⌥ + G | Opens the "Go to" dialog (see §10). |
| Add text note for symbol | Alt + N | ⌥ + N | |
| Save chart image | Alt + Ctrl + S | ⌥ + Cmd + S | Downloads a PNG. |
| Copy chart image | Shift + Ctrl + S | Shift + Cmd + S | Puts the image on the clipboard. |
| Copy link to the chart image | Alt + S | ⌥ + S | Uploads a snapshot and copies its URL. The Advanced Charts docs phrase it "Take snapshot, saving URL to clipboard". Snapshots "don't expire". |
| Reset chart view | Alt + R | ⌥ + R | Same as the bottom-bar "Reset chart view" navigation button (Advanced Charts: "Reset chart"). |
| Invert series scale | Alt + I | ⌥ + I | Same as price-scale menu "Invert scale". |
| Enable/disable logarithmic series scale | Alt + L | ⌥ + L | Same as price-scale menu "Logarithmic" / bottom "Log" button. |
| Enable/disable percent series scale | Alt + P | ⌥ + P | Same as price-scale menu "Percent". |
| Add symbol to active watchlist | Alt + W | ⌥ + W | Help Center: "To add a currently viewing ticker to the opened watchlist, you can use Alt+W or ⌥ W". |
| Add symbol to watchlist… | Ctrl + Alt + W | Cmd + ⌥ + W | Opens a picker for *which* watchlist. |
| Fullscreen mode | Shift + F | Shift + F | Header button "Fullscreen mode". Official masterclass post: "displays only the chart… To exit Full screen mode, click 'Esc'". |
| Reset layout grid | DoubleClick | DoubleClick | Double-click a border between charts in a multi-chart layout: "Double-clicking on any of the chart borders returns it to its default state" (Help Center "I would like to resize the charts of my layout"). |
| Adjust multiple charts' edges | Shift + Drag | Shift + Drag | Same article: hold Shift while dragging to move several chart borders at once. |

Discoverability: the full list opens in-app with **Ctrl + /** (Windows) or **Cmd + /** (Mac), or via "Keyboard shortcuts" in the chart's main menu (blog "New shortcuts to access Rectangle and shortcuts list"). The Help Center page also has a "Find shortcut" search box.

Advanced Charts library-only additions (same engine; these appear in the library docs but not on the consumer hotkey page): "Start keyboard navigation" — **Alt + Z** (or **Tab** when the `accessible_keyboard_shortcuts` featureset is on), after which Tab and the arrow keys move through "the top, bottom, and drawing toolbars"; screen readers VoiceOver, Narrator, JAWS and NVDA are supported.

## 2. Keyboard shortcuts — Indicators and drawings (official list)

| Action (verbatim) | Windows / Linux | Mac | Notes and source |
|---|---|---|---|
| Draw with demonstration cursor | Hold Alt + Draw | Hold ⌥ + Draw | The "Demonstration" cursor type (see §7) draws a temporary highlight. |
| Partially erase | Ctrl + Eraser | Cmd + Eraser | With the "Eraser" cursor. |
| Gann box fixed increments | Hold Shift | Hold Shift | |
| Measure tool | Hold Shift + Click | Hold Shift + Click | See §9. |
| Copy selected object | Ctrl + C | Cmd + C | |
| Paste object | Ctrl + V | Cmd + V | Also appears in the chart right-click menu as "Paste  Ctrl + V". |
| Remove object | Delete, or Backspace, or Mouse wheel click | same | Blog 20914: middle-click "removes objects by hovering over a drawing or indicator and clicking the wheel; also deletes indicators via their legend names"; Ctrl + wheel-click deletes an individual Fibonacci level. |
| Temporary turn on/off magnet mode | Ctrl + Move a point | Cmd + Move a point | Help Center "Magnet Mode": hold Ctrl/Command while drawing to turn magnet on if it is off, or off if it is on. |
| Hide all drawings | Ctrl + Alt + H | Cmd + ⌥ + H | Blog 20914: "hides all drawings on the active chart. If they are already hidden, this combination will turn on the display of objects". |
| Clone a drawing | Ctrl + Drag | Cmd + Drag | Help Center "How to clone drawings": select, hold Ctrl/Command, drag; "Multiselected drawings can be copied as well". |
| Drawings multiselect | Hold Ctrl + Click | Hold Cmd + Click | Help Center "How to select several objects": "hold Ctrl/Command key and click on the drawing or choose required area on the chart" (Ctrl + drag draws a marquee). |
| Move a drawing horizontally or vertically | Drag + Shift | Drag + Shift | Help Center "How to drag drawings horizontally/vertically". |
| Move selected drawing left / right / up / down | ← / → / ↑ / ↓ | same | Same article: left/right moves 1 bar; up/down moves 1 mintick. |
| Trendline | Alt + T | ⌥ + T | |
| Horizontal line | Alt + H | ⌥ + H | |
| Horizontal ray | Alt + J | ⌥ + J | |
| Vertical line | Alt + V | ⌥ + V | |
| Crossline | Alt + C | ⌥ + C | |
| Fib retracement | Alt + F | ⌥ + F | |
| Rectangle | Shift + Alt + R | Shift + ⌥ + R | Blog: "Alt+Shift+R (Windows) or ⌥⇧R (Mac)". |
| Square | Rectangle + Shift | same | Hold Shift while drawing a rectangle. |
| Circle | Ellipse + Shift | same | Hold Shift while drawing an ellipse. |
| 45 degrees angle or horizontal | Trendline or channel + Shift | same | Help Center "How to draw lines at a 45° angle": "hold Shift while you draw". |
| Switch between cells in table drawing object | Tab, or Shift + Tab | same | |

Also documented but not on the list: the "Displacement" tab in a multi-selected drawing's properties lets you type an offset ("+5" shifts up 5 price units; multiplication/division for price, addition/subtraction for bar index) — Help Center "How to move multiple drawing objects at the same time?".

## 3. Keyboard shortcuts — Watchlist, Screener, Alerts, Trading (official list)

These are listed because the same keys drive the chart from a side panel.

| Panel | Action (verbatim) | Keys |
|---|---|---|
| Watchlist | Change watchlist | Shift + W |
| Watchlist | Next symbol | ↓ or Space |
| Watchlist | Previous symbol | ↑ or Shift + Space |
| Watchlist | Flag/unflag symbol | Alt + Enter |
| Watchlist | Select all symbols | Ctrl + A |
| Watchlist | Select next symbol / Select previous symbol | Shift + ↓ / Shift + ↑ |
| Screener | Next symbol / Previous symbol | ↓ or Space / ↑ or Shift + Space |
| Screener | Flag/unflag symbol | Alt + Enter |
| Screener | Select all symbols; Select next symbol; Select previous symbol | Ctrl + A; Shift + ↓; Shift + ↑ |
| Screener | Create new screen | Shift + N |
| Screener | Save screen / Load screen | Ctrl + S / . (Dot) |
| Screener | Add new filter / Add new column | Shift + F / Shift + C |
| Screener | Maximize screener | Shift + M |
| Screener | Undo / Redo | Ctrl + Z / Ctrl + Y |
| Alerts | Add alert | Alt + A |
| Alerts | Open Edit alert dialog | DoubleClick |
| Alerts | Save changes in the Edit alert dialog | Ctrl + Enter |
| Alerts | Next alert/event / Previous alert/event | ↓ or Space / ↑ or Shift + Space |
| Alerts | Select alert/event | Ctrl + Click |
| Alerts | Select all alerts/events | Ctrl + A |
| Alerts | Select next alert/event / Select previous alert/event | Shift + ↓ / Shift + ↑ |
| Alerts | Remove alert without confirmation | Shift + Backspace, or Shift + Delete |
| Trading | Open/close order ticket | Shift + T |
| Trading | Place order to buy / Place order to sell | Shift + B / Shift + S |
| Trading | Place limit order to buy / Place limit order to sell | Shift + Alt + B / Shift + Alt + S |
| Trading | Drag the entire trading group | Shift + Drag |
| Trading | Show Plus button on cursor | Alt + Ctrl |
| Trading — DOM | Open/close DOM | Shift + D |
| Trading — DOM | Place limit order / Place stop order | Click in the DOM cell / Ctrl + Click in the DOM cell |

The Pine Script Editor section of the same page (≈60 VS-Code-style editing shortcuts, e.g. F1 or Ctrl + Shift + P for the command palette, Ctrl + Enter "Add to chart/Update on chart") is out of scope for this surface and not reproduced.

## 4. Keyboard shortcuts — TradingView Desktop app (official article)

These exist only in the Desktop app (Windows/Linux/macOS) and manage tabs and windows around the chart.

| Action (verbatim) | Windows, Linux | macOS |
|---|---|---|
| Open Settings dialog | Ctrl + , | Cmd + , |
| Open New tab | Ctrl + T | Cmd + T |
| Duplicate tab | Ctrl + U | Cmd + U |
| Open New window | Ctrl + N | Cmd + N |
| Reload tab | Ctrl + R or F5 | Cmd + R |
| Close window | Ctrl + W | Cmd + W |
| Open an accidentally closed window or tab | Shift + Ctrl + T | Shift + Cmd + T |
| Switch to the next / previous tab in the window | Ctrl + Pg Dn / Up, or Ctrl + Tab / Ctrl + Shift + Tab | Cmd + Pg Dn / Up, or Ctrl + Tab / Ctrl + Shift + Tab |
| Go to specific tab | Ctrl + Number (from 1 to 8) | Cmd + Number (from 1 to 8) |
| Go to the rightmost tab | Ctrl + 9 | Cmd + 9 |
| Close the application while preserving the window and tab arrangement | Shift + Ctrl + Q | Cmd + Q |

## 5. Mouse behaviours on the chart canvas

Supercharts' Help Center rarely spells out basic mouse physics; where it is silent the Advanced Charts featureset list (the switches TradingView exposes for its own engine) and Lightweight Charts defaults are quoted.

| Behaviour | What happens | Source / engine switch |
|---|---|---|
| Mouse wheel over the chart | Zooms the time scale in/out around the cursor (or around the right edge — see next row). | Featureset `mouse_wheel_scale` — "Enables series scaling with a mouse wheel." Lightweight Charts `handleScale.mouseWheel` default `true`. |
| Which bar stays put while zooming | Featureset `right_bar_stays_on_scroll`: "the bar under the mouse cursor stays in the same place if this feature is disabled"; when enabled the right-most bar is the anchor. Lightweight Charts `timeScale.rightBarStaysOnScroll` default `false`. | Advanced Charts featuresets; Lightweight Charts `TimeScaleOptions`. |
| Ctrl + Mouse wheel | "Focused zoom" (official list) — zooms into the spot under the cursor. | Official list; TradingView idea post. |
| Shift + Mouse wheel | "Move chart to left/right" — pans horizontally. Horizontal wheel/trackpad also pans: featureset `mouse_wheel_scroll` — "Enables chart scrolling with a horizontal mouse wheel." | Official list; featuresets. |
| Click + drag on the chart | Pans (scrolls) the chart. | Featureset `pressed_mouse_move_scroll` — "Enables chart scrolling with the left mouse button pressed."; Lightweight Charts `handleScroll.pressedMouseMove` default `true`. |
| Kinetic (momentum) scrolling | Lightweight Charts: `kineticScroll.touch` default `true`, `kineticScroll.mouse` default `false`. Could not verify Supercharts' own setting. | Lightweight Charts `KineticScrollOptions`. |
| Click + drag on the **price scale** | Stretches/compresses the price axis and turns Auto scale off. | Featureset `axis_pressed_mouse_move_scale` — "Enables axis scaling with the left mouse button pressed."; Lightweight Charts `handleScale.axisPressedMouseMove`. Help Center "Getting started with Supercharts": "Users can also drag the price scale to adjust views". |
| Click + drag on the **time scale** | Stretches/compresses bar spacing (zoom). | Same featureset / option (it covers "the price and/or time scales"). |
| Double-click on a scale | Lightweight Charts: `handleScale.axisDoubleClickReset` — "Enable resetting scaling by double-clicking the left mouse button." Supercharts: the Help Center documents reset through the "Reset price scale" menu item, the "Auto" button and Alt + R; a double-click-on-scale reset in Supercharts itself **could not be verified** from an official page. | Lightweight Charts `HandleScaleOptions`; Help Center autoscale article. |
| Double-click on the chart / a bar | Opens the Settings dialog: "double-clicking price bars" opens chart settings (Help Center "How to configure your Supercharts"). | Help Center. |
| Double-click a pane; Ctrl + double-click a pane | Maximize / collapse that pane (see §1). | Official list. |
| Double-click a chart border (multi-chart) | Resets the grid; Shift + drag moves several borders. | Official list; Help Center resize article. |
| Alt + Click a chart | Maximizes that chart in a multi-chart layout. | Official list; Help Center. |
| Click and **hold** on the chart | Shows the **floating data window** under the cursor with exact prices and indicator values, "even if the values in the status line are collapsed or hidden". Toggled by "Values tooltip on long press" in the cursor menu (see §7). A first-time hint reads "Press and hold to see detailed chart values" (observed live). | Help Center "How to enable/disable floating data tooltip?"; blog; live page. Library featureset `long_press_floating_tooltip`. |
| Hover the chart | Crosshair follows the cursor; the status line / legend values follow the crosshair ("values follow the crosshair"). | Advanced Charts Legend doc. |
| Hover the price scale / cursor | The **Plus button** appears beside the price scale (when enabled) to add an alert, order or horizontal line at that price; Alt + Ctrl shows a "+" under the cursor anywhere on the chart "even if it is disabled in the chart settings". | Help Center "How to enable the Plus Button on the price scale"; "How to create an order, alert, and price line anywhere on the chart". |
| Middle-click (wheel click) a drawing or an indicator's legend name | Deletes it. | Official list; blog 20914. |
| Ctrl + drag a drawing | Clones it. | Official list. |
| Shift + drag a drawing | Constrains movement to horizontal/vertical. | Official list. |
| Drag a drawing point with Ctrl held | Temporarily flips magnet mode. | Official list. |
| Right-click | Context menus (see §6). | Featuresets `context_menus`, `pane_context_menu`, `scales_context_menu`, `legend_context_menu`. |
| Chart resizing | Featureset `lock_visible_time_range_on_resize` — "Prevents changing visible time area on chart resizing." Lightweight Charts `timeScale.lockVisibleTimeRangeOnResize` default `false`. | Featuresets; Lightweight Charts. |
| New bar arrives while the last bar is visible | The view shifts right by one bar (`shift_visible_range_on_new_bar`; Lightweight Charts `shiftVisibleRangeOnNewBar` default `true`, "only applies when the last bar is visible"). | Same. |
| Scrolling past the data | `fix_left_edge` — "Prevents scrolling to the left of the first historical bar."; Lightweight Charts `fixLeftEdge` / `fixRightEdge` both default `false` (you can scroll into empty space on either side). | Same. |

Navigation buttons (bottom of the chart, shown on hover): the Help Center describes them as buttons that "help you zoom in or out, scroll to the left or to the right, or reset the chart view"; the Advanced Charts release notes name the "scroll to the most recent bar" button and say its presence "depends on the Navigation buttons settings (Chart settings → Canvas → Buttons → Navigation)". Each chart in a multi-chart layout has its own scroll and zoom buttons. Featureset `control_bar` — "Shows the Zoom in/out and Scroll navigation buttons at the bottom of the chart."; `show_zoom_and_move_buttons_on_touch` shows them on touch devices "when pressing the time scale".

## 6. Right-click (context) menus — verbatim from the live chart

Read on 2026-09-06, guest session, AAPL 1D. Trading items appear even when logged out because the guest layout has "Buy/Sell Buttons" on. Submenu contents that were not expanded are marked.

### 6.1 Chart (empty pane area)

| Item (verbatim) | Shortcut shown | What it does |
|---|---|---|
| Copy price 317.66 | — | Copies the price under the cursor. |
| Paste | Ctrl + V | Pastes a copied drawing. |
| Add alert on AAPL at 317.66… | Alt + A | Alert at the cursor price. |
| Buy 1 AAPL @ 317.66 limit | Alt + Shift + B | Trading (broker needed). |
| Sell 1 AAPL @ 317.66 stop | — | Trading. |
| Add order on AAPL at 317.66… | Shift + T | Opens the order ticket. |
| Lock vertical cursor line by time | — | Pins the crosshair's vertical line at this time so it stays while you scroll; the historic blog calls the feature "Lock Cursor on Time Axis". |
| Table view | — | Shows the symbol's data as a table. |
| Object tree | — | Opens the Object tree panel. |
| Remove 1 indicator | — | Removes the indicator(s) on the chart (here: Volume). |
| Settings… | — | Chart settings dialog. |

### 6.2 An indicator (right-click on the Volume plot)

| Item (verbatim) | Shortcut shown |
|---|---|
| Add alert on Vol at 208.89 M… | Alt + A |
| Add indicator/strategy on Vol… | — |
| Add this indicator to favorites | — |
| Visual order ▸ | — (submenu not expanded) |
| Visibility on intervals ▸ | — (submenu not expanded) |
| Move to ▸ | — (submenu not expanded) |
| Pin to scale (now no scale) ▸ | submenu: **Pin to right scale**, **Pin to new right scale**, **Pin to new left scale**, **No scale (fullscreen)** |
| Copy | Ctrl + C |
| Hide | — |
| Remove | Del |
| Object tree | — |
| Settings… | — |

The legend (status line) offers the same actions on hover as buttons; their accessible labels on the live page are "Hide indicator legend", "Show interval settings", "Remove" for indicators and, on the symbol row, "Change symbol", "Change interval", "Flag symbol", "Symbol/interval chart syncing", "Hide", "More". The symbol row also shows market status text, e.g. "Market closed · One update every 5 seconds · NASDAQ by Cboe One". (Advanced Charts: legend buttons are governed by `edit_buttons_in_legend`, `show_hide_button_in_legend`, `format_button_in_legend`, `delete_button_in_legend`; market status by `display_market_status`.)

### 6.3 Price scale

| Item (verbatim) | Shortcut shown | Notes |
|---|---|---|
| Auto (fits data to screen) | — | Checkable; same as the "Auto" button under the scale (accessible label "Toggle auto scale"). |
| Lock price to bar ratio  0.9163 | — | Checkable; the current ratio is displayed next to it (blog "Scale ratio is now available": "The current ratio is displayed in the context menu of the price scale… right next to the Lock Scale option"). Also in Chart settings → Scales and lines as "Price to bar ratio lock". |
| Scale price chart only | — | Checkable; when on, dragging the scale rescales only the main series, not the indicators pinned to it. |
| Invert scale | Alt + I | Checkable. |
| Regular | — | Radio group with the next three. |
| Percent | Alt + P | |
| Indexed to 100 | — | |
| Logarithmic | Alt + L | Same as the "Log" button under the scale ("Toggle log scale"). |
| Move scale to left | — | Becomes "Move scale to right" when the scale is on the left. |
| Labels ▸ | — | Not expanded. Documented children: "Bid and Ask Labels" (blog); symbol name, indicator labels, "Countdown To Bar Close" (see §12 — the Help Center says it is a price-scale context-menu item; its current position under Labels could not be verified). |
| Lines ▸ | — | Not expanded. Documented: price line, bid/ask lines, alert lines, high/low lines. |
| Plus button | — | Checkable; shows the "+" beside the scale for alert/order/line. |
| More settings… | — | Opens Chart settings on the Scales and lines tab. |
| Reset price scale | — | **Not present today** because the scale was in its default state: "Users can reset the price scale when it is in a non-default state" and "Reset price scale automatically adjusts the price line to the screen size, and turns on the Auto mode" (Help Center / Advanced Charts). |

Related Help Center items on the same menu family: "Merge all scales into one" on the left or right; "How to place all the scales on the right or left?"; "Pin to scale → Pin to scale A" removes a blank strip next to the price scale caused by an indicator on a second scale.

### 6.4 Time scale

| Item (verbatim) | Notes |
|---|---|
| Time zone ▸ | Same list as the bottom-bar Timezone menu: "UTC", "Exchange", then cities such as "(UTC-4) New York", "(UTC+1) London"… "Exchange" follows the symbol's venue. |
| Session breaks | Checkable; draws vertical separators between sessions. |
| More settings… | Chart settings, Scales and lines tab (Time scale group: "Weekdays", "Date and hours format", "Pin chart to the left when changing intervals"). |

### 6.5 Drawings

The drawing context menu and the mini "floating toolbar" that appears when you select a drawing **could not be captured live** in this session (the hotkey placed no line in a guest layout). Documented facts: selecting one or several drawings shows a floating toolbar with a **"Settings"** button, and "the template appliance option for multiple drawings of the same type is available in the floating toolbar" (Help Center "I want to customize the visibility for several objects" / drawings articles). The Help Center's "Drawing tools available on TradingView" lists the toolbar-bottom utilities that back it: **Measure**, **Zoom in**, **Magnets** (Weak / Strong / Snap to indicators), **Keep drawing** ("if you need to add multiple objects to the chart successively"), **Lock all drawings** ("prevents accidental movement of drawings"), **Hide options** (Drawings, Indicators, Positions and orders, or All), **Sync drawings options**, **Remove options** (with "Always remove locked drawings" toggle — Help Center "How to set removal of locked drawings?"). Live accessible labels of those buttons today: "Measure", "Zoom in", "Magnets" (tooltip "Magnet mode snaps drawings placed near price bars to the closest OHLC value"), "Keep drawing", "Lock drawings and indicators" / "Lock options", "Hide all drawings" / "Hide options", "Remove objects" / "Remove options".

## 7. Crosshair: cursor types, magnet, sync, lock

**Cursor menu** (left toolbar, arrow beside the cursor icon; live): **Cross**, **Dot**, **Arrow**, **Demonstration**, **Magic**, **Eraser**, plus a toggle **Values tooltip on long press**.

- Help Center "I can't see the crosshair line": only "Cross" and "Dot" show the crosshair; "Arrow" and "Eraser" do not. "Drawing tools available…" describes Cross as "The default cursor", Dot "Similar to the cross", Arrow "The classic arrow without a crosshair", Demonstration for "video ideas and live sessions" (draw with Alt held), Magic for decorative highlights, Eraser "For fixing anything".
- Crosshair styling lives in Chart settings → Canvas → Crosshair: "Color and opacity", "Thickness and style".
- Advanced Charts: only "Cross" and "Dot" support the crosshair; Lightweight Charts exposes `crosshair.mode` = `Normal` | `Magnet` | `Hidden` | `MagnetOHLC`, default `Magnet` (snap to the series value), and `doNotSnapToHiddenSeriesIndices`.

**Magnet** (left toolbar "Magnets"; live menu): **Weak magnet**, **Strong magnet**, **Snap to indicators**. Help Center: "Strong magnet: Forces drawings to glue to the open, high, low, or close prices"; "Weak magnet: Allows your drawings to be placed at a distance from the price"; "Snap to indicators" (blog, 2025) aligns drawing points to indicator plots. Ctrl/Command held while placing or moving a point temporarily flips magnet on/off.

**Crosshair sync across charts**: in the "Select Layout" (Layout setup) menu, the sync toggles are **Symbol**, **Crosshair**, **Interval**, **Time**, **Date range** (Help Center "How to sync the charts of my layout?"). Enabling "Crosshair synchronization" is also what shows the indicator status line "simultaneously on all charts in the window" (Help Center). Per-chart sync groups: the "Symbol/interval chart syncing" icon in the status line assigns an emoji; charts with the same emoji sync. In the **Desktop app**, "Crosshair Sync" additionally works "among all tabs and windows", "enabled by default for new layouts", toggled per layout from the Select Layout menu; web browsers do not get cross-tab crosshair sync (blog "Crosshair syncing now available in TradingView Desktop app").

**Lock vertical cursor line by time**: chart context-menu item (live). Pins the vertical crosshair line to a bar so it persists while you scroll or switch charts; historic blog "Lock Cursor on Time Axis" ("lock on to a particular time on the chart to make analysis of a segment much easier"). Could not fetch the original blog page (404), so the exact toggle-off wording is unverified.

## 8. Touch gestures (phone and tablet)

TradingView's own Help Center says almost nothing about gestures; the Advanced Charts "Mobile app development" page (the same engine the apps embed) and the mobile blog posts are the authority.

| Gesture | Behaviour | Source |
|---|---|---|
| One-finger drag on the chart | Pans horizontally; vertical drag pans price when the chart is set to handle it. | Advanced Charts mobile page: "Single Tap: Enables dragging the chart horizontally and adjusting both price and time scales through vertical/horizontal dragging." Featuresets `horz_touch_drag_scroll` / `vert_touch_drag_scroll` ("Enables the chart to handle the horizontal/vertical pointer movements on touch screens" — i.e. the chart, not the page, consumes them). Lightweight Charts `handleScroll.horzTouchDrag` / `vertTouchDrag` both default `true`. |
| One-finger drag on the price scale / time scale | Scales that axis. | Same page. |
| Pinch | Zooms the time scale. | Featureset `pinch_scale` — "Enables series scaling with pinch/zoom gestures. This feature is supported on touch devices only."; Lightweight Charts `handleScale.pinch` default `true`. Two-finger *pan* or other multi-finger gestures: **could not verify**. |
| Long press on a bar | Enters **tracking mode**: the legend shows Open, High, Low, Close, Change and indicator values (by default mobile shows only "last price & price change"); while in the mode you can "move the bar pointer"; page scrolling is disabled so the crosshair can move. | Blog "Tap and Hold to Track Values on Mobile Devices!"; Help Center "I can't see OHLC, indicator values and the crosshair cursor". Lightweight Charts `trackingMode.exitMode` default `TrackingModeExitMode.OnNextTap`. |
| Single tap | Exits tracking mode. | Same. |
| Long press on a scale | Opens that scale's context menu. | Advanced Charts mobile page: "Long Press: Opens context menus for scales and activates crosshair mode". |
| Tap a drawing, then long press it | Opens the drawing's context menu ("the object need to be selected… tap to select it first and then long tap on the line"). | Mobile blog. |
| Double tap a line | Enters line-move mode so it can be repositioned vertically. | Advanced Charts mobile page. |
| Press the time scale | Reveals zoom and scroll buttons ("Reveals zoom/scroll buttons when pressing the time scale"). | Featureset `show_zoom_and_move_buttons_on_touch`. |
| Chart borders in a multi-chart layout | "tap a desired border once, then move it"; "A double tap on any border restores the charts to their original position". | Help Center resize article. |
| Bar Replay on mobile | Replay panel: tap the interval display beside the speed controls to pick the replay interval (min 1 s on second charts, 1 min on intraday/daily, 1 day on weekly/monthly). | Help Center "How to select replay interval for the Bar Replay in mobile apps". |

Other mobile constraints: "Only one price scale displays simultaneously on mobile devices"; the right widget bar and time-scale marks are hidden or shrunk on small screens (Advanced Charts mobile page). Multi-chart on mobile supports "swift switches between charts" and a full-screen chart mode (blog), gesture details unstated.

## 9. Measure tool

- Invoke: **hold Shift and click** the start point, then click (or drag to) the end point (Help Center "How to use Measure Tool quickly?": "click on the start point and then on the end point while holding the Shift key"). Also the **Measure** button at the bottom of the left toolbar (ruler icon).
- Shows: price change (absolute), percentage change, number of bars, and elapsed time (official TradingView idea post "Quickly Measure Time & Change"). Help Center: "measure the distance between bars in either direction and see the price changes".
- Dismiss: click anywhere on the chart (search-result summary of the Help Center article; the article body itself only documents invocation).
- Companion: **Zoom in** tool (left toolbar) — "magnify a particular area of the chart" by drawing a box.

## 10. Go to date and date ranges

- **Alt + G** or the bottom-bar **"Go to"** button (`go-to-date`). Live dialog: title **Go to**, two tabs **Date** and **Custom range**, a month calendar, buttons **Cancel** and **Go to**. The original launch blog (could not fetch; 404) described: pick a date (and time), click Go, "the chart will show the specified bar and highlight it. If there is not enough historical data to show the requested bar, the first available bar will be marked with a red label" (search snippet of the blog). Featureset `go_to_date` — "Shows the Go to option that allows jumping to a particular bar."
- **Date-range tabs** under the time scale (live labels with their tooltips): **1D** "1 day in 1 minute intervals", **5D** "5 days in 5 minutes intervals", **1M** "1 month in 30 minutes intervals", **3M** "3 months in 1 hour intervals", **6M** "6 months in 2 hours intervals", **YTD** "Year to day in 1 day intervals", **1Y** "1 year in 1 day intervals", **5Y** "5 years in 1 week intervals", **All** "All data in 1 month intervals". Help Center: "Selecting 1D… adjusts the chart to display one trading day using one-minute intervals"; "Pressing 'All' displays all available historical data using monthly intervals". Advanced Charts: switching a time frame "The chart resolution changes. The bars scale horizontally to cover the entire requested date/time range." (featureset `timeframes_toolbar`).
- **Keep your place when switching interval**: Chart settings → Scales and lines → "Save chart left edge position when changing interval" (Help Center "How can I keep chart position in time after applying a new interval?"; the configuration article lists it as "Pin chart to the left when changing intervals"). Blog (Nov 2024): the chart "will stay anchored to the same position in the data history".
- **Timezone** menu (bottom bar, `time-zone-menu`): "UTC", "Exchange", then cities. Featureset `timezone_menu`. "Adjust data for dividends" (`adj`) sits beside it.

## 11. Data window, object tree and the status line

- **Data window**: **Alt + D**, or the right toolbar button **"Object tree and data window"** (`object_tree`), which opens a panel with two tabs, **Object tree** and **Data window**. Live contents while hovering a bar: **Date** ("Fri 04 Sep '26"), the series row "AAPL · 1D · NASDAQ" with **Open**, **High**, **Low**, **Close**, **Change** ("−8.24 (−2.51%)"), **Vol**, **Last day change**, then each indicator by name (here "Vol" → "Volume 39.61 M"). Values track the crosshair. Pine scripts choose whether a plot appears there (`display.data_window`) or in the status line (`display.status_line`). Featuresets: `show_object_tree`, `keep_object_tree_widget_in_right_toolbar`.
- **Object tree** tab: lists drawings, indicators and symbols with hide/show/remove — "Click on the Object Tree and Data Window button, located on the right toolbar" to restore anything hidden (Help Center "How to restore hidden drawings/indicators/charts?").
- **Floating data window** (click-and-hold, §5) duplicates the same values under the cursor; off switch is "Values tooltip on long press" in the cursor menu.
- **Status line** (legend, top-left): Chart settings → Status line toggles "Logo", "Title", "Chart values" (and more per the settings surface). Values follow the crosshair; on mobile only last price and change show until tracking mode.

## 12. Countdown to bar close

- Enable: right-click the price scale → **"Countdown To Bar Close"** (Help Center wording), or Chart settings → Scales and lines → Price labels and lines → **"Countdown to bar close"**. Featureset `countdown` — "Shows the Countdown to bar close option on the Price Scale."
- Displays inside the last-price label on the price scale; works "on any time interval" including 1-minute, daily, weekly, yearly and custom (blog, Feb 2020).
- Not shown when (Help Center "The countdown is not displayed on the chart"): (1) the option is off; (2) the chart type has no fixed time interval — Renko, Kagi, PnF, Line Break, Range; (3) **the symbol's data is delayed** — "the countdown will only be displayed for the time intervals over" the delay (e.g. 15-minute delayed data → countdown only on intervals longer than 15 minutes); (4) outside trading hours on intraday charts ("there is no bar waiting for close"); (5) the computer clock is out of sync (use NTP).

## 13. Scales: auto-scale, locks, last-price label and the details people praise

| Detail | Where / verbatim | Behaviour and source |
|---|---|---|
| Auto scale | "Auto" button under the price scale (label "Toggle auto scale"); menu item "Auto (fits data to screen)" | "To adjust chart data to screen, enable the Auto button located on the price scale"; if the button is missing "check its visibility settings" (Help Center "How to enable Autoscale"). Dragging the scale switches Auto off; "Reset price scale… turns on the Auto mode". Lightweight Charts `priceScale.autoScale` default `true`. |
| Log scale | "Log" button ("Toggle log scale"); menu "Logarithmic"; Alt + L | Scale modes: "Regular: Linear absolute price values"; "Percent"; "Indexed to 100: Comparative value scaling"; "Logarithmic" (Help Center configuration article). |
| Lock price to bar ratio | Price-scale menu, ratio value shown (live "0.9163"); settings "Price to bar ratio lock" | Keeps the same price-per-pixel to bar-per-pixel ratio when zooming so angles/circles keep their shape (blog "Scale ratio…"; Help Center Circle tool). |
| Scale price chart only | Price-scale menu (live) | Dragging the scale affects only the main series. |
| Invert scale | Price-scale menu; Alt + I | "the increase in price is shown from top to bottom" (Help Center). |
| Last-price label | Price scale; settings group "Symbol values, high/low, and other values format, visibility, and colors" (configuration article) | Older blog names the two label modes "Last Price And Percentage Value" and "Last Value According To Scale" — the % mode shows change over the visible range "without enabling the % scale". Current dialog wording could not be verified beyond the group name. |
| Labels submenu | Price-scale menu → Labels | "Bid and Ask Labels" (blog), symbol/indicator name labels; "Labels overlapping" setting decides whether overlapping labels are hidden or stacked (configuration article). |
| Plus button | Price-scale menu "Plus button"; settings "Price button to create alerts" | Hover the scale to get "+" → alert / order / horizontal line at that price. |
| Currency and unit labels | Settings → Scales and lines → "Currency and unit visibility" ("Currency and Units" in the older article); live selectors `currency-label-selector`, `unit-label-selector` | Help Center currency/unit article. |
| Scale position | "Move scale to left/right"; "Scales position" in settings; "Merge all scales into one" | Help Center folder "How to adjust the scales on a chart?". |
| Margins | Settings → Canvas → Margins: "Distance between the price line and upper, bottom, or right edges" | Right margin = empty space after the last bar (Advanced Charts `chart_property_page_right_margin_editor`; Lightweight Charts `timeScale.rightOffset`). |
| Pane buttons | Settings → Canvas → Pane buttons: "Move them up and down, collapse, maximize, and remove them" | Buttons appear at a pane's right corner on hover. |
| Navigation buttons | Settings → Canvas → Navigation buttons: "Visibility of navigation and panel buttons" | Zoom in/out, scroll left/right, "scroll to the most recent bar", "Reset chart view". |
| Pop-up hints | Featureset `popup_hints` — "Shows pop-up hints about possible mouse/shortcut/UI actions." | Seen live: "Press and hold to see detailed chart values" with a "Got it!" button. |
| Hotkey list in-app | Ctrl + / or Cmd + / | Blog "New shortcuts to access Rectangle and shortcuts list". |
| Reset everything | Alt + R "Reset chart view" | Resets zoom/scroll and scales. |

## 14. Bar Replay, snapshot, fullscreen, undo (interaction details only)

- **Bar Replay** (header "Bar replay" button, "resembling a video rewind button"): choose the start with **Select bar** (hover shows "a blue vertical line with scissors", click a bar), **Select the first available day**, or **Random bar**; controls **Play**, **Forward** (one step), speed selector (features page: "9 replay speeds", "Autoplay and step-by-step mode"), **Go to…**, **Jump to real-time chart**, **X**. Hotkeys Shift + ↓ (play/pause) and Shift + → (step). Runs across all charts in a layout at once. Unsupported: Renko, Kagi, PnF, Range, Line Break, Volume Footprint, Time Price Opportunity, spread charts, tick charts; "regression Trend and Fixed Range Volume Profile tools do not work during replay". Intraday replay is a paid-plan feature (pricing page).
- **Snapshot** (header camera "Take a snapshot"): menu offers saving the image, copying the image, copying a link, and sending to X; keys Alt + Ctrl + S / Shift + Ctrl + S / Alt + S (see §1). Advanced Charts default menu: "Download image" and "Copy image", extendable with "Copy link", "Open in new tab", "Tweet image"; `snapshot_trading_drawings` includes orders/positions in the shot.
- **Fullscreen**: Shift + F / header "Fullscreen mode"; Esc exits. Library: `side_toolbar_in_fullscreen_mode`, `header_in_fullscreen_mode` decide whether the drawing toolbar and header survive fullscreen.
- **Undo / Redo**: Ctrl + Z / Ctrl + Y (header buttons too). Limits: undo only restores drawings on the symbol currently open; a deleted *layout* cannot be restored at all.

## 15. What this means for OnStock

OnStock's chart today (`src/components/CandleChart.jsx`, Lightweight Charts 5.2.1): `crosshair.mode: Normal`, `handleScroll.vertTouchDrag: false` (so a vertical finger drag scrolls the page), `timeScale.fitContent()` on every data load, `rightOffset: 2`, an OHLC readout above the chart fed by `subscribeCrosshairMove`, timeframe and indicator chips in `CandlesPanel.jsx`, a Gap | Candles toggle and a desktop watchlist pane (`min-width: 64rem`) in `AssetDetail.jsx`. There is no keyboard handling on the chart at all. Given that:

1. **Adopt — interval typing.** Digits = minutes, letter suffix = D/W/M. OnStock has exactly six buckets (1m/5m/15m/1h/4h/1D), so map `1`, `5`, `15`, `60`, `240`, `D` to the chips and show a small "Change interval" prompt like TradingView's; typing an unsupported value should snap to the nearest chip the way `coerceTimeframe` already does when switching sides.
2. **Adopt — type-to-search and Ctrl + K.** Any letter on the chart opens symbol search; ↑/↓/Enter pick. OnStock's watchlist pane already exposes `onSwitchAsset`; a search box that opens on keypress is the single most "TradingView on a PC" thing to add.
3. **Adopt — watchlist stepping keys.** ↓ / Space next symbol, ↑ / Shift + Space previous, Alt + W add-to-watchlist (OnStock: `toggleWatchlist`). Cheap and directly reuses existing state.
4. **Adopt — scale physics the library already gives for free.** Lightweight Charts ships wheel zoom, drag-pan, axis-drag scaling and double-click-axis reset on by default; add the visible pieces TradingView layers on top: an **Auto** chip that lights up when the user has dragged the axis, **Alt + R / "Reset chart view"**, and a **scroll-to-latest** button (`timeScale().scrollToRealTime()`), because `fitContent()` on every fetch currently throws away the user's zoom.
5. **Adopt — Shift + click measure.** Implement with `subscribeClick` plus an overlay showing price change, %, bars and elapsed time, exactly TradingView's four numbers. Adapt for the Gap chart: measure in gap points / percentage points.
6. **Adopt — data window and long-press tracking.** The readout already shows O/H/L/C and time; add Change and Vol to match TradingView's Data window, and keep the library's tracking mode (`TrackingModeExitMode.OnNextTap`) on touch. A first-run "Press and hold to see values" hint is worth copying verbatim in spirit.
7. **Adapt — countdown to bar close.** Show it for token candles (live GeckoTerminal buckets). For Yahoo stock candles, follow TradingView's own rule for delayed data: hide the countdown on any interval shorter than the delay, otherwise it lies.
8. **Adapt — crosshair sync.** TradingView syncs the crosshair across charts in a layout. On OnStock desktop the natural pair is the Gap chart and the Candles chart (or token vs stock candles side by side): one hover, both charts' readouts move. Use `subscribeCrosshairMove` + `setCrosshairPosition` on the sibling. "Lock vertical cursor line by time" is the same idea frozen in place and is useful for comparing the token and the share at one instant.
9. **Adapt — Go to date.** Alt + G with a date picker that calls `timeScale().setVisibleRange`; disclose the data floor (GeckoTerminal history is shallow, Yahoo daily is deep) the way TradingView marks "the first available bar… with a red label".
10. **Adapt — right-click "Add alert at {price}".** TradingView's chart menu puts "Add alert on X at price…  Alt + A" first. OnStock already has price and gap-drift alerts; a context menu with "Add alert at 12.34" (Candles) and "Add gap alert at 1.2%" (Gap chart) is a natural bridge, plus "Copy price".
11. **Adopt — snapshot keys.** `chart.takeScreenshot()` in Lightweight Charts returns a canvas; wire Shift + Ctrl + S (copy image) and Alt + Ctrl + S (download). Skip the hosted-link variant.
12. **Adopt — Ctrl + / shortcut list and Shift + F fullscreen.** Both are a few lines and make the rest discoverable.
13. **Skip — drawing tools, magnet, floating toolbar, object tree.** No drawings exist in OnStock; this is TradingView's largest interaction surface and none of it serves the gap thesis yet.
14. **Skip — Bar Replay.** Needs deep intraday history; GeckoTerminal does not supply it and the feature does not explain a gap.
15. **Skip — trading hotkeys (Shift + B / Shift + S, DOM clicks).** OnStock hands trades to Jupiter and the owner is security-cautious; one-key order placement on a chart should never exist here. Keep the Plus-button idea only for alerts and lines, never orders.

## Sources

Help Center (tradingview.com/support):

- https://www.tradingview.com/support/shortcuts/ (read live in a browser; JS-rendered)
- https://www.tradingview.com/support/solutions/43000623399-desktop-app-keyboard-shortcuts/
- https://www.tradingview.com/support/folders/43000561752-hotkeys-and-tips/
- https://www.tradingview.com/support/solutions/43000537228-how-to-use-measure-tool-quickly/
- https://www.tradingview.com/support/solutions/43000537219-how-to-select-several-objects/
- https://www.tradingview.com/support/solutions/43000537251-how-to-clone-drawings/
- https://www.tradingview.com/support/solutions/43000537268-how-to-draw-lines-at-a-45-angle/
- https://www.tradingview.com/support/solutions/43000538248-how-to-drag-drawings-horizontally-vertically/
- https://www.tradingview.com/support/solutions/43000542366-how-to-quickly-add-a-symbol-to-the-watchlist/
- https://www.tradingview.com/support/solutions/43000543012-how-do-you-change-the-symbol-or-ticker-on-a-chart/
- https://www.tradingview.com/support/solutions/43000543883-custom-chart-intervals-personalizing-your-analysis/
- https://www.tradingview.com/support/solutions/43000665813-how-to-collapse-separate-panes/
- https://www.tradingview.com/support/solutions/43000682552-how-to-move-multiple-drawing-objects-at-the-same-time/
- https://www.tradingview.com/support/solutions/43000699223-how-to-create-an-order-alert-and-price-line-anywhere-on-the-chart/
- https://www.tradingview.com/support/solutions/43000645256-how-to-enable-the-plus-button-on-the-price-scale/
- https://www.tradingview.com/support/solutions/43000722509-magnet-mode/
- https://www.tradingview.com/support/solutions/43000476233-the-countdown-is-not-displayed-on-the-chart/
- https://www.tradingview.com/support/solutions/43000759580-how-to-enable-disable-floating-data-tooltip/
- https://www.tradingview.com/support/solutions/43000762826-how-to-enable-autoscale/
- https://www.tradingview.com/support/folders/43000549291-how-to-adjust-the-scales-on-a-chart/
- https://www.tradingview.com/support/solutions/43000475599-how-to-invert-reverse-the-chart-price-scale/
- https://www.tradingview.com/support/solutions/43000565621-how-do-i-enable-disable-the-currency-unit-label-on-the-price-scale/
- https://www.tradingview.com/support/solutions/43000762933-how-to-remove-the-blank-space-next-to-the-price-scale/
- https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/
- https://www.tradingview.com/support/solutions/43000746464-tradingview-supercharts-all-you-need-to-know/
- https://www.tradingview.com/support/solutions/43000746682-tradingview-symbol-search-tips-for-finding-assets/
- https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/
- https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/
- https://www.tradingview.com/support/solutions/43000512928-how-can-i-enable-disable-the-drawings-toolbar/
- https://www.tradingview.com/support/solutions/43000760814-how-to-set-removal-of-locked-drawings/
- https://www.tradingview.com/support/solutions/43000484389-how-to-restore-hidden-drawings-indicators-charts/
- https://www.tradingview.com/support/solutions/43000481234-how-to-maximize-a-chart-in-multichart-layout/
- https://www.tradingview.com/support/solutions/43000629993-i-would-like-to-resize-the-charts-of-my-layout/
- https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/
- https://www.tradingview.com/support/solutions/43000629990-leveraging-multi-chart-layouts-in-your-analysis/
- https://www.tradingview.com/support/solutions/43000665052-how-to-enable-status-line-on-all-charts-in-layout/
- https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
- https://www.tradingview.com/support/solutions/43000740649-how-can-i-keep-chart-position-in-time-after-applying-a-new-interval/
- https://www.tradingview.com/support/solutions/43000472769-i-can-t-see-the-crosshair-line/
- https://www.tradingview.com/support/solutions/43000502564-i-can-t-see-ohlc-indicator-values-and-the-crosshair-cursor/
- https://www.tradingview.com/support/folders/43000554186-i-am-having-issues-using-the-chart-on-mobile-device/
- https://www.tradingview.com/support/categories/mobileApps/
- https://www.tradingview.com/support/folders/43000558390-application-settings/
- https://www.tradingview.com/support/folders/43000558391-other-questions/
- https://www.tradingview.com/support/solutions/43000747376-how-to-select-replay-interval-for-the-bar-replay-in-mobile-apps/
- https://www.tradingview.com/support/solutions/43000712747-bar-replay-how-and-why-to-test-a-strategy-in-the-past/
- https://www.tradingview.com/support/solutions/43000474024-how-do-i-turn-bar-replay-on/
- https://www.tradingview.com/support/solutions/43000482537-how-do-i-take-a-snapshot-and-share-it-afterwards/
- https://www.tradingview.com/support/solutions/43000710643-how-to-use-the-command-palette-and-keyboard-shortcuts/
- https://www.tradingview.com/support/solutions/43000724233-chart-view-mode/ (screener chart view; read, not used)

Live product (read in a browser on 2026-09-06):

- https://www.tradingview.com/chart/ (guest, AAPL 1D — context menus, toolbar labels, Go to dialog, Data window, cursor and magnet menus, Timezone menu)
- https://www.tradingview.com/features/
- https://www.tradingview.com/pricing/

TradingView blog:

- https://www.tradingview.com/blog/en/faster-and-more-convenient-hotkeys-for-working-with-charts-20914/
- https://www.tradingview.com/blog/en/new-shortcuts-rectangle-shortcuts-list-42318/
- https://www.tradingview.com/blog/en/hotkeys-for-the-bar-replay-20594/
- https://www.tradingview.com/blog/en/countdown-on-any-time-interval-16488/
- https://www.tradingview.com/blog/en/magnet-snaps-to-indicators-instantly-50979/
- https://www.tradingview.com/blog/en/drawing-on-the-chart-just-got-easier-14315/
- https://www.tradingview.com/blog/en/floating-data-window-under-your-cursor-52715/
- https://www.tradingview.com/blog/en/crosshair-syncing-in-tradingview-desktop-app-30157/
- https://www.tradingview.com/blog/en/lock-chart-position-switch-intervals-48558/
- https://www.tradingview.com/blog/en/new-track-value-mode-in-mobile-version-12113/
- https://www.tradingview.com/blog/en/multi-chart-view-on-a-mobile-screen-10924/
- https://www.tradingview.com/blog/en/show-last-price-and-percentage-value-9239/
- https://www.tradingview.com/blog/en/display-bid-ask-labels-and-levels-19761/
- Could not fetch (404 today): the "Go to Date" launch post (`…/new-chart-feature-8220-go-to-date-8221-1187/`), "Lock Cursor on Time Axis" (`…/lock-cursor-on-time-axis-1113/`), "Scale ratio is now available" (`…/scale-ratio-now-available-tradingview-5998/`); their content is cited from search snippets only.

Official TradingView idea posts (published by the TradingView account):

- https://www.tradingview.com/chart/NVDA/vf2IlYm6-TradingView-Masterclass-How-To-Use-The-Top-Toolbar/
- https://www.tradingview.com/chart/GC1!/l3H7kI3z-How-To-Use-TradingView-Hotkeys-and-Shortcuts/
- https://www.tradingview.com/chart/DXY/j9Ua6Ks4-Keyboard-shortcuts-Analyze-create-and-study-charts-faster/
- https://www.tradingview.com/chart/GC1!/sbaKDzZc-6-keyboard-shortcuts-for-faster-sharing-note-taking-charting/
- https://www.tradingview.com/chart/CL1!/p9BePUhq-Quickly-Measure-Time-Change-Hold-Shift-Click-the-Chart/
- https://www.tradingview.com/chart/BTCUSD/wrHsalfY-Did-you-know-that-you-can-zoom-to-a-specific-place-on-the-chart/
- https://www.tradingview.com/chart/TSLA/qw8dRAeQ-TradingView-Masterclass-How-To-Use-Drawing-Tools/

Advanced Charts (charting library) documentation:

- https://www.tradingview.com/charting-library-docs/latest/configuration/Shortcuts/
- https://www.tradingview.com/charting-library-docs/latest/getting_started/Shortcuts/
- https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets/
- https://www.tradingview.com/charting-library-docs/latest/mobile_specifics/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Time-Scale/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/context-menu/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/Toolbars/
- https://www.tradingview.com/charting-library-docs/latest/getting_started/accessibility/

Lightweight Charts documentation (OnStock's chart library):

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScaleOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/KineticScrollOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TrackingModeOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScaleOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions

OnStock repository files read: `src/components/CandleChart.jsx`, `src/components/CandlesPanel.jsx`, `src/screens/AssetDetail.jsx` (grep), `package.json`.
