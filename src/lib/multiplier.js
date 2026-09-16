// The issuer's share-per-token ratio, and the unit conversions that depend on it.
//
// WHY THIS EXISTS
//
// Every xStocks mint carries a Token-2022 `scaledUiAmountConfig` extension.
// The issuer moves its multiplier when the underlying pays a dividend or
// splits, so that "token balances always represent the correct amount of
// underlying equity" (docs.xstocks.fi). On 2026-09-16, 66 of the 103 pinned
// mints were not 1.0: NFLXx and PPLTx at 10, PALLx at 5, CRWDx at 4, TQQQx at
// 2.0090, AZNx at 0.5111, and thirty more between 1% and 9% from dividend
// accrual.
//
// THE TWO UNITS, AND WHICH ONE EACH SOURCE SPEAKS
//
//   raw      the integer on chain. Token accounts, Jupiter quote amounts and
//            DEX pool reserves are all raw. A transaction is sized in raw.
//   base     raw / 10^decimals. An intermediate, never shown to anyone.
//   UI       base * multiplier. What Phantom shows, and what the issuer means
//            by "one token is one share". Price APIs quote per UI token.
//
// So: uiAmount = raw / 10^decimals * multiplier, which is Token-2022's own
// definition. Measured against mainnet on 2026-09-16 to be sure, rather than
// taken from the spec: for NFLXx (multiplier 10) a DEX pool priced one BASE
// token at ~757 USD while the real NFLX share was 76.41 and CoinGecko quoted
// 76.98. One base token is worth ten shares; one UI token is worth one share.
//
// WHICH DIRECTION COSTS MONEY
//
// A user reads their balance off Phantom, which is UI. Sizing a sell with
// that number as if it were base oversells by the multiplier — 10x on NFLXx.
// That is why uiToRaw refuses rather than guesses: a multiplier we cannot
// parse must stop the trade, not default to 1.
//
// Assets with no pin (Ondo, bStocks, and anything else) are 1.0 BY DESIGN,
// not by failure. Ondo's tokens are Ethereum ERC-20s, which have no Token-2022
// extension at all; bStocks' ratio mechanism could not be determined from
// public sources, and universe.json carries no mint address for either, so
// there is nothing to read. If either issuer turns out to use a ratio, it
// needs its own pin here and the default below stops applying to it.

// WHAT THE PIN DOES NOT KNOW
//
// data/verifiedMints.json records the ratio as the chain had it when
// scripts/verify-mints.mjs last ran, including any change the issuer had
// ALREADY scheduled by then. It cannot know one scheduled afterwards, and the
// issuer schedules them continuously: within half an hour of the pin taken on
// 2026-09-16, CRMx had a new value effective the next morning that the file
// does not contain. For an accruing mint a stale ratio always errs toward
// overselling, so the sell path reads the live value from Jupiter and treats
// the pin as the fallback. See reconcileRatio.

/** The ratio for anything the issuer has not told us otherwise about. */
export const DEFAULT_MULTIPLIER = '1'

/** Re-pin after this long and the staleness test fails. Dividend multipliers
 *  move on a schedule, so a pin that has gone unrefreshed is a stale ratio. */
export const MAX_PIN_AGE_DAYS = 14

const DECIMAL = /^\d+(?:\.\d+)?$/

/**
 * A positive decimal string as an exact fraction: "1.05" -> 105/100.
 * Returns null for anything unparseable or non-positive, so every caller has
 * to decide what to do about it rather than inheriting a silent 1.
 */
export function toRational(decimal) {
  const s = String(decimal ?? '').trim()
  if (!DECIMAL.test(s)) return null
  const [intPart, fracPart = ''] = s.split('.')
  const num = BigInt(intPart + fracPart)
  if (num <= 0n) return null
  return { num, den: 10n ** BigInt(fracPart.length) }
}

/**
 * The multiplier in force at `now`, as a decimal string.
 *
 * Token-2022's own rule: the scheduled value takes over the moment its
 * effective timestamp passes. Both values are pinned, so the client stays
 * right between verification runs instead of waiting for the next one — and
 * a scheduled change that lands tomorrow needs no redeploy.
 */
export function effectiveMultiplier(pinned, now = Date.now()) {
  if (!pinned) return DEFAULT_MULTIPLIER
  const at = pinned.nextMultiplierAt ? Date.parse(pinned.nextMultiplierAt) : null
  if (pinned.nextMultiplier && Number.isFinite(at) && now >= at) return pinned.nextMultiplier
  return pinned.multiplier ?? DEFAULT_MULTIPLIER
}

/**
 * A multiplier change the issuer has scheduled but that has not taken effect
 * yet: { multiplier, at } or null. None were pending on 2026-09-16, but they
 * are how every dividend arrives, so the surfaces that quote a ratio can say
 * one is coming instead of changing under the reader.
 */
export function pendingMultiplier(pinned, now = Date.now()) {
  if (!pinned?.nextMultiplier || !pinned.nextMultiplierAt) return null
  const at = Date.parse(pinned.nextMultiplierAt)
  if (!Number.isFinite(at) || now >= at) return null
  if (pinned.nextMultiplier === pinned.multiplier) return null
  return { multiplier: pinned.nextMultiplier, at: pinned.nextMultiplierAt }
}

/**
 * How far ABOVE the pin a live ratio may sit before it needs to show its
 * working, as a fraction of the pin: the band inside which an upward
 * difference needs no provenance.
 *
 * Accruals ratchet by well under a percent in a typical step — CRMx moved
 * 0.1229% — but the largest single step in the pinned history is OPENx at
 * 2.0816%, so a tighter band would refuse a legitimate dividend. Five percent
 * clears every accrual on record with room, and sits far below the smallest
 * split (CRWDx, 4x).
 *
 * Past this band an upward value is not rejected outright: it can still be
 * accepted by proving it is a post-pin update. See reconcileRatio.
 */
export const RATIO_RISE_CEILING = '1.05'

/**
 * How far below the pin a ratio may sit before it needs a fresh verification,
 * as a fraction of the pin. Two percent.
 *
 * The asymmetry is not fussiness, it is what the instrument does. Splits and
 * dividend accrual only ever move a ratio UP, and those are the changes that
 * arrive constantly. A ratio moving DOWN means a reverse split or something
 * rarer still, and the cost of being wrong is not symmetric either: a ratio
 * read too high undersells, a ratio read too low OVERSELLS in proportion, so
 * a fabricated 0.0001 sells ten thousand times what was typed. A rare event
 * should cost a re-run of scripts/verify-mints.mjs, not an unverified sell.
 */
export const RATIO_DROP_FLOOR = '0.98'

/**
 * The most a proven update may multiply the pinned ratio by.
 *
 * Defence in depth on the hatch. provablyAfterPin establishes that a config
 * FOLLOWS the pin, not that its value is sane, and the largest real split in
 * the pinned history is 10x (NFLXx, PPLTx). Twenty leaves room for something
 * bigger than anything Backed has done while still refusing the absurd, so a
 * feed reporting a ratio of 1000 is turned away before anyone has to reason
 * about which side of the trade it would corrupt.
 */
export const MAX_PROVEN_RISE = '20'

/** Two ratios equal as fractions, so "1" and "1.0" are the same number. */
function sameRatio(a, b) {
  return a != null && b != null && a.num * b.den === b.num * a.den
}

/**
 * Whether `live` is at least `bound` times `pin`, in exact integer math.
 *
 *   live/pin >= bound.num/bound.den
 *     <=> live.num * pin.den * bound.den >= bound.num * live.den * pin.num
 */
function notBelow(live, pin, bound) {
  return live.num * pin.den * bound.den >= bound.num * live.den * pin.num
}

/**
 * The mirror: whether `live` is at most `bound` times `pin`.
 *
 * Both bounds are integer comparisons rather than float arithmetic, because a
 * float lands on the wrong side of its own boundary: 1.05 / 1 - 1 evaluates to
 * 0.050000000000000044, so a ratio exactly at the band was being refused.
 * These decide whether a sell is sized at all.
 */
function notAbove(live, pin, bound) {
  return live.num * pin.den * bound.den <= bound.num * live.den * pin.num
}

/**
 * Whether `live` is provably the pin's own ratio moved forward, rather than an
 * unrelated or fabricated one.
 *
 * Token-2022's update path rolls the previously effective value into
 * `multiplier` before writing a new schedule. So a genuine post-pin update
 * carries a standing value the pin ALREADY knew, plus a schedule dated after
 * the pin was taken. CRMx is exactly this shape: its live standing value is
 * the pin's own nextMultiplier, and its schedule is stamped half an hour after
 * verification ran.
 *
 * All three conditions have to hold. A feed inventing a ratio cannot satisfy
 * the first without knowing what we pinned, and a stale config from some other
 * mint cannot satisfy the third.
 */
function provablyAfterPin(pinned, live, verifiedAt) {
  const from = toRational(live?.multiplier)
  if (from == null) return false
  // (a) the value it moved FROM is one the pin recorded.
  if (
    !sameRatio(from, toRational(pinned.multiplier)) &&
    !sameRatio(from, toRational(pinned.nextMultiplier))
  ) {
    return false
  }
  // (b) it carries a real schedule.
  if (toRational(live.nextMultiplier) == null) return false
  const at = Date.parse(live.nextMultiplierAt ?? '')
  if (!Number.isFinite(at)) return false
  // (c) scheduled after we last looked, which is what makes it news.
  const pinnedAt = Date.parse(verifiedAt ?? '')
  return Number.isFinite(pinnedAt) && at > pinnedAt
}

/**
 * The ratio to size a trade with, given the pin and whatever the live feed
 * says: a decimal string, or null meaning "refuse, we do not know".
 *
 * The pin is issuer-verified but only knows changes scheduled before it was
 * taken. The live read is current but comes from a price API. So:
 *
 *   no live read        -> the pin. It is verified, and a feed being down is
 *                          not a reason to distrust it.
 *   live within drift   -> the live value, which is the fresher of two
 *                          answers that say the same thing.
 *   live far off, but
 *   provably the pin
 *   moved forward       -> the live value. This is the case the live read
 *                          exists for. A split is a large jump BY DEFINITION
 *                          — NFLXx went 1 to 10 — so a rule that refused
 *                          every large jump would refuse exactly the event
 *                          most worth catching, and would do it by taking
 *                          that name's sell path offline until someone
 *                          re-pinned it by hand. See provablyAfterPin.
 *   anything else       -> null. A large jump with no provenance is a feed
 *                          saying something we cannot tie back to the issuer,
 *                          and sizing a sell on it is how a holder sells ten
 *                          times what they meant to.
 *
 * `verifiedAt` is when the pin was taken (data/verifiedMints' checkedAt). It
 * is passed in rather than imported so this module stays pure.
 *
 * `allowProvenUpdate` opts IN to that third case, and defaults to OFF.
 *
 * It is a caller's decision because the cost of a too-high ratio depends on
 * what the number is being used for, and only the caller knows. Sizing an
 * INPUT — a sell — divides by the ratio, so too high merely undersells, and
 * the alternative is a name whose sell path is dead until someone re-pins by
 * hand. Stating an OUTPUT — what a buy receives — multiplies by it, so too
 * high overstates what the user is about to sign for, without the transaction
 * being wrong in any way a check could catch. A proven ratio of 1000 against
 * a pin of 1 printed "You receive 400 TSLAx" for a quote delivering 0.4, with
 * the sheet's own copy calling the minimum a failure floor.
 *
 * So the hatch is available where it prevents a loss and closed where it would
 * only mislead, and the default is the safe one.
 *
 * With no pin it defers to ratioFor, which draws the line between "the issuer
 * never scaled this" and "we have not checked this one" — an unpinned Solana
 * mint refuses here exactly as it does everywhere else.
 */
export function reconcileRatio(
  pinned,
  live,
  { mint, now = Date.now(), verifiedAt, allowProvenUpdate = false } = {}
) {
  if (!pinned) return ratioFor(null, mint, now)
  const pin = effectiveMultiplier(pinned, now)
  const a = toRational(pin)
  if (!live) return a ? pin : null
  // A live payload that is truthy but carries no readable multiplier is not an
  // answer. Read it explicitly rather than letting effectiveMultiplier's
  // default turn `{}` or `true` into 1.0 — which, against a pin near 1.0,
  // sits inside the drift band and would size a real sell on a ratio nobody
  // ever reported.
  if (toRational(live.multiplier) == null) return null
  const b = toRational(effectiveMultiplier(live, now))
  if (a == null || b == null) return null
  const fresh = effectiveMultiplier(live, now)

  // BELOW the pin: refuse past the floor, whatever the provenance says.
  //
  // Provenance establishes that a config FOLLOWS the pin. It says nothing
  // about its value, and the value is what sizes the trade. 48 of the 103
  // pins sit at exactly 1, so a feed reporting the true standing value clears
  // the first provenance condition for free — leaving a nextMultiplier field
  // and a post-pin date as the only guard. Downward that is a multiplier on
  // the amount sold, since raw size is the typed amount DIVIDED by the ratio:
  // 0.1 against a pin of 1 sells ten times what was typed, 0.0001 sells ten
  // thousand times.
  //
  // The drift band does not help here either. Its five percent was bought by
  // OPENx's upward accrual step and nothing downward ever needed it; applied
  // symmetrically it accepted a live 0.951 against a pin of 1 with no
  // provenance at all, which sells 105.15 when 100 is typed.
  if (!notBelow(b, a, toRational(RATIO_DROP_FLOOR))) return null

  // AT OR ABOVE the pin: inside the band it needs no provenance.
  if (notAbove(b, a, toRational(RATIO_RISE_CEILING))) return fresh

  // Past the band it must prove it followed the pin, the caller must have
  // asked for that to be enough, and it must still be a believable size.
  if (!allowProvenUpdate) return null
  if (!notAbove(b, a, toRational(MAX_PROVEN_RISE))) return null
  return provablyAfterPin(pinned, live, verifiedAt) ? fresh : null
}

/**
 * The ratio to price an asset's on-chain data with: a decimal string, or null
 * meaning "we do not know, show nothing".
 *
 * The distinction this draws is between two very different silences.
 *
 * An asset with NO mint has no Token-2022 extension to carry a ratio — Ondo's
 * tokens are Ethereum ERC-20s, bStocks' mechanism is undetermined, and neither
 * appears in universe.json with an address. For those, 1.0 is a fact about the
 * issuer, and it is safe.
 *
 * An asset WITH a mint but no pin is a different animal: it is a Solana token
 * we have not verified, because verification rejected it or because a universe
 * rebuild added it before verify-mints last ran. Defaulting that to 1.0 is a
 * guess, and on a mint like NFLXx the guess draws candles at 757 under a $76
 * share. So it refuses, the same way the swap path refuses an unpinned mint.
 */
export function ratioFor(pinned, mint, now = Date.now()) {
  if (pinned) return effectiveMultiplier(pinned, now)
  return mint ? null : DEFAULT_MULTIPLIER
}

/** Whether a multiplier is exactly one, and so changes nothing on screen. */
export function isUnity(multiplier) {
  const r = toRational(multiplier)
  return r != null && r.num === r.den
}

/**
 * Raw on-chain units -> the raw-equivalent integer a wallet would display,
 * i.e. `raw * multiplier`, as a string. Feed the result to formatRaw with the
 * mint's decimals and the number on screen is the number in Phantom.
 *
 * Truncates, so a displayed amount is never more than the chain will deliver.
 * Returns null on a bad multiplier or a non-integer raw amount: the caller
 * shows a dash, never a number in the wrong unit.
 */
export function rawToUi(raw, multiplier) {
  const r = toRational(multiplier)
  const s = String(raw ?? '').trim()
  if (r == null || !/^\d+$/.test(s)) return null
  return ((BigInt(s) * r.num) / r.den).toString()
}

/**
 * The inverse: an amount the user read off their wallet -> the raw units a
 * transaction must carry, i.e. `uiRaw / multiplier`.
 *
 * `uiRaw` is the typed amount already scaled by the mint's decimals (toRaw's
 * output), so this stays integer end to end — no float ever touches a size.
 * Truncates, which sells marginally less than asked rather than more.
 *
 * Returns null rather than falling back to 1. Sizing a sell in the wrong unit
 * is the bug this module exists to kill, so an unreadable multiplier has to
 * stop the trade.
 */
export function uiToRaw(uiRaw, multiplier) {
  const r = toRational(multiplier)
  const s = String(uiRaw ?? '').trim()
  if (r == null || !/^\d+$/.test(s)) return null
  return ((BigInt(s) * r.den) / r.num).toString()
}

/**
 * A price quoted per BASE token -> a price per share (per UI token).
 *
 * For DEX and pool data only — GeckoTerminal candles and Jupiter quote
 * arithmetic are per base token, while CoinGecko and the share feed are per
 * share. Float division is deliberate here: these are chart pixels and
 * display prices, not amounts being moved, and the candle arrives as a float
 * already. Nothing that sizes a transaction may use this.
 */
export function perShare(basePrice, multiplier) {
  const r = toRational(multiplier)
  if (r == null || !Number.isFinite(basePrice)) return null
  return basePrice / (Number(r.num) / Number(r.den))
}

/**
 * A candle series priced per BASE token -> priced per share.
 *
 * GeckoTerminal serves pool OHLCV, and a pool trades base tokens, so for
 * NFLXx it reports around 757 while the share and the app's own readout say
 * 76. Drawing that beside a 76 price line is two different units on one
 * screen, and the premium a reader infers from it is nine hundred percent of
 * nothing.
 *
 * Volume is deliberately untouched: GeckoTerminal's is volume_usd, already in
 * dollars, and dollars do not change when the unit of the thing being counted
 * does.
 *
 * Returns null on a ratio it cannot read, so the caller draws nothing rather
 * than a chart in the wrong unit.
 */
export function candlesPerShare(candles, multiplier) {
  if (!Array.isArray(candles)) return null
  if (isUnity(multiplier)) return candles
  const r = toRational(multiplier)
  if (r == null) return null
  const m = Number(r.num) / Number(r.den)
  return candles.map((c) => ({
    ...c,
    open: c.open / m,
    high: c.high / m,
    low: c.low / m,
    close: c.close / m,
  }))
}

const MONTHS = Object.freeze([
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
])

/**
 * "16 Nov 2025", in Coordinated Universal Time.
 *
 * Spelled out rather than handed to toLocaleDateString, which abbreviates
 * September as "Sept" or "Sep" depending on the platform's ICU data. This
 * string is a disclosure about a security, so it reads the same on every
 * device and the test that pins it means something.
 */
function utcDate(ms) {
  const d = new Date(ms)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/**
 * The one line an asset screen shows when the ratio is not 1:1, or null when
 * it is 1.0 and there is nothing to say.
 *
 *   "1 token = 10 shares since a split on 16 Nov 2025"
 *   "1 token = 1.0877 shares since a dividend on 1 Jul 2026"
 *
 * Whole-number ratios are called splits and fractional ones dividends, which
 * is what produces them: a split multiplies the share count, a dividend
 * accrues into the ratio. Never says which way the gap moves, and never
 * advises — it states the issuer's own fact and the date it changed.
 */
export function multiplierLine(pinned, { underlying, now = Date.now() } = {}) {
  const r = toRational(effectiveMultiplier(pinned, now))
  if (r == null || r.num === r.den) return null

  // Floor, never round. Everything else in this module truncates, and toFixed
  // rounded UP — printing 1.0226 for a ratio of 1.02256, which overstates what
  // a token tracks. Four places unless flooring would land on exactly "1",
  // which would be a parity claim about a ratio that is not parity; then show
  // whatever it takes to say something true.
  let shares = floorTo(r, 4)
  for (let places = 5; shares === '1' && places <= 12; places += 1) shares = floorTo(r, places)
  if (shares === '1') return null

  // NO CAUSE. The previous version inferred one from the number's shape —
  // whole means a split, fractional means a dividend, below one means a
  // reverse split — and it was already wrong on this repo's own data: TQQQx
  // sits at 2.008976 and rendered "since a dividend", while the issuer's own
  // documentation shows a 4-for-1 split moving a ratio from 1.008 to 4.032,
  // which is fractional. Sub-one ratios have several causes too, spin-offs and
  // demergers among them. We do not have the corporate action, so we do not
  // name one.
  //
  // "tracks the value of", not "=". An equivalence is a claim about what the
  // holder owns, and Backed's own legal overview denies it.
  const ticker = underlying ? `${underlying} ` : ''
  const line = `Issuer ratio: 1 token tracks the value of ${shares} ${ticker}shares.`

  // The DATE is the on-chain activation time, which is when Backed changed the
  // ratio — not when the corporate action happened. It is usually 00:30 UTC
  // the day after the ex-date, so calling it the event's date would be wrong.
  const at = pinned?.nextMultiplierAt ? Date.parse(pinned.nextMultiplierAt) : null
  if (!Number.isFinite(at) || now < at) return line
  return `${line} Backed last changed this ratio on ${utcDate(at)}.`
}

/** A ratio floored to `places` decimals, as a trimmed decimal string. */
function floorTo(r, places) {
  const scaled = (r.num * 10n ** BigInt(places)) / r.den
  const digits = scaled.toString().padStart(places + 1, '0')
  const intPart = digits.slice(0, digits.length - places)
  const fracPart = digits.slice(digits.length - places).replace(/0+$/, '')
  return fracPart ? `${intPart}.${fracPart}` : intPart
}

