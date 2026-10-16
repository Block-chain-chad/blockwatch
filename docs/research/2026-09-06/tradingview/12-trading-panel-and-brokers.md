# 12 — Trading panel and brokers

TradingView teardown, surface 12 of 13. Researched 2026-09-06 against TradingView's Help Center, its Broker Integration (REST API) manual, its Charting Library "Trading Platform" docs, the public pricing page, the broker directory, and one broker profile page. Every option name below is written the way TradingView writes it. Where a page only shipped a GIF and no text, the row says **could not verify** rather than guessing.

Scope: how a user connects a broker, Paper Trading, the order ticket, the Account Manager (positions / orders / account tabs), trading from the chart, the DOM widget, the trading-related chart settings, and the "TradingView for brokers" integration model. Other surfaces (chart anatomy, alerts, watchlists, plans in general, Replay as a feature) are covered by their own documents; they are mentioned here only where trading touches them.

---

## 0. The one-paragraph version

Trading on TradingView is **an interface to somebody else's broker**. The Help Center says it plainly: "TradingView doesn't process your trades and acts as an interface only." A user clicks **Trade** in Supercharts, sees a list of "licensed and verified brokers" plus **Paper Trading**, logs in to one of them (username/password popup, or an OAuth "Continue" tab), and from then on three things appear: an **order ticket** docked on the right of the chart (with an **Order** tab and a **DOM** tab), an **Account Manager** docked at the bottom (Positions / Orders / History / summary row), and **order and position lines on the chart** that can be dragged, closed, reversed, and bracketed. The broker holds the money, executes the order, and reports fills back; TradingView draws it. Paper Trading is the same UI wired to TradingView's own simulator. None of this is plan-gated on the public pricing page: all five plans show a check for "Trade through selected brokers", "Simulated (paper) trading", "Chart trading", and "Depth of Market (DOM) trading".

---

## 1. Where trading lives in Supercharts

| Element | Where it is | What it does | Source |
|---|---|---|---|
| **Trade** button | Top toolbar of Supercharts; several articles say "in the upper-right corner" / "top-right corner" | Opens the broker list the first time; after you are connected it opens the order ticket / Account Manager | Help: How to trade on TradingView; What is a market order; Introduction to trailing stops |
| **Trading panel** (a.k.a. **Account Manager**) | "at the bottom" of Supercharts | Positions, Orders, History, summary row, trading menu | Help: How to connect or disconnect a Paper Trading account; What is the Account Manager |
| **Order ticket** (a.k.a. **Order panel** / **Order window**) | "on the right-hand side of Supercharts after you connect to your broker or paper trading" | Where an order is composed; has two tabs: **Order** and **DOM** | Help: What is an order ticket; Depth of Market (DOM) |
| **Buy/Sell buttons** | On the chart (in the legend area) once enabled in chart settings; a floating **Buy/Sell panel** on mobile | One-click / one-tap order entry using the current preset | Help: How to show buy/sell buttons on the chart; How to enable/disable buy/sell buttons in the app |
| **Plus (+) button on the price scale** | Price scale, at the hovered price | Quick trading: creates an **order projection** at that price | Help: Chart trading – order projection; Charting Library featureset `chart_crosshair_menu` ("Shows the Plus button on the price scale for quick trading") |
| Chart context menu | Right-click on the chart | Alternative entry for a projected order; on an order/position line it gives Modify / Close / Reverse / brackets | Help: Chart trading on TradingView – key features |
| **Broker icon on the chart** (mobile) | On the chart in the mobile app | "tap on the broker's icon displayed on the chart" opens the trading panel | Help: Where can I find my positions and orders in the mobile app |

Two things worth stating explicitly because they shape everything else:

1. **The ticket and the chart are one object.** "All changes to the future order on the chart are synchronized with the order ticket and vice versa." (Order projection article.) The features page calls this "order ticket synchronization".
2. **Data on the trading side comes from the broker, not from the chart's data feed.** The DOM article: data "originates from your broker and may differ slightly from chart data due to varying sources." The Level 2 article: "you must be connected to the broker" and "Level 2 data is available only for a limited number of symbols."

---

## 2. Connecting a broker

### 2.1 The broker list (what the user sees after clicking Trade)

The Trade button shows "the list of licensed and verified brokers" with **Paper Trading** first. The public directory at `tradingview.com/brokers/` is the same catalogue with reviews. Verbatim labels on the directory (Help: Finding your perfect broker on TradingView):

| Directory element | Verbatim options / labels |
|---|---|
| Category tabs | "Stock brokers", "Crypto brokers", "Forex brokers", "Futures brokers", "CFDs brokers", "Options brokers" |
| Sort dropdown | "Best rated", "Most reviewed", "Most users" |
| Fields on each broker card | "Tradable assets", "User rating", "Number of reviews", "Connected accounts" |
| Broker profile tabs | **Overview**, **Reviews**, **Publications** |
| Profile buttons (seen on OANDA's page) | "Open account", "Trade", "Follow" / "Following" |
| Comparison | "Pick a broker" → "Compare now" side-by-side; the FAQ says brokers are compared on "fees, spreads, deposits, tradable assets, and regulation" plus "the number of connected accounts and the foundation date" |
| **Beta** label | Shown in the Trading Panel when "an integration just came out of testing and went live" or "a new major feature has been recently introduced within an integration"; TradingView says to "acknowledge that using an integration with a beta label is still risky" |

Ratings: "Only verified users with active trading accounts linked to their respective brokers on TradingView are permitted to leave reviews", recent ratings weigh more than old ones, and TradingView does not publish the formula (Help: How is the brokers rating calculated).

The brokers page as fetched listed **32** broker cards (below). The features page claims "100+ trusted brokers" / "100+ verified broker partners"; the Help Center's Trading category has **48 broker-specific folders**. The difference is real — the directory front page is not the whole list — and the exact live count **could not be verified** from a single page.

Brokers on the front page of the directory on 2026-09-06, with TradingView's rating and asset tags: FOREX.com (4.5, Forex), OANDA (4.6, Forex), NinjaTrader (4.5, Futures), moomoo (4.5, Stocks/ETFs/Options), OKX (4.5, Crypto), AMP Futures (4.4, Futures), Tradovate (4.4, Futures), TradeStation (4.3, Stocks/Futures/Options), Webull (4.3, Stocks/Futures), Optimus Futures (4.2, Futures), Kraken (4.2, Crypto), Interactive Brokers (4.2, Stocks/Crypto/Forex/Futures/Bonds/Options), Crypto.com Exchange (4.2, Crypto), EdgeClear (4.2, Futures), tastyfx (4.2, Forex), tastytrade (4.2, Stocks/Futures/Options), Ironbeam (4.1, Futures), Coinbase Advanced (4.1, Crypto/Futures), Tradier Futures (4.0, Futures), StoneX (4.0, Futures), Clear Street (4.0, Stocks/ETFs/Options), Investrade (4.0, Stocks/ETFs/Options), Plus500US (3.9, Futures), Fidelity Investments (3.9, Stocks/ETFs), TradeZero (3.8, Stocks/ETFs), Alpaca (3.8, Stocks/Crypto/ETFs/Options), Webull Pay (3.7, Crypto), Dorman Trading (3.7, Futures), Gemini (3.7, Crypto), Cobra Trading (3.7, Stocks/Crypto/Futures/ETFs), Bitstamp (3.7, Crypto), Tradier Brokerage (3.7, Stocks/ETFs/Options).

Help-Center broker folders (each with 1–11 articles): A1 Capital, ActivTrades, AMP, Binance, BingX, Bitget, Blackbull, Bybit, City Index, CFI, Crypto.com Exchange, CXM, Derayah, Eightcap, FOREXCOM, FP Markets, Fusion Markets, Gemini, Genial Investimentos, iBroker, IC Markets, IG, Interactive Brokers, Info Yatirim, Kotak Neo, NinjaTrader, OANDA, OKX, Osmanli Yatirim, Pepperstone, Phemex, PhillipCapital Turkiye, Phillip Nova, Tickmill, Purple Trading, Tradestation, Tradovate, Vantage, WH SelfInvest (and others; the category page listed 48).

Note for OnStock's thesis: one integration already carries **tokenized traditional assets** — Crypto.com Exchange offers "Pre-IPO Perpetuals (RWA)" and "Traditional Assets perpetuals (commodities and equity index ETFs)" through the TradingView ticket, with per-order leverage under "Extra Settings" and a "Reduce Only" flag (Help: RWA and Traditional Assets – leverage and eligibility). These are perpetual futures, not spot tokens, but it is the closest thing on TradingView to what OnStock charts.

### 2.2 The connect flow, step by step

Desktop/web (Help: How to trade on TradingView; Finding your perfect broker; Broker API "Authentication"):

1. Open Supercharts (`tradingview.com/chart/`).
2. Click **Trade** in the top toolbar.
3. Pick a broker card (or **Paper Trading**). If it is not shown, on mobile "tap Show All to reveal the full list or use the search bar at the top".
4. Authenticate. Two mechanisms exist, chosen by the broker, not the user:
   - **Password Bearer** — "credentials popup appears; user submits form"; TradingView posts them to the broker's `/authorize` endpoint and gets back an access token.
   - **OAuth2 Code Flow** (RFC 6749 §4.1) — "user clicks 'Continue' button, opening a new browser tab at the broker's authorization URL"; the broker authenticates and the token exchange happens "directly between the TradingView servers and the broker's server, avoiding client-side storage."
5. Some brokers add steps of their own. Interactive Brokers: choose **Live Trading** or **Paper Trading** *before* logging in ("the interface changes color — gray for live, red for simulated trading"; "You can only select a required trading mode prior to logging in"), then username/password, then an agreement step where you type your name. Binance: if a passkey prompt hangs, wait ~2 minutes, choose "My Passkeys Are Not Available", and use the password instead.
6. On success the order ticket appears on the right and the Account Manager at the bottom.

Mobile (Help: How do I connect or log out of my broker account in the mobile app): "open the chart tab" → "tap the trade button in the toolbar to open the brokers list" → "tap the broker card to connect". Log out: "open Account manager by tapping on the broker's icon on the chart" → "open the trading menu in the top right corner of the opened panel" → "select the Log out option".

Disconnect on web (Help: How to connect or disconnect a Paper Trading account): open the Trading Panel → "Open the trading menu in the top-right" → **Log out Paper Trading** (or **Log out <broker>**) or **See the brokers list**.

Switching brokers: the features page says users can "switch brokers anytime or connect multiple brokers", but the Help Center says "we can guarantee stable connection in one tab and to one broker only" — a second tab connecting to the same broker "will likely disrupt the existing connection in the first tab."

### 2.3 Where the credentials go (three different answers, all TradingView's)

| Context | What TradingView says | Source |
|---|---|---|
| Marketing (features page) | "Your credentials for the broker account are safe — stored locally in your browser and never on our servers." | tradingview.com/features |
| Broker API manual, OAuth2 flow | Token exchange and renewal "performed directly between the TradingView servers and the broker's server, avoiding client-side storage." | broker-api-docs/trading/authentication |
| TradingView Desktop app | Saved broker logins live in **Windows Credential Manager** under "TradingView Desktop/#####" (Windows Credentials) or **Keychain Access** → Local Items → "TradingView Desktop" (macOS); remove them there and restart the app | Help: How to remove saved broker login and password |

Read together: the *password* is not kept on TradingView's servers (Password Bearer sends it straight to the broker's `/authorize`), while an OAuth *access token* is handled server-side. The marketing sentence is about passwords. This matters for OnStock's wording later — a security-cautious user will notice the difference.

### 2.4 Symbols: chart symbol vs broker symbol

When connected, the symbol search can show broker-specific symbols; if you chart `EURUSD` from one feed and trade through another you get "Non-tradable symbol". The fix in the Help Center: "select Forex.com in the symbol search menu if you wish to trade Forex.com currency pairs" and "tick the box in the symbol search menu to see all tradable symbols." On the broker side this is the `/mapping` endpoint ("Return broker instruments mapped to TradingView instruments") and the `supportDisplayBrokerNameInSymbolSearch` flag. Some brokers offer a **data type** choice in the broker's menu — e.g. Osmanli Yatirim: free "real-time BIST_MIXED" data "without volume" vs 15-minute delayed data with volume (Help: Selecting data type in broker settings).

---

## 3. Paper Trading

Paper Trading is TradingView's own simulator, presented as just another broker in the list. "A demo account to practice trading with no deposits and no real money involved."

| Topic | What TradingView says (verbatim where quoted) | Source |
|---|---|---|
| Connect | **Trade** → **Paper Trading** → **Connect** | Help: Paper Trading – main functionality |
| Disconnect | Trading panel → trading menu (top-right) → **Log out Paper Trading** / **See the brokers list** | Help: How to connect or disconnect a Paper Trading account |
| Assets | "stocks, forex, crypto, commodity and index futures, and much more" | Help: Paper Trading – main functionality |
| Order entry | The same three surfaces as a real broker: order ticket, DOM, chart trading | same |
| Starting balance | **Could not verify** — no article fetched states the default balance figure | — |
| Account currency | Default is USD; change it by "Create a new account and select a currency from the available list" or "Reset an existing account. The system will then prompt you to choose a new currency." Warning: "Resetting the account will delete the transaction history, active orders, and open positions." | Help: How to change the account currency in Paper Trading |
| Multiple accounts | Supported; "different leverage parameters for multiple accounts" | Help: How to set leverage in Paper Trading; features page ("Multiple accounts for testing different strategies") |
| Leverage | Set per asset class from dropdowns when creating the account; later via "the gear button next to the account name". Defaults are "pre-filled with leverage values commonly used by brokers and exchanges" (example: E-mini S&P 500 at 20:1). "TradingView doesn't provide real margin trading services. We only simulate the behavior of real brokers." | Help: How to set leverage / How to trade with leverage in Paper Trading |
| Margin readout | "Margin: Total amount of your funds and borrowed funds" in the **Order info** section; a "Margin" column in the Orders tab; a progress bar that "turns red" when margin exceeds available funds; "if the ratio of margin and available funds remains the same, the order won't be executed." | Help: How to trade with leverage in Paper Trading |
| Commission | Off by default. Account settings → commission settings → **Futures & Options** checkbox → amount per contract → **Save** (or **Create** for a new account). "For other instruments, you can use a fixed or percentage-based commission type in the 'Other' section." | Help: What is commission per contract in Paper Trading |
| Fill prices / P&L | "buy orders are executed at the ask price, and sell orders at the bid price. The last price on the chart does not affect the calculation." Long: "(Bid Price − Average Fill Price) × Quantity"; Short: "(Average Fill Price − Ask Price) × Quantity"; futures multiply by Point Value. P&L "is calculated in the symbol's currency and then converted to USD". | Help: How is position profit and loss in Paper Trading calculated |
| Positions per symbol | "Paper Trading does not support multiple positions. With it you can have only one position per symbol. All new orders are merged into a single position." (netting only) | Help: How to place several positions per symbol |
| Multiple exits | "In Paper Trading, you can add up to 4 exit levels." Levels "always come as a pair, which includes both a Take Profit and a Stop Loss." Added via **Add level** in the **Exits** section; removed with a trash icon; the ticket shows the percentage of the parent quantity covered; over 100% "will not execute". | Help: Multiple take profit and stop loss levels |
| Futures | "Classical and crypto futures"; "All futures are treated as cash-settled"; "Your positions close after expiration using the final settlement price"; expired-contract orders are cancelled; an **Expiration Date** column shows in the account tabs | Help: Simulated futures |
| Forex sizing | "the quantity should be entered in units rather than lots. You must specify 1,000, 2,000, and so on." | Help: How to see updates after you open a position |
| Trading on historical data | A **separate** mode from Paper Trading, inside Bar Replay: "Data on trades and the overall result are available only in the session itself, and they are not saved anywhere." Configure "initial capital, base currency, and commission size" in the Replay Trading panel; default size "1 unit for all types of symbols except Forex. For them, the default number is 1000 units." Results tabs: "Overview, Performance, Trades analysis, Risk/performance ratios, and List of trades". | Help: Learn to trade on historical data |
| Export | Trading Panel → **Export Data** → **History** produces a file that the Portfolio feature can import ("Only trades marked with Status as 'Filled'" are imported) | Help: How to create a portfolio from trading history in the TradingView trading panel |
| Competition | **The Leap** — "TradingView's recurring Paper Trading competition", about a month per edition, "All trading activity takes place in real time with simulated execution", public leaderboard, prizes | Help: What is The Leap |

Plan gating: "Simulated (paper) trading" is checked for every plan on the pricing page.

---

## 4. The order ticket

### 4.1 Ways to open it

Help Center + Charting Library "Order Ticket" page together list: the **Trade** button; the Account Manager's **Trade** button; the price scale's **Plus** button; the legend's **Buy** / **Sell** market buttons; the chart's right-click context menu; keyboard shortcuts (**Shift+B** buy, **Shift+S** sell — see §6).

### 4.2 Modes

"You can switch between the **Panel** & **Dialog** modes by docking/undocking the panel." Panel = docked on the right of the chart; Dialog = floating window. (Help: How do I switch my order panel mode; Charting Library featuresets `order_panel_undock`, `order_panel_close_button`.)

### 4.3 Fields, in the order the Help Center presents them

| Section | Option / label (verbatim) | What it does | Source |
|---|---|---|---|
| Order type | **Market** | "Requires only the number of units you want to buy or sell" | What is an order ticket |
| | **Limit** | "Requires both the number of units and the limit price" | same |
| | **Stop** | "Also called stop-market orders. These orders remain pending until the asset's price reaches the stop price" | same |
| | **Stop limit** | Two prices: stop (trigger) and limit (worst acceptable fill); "Select 'Stop limit' in the order ticket" | Understanding stop-limit orders |
| | **Trailing stop** | "Select 'Trailing stop'" then "specify the trailing distance value"; "Make sure that your broker supports this order type" | Introduction to trailing stops |
| Price entry | **Price** | Exact price | What is an order ticket |
| | **Price offset (bid)** | Ticks away from bid, for sell orders | same |
| | **Price offset (ask)** | Ticks away from ask, for buy orders | same |
| | *(settings)* **Show Order Price in Ticks** | Price shown in ticks rather than currency | Charting Library: Order Ticket |
| Quantity mode | **Units** | Plain quantity | What is an order ticket |
| | **Currency** | Size by money value | same |
| | **% of balance** | Size by share of account | same |
| | **Risk, currency** | Size so the stop loss risks this many currency units | same; "I'd like to set my take profit and stop loss in dollar terms…" |
| | **Risk, % balance** | Size so the stop loss risks this % of balance | same |
| | *(constraint)* | "You can't automatically calculate both the Quantity and Stop Loss levels at the same time." | I'd like to set my take profit and stop loss in dollar terms… |
| Take Profit / Stop Loss units | **Price** | Absolute level | What is an order ticket |
| | **Ticks** | Distance in ticks/pips | same |
| | **% of price** | Distance as a percentage of entry | same |
| | **Reward/risk, currency** | Target/stop expressed in money | same |
| | **Reward/risk, % balance** | Target/stop expressed as % of balance | same |
| | *(settings)* **Show Quantity in Money Risk**, **Show Quantity in % Risk**, **Show TP/SL inputs in Money/%** | Toggles in the ticket's ellipsis (…) settings menu | Charting Library: Order Ticket |
| Exits | **Add level** | Adds a paired TP+SL exit; Paper Trading allows up to 4 | Multiple take profit and stop loss levels |
| Duration | **Time in force** | "the amount of time an order remains active or pending"; if it seems missing, "drag the Order Info panel down and you will be able to see the Time in Force option" | What is an order ticket; Why is the Time in Force setting not shown |
| | *(values)* | The specific values (DAY, GTC, …) **could not be verified** from the Help Center; on the broker side they are declared per instrument by the broker | — |
| Presets | **Order presets** button → **Save Order preset…** → name → **Save** | Saves order type, relative prices in ticks from bid/ask, brackets (relative price or %), and "Order validity period". Limit "10 presets for one broker". | What are order presets; How to create…; How many… |
| Order info | leverage, "ticks/pips value", "trade value", risk/reward | Read-only calculator strip under the inputs; on the library side gated by `order_info` and the margin meter by `supportMargin` | What is an order ticket; Charting Library |
| Confirmation | **Show order confirmations** | Preview dialog before send; broker flag `supportPlaceOrderPreview` / `supportModifyOrderPreview` | Charting Library: Order Ticket |
| Broker extras | e.g. Crypto.com Exchange **Extra Settings** → leverage, **Reduce Only**; OKX **Margin mode** (required before instant trading) | Broker-specific rows the broker adds via custom fields | RWA and Traditional Assets…; I can't use instant trading with OKX |
| Simplified ticket | "You are able to adjust (show/hide) quite a few fields in the order ticket." | Field visibility toggles; the exact toggle list shipped only as a GIF — **could not verify** the labels | I'd like to see a simplified order ticket |
| Hidden product types | Some broker product types are hidden "in accordance with regulatory requirements" (Kotak Neo: "Invest NRML, Invest MTF, Intraday Cover Order, Intraday Bracket order") | Broker-level filtering of what the ticket offers | Why can't I see certain order product types |

### 4.4 Brackets (TP/SL) — the vocabulary

TradingView uses **bracket** for a TP and/or SL attached to something. Two parents exist, and the broker declares which it supports:

| Term (verbatim) | Meaning | Source |
|---|---|---|
| **Order brackets** | TP/SL attached to a *pending order*; "when one of the linked orders is executed, the other is automatically canceled" | Help: Order brackets |
| **Position brackets** | "stop-loss and take-profit levels that apply to the entire open position, not individual orders" | Help: Position brackets |
| **Order brackets modification** / **Position brackets modification** | Adjust levels after placement — "Tighten stops to secure gains, adjust targets…" | Help pages of the same names |
| **Add brackets to existing order** / **Add brackets to existing position** | Attach protection later | same |
| **Brackets Management** (checkbox) | "allows modification of Stop Loss and Take Profit orders automatically" — brackets cancel when the position closes or reverses, quantities follow the position; unchecked = manual per-trade SL/TP; needs at least 10 ticks distance; blocked if several SL/TP pairs already exist | Help: How does brackets management work |
| **OSO** / **OCO** | Order-Sends-Order (parent fill activates the brackets) / Order-Cancels-Order (one bracket fill cancels its twin) | Broker API glossary |
| How levels show in the panel | "The Take Profit level is shown as a Limit Order whereas the Stop Loss is a Stop Order." Parent **Working**, levels **Inactive** ("it means that they have not been activated yet"); once filled the levels become **Working** | Help: How are levels displayed in the Trading Panel |

Broker-specific limits the Help Center documents, useful as examples of what "supported" hides: FOREX.com US accounts cannot attach SL/TP to market orders and can bracket only the **Net position**, and after a fill the brackets "turn into a pair of linked OCO orders, but they are no longer linked to the opened individual position"; Tradovate only lets you add SL/TP *while placing* in the order panel (the **Modify Order** menu greys them out) but you can then drag them on the chart; Bitget trailing stops placed on Bitget's own site do not show on TradingView at all.

### 4.5 Status vocabulary (what the panel prints)

From the Broker API "Trading concepts" page: transitional statuses **Placing** ("broker registered the order, exchange hasn't confirmed yet"), **Working**, **Inactive**; final statuses **Filled**, **Canceled**, **Rejected**.

---

## 5. The Account Manager (Trading panel tabs)

"The account manager is a place where you can track your orders and positions, access account settings, and configure how information about your open and closed trades is displayed." It docks at the bottom after connecting. Columns "vary by broker".

### 5.1 Summary row (top-right of the panel)

Paper Trading's summary row: **Account balance**, **Equity**, **Realized/Unrealized PnL**, **Account margin**, **Available funds**, **Orders margin**, **Margin buffer** (Help: What is the Account Manager). Crypto.com Exchange's **Account Summary** tab → **Account Info** section instead shows **Account Balance**, **Margin Balance**, **Available Margin**, **Initial Margin**, **Maintenance Margin**, **Effective Leverage** — supplied by the exchange, "not independently calculated by TradingView" (Help: Account summary). On the library side this is `AccountManagerInfo.summary` built from `AccountManagerSummaryField` objects with "watched values", and a broker can add its own line via `supportCustomAccountSummaryRow`.

### 5.2 Tabs

| Tab (verbatim) | Contents | Source |
|---|---|---|
| **Positions** | "Active holdings across all assets"; per-position leverage shows here for Crypto.com | What is the Account Manager; RWA and Traditional Assets |
| **Orders** | "Current pending orders"; includes a **Margin** column in Paper Trading | What is the Account Manager; How to trade with leverage in Paper Trading |
| **History** | "Filled, rejected, and canceled orders with timing and margin data"; for Crypto.com limited to "Last 30 days · Max 200 rows" | What is the Account Manager; Sub-accounts, balances and history |
| **Account History** | "Closed positions showing entry/close prices and realized profits" | What is the Account Manager |
| **Trading Journal** | "Text-based order documentation with timestamps" | same |
| **Account Summary** | Account-level figures (see 5.1) | Account summary |
| **Balances** | Crypto wallet balances (broker flag `supportBalances`, endpoint `/balances`) | Sub-accounts, balances and history; Broker API |
| **Notifications log** | "Records trading actions like placing or canceling orders" and mirrors the toast messages; library featureset `show_trading_notifications_history` | Charting Library: Account Manager |
| Sub-account selector | Dropdown of sub-accounts; "The default account activates automatically upon initial connection" | Sub-accounts, balances and history; Charting Library ("switch between them using the drop-down menu") |

### 5.3 The trading menu (click the broker name, top-right of the panel)

"Clicking your broker name provides access to trading settings, CSV export functionality, and broker/exchange switching options." Items seen across articles: **Log out <broker>**, **See the brokers list**, **Export Data** (→ **History**), trading settings, PnL method. **Could not verify** the full ordered menu — no article prints it as a list.

### 5.4 Per-position actions

| Action (verbatim) | Behaviour | Source |
|---|---|---|
| **Close** / **Flatten** | Close the position (DOM calls it **Flatten**) | Depth of Market; Trading primitives |
| **Partial position close** | "if holding 3 contracts, a trader can close 1 or 2"; broker flag `supportPartialClosePosition` | Partial position close |
| **Reverse Position** | "instantly closes your current position and opens an opposite one with the same size" (2 long → sells 4); flags `supportReversePosition` / `supportNativeReversePosition` | Reverse position |
| **Modify** / **Cancel** (orders) | Buttons on order lines; "If you do not provide a callback for a specific action, its button is hidden" | Trading primitives |
| **Cancel all** | DOM **CXL ALL**; API `POST /accounts/{id}/orders/cancelAll`; flags `supportCloseAllOrdersForSymbol`, `supportClosingMultipleOrdersById` | DOM; REST API spec |
| Close-position / cancel-order dialogs | Confirmation dialogs (library shows the symbol logo in them via `show_symbol_logo_in_close_position_dialog`, `show_symbol_logo_in_cancel_order_dialog`) | Charting Library featuresets |

### 5.5 P&L accounting

**PnL calculation methods**: **FIFO** ("sells the shares you bought earliest first") and **WAC** ("values every share at the average cost of your whole position"); cost basis "including commissions and fees"; TradingView suggests FIFO "as the default standard method when uncertain". The article does not say where the toggle lives — **could not verify** the path.

---

## 6. Trading from the chart

### 6.1 What is drawn

| On-chart object | What it is | Source |
|---|---|---|
| **Order line** | A pending order at its price; buttons **Modify** / **Cancel**; draggable to a new price | Trading primitives; Chart trading key features |
| **Position line** | Open position with P&L; buttons **Close** / **Reverse**; P&L shown in **Money ($)**, **Ticks**, or **Percentage (%)** (setting) | Trading primitives; I'd like to change how PnL is shown on the chart |
| **Bracket lines** | TP / SL attached to an order or position; draggable | Order projection; Can I add stop loss/take profit levels on the chart |
| **Executions** / **Execution Labels** | Marks where fills happened — "overlays your executed orders directly on the price chart" | Execution history on the chart; How do I disable executions in bar replay |
| **Order projection** | "a visual representation of a placed order that exists only on the chart and is not sent to the broker before placement" | Chart trading – order projection |
| **Buy/Sell buttons** (legend) | Market buttons showing the current bid/ask; if `/quotes` is missing the broker's "Sell/Buy fields in Order Ticket" are empty | How to show buy/sell buttons; Broker API endpoints |
| Trading notifications | Toasts on the chart for placed/filled/cancelled; logged in **Notifications log** | Charting Library featuresets |

### 6.2 Order projection — the "drag a future order" flow

From the Help Center, verbatim capability list:

- Create it from the **+** on the price scale or the chart context menu.
- "Adjust the future order's price by dragging it directly on the chart".
- "Set order size via calculator after clicking the quantity field".
- Order type dropdown: **Limit**, **Stop**, **Stop Limit** — "market orders are not supported" as projections.
- "Add and modify take-profit and stop-loss levels by dragging them on the chart".
- Place it "by clicking buy/sell buttons or pressing Enter"; cancel "by clicking the cancel icon or pressing Escape".
- "Only one order can be projected at a time".
- Projected orders show "across multiple layouts" (synchronised).

Modifying an existing order on the chart: **Discard changes** / **Confirm changes** buttons, bracket-addition buttons, quantity via the calculator, close order or position; **With confirmation** vs **Without confirmation** modes (Help: Chart trading on TradingView – key features).

### 6.3 One-click / instant trading and hotkeys

| Option (verbatim) | Where | Effect | Source |
|---|---|---|---|
| **Instant orders placement** | Chart settings (cogwheel) → **Trading** tab | Orders from Buy/Sell buttons and hotkeys go straight to the broker with no ticket ("orders-without-confirmation mode") | I can't use instant trading with OKX; How to apply the created preset |
| **One-tap trading** (mobile) | Three-dot menu in the Order Panel or on the floating Buy/Sell panel | Shows/hides the floating Buy/Sell panel; "When disabled: Buy/Sell buttons are hidden to keep the chart uncluttered" | How to enable/disable buy/sell buttons in the app |
| **Shift+B** / **Shift+S** | Keyboard | Buy / sell "using the applied preset parameters" in without-confirmation mode | What is a market order; How to apply the created preset |
| **Enter** / **Escape** | Keyboard, while an order is projected | Place / cancel the projection | Chart trading – order projection |
| Preset menu button | "next to your chart's Buy/Sell buttons" | Choose which preset the buttons use; the button shows the preset name and tooltips with its parameters; in with-confirmation mode the ticket opens pre-filled ("this preset application doesn't occur when the Trade button is used") | How to apply the created preset |

### 6.4 The chart settings → Trading tab (what is verifiable)

Chart settings has a **Trading** section (library featureset `chart_property_page_trading`: "Shows the Trading section in Chart settings"). Options the Help Center names, verbatim:

| Option | Source |
|---|---|
| Buy/Sell buttons ("show buy/sell buttons in the chart settings") | How to show buy/sell buttons on the chart |
| **Instant orders placement** | I can't use instant trading with OKX |
| **Executions** | How do I disable executions in bar replay |
| **Execution Labels** | same |
| Sound notifications for order execution ("Open the Trading tab in your chart settings to enable sound notifications") | I'd like to enable sound notifications for order execution |
| PnL display for active positions: **Money ($)**, **Ticks**, **Percentage (%)** — set independently for positions and for bracket orders | I'd like to change how PnL is shown on the chart |
| **Positions and Orders** ("shows all your active positions and orders directly on the chart") | Positions and orders |

The complete ordered list of the tab's toggles (e.g. whether "Reverse position button" or "Notifications" appear as separate switches) **could not be verified** from text; the buy/sell article ships only a screenshot. Surface 02 (chart settings dialog) may have it from a live read.

---

## 7. The DOM widget (Depth of Market)

Open the order ticket (Trade) → the **DOM** tab. Requires a broker with Level 2 ("Tier 2") data; the price ladder comes from the broker. The Help Center's numbered anatomy, verbatim:

| # | Element | Behaviour |
|---|---|---|
| 1 | Placed orders | Your working orders on the ladder |
| 2 / 3 | **Asks** / **Bids** | Resting volume at each price |
| 4 | Price cells | Click = limit order (left column buy, right column sell); **Ctrl**/**Cmd**+click = stop order; right-click = menu with all order types |
| 5 | Cancel-all buttons per side | Cross under the blue buy column / red sell column |
| 6 | Centering button | "realigns view to current price" |
| 7 | Open position size | Blue = long, red = short |
| 8 | Profit/loss | "adjustable to money, pips, or percentage" |
| 9 | **Flatten** | Closes the position |
| 10 | **Reverse** | Reverses the position |
| 11 | **CXL ALL** | Cancels every order |
| 12 | Quantity field | Size for the next click |
| — | **Buy Mkt** / **Sell Mkt** | Market buttons |
| — | Price-step dropdown "above the DOM" | "change the price increment"; default is "the smallest available step"; "the DOM instantly recalculates all price levels" |

Order colours on the ladder: **Green** = active Limit; **Red** = active Stop; **Yellow** = active StopLimit ("limit level appears duller than stop level"). Modify by clicking an order (dialog) or dragging it. Mode: "static mode" — "the price series is fixed, while the current price moves within, above, or below the designated range".

Level 2 availability: "you must be connected to the broker"; supported through "Interactive Brokers (IBKR), NinjaTrader, Tradovate, Binance, OKX, and approximately 40+ other supported brokers"; OANDA's profile shows **Level 2 data — Not offered**. Some brokers' DOM/ticket quotes are delayed (Help has articles for TradeStation and Interactive Brokers).

Library side: featuresets `dom_widget`, `static_dom`, `show_dom_first_time`; broker flags `supportLevel2Data` / `supportDOM`; datafeed methods `subscribeDepth` / `unsubscribeDepth`; `cancelOrders` must be implemented.

---

## 8. Plan gating

Pricing page (`tradingview.com/pricing/`), "Trading" rows, read from the raw HTML on 2026-09-06 — every cell is a check icon in all five columns shown (Basic, Essential, Plus, Premium, Ultimate):

| Row (verbatim) | Basic | Essential | Plus | Premium | Ultimate |
|---|---|---|---|---|---|
| Trade through selected brokers | ✓ | ✓ | ✓ | ✓ | ✓ |
| Simulated (paper) trading | ✓ | ✓ | ✓ | ✓ | ✓ |
| Chart trading | ✓ | ✓ | ✓ | ✓ | ✓ |
| Depth of Market (DOM) trading | ✓ | ✓ | ✓ | ✓ | ✓ |

The page as fetched did not show an "Expert" column. Two other things touch trading: the broker profile table has a row **AD-free trading on chart for basic plan** (OANDA: Supported), meaning some brokers buy out the free plan's ads while you are connected; and the Level 2 data behind the DOM is a broker capability, not a plan feature. Contest rows ("Active community contests" 3/5/10/25) live under a different heading and belong to surface 08.

---

## 9. What a broker sees as "supported" (the capability matrix)

Each broker's **Overview** tab has a "Tools and Features" table whose rows are the names TradingView uses for its own features. OANDA's, verbatim:

| Row | OANDA |
|---|---|
| Market orders | Supported |
| Limit orders | Supported |
| Stop orders | Supported |
| Stop limit orders | Supported |
| Order history | Supported |
| Execution history on chart | Supported |
| Partial position close | Supported |
| Reverse position | Supported |
| Order brackets | Supported |
| Order brackets modification | Supported |
| Add brackets to existing order | Supported |
| Position brackets | Supported |
| Position brackets modification | Supported |
| Add brackets to existing position | Supported |
| Trailing stop | Supported |
| Demo account | Supported |
| Level 2 data | Not offered |
| AD-free trading on chart for basic plan | Supported |

These rows map one-to-one onto Help Center articles in the "Trading basics" folder and onto `support*` flags in the Broker API — the whole product is a checklist a broker fills in, and the UI shows or hides pieces accordingly.

---

## 10. "TradingView for brokers": the integration model

Source: `tradingview.com/broker-api-docs/` (Integration overview, Endpoint requirements, Trading concepts, Authentication, REST API spec, Glossary) plus the Charting Library "Trading Platform" docs, which is the same model packaged for a broker's *own* website.

### 10.1 Two independent halves

- **Data integration** (server-to-server): "Market data flows from broker servers to TradingView servers, then to clients" via `/symbol_info`, `/history`, `/streaming`, with `/permissions` and `/groups` for entitlement, authenticated with `ServerOAuth2Bearer`. Streaming must match history "within 5% variance" with no holes.
- **Trading integration** (client-server): "User browser requests go directly to broker servers". The broker exposes a REST API; TradingView's front end calls it with `Authorization: Bearer ACCESS_TOKEN`.

Process: pass automated tests → sandbox at `beta-rest.xstaging.tv` (IP whitelist) → staging → production → live. Brokers supply a client id / authorization URI (OAuth2), two 56×56 SVG icons "for trading panel and login", and separate credentials per environment ("All OAuth client_id and client_secret values must be unique across the six supported connection environments").

### 10.2 Endpoints

Required for trading: `/accounts`, `/config`, `/instruments`, `/orders`, `/ordersHistory`, `/executions`, `/state`, `/quotes` ("absence causes empty Sell/Buy fields in Order Ticket").

Conditional: `/authorize` (PasswordBearer only), `/logout` (`supportLogout`), `/positions` (unless `supportPositions: false`), `/balances` (crypto), `/previewOrder` (preview flags), `/depth` (`supportLevel2Data`), `/getLeverage` / `/previewLeverage` / `/setLeverage` (`supportLeverage`), `/mapping` (exchange-based instruments), `/permissions`.

Full spec verbs (verbatim paths): `POST /authorize`, `POST /logout`, `GET /config`, `GET /mapping`, `GET /accounts`, `GET /userInfo`, `POST /promotionReport`, `GET /accounts/{accountId}/instruments`, `GET …/state`, `GET …/stream/state`, `GET …/orders`, `GET …/stream/orders`, `GET …/ordersHistory`, `POST …/orders`, `PUT …/orders/{orderId}`, `DELETE …/orders/{orderId}`, `POST …/orders/cancelAll`, `POST …/orderInfo`, `GET …/positions`, `GET …/stream/positions`, `GET …/netPositions`, `GET …/individualPositions` (+ stream, PUT, DELETE variants), `PUT …/positions/{positionId}`, `DELETE …/positions/{positionId}`, `GET …/balances`, `GET …/executions`, `GET …/stream/notifications`, `POST …/getLeverage`, `POST …/setLeverage`, `POST …/previewLeverage`, `POST …/previewOrder`, `POST …/previewClosePosition`, `POST …/trackLatency`, `GET /quotes`, `GET /stream/quotes`, `GET /depth`, `GET /stream/depth`, plus the data-side `GET /symbol_info`, `GET /history`, `GET /stream`, `GET /groups`, `GET /permissions`.

### 10.3 Configuration flags (what turns UI on and off)

Account object: `id` ("globally unique, persistent, and never reused"), `name`, `type` (`live` | `demo`), `currency`, `currencySign`, `isVerified`, `config`.

Feature flags, verbatim, grouped as the spec groups them:

- Order types: `supportMarketOrders`, `supportLimitOrders`, `supportStopOrders`, `supportStopLimitOrders`, `supportStopOrdersInBothDirections`, `supportStopLimitOrdersInBothDirections`, `supportStrictCheckingLimitOrderPrice`.
- Brackets: `supportBrackets`, `supportOrderBrackets`, `supportPositionBrackets`, `supportMarketBrackets`, `supportAddBracketsToExistingOrder`, `supportModifyBrackets`, `supportModifyOrderBrackets`, `supportModifyPositionBrackets`, `supportIndividualPositionBrackets`, `supportMultipleExitLevels`, `supportStopLoss`, `supportTrailingStop`, `supportGuaranteedStop`, `supportCryptoBrackets`.
- Positions: `supportPositions`, `supportMultiposition`, `supportPositionNetting`, `supportClosePosition`, `supportPartialClosePosition`, `supportPreviewClosePosition`, `supportReversePosition`, `supportNativeReversePosition`, `supportCloseIndividualPosition`, `supportPartialCloseIndividualPosition`, `supportPLUpdate`.
- Modify / preview: `supportModifyOrder`, `supportModifyOrderPrice`, `supportEditAmount`, `supportModifyDuration`, `supportPlaceOrderPreview`, `supportModifyOrderPreview`, `supportPartialOrderExecution`.
- Leverage & crypto: `supportLeverage`, `supportLeverageButton`, `supportCryptoExchangeOrderTicket`, `supportSymbolSpecificCryptoOrderTicket`, `supportDigitalSignature`, `supportMargin`.
- Account Manager & data: `supportDOM`, `supportLevel2Data`, `supportBalances`, `supportOrdersHistory`, `supportExecutions`, `showQuantityInsteadOfAmount`, `supportLogout`, `supportCustomAccountSummaryRow`, `supportPositionCustomFields`, `supportOrderCustomFields`, `supportOrderHistoryCustomFields`, `supportCustomOrderInfo`, `supportTrackLatency`, `supportCloseAllOrdersForSymbol`, `supportClosingMultipleOrdersById`, `supportRiskControlsAndInfo`, `supportDisplayBrokerNameInSymbolSearch`.

Other fields: `pipValue`, `pipSize` ("usually equals minTick×10 for Forex"), `buyPipValue`, `sellPipValue`, `unrealizedPL`, `parentId` / `parentType` (bracket linkage), `currentAsk` / `currentBid` (required with forex market orders).

### 10.4 The Charting Library "Trading Platform" (same model, broker-hosted)

Adds to the charting library: the **Order Ticket** ("Advanced Order Ticket dialog allows users to place different types of orders, including trailing stop, stop-loss, bracket orders"), the **Account Manager**, the **Depth of Market** widget, chart trading, and a **Broker API** the host implements (`accountManagerInfo`, `placeOrder`, `modifyOrder`, `cancelOrder(s)`, positions/orders/executions, `chartContextMenuActions`, `getOrderDialogOptions()` for custom ticket fields, `customUI.showOrderDialog()` to replace the ticket entirely). Trading featuresets, verbatim: `order_panel`, `order_info`, `order_panel_close_button`, `order_panel_undock`, `buy_sell_buttons`, `show_buy_sell_buttons_on_unsupported_resolution`, `trading_account_manager`, `broker_button`, `chart_crosshair_menu`, `chart_hide_close_position_button`, `chart_hide_close_order_button`, `chart_property_page_trading`, `trading_notifications`, `show_trading_notifications_history`, `dom_widget`, `static_dom`, `show_dom_first_time`, `show_order_panel_on_start`, `open_account_manager`, `always_pass_called_order_to_modify`, `show_symbol_logo_in_account_manager`, `show_symbol_logo_in_close_position_dialog`, `show_symbol_logo_in_cancel_order_dialog`.

There is also a lighter path called **Trading primitives** — `createOrderLine()`, `createPositionLine()`, `createExecutionShape()` — "specialized drawing tools" that draw order/position/execution visuals with `setText`, `setQuantity`, `setPrice`, `setTooltip`, and per-button callbacks (`onModify`, `onCancel`, close, reverse) *without* a full Broker API. This is the piece most relevant to OnStock (see §11).

### 10.5 How a broker gets on the list

"Brokers and crypto exchanges, which are not available on our platform yet, can use this tool for integration." TradingView tells users to "contact the crypto exchange or the broker you wish to be connected to TradingView and suggest they connect to our interface using the above-mentioned API." I.e. the broker does the work and hosts the endpoints; TradingView reviews and lists.

---

## 11. Translating this to OnStock: "connect whatever you use to trade"

### 11.1 What OnStock's trading actually is today (from the repo)

- `src/services/swap.js`: a **non-custodial swap**. Jupiter quotes the route (`lite-api.jup.ag/swap/v1/quote`), builds an unsigned transaction (`/swap/v1/swap`), and "the USER's wallet signs and sends it. OnStock never touches funds, keys, or the transaction after handing it to the wallet." Slippage is fixed at 50 bps; no platform fee. Errors carry a `phase` (`build` = nothing was sent, `broadcast` = may already be on-chain), and the UI must not claim failure after broadcast.
- `src/overlays/SwapSheet.jsx`: **Buy** (USDC → token) / **Sell** (token → USDC); an amount field; a live quote that refreshes every 8 s; shows amount received, the guaranteed minimum (`otherAmountThreshold`), and route price impact; warns from 2% impact and requires an explicit acknowledgment naming the number from 5%; wallet is Phantom-style (`signAndSendTransaction`).
- `src/services/jupiter.js`: a synthetic **bid/ask** from two ~$200 quotes each way (no order book exists on a DEX), cached 60 s.
- `src/screens/Trade.jsx`: today's phone "Trade" tab is a router — Jupiter as the primary venue ("Self-custody"), four exchanges "Not offered in the US", and a waitlist. Copy says "OnStock routes, it never holds funds."

So OnStock's "broker" is *a wallet plus an aggregator*: there is no account at OnStock, no resting orders, no margin, no broker-side positions. That decides most of what follows.

### 11.2 Imitable

| TradingView piece | OnStock equivalent | Why it transfers |
|---|---|---|
| Trade button → broker list → connected state | **Trade** → wallet list (Phantom, Solflare, …) → connected state showing the wallet's short address where TradingView shows the broker name | Same mental model: pick your venue once, then the ticket appears. The wallet adapter *is* the OAuth "Continue" tab: a popup owned by someone else, credentials never typed into OnStock. |
| Order ticket docked right of the chart, with Panel/Dialog modes | The existing SwapSheet, re-laid as a right-hand column on desktop (dialog on phone) | The sheet already has side, amount, quote, min received, impact — that is a market-order ticket. |
| Quantity modes: **Units**, **Currency**, **% of balance** | Token units, USDC amount, % of wallet USDC / % of token balance | Wallet balances are readable client-side; % sizing is a pure UI calculation. |
| **Order info** strip (trade value, pip/tick value, leverage) | Route, price impact %, minimum received, fees/priority fee, "you pay / you get", and the **gap** at the quoted price vs the Yahoo stock print | The gap is OnStock's edge; TradingView's strip is where a trader expects "what will this actually cost me". |
| **Show order confirmations** / With vs Without confirmation | Keep confirmation always on for real swaps; a "Without confirmation" mode should only ever exist for a paper/sim mode | The wallet already forces one confirmation, so "instant" is impossible by construction — say so rather than pretend. |
| Positions tab + position line on the chart with P&L in **Money ($)** / **Percentage (%)** | Holdings read from the wallet, an average cost from the wallet's swap history (FIFO or WAC — TradingView names both), a line on the chart at that average cost | The chart's data feed is GeckoTerminal; the wallet gives quantity; cost basis needs a transaction-history read. |
| **History** tab with `Filled` / `Rejected` / `Canceled` statuses | Swap history with `phase`-derived statuses: sent (signature), confirmed, failed-before-send, unknown-after-broadcast | swap.js already models the ambiguity; TradingView's status vocabulary is a good display language. |
| **Notifications log** + toasts | A log of quotes taken, signatures, confirmations, and impact acknowledgments | Cheap, and exactly the paper trail a cautious user wants. |
| **Order presets** and Shift+B / Shift+S | Amount presets ($25 / $100 / $500 / MAX) and a hotkey that *opens* the ticket pre-filled | Presets are pure UI. Hotkeys must open, not send, because the wallet signs. |
| Execution marks on the chart | Swap markers at the fill price/time | Trivial once history exists; the "Execution Labels" toggle is the pattern. |
| Trading tab in chart settings | A small **Trading** section: show position line, show swap markers, P&L unit, show Buy/Sell buttons | Matches TradingView's placement so a TradingView user finds it. |
| Broker capability matrix ("Supported / Not offered") | A per-venue capability table: Jupiter spot swap ✓; limit orders — see below; margin ✗; DOM ✗ | Being explicit about what a venue cannot do is a TradingView convention worth copying. |
| Paper Trading | A simulated wallet with virtual USDC that uses the live Jupiter quote path (quote only, never `/swap`) | Everything up to signing is identical; skipping the wallet call is the simulator. |

### 11.3 Not imitable (and why)

| TradingView piece | Why OnStock cannot copy it |
|---|---|
| Broker API custody model (`/accounts`, `/state`, `/balances`, account summary with margin) | There is no account. Balances live in the wallet; OnStock reads them but does not hold them. "Equity / Available funds / Margin buffer" have no meaning. |
| Password Bearer login | OnStock must never ask for a seed phrase or private key; the wallet extension owns signing. This is also the user's own rule (security-cautious). |
| Server-side OAuth token custody | There is no token to hold; the wallet session is per-page and per-domain. |
| Resting orders (Limit / Stop / Stop limit / Trailing stop) executed by the venue | A DEX swap executes now or not at all. Jupiter does publish limit/trigger-order products, but **this teardown did not verify them** and OnStock's `swap.js` does not use them; treat "limit orders" as a separate research item, not an assumption. |
| Brackets (TP/SL), OSO/OCO, Brackets Management | Same — no venue-side conditional logic. The honest substitute is OnStock's existing **alerts** (price + gap drift), which notify rather than execute. |
| DOM / Level 2 | No order book. jupiter.js's two-quote bid/ask is the closest honest readout; a ladder would be invented data. |
| Reverse position / partial close as one action | "Reverse" is two swaps with two signatures; partial close is just a sell for a smaller amount. Don't fake a one-click reverse. |
| Leverage, margin bars, liquidation | Spot only. |
| One-tab-per-broker connection | Not a constraint for wallets, but a wallet can be switched to a different account mid-session — the UI must re-read the address on `accountChanged`. |

### 11.4 Wording that matters

TradingView's line "TradingView doesn't process your trades and acts as an interface only" is the same claim OnStock's Trade screen already makes ("OnStock routes, it never holds funds"). Keep the two credential facts separate the way TradingView's own docs do: OnStock never sees a key (true, like Password Bearer going straight to the broker), and OnStock never stores a session on a server (stronger than TradingView's OAuth path). Say the stronger thing plainly.

---

## What this means for OnStock

- **Adopt — the three-part layout.** Ticket docked on the right (Order tab; DOM tab replaced by a "Route" tab showing Jupiter's route and the two-quote spread), Account Manager docked at the bottom (Positions / History / Notifications log), order/position lines on the chart. Reason: this is the arrangement "on a PC it should be like TradingView" literally means, and every piece has a Jupiter-shaped equivalent.
- **Adopt — Trade button → venue list → connected state.** Wallets are the "brokers"; the wallet popup plays the role of the OAuth **Continue** tab. Reason: the connect flow is already non-custodial in TradingView's OAuth path, so the metaphor is honest.
- **Adopt — the Order info strip, with the gap in it.** Show trade value, minimum received, price impact, fees, and "token price vs stock price at this fill" beside the amount. Reason: TradingView puts cost-of-trade next to the inputs; OnStock's differentiator belongs in that exact spot.
- **Adopt — status vocabulary.** `Placing` / `Working` / `Filled` / `Canceled` / `Rejected` → map onto swap.js's `build` / `broadcast` phases plus on-chain confirmation, and never print "failed" for an `unknown`. Reason: swap.js already forbids claiming failure after broadcast; TradingView's words are the ones traders read.
- **Adopt — Paper Trading as a first-class venue in the list.** Virtual USDC, real Jupiter quotes, no `/swap` call. Reason: TradingView lists it above every broker; for a beginner it is the on-ramp, and the cost is one branch in `executeSwap`.
- **Adopt — order presets and a Trading section in chart settings** (position line on/off, swap markers on/off, P&L unit Money/Percentage). Reason: pure UI, and a TradingView user will look for them there.
- **Adapt — quantity modes.** Units / Currency / % of balance yes; "Risk, currency" and "Risk, % balance" no, because there is no stop loss to compute risk against. Reason: the modes only make sense when a venue can rest a stop.
- **Adapt — P&L accounting.** Offer FIFO and WAC by name, computed from wallet swap history, and label unrealized P&L in USDC at the two-quote bid. Reason: TradingView documents both methods and Paper Trading marks positions at bid, not last — copying that avoids a flattering number.
- **Adapt — hotkeys.** Shift+B / Shift+S should *open* the pre-filled ticket, never send. Reason: the wallet signs; "Instant orders placement" cannot exist for a real swap and pretending otherwise misleads.
- **Adapt — the capability matrix.** Publish a per-venue "Supported / Not offered" table (spot swap, limit orders, brackets, DOM, margin) the way broker profiles do. Reason: TradingView's honesty about "Not offered" is what makes its broker list trustworthy; OnStock's list currently only says "Not offered in the US".
- **Adapt — brackets → alerts.** Where TradingView shows "Add brackets", OnStock shows "Add alert at this price / at this gap". Reason: OnStock already has price and gap-drift alerts; that is the truthful substitute for TP/SL on a venue that cannot rest orders.
- **Skip — DOM ladder.** Reason: there is no order book; a ladder would be fabricated. Keep the two-quote bid/ask readout instead.
- **Skip — account summary fields (Equity, Margin, Available funds, Margin buffer), leverage, Reverse position.** Reason: no account, no margin, and "reverse" would be two signed transactions dressed up as one click.
- **Skip — Password Bearer-style login or any field that takes a key or seed.** Reason: the user's own security rule and OnStock's non-custodial promise; the wallet extension is the only place a secret is typed.
- **Defer, do not assume — venue-side limit orders.** Reason: Jupiter's limit/trigger products were not verified in this teardown and swap.js does not use them; if they hold up, TradingView's order projection ("drag a future order on the chart, one at a time, Enter to place, Escape to cancel") is the UX to copy.

---

## Sources

Every URL below was fetched and read for this document on 2026-09-06.

Marketing, pricing, directory
- https://www.tradingview.com/features/
- https://www.tradingview.com/features/trading/ (features page, trading section)
- https://www.tradingview.com/pricing/ (raw HTML parsed for the Trading rows)
- https://www.tradingview.com/brokers/
- https://www.tradingview.com/brokers/compare/
- https://www.tradingview.com/broker/OANDA/
- https://www.tradingview.com/chart/ (returned only the page title)
- https://www.tradingview.com/sitemaps/www_tradingview_com/sitemap-support.xml (used to enumerate Help Center article URLs)
- https://www.tradingview.com/support/categories/trading/

Help Center — trading essentials and panel
- https://www.tradingview.com/support/solutions/43000756695-how-to-trade-on-tradingview/
- https://www.tradingview.com/support/solutions/43000784804-what-is-an-order-ticket/
- https://www.tradingview.com/support/solutions/43000786138-what-is-the-account-manager/
- https://www.tradingview.com/support/solutions/43000763362-positions-and-orders/
- https://www.tradingview.com/support/solutions/43000786675-account-summary/
- https://www.tradingview.com/support/solutions/43000786676-sub-accounts-balances-and-history/
- https://www.tradingview.com/support/solutions/43000647244-how-are-levels-displayed-in-the-trading-panel/
- https://www.tradingview.com/support/solutions/43000790167-pnl-calculation-methods/
- https://www.tradingview.com/support/solutions/43000761181-i-d-like-to-change-how-pnl-is-shown-on-the-chart/
- https://www.tradingview.com/support/solutions/43000479587-how-to-see-updates-after-you-open-a-position/
- https://www.tradingview.com/support/solutions/43000756243-how-to-create-a-portfolio-from-trading-history-in-the-tradingview-trading-panel/
- https://www.tradingview.com/support/solutions/43000480915-how-do-i-switch-my-order-panel-mode/
- https://www.tradingview.com/support/solutions/43000481002-i-d-like-to-see-a-simplified-order-ticket/
- https://www.tradingview.com/support/solutions/43000480940-i-d-like-to-set-my-take-profit-and-stop-loss-in-dollar-terms-and-as-a-percentage-of-my-account-balance/
- https://www.tradingview.com/support/solutions/43000648154-why-is-the-time-in-force-setting-not-shown-in-the-order-panel/
- https://www.tradingview.com/support/solutions/43000778763-why-can-t-i-see-certain-order-product-types-in-order-ticket/
- https://www.tradingview.com/support/solutions/43000708118-quantity/ (turned out to be the Options strategy builder article; not used for the ticket)
- https://www.tradingview.com/support/solutions/43000735611-lot-size/ (options glossary; not used for the ticket)

Help Center — order types, brackets, positions
- https://www.tradingview.com/support/solutions/43000754940-what-is-a-market-order/
- https://www.tradingview.com/support/solutions/43000754941-what-is-a-limit-order/
- https://www.tradingview.com/support/solutions/43000754944-mastering-stop-market-orders/
- https://www.tradingview.com/support/solutions/43000754945-understanding-stop-limit-orders/
- https://www.tradingview.com/support/solutions/43000754965-introduction-to-trailing-stops/
- https://www.tradingview.com/support/solutions/43000754951-order-brackets/
- https://www.tradingview.com/support/solutions/43000754952-order-brackets-modification/
- https://www.tradingview.com/support/solutions/43000754953-add-brackets-to-the-existing-order/
- https://www.tradingview.com/support/solutions/43000754954-position-brackets/
- https://www.tradingview.com/support/solutions/43000754961-positions-brackets-modification/
- https://www.tradingview.com/support/solutions/43000772334-multiple-take-profit-and-stop-loss-levels/
- https://www.tradingview.com/support/solutions/43000631987-how-does-brackets-management-work/
- https://www.tradingview.com/support/solutions/43000664282-can-i-add-stop-loss-take-profit-levels-on-the-chart/
- https://www.tradingview.com/support/solutions/43000615813-why-are-stop-loss-take-profit-orders-unavailable-for-market-orders-individual-positions/
- https://www.tradingview.com/support/solutions/43000708873-why-can-t-i-find-trailing-stop-orders-on-the-chart-and-in-the-account-manager/
- https://www.tradingview.com/support/solutions/43000754949-partial-position-close/
- https://www.tradingview.com/support/solutions/43000754950-reverse-position/
- https://www.tradingview.com/support/solutions/43000754947-execution-history-on-the-chart/
- https://www.tradingview.com/support/solutions/43000482760-how-to-place-several-positions-per-symbol/

Help Center — chart trading, DOM, settings
- https://www.tradingview.com/support/solutions/43000766334-chart-trading-on-tradingview-key-features-and-advantages/
- https://www.tradingview.com/support/solutions/43000736178-chart-trading-order-projection/
- https://www.tradingview.com/support/solutions/43000479981-how-to-show-buy-sell-buttons-on-the-chart/
- https://www.tradingview.com/support/solutions/43000641691-how-to-enable-disable-buy-sell-buttons-in-the-app/
- https://www.tradingview.com/support/solutions/43000683200-i-can-t-use-instant-trading-with-okx/
- https://www.tradingview.com/support/solutions/43000744131-how-do-i-disable-executions-in-bar-replay/
- https://www.tradingview.com/support/solutions/43000480908-i-d-like-to-enable-sound-notifications-for-order-execution/
- https://www.tradingview.com/support/solutions/43000516459-depth-of-market-dom-what-it-is-and-how-traders-can-use-it/
- https://www.tradingview.com/support/solutions/43000765952-how-to-use-adjustable-price-step-in-dom/
- https://www.tradingview.com/support/solutions/43000754967-level-2-data/
- https://www.tradingview.com/support/solutions/43000480004-how-do-i-get-level-2-data/
- https://www.tradingview.com/support/solutions/43000710643-how-to-use-the-command-palette-and-keyboard-shortcuts/ (no trading shortcuts listed there)

Help Center — order presets
- https://www.tradingview.com/support/solutions/43000742709-what-are-order-presets/
- https://www.tradingview.com/support/solutions/43000742710-how-to-create-an-order-preset/
- https://www.tradingview.com/support/solutions/43000742711-how-many-order-presets-can-i-create/
- https://www.tradingview.com/support/solutions/43000742712-how-to-apply-the-created-preset/

Help Center — Paper Trading and The Leap
- https://www.tradingview.com/support/solutions/43000516466-paper-trading-main-functionality/
- https://www.tradingview.com/support/solutions/43000479975-how-to-connect-or-disconnect-a-paper-trading-account/
- https://www.tradingview.com/support/solutions/43000480903-how-to-change-the-account-currency-in-paper-trading/
- https://www.tradingview.com/support/solutions/43000742699-how-to-set-leverage-in-paper-trading/
- https://www.tradingview.com/support/solutions/43000742700-how-to-trade-with-leverage-in-paper-trading/
- https://www.tradingview.com/support/solutions/43000755797-what-is-commission-per-contract-in-paper-trading/
- https://www.tradingview.com/support/solutions/43000719857-how-is-position-profit-and-loss-in-paper-trading-calculated/
- https://www.tradingview.com/support/solutions/43000762709-simulated-futures-real-market-experience-with-paper-trading/
- https://www.tradingview.com/support/solutions/43000691889-learn-to-trade-on-historical-data/
- https://www.tradingview.com/support/solutions/43000771594-what-is-the-leap/

Help Center — brokers, connection, credentials
- https://www.tradingview.com/support/solutions/43000784715-finding-your-perfect-broker-on-tradingview/
- https://www.tradingview.com/support/solutions/43000542490-how-is-the-brokers-rating-calculated/
- https://www.tradingview.com/support/solutions/43000673434-beta-brokers/
- https://www.tradingview.com/support/solutions/43000479602-the-broker-i-want-to-trade-through-is-not-supported-can-you-add-it/
- https://www.tradingview.com/support/solutions/43000690936-can-i-connect-to-my-broker-in-multiple-tabs/
- https://www.tradingview.com/support/solutions/43000686674-how-to-remove-saved-broker-login-and-password/
- https://www.tradingview.com/support/solutions/43000687052-selecting-data-type-in-broker-settings/
- https://www.tradingview.com/support/solutions/43000481249-i-ve-connected-through-my-broker-but-i-see-a-non-tradable-symbol-error-message-when-trying-to-trade/
- https://www.tradingview.com/support/solutions/43000764889-symbols-you-can-analyze-and-trade-on-tradingview/
- https://www.tradingview.com/support/solutions/43000669310-what-should-i-do-to-be-able-to-trade-through-interactive-brokers-on-tradingview/
- https://www.tradingview.com/support/solutions/43000724904-why-can-t-i-connect-to-the-broker-using-passkey-verification/
- https://www.tradingview.com/support/solutions/43000765982-is-dynamic-leverage-available-on-tradingview/
- https://www.tradingview.com/support/solutions/43000786674-rwa-and-traditional-assets-leverage-and-eligibility/
- https://www.tradingview.com/support/solutions/43000707401-how-do-i-connect-or-log-out-of-my-broker-account-in-the-mobile-app/
- https://www.tradingview.com/support/solutions/43000707402-where-can-i-find-my-positions-and-orders-in-the-mobile-app/

Broker Integration (REST API) manual
- https://www.tradingview.com/broker-api-docs/
- https://www.tradingview.com/broker-api-docs/integration-overview
- https://www.tradingview.com/broker-api-docs/endpoints
- https://www.tradingview.com/broker-api-docs/trading/concepts
- https://www.tradingview.com/broker-api-docs/trading/authentication
- https://www.tradingview.com/broker-api-docs/rest-api-spec
- https://www.tradingview.com/broker-api-docs/glossary

Charting Library — Trading Platform
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/account-manager/
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/order-ticket
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/depth-of-market
- https://www.tradingview.com/charting-library-docs/latest/trading_terminal/Trading-Primitives
- https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets/

OnStock repo files read for §11
- C:/Users/m/Coding/blockwatch/src/services/swap.js
- C:/Users/m/Coding/blockwatch/src/services/jupiter.js
- C:/Users/m/Coding/blockwatch/src/overlays/SwapSheet.jsx
- C:/Users/m/Coding/blockwatch/src/screens/Trade.jsx

Not reachable during this session (recorded so nobody assumes they were read): `tradingview.com/support/search/` (403), `tradingview.com/support/solutions/43000474091/` (404), `tradingview.com/paper-trading/` (404), `tradingview.com/trading/` (404), `charting-library-docs/.../trading_terminal/broker-api/` and `.../trading-features/` (404), DuckDuckGo/Bing searches (blocked), and the WebSearch tool (session budget exhausted before this task started).
