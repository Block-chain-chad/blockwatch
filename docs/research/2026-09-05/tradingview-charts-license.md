# TradingView chart engines for OnStock — licence, cost, data fit

Researched 2026-09-05. Every claim below was checked against the live source
on that day (links at the end); where something could not be verified it says
so. Written for the owner to read on a phone.

## The short version

- **Lightweight Charts: GO, today.** Apache-2.0, free for commercial use, one
  attribution line plus a link to tradingview.com. v5.2.1 (npm, Aug 2026),
  ~194 KB minified / ~62 KB gzipped, multiple panes since 5.0, plugin API for
  indicators and drawings. No application, no approval, nothing to sign.
- **Advanced Charts: GO with conditions — apply now, ship later.** Free, but
  it is a signed contract (the "Free Advanced Charts Agreement", version
  v.0626.FAC, June 2026), delivered through a private GitHub repo after a
  manual review. Two clauses matter for OnStock: the app must stay a free,
  public offering (no paywall), and OnStock must publish a blog post or
  similar announcing the TradingView partnership. Breaches carry a $50,000
  liquidated-damages clause, so this is not a "click accept" licence.
- **Trading (order tickets on the chart) is a separate paid product** called
  Trading Platform. Nothing in the free agreement forbids OnStock from having
  its own trade button next to an Advanced Chart; what it forbids is using
  the library to build "competing offerings" and altering the attribution.
- **Our free data fits both engines** with the same adapter shape: Yahoo v8
  (already proxied at `/api/history`) gives OHLC for the stock leg;
  GeckoTerminal gives OHLCV per DEX pool for the token leg, keyless, but with
  a 6-month lookback window per call, a hard cap of 1000 candles per call and
  a rate limit that in practice tripped after 6 requests in 7 seconds.
- **Do now:** build the candle chart on Lightweight Charts behind a
  server-side `/api/ohlcv` proxy for GeckoTerminal. Apply for Advanced Charts
  in parallel; the datafeed adapter written for Lightweight Charts becomes
  the Advanced Charts `getBars` implementation almost line for line.

---

## 1. Advanced Charts (the "Charting Library")

### What it is

TradingView's full charting product as a client-side JavaScript library:
100+ indicators, 110+ drawing tools, 17+ chart types, up to 8 price scales,
symbol compare. Latest release **32.1.0, 17 August 2026**. Marketing size
~670 KB. It contains **no market data** — you connect your own feed through
its Datafeed API. TradingView's own comparison page lists it as
"Proprietary — Free (with TradingView logo)".

### Licence terms (verified against the agreement PDF, v.0626.FAC)

The document is a real contract between "TradingView, Inc., a Delaware
corporation" and "the Client signing this Agreement". Key clauses, quoted:

- **Grant (2.1):** "a worldwide, non-exclusive, non-transferable,
  non-sublicensable right to use the Services and TV Content to develop,
  publish, and offer its Implementations".
- **Free offering only (2.4):** "This license is intended for
  Implementations as a public access service (as a free offering only, and
  whether account registration is required or not), and not for private,
  personal or internal uses". Also: "Client will provide TradingView with
  free, unlimited access to any services, products, websites, or
  applications that include an Implementation". The docs restate this as
  "the implementation environment is public (not for private use or behind a
  paywall)".
- **Hosting (2.2):** "The Implementation shall be hosted on Client's
  servers, and integrate the Client's own Market Data feed streaming and
  history."
- **No public code (2.5):** the library "shall not be hosted, disclosed, or
  made accessible in any public code repository"; any project using it must
  not be "open source or publicly visible in a manner that includes or
  exposes the library code"; and distributed integrations must "not include
  any TradingView library files". (Our GitHub repo is private — checked.)
- **Restrictions (2.6):** no sublicensing or use "on behalf of third
  parties"; no reverse engineering or derivative works; do not "use the
  Services to develop any competing offerings"; do not "modify, obscure, or
  remove any links or proprietary notices"; do not "state, suggest, or imply
  any sponsorship, endorsement, or other relationship between TradingView and
  Client (other than the licensing relationship)"; do not "publish or
  distribute any analysis or benchmarking of the Services".
- **Attribution (3.2):** "attribution to TV Branding via a link to the
  TradingView website"; the link must be "without any nofollow, ugc, or
  sponsored link attributes"; the client "will not alter, delete, obscure, or
  replace any such Attributions".
- **Marketing obligation (2.11):** in addition to the logo, OnStock must
  "publish at least one of the following: (i) a blog post or news articles
  announcing the partnership with TradingView; (ii) another promotional
  placement approved by TradingView, with at least one (1) contextual
  backlink to TradingView."
- **Website terms (2.7):** OnStock's terms of use must tell visitors "they
  must not use any part of the content on the website for commercial
  purposes without first obtaining the necessary license".
- **Market data is your problem (10):** the client "shall ensure that all
  access to, use of, and redistribution of Market Data through the
  Implementation complies with all applicable laws, regulations, including
  securing appropriate licensing from relevant domestic exchanges or
  third-party providers." TradingView "bears no responsibility".
- **Liquidated damages (7.5):** an uncured breach (10-day cure window) is
  "fifty thousand (50,000) USD for each and every proven breach".
- **Term (4):** open-ended; either side may end it "at any time on sixty
  (60) days' prior written notice". On termination the client must
  "immediately discontinue its Implementations".
- **Law:** New York law, JAMS arbitration in New York, jury-trial waiver.

**Is trading/brokerage restricted?** No clause in the free agreement bans
brokerage or trading products. Trading *features inside the chart* (order
ticket, positions drawn on the chart, DOM, watchlist) are the paid **Trading
Platform** product, which TradingView says "should be connected to the
broker's back-end". A Jupiter swap sheet next to an Advanced Chart is outside
the library and is not addressed by the agreement. The clause to watch is
2.6(c), "competing offerings": OnStock's own tagline is "TradingView for
tokenized stocks", which is exactly the phrase not to put in the application
or in the announcement post.

**Eligibility, per TradingView's own pages:** the libraries are "only
available to companies for use in public web projects and/or
applications"; not "for personal use, hobbies, studies, or testing". The
quick-start adds "The library is not redistributable" and "It is prohibited
to use any part of the library in public repositories."

### How you apply and what happens

1. The form lives on the Advanced Charts landing page
   (tradingview.com/advanced-charts, "Get library" / contact section). It is
   JavaScript-rendered, so its exact fields could not be scraped; expect
   name, work email, company, website URL and a description of the use. The
   docs say "submit an access request form" and "Once approved, you will
   receive a GitHub invitation to the repository."
2. Review is manual. Third-party integration guides consistently report
   about a week; TradingView itself publishes no timeline.
3. Delivery is a **private GitHub repository** (`tradingview/charting_library`,
   tagged releases, e.g. `#semver:32.0.0`) containing `charting_library/` and
   a `datafeeds/` folder with a sample UDF adapter. It can be pulled as a git
   dependency in `package.json`, but the files are static assets that must be
   copied into a served folder — Vite will not bundle them. Support for
   licensees is through GitHub Issues on that private repo.
4. The agreement is signed electronically ("via LinkSquares or another
   electronic signing platform") by the company.

### The Datafeed API it expects

Six methods on an object passed as `datafeed` to the widget constructor.
All callbacks must be invoked asynchronously (the docs say wrap in
`setTimeout(..., 0)` to avoid stack overflows).

| Method | What a minimal OnStock adapter must do |
| --- | --- |
| `onReady(cb)` | Return `supported_resolutions` (e.g. `["1","5","15","60","240","1D"]`), `exchanges`, `symbols_types`. |
| `searchSymbols(input, exch, type, cb)` | Filter `src/data/universe.json` by ticker/name; return `{symbol, description, exchange, ticker, type}` rows. |
| `resolveSymbol(name, onOk, onErr)` | Build a `LibrarySymbolInfo`: `session` (`"24x7"` for tokens, `"0930-1600"` for stocks), `timezone` (`"America/New_York"` for stocks), `minmov: 1`, `pricescale: 100` (or 10000 for sub-cent tokens), `has_intraday: true`, `intraday_multipliers` = what the feed truly has, `supported_resolutions`, `volume_precision`, `data_status: "delayed_streaming"`. |
| `getBars(symbolInfo, resolution, periodParams, onOk, onErr)` | `periodParams` = `{from, to, countBack, firstDataRequest}` (Unix seconds, `to` exclusive). Return bars ascending, `time` in **milliseconds**, and at least `countBack` bars — the docs say matching the bar count matters more than matching the time range. Pass `{noData: true}` when history is exhausted so the library stops asking. |
| `subscribeBars(symbolInfo, resolution, onTick, guid)` | Push the latest bar; a bar whose `time` equals the last bar replaces it, a newer `time` appends. |
| `unsubscribeBars(guid)` | Stop the timer for that guid. |

The library can also **synthesise coarser bars** from finer ones: if
`intraday_multipliers` lists `"1"` and `"5"`, adding `"15"` to
`supported_resolutions` makes the library build 15-minute bars itself.

---

## 2. Lightweight Charts

- **Version:** 5.2.1 on npm (released 12 August 2026). Docs cover 5.2.
- **Licence:** Apache-2.0. The README states the extra requirement
  verbatim: **"You shall add the 'attribution notice' from the NOTICE file
  and a link to https://www.tradingview.com/ to the page of your website or
  mobile application that is available to your users."** The NOTICE file
  reads: "TradingView Lightweight Charts™ / Copyright (с) 2025 TradingView,
  Inc. / https://www.tradingview.com/". The `layout.attributionLogo` chart
  option (default `true`) draws a small clickable TradingView mark on the
  pane and the docs say that satisfies the link requirement.
- **Size:** Bundlephobia measures 194,247 bytes minified, 61,584 bytes
  gzipped (plus one dependency, fancy-canvas, ~19 KB). TradingView's
  marketing page still says "35 KB"; the measured number is the one to
  budget for. npm unpacked size is 3.1 MB (source maps and multiple builds),
  10 files.
- **Panes:** multi-pane support arrived in **5.0.0** ("new unified series
  creation API", multi-pane, pane primitives). API: `chart.addPane()`,
  `chart.panes()`, `chart.removePane(i)`, `chart.swapPanes(a, b)`, and
  `chart.addSeries(def, opts, paneIndex)`. Separator colour, hover and
  resizing are configurable. Volume under price, RSI in its own pane, etc.
  are first-class.
- **Plugins:** three kinds — **custom series** (new ways to draw data, via
  `addCustomSeries`), **series primitives** (drawings, annotations and
  overlays tied to one series' scales, via `series.attachPrimitive`), and
  **pane primitives** (chart-wide things like watermarks, via
  `pane.attachPrimitive`). Scaffold with `npm create lwc-plugin@latest`.
  TradingView keeps a `plugin-examples` folder with tooltips, alerts,
  heatmaps and watermarks. There is **no built-in indicator library and no
  drawing toolbar**; you compute SMA/EMA/RSI yourself (trivial `src/lib/`
  functions that earn tests) and render them as ordinary line series or
  primitives.
- **Not included:** symbol search, resolution toolbar, indicator dialogs,
  saved layouts, replay. Those are the Advanced Charts value.

---

## 3. Mapping our free data onto each engine

Both engines want the same thing: an array of `{time, open, high, low,
close, volume}` for a symbol at a resolution. That is the one contract to
build now, in `src/lib/`, engine-agnostic.

### Stocks — Yahoo v8 chart via `/api/history` (already exists)

Measured today against `query1.finance.yahoo.com/v8/finance/chart/AAPL`:

| interval | works up to | fails beyond |
| --- | --- | --- |
| 1m | 7 days (2,731 bars) | `1mo` → 422 "Only 8 days worth of 1m granularity data are allowed" |
| 5m, 15m | 60 days (4,681 / 1,561 bars) | `3mo` → 422 "must be within the last 60 days" |
| 60m | 2 years (3,505 bars) | `5y` → 422 "must be within the last 730 days" |
| 1d | years (`10y`) | `range=max` collapsed to 169 monthly-looking bars — do not use `max` for daily |

Every response carries `open/high/low/close/volume` arrays, so the proxy
already returns candles; the client just currently throws away everything
but close. `api/history.js` allows `interval ∈ {5m,30m,1d}` and
`range ∈ {1d,5d,1mo,3mo,1y}`; to feed a candle chart, widen those two sets
(add `1m`, `15m`, `60m`; add `60d`, `2y`, `5y`) and keep the allowlist
exactly as strict — the interval/range pairs above are the only ones worth
allowing. Sessions: `0930-1600` America/New_York, pre/post already modelled
in `src/lib/market.js`.

### Tokens — GeckoTerminal pool OHLCV (new)

Endpoint: `GET api.geckoterminal.com/api/v2/networks/{network}/pools/{pool}/ohlcv/{timeframe}`.
Verified today on the AAPLx/USDC pool on Solana
(`EHdow7Yhmr1ac8Qff9Co1LhSosr38puA6zLd4cbJLdpV`, byreal, $163k reserve,
$319k/24h):

- **Timeframes and aggregates:** `minute` with `aggregate` 1, 5, 15;
  `hour` with 1, 4, 12; `day` with 1. Anything else is a 400
  ("Invalid aggregate. Allowed values: 1, 5, 15").
- **Limit:** default 100, max 1000; 1001 is a 400 ("must be positive integer
  less than or equal to 1000").
- **Shape:** `data.attributes.ohlcv_list` = array of
  `[unixSeconds, open, high, low, close, volume]`, **newest first** (reverse
  before handing to a chart). `meta.base`/`meta.quote` give names, symbols
  and mint addresses.
- **Options that work:** `before_timestamp` (paging further back — returned
  candles from 2026-03-03 when asked for before 2026-03-07),
  `currency=usd|token`, `token=base|quote`, `include_empty_intervals=true`.
- **History window:** `day&limit=1000` returned only **184 daily candles
  (2026-03-07 → today)** although the pool has traded since 2025-08-06;
  `hour&aggregate=12` likewise stopped at 2026-03-06. CoinGecko's docs
  confirm: each call covers **at most 6 months**, older ranges need
  `before_timestamp` paging, and full history back to 2021 is a paid-plan
  feature. So a 1-year daily chart is two calls, and very old data may be
  absent on the free tier.
- **Rate limit:** the FAQ says 30 calls/minute; the newer DEX-API marketing
  page says the free tier is **10 calls/min**. In practice six rapid calls
  produced a 429 ("You've exceeded the Rate Limit… subscribe to our API
  plans"), with no `Retry-After` header. Treat it as ~10/min with a burst
  guard. That budget is per **caller IP**, which is why this must go through
  a proxy with an edge cache, not straight from phones.
- **Attribution:** "We appreciate a link attribution back to GeckoTerminal
  because it helps us to continue providing the API for free." The CoinGecko
  brand guide asks for the GeckoTerminal logo linked to geckoterminal.com.
  The API is labelled Beta, "subject to changes".
- **Which pool?** `GET /networks/solana/tokens/{mint}/pools` lists pools by
  liquidity; AAPLx has 25, and the top three split volume across byreal and
  two Raydium pools with different quote tokens. The chart should follow the
  **deepest USDC-quoted pool** and remember it per asset; volumes are
  per-pool, not per-token, and the UI should say so.
- **Coverage:** only the 107 xStocks records carry a `mint`; Ondo (441) and
  bStocks (31) have no on-chain pool mapped yet, so those get the stock leg
  only and an em dash on the token side.

### Server proxy: `api/ohlcv.js`

Copy `api/history.js`. Allowlist `network` (enum: `solana`), `pool` (regex
base58, 32-44 chars), `tf` (`minute|hour|day`), `agg` (enum per tf), `limit`
(1-1000), `before` (integer), plus `c`. Anything else 400; upstream failure
502; never pass free text through. `s-maxage` by timeframe: 60 for minute,
300 for hour, 3600 for day, with `stale-while-revalidate` so a 429 upstream
serves the last good copy instead of a blank chart. In dev, add a
`/gecko` entry in `vite.config.js` next to `/yfin`. The client fetcher lives
in `src/services/` and appends `API_CACHE_SUFFIX`; the reshaping (reverse,
seconds→ms, gap handling, resolution→timeframe/aggregate mapping) lives in
`src/lib/ohlcv.js` with tests, because `src/services/apiBase.js` cannot be
imported under vitest.

### The Advanced Charts datafeed adapter, in prose

One module, `src/services/tvDatafeed.js`, exporting an object with the six
methods. Symbols are named `ISSUER:TICKER` (e.g. `XSTOCKS:AAPLx`,
`NASDAQ:AAPL`) so one datafeed serves both legs and the chart's Compare
button can overlay the stock on the token — that overlay *is* the OnStock
thesis, rendered by TradingView's own compare feature.

- `onReady` returns resolutions `1, 5, 15, 60, 240, 720, 1D` and two
  exchanges (`XSTOCKS`, `NASDAQ/NYSE` from the universe file).
- `searchSymbols` filters the universe in memory; no network.
- `resolveSymbol` looks the ticker up in `src/data/universe.js`. Tokens:
  `session "24x7"`, `timezone "Etc/UTC"`, `intraday_multipliers
  ["1","5","15","60","240","720"]`, `has_daily true`. Stocks: `session
  "0930-1600"`, `timezone "America/New_York"`, `intraday_multipliers
  ["1","5","15","60"]`, and `daily_multipliers ["1"]`. `pricescale` from the
  asset's price magnitude (100 above $1, 10000 below).
- `getBars` maps resolution to a source call: for tokens `1→minute/1`,
  `5→minute/5`, `15→minute/15`, `60→hour/1`, `240→hour/4`, `720→hour/12`,
  `1D→day/1`, calling `/api/ohlcv` with `limit = min(1000, countBack + margin)`
  and `before = to`; loop with `before_timestamp` while bars < `countBack`
  and the response is non-empty, then reverse and convert to ms. For stocks
  pick the Yahoo `interval`/`range` pair that covers `[from, to]` from the
  table above, call `/api/history`, zip the five arrays into bars, drop rows
  with a null close. When a source returns nothing older, call back with
  `{noData: true}`. Because the library builds coarser bars itself, the
  adapter never has to resample.
- `subscribeBars` starts one `setInterval` per guid: tokens re-fetch the
  latest 2 candles every 60 s (minute) or 5 min (hour/day) — the app's
  Jupiter 2.5 s price stream can also *patch the close* of the current bar
  between fetches so the last candle moves live; stocks poll `/api/history`
  at the interval the app already uses. `unsubscribeBars` clears the timer.
- Marks/quotes/DOM methods are not implemented (not needed without Trading
  Platform).

The same `getBars` core, minus the callback shape, is exactly what the
Lightweight Charts screen calls with `series.setData()` / `series.update()`.

---

## 4. Go / no-go

| | Lightweight Charts | Advanced Charts |
| --- | --- | --- |
| Verdict | **GO now** | **GO — apply now, integrate after approval** |
| Cost | $0 | $0 + one announcement post + logo/link |
| Paperwork | none | signed contract, private repo, manual review (~1 week reported) |
| Legal exposure | Apache-2.0 | $50k liquidated damages per uncured breach; 60-day termination either way |
| Fits "free, public, gated by beta code" | yes | yes — registration is allowed; a paywall is not |
| Fits "where you can also trade" | yes (your own UI) | yes for your own trade button; on-chart order tickets are the paid Trading Platform |
| Bundle | ~62 KB gz | ~670 KB, served as static files from your own host |
| iOS shell | fine | the FAQ points to iOS/Android WebView examples; do **not** bundle the library files inside the .ipa (2.5(c) forbids distributing them) — load them from onstock's own web host |

**Why not skip Advanced Charts?** Because indicators, drawing tools,
compare, replay and saved layouts are years of work, and the "for tokenized
stocks" version of TradingView only needs the data adapter to be different.
**Why not wait for it?** Because approval is uncertain for an
individual-run, beta-gated app, and Lightweight Charts already delivers the
candle + volume + gap-overlay view the app needs.

---

## 5. Exactly what the owner does to apply (under the OnStock name)

Everything here is something only the account owner can do; none of it
should be automated.

1. **Have the public surface ready first.** The reviewer will open the
   site. Make sure the OnStock domain resolves, the landing page explains the
   product, `privacy.html` and a terms-of-use page exist (the terms must
   include the 2.7 sentence about no commercial reuse of content), and the
   beta gate has a visible "request access" path — reviewers need to be
   able to get in, and clause 2.4 obliges you to give TradingView free access
   anyway. Decide the company name that will sign (see decisions).
2. **Go to tradingview.com/advanced-charts** and use the "Get library"
   form. Use a company email on the OnStock domain, not a personal address.
3. **Describe the use in their language, not ours.** Suggested wording:
   "OnStock is a free, public web and iOS app that tracks tokenized stocks
   (xStocks, Ondo and others) against the underlying equities. We want to
   use Advanced Charts to display price history for both legs using our own
   data feeds (DEX pool OHLCV and equity history via our servers). No
   paywall; account registration optional. The library will be hosted on our
   servers and not redistributed." Do **not** say "TradingView for tokenized
   stocks" — clause 2.6(c) bars building "competing offerings".
4. **Read the agreement before signing.** It arrives for e-signature. The
   points to actually weigh: $50k liquidated damages (7.5), the announcement
   obligation (2.11), the free-offering-only limit (2.4 — this rules out
   putting the chart behind any future paid tier), and market-data
   responsibility (10 — Yahoo's chart endpoint is unofficial).
5. **Accept the GitHub invitation** with a GitHub account that belongs to
   the company/owner. Keep the library out of any public repo, out of the
   iOS bundle, and off the CDN as a downloadable zip. Our repo is private
   today; keep it that way.
6. **After launch:** put the TradingView logo linked to tradingview.com on
   the chart page (no `rel="nofollow"`), publish the announcement post, and
   keep a note of the version tag in use.

---

## 6. What to build now, with Lightweight Charts, while the application is pending

Ordered so each step ships on its own.

1. **`api/ohlcv.js` + `/gecko` dev proxy** (server) and
   **`src/lib/ohlcv.js`** (pure: parse, reverse, seconds→ms, resolution
   map, `before_timestamp` paging plan, tests). This is the piece both engines
   share; nothing here is thrown away later.
2. **Pool discovery:** a `pool` field per xStocks asset, resolved once from
   `/networks/solana/tokens/{mint}/pools` (deepest USDC pool) by
   `scripts/build-universe.mjs` and stored in `universe.json`, so runtime
   never spends rate limit on lookups.
3. **`CandleChart.jsx`** on `lightweight-charts@5.2.1`: candlestick series
   for the token, volume histogram in a second pane, the stock leg as a line
   series on the same price scale (the gap, visualised), range chips
   `1D 1W 1M 6M` mapped to timeframe/aggregate, `attributionLogo` left on and
   a "Charts by TradingView · data by GeckoTerminal" caption in `t-micro`.
   Design-system rules apply: hairline separators, no card-in-card, em dash
   when a leg has no data, section renders null when both legs are empty.
4. **Live last candle:** patch the current bar's close from the Jupiter
   price stream between fetches (`series.update`), so the chart moves
   without spending GeckoTerminal calls.
5. **Two indicators in `src/lib/indicators.js`** (SMA, RSI) drawn as
   ordinary series in their own pane — proves the pane API and gives the
   "TradingView-like" feel without a drawing toolbar. Stop there; drawing
   tools are the Advanced Charts reason.
6. **Swap point:** when the private repo arrives, `tvDatafeed.js` wraps
   `src/lib/ohlcv.js` + `services/stocks.js` in the six-method shape and the
   detail screen mounts the widget instead of `CandleChart` behind a flag.

---

## Sources checked 2026-09-05

- Free Advanced Charts Agreement PDF, v.0626.FAC:
  https://s3.amazonaws.com/tradingview/charting_library_license_agreement.pdf
- Advanced Charts landing: https://www.tradingview.com/advanced-charts/
- Library comparison page (eligibility wording, sizes):
  https://www.tradingview.com/free-charting-libraries/
- Docs: introduction, quick-start, FAQ, release notes (32.1.0), Datafeed API
  required methods, Symbology, configure-datafeed-resolutions —
  https://www.tradingview.com/charting-library-docs/latest/
- Lightweight Charts README/LICENSE/NOTICE (Apache-2.0 + attribution):
  https://github.com/tradingview/lightweight-charts ; docs (panes, plugins,
  IChartApi, LayoutOptions.attributionLogo):
  https://tradingview.github.io/lightweight-charts/
- npm registry (5.2.1, Apache-2.0) and Bundlephobia (194 KB / 62 KB gz).
- GeckoTerminal API guide + FAQ (30/min, attribution wording):
  https://apiguide.geckoterminal.com/ ; DEX API page (free tier 10/min):
  https://www.geckoterminal.com/dex-api ; CoinGecko pool-OHLCV reference
  (6-month window, `before_timestamp`, paid history):
  https://docs.coingecko.com/reference/pool-ohlcv-contract-address
- Live probes: GeckoTerminal AAPLx/USDC pool OHLCV (all timeframes, limits,
  429 behaviour) and Yahoo v8 chart for AAPL (interval/range limits), run
  from this machine.
