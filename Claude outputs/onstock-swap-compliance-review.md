# Onstock: compliance review of the swap screen

Written by the Onstock Compliance Reviewer on September 16, 2026, against `main` at `d1ec601` (deployed to production that day). This is a risk review to prepare Terra for a securities lawyer. It is not legal advice and reaches no final legal conclusions. Nothing in the repository or any service was changed.

State reviewed: the in-app swap is deployed but OFF in production behind the PostHog flag `in-app-swap` (fails closed). The external "open in Jupiter" link-out is ON under `jupiter-link-out`. No region gating exists anywhere. Tradeable assets are the 103 xStocks mints verified on chain. The swap writes a local-only audit record in browser storage.

## Summary

Do not flip `in-app-swap` on yet. The single biggest problem is that Onstock has no region gating of any kind, so the moment the flag goes on, a user in the United States can buy a tokenized stock that the issuer's own documents say is not offered to US persons, inside an app that builds the transaction for them. A second problem is live in production right now, before any flag flip: the Trade screen labels Jupiter "Open to you" for every user, and Jupiter's own Terms of Use say it "does not interact with digital wallets located in, established in, or a resident of the United States." The custody claims are accurate and the price-impact handling is genuinely good; the gaps are regional access, product risk disclosure, one "guaranteed" claim, and a privacy policy that no longer matches the app.

## Red flags

### 1. HIGH. No region gating exists anywhere in the product

**Where.** `src/services/`, `src/state/`, and `api/` contain no geo, region, country, jurisdiction, or IP logic. The only gate on the swap is the feature flag:

- `src/overlays/SwapSheet.jsx:41`: `const swapAllowed = useFlag(SWAP_FLAG)`
- `src/components/asset/TradeButton.jsx:42`: `const showSwap = Boolean(wallet.publicKey) && swapOn`

The flag is global. It is on for everyone or off for everyone.

**Why it matters.** The SEC staff statement of January 28, 2026 says a tokenized security is still a security: "The format in which a security is issued or the methods by which holders are recorded does not affect application of the federal securities laws." The issuer's own documentation says the product is not for US persons: xStocks docs state "xStocks are not marketed, offered, or solicited in the United States, to U.S. Persons, or in any other prohibited jurisdiction." An app that presents a Buy button for that product to a US user, with no gate, is the fact pattern a lawyer will want to look at first.

**Fix.** Region gating has to exist before the flag is flipped. Whether IP-based gating is sufficient, and which regions to block, is a lawyer question (Q1, Q2).

### 2. HIGH. "Open to you" is stated to users Jupiter's own terms exclude, and this is live today

**Exact copy.** `src/screens/Trade.jsx:94-96` renders `Open to you` as a green badge on the Jupiter card, for every user in every country. Directly below it, `Trade.jsx:105` heads the other four venues with `Not offered in the US`, so the screen affirmatively tells a US reader that Jupiter, unlike the others, is available to them.

**Why it matters.** Jupiter's Terms of Use state: "Jupiter does not interact with digital wallets located in, established in, or a resident of the United States, the Republic of China, Singapore, Myanmar (Burma)... or any other state, country or region that is subject to sanctions enforced by the United States, the United Kingdom or the European Union." The same terms add: "You must not use any software or networking techniques, including use of a Virtual Private Network (VPN) to modify your internet protocol address or otherwise circumvent or attempt to circumvent this prohibition."

This is not a future risk. `jupiter-link-out` is ON in production. The link-out appears in three places: `src/screens/Trade.jsx:80`, `src/components/asset/TradeButton.jsx:63`, and `src/components/desktop/GapHeader.jsx:109`. The in-app swap calls Jupiter's API directly at `src/services/swap.js:20-21`, so the same restriction plausibly reaches the in-app path too.

**Fix now (engineer).** Remove or condition the "Open to you" badge. It is a per-user availability claim the app cannot support. Marketing should rewrite the replacement line.

### 3. HIGH. The swap flow may put Onstock inside the "broker" definition

**Where.** The whole in-app path: `src/overlays/SwapSheet.jsx` (quote, amount entry, Confirm), `src/services/swap.js:67` `getSwapQuote`, and `src/services/swap.js:245` onwards, which POSTs the user's public key to Jupiter's build endpoint and hands the resulting transaction to Phantom. The call to action is `TradeButton.jsx:59`, "Swap {asset.ticker}".

**Why it matters.** The SEC's Guide to Broker-Dealer Registration frames the test as: "Do you participate in important parts of a securities transaction, including solicitation, negotiation, or execution?" A yes to any of its questions "indicates possible broker status." Section 15(a)(1) makes it unlawful for an unregistered broker to use the internet to "effect any transactions in, or to induce or attempt to induce the purchase or sale of, any security."

Two facts cut in Onstock's favour and should go in front of counsel explicitly:
- **No transaction-based compensation.** `src/services/swap.js:4-5`: "NO platform fee is attached anywhere in this module — that switch stays off until the legal side exists."
- **No custody.** Onstock never holds funds or keys (item 12).

Two facts cut against: the app solicits the trade with its own button and copy, and it constructs the transaction.

The law here is genuinely unsettled. The SEC withdrew its 2022 proposed amendments to the "exchange" definition on June 12, 2025, so Rule 3b-16 as written still governs; and Commissioner Peirce's December 17, 2025 Request for Information asks, at question 16, "How can the Commission protect the ability of individuals to develop and deploy software and transact directly (or indirectly through autonomous software intermediation)", a question the Commission has not answered. Say "unsettled," not "permitted."

**Fix.** Lawyer question only. No code change resolves this.

### 4. HIGH. xStocks may be "linked securities," which carries a retail prohibition

**Why it matters.** The January 28, 2026 SEC staff statement describes a third-party "synthetic" model: "A 'linked security' is a security issued by the third party itself that provides synthetic exposure to a referenced security, but it is not an obligation of the issuer of the referenced security and confers no rights or benefits from the issuer of the referenced security." It adds: "Holders of the crypto asset may be exposed to risks with respect to the third party, such as bankruptcy, to which a holder of the underlying security would not necessarily be exposed." And on the security-based swap route: "The third party may not offer or sell the crypto asset representing the security-based swap to persons who are not eligible contract participants unless a Securities Act registration statement is in effect... and the transactions... are effected on a national securities exchange."

xStocks' own documentation says the tokens "does not confer shareholder voting rights" and are "structured financial instruments, not direct equity ownership."

This review does not conclude that xStocks are security-based swaps. It flags that the issuer's public description uses language close to the model the SEC staff describes, and that if a lawyer lands there, Exchange Act Section 6(l) and Securities Act Section 5(e) make retail access a hard prohibition, not a disclosure problem. The SEC has enforced this against an online platform before (Sand Hill Exchange, June 17, 2015, settled for a $20,000 penalty), an old case with a different product, but the same mechanism.

**Fix.** Lawyer question. Ask it before the flag, because geofencing the US is the only mitigation and it does not exist yet.

### 5. MEDIUM. "you're guaranteed at least the minimum shown" is an unqualified promise that is not accurate

**Exact copy.** `src/overlays/SwapSheet.jsx:496-500`: "Swap runs on Jupiter from your own wallet — you approve and send it in your wallet; OnStock never holds your funds. Prices move; you're guaranteed at least the minimum shown. Not investment advice."

**Why it matters.** The slippage bound (`swap.js:25`, `SLIPPAGE_BPS = 50`) does not guarantee the user receives the minimum. It guarantees the transaction reverts if the output would fall below it. The user then receives nothing and still pays the Solana network fee. "Guaranteed" is doing work the mechanism does not do.

Onstock is not a broker-dealer, so FINRA's communications rule does not apply to it directly; it is used here as a fair-and-balanced benchmark. FINRA Rule 2210(d)(1)(B) prohibits any "false, exaggerated, unwarranted, promissory or misleading statement or claim," and FINRA has said "a firm may not rely on linked explanations or disclosures to correct a communication that is, on its face false, misleading, exaggerated or promissory."

**Fix now (Marketing drafts, engineer lands).** Something like: "If the price moves past the minimum shown, the swap fails and nothing is exchanged. You still pay the Solana network fee."

Related, smaller: the sheet never names the 0.5% slippage tolerance, never says the user cannot change it, and never mentions the Solana network fee or token-account rent. `SwapSheet.jsx:403-422` shows only "You receive," "Minimum received," "Price impact."

### 6. MEDIUM. The swap sheet carries no product risk disclosure at all

**Where.** `src/overlays/SwapSheet.jsx`. The only risk language in the entire buy flow is the price-impact banners (lines 428-473, which are well done) and the five words "Not investment advice" at line 499.

Nothing in the flow tells the user: the token is issued by Backed, not by the company whose ticker is on the screen; it confers no shareholder or voting rights; they are exposed to the issuer's insolvency; it is not SIPC or FDIC protected; redemption with the issuer is limited to eligible non-US persons; the token trades 24/7 and can detach from the share price, which is the entire premise of the app.

**Fix now (Marketing drafts, engineer lands).** A short risk block in the sheet, above Confirm, not behind a link.

### 7. MEDIUM. Regulator reference sits directly above a signup call to action

**Exact copy.** `src/screens/Trade.jsx:123-128`: "In the US? Those four exclude US customers — but regulated tokenized trading is rolling out (the SEC approved Nasdaq's version in March 2026). Join the waitlist and you'll get one email the moment you can trade here."

**Why it matters.** The underlying fact checks out: the SEC approved Nasdaq's rule change on March 18, 2026, letting Nasdaq trade securities in tokenized form during the DTC pilot program. But that approval is about a registered national securities exchange trading already-registered securities in tokenized form. It is not about xStocks, and it is not about Onstock. Placing it in a paragraph addressed to US readers, immediately above "Join the waitlist," risks reading as regulatory momentum toward what Onstock is about to offer. An accurate fact placed so that it implies something inaccurate is still a problem under the benchmark above.

**Fix now (Marketing).** Separate the fact from the pitch, and say what the approval actually covers.

### 8. MEDIUM. The privacy policy is materially out of date and states one thing that is false

**Where.** `public/privacy.html`, effective date July 22, 2026.

- **Line 51:** "No cookies. No camera, microphone, location, or push-notification access — those are disabled at the platform level." The app requests notification permission at `src/overlays/SetAlertSheet.jsx:206` and posts notifications at `src/hooks/useAlertNotifications.js:42`.
- **Lines 114-121, services table:** omits Sentry entirely, omits Jupiter (`swap.js:20-21`, which receives the user's wallet public key at `swap.js:250`), and omits the Phantom wallet connection.
- **Lines 78-85, analytics:** does not mention feature-flag evaluation, which posts the device id to PostHog every 60 seconds (`src/services/featureFlags.js:171-176`), nor the `trade_out` events or `swap_sent`.
- **Lines 88-95, "What stays on your device":** does not mention the swap audit record. `src/services/swapAudit.js:26` stores under `bw.swap.audit.v1`; `swap.js:292-305` writes wallet address, side, ticker, both mints, amount, quoted output, minimum output, slippage, price impact, and at `swap.js:335` the transaction signature.
- **Lines 61-62:** "it does not hold funds, execute trades, or provide investment advice" becomes incomplete once the swap is on. Same sentence in `src/overlays/AboutSheet.jsx:39-40`.

**One thing that is right:** `swap.js:336` is `track('swap_sent')` with no properties. No wallet address, amount, or ticker reaches PostHog. Keep it that way.

A wallet address plus trade history is a strong pseudonymous identifier. Moving that audit record server-side into Supabase is a materially different privacy posture and should go past counsel before it is built (Q9).

**Fix now (engineer + Marketing).** Rewrite the policy to match the app, and stop saying push notifications are disabled.

### 9. MEDIUM. Apple's rules point at the iOS shell specifically

Apple's App Review Guidelines, 3.1.5(b)(iv): "Apps facilitating Initial Coin Offerings ('ICOs'), cryptocurrency futures trading, and other crypto-securities or quasi-securities trading must come from established banks, securities firms, futures commission merchants ('FCM'), or other approved financial institutions and must comply with all applicable law." And 3.2.1(viii): "Apps used for financial trading, investing, or money management should be submitted by the financial institution performing such services and must have necessary licensing and permissions in the locations where you make them available." And 3.1.5(b)(iii): exchange functionality is allowed only "in countries or regions where the app has appropriate licensing and permissions."

A tokenized equity is, on a plain reading of 3.1.5(b)(iv), a "crypto-security or quasi-security." Onstock is not a bank, securities firm, or FCM. Assume this is a real review risk for the Capacitor iOS build with the swap enabled, and ask counsel whether the link-out-only build sits differently (Q11).

On privacy labels: Apple requires declaring "the practices of third-party partners whose code you integrate into your app." PostHog maps to Usage Data (Product Interaction) plus Identifiers (Device ID); Sentry maps to Diagnostics (Crash Data). Whether a wallet address is an Identifier (User ID) or Financial Info is worth asking (Q10).

Engineer item: `capacitor.config.json` still has `"appName": "BlockWatch"` and `"appId": "app.blockwatch"` while the product is branded OnStock everywhere in the UI. Name mismatches between binary and listing are a routine Apple metadata rejection.

### 10. MEDIUM. The gap number beside the Buy button does not model the issuer's multiplier

Every xStocks mint carries an on-chain scaled-amount multiplier. The issuer's docs: "Every xStock launches with a multiplier of 1.0, meaning one token represents the value of one share," and after a dividend or split, "Token balances always represent the correct amount of underlying equity." The app assumes one token equals one share (`src/lib/prices.js:22-25`; first-day engineering review, Risk 4).

This is an engineering bug, but it is also a disclosure problem, because the wrong number is the headline on the same screen as the trade affordance (`GapHeader.jsx:59`). A gap that is an artifact of an unmodelled multiplier, displayed next to "Trade on Jupiter," is a misleading statement about a security. Engineer owns the fix.

### 11. LOW. Onstock has no terms of service

`public/` contains only `favicon.svg`, `icons.svg`, `manifest.webmanifest`, `privacy.html`. There is no terms of service, no user agreement, no eligibility representation, and nothing the user accepts. Once the app builds transactions that spend real money, that absence is worth raising with counsel (Q12).

### 12. LOW. No sanctions screening, and confirmation that the custody claims are accurate

There is no screening of the connected wallet address against OFAC's SDN list, and no blocking of sanctioned jurisdictions. OFAC's virtual currency guidance is that "DeFi services that are U.S. persons are required to comply with OFAC economic sanctions programs regardless of location," and that IP blocking alone "does not fully address" compliance risk. Whether Onstock is a "service" for this purpose is a lawyer question (Q6).

**On custody, the claims hold.** `swap.js` never touches keys: it deserializes Jupiter's unsigned transaction (`swap.js:277-281`) and calls `provider.signAndSendTransaction(tx)` (`swap.js:313`). The copy is accurate at `src/overlays/WalletSheet.jsx:27`, `src/components/asset/TradeButton.jsx:82`, and `SwapSheet.jsx:498`.

Non-custodial status is also the fact that most likely keeps Onstock outside money transmission. FinCEN's 2019 guidance (FIN-2019-G001, May 9, 2019) turns on, among other things, "whether the person acting as intermediary has total independent control over the value." Onstock has none. That is a favourable fact, not a conclusion (Q7).

## Changes worth making before the flag is flipped

### Copy or code the engineer can do now (no lawyer needed)

1. **Remove the "Open to you" badge** at `src/screens/Trade.jsx:94-96`. Ship today, independent of the swap, because `jupiter-link-out` is already on.
2. **Fix the "guaranteed" sentence** at `SwapSheet.jsx:499`. Replace with an accurate description of what the minimum does: if the price moves past it, the swap fails, nothing is exchanged, and the network fee is still paid.
3. **Add a risk block to the swap sheet**, above Confirm: issued by Backed and not by the company, no shareholder or voting rights, exposure to the issuer, not SIPC or FDIC protected. Marketing drafts, engineer lands.
4. **Disclose the fixed 0.5% slippage tolerance and the Solana network fee** in the quote block (`SwapSheet.jsx:403-422`).
5. **Rewrite `public/privacy.html`** to match the app: add Sentry, Jupiter, the Phantom wallet connection, feature-flag evaluation, the `trade_out` and `swap_sent` events, and the `bw.swap.audit.v1` local record and its contents. Delete the false "no push-notification access" line. Update the effective date.
6. **Update the "tracker" sentence** in `AboutSheet.jsx:39-40` and `privacy.html:61-62` so it stays accurate once the app builds trades.
7. **Rewrite the Nasdaq sentence** at `Trade.jsx:123-128` so the approval is not read as covering what Onstock is about to do. Marketing.
8. **Build the region gate itself** (the plumbing, not the policy): a server-side country check on the Vercel edge, feeding a per-region flag that `TradeButton.jsx:42` and `SwapSheet.jsx:41` both respect and that fails closed exactly as the swap flag does. Which regions go in the list is the lawyer's call, but the mechanism has to exist first and takes longer to build than to decide.
9. **Fix the multiplier** so the displayed gap is honest (engineering review Risk 4).
10. **Align `capacitor.config.json`** app name with the OnStock branding before any App Store submission.

### Needs a lawyer's answer first

- Whether to enable the in-app swap at all, in any region.
- Which countries and regions go in the block list, and whether IP-based blocking is adequate or whether an attestation or wallet screening is also expected.
- Whether xStocks are security-based swaps, and what that means for retail access.
- Whether the "Open to you" replacement copy can say anything affirmative about availability.
- Whether the swap audit record may move server-side, and what retention and deletion rules attach.
- Whether to ship the iOS build with the swap enabled at all.
- Whether Onstock needs terms of service before the swap goes live, and what eligibility representations they need.

## Questions for a securities lawyer

1. If a US-resident user opens Onstock and taps Swap, and the app requests a quote from Jupiter, builds an unsigned Solana transaction, and hands it to the user's own Phantom wallet to sign and broadcast, is Onstock "effecting transactions in securities for the account of others" under Exchange Act Section 3(a)(4), or "inducing or attempting to induce the purchase or sale of a security" under Section 15(a)(1)? Does the absence of any platform fee (confirmed in `src/services/swap.js:4-5`) change the answer?
2. If Onstock blocks US users by IP and offers the swap only outside the United States, does that remove the Section 15(a)(1) exposure, or does a US-based founder operating the app from the United States retain it regardless of user location?
3. Are xStocks tokens "linked securities" or security-based swaps as described in the SEC staff statement of January 28, 2026? If they are, does Exchange Act Section 6(l) and Securities Act Section 5(e) prohibit Onstock from facilitating retail access to them anywhere, or only in the United States?
4. Does displaying a live quote, a "minimum received," and a Confirm button for a specific tokenized stock constitute a recommendation or solicitation of that security, as distinct from publishing market data? Does the Screener's "which issuer is currently cheapest" ranking (`src/screens/Screener.jsx`) change that answer?
5. Jupiter's Terms of Use state it "does not interact with digital wallets located in, established in, or a resident of the United States" and prohibit VPN circumvention. What is Onstock's exposure for (a) linking US users to jup.ag, and (b) calling `lite-api.jup.ag` on behalf of a US user? Is there a contractual or tortious claim here separate from the securities analysis?
6. Does Onstock need an OFAC sanctions compliance program, including SDN screening of connected wallet addresses and blocking of comprehensively sanctioned jurisdictions, before enabling the swap? Is IP geoblocking sufficient given OFAC's guidance that it "does not fully address" compliance risk?
7. Does a non-custodial interface that never controls funds or keys avoid federal money transmitter registration under FinCEN's 2019 guidance, and does it avoid state money transmitter licensing in the states where users are located?
8. Is Backed Finance's restriction that xStocks are "not marketed, offered, or solicited in the United States, to U.S. Persons" binding on Onstock as a third-party interface, and does Onstock need permission from Backed or Kraken to present these tokens with a trade affordance at all?
9. The app currently writes a local-only record per swap attempt containing the wallet address, both mints, the amount, the price impact, and the transaction signature (`src/services/swapAudit.js`). If this moves to a Supabase table: (a) is a wallet address personal data under the CCPA and the GDPR; (b) what retention period and deletion process do we need; (c) does holding it create any recordkeeping obligation or, conversely, any regulatory expectation we would then be failing?
10. For Apple's App Privacy labels, how should a connected wallet address be categorised, Identifiers (User ID), Financial Info, or neither, given Onstock stores it locally but does not transmit it to its own servers?
11. Does Apple guideline 3.1.5(b)(iv), requiring apps facilitating "crypto-securities or quasi-securities trading" to come from banks, securities firms, or FCMs, apply to Onstock's iOS build with the in-app swap enabled? Does a link-out-only build sit differently?
12. What terms of service does Onstock need before enabling the swap, and what user representations (residence, eligibility, not a sanctioned person) should they carry to be meaningful?
13. Is there a disclosure formulation for the swap sheet that would satisfy you, given Onstock is not a registered broker-dealer and has no suitability obligation, but is presenting a trade affordance for a security to retail users?
14. Is the sentence "regulated tokenized trading is rolling out (the SEC approved Nasdaq's version in March 2026)," placed immediately above a waitlist signup, a problem under the general antifraud provisions or as an implied regulatory endorsement, even though the underlying fact is accurate?

## What could not be assessed

- **App Store status.** No App Store Connect access. Unknown whether Onstock is already listed, what its current privacy labels say, or what category it is filed under.
- **The Nasdaq approval order's full text.** The SEC's PDF (`34-105047.pdf`) was not machine-readable and federalregister.gov blocked fetches. The SEC's own description was relied on: Nasdaq's rule change enables trading of securities in tokenized form during the DTC Pilot Program, approved March 18, 2026. The scope conditions in the order itself should be read before anyone relies on that sentence in marketing.
- **xStocks' full Terms of Service.** The PDF at xstocks.fi was not machine-readable. The HTML documentation at docs.xstocks.fi was used instead. The actual terms may contain additional restrictions, including on third-party interfaces.
- **The SEC Investor Advisory Committee's March 12, 2026 recommendation on tokenization of equity securities**, and the Market Structure Subcommittee recommendation of February 26, 2026. Both are PDFs that could not be read. They are likely the most on-point current official material on retail access to tokenized equities and are worth putting in front of counsel.
- **Jupiter's terms' effective date.** None is shown on the page read. A lawyer should pin the version.
- **Whether xStocks are in fact security-based swaps.** The resemblance in the SEC staff's own language is flagged; the instrument is not characterised here.
- **Where users actually are.** PostHog was not queried. The first-day engineering review reported 99 device ids over 30 days. Pull the country breakdown before deciding how much US exposure already exists through the link-out.
- **Supabase contents** against what the privacy policy claims were not inspected.
- **Corporate structure.** Unknown what entity, if any, publishes Onstock or where it is incorporated. That changes several of the questions above.
- **Detailed Google Play, state money transmission, and EDPB blockchain sources.** Google Play's Financial Services policy treats "the management or investment of money and cryptocurrencies" as financial products and requires a link between the developer account and any licences; no dedicated securities-trading section surfaced. Onstock is iOS-only today, so this is not blocking.

## Sources

- SEC, Division of Corporation Finance, Division of Investment Management and Division of Trading and Markets, *Statement on Tokenized Securities*, January 28, 2026. https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC, *Guide to Broker-Dealer Registration*, last modified October 6, 2009. https://www.sec.gov/about/divisions-offices/division-trading-markets/division-trading-markets-compliance-guides/guide-broker-dealer-registration
- SEC, *Notice of Withdrawal of Proposed Regulatory Actions*, June 12, 2025 (effective June 17, 2025), withdrawing the March 18, 2022 proposed amendments to the "exchange" definition. https://www.sec.gov/files/rules/final/2025/33-11377.pdf
- Commissioner Hester M. Peirce, *And Then Some: Request for Information Regarding National Securities Exchanges and Alternative Trading Systems Trading Crypto Assets*, December 17, 2025. https://www.sec.gov/newsroom/speeches-statements/peirce-12172025-then-some-request-information-regarding-national-securities-exchanges-alternative-trading-systems
- SEC, *Division of Trading and Markets: Frequently Asked Questions Relating to Crypto Asset Activities and Distributed Ledger Technology*, published May 15, 2025, updated February 19, 2026. https://www.sec.gov/rules-regulations/staff-guidance/trading-markets-frequently-asked-questions/frequently-asked-questions-relating-crypto-asset-activities-distributed-ledger-technology
- SEC, *SEC Proposes New Regulation Crypto Assets*, August 18, 2026 (investment contracts; does not address tokenized equities or broker registration). https://www.sec.gov/newsroom/press-releases/2026-76-sec-proposes-new-regulation-crypto-assets
- SEC, *SEC Announces Enforcement Action for Illegal Offering of Security-Based Swaps* (Sand Hill Exchange), June 17, 2015. https://sec.gov/news/pressrelease/2015-123.html
- SEC, order approving Nasdaq rule change for tokenized securities trading, Release 34-105047, March 18, 2026 (PDF, not read). https://www.sec.gov/files/rules/sro/nasdaq/2026/34-105047.pdf
- SEC Investor Advisory Committee, *Recommendation Regarding Tokenization of Equity Securities*, approved March 12, 2026 (not read). https://www.sec.gov/files/recommendation-tokenization-equity-securities.pdf
- xStocks, *Product Legal Overview*, accessed September 16, 2026. https://docs.xstocks.fi/docs/product-legal-overview
- xStocks, *Dividends and Stock Splits* (multiplier mechanism), accessed September 16, 2026. https://docs.xstocks.fi/docs/dividends-and-stock-splits
- Jupiter, *Terms of Use*, accessed September 16, 2026 (no effective date shown). https://developers.jup.ag/docs/legal/terms-of-use
- Apple, *App Review Guidelines*, accessed September 16, 2026 (3.1.5(b) Cryptocurrencies; 3.2.1(viii) financial trading). https://developer.apple.com/app-store/review/guidelines/
- Apple, *App Privacy Details on the App Store*, accessed September 16, 2026. https://developer.apple.com/app-store/app-privacy-details/
- Google Play, *Financial Services* developer policy, accessed September 16, 2026. https://support.google.com/googleplay/android-developer/answer/9876821
- FinCEN, *Application of FinCEN's Regulations to Certain Business Models Involving Convertible Virtual Currencies*, FIN-2019-G001, May 9, 2019. https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models
- OFAC, *Sanctions Compliance Guidance for the Virtual Currency Industry*, accessed September 16, 2026. https://ofac.treasury.gov/media/913571/download?inline=
- OFAC FAQ 73, compliance for internet and web-based activities, accessed September 16, 2026. https://ofac.treasury.gov/faqs/73
- FINRA Rule 2210, *Communications with the Public* (used only as a fair-and-balanced benchmark; Onstock is not a FINRA member). https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210

This is a risk review to prepare for legal counsel, not legal advice.

## Appendix: supplementary sources from the background sweep

Retrieved September 16, 2026. Source retrieval only, no analysis. Pages without a published date are marked as such.

- **Wallet addresses are personal data under GDPR when linkable to a person.** EDPB Guidelines 02/2025 on processing of personal data through blockchain technologies, Version 2.0, adopted July 7, 2026 (cite this version, not the April 2025 draft). Glossary ¶137: "A wallet address/account/public key is an identifier linked to a cryptographic key pair in a blockchain network. This identifier qualifies as personal data under Article 4 GDPR when it can be associated with an identified or identifiable natural person." ¶28 adds that off-chain data collected via a dApp or wallet, such as IP addresses, can also be personal data. https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_202502_blockchain_v2_en.pdf
- **California.** Civil Code §1798.140, as amended effective January 1, 2026. Subdivision (aj) defines "unique identifier" to include "a device identifier; an Internet Protocol address; ... unique pseudonym, or user alias; ... or other forms of persistent or probabilistic identifiers that can be used to identify a particular consumer or device." Neither "wallet address" nor "blockchain" appears in the section; coverage would run through that general language. No CPPA or Attorney General publication naming wallet addresses was found. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140
- **FinCEN FIN-2019-G001, May 9, 2019.** §4.2 four-criteria test including "whether the person acting as intermediary has total independent control over the value." §4.5.1(b): "suppliers of tools (communications, hardware, or software) that may be utilized in money transmission ... are engaged in trade and not money transmission." §5.1: a trading platform where "the parties themselves settle any matched transactions through an outside venue ... does not qualify as a money transmitter." §4.4: "when DApps perform money transmission, the definition of money transmitter will apply to the DApp, the owners/operators of the DApp, or both." No FinCEN guidance from 2024 to 2026 revisits this analysis. Secondary reporting indicates DOJ's charging position in the Samourai Wallet case was argued to diverge from this guidance; litigation outcome not verified. https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models
- **State money transmission.** CSBS Money Transmission Modernization Act model law (PDF carries no internal version date; hosted at a 2023-08 path). §2.01(q): money transmission "does not include the provision solely of online or telecommunications services or network access." Virtual currency is an optional Article XIII adopted by a minority of states; §13.02(b)(1)(A) excludes a person that "contributes only connectivity software or computing power to a decentralized virtual currency, or to a protocol governing transfer." The model contains no "non-custodial" language; jurisdiction answers need the enacted state statute. https://www.csbs.org/csbs-money-transmission-modernization-act-mtma
- **Google Play (no page dates published).** Cryptocurrency Exchanges and Software Wallets policy: "Non-custodial wallets are out of scope of the Cryptocurrency Exchanges and Software Wallets policy." United States row for in-scope apps: developer "must be either (a) registered with FinCEN as a Money Services Business and with a state as a money transmitter or (b) a federal or state chartered bank entity." Financial Services policy: financial products are "those related to the management or investment of money and cryptocurrencies"; any app with financial features must complete the Financial features declaration, whose "Trading and funds" category lists "Stock trading and portfolio management." Play Console Requirements list "stock trading ... cryptocurrency software wallets, and cryptocurrency exchanges" among app types requiring an Organization account. No general requirement to display a licence number in-app was found. https://support.google.com/googleplay/android-developer/answer/16329703 and https://support.google.com/googleplay/android-developer/answer/9876821
- **Apple App Privacy Details (no page date).** "'Third-party partners' refers to analytics tools, advertising networks, third-party SDKs, or other external vendors whose code you've added to your app." Identifiers: "User ID — Such as screen name, handle, account ID, assigned user ID, customer number, or other user- or account-level ID"; "Device ID — Such as the device's advertising identifier, or other device-level ID." Diagnostics: "Crash Data — Such as crash logs." App Tracking Transparency applies only when app data is linked with other companies' data for advertising purposes or shared with a data broker, which Onstock does not do. https://developer.apple.com/app-store/app-privacy-details/

## Addendum, September 16, 2026: the issuer ratio line and the swap refusal message

Reviewed on branch `fix/multiplier-units` at `07ebfc6`, which models the xStocks on-chain share-per-token ratio. Both sentences returned REWORD. Neither is advice or a guarantee; both state things the app does not know.

**The ratio line is not behind the swap flag.** `multiplierLine` is rendered by `GapPanel.jsx`, which `AssetDetail.jsx` and the desktop `AssetNumbers.jsx` render unconditionally. It therefore reaches every user, including US users, the moment the branch merges. It has been gated behind the swap flag as a conservative measure pending a lawyer's view on the noun (question 15).

**What was wrong with "1 token = 10 shares since a split on 16 Nov 2025".** The cause is inferred from the number's shape and is already wrong on the repository's own data: TQQQx carries a ratio of 2.009 and would render "since a dividend", while the issuer's own worked example shows a 4-for-1 split producing a fractional ratio. Sub-one ratios also arise from spin-offs and demergers, not only reverse splits. The date is the on-chain activation time, one day after the ex-date, not the corporate action's date. The bare equals sign asserts an equivalence to shares that Backed's legal overview denies. Replacement wording: "Issuer ratio: 1 token tracks the value of 10 NFLX shares. Backed last changed this ratio on 16 Nov 2025." The cause is no longer named.

**What was wrong with the refusal message.** It told the user the issuer had changed the ratio and that the app had not re-checked, when the message fires on four paths, three of which are the app's own gap, and the app re-checks on every open. "Your tokens are unaffected" fires on the buy side. "Can still be swapped from your wallet" is unsupportable: Backed's mints carry pause and blocklist extensions, routing is Jupiter's, and Jupiter excludes US wallets. Replacement wording: "We can't confirm how many shares one <TICKER> token currently represents right now, so we won't size a trade we can't state the size of. Nothing has been sent and your balance is unchanged."

**Disclosure.** Neither sentence changes what the app collects. Terms of service move onto this branch's timeline rather than the swap's, because the ratio line is the app's first affirmative statement about a corporate action affecting a specific listed security.

### Additional questions for a securities lawyer

15. The asset screen states a token-to-share ratio for a token whose issuer describes it as "a bearer debt instrument classified as a tracker certificate" that "does not confer shareholder voting rights". Is a bare equivalence to "shares", shown with no qualifier, a misleading statement about a security? Which formulation would you accept: "shares", "shares' worth", "tracks the value of N shares", or something else?
16. If Onstock states only the ratio and the date it changed, naming no corporate action, does that remove the exposure? Or does any statement about a corporate action affecting a listed company's securities carry accuracy obligations that should be treated as a research-publication problem rather than a user-interface one?
17. Onstock publishes a token-to-share ratio, and until now a corporate-action label and date, for 55 listed securities and funds, with no relationship to the issuer of either the token or the underlying. Does that engage the Investment Advisers Act publisher's exclusion analysis, or any market-data licensing question?
18. The ratio comes from the Solana chain and Jupiter's price API, not from the issuer. If a displayed ratio or date is wrong and a user trades on it, what is Onstock's exposure, and would a data-accuracy term in terms of service meaningfully change it?
19. The original refusal message told users their tokens "can still be swapped from your wallet" while Backed's mints carry pause and blocklist extensions and Jupiter excludes US wallets. Is a statement of continued tradability a representation that creates liability independent of the securities analysis?
20. The ratio line renders outside the swap flag, so it is commentary on a tokenized security shown to US users. Should it be region-gated on the same mechanism as the swap rather than shipping ahead of it?
21. If the line names the issuer in Onstock's voice ("Backed last changed this ratio on..."), does naming Backed create an implied relationship or endorsement problem, or a trademark or terms-of-use issue under the full xStocks terms, which remain unreadable as published?
22. Does Onstock need terms of service with a data-accuracy term and a no-advice term before this branch merges, separately and earlier than the terms the swap itself will need under question 12?

### Additional sources

- xStocks (Backed), *Dividends and Stock Splits*, accessed September 16, 2026: a 4-for-1 split shown moving the multiplier from 1.008 to 4.032; the multiplier "published onchain before each corporate event takes effect", activating 00:30 UTC the day after the ex-date. https://docs.xstocks.fi/docs/dividends-and-stock-splits
- Solana Foundation, case study: xStocks, accessed September 16, 2026, no page date. Describes Token-2022 extensions on Backed's mints: a Transfer Hook usable for blocklists and a Pausable Config that "lets the issuer pause all interactions with the token". Not an issuer legal document; verify on chain before relying on it. https://solana.com/news/case-study-xstocks

**Could not assess:** whether Backed's pause or blocklist extensions are actually enabled on these mints today; the full xStocks terms; what actually caused any specific ratio in the pinned data.
