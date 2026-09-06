# TradingView teardown — surface 06: Layouts and multi-chart

Date: 2026-09-06. Part of the 13-surface TradingView teardown that is the reference material for OnStock's desktop ("on a PC it should be like TradingView").

Scope of this file: the **Layout setup** menu (every grid configuration that TradingView documents, and how the list grew over time), **charts-per-layout limits per plan**, the **synchronization options** inside a layout (symbol, interval, crosshair, time, date range, drawings, indicators, chart settings, selective sync groups), **layout tabs** (the desktop app's tab bar and tab linking), **saving / cloning / sharing / auto-saving layouts**, the **cloud layout limit per plan**, **detaching charts and tabs into separate windows** (desktop app), the **Maximize chart** and **Fullscreen mode** controls, and how the **left/right toolbars and bottom panel** relate to a layout. Watchlists, alerts, indicators, drawings and the other surfaces belong to their own files and are only mentioned where a layout touches them.

How to read the tables: "Label" is the option text exactly as TradingView writes it (quoted from the Help Center, the TradingView blog, the raw HTML of the pricing page, or the Charting Library docs); "Where" is the menu path or panel; "Plan" is the tier that unlocks it if gated. Where a claim could not be confirmed from a source I actually read, it says **could not verify** rather than guessing. Source numbers in square brackets point at the Sources list at the end.

Plan names used below are the ones in today's pricing comparison table: **Basic** (free), **Essential**, **Plus**, **Premium**, **Ultimate** [1]. An **Expert** tier also exists: it is referenced by several Help Center articles and is present as a product SKU (`pro_expert`, "TradingView Expert Account", $119.95 monthly / $99.95 on annual billing) in the pricing page's embedded data, but it is **not a column in the public comparison table** [1]. Where a source uses Expert I say so.

One naming note up front: TradingView has renamed this button over the years. Older Help Center articles and blog posts call it **"Select Layout"** / **"Select layout"**; the 2024-2025 articles and the current Supercharts primer call it **"Layout setup"**; the June 2024 blog calls it the **"Choose chart layout"** button [2], [3], [27], [28], [33]. They are the same grid-icon button on the top toolbar. I quote whichever label the cited source uses.

---

## 1. What a layout is (and is not)

| Concept | TradingView's definition (verbatim where possible) | Source |
|---|---|---|
| Layout | "A chart layout includes the look, fill, design, all chart settings, and even drawings applied to the chart" — "your workspace that can be saved for later use." A layout is a container for charts, their settings, drawing tools and indicators, "identified by a unique URL." | [6], [7] |
| Chart | "a component of the layout. This single picture box displays one series (symbol)" plus its scales, indicators, separate panes and drawing tools. | [7] |
| How many charts | "from 1 to 16 charts", the maximum depending on the subscription (see section 3). | [7] |
| What a layout remembers | "When you open your layout, it'll display the latest used interval and symbol. It also remembers the indicators." | [6] |
| What a layout does NOT store | "watchlists and alerts are not stored in layouts." (They are account-wide widgets.) | [7] |
| Per-chart vs per-layout | "Each layout is a separately saved workspace, and the charts within them retain their own settings and can be customized independently, but you can also choose to sync them." Chart settings are "not synchronized between layouts." | [27], [7] |
| Deletion | "Deleted layouts and drawing objects cannot be restored." | [7], [47] |

---

## 2. The Layout setup menu — grid configurations

### 2.1 Where it lives

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| "Layout setup" (current name) / "Select Layout" (older articles) / "Choose chart layout" (June 2024 blog) | Grid icon on the **top toolbar**, in the group after Undo/Redo and before the layout-name ("Manage layouts") button | "In the layout setup menu, you can configure the number and placement of charts." Choose a grid; the bottom of the same dropdown holds the "Sync in layout" toggles (section 4). | [27], [2], [3], [28], [51] |
| Top-toolbar position (Masterclass, left to right) | Symbol Search → Time Intervals → Chart Types → Indicators, Strategies, and Metrics → Indicator Templates → Alert → Bar Replay → Undo/Redo → **Multi-chart Layout** → **Manage Layouts** → Quick Search → Chart Settings → **Fullscreen Mode** → Snapshot and Publish | The Masterclass idea post lists the toolbar in this order; the layout grid button is described as letting you analyse "multiple charts on your screen at the same time." | [51] |

### 2.2 Which grids exist

TradingView's Help Center does **not** list the individual grid icons by name; the menu is a picture grid. What follows is every configuration TradingView itself has put in writing, plus the count of options it announced over time. Arrangement wording in the "Documented as" column is TradingView's own unless marked *(third party)*.

| Charts | Documented arrangements | Documented as | Plan needed to use it | Source |
|---|---|---|---|---|
| 1 | single chart | the default | Basic | [1] |
| 2 | side by side; stacked | "two side by side, two stacked" *(third party)*; the Charting Library exposes the same pair as `2h` "two charts split vertically" and its counterpart | Essential+ | [52], [49] |
| 3 | not individually described by TradingView | — | Plus+ | [1] |
| 4 | 2x2 grid; other 4-chart arrangements | "2x2 Grid" and "1 large + 3 small" *(third party)*; May 2025 blog: "4 and 5-chart layouts: 10 new configurations added" | Plus+ | [55], [33] |
| 5 | 2 above + 3 below; 5 in a row | July 2022 blog: "5 charts arranged as 2 above and 3 below", "5 charts per line" | Premium+ | [34] |
| 6 | 6 in a row; a 6-chart grid | July 2022 blog: "6 charts per line"; May 2025 blog: one new 6-chart grid | Premium+ | [34], [33] |
| 7 | 7 in a row; two more | July 2022 blog: "7 charts per line"; May 2025 blog: "7-chart layouts: 2 new options added" | Premium+ | [34], [33] |
| 8 | 8 in a row; 4x2 | July 2022 blog: "8 charts per line"; "3x2 or 4x2 Grid" *(third party)* | Premium+ | [34], [55] |
| 9 | row, column, 3x3 | June 2024 blog: "add up to 9 charts to a single layout and arrange them in a row, column, or 3×3 grid" — part of "12 new chart layout patterns"; May 2025 blog: one more 9-chart grid | "only users with an Expert subscription or higher can display more than 8 charts per tab" | [28], [33] |
| 12 | one 12-chart grid | May 2025 blog: "6, 9, and 12-chart layouts: 1 new grid option for each" | Ultimate (Expert caps at 10 — see 3.1) | [33] |
| up to 16 | — | Features page: "Up to 16 charts per screen" | Ultimate | [31], [1] |

Timeline of the menu's growth, for context:

| Date | Change | Source |
|---|---|---|
| May 19, 2022 | "Date range" added to the "Sync in Layout" section of the Select Layout menu | [35] |
| July 20, 2022 | Five grids added: 5 (2+3), 5-, 6-, 7- and 8-per-line — "the chart grids most requested by our users" | [34] |
| June 28, 2024 | "12 new chart layout patterns"; 9-chart layouts (row / column / 3×3); Expert+ for more than 8 charts per tab | [28] |
| May 14, 2025 | 10 new 4- and 5-chart configurations, 2 new 7-chart, 1 new each for 6, 9 and 12 charts; accessed via the "Layout setup" button | [33] |

### 2.3 Resizing and maximizing charts inside a grid

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| drag a chart border | Between charts in the layout | "To resize a chart, just drag one of its sides." Hold **Shift** to "move several chart borders at the same time." **Double-click** any border to reset charts to their default proportions. On mobile: single-tap a border to select it, drag to resize, double-tap to reset. | [44] |
| "Maximize chart" | Button in the **lower right corner** of the selected chart; also **Alt+Enter** / **⌥+Enter**, or **Alt+Click** / **⌥ Click** on the chart | Expands one chart to fill the layout; use the same control to return. "To switch between charts in multi-chart layout, just press **Tab**." | [19], [20], [2] |
| Scroll and zoom buttons | On each chart | "Each chart includes scroll and zoom buttons." | [2] |
| Whether custom border positions are saved with the layout | — | **could not verify** — the resize article does not say. | [44] |

---

## 3. Charts-per-layout and layout-count limits per plan

### 3.1 The numbers

Row labels are verbatim from the pricing page's comparison table (read from the raw HTML). The Premium and Ultimate cells of the saved-layouts row are rendered as an **infinity icon** (`infinityIcon` in the markup), i.e. unlimited, not a number [1].

| Row label (verbatim) | Basic | Essential | Plus | Premium | Expert (not in table) | Ultimate | Source |
|---|---|---|---|---|---|---|---|
| "Charts per tab" | 1 | 2 | 4 | 8 | 10 ("10 charts in one layout for Expert plans" — Help Center) | 16 | [1], [30] |
| "Number of saved chart layouts" | 1 | 5 | 10 | ∞ (infinity icon) | **could not verify** | ∞ (infinity icon) | [1] |
| "Simultaneous chart connections" | 2 | 10 | 20 | 50 | **could not verify** | 200 | [1] |
| Monthly / annual price (USD, pricing page data) | free | $14.95 / $12.95 | $34.95 / $29.95 | $69.95 / $59.95 | $119.95 / $99.95 | $239.95 / $199.95 | [1] |

Cross-checks: two third-party plan comparisons dated June and August 2026 report the same charts-per-tab and connection numbers, and the June one reports "Unlimited" saved layouts for Premium and Ultimate, matching the infinity icon [41], [42]. The Help Center's per-tab wording: "Essential users can open 2 charts per one tab, Plus users can open up to 4 charts, Premium users can open up to 8 charts per one tab, and Professional plans provide 10 charts in one layout for Expert plans and 16 charts in one layout for Ultimate plans" [30], [2].

### 3.2 What happens at the limit

| Situation | TradingView behaviour (verbatim where possible) | Source |
|---|---|---|
| Creating a layout past the saved-layout cap | The "I cannot create a new layout" article: check "the maximum number of saved layouts for your subscription plan" on the Pricing page, open the layout folder to confirm the count, then delete layouts or upgrade. | [22] |
| Chart connections | "Each tab in the web version and apps is counted as one connection." "one connection is considered one open page/chart." Supercharts support "up to 200 simultaneous chart connections". Past the limit "the oldest connection (the earliest opened tab) will get closed", a pop-up offers "Restore connection", and "Restoring the current connection when the maximum connections limit has already been exceeded will terminate the connection in another tab." If you close the popup the chart stays disconnected until you refresh. | [13], [30] |
| Multi-chart layouts vs connections | Both connection articles tell you to "use the multi-chart layouts feature" as a way to "optimize your connections", i.e. one tab holding an 8-chart layout is cheaper than 8 tabs. Neither article states in so many words that a multi-chart tab counts as exactly one connection — **could not verify** the exact accounting. | [13], [30] |
| Layout too large to save | "Your chart is too large and cannot be saved" appears when "the size of your chart layout has exceeded our maximum limit" (the limit itself is not disclosed). Remedy: delete drawings in the "Manage Drawings" window, or start a new layout. | [26] |

---

## 4. Synchronization inside a layout

### 4.1 The "Sync in layout" toggles

These live at the bottom of the Layout setup / Select Layout dropdown. The Help Center's list: "symbol, crosshair, interval, time and date range" [3]; the 2022 blog names the section "Sync in Layout" and the option "Date range" [35]. The Charting Library (which is the same engine) exposes exactly the same five as `symbolSync`, `intervalSync`, `crosshairSync`, `timeSync`, `dateRangeSync` — "Charts can be synchronized by a symbol, interval (resolution), crosshair, time, and date range." [49], [50].

| Label (verbatim) | What it does | Notes | Source |
|---|---|---|---|
| "Symbol" | Changing the symbol on one chart changes it on every chart in the layout. | The classic "same ticker, several timeframes" setup: "make sure that the sync option for Symbol is enabled and that the sync for Interval is turned off." Independent of the toggle, "double-click a symbol in the watchlist" changes the symbol "across all chart layouts simultaneously" — i.e. the watchlist double-click is a layout-wide symbol change regardless of sync state. | [3], [5], [8] |
| "Interval" | Changing the timeframe on one chart changes it on all. | Turn off for multi-timeframe layouts. | [3], [5] |
| "Crosshair" | The crosshair position follows the mouse across all charts. | Side effect the Help Center documents: enabling "Crosshair synchronization" is how you get the indicator status line values "simultaneously on all charts in the window." | [3], [14] |
| "Time" | Synchronizes time position across charts. | The Charting Library describes it as "synchronizes time positions across multiple charts"; the Help Center lists it but does not explain how it differs from Date range — **could not verify** the precise behavioural difference from an official source. | [3], [50] |
| "Date range" | "scrolling and changing the visible date range of one of the charts will be synchronized with all other charts in this window." | Added May 2022. "only works with time-based chart types — Bars, Candles, Hollow Candles, Line, Area, Baseline, and Heikin Ashi" (so not Renko / Kagi / P&F / Range). | [35], [43] |

### 4.2 Selective sync — groups

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| "Chart Syncing" button / "Symbol/interval chart syncing icon" | In each chart's **Status line**, or in the **Series context menu** (right-click the price series) | With "Symbol sync, Interval sync, or both" enabled in the layout menu, "Add the necessary charts to the group by marking them with an emoji in the Status line or Series context menu: click the Chart Syncing button and select an emoji from the list." Charts with the same emoji sync together; "To remove a chart from a group, simply uncheck the emoji." | [4], [3] |
| Group identity | — | Groups are identified by **emoji**, not by number or colour (a third-party guide describes them as colour groups; the Help Center says emoji). | [4], [55] |
| Plan gating | — | None mentioned. | [4] |

### 4.3 Drawings

Drawings are their own surface, but their sync modes are layout-scoped, so the relevant labels are here.

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| Drawing-sync button (three states) | "the button on the left panel" (drawings toolbar), available once multi-chart mode is on | **Disabled**: "Drawing objects will be saved only on a specific chart of a particular layout." **Layout**: "Synchronizes the drawings on the current symbol across all charts in the current layout." **Global**: "Drawing objects will be synchronized across all charts and layouts, which means they will appear even in completely new layouts." | [15], [3] |
| "Sync drawings in layout" | Icon in the drawings panel | "will make drawings appear on every new chart for the same symbol within that layout" | [2], [6] |
| "Sync drawings globally" | Icon in the drawings panel | "will save your drawings on every new chart for the same symbol, even if you create a new layout" | [2], [6] |
| "Sync in layout" / "Sync globally" (per object) | A drawing's context menu | Sync a single drawing without changing the global mode. "Disabling synchronization on a drawing object removes it from other charts"; switching a global object to a narrower mode "will remove it from all other layouts." | [15], [7] |
| Same-symbol rule | — | "drawings can only be synchronized on charts that contain the same symbol." Change symbol and the drawings disappear; return and they reappear. | [3], [2] |
| Real-time cross-device sync needs Autosave | — | "Objects are globally synchronized between different windows/tabs/devices in real-time only when the layouts autosave is enabled. If autosave is disabled, objects are synchronized once only after manual saving." | [15] |

### 4.4 Indicators and chart settings

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| (automatic on first split) | Switching a single chart into a multi-chart grid | "When you choose multiple charts, all the indicators and strategies from the initial chart will apply to the additional charts." But "chart settings from the initial chart will not be transferred to the additional charts." | [2] |
| "Add this indicator to entire layout" | Right-click an indicator | Applies that one indicator to every chart in the layout. | [45], [7] |
| "Apply these indicators to entire layout" | Right-click a chart | Applies all of that chart's indicators to every chart. | [45], [7] |
| "Apply to all" | Chart **Settings** dialog | "Settings are individual for each chart"; this button copies the current chart's settings "to all other charts in the layout." | [37] |
| Indicators across layouts | — | Indicators "operate independently across layouts and charts"; no global indicator sync (indicator templates, a different surface, are the workaround). | [7] |

---

## 5. The Manage layouts menu — save, autosave, rename, copy, share, open, delete

### 5.1 Where it lives

The layout's **name** on the top toolbar (immediately right of the grid button) is the "Manage layouts" button; clicking it opens a dropdown. The Masterclass describes it as "Create, rename and load all the layouts that you save" [51]; the Supercharts primer: "Here, you can also rename your chart, share and copy it, export data, create a new layout, or open one of previously saved layouts." [27].

### 5.2 Menu items

Order and wording follow the "TradingView layouts: a quick guide" article [6], with the delete/open articles for the dialog [46], [23].

| Label (verbatim) | What it does | Shortcut | Source |
|---|---|---|---|
| "Save layout" | "Save layout to avoid losing changes." When there are unsaved changes a blue **"Save"** word appears "under the layout's name" — click it, or use the shortcut. | **Ctrl+S** (Windows) / **Cmd+S** (macOS) | [6], [24] |
| "Autosave" | "Toggle Autosave to automatically keep control of changes." With it on, "created drawing objects and their changes are saved instantly." Default state: **could not verify**. | — | [6], [24], [15] |
| "Rename" | Rename the layout ("rename your chart" in the primer). Third-party guides list it as "Rename". Exact dialog wording **could not verify**. | — | [27], [57] |
| "Sharing" (toggle) → "Copy link" | "If Sharing is on, 'Copy link' will appear. Send this link to anyone to share your chart with its unique settings" — "only creator can modify". See 5.3. | — | [6] |
| "Make a copy" | "Make a copy of the chart if you want to keep this layout and have another with some of the features of the existing one." This is TradingView's "clone"; the Help Center also recommends it as the only backup: "As a backup, you can create copies of your layouts after making major changes." | — | [6], [47] |
| "Export chart data" | "download a CSV file to store the data, perform quantitative analysis, or for other needs" (the pricing page lists "Download chart data" as a paid-plan row). | — | [6], [1] |
| "Create new layout" | "click the 'Create new layout' button, then type in the name of the new layout." Hitting the plan's layout cap errors here (3.2). Desktop app 3.0.0 also starts new layouts "from the Layouts section on the New Tab" with "a naming dialog". | — | [6], [22], [38] |
| "Recently used" (list inside the dropdown) | The dropdown shows recent layouts inline. | — | [6] |
| "Open layout" / "Open layout…" | "Go to Open layout to see all your layouts that are not displayed in Recently used." Opens the full list. | the **"."** ("Dot") key | [6], [23] |
| "Remove" (trash can) in the Open layout dialog | "hover over the layout name you want to delete, click the 'Remove' (trash can) button on the right, and confirm your choice." "This action cannot be undone"; "all drawings and indicators saved in it will also be deleted." Restoration: "Unfortunately, we are unable to restore the layout after it has been deleted." | — | [46], [47] |
| Search / sort / favourites inside the Open layout dialog | **could not verify** — none of the Help Center articles I read describe them. | — | [23] |

### 5.3 Sharing a layout

| Item | TradingView behaviour (verbatim where possible) | Source |
|---|---|---|
| Default | "By default, saved charts remain private and invisible to other users, even with a link." | [25] |
| Turn on | "Select the upward arrow positioned to the right of the Chart Layout" (the share arrow), toggle **"Sharing"** on; or turn on "Sharing" in the Manage layouts dropdown, then **"Copy link"** (or copy the browser URL). | [48], [6] |
| What the recipient gets | The link opens in **"View Only"** mode with a **"Copy"** button that lets them "save the layout as their own." "Recipients must maintain active login status to view charts and indicators correctly." | [48] |
| Snapshot semantics | "The version of the chart at the time of sharing is saved, and all subsequent changes by the author will not be displayed on the copies." | [48] |
| Scope | Per layout ("Sharing operates on a per-chart layout basis"). | [48] |
| Plan gating | None mentioned. | [25], [48] |

### 5.4 Save conflicts across tabs and devices

"When the same layout is accessed simultaneously across multiple browser tabs or different devices, TradingView strongly recommends manually saving the layout independently in each tab following any modifications." Otherwise the last tab to save wins and edits can be lost [24]. Drawings sync live across devices only with Autosave on [15].

---

## 6. Layout tabs (desktop app)

The web version has no in-page layout tabs: one browser tab = one layout = one connection [13]. Tabs are a **TradingView Desktop** (Windows / macOS / Linux) feature [10]. The desktop tab bar is a browser-style tab strip where each tab is a chart layout, a screener, or another product page.

### 6.1 Tab basics

| Label (verbatim) | Where | What it does | Shortcut | Source |
|---|---|---|---|---|
| "Open New tab" | Tab bar / app menu | New tab; since desktop 3.0.0 the **New Tab** page is "customizable. Choose which products appear on your New Tab" and has a "Layouts section". | **Ctrl+T** / **Cmd+T** | [21], [38] |
| "Duplicate tab" | Tab context menu | Clone the current tab. | **Ctrl+U** / **Cmd+U** | [21] |
| "Close window" (closes the current tab/window) | — | — | **Ctrl+W** / **Cmd+W** | [21], [11] |
| "Open an accidentally closed window or tab" | — | — | **Shift+Ctrl+T** / **Shift+Cmd+T** | [21] |
| "Switch to next/previous tab" | — | — | **Ctrl+Pg Dn/Up** or **Ctrl+Tab / Shift+Tab** (Windows/Linux); **⌘+⌥+←/→** on macOS (added 1.0.17) | [21], [38] |
| "Go to specific tab" / "Go to rightmost tab" | — | — | **Ctrl+1…8** / **Cmd+1…8**; **Ctrl+9** / **Cmd+9** | [21] |
| "Reload tab" | — | — | **Ctrl+R** or **F5** / **Cmd+R** | [21] |
| "Pin tab" / "Unpin tab" | Right-click the tab title | "lock some of your most frequently used tabs to the left"; pinned tabs have no close button; "You can't mix pinned and unpinned tabs"; "The tab's pinned state is preserved when it is detached/attached, restored after being closed, or exited/launched the app." Closing a pinned tab: Ctrl+W / Cmd+W, right-click → "Close", or unpin first. | — | [11] |
| "Close other tabs" / "Close tabs to the right" | Tab context menu | Both skip pinned tabs. "Close tabs to the right" added in 2.3.4. | — | [11], [38] |
| Tab title | **Settings** (Ctrl+, / Cmd+,) | Show a layout name instead of the ticker ("Crypto", "US Stocks", "FX"); **"Reset to default"** restores the ticker title. Window title shows "the ticker and layout name" (1.0.12). | — | [12], [21], [38] |
| Session restore | Automatic | Desktop "restores the ticker, interval, and active watchlist upon launch"; "App restores symbols/intervals on tabs with the multi-chart layout" (1.0.12); since 3.2.0 "every tab now remembers the Watchlist along with its width and height, the products opened as overlays". | — | [10], [38] |

### 6.2 Tab linking (symbol / interval / date range / time across tabs)

| Label (verbatim) | Where | What it does | Source |
|---|---|---|---|
| "color tag" | On each tab | "Set the same color tag to a few tabs, and they will start following the ticker change made in any of them." "You can link not only chart tabs but can also link the screener with a chart." The exact name of the button that assigns the colour is not written in the article (it is shown in a GIF) — **could not verify** the label. | [9], [10] |
| Interval linking | same color tag | Desktop 2.13.0 (Sept 22, 2025): "Enhanced tab linking — tabs can now be synced not only by symbol, but also by interval". | [38] |
| Date range / time linking | same color tag | Desktop 3.1.0 (April 21, 2026): "Expanded tab linking — date range and time now sync across linked tabs". | [38] |
| Crosshair across tabs/windows | Desktop **Settings** | "Synchronize crosshair across tabs and windows"; a "Setting for enabling/disabling crosshair sync across app windows" was added in 1.0.10. The exact toggle label: **could not verify**. | [10], [38] |

---

## 7. Detaching charts into separate windows (desktop app)

| Label (verbatim) | Where | What it does | Shortcut | Source |
|---|---|---|---|---|
| "New Window" button | On the window title bar (and the tab bar since 2.1.0), or the app menu | "You can open as many windows of TradingView Desktop as you need." Intended for "multi-display configurations, so you can have a dedicated app window for each display." | **Ctrl+N** / **Cmd+N** | [17], [38], [21] |
| Detach a tab | Drag a tab out of the tab bar | "open a new window with the shortcut Ctrl/Cmd+N or just detach a tab." Tab linking and crosshair sync keep working across the detached windows. Pinned state survives detach/attach. | — | [29], [11] |
| Detaching a *single chart* out of a multi-chart layout | — | Not a feature TradingView documents. The unit you detach is the **tab** (the whole layout), not one chart of a grid — **could not verify** any per-chart pop-out. | — | [17], [29] |
| Plan | — | "Multi-monitor support now free on desktop app" (April 27, 2022, desktop 1.0.6+): previous limits on open windows were removed for free plans. Connection limits (3.1) still apply per tab. | — | [29], [13] |
| "Quit TradingView" | Dropdown in the window's title bar | Quit this way to have the app "restore all windows and their positions from the previous session"; closing windows one by one loses the arrangement. | **Shift+Ctrl+Q** / **Cmd+Q** ("Close application while preserving window and tab arrangement") | [18], [17], [21] |
| "Open link from clipboard" | App menu | Opens a copied chart link in the app (macOS/Linux lack automatic link handling; on Windows TradingView links open in-app by default via Windows "Apps > Apps for websites"). | — | [16], [58] |
| Multi-chart window shows the tab bar in full screen | — | 1.0.9: "Show the tab bar in full screen on Windows". | — | [38] |

---

## 8. Fullscreen mode

| Label (verbatim) | Where | What it does | Shortcut | Source |
|---|---|---|---|---|
| "Fullscreen Mode" (Masterclass) / "fullscreen mode" (primer) | Top toolbar, "a button located next to the chart's settings" (right end, before Snapshot) | Displays "only the chart" so you can "analyze the chart without additional noise" — top toolbar, left drawings toolbar, right toolbar and bottom panel all hide. | **could not verify** from an official page: TradingView's own shortcuts list at tradingview.com/support/shortcuts/ is rendered by JavaScript and returned no content to my fetches; "Shift+F" surfaced only in a search-engine snippet. | [27], [51], [61] |
| Browser/OS fullscreen instead | — | TradingView's X account (seen only as a search snippet) advised "You can use fullscreen mode without turning off the toolbars, just press F11." | F11 | [59] |
| "Maximize chart" vs fullscreen | — | Different things: Maximize expands one chart of a grid to fill the layout area (section 2.3); Fullscreen hides the chrome around the whole layout. | Alt+Enter / Alt+Click vs (unverified) | [19], [51] |
| Charting Library equivalent | — | Widget option `fullscreen` ("Use all available window space"); the header has a fullscreen button, and the `side_toolbar_in_fullscreen_mode` featureset keeps the drawings toolbar visible in fullscreen (seen in a search snippet of the Drawings doc). | — | [60] |

---

## 9. How the toolbars and bottom panel relate to a layout

TradingView's own names for the four regions around the chart, from the Supercharts primer [27]:

| Region (verbatim) | What it holds (verbatim) | Relationship to the layout | Source |
|---|---|---|---|
| "The top toolbar" | "Here you can choose symbols, chart intervals and types, indicators, layouts, and access other tools." | Houses Layout setup, Manage layouts and Fullscreen. Its selections (symbol, interval, chart type, indicators) are **saved in the layout**. | [27], [6] |
| "The left toolbar" | "drawing tools, which help you map your trades." | Holds the drawing-sync button (4.3). Show/hide: "click on menu in the upper left corner and show or hide the toolbar by changing the slider position." Drawings are saved per chart/layout/globally depending on the sync mode. | [27], [53], [15] |
| "The right toolbar" | "Here you can access watchlists, news, alerts, and other products in the Overlay sheet via the Products menu at the bottom." Primer's list: Watchlist, details, and news; Alerts; Object tree and data window; Screeners; Pine Editor; Calendars; News Flow; Portfolio; Fundamental Graphs; Yield Curves; Options; Macro Maps; Community feed; Notifications; Help Center. | **Not part of the layout.** "watchlists and alerts are not stored in layouts" — the right rail is account-wide state; switching layouts does not change which watchlist is open. (In the desktop app, since 3.2.0, the *tab* — not the layout — "remembers the Watchlist along with its width and height, the products opened as overlays".) | [27], [7], [38] |
| "The bottom panel" | "Here, you can switch between intervals, set the time zone, and customize the price scale." | Interval, time zone and price-scale choices are chart settings and so are saved with the layout ("Settings are individual for each chart"). | [27], [37] |
| Separate panes inside a chart | "Collapse Pane" button in the right corner of a pane; or **Ctrl/⌘ + double-click** in the pane (seen as a search snippet) | Per chart; part of the chart's saved state. Mentioned only for completeness. | [63] |

Net effect: a layout is the **chart canvas and everything drawn or configured on it**; the rails around it (watchlists, alerts, news, screener) are account-level widgets that persist across layouts and, on desktop, per tab.

---

## 10. Layouts in TradingView's embeddable library (for engineers)

The same engine is sold as **Advanced Charts** (single chart) and **Trading Platform** (multi-chart). Relevant facts if OnStock ever wants to reason about "how TradingView does it" at the API level:

| Item (verbatim) | Meaning | Source |
|---|---|---|
| "the synchronized multiple-chart layout" is a Trading Platform addition | Advanced Charts cannot do multi-chart layouts; Trading Platform "can display up to 8 charts simultaneously using the Select Layout button in the toolbar." | [49] |
| `header_layouttoggle`, `support_multicharts` featuresets | "Selecting multiple-chart layouts is enabled by default"; add both to `disabled_features` to turn it off. | [49] |
| `header_saveload` featureset | Controls the built-in "Save layout" / "Load layout" header buttons; "Layout save/load is available in Trading Platform only." | [49], [50] |
| `symbolSync`, `intervalSync`, `crosshairSync`, `timeSync`, `dateRangeSync` (`IWatchedValue<boolean>`) | The five layout sync toggles as observables ("Trading Platform only"). | [50] |
| `layout(): string`, `setLayout(layoutName)`, `chartsCount()`, `activeChart()`, `setActiveChart(index)`, `unloadUnusedCharts()` | Read/set the grid, count charts, address the active chart. The predefined layout string values (e.g. `2h` = "two charts split vertically") exist but the `LayoutType` reference page returned 404 to me — **could not verify** the full list. | [50], [49] |
| Widget options `fullscreen`, `autosize`, `width`/`height` | Sizing modes for the embedded chart. | [60] |

---

## What this means for OnStock

OnStock's desktop today is a single-chart product (`src/components/PremiumChart.jsx`, `CandleChart.jsx`, `DualLineChart.jsx`, a `WatchlistPane.jsx`, and localStorage/Supabase-backed `FoldersContext` / `AlertsContext`). Its thesis is the **gap** between a tokenized stock and its underlying share, which is inherently a two-series comparison — so multi-chart is not decoration for OnStock, it is the product's native shape.

1. **Adopt — a Layout setup grid, but small.** Ship 1, 2 (side-by-side and stacked) and 2x2 first; TradingView's own history shows the menu grew from a handful of grids to dozens over three years, and its first five additions were the ones "most requested" [34]. OnStock has one data type per pane (token candles / stock OHLC / gap / yields / news), so four panes already covers the whole thesis.
2. **Adapt — the "same symbol, several views" default instead of "same symbol, several timeframes".** TradingView's canonical layout is Symbol-sync ON, Interval-sync OFF [5]. OnStock's canonical 2x2 should be Symbol-sync ON with panes locked to *series types*: token candles, stock candles, gap series, Treasury yields — one asset, four lenses. That is a layout preset TradingView cannot express and it makes the gap thesis visible at a glance.
3. **Adopt — the five sync toggles with TradingView's exact labels: Symbol, Interval, Crosshair, Time, Date range** [3]. Crosshair sync is the one to do first: it is what makes hovering a token candle show the stock price and the gap at the same instant across panes (TradingView documents that crosshair sync is what surfaces status-line values on every chart [14]). Date range sync matters more than Interval for OnStock because token 1m candles and delayed Yahoo daily OHLC will rarely share an interval.
4. **Adapt — sync groups by emoji become "pair groups".** TradingView lets you group charts with an emoji so only some follow a symbol change [4]. OnStock's version: a pane group that always follows *the token and its underlying together* (e.g. TSLAx + TSLA), so changing the token in one pane swaps the stock in its sibling. This is the one place the gap thesis needs a sync rule TradingView does not have.
5. **Adopt — Maximize chart on a per-pane button plus Alt+Enter / Alt+Click and Tab to cycle panes** [19], [2]. Cheap, and it is how a 2x2 stays usable on a 13-inch laptop. Fullscreen (hide rails) is a separate control; ship it as a toolbar button at the right end like TradingView [51], and do not depend on a keyboard shortcut TradingView itself does not document verifiably.
6. **Adopt — draggable pane borders with Shift-drag to move several and double-click to reset** [44]. This is the behaviour users already have muscle memory for.
7. **Adapt — saved layouts, with Make a copy as the clone and no undo on delete.** TradingView saves a layout as a named object with a unique URL, remembers "the latest used interval and symbol" and the indicators [6], [7], and deletes irreversibly [47]. OnStock should give layouts a URL (so a layout is shareable and bookmarkable), persist them next to folders in `FoldersContext`'s localStorage-plus-Supabase pattern, and keep a soft-delete/undo (OnStock already has `UndoToast.jsx`) rather than copying TradingView's "cannot be restored".
8. **Adopt — Autosave on by default, with a visible Save/Ctrl+S fallback.** TradingView's most common support ticket in this area is "the changes I make are not saved" [24]. OnStock's layouts are small JSON, so autosave costs nothing; keep Ctrl+S as a reassurance affordance.
9. **Skip — per-plan layout caps and charts-per-tab gating** [1]. Those are TradingView's monetisation levers on a data business. OnStock's constraint is API quota (GeckoTerminal and Yahoo rate limits), so the honest limit is *panes fetching live data*, and it should be a technical cap with a plain-English message, not a plan matrix.
10. **Adapt — the connection-budget idea.** TradingView counts every tab as one connection and steers users toward multi-chart layouts to economise [13], [30]. OnStock's equivalent: a 2x2 with the same asset in all four panes should issue **one** candle fetch per source and fan it out, so a layout is cheaper than four browser tabs. Design the data hooks (`useChartData.js`) around shared subscriptions before building the grid.
11. **Adopt — sharing as a read-only snapshot with a Copy button** [48]. Snapshot semantics ("subsequent changes by the author will not be displayed") are the safe choice for a security-cautious owner: a shared link never becomes a live window into someone's workspace. Default to private, as TradingView does [25].
12. **Skip — desktop-app tabs, tab linking by colour tag, and detaching tabs into windows** [9], [17], [29]. OnStock is a web app plus a Capacitor iOS shell, not an Electron desktop app. The browser already provides tabs and windows; what OnStock can borrow is the *idea* that a layout URL opened in a second browser window is a valid second monitor. If a PWA install target is ever added, revisit crosshair sync across windows via `BroadcastChannel`.
13. **Adopt — the rails-are-not-the-layout rule** [7]. Keep `WatchlistPane`, alerts and the tokenization news feed as account-level panels that persist across layouts, exactly as TradingView keeps watchlists and alerts out of layouts. Only the chart canvas (panes, symbols, intervals, Gap|Candles mode per pane, SMA/EMA/RSI per pane, crosshair/sync toggles, pane sizes) belongs in the saved layout object.
14. **Adapt — "Apply to all" and "Apply these indicators to entire layout"** [37], [45]. For OnStock this is one button: apply this pane's Gap|Candles mode and indicator set to every pane. Cheap and it saves four identical clicks.
15. **Skip — Export chart data from the layout menu** [6]. It is a data-licensing feature on TradingView; OnStock's sources (GeckoTerminal, Yahoo) have their own terms, so leave CSV export out of the layout menu until the data-rights question is settled.

---

## Sources

Primary (TradingView):

1. https://www.tradingview.com/pricing/ — comparison table read from the raw HTML: rows "Charts per tab", "Number of saved chart layouts" (Premium/Ultimate cells are an `infinityIcon`), "Simultaneous chart connections"; embedded product data incl. `pro_expert` pricing. Mirror also read: https://in.tradingview.com/pricing/
2. https://www.tradingview.com/support/solutions/43000629990-leveraging-multi-chart-layouts-in-your-analysis/ (also the mirror https://in.tradingview.com/support/solutions/43000629990-how-to-enable-the-multi-chart-mode/)
3. https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/
4. https://www.tradingview.com/support/solutions/43000761094-how-to-sync-selected-charts/
5. https://www.tradingview.com/support/solutions/43000762821-how-to-display-the-same-symbol-at-different-time-frames/
6. https://www.tradingview.com/support/solutions/43000746975-tradingview-layouts-a-quick-guide/
7. https://www.tradingview.com/support/solutions/43000692404-layouts-charts-drawings-indicators-and-their-interaction/
8. https://www.tradingview.com/support/solutions/43000473336-how-do-i-change-the-ticker-symbol-for-all-charts-of-layout-simultaneously/
9. https://www.tradingview.com/support/solutions/43000673893-symbol-syncing-between-tabs/ (and https://in.tradingview.com/support/solutions/43000673893-symbol-syncing-between-tabs/)
10. https://www.tradingview.com/support/solutions/43000671618-what-is-tradingview-desktop/
11. https://www.tradingview.com/support/solutions/43000728277-how-to-pin-unpin-tab-in-desktop-app/
12. https://www.tradingview.com/support/solutions/43000689717-how-to-edit-tab-title/ (and the in. mirror)
13. https://www.tradingview.com/support/solutions/43000694474-why-chart-connections-are-limited
14. https://www.tradingview.com/support/solutions/43000665052-how-to-enable-status-line-on-all-charts-in-layout/
15. https://www.tradingview.com/support/solutions/43000629998-my-drawings-do-not-get-synchronized-across-charts-or-layouts/
16. https://www.tradingview.com/support/solutions/43000673907-how-to-open-a-tradingview-chart-link-in-desktop-app/
17. https://www.tradingview.com/support/solutions/43000611543-how-to-open-multiple-app-windows/
18. https://www.tradingview.com/support/solutions/43000609329-how-do-i-close-the-desktop-app-and-keep-the-positions-of-windows/
19. https://www.tradingview.com/support/solutions/43000481234-how-to-maximize-a-chart-in-multichart-layout/
20. https://www.tradingview.com/support/solutions/43000542379-how-to-maximize-a-chart-while-in-multilayout-mode/
21. https://www.tradingview.com/support/solutions/43000623399-hotkeys/ ("Desktop app keyboard shortcuts")
22. https://www.tradingview.com/support/solutions/43000762819-i-cannot-create-a-new-layout/
23. https://www.tradingview.com/support/solutions/43000762815-how-to-view-all-saved-layouts/
24. https://www.tradingview.com/support/solutions/43000762820-the-changes-i-make-are-not-saved-in-my-layout/
25. https://www.tradingview.com/support/solutions/43000480047-how-to-share-protect-my-charts/
26. https://www.tradingview.com/support/solutions/43000484324-i-received-a-your-chart-is-too-large-and-cannot-be-saved-message/
27. https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/ (and https://in.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/)
28. https://www.tradingview.com/blog/en/new-chart-layout-patterns-45487 (June 28, 2024)
29. https://www.tradingview.com/blog/en/multi-monitor-support-free-on-desktop-app-31209 (April 27, 2022)
30. https://www.tradingview.com/support/solutions/43000693877-why-was-the-connection-closed/
31. https://www.tradingview.com/features/
32. https://www.tradingview.com/support/folders/43000574972-features-and-configuration/ (Desktop folder index)
33. https://www.tradingview.com/blog/en/more-chart-layout-options-52228 (May 14, 2025)
34. https://www.tradingview.com/blog/en/new-chart-layouts-33172 (July 20, 2022)
35. https://www.tradingview.com/blog/en/date-range-synchronization-31642 (May 19, 2022)
36. https://www.tradingview.com/support/folders/43000578567-how-to-work-in-the-multi-chart-mode (folder index, 9 articles)
37. https://www.tradingview.com/support/solutions/43000762822-how-to-apply-the-same-settings-to-all-charts/
38. https://www.tradingview.com/support/solutions/43000673888-tradingview-desktop-releases-and-release-notes/
39. https://www.tradingview.com/support/solutions/43000710643-how-to-use-the-command-palette-and-keyboard-shortcuts/ (Pine Editor palette; read, not layout-relevant)
43. https://www.tradingview.com/support/solutions/43000670346-how-to-synchronize-the-date-range-on-multichart/
44. https://www.tradingview.com/support/solutions/43000629993-i-would-like-to-resize-the-charts-of-my-layout/
45. https://www.tradingview.com/support/solutions/43000762823-my-indicators-are-not-synchronized-to-all-charts-of-my-layout/
46. https://www.tradingview.com/support/solutions/43000740760-how-to-delete-a-layout/
47. https://www.tradingview.com/support/solutions/43000762816-i-accidentally-deleted-my-layout-can-i-restore-it/
48. https://www.tradingview.com/support/solutions/43000606515 ("How to share charts in view-only mode")
49. https://www.tradingview.com/charting-library-docs/latest/trading_terminal/
50. https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget/
51. https://www.tradingview.com/chart/NVDA/vf2IlYm6-TradingView-Masterclass-How-To-Use-The-Top-Toolbar/ (TradingView's own Masterclass idea post)
53. https://www.tradingview.com/support/solutions/43000512928-how-can-i-enable-disable-the-drawings-toolbar/
54. https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/
58. https://www.tradingview.com/support/solutions/43000708221-how-in-app-link-handling-works-in-tradingview-desktop/
60. https://www.tradingview.com/charting-library-docs/latest/core_concepts/Widget-Constructor/
61. https://www.tradingview.com/support/shortcuts/ — fetched (www and in. mirrors, plus raw curl); the hotkey list is rendered client-side and returned no shortcut text, so nothing from it is cited as verified.
63. https://www.tradingview.com/support/solutions/43000665813-how-to-collapse-separate-panes/ — seen only as a search-result snippet.

Third-party (used only to fill gaps, marked as such in the text):

41. https://friendofthetrend.com/tradingview/plan-comparison/ (June 6, 2026)
42. https://chartwisehub.com/tradingview-plan-comparison/ (August 10, 2026)
52. https://mrchartist.com/learn/tradingview/layout-and-settings
55. https://supa.is/article/tradingview-multi-chart-layout-multiple-timeframes-setup-guide-2026 (March 17, 2026)
56. https://pineify.app/resources/blog/how-to-add-another-chart-in-tradingview-a-complete-guide (February 1, 2026)
57. https://blog.pickmytrade.trade/mastering-custom-layouts-in-tradingview-a-comprehensive-guide/ (September 19, 2024)
59. https://x.com/tradingview/status/1300793935586037761 — TradingView's X account on F11; seen only as a search-result snippet.

Pages that returned 404/403 and are therefore not cited for any claim: the Charting Library `LayoutType` reference page, the `ui_elements/Multiple-chart-layouts` guess, the "Keywords: fullscreen mode" / "Keywords: Auto-Save" / "Keywords: how does the layout system work" Help Center index pages (43000722835, 43000722728, 43000720749), the Help Center article 43000690948 on applying appearance settings to all charts, and defkey.com's shortcut list.
