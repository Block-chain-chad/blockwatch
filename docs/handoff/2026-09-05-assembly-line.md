# Assembly line brief — 2026-09-05

Written for a Claude Code session running in the cloud (claude.ai/code) with no
memory of the conversation that produced it. Everything you need is here. The
owner is at work reading results on a phone; write plainly, and make every
deliverable something that can be read in a PR description or a Markdown file.

## What this project is

BlockWatch is a tokenized-stock tracker: React 19 + Vite + Tailwind v4 web app,
Vercel serverless functions in `api/`, a Capacitor iOS shell in `ios/`. Its
thesis is the GAP between a tokenized stock (xStocks by Backed on Solana, Ondo
on Ethereum) and the real share it tracks. The owner's new direction, stated
today: **"TradingView for tokenized stocks, where you can also trade."** That
means a rebrand (the name reads as a neighborhood watch), a chart-first desktop,
candles with markup and indicators, and a seamless connection to wherever the
user trades.

Base for all work: `main` at `a67c1ae` — 90 tests passing, `npm run lint`
exactly 18 warnings and 0 errors, `npm run build` clean.

## Hard rules

- **Never commit to or push `main`. Never touch `ios/` or `.github/`.** A real
  external tester is running TestFlight build 10 from `main`.
- **Free data and free libraries only.** No paid services, no new API keys.
- One branch and one PR per work stream, base `main`. Every PR body ends with
  this exact line:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Every commit message: a short title, then a body explaining *why* in plain
  prose (read `git log` for the voice), ending with the trailer line
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- Gates before any PR is opened: `npm test` green, `npm run lint` still 18
  warnings / 0 errors (that number must not grow), `npm run build` clean. A
  failing gate means the work is not done — never report success over a failing
  gate.
- Design system: hairline borders via `var(--border-subtle)`; type classes
  `t-label` / `t-caption` / `t-micro`; no nested cards, shadows or gradients;
  `rounded-full` is reserved for STATUS — controls are `rounded-md` like
  `FilterChips` in `src/components/shared.jsx`; missing data renders an em
  dash, never 0; a section with nothing to show renders `null`, never an error
  box.
- **Pure logic that earns tests lives in `src/lib/`.** `src/services/apiBase.js`
  reads `window` at module load, so any vitest file that imports from
  `src/services/` fails to load. This has bitten before.
- Server proxies copy `api/rates.js` and `api/news.js` exactly:
  `rejectUnknownParams` allowlist from `api/_params.js` (the `c` app-lane param
  is always allowed), `applyCors` / `handlePreflight` / `setCacheControl` from
  `api/_cors.js`, JSON out, 400 on bad or unknown input, 502 on upstream
  failure, and **never free-text passthrough to an upstream** — it becomes an
  open relay and unbounds the edge-cache key. Client fetchers use `API_BASE` +
  `API_CACHE_SUFFIX` (or `API_CACHE_QUERY` when the URL has no other params)
  from `src/services/apiBase.js`, and in dev (`import.meta.env.DEV`) go
  through a vite proxy declared in `vite.config.js`, because there is no
  serverless function under vite dev.

## Decisions reserved for the owner — do not make them

1. **The new name.** Produce candidates with availability checked; never pick.
2. **Applying for TradingView Advanced Charts.** It is the owner's business's
   application. Document the exact steps; build on Lightweight Charts meanwhile.
3. **Wiring real trades.** Design doc only. The money path is never built
   unattended. The non-custodial invariant is absolute: the app never holds
   funds or keys.

## Data facts, verified 2026-09-05 — build on these, do not re-derive

- `/api/history` (Yahoo v8 chart, already proxied) returns full OHLC —
  `indicators.quote[0]` has `open/high/low/close/volume` arrays plus
  `timestamp[]`. The app currently draws a line from `close` and discards the
  rest. Check `INTERVALS` / `RANGES` allowlists in `api/history.js`.
- CoinGecko's own OHLC is the wrong product: free tier gives 30-min / 4-hour /
  4-day candles by range, 5-minute is Enterprise-only, everything is cached 15
  minutes. Do not pay for it.
- **GeckoTerminal** (CoinGecko's on-chain arm) gives minute candles for the
  Solana pools where xStocks trade — free, no key, roughly 30 requests/minute:
  - search: `https://api.geckoterminal.com/api/v2/search/pools?query=AAPLx&network=solana`
    → pools with `attributes.address`, `attributes.name`, `attributes.volume_usd.h24`
  - candles: `https://api.geckoterminal.com/api/v2/networks/solana/pools/{address}/ohlcv/{minute|hour|day}?aggregate={1|5|15 | 1|4|12 | 1}&limit=N`
    → `data.attributes.ohlcv_list` rows `[unix_seconds, open, high, low, close, volume]`, newest first
  - This is the same Raydium pool TradingView itself would chart. A single pool
    is one venue, not a composite — say so in the UI.
- Universe rows in `src/data/universe.json` have `id` (CoinGecko id), `ticker`,
  `issuer`, `underlying`, `type`. Network by issuer: xStocks → `solana`; Ondo →
  `eth`; otherwise try solana then eth.
- Kraken's public spot API lists no xStocks pairs.
- TradingView sources data direct from exchanges, one symbol per venue, DEX data
  free, stocks delayed 15–20 min on free with per-exchange real-time add-ons.
  **Lightweight Charts**: npm, Apache-2.0, attribution required (a "Charts by
  TradingView" link per its NOTICE), no drawing tools. **Advanced Charts**:
  free with an application, 110+ drawing tools, 100+ indicators, you bring the
  datafeed.

## The line

Run Research and Build in parallel (subagents); Verify each PR when its build
finishes. Docs go under `docs/research/2026-09-05/` on branch
`research/2026-09-05` with one PR.

### Research (write one Markdown file each)

**R1 `rebrand-candidates.md`** — 18–24 candidates across directions (the
gap/spread idea, on-chain equities, watch/terminal/ledger metaphors, coined
words); reject neighborhood-watch, blockchain-generic, or existing-fintech
readings. Check, do not guess: `.app` and `.com` via RDAP
(`curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/NAME.app` —
404 available, 200 registered, else unknown); App Store collisions via
`https://itunes.apple.com/search?term=NAME&entity=software&limit=10`; GitHub
via the HTTP status of `https://github.com/NAME`. X and USPTO trademark are
"manual". Deliver a ranked table, your top 5 with one-line rationale, and a
"What a rename actually touches" section: the App Store display name changes
freely, the bundle id `app.blockwatch` is immutable and can stay invisibly, the
domain and email are the real cost, Supabase/Sentry/TestFlight are unaffected.

**R2 `tradingview-charts-license.md`** — verify (WebFetch) Advanced Charts'
current license terms, prohibited-use clauses, application process, delivery,
and which Datafeed API it expects; Lightweight Charts' current version, license
text, v5 panes support, plugin mechanism, bundle size. Map the free data above
onto each. Deliver go/no-go per engine, the exact owner-performed application
steps, and what to build now on Lightweight Charts.

**R3 `trading-connection-design.md`** — DESIGN ONLY. Read
`src/state/WalletContext.jsx`, `src/overlays/WalletSheet.jsx`,
`src/overlays/SwapSheet.jsx`, `src/services/swap.js` + test,
`src/screens/Trade.jsx`, `src/overlays/ProfileSheet.jsx`,
`src/lib/platform.js`, `docs/roadmap.md`. State what exists (Phantom injection
on the website, "Coming to iPhone" on native, routing out to Jupiter). Design:
web wallets via the Solana Wallet Standard; iPhone — why injected wallets
cannot exist in a WKWebView and the real options (Phantom deeplinks/universal
links, WalletConnect for Solana, Mobile Wallet Adapter status on iOS); Ondo on
Ethereum as a second chain; "trade elsewhere" links (Kraken, Bybit, Jupiter) as
the honest fallback. Phased plan, risks, owner decisions, and what the Vercel
Hobby (non-commercial) plan implies.

**R4 `desktop-audit.md`** — read `src/screens/Home.jsx`,
`src/screens/AssetDetail.jsx`, `src/components/shared.jsx`,
`src/components/TabBar.jsx`, every `lg:` rule and `--content-max` in
`src/index.css`, `docs/design-system.md`, `src/App.jsx`. Describe desktop
today. Propose a chart-first target layout (persistent watchlist sidebar, large
chart, detail beside it). Identify the SMALLEST first increment needing no
owner taste decision, with a file-anchored build brief and what must not
change on phones — or state clearly that no such increment exists.

**R5 `phantom-blowfish-submission.md`** — find the current Blowfish domain
allowlist / Phantom false-positive process (link the actual forms, list what
they ask). Draft the submission from repo facts: domain `blockwatch.app`, what
the site does, no custody, wallet used only to connect and sign on the website,
swaps through Jupiter, contact `contact@blockwatch.app`, the privacy URL. Flag
that a rebrand may change the domain.

**R6 `lawyer-question-list.md`** — one page, questions only, no advice. Facts:
solo US founder (confirm as a question); tracker for tokenized stocks issued by
Backed (Swiss, Solana) and Ondo (Ethereum); live free website + iOS TestFlight
beta; roadmap tracker → in-app zero-fee swap via Jupiter (waitlist collecting
emails) → fee switch later; non-custodial always; no entity yet; Vercel Hobby is
non-commercial-only and the venture is funded. Group: entity choice/timing;
securities exposure from displaying, linking to and routing trades; the swap
fee; jurisdictions (US users vs a Swiss issuer that may restrict US persons —
verify, phrase as a question); ToS/privacy; the waitlist emails; App Store;
what the lawyer needs from the owner. Three most important questions first.

### Build (one branch + PR each)

**B1 `chore/standing-debts`** — three debts:
1. WCAG contrast sweep: every `text-zinc-600` (or similarly dark grey) used for
   readable TEXT on dark surfaces must clear WCAG AA (4.5:1 normal, 3:1 large)
   against its actual background; decorative uses stay. Compute ratios (Tailwind
   v4 zinc values are oklch — resolve to sRGB); prefer `text-zinc-500` or an
   existing token; list every change with before/after ratio in the PR body.
2. Bottom sheets are not real modals: the `fixed inset-0` overlay + `sheet-in`
   pattern (`LearnSheet` in `src/components/LearnCards.jsx`, the overlays in
   `src/overlays/`). Build ONE shared primitive providing `role="dialog"`,
   `aria-modal`, a labelled heading, focus trap, Escape to close, focus restore
   on close, body scroll lock; migrate every sheet to it; keep look and behaviour
   otherwise identical; extract the focus-trap key logic as a pure function in
   `src/lib/` with tests.
3. `SignInSheet`: delete the dead "Sent — check your inbox" label and the
   write-only `resent` state.

**B2 `feat/candles`** — first the data layer, then the UI, same branch.
Data: `api/_geckoterminal.js` (pure parsing: pick the highest-24h-volume pool
whose base token symbol matches the ticker; normalize to ascending
`{time, open, high, low, close, volume}`) with tests modelled on
`api/_fred.test.js`; `api/candles.js` proxy with two allowlisted ops (resolve
pool for ticker+network; ohlcv for pool+timeframe+aggregate+limit — every
param an enum or a strict pattern; cache pool resolution `s-maxage=86400`,
candles 30/300/3600 for minute/hour/day with generous
stale-while-revalidate); a `/gt` dev proxy in `vite.config.js`;
`src/lib/candles.js` (timeframe definitions, normalizers, pool-choice scoring,
tested); `src/lib/indicators.js` (`sma`, `ema`, `rsi(14)`, `vwap` — tested
against hand-computed values including a known RSI fixture);
`src/services/candles.js` (`getTokenCandles(asset, timeframeId)` with an
in-memory pool cache per asset; `getStockCandles(symbol, interval, range)`
reusing `/api/history`, normalized to the same shape).
UI: add `lightweight-charts` from npm, dynamic-imported (the build already
warns about a >500 kB chunk), with the required "Charts by TradingView"
attribution link. In `src/screens/AssetDetail.jsx` add a chart MODE toggle
[Gap | Candles] in `FilterChips`' control language; **Gap stays the default
and the existing dual-line chart stays untouched in that mode**. Candles mode:
series selector [token | stock]; interval chips for the token (1m 5m 15m 1h
4h 1D) and for the stock only what `/api/history` allows; SMA 20 and EMA 50
overlays; RSI 14 in a second pane if v5 panes work cleanly, else omit and say
so. Loading = the existing animate-pulse skeleton; empty or errored = `null`
plus a one-line caption. Caption: "Token candles are the largest Solana pool,
one venue, not a composite." New pure logic in `src/lib/` with tests. Nothing
here can be visually verified without a browser — say "not visually verified"
in the PR and list what a human should check.

**B3 `feat/desktop-first-pane`** — only if R4 found an owner-free increment;
execute its brief exactly; phones byte-identical.

### Verify (per PR)

An independent reviewer that never fixes: check out the branch, re-run all
three gates and record the real numbers, read the full diff and every changed
file, verify each claim in the PR against the code, hunt for behaviour changes,
design-system violations, security (free-text passthrough, missing allowlists,
unbounded cache keys), tests that don't test, dead code, scope creep. Verdict
SHIP / FIX FIRST (with concrete, file-anchored kills) / RETHINK. One fix round
for kills, then re-review. Visual claims are "unverified", never kills.

### Deliver

A short handoff in the `research/2026-09-05` PR description: what shipped,
each PR's verdict, every decision the owner must make, and the three things
this line did not do (name, license application, real trades).
