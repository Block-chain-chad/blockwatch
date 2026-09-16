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
 * How far a live ratio may sit from the pinned one before we stop guessing.
 *
 * Accruing mints ratchet by a fraction of a percent per step — CRMx moved
 * 0.1229% in one — so honest drift between two verification runs is small.
 * Anything past this is not drift: it is a split the pin has not seen, or a
 * feed saying something the issuer did not. Both mean we do not know the
 * ratio, and not knowing has to stop a sell rather than pick a side.
 */
export const MAX_RATIO_DRIFT = 0.02

/**
 * The ratio to size a trade with, given the pin and whatever the live feed
 * says: a decimal string, or null meaning "refuse, we do not know".
 *
 * The pin is issuer-verified but only knows changes scheduled before it was
 * taken. The live read is current but comes from a price API. So:
 *
 *   no live read        -> the pin. It is verified, and a feed being down is
 *                          not a reason to distrust it.
 *   live agrees         -> the live value, which is the fresher of two
 *                          answers that say the same thing.
 *   live disagrees      -> null. A 10x gap here is a split the pin missed, in
 *                          which case sizing on the pin oversells tenfold; or
 *                          a feed that is wrong, in which case sizing on it
 *                          does the same. Refusing costs a trade. Guessing
 *                          costs the trade AND the money.
 *
 * `pinned` may be null for an asset the issuer never scaled, in which case
 * there is nothing to reconcile and 1 stands.
 */
export function reconcileRatio(pinned, live, now = Date.now()) {
  if (!pinned) return DEFAULT_MULTIPLIER
  const pin = effectiveMultiplier(pinned, now)
  if (!live) return toRational(pin) ? pin : null
  const fresh = effectiveMultiplier(live, now)
  const a = toRational(pin)
  const b = toRational(fresh)
  if (a == null || b == null) return null
  const drift = Math.abs(Number(b.num) / Number(b.den) / (Number(a.num) / Number(a.den)) - 1)
  return drift <= MAX_RATIO_DRIFT ? fresh : null
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
export function multiplierLine(pinned, now = Date.now()) {
  const m = effectiveMultiplier(pinned, now)
  const r = toRational(m)
  if (r == null || r.num === r.den) return null
  const ratio = Number(r.num) / Number(r.den)
  const whole = r.num % r.den === 0n
  const shares = whole ? String(ratio) : ratio.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  const cause = whole || ratio < 1 ? 'a split' : 'a dividend'
  const at = pinned?.nextMultiplierAt ? Date.parse(pinned.nextMultiplierAt) : null
  const when = Number.isFinite(at) && now >= at ? ` since ${cause} on ${utcDate(at)}` : ''
  return `1 token = ${shares} ${shares === '1' ? 'share' : 'shares'}${when}`
}
