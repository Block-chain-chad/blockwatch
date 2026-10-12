# TradingView teardown — surface 07: Alerts

Research date: 2026-09-06. Scope: everything about TradingView alerts — alert types, the Create Alert dialog and every field in it, trigger frequency, expiration, name and message (with placeholders), notification channels, active vs inactive alerts, the alert log, per-plan limits, and how alerts appear on the chart. Other surfaces (charts, indicators, watchlists, screener, etc.) are deliberately NOT covered here.

How to read this: option names in **bold** or `code` are TradingView's own labels, copied as the Help Center prints them. Where two Help Center articles use different labels for the same thing (this happens more than you would expect), both are listed. "Could not verify" means no primary source stated it; nothing in this file is guessed. Every URL actually read is in the Sources section at the end.

A plain-English note on what an "alert" is on TradingView: you describe a condition ("price crosses 150", "RSI goes above 70", "price enters this rectangle I drew"), TradingView's servers watch the market for you, and when the condition is true they notify you through whichever channels you ticked. The servers do the watching, so you do not need the site open.

---

## 1. Big picture

| Fact | Detail | Source |
|---|---|---|
| Where alerts run | "TradingView alerts are server-side, which means all alerts are created and triggered on our servers." You "can close TradingView or exit the chart page and alerts will continue working on your devices." | [Will alerts work if TradingView is not open] |
| Where alerts can be attached | "Alerts can be created on data series, indicator plots, strategy orders and drawing objects." | [How to set up alerts] |
| Two families that count separately | **Price alerts** and **Technical alerts**. Each plan has its own cap for each. A third, smaller family is **Watchlist alerts**. | [Alerts separation by type], [Pricing] |
| Same dialog everywhere | The alert dialog is the same whether you alert on price, a built-in indicator, a custom script, a drawing, or a strategy. | [How to set up alerts], [Getting started with technical alerts] |
| Works on | Web, TradingView Desktop app, iOS, Android. Desktop app "Supports system-native notifications". | [How to set up alerts], [What is TradingView Desktop] |
| Backend host | The alert service is reached at `https://pricealerts.tradingview.com/` (support asks users to open it to test connectivity). | [Errors when creating/loading alerts] |

### What "price alert" vs "technical alert" means (this governs your quota)

From [Alerts separation by type]:

| Family | Counted as this when… | Examples |
|---|---|---|
| **Price alert** | "only a symbol is used in the alert…and a price value" AND the operator is one of **Crossing**, **Crossing Up**, **Crossing Down**, **Greater Than**, **Less Than**. | "AAPL crossing 200" |
| **Technical alert** | ANY of: the alert uses "an overlay symbol, indicator, drawing or strategy"; OR the operator is **Entering Channel** / **Exiting Channel** / **Inside Channel** / **Outside Channel** / **Moving Up** / **Moving Down** / **Moving Up %** / **Moving Down %**; OR the alert has multiple conditions. | "RSI greater than 70", "price enters rectangle", "AAPL moving up 5% in 10 bars", any multi-condition alert |
| **Watchlist alert** | One alert applied to every symbol in a watchlist (Premium and above). | see section 3.4 |

Note the trap: a *price* alert becomes a *technical* alert the moment you pick a channel or moving operator, even though it only looks at price. "Alerts using Channel and Moving operators are always technical." ([Getting started with technical alerts])

---

## 2. Ways to open the Create Alert dialog

All from [How to set up alerts] and [Introduction to TradingView alerts] unless noted.

| # | Entry point | Exact label / gesture | Notes |
|---|---|---|---|
| 1 | Keyboard | **ALT + A** (Windows) / **⌥ + A** (macOS) | Opens the dialog for the current symbol. |
| 2 | Top toolbar | **Create alert** button (the alarm-clock icon) | |
| 3 | Right toolbar | Open the **Alerts** panel (alert manager), click its create button | The panel is also where alerts are managed (section 6). |
| 4 | Chart right-click | **Add alert on …** (the "…" is filled with the thing under the cursor, e.g. the symbol, an indicator plot, or a drawing) | Pre-fills the condition from what you right-clicked. |
| 5 | Drawing | Right-click a line/channel/rectangle/fib and choose **Add alert**; or use the drawing's floating toolbar alert button. Rectangle context menu label is **Add alert on drawing**. | [Alerts on Fibonacci drawings], [Alerts on rectangle drawings] |
| 6 | Price scale | Hover the price scale and click the **Plus** button; or hold **Alt + Ctrl** (Windows) / **⌥⌘** (Mac) anywhere on the chart and a **+** button appears under the cursor, offering to place an order, create an alert, or draw a price line at that price. | [How to create an order, alert, and price line anywhere on the chart] |
| 7 | Indicator legend | Hover the indicator in the legend and click its alert icon. | [Alerts on fundamentals] |
| 8 | Strategy Tester | **Add Alert** button in the Strategy Tester dropdown, or the strategy's own dropdown menu. | [Strategy Alerts] |
| 9 | Watchlist | **Add alert on the list…** in the watchlist's dropdown menu. | [Watchlist alerts] |
| 10 | Chart pattern drawing | "go to the Alerts menu, select the pattern you need, and choose a necessary condition." | [Updated Chart Patterns blog] |

---

## 3. Alert types

### 3.1 Price alerts

Set the primary condition to **Price** (the symbol itself). Operators, verbatim from [How to use price alerts]:

| Operator | TradingView's definition |
|---|---|
| **Crossing** | fires when price reaches or passes the threshold from either direction |
| **Crossing up** | fires when price rises through the threshold |
| **Crossing down** | fires when price falls through the threshold |
| **Greater than** | "Triggers when price exceeds a threshold by at least one minimum tick" |
| **Less than** | "Triggers when price drops below a threshold by at least one minimum tick" |

Details that matter:

- Price alerts are evaluated on the live price, not a bar, so **Once Per Bar** / **Once Per Bar Close** / **Once Per Minute** are not offered; only **Only Once** and **Every Time**. "such alerts are based on the current price, so they are triggered regardless of the interval." If you want bar-based triggering on a price level, TradingView's own workaround is to draw a **Horizontal Line** and alert on the drawing instead. ([Why is the Once Per Bar option missing?])
- The `{{interval}}` placeholder returns `1` in a price alert because "Price-based alerts…are calculated on 1m data". ([How to use a variable value in alert])
- **Log scale caveat**: "alerts based on this scale may not accurately reflect the exact position of a drawing, leading to unexpected trigger behaviors" — the fix is to switch to linear scale. ([I cannot set alerts with Log Scale enabled])
- **Delayed data**: if the symbol is delayed, a red icon (Cboe data) or a **D** letter is shown; the exchange prefix is shown "only…in the alerts manager section" and "the prefix is not displayed in the alert dialog. Only the symbol name is indicated." Delayed symbols get `_DL` or `_DLY` appended in `{{exchange}}`. ([Alerts based on real-time and non-real-time symbols], [How to use a variable value in alert])

### 3.2 Technical alerts on indicators

"An alert is considered technical when it is set for an indicator, drawing, or strategy." ([Getting started with technical alerts])

| Operator group | Labels | Definition (verbatim where quoted) |
|---|---|---|
| Crossing | **Crossing**, **Crossing Up**, **Crossing Down** | "Trigger when the value reaches a certain level from either or a specific direction" |
| Threshold | **Greater Than**, **Less Than** | "Trigger when the value surpasses or falls below a certain level" |
| Channel | **Entering Channel**, **Exiting Channel** | "Trigger when the value reaches a channel's boundaries from a certain direction" |
| Channel | **Inside Channel**, **Outside Channel** | trigger when the value is/goes inside or outside the two bounds |
| Moving | **Moving Up**, **Moving Down**, **Moving Up %**, **Moving Down %** | "Trigger when the asset's price rises or falls by a certain amount within a specified number of bars"; these carry a bar-count parameter |

That is the full 13-operator set ("Operator Types (13 Total)" per [Learn how to configure alerts]).

What you can compare against: the first dropdown picks the series (symbol or an indicator's plot), the second picks the operator, then a **Value** field — which can itself be another series (e.g. compare a plot against another plot) or a typed number — and an interval selector. "Select alert type (price or technical), choose operator, input values, set interval." ([Learn how to configure alerts])

Gotchas TradingView documents:

- **Settings are frozen at creation**: "If an indicator's parameters are changed after an alert is created, the alert will still trigger using the old settings." You must delete and recreate. ([Getting started with technical alerts])
- Alerts on scripts whose output "depends on all available history" drift away from the chart over time because "after the alert is launched, the number of bars involved in its calculation only increases" — restart the alert to resync. ([The impact of data repainting on alert calculation])
- Plots drawn with an **offset** fire on the true bar, not where the shifted label appears, so the alert can look "late". ([Issue with alerts on indicators that use offsets])
- **Volume + Crossing** misfires at each new bar because a new bar's volume starts near zero; use **Greater than** / **Less than** instead. ([The issue with crossing alerts on the Volume indicator])
- Fundamentals: you can alert on 11 valuation metrics (Market Capitalization, P/E Ratio, PEG Ratio, P/B Ratio, Price to Tangible Book Ratio, P/S Ratio, Price to Cash Flow Ratio, Price to Free Cash Flow Ratio, Dividend Yield, Buyback Yield, Earnings Yield) by adding **Indicators → Fundamentals** and alerting on that plot; TradingView warns they "may be triggered inaccurately if the asset price changes rapidly following an earnings release." Listed as **Alerts on financial metrics** on every plan including Basic. ([Alerts on fundamentals], [Pricing])

### 3.3 Technical alerts on drawings

| Drawing family | Supported operators | Source |
|---|---|---|
| Lines (trend line, horizontal line, ray, etc.) | **Crossing**, **Crossing Up/Down**, **Greater Than**, **Less Than** | [Getting started with technical alerts] |
| Channels (parallel channel etc.) and **Rectangles** | **Entering Channel**, **Exiting Channel**, **Inside Channel**, **Outside Channel**. Rectangle blog phrases these as price "enters", "exits", or "is inside or outside the rectangle's boundaries". | [Getting started with technical alerts], [Alerts on rectangle drawings] |
| **Fib Retracement**, **Trend-Based Fib Extension** | Per level: **Crossing**, **Crossing Up**, **Crossing Down**, **Greater Than**, **Less Than**; between two levels: **Entering Channel**, **Exiting Channel**, **Inside Channel**, **Outside Channel**. "Choose the level you want to track (0.5, 0.618, or any visible level from your drawing settings)." Option **Fib levels based on log scale** exists for volatile assets. | [Alerts on Fibonacci drawings], [Getting started with technical alerts] |
| **Anchored VWAP** | available "via forecasting tools" | [Getting started with technical alerts] |
| **Vertical Line** | condition "Symbol crosses Vertical Line" — this is TradingView's official workaround for a time-based alert; there is no dedicated timer alert. | [How do I set an alert at a preset time?] |
| Chart-pattern drawings (wedge, double top, Elliott wave, …) | Named examples: "New pattern formation", "Wedge breakout", "Double top formation", "New Elliott wave". Note: the auto **All Chart Patterns** indicator "doesn't support alerts". Full per-pattern condition list: could not verify (the blog defers to a Help Center page I could not locate without search budget). | [Updated Chart Patterns blog] |

A drawing alert's level follows the drawing: the chart mark can be dragged and "the value will be automatically updated in the Edit dialog". ([Manage alerts])

### 3.4 Watchlist alerts

| Fact | Detail | Source |
|---|---|---|
| What it is | One alert applied to every symbol in a watchlist. "Every watchlist alert functions independently for each symbol in the list. These alerts trigger individually whenever the specified condition is met." | [Watchlist alerts] |
| How to create | **Add alert on the list…** in the watchlist dropdown, or pick the list from the **Symbols** dropdown in the standard **Create alert** dialog. | [Watchlist alerts] |
| Conditions | "the same operators available for other types of alerts" | [Watchlist alerts] |
| Lifecycle | "The overall alert will stop only when it has been triggered for all symbols in the list." Symbols added later are covered; removed symbols stop being watched. | [Watchlist alerts] |
| Expiration | **Open-ended alert** is "unavailable for watchlist alerts". | [Learn how to configure alerts] |
| **Session** dropdown | **Regular** (default) / **Extended**. Extended = pre-market + regular + post-market, "US stocks and ETFs" only, intraday intervals only ("Daily alerts are calculated using standard daily bars"); futures always use their electronic hours. | [Watchlist alerts], [Extended hours support blog] |
| Rate limit | "no more than 15 triggers in 3 minutes" per symbol (only that symbol stops) and "no more than 1000 triggers in 3 minutes for the entire watchlist alert" (whole alert stops). | [Alert was triggered too often and stopped] |
| "Limited functionality state" | A per-symbol pause "due to various factors like activated fire-control or a Pine script calculation error"; "your alert will continue functioning for all other symbols." | [Limited functionality state in Watchlist Alerts] |
| Plan | Premium 2, Expert 10, Ultimate 15 active watchlist alerts. | [Pricing], [Watchlist alerts blog] |
| Max symbols per list alert | could not verify |

### 3.5 Script alerts (Pine `alertcondition()` and `alert()`)

These matter to OnStock only as a model of "the indicator author defines the alert", but the labels are part of the dialog:

| Mechanism | How it shows in the **Condition** dropdown | Who controls frequency/message | Source |
|---|---|---|---|
| `alertcondition()` (indicators only) | Each call becomes "one distinct trigger and one corresponding option in the 'Condition' dropdown menu", named by its `title`. | The dialog: user picks frequency; message is the script's `message` (with placeholders) but editable in the dialog. | [Pine FAQ: Alerts], [How to use a variable value in alert] |
| `alert()` (indicators and strategies) | One option, **Any alert() function call**, "typically the first option". | "controlled entirely by the alert() function calls within the script's code—not by the settings in the alert dialog box". `alert.freq_once_per_bar` (default), `alert.freq_once_per_bar_close`, `alert.freq_all`. | [Alerts on alert() function], [Pine concepts: Alerts] |
| If no built-in condition fits | TradingView's answer is: write a Pine indicator with `alertcondition(condition, title, message)`, apply it, then pick it in the dialog. | | [I'm unable to find an alert condition function that meets my needs] |

Placeholders only substitute for scripts written in Pine v4 or later; on older scripts `{{close}}` prints literally. ([Why the {{close}} variable value…may not work])

Errors when alerting on a script: the script is "another user's script, which has not been published by the author", or your own script "was likely deleted and is no longer available". ([Error when creating alert on script])

### 3.6 Strategy alerts

| Fact | Detail | Source |
|---|---|---|
| Condition options | **Order fills and alert() function calls**, **Order fills only**, **alert() function calls only** | [Getting started with technical alerts], [Pine FAQ: Alerts] |
| How it runs | "When an alert is created for a strategy, a copy of the strategy is created on our servers. This copy then runs independently from the chart's strategy in your browser." Editing the chart strategy does not touch the alert; delete and recreate. | [Strategy Alerts] |
| Frequency | No frequency selector: "triggering frequency for such alerts is determined in the strategy code". "Alerts are only triggered for orders executed in realtime." More than one per bar is possible, still subject to the 15-in-3-minutes stop. | [Why is the Once Per Bar option missing?], [Strategy Alerts] |
| Trigger time vs tester | Real-time orders match; historical orders show bar-open time because "intrabar price movement is not taken into account". Mismatches also come from `calc_on_every_tick`, `calc_on_order_fills`, and trailing orders. | [The trigger time of a strategy alert differs…], [Common reasons for mismatches…] |

### 3.7 Multi-condition alerts

| Fact | Detail | Source |
|---|---|---|
| How | In the dialog click **Add condition**, configure, click **Add**. "All your conditions now appear as buttons with previews that you can click to edit." | [Multi-condition alerts] |
| Max | "up to five different conditions — including price, drawings, and indicators" | [Multi-condition alerts] |
| Logic | AND only: "The alert will only trigger when all conditions are met simultaneously." | [Multi-condition alerts] |
| Mixing | Conditions "can mix conditions with different timeframes" but must all be on the same symbol. | [Multi-condition alerts] |
| Not allowed | strategies, scripts using `alert()`, Pine < v4 scripts with `alertcondition()` | [Multi-condition alerts] |
| Plan / quota | "Available with the Plus plan and above"; counts "as just one technical alert toward your limit". Pricing page shows **Multi-condition alerts** ticked on every plan including Basic, which contradicts the Help Center — could not resolve which is current. | [Multi-condition alerts], [Pricing] |
| Placeholders | With more than one indicator, "only…values from the first indicator" are substituted. | [How to use a variable value in alert] |

### 3.8 Second-based alerts

Alerts on 1S/5S/15S/30S charts. The March 2020 launch post says they are "only available to TradingView members who subscribe to a Premium plan"; the 2026 pricing page lists **Second-based alerts** with a tick on every plan including Basic. Treat the pricing page as current. ([Alerts Are Now Available for Second Resolutions], [Pricing])

---

## 4. The Create Alert dialog, field by field

Structure per [Learn how to configure alerts]: the dialog has a settings area with **Symbols**, **Condition**, **Trigger**, **Expiration**, then **Message** (alert name + message), then a **Notifications** tab. Older Help Center articles describe the same fields under the names **Trigger Condition**, **Frequency**, **Timer**, alert name, message. A **preset** dropdown sits at the top (section 4.7).

### 4.1 Symbols

| Option | Meaning | Source |
|---|---|---|
| current symbol (default) | alert on the chart's symbol | [Learn how to configure alerts] |
| a watchlist | turns it into a watchlist alert (Premium+) | [Watchlist alerts] |

### 4.2 Condition

Series dropdown → operator dropdown → **Value** (number or another series) → interval; for channel operators there are two bounds; for moving operators there is an amount/percent plus a bar count. **Add condition** appends up to 4 more (section 3.7). Script conditions appear under the script's name (section 3.5).

### 4.3 Trigger (a.k.a. Frequency)

Labels as printed across the Help Center. The dialog itself uses the capitalised forms in the second column (as quoted in the "Once Per Bar missing" article and the Pine docs).

| Definition article label | Dialog label | Definition (verbatim from [Differences between alert frequencies]) | Available for |
|---|---|---|---|
| **Once only** | **Only Once** | "an alert is triggered only once. Alert conditions have to match the exact parameters that you set for it to be triggered." Status afterwards: **Stopped — Triggered**. | all alert types |
| **Once per bar** | **Once Per Bar** | "the system checks every bar and triggers an alert whenever conditions are met (no more than once per bar)." Fires while the bar is still forming. | interval-dependent alerts only (drawings, indicators, Heikin Ashi, Range charts) |
| **Once per bar close** | **Once Per Bar Close** | "same as above, but the bar needs to close for an alert to be triggered." | interval-dependent alerts only |
| **Once per minute or every time** | **Once Per Minute** (interval-dependent) / **Every Time** (price alerts) | "the system checks conditions every minute and triggers an alert whenever conditions are met." | Once Per Minute: interval-dependent; Every Time: price alerts |
| (none) | — | Strategy alerts have no selector; frequency comes from the code. | strategies |

Why this matters (from [Issue with "Once Per Bar" alert]): any frequency other than **Once Per Bar Close** can fire mid-bar, so "the alert triggered, but the condition is not met on the chart" (indicator reversed before close) or "the alert triggered later than the condition was met on the chart". **Once Per Bar Close** can itself be late: the server waits for the first trade of the next bar to confirm the close, and if there are no trades "the server automatically 'closes' the current bar 1 minute after its formal close". ([Delays in OncePerBarClose alerts])

Spam stop, all types: "no more than 15 triggers in 3 minutes"; exceeding it stops the alert. ([Alert was triggered too often and stopped])

### 4.4 Expiration

| Option | Detail | Plan | Source |
|---|---|---|---|
| Date/time picker | Default lifetime "The maximum lifetime of a standard alert is two months." Pricing page prints **Alert durations**: Basic **1 mo.**, Essential **2 mo.**, Plus **2 mo.** | Basic–Plus | [Introduction to TradingView alerts], [Pricing] |
| **Open-ended alert** toggle (popup option **Open-ended**) | "so they won't be automatically turned off when the timer expiration setting is reached." "Open-ended alerts are available for Premium and Ultimate plans only." Not available for watchlist alerts. Upgrading does not retro-convert existing alerts; you edit each one and pick **Open-ended**. | Premium, Ultimate (Expert/Elite: could not verify) | [I upgraded to the Premium plan but my alerts still expiring in 2 months], [Learn how to configure alerts] |
| Auto-deactivation | Even open-ended alerts are disabled when ALL are true: created > 1 year ago, not triggered in a year, not edited in a year. | all | [I upgraded to the Premium plan…] |
| Downgrade | "When you switch to a lower-tier plan, all active alerts will be automatically stopped." "Stopped alerts can be restarted within the limits of your new plan." | | [Stopping alerts when downgrading your plan] |

### 4.5 Alert name

| Fact | Detail | Source |
|---|---|---|
| Purpose | Shown in the "Alert manager, toast notification and Alert log". Optional; if blank the auto-generated condition text is used. | [Learn how to configure alerts] |
| Limit | "300 characters is the maximum length of an alert name." Emojis count as multiple characters. | [Alert name and message size limits] |

### 4.6 Message and placeholders

| Fact | Detail | Source |
|---|---|---|
| Limit | "4000 characters is the maximum length of the message specified in the 'Message' field." Pine `alert()` / `alert_message`: 40,960. Webhook body has "the same limits…as to the alert message size". | [Alert name and message size limits] |
| Default | pre-filled with the condition text (e.g. `BTCUSD Greater Than 9000`) | [I cannot send webhooks to Slack] |

Placeholders, verbatim from [How to use a variable value in alert] and [Strategy Alerts] (write them with double curly braces):

| Placeholder | Returns |
|---|---|
| `{{ticker}}` | "ticker of the symbol used in alert (AAPL, BTCUSD, etc.)" |
| `{{exchange}}` | "exchange of the symbol used in alert (NASDAQ, NYSE, CME, etc)"; delayed symbols append `_DL` / `_DLY` |
| `{{open}}` `{{high}}` `{{low}}` `{{close}}` `{{volume}}` | "corresponding values of the bar on which the alert has been triggered" |
| `{{time}}` | bar open time, UTC, `yyyy-MM-ddTHH:mm:ssZ` (e.g. `2019-08-27T09:56:00Z`) |
| `{{timenow}}` | "current fire time of the alert, formatted in the same way as {{time}}", to the second |
| `{{interval}}` | the chart interval; price alerts return `1`; Range charts return `1` |
| `{{syminfo.currency}}` | quote currency code (`USD`, `EUR`…) |
| `{{syminfo.basecurrency}}` | base currency for pairs, otherwise `na` |
| `{{plot_0}}` … `{{plot_19}}` | "corresponding output series of an indicator used in the alert" (max 20, zero-based) |
| `{{plot("Name")}}` | a plot by its title; works for `plot`, `plotshape`, `plotchar`, `plotarrow`; not `plotcandle`/`plotbar` |
| `{{strategy.position_size}}` | "size of the current position" |
| `{{strategy.order.action}}` | `buy` or `sell` |
| `{{strategy.order.contracts}}` | "number of contracts of the executed order" |
| `{{strategy.order.price}}` | "price at which the order was executed" |
| `{{strategy.order.id}}` | order ID |
| `{{strategy.order.comment}}` | order comment |
| `{{strategy.order.alert_message}}` | the `alert_message` argument (Pine v4+) |
| `{{strategy.market_position}}` | `long`, `flat`, or `short` |
| `{{strategy.market_position_size}}` | absolute position size |
| `{{strategy.prev_market_position}}` | previous position string |
| `{{strategy.prev_market_position_size}}` | previous size, absolute |

Worked example from the Help Center: `{{exchange}}:{{ticker}}, price = {{close}}, volume = {{volume}}`.

### 4.7 Alert presets

| Fact | Detail | Source |
|---|---|---|
| What | "save your alert configurations as templates and quickly apply them to different symbols or conditions." Dropdown at the top of the dialog; **Save alert preset**, name it, tick which groups to keep. | [Alert presets] |
| Saves | Conditions (series, plots, operators, indicators, timeframes — NOT the typed value fields or drawings); Behaviour (trigger frequency, expiration); Customisation (name, message); Notifications ("App, Email, Sound, etc." — NOT **Webhook URL**). | [Alert presets], [Alert presets blog] |
| Limits / editing | Max 5 presets. Cannot be edited (make a new one); **Reset changes** returns to defaults; bin icon deletes. Applied preset is highlighted. | [Alert presets] |

### 4.8 Notifications tab

Labels vary between articles; all forms seen are listed.

| Channel | Label(s) as printed in Help Center | What it does | Requirements / caveats | Source |
|---|---|---|---|---|
| Mobile push | **Notify in App** / **Notify on App** / "App notification"; on mobile the checkbox is **Push notifications** | Push to the iOS/Android app | App installed, logged in, OS notifications allowed (iOS: Settings → Notifications → TradingView → Allow Notifications; Android: same plus whitelist in Autorun manager). Alerts created in the mobile app have it on by default. All plans. The iOS in-app log "contains alerts that were received as push notifications only." | [How to receive phone notifications for alerts], [iOS push], [Android push], [iOS: Alerts log doesn't show…] |
| Toast / pop-up | **Show Pop-up** / "Toast notification" | On-screen pop-up in the web/desktop client | Auto-hides after 20 seconds unless **Automatically hide toasts** is unticked in Alerts settings. | [How to set up alerts], [I want my toasts to stay visible] |
| Email | **Send Email** | Email to the profile address | Alternate addresses: **Settings and billing → Alerts delivery → Add email**, 6-digit verification code. | [How to set up alerts], [How to set up alternative email address…] |
| SMS-ish | **Send plain text** | Sends a plain-text email to an address you type — used for carrier email-to-SMS gateways | "some providers (e.g., T-Mobile and Verizon) offer this service for personal use only and might limit the number of messages". There is NO native SMS channel; this is the closest thing. | [I'd like to use an alternative email address…] |
| Sound | **Play Sound** | Plays a sound in the browser tab | 40 sounds to choose from ("banjo", "whale", "glass breaking" named). Duration options: could not verify. Needs the tab's audio unblocked ("try clicking on the page to activate its sound"). Global **Alert Volume** slider in **Settings → Alerts** (website only, not desktop/mobile apps). | [New notification sounds blog], [I cannot hear sound notifications], [How to Adjust Alert Volume] |
| Webhook | **Webhook URL** | HTTP POST of the message to your URL | See section 5. All plans per pricing page. | [How to configure webhook alerts], [Pricing] |
| Desktop native | (no checkbox; the Desktop app "Supports system-native notifications") | OS notification centre | | [What is TradingView Desktop] |

**Notification schedule** ([Notification schedule for alerts]): per alert, choose **24/7** (default), **Weekdays** (Mon–Fri), **Standard working hours** (Mon–Fri 9:00–18:00), or **Custom schedule** (days plus **From**/**To** to the minute; 00:00–00:00 = all day; overnight spans allowed). Outside the window "push, email, sound, webhook, toast, desktop app push will be completely blocked". "The schedule only controls notification delivery, not alert triggering" — the event still lands in the log and gets a "second chance" notification when the window reopens. Times follow the account timezone.

**Timezone** ([What timezone is displayed in alerts?]): pop-ups, Alert Manager, and Log use "the timezone of your operating system"; CSV export "is displayed in the UTC timezone and cannot be changed".

---

## 5. Webhooks in detail

| Fact | Detail | Source |
|---|---|---|
| Method / body | HTTP **POST**; body is the alert message verbatim. Header is `application/json` if the message is valid JSON, else `text/plain`. | [How to configure webhook alerts] |
| Requirement | 2-factor authentication must be enabled on the account. | [How to configure webhook alerts] |
| Ports | "We only accept URLs with port numbers 80 and 443." | [I cannot send webhook to a URL with a port number] |
| IPv6 | not supported | [How to configure webhook alerts] |
| Source IPs | `52.89.214.238`, `34.212.75.30`, `54.218.53.128`, `52.32.178.7` | [How to configure webhook alerts] |
| Timeout | "If a remote server takes longer than three seconds to process a request, the request will be cancelled" | [How to configure webhook alerts] |
| Retries | On HTTP 500–599 (except 504): resend after 5 seconds, up to 3 resends, "the maximum number of webhook sends for one trigger can be 4." | [Webhook resubmission] |
| Verifying sender | TradingView presents an SSL client certificate you can check; no signing secret or custom headers are documented. | [Webhook authentication] |
| Credentials | "do not include sensitive information such as login credentials or passwords in the webhook URL and webhook message" | [Using credentials for webhooks] |
| Status in log | The log has a **Webhook status** column. Documented states: 3xx, 4xx, 5xx, "Timeout exceeded", "URL unavailable or invalid", secure-connection problems, "server refused the connection", "server sent an invalid response", "IP isn't allowed" (private/local IP), "Unknown error". | [What do errors mean when sending webhooks?] |
| Slack / Discord | Slack needs `{"text":"…"}`; Discord needs `{"content":"…"}`. | [I cannot send webhooks to Slack], [I cannot send webhooks to Discord] |

---

## 6. Managing alerts: the Alerts panel, statuses, and the log

### 6.1 The Alerts panel (right toolbar)

From [Manage alerts], [Meet Your New Alerts Manager], [multi select blog]:

| Feature | Detail |
|---|---|
| Layout | Two tabs: **Alerts** (the manager) and **Log**. Active-alert count is shown "right in the header". |
| Per-row content | symbol, name/condition, status badge, time of last trigger ("See the time of the last triggering right in the list"). Columns can be toggled via the panel's **Settings**; the **Options** button holds the other functions. |
| Sort | "by ticker, name, message, creation date or triggered time" |
| Search | magnifier button |
| Open/edit | double-click a row, or right-click (long-tap on mobile) → context menu |
| Row actions | stop, resume (restart), edit, delete, clone |
| Multi-select | **Ctrl+A** all; Ctrl/Cmd-click one by one; Shift-click a range; **Shift + ↑/↓**; then **Restart**, **Stop**, **Remove**, **Clone** from the top bar or right-click |
| Keyboard | arrow keys / Space bar move between alerts in both Manager and Log |
| Filters | a "Show only active" style filter: could not verify in Help Center (the chart-settings **Only active alerts** toggle is for chart marks, not the list) |

### 6.2 Statuses (colour-coded badges)

| Badge | Colour | Meaning | Source |
|---|---|---|---|
| **Active** | green | currently monitoring | [Manage alerts] |
| **Stopped — Triggered** | orange | an **Only Once** alert that has fired | [Manage alerts] |
| **Stopped manually** | grey | user pressed stop | [Manage alerts] |
| **Stopped — Expired** | red | expiration reached | [Manage alerts] |
| Stopped for firing too often | (shown "Below each alert, you can see the status and the reason of an alert stop") | 15 triggers in 3 min | [Alert was triggered too often and stopped], [Manage alerts] |

Do stopped alerts count toward the quota? The Help Center article on this ([I cannot create new alerts even though I have not exceeded the alert limit]) only says to check certain options shown in an image I could not read — could not verify. Pricing rows are explicitly "**Active** price alerts", so the limit is on active ones.

### 6.3 The Log

| Fact | Detail | Source |
|---|---|---|
| Content | "All triggered alerts are automatically added into Alerts Log and you can access your alert history anytime." Each entry shows the alert name/message, symbol, trigger time (OS timezone), and a **Webhook status** column when relevant. | [Manage alerts], [What do errors mean when sending webhooks?] |
| Navigation | arrows / Space bar; customise list; **export it to a CSV file** via **Options** | [Manage alerts] |
| Retention | Auto-deleted daily at 21:00 UTC when "The trigger is older than 30 days" or "There are more than 100 trigger events for the same alert (only the most recent 100 are kept)". Export CSV to keep history. | [Automatic deletion of old alert triggers from the Log] |
| Mobile | iOS log only lists events that arrived as push. | [iOS: Alerts log doesn't show some triggered alerts] |

---

## 7. How alerts appear on the chart

| Element | Behaviour | Source |
|---|---|---|
| Mark on the price scale | "After creating an alert, a mark specifying its level (except Moving alerts), will appear on the chart." Hover shows a tooltip with the description. | [Manage alerts] |
| Drag to edit | Drag the label to change the level; "the value will be automatically updated in the Edit dialog". | [Manage alerts] |
| On trigger | "the corresponding label will start blinking on the chart." | [Manage alerts] |
| **Alert lines** | An optional horizontal line across the chart at the alert level. Toggle by right-clicking the line or its scale label → **Alert lines**; also "Right-click the mark to add or delete an extended alert line." | [How to enable/disable the Alert Line on the chart], [Manage alerts] |
| **Chart settings → Alerts** tab | **Alert lines** on/off; alert line colour picker; **Only active alerts** (hide expired/stopped marks); **Alert Volume** slider; **Automatically hide toasts** (20 s). | [How can I change the color of the alert price line?], [How to configure your Supercharts], [Volume control blog] |
| Drawing alerts | The drawing itself is the visual; a small alert icon attaches to it (label detail: could not verify beyond the drawing's floating toolbar showing the alert button). | [Alerts on Fibonacci drawings] |
| Delayed data marker | red icon or **D** on the symbol when data is delayed | [Alerts based on real-time and non-real-time symbols] |

---

## 8. Limits per plan

Pricing page as fetched 2026-09-06, annual billing shown. The Professional group (Expert, Elite) is behind a client-side tab the fetcher could not open — marked could not verify, with the one Help Center figure that exists.

| Row (verbatim label) | Basic (free) | Essential $12.95/mo | Plus $29.95/mo | Premium $59.95/mo | Expert | Elite | Ultimate $199.95/mo |
|---|---|---|---|---|---|---|---|
| **Active price alerts** | 3 | 20 | 100 | 400 | could not verify | could not verify | 1,000 |
| **Active technical alerts on indicators, strategies, and drawings** | — | 20 | 100 | 400 | could not verify | could not verify | 1,000 |
| **Active watchlist alerts** | — | — | — | 2 | 10 (blog) | could not verify | 15 |
| **Alert durations** | 1 mo. | 2 mo. | 2 mo. | open-ended available (Help Center); pricing fetch inconsistent ("—" once, "2 mo." once) | could not verify | could not verify | open-ended |
| **Webhook notifications** | ✓ | ✓ | ✓ | ✓ | | | ✓ |
| **Multi-condition alerts** | ✓ (pricing) / Plus+ (Help Center) | ✓ | ✓ | ✓ | | | ✓ |
| **Alerts on financial metrics** | ✓ | ✓ | ✓ | ✓ | | | ✓ |
| **Second-based alerts** | ✓ | ✓ | ✓ | ✓ | | | ✓ |
| Alert presets | 5 per user (all plans, per Help Center) | | | | | | |
| Log retention | 30 days / 100 events per alert (all plans) | | | | | | |

History for context: March 2023 doubled totals to Basic 2 / Pro 40 / Pro+ 200 / Premium 800 (then Basic → 5 price + 1 technical in June 2023); today's tiers are renamed and Basic has 3 price alerts and no technical alerts. ([It's doubled now], [Pricing])

Other hard limits (all plans): 300-char name, 4,000-char message, 15 triggers per 3 minutes, 5 conditions per alert, 1-year inactivity auto-disable.

---

## 9. Things TradingView does NOT have (so OnStock should not assume them)

- No native SMS; **Send plain text** to a carrier email gateway is the substitute.
- No OR logic in multi-condition alerts; AND only.
- No timer/clock alert; the Vertical Line workaround is official.
- No "apply this alert to N symbols" except watchlist alerts (Premium+); "set an individual alert on each symbol" otherwise.
- No editing of presets; recreate.
- No custom webhook headers or signing secret; only an SSL client certificate and a source-IP list.
- Alert log is capped (30 days / 100 per alert) — history is not a feature, CSV export is.

---

## What this means for OnStock

OnStock today (from `src/state/AlertsContext.jsx` and `src/overlays/SetAlertSheet.jsx`): two alert kinds per asset — **drift** (|premium| crosses ±0.5/1/2/5 %, re-arms at 80 % of threshold, 10-minute cooldown) and **price target** (token price crosses $X, direction inferred, one-shot, self-deletes). Rules mirror to Supabase `user_alerts`; fired events (max 50) and read-state stay device-local; the only channel is an in-app feed with an unread dot. Evaluation is client-side on every price tick.

1. **Adopt — the alert line on the chart.** A draggable mark on the price scale at each alert level (with an optional dashed line across the chart) that blinks when it fires is the single most TradingView-like thing a desktop can add, and OnStock's price-target alert already has a level. Drift alerts have no fixed price, but they can draw a band on the Gap view (±threshold %) which is arguably better than what TradingView offers for a moving condition.
2. **Adopt — the Alerts side panel with Alerts / Log tabs, status badges, and sort/search.** OnStock has the data (rules + events) but shows it only as a feed. Desktop has room for a right-rail panel: rows = rules with **Active** / **Stopped — Triggered** / **Stopped manually** badges, last-trigger time, double-click to edit, right-click to stop/restart/delete/clone; Log = the existing events with a CSV export. Stop/restart is new state (OnStock currently deletes instead of stopping).
3. **Adopt — explicit trigger frequency, but only two options.** TradingView's split is honest: price alerts are **Only Once** or **Every Time**; interval alerts get bar-based options. OnStock's price target is already Only Once and drift is effectively Every Time with hysteresis. Expose that choice as a labelled control instead of hiding it in the type; skip **Once Per Bar Close** until alerts run server-side on candles.
4. **Adopt — Crossing / Crossing Up / Crossing Down as the operator vocabulary.** OnStock infers direction from the current price; a user who wants "alert when it comes back down to 150" cannot express it. Three radio options match TradingView's labels and fix that.
5. **Adapt — the gap alert is OnStock's "channel" alert.** TradingView's **Entering Channel / Exiting Channel / Inside / Outside** on a drawn band is exactly the drift alert generalised: let the user set an asymmetric band (e.g. premium > +2 % OR < −1 %) and pick Exiting (what OnStock does now) or Entering (gap closes — useful for arbitrage timing). Keep the hysteresis; TradingView's 15-in-3-minutes stop is a cruder version of the same anti-spam idea.
6. **Adapt — an alert name and a message with placeholders.** Copy the mechanism (`{{ticker}}`, `{{close}}`, `{{timenow}}`) and add OnStock's own: `{{gap}}`, `{{stock_close}}`, `{{token_close}}`, `{{underlying}}`. Needed the moment there is any channel beyond the in-app feed; keep TradingView's limits (300 / 4,000 chars) as sane ceilings.
7. **Adapt — expiration with a visible date, no plan-gating.** A default 2-month expiry with an **Open-ended** toggle is a good hygiene feature (stale alerts on delisted tokens pile up); OnStock has no reason to paywall it. Also copy the 1-year-untouched auto-disable.
8. **Adapt — notification channels, in this order: browser/desktop push, email, webhook.** TradingView's server-side design is the prerequisite: OnStock evaluates in the browser today, so nothing fires when the tab is closed. Moving evaluation to a Vercel cron/function (or Supabase edge function) is the real project; then email via the existing account email, then a **Webhook URL** with TradingView's exact contract (POST, JSON if the body parses, 3-second timeout, retry ×3 on 5xx, a logged status) — traders already have receivers built for that shape.
9. **Adapt — the notification schedule.** Tokenized stocks trade 24/7 while the underlying does not; a per-alert **24/7 / Weekdays / Custom** window (delivery-only, event still logged) is cheap and directly relevant to "gap blew out at 3 a.m. Sunday".
10. **Adapt — log retention and export.** OnStock caps at 50 events in localStorage. Match TradingView's shape (per-alert cap, 30-day window) but store events server-side once alerts are server-side; add CSV export to the Log tab.
11. **Adapt — an "Add alert on …" chart context menu and the price-scale plus button.** Right-click on the candles → **Add alert on TSLAx at 212.40**; hover the price scale → **+** to create at that price. Both are pure UI, no backend.
12. **Adapt — alert presets, sized down.** Five saved presets is overkill; but "±1 % drift, every time, push + email" as a one-click default per folder would cut the per-asset dialog to one click. Folders already exist.
13. **Skip — technical alerts on indicators and drawings.** OnStock has SMA/EMA/RSI but no drawing layer, no Pine, no plot registry; the frozen-at-creation semantics and repaint caveats are a large support burden for little gap-tracking value. Revisit only if a drawing surface ships.
14. **Skip — watchlist alerts as a paid tier.** OnStock's watchlists are small and the drift rule already applies per asset; a "set drift alert on every asset in this folder" bulk action gives the same outcome without the separate quota/lifecycle machinery.
15. **Skip — strategy alerts, multi-condition AND builder, second-based alerts, fundamentals alerts.** None map onto OnStock's data (no strategies, no second candles, no fundamentals feed). Multi-condition can come back later as "price AND gap" if users ask.
16. **Skip — plan-tiered alert counts.** TradingView's price/technical/watchlist quotas exist to sell plans; OnStock should set one generous hard cap (for server cost) and say so plainly, matching the owner's preference for straightforward products.

---

## Sources

Primary (tradingview.com Help Center, docs, blog, pricing):

- https://www.tradingview.com/support/solutions/43000520149-how-to-set-up-alerts/ (resolves to "Introduction to TradingView alerts")
- https://www.tradingview.com/support/solutions/43000595315-how-to-set-up-alerts/
- https://www.tradingview.com/support/solutions/43000763312-learn-how-to-configure-alerts/
- https://www.tradingview.com/support/solutions/43000763313-how-to-use-price-alerts/
- https://www.tradingview.com/support/solutions/43000763315-getting-started-with-technical-alerts/
- https://www.tradingview.com/support/solutions/43000761492-multi-condition-alerts/
- https://www.tradingview.com/support/solutions/43000739708-watchlist-alerts/
- https://www.tradingview.com/support/solutions/43000739521-limited-functionality-state-in-watchlist-alerts/
- https://www.tradingview.com/support/solutions/43000595311-manage-alerts/
- https://www.tradingview.com/support/solutions/43000474415-differences-between-alert-frequencies/
- https://www.tradingview.com/support/solutions/43000690908-why-is-the-once-per-bar-option-missing/
- https://www.tradingview.com/support/solutions/43000741171-issue-with-once-per-bar-alert/
- https://www.tradingview.com/support/solutions/43000773948-delays-in-onceperbarclose-alerts/
- https://www.tradingview.com/support/solutions/43000690939-alert-was-triggered-too-often-and-stopped/
- https://www.tradingview.com/support/solutions/43000481368-strategy-alerts/
- https://www.tradingview.com/support/solutions/43000597494-alerts-on-alert-function/
- https://www.tradingview.com/support/solutions/43000478392-i-m-unable-to-find-an-alert-condition-function-that-meets-my-needs/
- https://www.tradingview.com/support/solutions/43000531021-how-to-use-a-variable-value-in-alert/
- https://www.tradingview.com/support/solutions/43000542963-i-ve-added-a-variable-value-to-an-alert-description-i-e-close-but-it-doesn-t-work/
- https://www.tradingview.com/support/solutions/43000773947-alert-name-and-message-size-limits/
- https://www.tradingview.com/support/solutions/43000774194-alert-presets/
- https://www.tradingview.com/support/solutions/43000786831-alerts-on-fundamentals/
- https://www.tradingview.com/support/solutions/43000787196-notification-schedule-for-alerts/
- https://www.tradingview.com/support/solutions/43000688759-i-upgraded-to-the-premium-plan-but-my-alerts-still-expiring-in-2-months/
- https://www.tradingview.com/support/solutions/43000766059-stopping-alerts-when-downgrading-your-plan/
- https://www.tradingview.com/support/solutions/43000690941-how-to-get-more-active-alerts-per-subscription/
- https://www.tradingview.com/support/solutions/43000696403-alerts-separation-by-type/
- https://www.tradingview.com/support/solutions/43000653371-i-cannot-create-new-alerts-even-though-i-have-not-exceeded-the-alert-limit-of-my-subscription/
- https://www.tradingview.com/support/solutions/43000766116-automatic-deletion-of-old-alert-triggers-from-the-log/
- https://www.tradingview.com/support/solutions/43000691967-what-timezone-is-displayed-in-alerts/
- https://www.tradingview.com/support/solutions/43000698958-alerts-based-on-real-time-and-non-real-time-symbols/
- https://www.tradingview.com/support/solutions/43000698959-how-do-i-set-an-alert-at-a-preset-time/
- https://www.tradingview.com/support/solutions/43000690942-i-cannot-set-alerts-with-log-scale-enabled/
- https://www.tradingview.com/support/solutions/43000707656-how-can-i-change-the-color-of-the-alert-price-line/
- https://www.tradingview.com/support/solutions/43000645260-how-to-enable-disable-the-alert-line-on-the-chart/
- https://www.tradingview.com/support/solutions/43000699223-how-to-create-an-order-alert-and-price-line-anywhere-on-the-chart/
- https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/
- https://www.tradingview.com/support/solutions/43000737982-i-want-my-toasts-to-stay-visible-what-should-i-do/
- https://www.tradingview.com/support/solutions/43000740625-how-to-adjust-alert-volume/
- https://www.tradingview.com/support/solutions/43000474409-i-cannot-hear-sound-notifications-of-my-alerts/
- https://www.tradingview.com/support/solutions/43000732768-errors-when-creating-loading-alerts/
- https://www.tradingview.com/support/solutions/43000754635-error-when-creating-alert-on-script/
- https://www.tradingview.com/support/solutions/43000773984-the-impact-of-data-repainting-on-alert-calculation/
- https://www.tradingview.com/support/solutions/43000744279-issue-with-alerts-on-indicators-that-use-offsets/
- https://www.tradingview.com/support/solutions/43000744212-the-issue-with-crossing-alerts-on-the-volume-indicator/
- https://www.tradingview.com/support/solutions/43000771511-the-trigger-time-of-a-strategy-alert-differs-from-the-order-execution-time-in-the-strategy-tester/
- https://www.tradingview.com/support/solutions/43000774016-common-reasons-for-mismatches-between-strategy-alert-triggers-and-strategy-orders-on-the-chart/
- https://www.tradingview.com/support/solutions/43000548327-will-alerts-work-if-tradingview-is-not-open-on-the-computer/
- https://www.tradingview.com/support/solutions/43000474389-how-to-receive-phone-notifications-for-alerts/
- https://www.tradingview.com/support/solutions/43000474590-how-do-i-enable-push-notifications-to-receive-alerts-on-my-ios-device/
- https://www.tradingview.com/support/solutions/43000474595-how-do-i-enable-push-notifications-to-receive-alerts-on-my-android-device/
- https://www.tradingview.com/support/solutions/43000506688-android-i-m-not-receiving-notifications-about-triggered-alerts/
- https://www.tradingview.com/support/solutions/43000506690-ios-alerts-log-doesn-t-show-some-triggered-alerts/
- https://www.tradingview.com/support/solutions/43000474394-i-d-like-to-use-an-alternative-email-address-for-alert-notifications/
- https://www.tradingview.com/support/solutions/43000474398-how-to-change-the-email-to-sms-address-used-for-alert-notifications/
- https://www.tradingview.com/support/solutions/43000482569-i-m-not-receiving-some-of-my-notifications-but-i-have-them-enabled/
- https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/
- https://www.tradingview.com/support/solutions/43000529314-i-cannot-send-webhook-to-a-url-with-a-port-number/
- https://www.tradingview.com/support/solutions/43000529313-i-cannot-send-webhooks-to-slack/
- https://www.tradingview.com/support/solutions/43000529625-i-cannot-send-webhooks-to-discord/
- https://www.tradingview.com/support/solutions/43000680459-webhook-authentication/
- https://www.tradingview.com/support/solutions/43000722015-using-credentials-for-webhooks/
- https://www.tradingview.com/support/solutions/43000735201-webhook-resubmission/
- https://www.tradingview.com/support/solutions/43000776894-what-do-errors-mean-when-sending-webhooks/
- https://www.tradingview.com/support/solutions/43000671618-what-is-tradingview-desktop/
- https://www.tradingview.com/support/solutions/43000762068-what-are-second-based-intervals/
- https://www.tradingview.com/support/folders/43000547663-alerts-settings/
- https://www.tradingview.com/support/folders/43000547712-alerts-notifications/
- https://www.tradingview.com/support/folders/43000560150-webhooks-usage/
- https://www.tradingview.com/support/folders/43000548797-alerts-are-being-triggered-incorrectly-not-being-triggered/
- https://www.tradingview.com/support/folders/43000547714-push-notifications/
- https://www.tradingview.com/support/categories/alerts/
- https://www.tradingview.com/pine-script-docs/concepts/alerts/
- https://www.tradingview.com/pine-script-docs/faq/alerts/
- https://www.tradingview.com/pricing/
- https://www.tradingview.com/blog/en/more-alerts-for-each-plan-31701/
- https://www.tradingview.com/blog/en/watchlist-alerts-on-tradingview-49839/
- https://www.tradingview.com/blog/en/extended-hours-support-59226/
- https://www.tradingview.com/blog/en/brave-new-alerts-manager-21213/
- https://www.tradingview.com/blog/en/multi-select-is-available-for-alerts-23186/
- https://www.tradingview.com/blog/en/alerts-on-fibonacci-drawings-58692/
- https://www.tradingview.com/blog/en/alerts-on-rectangle-drawings-55208/
- https://www.tradingview.com/blog/en/updated-chart-patterns-alerts-visibility-new-indicator-40555/
- https://www.tradingview.com/blog/en/alerts-for-second-resolutions-16646/
- https://www.tradingview.com/blog/en/new-alert-sounds-46455/
- https://www.tradingview.com/blog/en/volume-control-for-alerts-48330/
- https://www.tradingview.com/blog/en/alert-presets-56465/

Third-party, used only to cross-check dialog labels (nothing here is sourced solely from them):

- https://www.tradealert.pro/blog/tradingview-set-up-alert-any-indicator
- https://www.financialtechwiz.com/post/how-to-set-alerts-on-tradingview/
- https://www.tv-hub.org/guide/tradingview-alerts-setup

Could not fetch (404): https://www.tradingview.com/support/solutions/43000481633-what-types-of-alerts-are-there/ (superseded by the "How to use price alerts" / "Getting started with technical alerts" pair above).
