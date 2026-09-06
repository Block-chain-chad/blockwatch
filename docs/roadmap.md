# BlockWatch — what happens next

Written 2026-07-29, the day the app reached a real iPhone.

Where things stand: the web app is live and gated, the native app is on
TestFlight and verified working on device, 39 tests guard the money path, and
the redesign is shipped across every screen. What follows is ordered by what
actually blocks the next thing, not by what is most interesting to build.

---

## Phase 1 — survive the first testers (this week)

The goal is not features. It is that ten people can open the app in a week
without hitting something broken, and that you find out when they do.

### 1.1 External TestFlight

Internal testing works but requires each tester to be a user on your App Store
Connect account. External testing takes an email or a public link, up to 10,000
people, and needs one lightweight beta review from Apple (usually about a day).

Setup, in App Store Connect → TestFlight:

- **External Testing** → **+** → group name, e.g. `Friends`
- **Test Information** (required before review):
  - Feedback email — where tester reports land
  - Privacy policy URL — `https://blockwatch.app/privacy.html` (live, verified)
  - **What to Test** — see the draft in §1.2
- **Demo account: not required.** The native build ships without the access
  gate, so a reviewer can use the app immediately. Confirmed: the beta code
  hash is absent from the iOS bundle.
- Add build 6 → **Submit for Review**

Once approved, invite by email or turn on the public link.

**Known reviewer questions for an app like this**, and the honest answers:

- *Does it facilitate trading?* No. It tracks prices and links out to external
  venues. Wallet connect does not function inside a WebView, so there is no
  in-app transaction path on iOS at all right now.
- *Is it financial advice?* No, and the disclaimer says so on every screen.
- *Account required?* No. The app is fully usable signed out.

### 1.2 "What to Test" — draft

> BlockWatch compares tokenized stocks against the real shares they track.
> The number to look at is the **gap** — how far a token's price sits from
> its underlying share.
>
> Worth trying:
> - Home shows your watchlist with each asset's gap
> - **Gaps** ranks every company by how mispriced it is right now, and shows
>   which issuer is cheapest when several tokenize the same company
> - Tap any asset for both price lines charted together, plus the gap's history
> - Search adds assets to your watchlist
>
> Known and expected: the in-app swap does not appear on iOS yet. Trading
> routes out to Jupiter instead.
>
> Tell me: did prices load, did anything look broken, and did you understand
> what the gap number meant without being told?

That last question is the real one. Everything else is bug-hunting.

### 1.3 Finnhub rate limit — THE technical blocker

Free tier is **60 API calls per minute, shared across every user of the app.**
Measured: BlockWatch requests up to 50 stock symbols per minute in a single
lane. Two or three concurrent testers exhaust the quota, and the symptom is
prices silently going stale rather than an error — which looks exactly like the
CORS bug that took two rounds to fix.

This must be sorted before friends are invited, or the first thing they see is
a broken app that looks fine.

Options, cheapest first:
1. Paid Finnhub tier — needs current pricing checked against measured usage
2. Reduce polling: longer intervals, fewer symbols per cycle, only subscribe to
   what is on screen (partly done already via the subscription registry)
3. Cache stock quotes server-side in the proxy so N users cost 1 upstream call

Option 3 is the real fix and does not need a bigger plan — the /api proxies
already sit in front of Finnhub, so adding a short shared cache there converts
per-user cost into per-symbol cost. Worth doing regardless of tier.

### 1.4 Error monitoring

The ErrorBoundary catches crashes and tells the *user*. Nothing tells *you*.
A tester hitting a bug today is a bug you never learn about — which makes the
whole point of testing moot.

Sentry's free tier is enough. One dependency, one DSN.

### 1.5 Vercel Hobby → Pro

Hobby is licensed for non-commercial use. A funded venture on Hobby is a terms
violation, and the failure mode is the site going down without warning. $20/mo.

Bonus: Pro has real deployment password protection, which would replace the
AccessGate code screen with something that never ships gate logic to the
browser at all.

---

## Phase 2 — be a real company (weeks)

### 2.1 Entity structure — the one with a clock on it

Upstream of everything else. The investment needs somewhere to live, and the
answer may not be the LLC that was assumed all along: investors frequently
require a C-corp, and converting later is expensive rework.

This is a lawyer/accountant conversation, not an engineering one. Whoever
arranged the investment can point to the right person.

Once the entity exists: move the domain, Vercel, Supabase and the Apple account
onto it, open a business bank account, and bill infrastructure to the company
from the first invoice rather than reimbursing later. The Apple account
migrates Individual → Organization once a D-U-N-S number exists.

### 2.2 Phantom domain allowlist

Trading is blocked for every user until Phantom's Blowfish scanner stops
flagging blockwatch.app as suspicious — a false positive from being a new
domain that requests wallet access. Submit via Phantom's developer support and
post in their GitHub discussions. It is a manual review measured in weeks, and
it goes faster with community vouching, which is an argument for building some
public presence.

### 2.3 The fee switch

Still off, by design, until the entity exists and a lawyer has looked at it.
Jupiter's integrator fee is a token change once that is true — the code path is
already built and tested.

---

## Phase 3 — worth coming back to (month plus)

Ordered by how much they would change someone's reason to open the app.

### 3.1 Native wallet

Phantom does not inject into a Capacitor WebView, so the swap path — the most
heavily hardened code in the project — is invisible on iOS. Needs a deeplink
flow or mobile wallet adapter. Blocked behind 2.2 regardless.

### 3.2 Portfolio

The app tracks prices but a user cannot say what they own. No cost basis, no
P&L, no "my exposure to the gap". This is the most common reason a tracker gets
opened daily rather than once.

### 3.3 Alerts that reach the phone

Alerts currently fire client-side only and pause when the app is backgrounded.
Someone who sets a price alert reasonably expects to be told when they are not
looking at the app. Needs push notifications — real work, real payoff.

### 3.4 Issuer and chain browsing

711 assets across xStocks, Ondo, bStocks and several chains, with no way to
browse by either. The screener already proves the data supports it: identical
S&P 500 exposure trades 74 basis points apart depending on the wrapper.

---

## Standing debts

Small, cheap, and they compound if ignored.

- **Tests cover the money path only.** `swap.js` and `format.js` are covered;
  `PricesContext`, the alert engine and the folder sync are not. The price
  shield and the alert hysteresis are the two most likely to break silently.
- **WCAG contrast — done.** Readable text never goes below `zinc-500`;
  `zinc-600` is decoration only (chevrons, dividers, sparklines). The rule is
  written on the token in `index.css`.
- **Accessible sheets.** The bottom sheets are not real modals — no focus trap,
  no Escape, no `role="dialog"`. A keyboard user can tab out of a live swap.
- **No rate limiting on the API proxies.** A trivial script can burn the shared
  Finnhub quota. Related to 1.3 and fixed by the same server-side cache.
- **CoinGecko is keyless.** Public endpoint, no SLA, no recourse if throttled.
- **`universe.json` mint mapping is unvalidated.** 103 swappable records where
  a mismapped mint would route real USDC to the wrong token. A test that
  resolves each mint against Jupiter and checks the ticker would close it.

---

## The measure that matters

Not users, not revenue, not the App Store. **Ten people who open BlockWatch in
a week and come back.** Everything in Phase 3 is a guess until that number
exists, and everything in Phase 1 exists to make it possible.
