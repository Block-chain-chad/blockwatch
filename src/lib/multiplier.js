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
