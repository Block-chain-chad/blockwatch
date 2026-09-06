# Phantom / Blowfish domain review — submission draft

Date: 2026-09-05. Promised in August (roadmap 2.2). Nothing has been sent yet.

Read this on a phone in five minutes: the first section says where to file and
what they ask for, the second is the text to paste in, the third is the same
text for onstock.app, and the last section is the short list of things only
you can decide before it goes out.

---

## 1. Where this actually gets filed today

There is no Blowfish form. Phantom took the review process in-house in June
2025 and the only public channels are the ones below. Everything a reviewer
sees comes from these two places, so fill the form, then send the email as a
follow-up with the same text.

### The form (primary)

**Phantom dApp Review Submission** (Google Form)
https://docs.google.com/forms/d/1JgIxdmolgh_80xMfQKBKx9-QPC7LRdN6LHpFFW8BlKM/viewform

Linked from Phantom's developer docs, "Domain and transaction warnings":
https://docs.phantom.com/developer-powertools/domain-and-transaction-warnings

Those docs say the "This domain is new or has not been reviewed yet" notice
usually clears by itself within a few days, and to use the form only when it
has persisted for more than a week. Ours has persisted since at least August,
so we qualify.

The form asks for exactly these eleven things, in this order (fetched
2026-09-05):

| # | Field | Type | Required |
|---|-------|------|----------|
| 1 | Project Name | short answer | yes |
| 2 | Describe your dApp | paragraph | yes |
| 3 | dApp website URL | short answer | yes |
| 4 | Your Name | short answer | yes |
| 5 | Your E-mail | email | yes |
| 6 | Transaction Link | short answer | yes |
| 7 | Team Information (GitHub profile, LinkedIn, etc.) | paragraph | yes |
| 8 | Social Media Handles | paragraph | yes |
| 9 | Repository Links | paragraph | no |
| 10 | Community member who can vouch (name + contact) | paragraph | no |
| 11 | Additional information | paragraph | no |

The note on the form says only the project's own team should submit it.

### The email (follow-up and for any back-and-forth)

**review@phantom.com**

This replaced review@blowfish.xyz on 2025-06-24 (Phantom maintainer, GitHub
discussion #221). Phantom staff answer every public thread the same way:
"contact review@phantom.com" (discussion #404, Feb 2025) and "our trust and
safety team has replied to your email, keep working with them" (#414, Mar 2025).
So the real review is an email thread; the form is how it starts.

### Public follow-up (optional, helps)

Phantom's GitHub Discussions: https://github.com/orgs/phantom/discussions
Open one thread titled "Domain: blockwatch.app — new/unreviewed domain
warning" with the same text if nothing comes back in two weeks. Staff do read
these; they redirect to the email but it creates a public timestamp.

### What to expect

- Timeline: community reports range from 48–72 hours to about a week; the
  roadmap's "measured in weeks" is the pessimistic end. No official SLA.
- What reviewers look at (from the refusals people posted): age of the social
  accounts tied to the project (#414 was refused for "newly created" socials),
  whether a known Solana community member vouches (#426), whether the site is
  reachable and the code path is visible. A private repo and a locked site
  both count against us — see section 4.
- One submission per domain. www.blockwatch.app and blockwatch.app are
  separate origins to a wallet unless one redirects to the other. Our CORS
  and CSP lists allow both, so name both in the form to be safe.

---

## 2. Submission text — blockwatch.app

Every claim below is taken from the code as of today. File and line references
are for you, not the reviewer; strip them before pasting.

**1. Project Name**

BlockWatch

**2. Describe your dApp**

BlockWatch is a tracker for tokenized stocks (xStocks and similar Solana
tokens that mirror listed shares). Its core feature is showing the gap between
a token's price and the real share it represents, alongside the stock's quote,
chart and news. It is a read-only price tool first; the wallet feature is
optional and off to the side.

What the wallet is used for, and only this:

- Connect: we call the injected Phantom provider's `connect()` so the app can
  display the user's public address. We never see or handle keys. There is no
  wallet SDK, no message signing, no `signMessage`, no `signAllTransactions`.
- Swap: a user can buy or sell a tokenized stock against USDC. The route and
  the unsigned transaction come from Jupiter's public lite API
  (lite-api.jup.ag/swap/v1/quote and /swap). The app deserializes that
  transaction and hands it to Phantom via `signAndSendTransaction`. Phantom
  signs and broadcasts; BlockWatch never touches the transaction after that
  and never holds funds. Slippage is fixed at 0.5% and shown to the user.
- No platform fee is attached anywhere. The fee switch does not exist in the
  shipped code.
- Disconnect is an explicit button; a previously approved site reconnects
  only via `connect({ onlyIfTrusted: true })`.

Nothing custodial exists in the product: no deposit address, no server-side
wallet, no private key handling, no approval or delegate transactions. Our
backend (Vercel serverless) only proxies stock quotes, charts, rates and news
and never sees wallet activity.

Privacy: no ads, no cookies, no selling data, accounts optional (Supabase,
email-only). Full policy at https://blockwatch.app/privacy.html.

The domain is new (mid-2026), which we believe is the only reason for the
"new or not reviewed" warning. We are asking for a review so users stop seeing
it at connect time.

**3. dApp website URL**

https://blockwatch.app [OWNER — also list www.blockwatch.app if it serves
the site rather than redirecting; the redirect lives in Vercel's domain
settings, not in the repo, so check it in a browser]

**4. Your Name**

[OWNER — your real name; see section 4]

**5. Your E-mail**

contact@blockwatch.app

**6. Transaction Link**

[OWNER — a Solscan link to one real swap sent from blockwatch.app, e.g.
https://solscan.io/tx/<signature>; see section 4. If you would rather not
trade, write: "The warning appears at wallet connect, before any transaction
is built. No transaction is required to reproduce it: open
https://blockwatch.app, tap Connect Wallet, approve in Phantom."]

**7. Team Information**

Independent single-developer project. GitHub: https://github.com/Block-chain-chad
[OWNER — add LinkedIn or another long-lived profile if you have one; age of
the accounts is what they check.]

**8. Social Media Handles**

[OWNER — see section 4. If none: "No project social accounts yet. Contact is
contact@blockwatch.app and the GitHub profile above."]

**9. Repository Links**

[OWNER — https://github.com/Block-chain-chad/blockwatch is PRIVATE today; see
section 4. If it stays private, paste the two files that matter into a public
gist and link that: src/state/WalletContext.jsx (connect only) and
src/services/swap.js (Jupiter quote, wallet signs).]

**10. Community member who can vouch**

[OWNER — see section 4. Leave blank rather than invent one.]

**11. Additional information**

- The wallet code is small and readable: connect is one file that talks to
  `window.phantom.solana` directly; the swap is one file that fetches a
  Jupiter quote and calls `signAndSendTransaction`. Happy to share both.
- The site sets no cookies and loads no third-party scripts other than
  PostHog analytics (anonymous device id).
- Strict security headers on every response (vercel.json): CSP with
  `script-src 'self'` and a fixed `connect-src` allowlist (Jupiter, CoinGecko,
  Supabase, PostHog, Sentry, our own origin), `frame-ancestors 'none'`,
  `X-Frame-Options: DENY`, HSTS. The site cannot be embedded in an iframe and
  cannot load scripts from anywhere else.
- Hosting: Vercel. Data: Supabase, Finnhub, Yahoo Finance, CoinGecko,
  Jupiter, FRED.
- The same product is being renamed OnStock and will move to onstock.app; we
  will file a second request for that domain once it is live and will keep
  blockwatch.app redirecting to it. We are telling you now so the second
  submission is not read as a copycat.

### Email version (send to review@phantom.com right after the form)

Subject: Domain review request — blockwatch.app (new/unreviewed warning)

Hi Phantom trust & safety,

I have just submitted the dApp Review form for blockwatch.app. Short version:
BlockWatch is a tokenized-stock price tracker with an optional non-custodial
swap. The wallet is used for two things only — `connect()` to show the
address, and `signAndSendTransaction` on an unsigned transaction built by
Jupiter's public swap API. No message signing, no custody, no platform fee, no
server-side wallet. Privacy policy: https://blockwatch.app/privacy.html.

The "new or not reviewed" warning has been showing since at least August. The
domain was registered in mid-2026, which we assume is the trigger. Anything
you need — code, a screen recording of the flow, a signed message from the
domain's contact address — I can provide.

Thanks,
[OWNER name]
contact@blockwatch.app

---

## 3. Submission text — onstock.app

Do not file this until (a) onstock.app is bought, (b) the site is deployed
there and serves the wallet connect, and (c) blockwatch.app redirects to it.
A reviewer who opens an empty domain will refuse, and a refusal is harder to
reverse than a fresh request. Approval does not transfer between domains, so
this is a second full submission, not an update.

Only the fields that change are listed; every other field is identical to
section 2.

**1. Project Name**

OnStock (formerly BlockWatch)

**2. Describe your dApp**

Same text as section 2 with these substitutions: "BlockWatch" → "OnStock",
privacy URL → https://onstock.app/privacy.html. Add as the final paragraph:

OnStock is the renamed BlockWatch (blockwatch.app), which you reviewed on
[DATE / ticket if any]. Same code, same developer, same wallet integration;
blockwatch.app now redirects here. We are filing separately because the
warning is per-domain.

**3. dApp website URL**

https://onstock.app (blockwatch.app redirects here)

**5. Your E-mail**

[OWNER — contact@onstock.app once mail is set up there, otherwise keep
contact@blockwatch.app. Use whichever address you can actually answer from.]

**11. Additional information**

Prepend: "Rename of blockwatch.app — see prior review." Then the same bullets
as section 2 minus the last one.

**Email subject**

Domain review request — onstock.app (rename of reviewed domain blockwatch.app)

Before filing, also update in the repo: the privacy page's "applies to
blockwatch.app" line, the `<title>`, manifest name, `api/_cors.js` origin
list (add onstock.app and www.onstock.app; keep the old ones until the
redirect has been live a while), and the auth-link tests that hard-code
blockwatch.app.

---

## 4. Decisions only you can make

Each of these blocks a required field or will get the request refused.

1. **Your real name (field 4).** The form is submitted by a person. A handle
   alone reads as anonymous, which is what the reviewers refuse for.

2. **Transaction link (field 6, required).** Either do one small real swap on
   blockwatch.app with your own Phantom wallet and paste the Solscan link, or
   use the "warning appears at connect, no transaction needed" sentence.
   A real signature is stronger evidence that the flow is what we say it is.

3. **Social handles (field 8, required).** We have none in the repo or on the
   site. Refusal #414 was explicitly for "newly created" socials, so creating
   an account this week to fill the field may hurt more than leaving it
   honest. Options: your personal accounts if they are years old, or the
   "no project socials yet" sentence.

4. **Repository visibility (field 9).** The repo is private. Choices: make it
   public, make a public gist of WalletContext.jsx + swap.js, or offer read
   access on request. Public code is the single easiest way to get a
   non-custodial claim believed. Check for anything you would not want public
   (the access-gate hash is safe, but read `supabase/` and `api/` first).

5. **Is production locked?** `AccessGate` shows a code screen whenever
   `VITE_ACCESS_HASH` is set at build time. If the live blockwatch.app deploy
   still has it set, a reviewer sees a lock screen and stops. Either unset it
   for production before filing, or put the beta code in field 11 (weaker, and
   it means the code is now in a Google Form).

6. **Privacy page says nothing about wallets.** A reviewer will open
   privacy.html and find no mention of Phantom, addresses or swaps, while the
   submission says the wallet is a feature. Suggested paragraph under "Who we
   are" or a new "Wallet" heading, which you should approve since it is the
   policy:

   > **Wallet (optional).** You can connect a Phantom wallet to buy or sell a
   > tokenized stock. BlockWatch only ever sees your public address, which is
   > kept on your device and never sent to our servers. Swaps are routed
   > through Jupiter and are signed and sent by your wallet; we never hold
   > funds, keys or the transaction, and we charge no fee.

   (Also update the "does not hold funds, execute trades" sentence, which is
   now half wrong: we still hold no funds, but the app does let you send a
   trade from your own wallet.)

7. **Vouching (field 10).** Blank is fine; a real Solana developer you know
   is worth more than any other field. Do not name someone who has not agreed.

8. **When to buy onstock.app.** Section 3 cannot be filed until it is live.
   If the rename is weeks away, file blockwatch.app now anyway — a clean
   review history on the old domain is the best evidence for the new one.

Sources checked 2026-09-05: Phantom developer docs (domain and transaction
warnings), Phantom help-center article 43483612411411, Phantom GitHub
discussions #221, #281, #404, #414 and phantom/docs #426, the Google Form
itself, Blowfish wallet-integration docs, dappsentry's Phantom warning page.
