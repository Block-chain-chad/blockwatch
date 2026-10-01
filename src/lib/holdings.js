// Holdings: the amounts a person typed in, valued at current prices. Pure:
// data in, figures and sentences out, so the money math is tested here and
// never lives in a component.
//
// Every dollar figure is integer arithmetic on BigInt in units of 1e-18, the
// same precision the database keeps amounts at (numeric(31,18)). Amounts are
// decimal strings from start to finish. Prices arrive from the feeds as
// numbers and are read by their shortest decimal form (181.24, not
// 181.23999...), which is the number the feed sent. Only a percent leaves
// this module as a floating point number, for display.
//
// What counts:
//   - A token is in the estimated value only with a current price: a price,
//     not older than a day (isFresh in lib/gapCheck.js). Otherwise it is left
//     out and the screen says how many were left out.
//   - A token is in the price move only if it is in the value and has a
//     plausible 24 hour change (isPlausiblePct in lib/format.js).
//   - Value = amount x token price, for both issuers. xStocks amounts are
//     what the wallet shows and xStocks prices are per share; Ondo amounts
//     are tokens and Ondo prices are per token.

import { gapCheck, isFresh, sharesPerToken } from './gapCheck'
import { PARITY_BAND } from './prices'
import { formatPct, isPlausiblePct } from './format'
import { closedGapLabelFor } from './sessionCopy'

/** The most different tokens one list may hold (the database enforces it too). */
export const HOLDINGS_LIMIT = 50

/** Issuers whose amounts Onstock can check today (brief section 2). */
const ADDABLE_ISSUERS = new Set(['xStocks', 'Ondo'])

const SCALE = 18
const ONE = 10n ** 18n
const CENT = 10n ** 16n
const HUNDRED = 100n * ONE
const MAX_UNITS = 999_999_999_999n * ONE
const ASSET_ID = /^[a-z0-9._-]{1,120}$/i
const MINUS = '−'
const USD = new Intl.NumberFormat('en-US')

/** Divide, rounding half away from zero. `d` is positive. */
function roundDiv(n, d) {
  const q = n / d
  const r = n % d
  if (2n * (r < 0n ? -r : r) < d) return q
  return n < 0n ? q - 1n : q + 1n
}

function mul(a, b) {
  return roundDiv(a * b, ONE)
}

/** A finite number as a plain decimal string, never in exponent form. */
function plainDecimal(n) {
  if (!Number.isFinite(n)) return null
  const s = String(n)
  const m = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(s)
  if (!m) return s
  const [, sign, whole, frac = '', exp] = m
  const digits = whole + frac
  const point = whole.length + Number(exp)
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

/** A decimal string or a finite number, in units of 1e-18. Null when it is neither. */
export function toUnits(x) {
  const s = typeof x === 'number' ? plainDecimal(x) : typeof x === 'string' ? x : null
  const m = s == null ? null : /^(-?)(\d*)(?:\.(\d*))?$/.exec(s)
  if (!m || (!m[2] && !m[3])) return null
  const [, sign, whole, frac = ''] = m
  let units = BigInt(whole || '0') * ONE + BigInt(frac.slice(0, SCALE).padEnd(SCALE, '0'))
  if (frac.length > SCALE && frac[SCALE] >= '5') units += 1n
  return sign ? -units : units
}

/** Units of 1e-18 back to the shortest decimal string: 12500000000000000000n is '12.5'. */
function unitsToDecimal(units) {
  const a = units < 0n ? -units : units
  const frac = (a % ONE).toString().padStart(SCALE, '0').replace(/0+$/, '')
  return `${units < 0n ? '-' : ''}${a / ONE}${frac ? `.${frac}` : ''}`
}

/**
 * What someone typed in the Amount field, as a clean decimal string ('12.5'),
 * or null when it is not a number greater than zero. Spaces are ignored.
 * Digits and one decimal point only: no commas, signs or exponents. Up to 18
 * decimal places, at most 999,999,999,999.
 */
export function parseAmount(input) {
  const s = String(input ?? '').replace(/\s+/g, '')
  const m = /^(\d*)(?:\.(\d*))?$/.exec(s)
  if (!m || (!m[1] && !m[2]) || (m[2] ?? '').length > SCALE) return null
  const units = toUnits(s)
  return units > 0n && units <= MAX_UNITS ? unitsToDecimal(units) : null
}

/** Can this token be added? Only xStocks with a verified mint and Ondo with a verified ratio. */
export function isAddable(asset) {
  return ADDABLE_ISSUERS.has(asset?.issuer) && sharesPerToken(asset) > 0
}

/**
 * A stored list made safe to use: well-formed entries only, one per token,
 * at most HOLDINGS_LIMIT. Anything else in storage or from the server is
 * dropped rather than trusted.
 */
export function cleanHoldings(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const h of raw) {
    // Strings only: a number has already lost digits past about 15.
    const amount = typeof h?.amount === 'string' ? parseAmount(h.amount) : null
    if (typeof h?.assetId !== 'string' || !ASSET_ID.test(h.assetId) || !amount || seen.has(h.assetId)) continue
    seen.add(h.assetId)
    out.push({ assetId: h.assetId, amount, updatedAt: Number.isFinite(h.updatedAt) ? h.updatedAt : 0 })
    if (out.length === HOLDINGS_LIMIT) break
  }
  return out
}

/**
 * One holding against its merged asset (lib/prices mergeAssets):
 *   state 'priced'    the value counts
 *   state 'no-price'  no price, or one older than a day: left out
 *   state 'loading'   no price yet and the first prices may still be coming
 * value, move and prior are units of 1e-18 dollars, or null.
 */
export function holdingRow(holding, asset, { now = Date.now(), settled = true } = {}) {
  const priced = asset.tokenPrice != null && isFresh(asset.priceUpdatedAt, now)
  const state = priced ? 'priced' : asset.tokenPrice == null && !settled ? 'loading' : 'no-price'
  const value = priced ? mul(toUnits(holding.amount), toUnits(asset.tokenPrice)) : null
  const change = toUnits(asset.dayChange)
  // prior = value / (1 + change / 100): what the same amount was worth 24 hours ago.
  const prior = value != null && isPlausiblePct(asset.dayChange) ? roundDiv(value * HUNDRED, HUNDRED + change) : null
  return {
    assetId: holding.assetId,
    amount: holding.amount,
    asset,
    state,
    value,
    prior,
    move: prior == null ? null : value - prior,
  }
}

function sum(values) {
  return values.reduce((s, v) => s + v, 0n)
}

/** A move as a percent of what it moved from, or null. For display only. */
function movePct(move, prior) {
  return prior > 0n ? Number(roundDiv(move * 100n * ONE, prior)) / 1e18 : null
}

/**
 * The whole screen's numbers. `holdings` is the stored list, `byId` the
 * merged assets by id. Holdings of tokens no longer in the universe are
 * skipped. Rows come back largest estimated value first; rows without a
 * value keep the order they were added in, after the rest. Never sorted by
 * gap.
 */
export function summarize(holdings, byId, { now = Date.now(), settled = true } = {}) {
  const rows = holdings
    .filter((h) => byId[h.assetId])
    .map((h) => holdingRow(h, byId[h.assetId], { now, settled }))
    .sort((a, b) => (a.value == null || b.value == null ? (a.value == null) - (b.value == null) : a.value < b.value ? 1 : a.value > b.value ? -1 : 0))
  const counted = rows.filter((r) => r.value != null)
  const moved = counted.filter((r) => r.move != null)
  const move = moved.length ? sum(moved.map((r) => r.move)) : null
  const priceTimes = counted.map((r) => r.asset.priceUpdatedAt)
  return {
    rows,
    total: rows.length,
    loading: rows.some((r) => r.state === 'loading'),
    counted: counted.length,
    missing: rows.filter((r) => r.state === 'no-price').length,
    moved: moved.length,
    value: counted.length ? sum(counted.map((r) => r.value)) : null,
    move,
    movePct: move == null ? null : movePct(move, sum(moved.map((r) => r.prior))),
    // The oldest price in the value, so "updated" is never flattering.
    pricesAt: priceTimes.length ? Math.min(...priceTimes) : null,
  }
}

/** Dollars from units, to the cent: '$1,812.40', '−$3.20', or '+$12.10' with `sign`. */
export function formatUsd(units, { sign = false } = {}) {
  const cents = roundDiv(units, CENT)
  const a = cents < 0n ? -cents : cents
  const body = `$${USD.format(a / 100n)}.${String(a % 100n).padStart(2, '0')}`
  if (cents < 0n) return `${MINUS}${body}`
  return sign && cents > 0n ? `+${body}` : body
}

/** '+$12.10 (+0.67%)'. */
export function formatMove(move, pct) {
  return pct == null ? formatUsd(move, { sign: true }) : `${formatUsd(move, { sign: true })} (${formatPct(pct)})`
}

/** An amount for a row: grouped whole part, every decimal kept ('1,250.5'). */
export function formatAmount(amount) {
  const [whole, frac] = amount.split('.')
  return `${USD.format(BigInt(whole))}${frac ? `.${frac}` : ''}`
}

/**
 * The lines under the estimated value when something is left out, in order.
 * Empty when everything counts.
 */
export function coverageLines(summary) {
  const lines = []
  if (summary.missing > 0) {
    const n = summary.missing
    lines.push(`Covers ${summary.counted} of ${summary.total} holdings. ${n} ${n === 1 ? 'has' : 'have'} no current price.`)
  }
  if (summary.counted > 0 && summary.moved < summary.counted) {
    lines.push(`Price move covers ${summary.moved} of ${summary.counted} holdings.`)
  }
  return lines
}

/**
 * The dollar gap for one holding, in units: amount x (token price - shares
 * per token x share price). Null unless the gap itself is confirmed (status
 * 'ok' in lib/gapCheck.js). `pct` is the gap in percent.
 */
export function dollarGap(amount, asset, now = Date.now()) {
  const check = gapCheck(asset, now)
  if (check.status !== 'ok') return null
  const perToken = toUnits(asset.tokenPrice) - mul(toUnits(asset.sharesPerToken), toUnits(asset.stockPrice))
  return { units: mul(toUnits(amount), perToken), pct: check.gap }
}

/**
 * The row sheet's one sentence about the gap in dollars, or null when the
 * gap is not confirmed. Wording approved by compliance (team/compliance/
 * 7-holdings.md item 4); `closed` is closedGapLabel's result while the share
 * leg is a close.
 */
export function dollarGapSentence(amount, asset, { now = Date.now(), closed = closedGapLabelFor(asset, now) } = {}) {
  const gap = dollarGap(amount, asset, now)
  if (!gap) return null
  const cents = roundDiv(gap.units, CENT)
  if (Math.abs(gap.pct) < PARITY_BAND || cents === 0n) {
    return 'At the latest prices, these tokens are valued about the same as the shares they track.'
  }
  const about = `about ${formatUsd(cents < 0n ? -gap.units : gap.units)} ${cents > 0n ? 'more' : 'less'} than the shares they track`
  return closed
    ? `At the latest token price, these tokens are valued ${about} at ${closed.close}.`
    : `At the latest prices, these tokens are valued ${about}.`
}

/**
 * First sign-in with holdings on the device. The account's amount wins for a
 * token in both (`skipped` counts those); `left` is what did not fit under
 * the limit and stays on the device.
 */
export function mergeGuest(account, guest) {
  const held = new Set(account.map((h) => h.assetId))
  const merged = [...account]
  const left = []
  let skipped = 0
  for (const h of guest) {
    if (held.has(h.assetId)) skipped++
    else if (merged.length < HOLDINGS_LIMIT) {
      merged.push(h)
      held.add(h.assetId)
    } else left.push(h)
  }
  return { merged, skipped, left }
}

/** The first sign-in question. */
export function importQuestion(count) {
  return `Add the ${count} ${count === 1 ? 'holding' : 'holdings'} on this device to your account? They'll sync to your other devices. You can remove them at any time.`
}

/** Said once after a merge that kept the account's amount, or null. */
export function skippedNotice(skipped) {
  if (skipped < 1) return null
  return skipped === 1
    ? "1 holding was already in your account, so we kept the account's amount."
    : `${skipped} holdings were already in your account, so we kept the account's amounts.`
}

/** The add sheet's answer for a token already on the list. */
export function alreadyHeld(ticker) {
  return `${ticker} is already in your Holdings. Change its amount instead.`
}
