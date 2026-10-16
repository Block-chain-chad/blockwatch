# OnStock — questions for the first lawyer call

Written 2026-09-05. Questions only; nothing here is legal advice or a conclusion.

**What OnStock is, in one breath:** a tracker that shows the price gap between tokenized stocks (issued by others — Backed Finance's xStocks on Solana, Ondo Global Markets on Ethereum) and the real shares. Live today: a free website and an iOS TestFlight beta. Planned: an in-app zero-fee swap routed through Jupiter (a waitlist is collecting emails now), then a fee on those swaps, and possibly a paid subscription for charting. Always non-custodial. No entity yet. Solo founder, funded, hosted on Vercel's Hobby plan.

## The three that matter most

1. **Entity, now.** Given a solo founder who has already taken money, should the entity be an LLC or a C-corp, in which state, and what has to happen to the money already received once it exists? Does the investor's paperwork dictate the answer?
2. **Is any part of the roadmap a broker, exchange or ATS?** Displaying tokenized-stock prices, linking to venues, routing a swap through Jupiter, and finally taking a fee on that swap — at which rung (if any) does OnStock stop being a data product and become a regulated securities intermediary, and does "non-custodial" change that answer?
3. **US users vs a Swiss issuer.** Backed's terms appear to restrict US persons from xStocks (please verify). If that is right, what does it mean for a US-based product that shows, links to, or routes trades in those tokens for US users? Should the swap be geo-gated, and is a tracker without the swap on safer ground?

## Entity and timing

- Is a US solo founder the right assumption for this call, or does anything about residency, citizenship or where the funding came from change the setup?
- What is the order of operations: entity, EIN, bank account, then moving the domain, Vercel, Supabase and the Apple developer account onto it? What breaks if that order is wrong?
- Vercel Hobby is licensed for non-commercial use only. Does a funded venture on Hobby already create exposure, and should the upgrade wait for the entity or happen first?
- What should the founder/company agreement say about the code written before the entity existed (IP assignment)?

## Securities exposure

- Is showing the gap between a token and its underlying share, and ranking assets by that gap, something that could read as a recommendation or investment advice? What disclaimer language actually helps, and what is theatre?
- Does linking out to a trading venue differ legally from embedding a swap that we route?
- Does the "zero-fee" phase carry less exposure than the fee phase, or is routing itself the trigger?
- Are there tokenized-stock products we should avoid listing at all (issuer, chain, or jurisdiction based)?

## The swap fee and the subscription

- If OnStock takes a percentage on Jupiter swaps: is that a transaction-based fee that brings broker-dealer, money transmitter or similar questions? Does it matter that Jupiter, not OnStock, executes and that we never hold funds?
- Would a flat subscription for charting tools (TradingView-style) be treated differently from a per-trade fee? Is it the safer first revenue?
- How should the two be structured so one does not contaminate the other?

## Jurisdictions

- Beyond the Swiss issuer point above: Ondo Global Markets also restricts certain users — what should we verify and document about each issuer's eligibility rules?
- If we accept non-US users, which jurisdictions create obligations just by having users there (EU/MiCA, UK)?

## Trademark: OnStock

- An App Store finance app named "ON STOCK" by ATON Inc. already exists. Is a clearance search worth doing before we rename, and does a finance app with that name block ours, or just narrow it?
- Should we file a USPTO application now (which classes), and in whose name if the entity is not yet formed?
- Is "BlockWatch" worth keeping as a mark, or should it be abandoned cleanly?

## Terms of Service and privacy

- What must the Terms say about a non-custodial swap so the user, not OnStock, owns the transaction? Are there terms we cannot enforce in a wallet-signed flow?
- What does our privacy policy need to cover for: a waitlist email list, analytics, wallet addresses we may see, and Apple's App Store privacy labels? CCPA/GDPR thresholds?
- Where should the disclaimer live so it counts (every screen, first launch, at swap time)?

## The waitlist emails

- The waitlist was collected before any entity or privacy terms existed. Can those emails be transferred to the new entity and used for launch email, and what notice or consent is needed?
- Is there anything the waitlist page should say now to make future use clean?

## App Store

- Apple reviews finance apps hard. Does the swap, even when routed to an external wallet, change our App Store category or require licences Apple asks for? Should the iOS build stay swap-free?
- The Apple developer account is Individual today. What should be in place before migrating to Organization?

## What the lawyer will need from the owner

- What documents should be brought to the next call: the investor agreement, proof of funds received, domain and hosting accounts, the roadmap, the current Terms and Privacy pages, the waitlist form text?
- What is the engagement scope and rough cost for: entity formation, a securities read on the roadmap, and a trademark clearance — separately?
- Which of these should be done first if the budget only covers one this month?
