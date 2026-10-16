# Connect whatever you use to trade — design

Written 2026-09-05. Design only. Nothing here is built, and none of it should be built unattended: every option below touches the money path.

**The rule that never moves:** the app never holds funds and never holds keys. It learns a public address, it hands an unsigned transaction to a wallet the user already owns, and the wallet does the signing and the sending. Every option in this document was checked against that rule, and the ones that fail it are listed as rejected, not as "later".

**What "free" means here:** no paid services, no new API keys. Two of the things below need a free account or key anyway (Jupiter's new API gateway, WalletConnect). They are flagged as owner decisions rather than quietly assumed.

---

## 1. What exists today, precisely

Read from the code on main as of this morning.

**Wallet connection** — `src/state/WalletContext.jsx`. Talks straight to `window.phantom.solana` (`getProvider()`, top of the file). No SDK. If the injected object exists and has `isPhantom`, the app can connect; otherwise `available` is false. Silent reconnect via `connect({ onlyIfTrusted: true })`. Exposes `{ available, provider, publicKey, connecting, connect, disconnect }`. Only Phantom is recognised — Solflare, Backpack and every other wallet look like "no wallet" even when installed.

**Where it surfaces** — `src/overlays/ProfileSheet.jsx` lines 121–141. Four states in one row: connected (opens `WalletSheet`), Phantom present (Connect), native app (a dead row reading "Coming to iPhone"), or a "Get a wallet — Phantom" row that opens phantom.com/download. Note the last one shows in **mobile Safari too**, where Phantom cannot inject either, so on a phone browser it sends a Phantom owner to a download page for an app they already have.

**The swap** — `src/overlays/SwapSheet.jsx` and `src/services/swap.js`. Quote from `lite-api.jup.ag/swap/v1/quote`, unsigned transaction from `/swap/v1/swap`, then `provider.signAndSendTransaction(tx)`. The only two things `executeSwap` needs from a provider are `provider.publicKey` and `provider.signAndSendTransaction`. That narrow surface is what makes every option below tractable: a new wallet path has to supply exactly those two things. The phase tagging (`build` vs `broadcast`) and the "check your wallet first" state are the most carefully built code in the project and must survive any change.

**The ladder on the asset screen** — `src/screens/AssetDetail.jsx` lines 436–472. If `wallet.publicKey`, a filled "Swap TICKER" button opens the sheet; otherwise a bordered link to `https://jup.ag/swap/USDC-<mint>` opens Jupiter externally. Only assets with a `mint` get either.

**The Trade tab** — `src/screens/Trade.jsx`. Jupiter as the one "Open to you" venue; Kraken, Bybit, Gate.io, KuCoin listed under "Not offered in the US"; the waitlist form. The links are venue homepages, not asset pages.

**Native detection** — `src/lib/platform.js`: `isNativeApp()` is true only under `capacitor://` or `ionic://`.

**Native deep links already exist** — `src/main.jsx` lines 23–33 handle cold-start launch URLs and warm `appUrlOpen` events, currently only for `/auth/confirm`. `public/.well-known/apple-app-site-association` claims `/auth/*` for app `92Y88BW5VC.app.blockwatch`; `ios/App/App/App.entitlements` has `applinks:blockwatch.app`. This is the plumbing an iPhone wallet flow rides on, and it is already proven to work (sign-in links).

**Data** — `src/data/universe.js` lines 9–12: `ISSUER_META` says xStocks are Solana (venues Kraken/Bybit/Gate/KuCoin/Jupiter) and Ondo is **Ethereum only** with the single venue "Ondo Global Markets". 711 assets; 103 carry a Solana `mint` (all xStocks). Ondo's 441 records carry no chain address at all.

**Security headers** — `vercel.json` CSP `connect-src` allows `lite-api.jup.ag`, CoinGecko, Supabase, PostHog, Sentry and the site itself. Nothing else. Any new upstream or relay must be added there or it fails silently.

### Three facts that change the picture (verified today)

1. **Ondo is on Solana now, and trades on Jupiter.** Ondo launched its tokenized stocks on Ethereum (Sept 2025), BNB Chain (Oct 2025) and Solana (21 Jan 2026), and renamed the product "Ondo Stocks" in July 2026. `ISSUER_META` is wrong on both the chain and the venue list. That means 441 assets — most of the universe — could have a Solana mint and ride the exact swap path that already exists, without any second-chain work. Whether their Solana liquidity is real enough to quote is a separate question (see §5).
2. **`lite-api.jup.ag` is being retired.** Jupiter's migration page says lite-api is in "progressive deprecation" with rate limits stepping down until it is switched off; the replacement is `api.jup.ag`, keyless at 0.5 requests/second, or a free key at 1 RPS. I probed both this morning: lite-api still returns 200 for price and quote, and `api.jup.ag/price/v3` answers **without** a key. Every price tick, spread readout and swap quote in the app depends on this host, so it is upstream of everything else in this document.
3. **Both issuers exclude US persons.** Kraken's xStocks page: "Not available to US persons." Ondo's page: "offered only outside the United States and only to eligible non-U.S. persons." The lawyer question list already carries this. It shapes the wording of every connect and trade surface below.

---

## 2. The three surfaces, and who they are for

| Surface | Where the user is | What can work |
|---|---|---|
| Website in a desktop browser | Extension wallets inject | Wallet Standard (Phantom, Solflare, Backpack, others) |
| Website in mobile Safari / Chrome | Nothing injects | Same options as native: deeplinks, or open the site inside the wallet's browser |
| iPhone app (Capacitor WKWebView) | Nothing injects | Deeplinks with a universal-link return; or open the site inside the wallet's browser |

The second row is the one the current UI gets wrong. Mobile web and native should share one design.

---

## 3. Web: the Solana Wallet Standard

**What it is.** A small open-source convention (github.com/wallet-standard) where each installed wallet registers itself on `window` and apps discover them with `getWallets()` from `@wallet-standard/app`, or by listening for the `wallet-standard:register-wallet` event. Each wallet advertises features by name — `standard:connect`, `standard:disconnect`, `standard:events`, `solana:signAndSendTransaction`. Phantom, Solflare and Backpack all implement it. No key, no service, no network call — it is purely a discovery protocol over the same injection mechanism the app already relies on.

**Why this and not `@solana/wallet-adapter`.** The adapter's React UI package ships its own modal, fonts and styling, which fights the design system (it is pills, gradients and a purple accent by default). The standard packages are a few kilobytes and give us the list; we draw the sheet ourselves.

**Design.**

- `WalletContext` stops hard-coding Phantom. On mount it collects wallets that expose `solana:signAndSendTransaction`, keeps listening for late registrations, and exposes `wallets: [{ name, icon, connect }]`.
- The connect row in `ProfileSheet` opens a **Choose a wallet** sheet: one row per detected wallet (icon from the wallet's own `icon` data URI, name, chevron), rows separated by `--border-subtle`, no cards. One wallet detected → skip the picker, connect directly, exactly as today. Zero detected → the state described in §4 (do not say "Get Phantom").
- After connect, `provider` is an adapter object with exactly `publicKey` and `signAndSendTransaction(tx)`, built from the wallet's `solana:signAndSendTransaction` feature. `swap.js` does not change. `WalletSheet` says "Connected via Solflare" instead of always "Phantom" — a one-line label change today, but it will be a lie the moment a second wallet works.
- Silent reconnect: the standard has no `onlyIfTrusted`; the convention is to remember the last wallet name in `localStorage` and call `connect({ silent: true })` on it. That is a per-device convenience, not state that matters if it is lost.
- CSP: unchanged. Injection happens before our scripts run and is not subject to `connect-src`.
- Tests: the discovery filtering, the "which wallet did we remember" logic and the adapter shape are pure and belong in `src/lib/` (a `wallets.js` with no `window` at module load), in line with the vitest constraint.

**A quiet upside.** Phantom's Blowfish scanner currently flags blockwatch.app (roadmap §2.2), which blocks every Phantom user from swapping. Solflare and Backpack do not use Phantom's blocklist. Supporting them is the only way anyone can complete a swap on the site before Phantom's manual review finishes.

---

## 4. iPhone (and mobile web): why nothing injects, and what does work

**Why injection cannot exist in the app.** `window.phantom.solana` on a desktop is written into the page by the Phantom **browser extension**'s content script. A Capacitor app is a `WKWebView`, which has no extension mechanism — no third party can run a content script inside it, and Apple does not permit apps to load other apps' code. Phantom does not ship a Safari Web Extension either, so mobile Safari has the same problem. The wallet lives in a separate process (the Phantom app) and the only ways across the process boundary are the ones Apple provides: URL schemes and universal links, or a network relay both sides connect to.

Four candidates were checked.

### 4a. Open the site inside the wallet's browser — smallest real step

Phantom, Solflare and Backpack each have an in-app browser where their provider **does** inject, and each exposes a "browse" universal link that opens a URL in it: `https://phantom.app/ul/browse/<url>?ref=<ref>` (Solflare and Backpack have equivalents). Tapping that from the native app or mobile Safari hands the user to Phantom, which loads `blockwatch.app/asset/<id>` with the wallet already injected — and the existing `WalletContext` + `SwapSheet` code runs unchanged.

- Cost: one link builder and a row in the wallet sheet ("Open in Phantom", "Open in Solflare", "Open in Backpack"). No crypto, no new dependency, no CSP change.
- Honesty: the user leaves the app and swaps on the website. The wording must say that. It is not "trade in the app" — it is the fastest true path to a working swap on a phone.
- Limits: Phantom's blocklist still applies (it is the same site). And if the user does not have the wallet, the universal link lands on the wallet's website, which is the right outcome.
- Requires: the asset route to be deep-linkable on the web (it is; folders/search already navigate by id — confirm the URL survives a cold load).

### 4b. Wallet deeplinks with a universal-link return — the real "connect on iPhone"

Phantom, Solflare and Backpack publish the **same protocol shape**: `https://<wallet>/ul/v1/connect`, `/disconnect`, `/signAndSendTransaction`, `/signTransaction`, `/signMessage`, with end-to-end encryption. Documented endpoints: `phantom.app/ul/v1/…`, `solflare.com/ul/v1/…`, `backpack.app/ul/v1/…`. One implementation, three wallets.

How it works, in plain terms:

1. The app generates a fresh x25519 key pair (tweetnacl `box` — a small, free, audited library; plus base58 encoding).
2. Connect: open `…/ul/v1/connect?app_url=https://blockwatch.app&dapp_encryption_public_key=<ours>&redirect_link=<our universal link>&cluster=mainnet-beta`. Phantom opens, asks the user, then returns to us via `redirect_link` carrying `phantom_encryption_public_key`, a `nonce` and encrypted `data` containing the user's `public_key` and a `session` token. We derive the shared secret and decrypt. Rejection arrives as `errorCode`/`errorMessage` on the same redirect.
3. Swap: build the Jupiter transaction exactly as today, serialize it **base58** (Jupiter returns base64 — one conversion), encrypt `{ transaction, session }` with a new nonce, open `…/ul/v1/signAndSendTransaction?dapp_encryption_public_key=…&nonce=…&redirect_link=…&payload=…`. The wallet signs, sends, and redirects back with the encrypted `signature`.
4. Disconnect: `…/ul/v1/disconnect` with the session, then wipe local state. Sessions "do not expire" per Phantom's docs, so disconnect must be a real, offered action (it already is in `WalletSheet`).

What it plugs into:

- `redirect_link` must be a URL our app owns. Add a `/wallet/*` component to the AASA next to `/auth/*`, and route it in `main.jsx` beside `handleAuthLink`. Same for a `/wallet/*` rewrite in `vercel.json` so the web page also exists (needed when the universal link opens Safari instead of the app — which iOS does if the user came from a long-press, or if the AASA fails to verify). That web page must say "Return to the app" and nothing else; it must never try to complete the swap itself.
- The provider adapter implements `publicKey` and `signAndSendTransaction(tx)` by opening a URL and **waiting for a redirect that may arrive after the app was suspended or killed**. That is the hard part and the reason this is not a weekend job: a promise cannot survive a cold start. The design is a small pending-action record (which method, which nonce, when, for which asset and amount) written to storage **before** the deeplink opens, and consumed by the `/wallet/*` handler on return. If the app relaunches with a pending `signAndSendTransaction` and no answer, it shows the existing "Check your wallet first" state — that is the `broadcast` phase in `swap.js` terms, and it is exactly the state this project built for it.
- Storage: the dapp secret key and the session must persist across app switches (Phantom is foregrounded for seconds to minutes). `localStorage` in the WebView survives that. It is still a secret that authorises a session, so: keep it scoped to the wallet feature, wipe on disconnect, and never mirror it to Supabase or analytics. Flag for the owner whether the Capacitor Preferences plugin (Keychain-backed on iOS) is worth adding for this one value — it is free and first-party.
- Cannot detect whether a wallet is installed. Offer all three; a missing wallet lands on its website.
- CSP: navigations are not `connect-src`; nothing to add. Jupiter's host is (see §7).
- Mobile Safari gets the same flow with `redirect_link` pointing at the website — one code path for both rows of the table in §2.

Tests: URL building, payload encryption/decryption with injected keys, response parsing (including `errorCode`), and the pending-record state machine are all pure and go in `src/lib/`. The tests for swap.js's phase tagging must be extended so that "deeplink opened, no redirect yet" is proven to be `broadcast`, never `build`.

### 4c. WalletConnect (Reown AppKit) — checked and set aside

It works over a relay, so it functions inside a WebView. But: it requires a project ID from Reown's dashboard (free, but it is an account and a key), the packages are heavy and bring their own modal, the relay and its assets need new CSP entries (`wss://` and image hosts), and — decisive — Phantom's documented WalletConnect support covers EVM and Bitcoin, not Solana. A Solana-connect feature that excludes Phantom is not worth a key. Revisit only if the Ethereum leg (§5) is ever built.

### 4d. Mobile Wallet Adapter — not available on iOS

The MWA 2.0 specification says, twice, that iOS support "is planned for a future version of this specification." Local association is Android-only today. Not an option for the iPhone app; nothing to design.

### 4e. Embedded wallets (Phantom Connect SDK "embedded", Google/Apple sign-in) — rejected

Non-custodial in Phantom's description, but the keys are created and managed by a Phantom-hosted flow under an `appId` we would register, and the wallet would exist only inside our app. That moves the app much closer to the keys than the invariant allows, adds an account with Phantom, and would need its own legal review. Not free in the sense that matters. Rejected.

---

## 5. Ethereum and BNB Chain (Ondo)

Ondo Stocks exist on Ethereum, BNB Chain and Solana, are freely transferable outside the US, and list on Binance, Gate, KuCoin, MEXC, Bitget, 1inch, UniswapX, PancakeSwapX and wallets like MetaMask and Trust — plus Jupiter on Solana.

**Recommendation: do not build an EVM swap.** Reasons in order:

1. The universe has **no** contract addresses for Ondo on any chain. Before any trading UI, the data build (`scripts/build-universe.mjs`) needs to learn Ondo's per-chain addresses. If the Solana mints are there, they slot into the existing Jupiter path with no new chain at all.
2. A second chain means a second wallet stack (EIP-1193/EIP-6963 on web, WalletConnect on mobile), a second quote source (1inch/Uniswap APIs — both keyed), gas in ETH, and approvals (ERC-20 `approve` before swap — a step Solana does not have and that the current SwapSheet's states do not model). That is a second money path, with its own review.
3. Ondo excludes US persons more explicitly than Backed does. The lawyer call comes first.

**What to do instead:** fix `ISSUER_META` — Ondo's chains and its real venue list — and give Ondo assets the "trade elsewhere" links in §6. Add a `chains: []` array rather than a single `chain`, since one issuer now spans three.

---

## 6. "Trade elsewhere" — the honest fallback, done properly

Today's outbound links are venue homepages, except the Jupiter pair link on the asset screen. Design for per-asset venue links:

- **Asset screen**: under the swap/Jupiter button, a "Trade elsewhere" list — one row per venue that actually lists this asset, with the region note stated per row in `t-caption`: "Kraken · not for US persons", "Jupiter · on-chain, from your wallet", "Ondo · non-US, verification required". Rows, hairlines, no cards; the venue name in `t-label`; an external-link mark. Nothing rendered when a venue list is empty (no "no venues" box).
- **Deep links where the venue supports them**: Jupiter `jup.ag/swap/USDC-<mint>` (already used); Kraken's xStocks pages (`kraken.com/xstocks` — asset-level URLs need checking by hand); Ondo `app.ondo.finance`. Where a venue has no stable per-asset URL, link the venue's tokenized-stocks page, not its homepage.
- **Trade tab**: keep the two-tier layout, but the "In the US?" paragraph should now say plainly that both issuers currently exclude US persons, and the waitlist copy should stop implying in-app trading is what the waitlist unlocks if the lawyer says otherwise.
- Every outbound link keeps `track('trade_out', { venue, ticker })` as today — the only way to learn which venues people want.

This phase has no wallet, no key and no money path. It is the one part of this document that can be built without an owner in the room.

---

## 7. Jupiter's API migration — upstream of everything

Every quote, price tick and swap build in the app calls `lite-api.jup.ag`. It still answers today, but Jupiter says its limits are being stepped down until it is off. Options:

| Option | Rate | Key? | Fits the rules? |
|---|---|---|---|
| Keep lite-api | shrinking, unannounced | no | until it stops, silently — prices go stale, swaps fail to quote |
| `api.jup.ag` keyless | 0.5 RPS | no | yes — but the fast price layer alone runs ~0.4 RPS per client, and the swap sheet re-quotes every 8 s |
| `api.jup.ag` with a Free key, called from the browser | 1 RPS | yes, free | a key in the browser bundle is public — do not |
| `api.jup.ag` with a Free key behind a Vercel proxy | 1 RPS **shared by all users** | yes, free | worse than keyless-per-client for prices; only sensible for the swap build call |

Recommendation: switch base URLs to `api.jup.ag` now (keyless), add it to `connect-src`, and measure. Take the free key only if the owner accepts a new key, and then only for a server-side `/api/jup-swap` proxy of the swap-build POST. If that proxy is built it copies `api/rates.js` exactly — `rejectUnknownParams` allowlist, `applyCors`/`handlePreflight`, JSON out, 400 on bad input, 502 upstream — and the mint parameters are validated against `universe.json` mints before anything is forwarded, never passed through as free text. The quote endpoint should stay client-side regardless: it is the per-user, per-second one.

---

## 8. Phased plan

**Phase 0 — truth and links (no money path).**
Fix `ISSUER_META`; per-asset venue rows with region notes; corrected copy in Profile (mobile web stops saying "Get Phantom"), Trade and the asset screen; Jupiter base-URL switch and CSP entry. Tests for the venue-row selection logic. Ships to web and TestFlight without any wallet change.

**Phase 1 — web, more than one wallet.**
Wallet Standard discovery; the wallet picker sheet; adapter with the two-method surface; `WalletSheet` names the actual wallet. Verified by hand on desktop with each of the three extensions before it merges. `swap.js` untouched.

**Phase 2a — phone, open in wallet.**
"Open in Phantom / Solflare / Backpack" rows for native and mobile Safari, using the browse universal links. Requires the web asset route to load cold by URL. This is the first swap a phone user can complete.

**Phase 2b — phone, native connect.**
The deeplink protocol for all three wallets, `/wallet/*` in AASA + `main.jsx` + a `vercel.json` rewrite, the pending-action record, and the relaunch-into-"check your wallet" path. Gated behind Phantom's blocklist review clearing, and behind the domain rename (below). Built with the owner present, on a TestFlight build, with a small real amount.

**Phase 3 — Ethereum/BNB.**
Only after the lawyer call, only if Ondo's Solana mints turn out not to cover it. Links until then.

**Do the rename first.** Universal links, AASA, `applinks:` entitlement, CORS allowlist, CSP and Phantom's `app_url`/`redirect_link` all name `blockwatch.app`. Phantom's blocklist review is per domain, so a review won as blockwatch.app is lost when it becomes onstock. Rename, then request the review, then build 2b.

---

## 9. Risks

- **Double swap on a phone.** Phone flows can be killed mid-signing. Nothing in 2b may ever tell a user "nothing was sent" unless the pending record proves the deeplink never opened. The current `unknown` state is the correct default; the record exists to make it reachable after a relaunch.
- **A universal link that opens Safari.** iOS falls back to the web when the AASA is stale or the user long-pressed. The web `/wallet/*` page must never hold or forward the encrypted response anywhere except back into the app.
- **Secret in WebView storage.** The x25519 secret and session token live in `localStorage` between app switches. Anyone with the device unlocked and the app open can read it; it authorises asking the wallet to sign, and the wallet still prompts the user every time. Acceptable with a real Disconnect and a wipe; note it in the privacy page.
- **Blowfish.** Phantom users hit a warning on every path in this document until the review clears; the deeplink `app_url` is scanned the same way. Solflare and Backpack are the mitigation.
- **Jupiter throttling arrives silently.** Stale prices look like a display bug, not an outage (the Finnhub lesson from the roadmap). A "last updated" per leg is already the design-system rule; this is one more reason to render it.
- **Region.** Both issuers exclude US persons. A US-based product routing US users to swap those tokens is the lawyer's question 3; the UI can only be honest about it. Geo-gating is a decision, not a default.
- **Wallet drift.** The deeplink protocols are documented but not versioned across wallets; each has its own error codes and Discussions full of `-32603`. Pin the exact documented endpoints in one `src/lib/walletLinks.js` file with a comment per wallet naming its docs page.
- **Data correctness.** The roadmap already lists `universe.json` mint mapping as unvalidated. Adding Ondo mints multiplies that exposure. The mint-resolves-to-ticker test it proposes should land before Phase 0 ships new mints.

---

## 10. What Vercel Hobby implies

Hobby is "non-commercial personal use only"; commercial use is anything deployed "for the purpose of financial gain of anyone involved." A funded venture with a fee switch designed in is commercial on its face, regardless of whether the fee is on. Consequences specific to this design:

- The iPhone return path (`/wallet/*` universal link), the AASA file and any Jupiter proxy are all served by Vercel. If Hobby is suspended for a terms breach, **wallet connect on iPhone stops working mid-session** — and a user who opened a deeplink at that moment lands in the "unknown" state. The money path on the phone inherits Vercel's uptime. Pro ($20/mo) removes the terms exposure; it does not change the uptime dependency.
- Hobby functions have a 10-second default timeout. Jupiter's swap-build POST is normally well under a second; fine.
- The lawyer list already asks whether to upgrade before or after the entity exists. Nothing in Phases 0–2a needs a Vercel change; 2b should not ship on Hobby.

---

## 11. Decisions only the owner can make

1. **Jupiter key.** Switch to keyless `api.jup.ag` at 0.5 RPS and accept the ceiling, or take the free API key (a new key, against the standing rule) and put it behind a Vercel proxy for the swap-build call only?
2. **Order of operations.** Domain rename → Phantom blocklist review → Phase 2b, as proposed? Or ask Phantom to review blockwatch.app now and accept redoing it?
3. **Which phone path first.** 2a (open in wallet, days) before 2b (native connect, weeks), or skip 2a?
4. **Wallet coverage.** Phantom, Solflare and Backpack only? Others that implement the standard (Coinbase Wallet, Trust, Kraken Wallet) would appear in the web picker for free once discovered — allow any wallet with the right features, or an allowlist of three?
5. **Store the deeplink secret** in WebView `localStorage`, or add the Capacitor Preferences plugin (Keychain-backed, free) for that one value?
6. **Region behaviour.** Given both issuers exclude US persons: honest labels only, or a geo-gate on the swap and the wallet connect until the lawyer answers?
7. **Ethereum/BNB.** Confirm links-only for Ondo off-Solana, and authorise adding Ondo's Solana mints to the universe build.
8. **Vercel.** Whether any wallet feature ships on Hobby at all, and whether the swap fee design should stay in the code while the plan is Hobby.
9. **The waitlist promise.** Its copy says "when in-app trading opens". With 2a/2b, define what event fulfils that email.

---

## Sources checked today

- Phantom deeplinks: connect / signAndSendTransaction / browse method pages (docs.phantom.com, github.com/phantom/docs)
- Solflare deeplinks (docs.solflare.com/solflare/technical/deeplinks), Backpack deeplinks (docs.backpack.app/deeplinks)
- Phantom Connect SDK README (github.com/phantom/phantom-connect-sdk)
- Wallet Standard README (github.com/wallet-standard/wallet-standard)
- Mobile Wallet Adapter 2.0 spec (solana-mobile.github.io) — iOS "planned for a future version"
- Reown AppKit installation docs (docs.reown.com) — project ID mandatory
- Jupiter developer portal migration page (developers.jup.ag/docs/portal/migration); live probes of lite-api.jup.ag and api.jup.ag at 2026-09-05
- Ondo: "Ondo Stocks" product page and the Solana launch post (ondo.finance); CoinDesk 2026-01-21
- Kraken xStocks page (kraken.com/xstocks) — "Not available to US persons"
- Vercel Hobby plan and fair-use pages (vercel.com/docs)
