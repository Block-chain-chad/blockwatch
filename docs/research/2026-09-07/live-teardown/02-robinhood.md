# Robinhood — clicked through live, 2026-09-07

Method: browsed robinhood.com logged out. No account was created, so everything behind the login — the real order ticket, positions, portfolio, funding — is marked **could not verify** rather than guessed at. Marketing and product pages, the Learn library and the legal disclosures are all public and are quoted verbatim.

---

## 1. The headline finding: Robinhood is in OnStock's category

This is the most important thing on this page, and it was not in any previous research.

**Robinhood Chain** (`/us/en/chain/`) is *"a permissionless, AI-native Layer 2 blockchain built for financial services and real-world assets"* — built on Arbitrum, 100ms block times. Its first named use case, verbatim:

> **The blockchain for Stock Tokens** — Build on the chain for tokenized real-world assets, including Stock Tokens tied to NVIDIA, Google, Apple, and many more.

So the biggest retail broker in the US is issuing tokenized equities on its own chain. That is the exact asset class OnStock tracks.

### The legal structure, verbatim, and why it matters more than anything else here

> Stock Tokens are **tokenised debt securities** issued by **Robinhood Assets (Jersey) Limited**. They provide **economic exposure** to underlying securities but **do not grant investors any legal or beneficial rights in, or against the issuer of, those underlying securities**.

And:

> Stock Tokens are **not registered under U.S. securities laws and may not be offered, sold, or delivered, directly or indirectly, in the United States or to, or for the account or benefit of, U.S. persons.** Offers and sales are also restricted in Canada, the United Kingdom and Switzerland.

Three consequences for OnStock:

1. **A new issuer and venue to track.** The universe today is xStocks/Backed and Ondo on Solana. Robinhood Chain Stock Tokens are a third, on an Arbitrum L2, tied to the same underlyings (NVDA, GOOGL, AAPL). If they get an onchain price feed, they belong in the universe — and their gap against the real share is exactly the number OnStock exists to show.
2. **The "what am I actually holding" question now has a citable answer.** A tokenized stock is not a share. Robinhood's own prospectus language says it plainly: economic exposure, no rights against the issuer of the underlying. This is the single most misunderstood thing about the whole category, OnStock's Learn section does not currently say it, and **no competitor's education covers it** (see §4).
3. **US availability is a real constraint, not a footnote.** Robinhood's Stock Tokens are barred from US persons. The same is broadly true of xStocks. OnStock's audience is currently the founder's US friends. The app should say who can actually trade these, plainly, rather than let someone find out at the venue.

---

## 2. Robinhood Legend — the desktop platform

`/us/en/legend/`. Free with any Robinhood account. This is the closest existing product to what OnStock is building on desktop, and it is worth reading as a direct spec. Verbatim feature claims:

| Claim | Verbatim | OnStock today |
|---|---|---|
| Chart-first trading | *"Enter trades, edit orders, and manage positions all from within a chart."* — headed **"Trade on the chart"** | No. A link out to Jupiter. |
| Indicators | *"Technical indicators"* | Yes, as of this session — 11 of them, with a searchable catalogue |
| Drawing tools | *"Drawing tools"* | **No. None.** |
| Intervals | *"Custom intervals"* | Six fixed buckets; a typed-interval prompt exists |
| Data rate | *"Get realtime data updating at sub-second intervals."* | 30s refresh, 15–20 min delayed on the stock leg |
| **Custom Layouts** | *"Build your ideal layout in seconds with our intuitive layout engine. Easily resize, reposition, and link between widgets."* | Fixed three-region shell |
| **Preset Layouts** | *"Select from layout templates optimized for stock trading, options trading, or market monitoring. Designed by trading experts."* | No |
| Trade entry points | *"Initiate a trade from your watchlist, charts, or options chain."* | No |
| **Dynamic linking** | *"Link widgets to create synced groups. Instantly update symbols across layouts, tabs, even multiple monitors."* | No |

**Dynamic linking is the idea worth stealing.** It is the thing that makes a multi-pane desktop app feel like one instrument rather than several: change the symbol in one widget and every linked widget follows. OnStock already has the pieces — a watchlist, a chart, a gap panel, a details tab strip — and they already share one asset. The cheap version is making the *link* explicit and letting a pane opt out of it, which is what lets someone pin the gap panel to NVDAx while browsing other charts.

---

## 3. Robinhood Crypto — and the marketing lesson OnStock should actually take

`/us/en/crypto/`. The hero of this page is not a screenshot or a slogan. **It is a price comparison table.**

> **Robinhood offers the lowest cost to trade crypto on average.** We had experts check the math.

With toggles for **$10 / $100 / $1,000** and **BTC / ETH / DOGE**, and a table of how much crypto you would actually receive:

| Crypto platform | Crypto you'd receive (ETH) | Difference |
|---|---|---|
| Robinhood | 0.005193 ETH | — |
| Coinbase Advanced | 0.005181 ETH | −0.23% |
| Kraken | 0.005115 ETH | −1.50% |
| Coinbase | 0.005097 ETH | −1.84% |
| Crypto.com | 0.004988 ETH | −3.95% |
| Cash App | Not listed | — |

Footnoted: *"based on research independently verified by a third party, using quotes … as of 8/17/2026."*

**Why this matters to OnStock.** Robinhood took a spread comparison — the same species of number as OnStock's gap — and made it the single loudest thing on the page. They made it interactive (pick a size, pick an asset), concrete (units received, not basis points), dated, and third-party verified.

OnStock's gap is currently a percentage on a row. The Robinhood framing suggests a stronger one: **"on $1,000 of NVDA, buying the token instead of the share costs you $8.50 right now."** Same data, expressed as money at a size the reader chose. That is a headline, not a statistic — and it is the app's whole thesis said out loud.

### Other Robinhood Crypto features worth noting

- **Recurring buys** from $1 on a schedule
- **Transfers in and out** to external wallets, *"never charged deposit or withdrawal fees"*
- **Staking** on ETH, SOL, ADA from $1
- **Onchain USDG lending at an estimated 7% APY through a self-custody wallet**
- *"Custom price alerts, advanced charts, and more"* grouped as **Advanced trading tools** — note that alerts are positioned as an advanced/power feature, which is the same bet as the server-side alerts design already drafted for OnStock
- **Agentic Trading**: *"Connect your agent through Robinhood's secure MCP server to trade crypto alongside equities and options from a dedicated Agentic Account."* Robinhood ships an MCP server for AI agents, with a *segregated account* for it.
- A plain-English FAQ answering **"Do I own my own crypto or am I just getting price exposure to coins?"** — the ownership question, asked in the customer's words and answered in one paragraph.

---

## 4. Robinhood Learn — the education pattern

`/learn/`. One track per asset class: **Investing basics · Options trading essentials · Crypto explained · Futures fundamentals · Prediction Markets Explained**.

Every track has the identical shape:

1. A one-line promise (*"Curious about options? Learn the ins and outs from the pros before making your move."*)
2. **Three featured cards**, each titled as a question in the reader's own words, each answered in **one sentence**:
   - *"What is an investment?"* → *"An investment is an asset bought with the expectation that it will generate some future income or profit."*
   - *"What is a stock?"* → *"A stock is a unit of ownership in a company."*
   - *"What is a blockchain?"*, *"What are crypto gas fees?"*, *"What are stablecoins?"*
3. A **"There's more to learn"** list of four deeper links
4. A **"See X Articles"** link into the full library

**What OnStock should take:** the shape is directly copyable, and OnStock already has "Learn the basics" and "Today in news" that the founder likes. The missing track is the one nobody else has written — **"Tokenized stocks explained"** — with question-titled cards:

- *What is a tokenized stock?*
- *Do I own the actual share?* — and the honest answer, sourced to Robinhood's and Backed's own prospectus language: economic exposure, no rights against the underlying issuer
- *Why does the token price differ from the share price?* — the gap, which is the app
- *What happens when the market is closed?* — the 24/7 vs 9:30–4:00 mismatch, already modelled in `lib/market.js`
- *Who can actually buy these?* — the US-person restriction
- *What is a stablecoin?* / *What are gas fees?* — borrowed straight from their crypto track

This is the highest-value, lowest-cost thing on the whole list. It needs no data source, no proxy, no Vercel Pro. It is writing.

---

## 5. Robinhood's full product surface (footer, verbatim)

Invest · IPO Access · Predict · Strategies · Agentic Trading · Agentic Credit Card · Retirement · Gold · Crypto · Earn · Staking · **Chain** · **Wallet** · **Connect** · **API** · **Legend** · Options · Futures · Trading · Custodial · Ventures · Social · Banking · Gold Card · Platinum Card · Concierge · Learn · Snacks

Legal entity split, which is itself instructive for a founder who has an entity/lawyer call outstanding: brokerage through **Robinhood Financial LLC** (broker-dealer, SIPC), clearing through **Robinhood Securities LLC**, advisory through **Robinhood Asset Management LLC** (SEC RIA), futures through **Robinhood Derivatives LLC** (CFTC/NFA), crypto through **Robinhood Crypto LLC** (NYDFS licensed, FinCEN MSB), money movement through **Robinhood Money LLC** (licensed money transmitter), credit through **Robinhood Credit Inc.**, and the Jersey issuer **Robinhood Assets (Jersey) Limited** for Stock Tokens.

Every consumer-facing crypto and token product sits in a *separate licensed entity* from the broker-dealer. OnStock routes trades out to Jupiter and holds no funds, which is the right posture for now — but the shape of Robinhood's entity map is the thing to show a lawyer when asking "what am I allowed to do next."

---

## 6. What I could not verify

Logged out, and no account created:

- The order ticket itself — order types, defaults, the review-and-confirm step, fractional entry, extended-hours warnings
- Positions, portfolio, P&L, cost basis, tax lots
- Funding: bank linking, instant deposit limits, settlement
- Legend's actual UI — every claim in §2 is from the marketing page, not from using it
- The in-app watchlist, alerts UI, and notification settings
- Robinhood Chain Stock Tokens in the wild — pricing, venues, whether an onchain feed exists to track them

Two of these are cheap to close later: Robinhood publishes an extensive public **Support** library (`/support/`) that documents order types and funding in detail, and this workspace has **Robinhood MCP tools** available (`get_equity_quotes`, `get_option_chains`, `get_watchlists`, `create_alert`, `place_equity_order` …), which is the same API surface their Agentic Trading product exposes. Reading those tool schemas is a legitimate way to see the real data model without an account — and worth doing before designing OnStock's own order flow.
