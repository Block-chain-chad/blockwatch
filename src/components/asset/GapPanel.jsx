import { timeAgo, EM_DASH } from '../../lib/format'
import { isThinlyTraded, premiumPct } from '../../lib/prices'
import { gapCheck, GAP_STATUS_LABEL } from '../../lib/gapCheck'
import { ONDO_VERIFIED_AT } from '../../data/verifiedOndo'
import { formatPrice, formatPct, GapBar, changeColor } from '../shared'
import { shareFreshness } from '../../lib/provenance'
import { multiplierLine } from '../../lib/multiplier'
import { verifiedToken } from '../../data/verifiedMints'
import { useFlag, RATIO_LINE_FLAG } from '../../services/featureFlags'
import PriceText from '../PriceText'

/*
  The gap leads. It used to be a small pill in the corner while the
  token price took the 3xl slot — but the token price alone is a fact
  any tracker has. The distance between the two legs is the only number
  this app computes, so it gets the display step, stated as a
  percentage AND in money (a percentage is abstract; $0.78 is not).

  Bordered, not filled: the two legs sit inside without becoming a card
  within a card.

  `scrub` is the chart's finger position (null = live): while scrubbing,
  the token leg shows the price under the finger and the gap money line
  follows it.

  The share leg carries a freshness badge whenever its quote is not a
  live print — delayed, a close, or undated. Both the badge and the age
  under it come from lib/provenance's one verdict, computed from THIS
  quote's own timestamp, so the panel can never call a stale price live.
*/
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
/** "Sep 26, 2026" (the pin's UTC date), or "an unknown date". */
function formatDay(iso) {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? dayFmt.format(t) : 'an unknown date'
}

export default function GapPanel({ asset, scrub, session, lastFetchAt }) {
  const gap = premiumPct(asset)
  const check = gapCheck(asset)
  const statusLabel = GAP_STATUS_LABEL[check.status] ?? null
  // Money difference in share units: a token that tracks ten shares is not
  // "$640 above the share". The scrubbed chart price is already per share.
  const tokenNow = scrub?.price ?? check.tokenPerShare
  const diff =
    check.status === 'ok' && tokenNow != null && asset.stockPrice != null
      ? tokenNow - asset.stockPrice
      : null
  const thin = isThinlyTraded(asset)
  const splitUnits = asset.sharesPerToken > 0 && asset.sharesPerToken !== 1
  const perShareNote = !splitUnits
    ? null
    : scrub
      ? 'per share tracked'
      : check.tokenPerShare != null
        ? `${formatPrice(check.tokenPerShare)} per share tracked`
        : null
  // Where the ratio came from, for Ondo: the issuer's own oracle, and when
  // it was read (data/verifiedOndo.json).
  const ratioSource =
    asset.issuer === 'Ondo' && asset.sharesPerToken > 0
      ? `Ratio from Ondo's on-chain oracle, read ${formatDay(ONDO_VERIFIED_AT)}`
      : null

  // Per-leg freshness. The two sides of this comparison have different
  // ages: the token trades continuously while the share can be hours
  // stale and shut. One global "updated 5m ago" would hide exactly the
  // caveat that makes the gap readable.
  //
  // The token leg's age is the feed's fetch time, which is the best we
  // have — neither CoinGecko nor Jupiter stamps a print. The share leg's
  // is never the fetch time: the quote carries its own.
  const tokenAge = lastFetchAt ? timeAgo(lastFetchAt) : EM_DASH
  const share = shareFreshness({ quote: asset.stockQuote, session })

  // The issuer's share-per-token ratio, in words, or null at 1:1. A pending
  // change is deliberately NOT shown: it is the issuer's routine dividend
  // accrual, it moves the ratio by a fraction of a percent, and announcing a
  // date beside a trade affordance reads as a reason to act before it. The
  // line switches to the new ratio by itself the moment it takes effect.
  //
  // GATED, and NOT because it is swap functionality — this panel renders for
  // every visitor on the asset screen and the desktop readout. The sentence
  // describes what a tokenized security represents, and the Compliance
  // Reviewer has asked that a lawyer rule on the noun before it ships.
  //
  // Its own flag, not the swap's. Borrowing the swap flag meant enabling the
  // swap would have shipped this sentence with it, and the two decisions are
  // not the same decision or the same reviewer. Ships OFF and fails closed.
  const ratioAllowed = useFlag(RATIO_LINE_FLAG)
  const ratioLine = ratioAllowed
    ? multiplierLine(verifiedToken(asset), { underlying: asset.underlying })
    : null

  return (
    <div
      className="mt-4 rounded-lg border"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="px-4 pt-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-micro text-zinc-500">
            {asset.underlying ? `Gap vs ${asset.underlying}` : 'NAV-based'}
          </span>
          {diff != null && (
            <span className="t-caption text-right text-zinc-500">
              {formatPrice(Math.abs(diff))}{' '}
              {diff >= 0 ? 'above the share' : 'below the share'}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          {statusLabel ? (
            <span className="t-title text-zinc-500">{statusLabel}</span>
          ) : (
            <span
              className={`num t-display ${thin ? 'text-zinc-500' : changeColor(gap)}`}
            >
              {gap != null ? formatPct(gap) : EM_DASH}
            </span>
          )}
          {/* Capped, not full-bleed. Stretched across the panel the
              track read as a progress meter — a long empty left half
              looks unfilled rather than "below zero". At row width it
              reads as what it is: a deviation from centre. */}
          <GapBar pct={gap} thin={thin} width={120} />
        </div>
      </div>

      <div
        className="mt-3.5 grid grid-cols-2 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="px-4 py-3">
          <div className="t-caption text-zinc-500">{asset.ticker} token</div>
          <div className="num t-title mt-0.5 text-zinc-100">
            {scrub ? formatPrice(scrub.price) : <PriceText value={asset.tokenPrice} />}
          </div>
          {/* A token that does not track exactly one share (every Ondo token
              once dividends are reinvested, and NFLXon at 10) is compared in
              share units, so the unit is stated. The chart line under a
              finger is already per share. */}
          {perShareNote && <div className="num t-caption mt-0.5 text-zinc-400">{perShareNote}</div>}
          {ratioSource && <div className="t-caption mt-0.5 text-zinc-500">{ratioSource}</div>}
          <div className="t-caption mt-0.5 text-zinc-500">{tokenAge}</div>
        </div>
        {asset.underlying && (
          <div
            className="border-l px-4 py-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="t-caption text-zinc-500">{asset.underlying} share</div>
            <div className="num t-title mt-0.5 text-zinc-100">
              {asset.stockPrice != null ? formatPrice(asset.stockPrice) : EM_DASH}
              {share.badge && (
                <span
                  className={`ml-1.5 inline-block rounded px-1 align-middle text-[9px] font-semibold uppercase leading-[14px] tracking-wide ${
                    share.badge.tone === 'warn'
                      ? 'bg-amber-400/15 text-amber-400'
                      : 'bg-zinc-700/40 text-zinc-400'
                  }`}
                  title={share.title}
                >
                  {share.badge.text}
                </span>
              )}
            </div>
            <div className="t-caption mt-0.5 text-zinc-500" title={share.title}>
              {share.words}
            </div>
          </div>
        )}
      </div>

      {/* The issuer's ratio, but only when it is not 1:1 and so actually
          changes what the two legs above are comparing. "Issuer ratio: 1 token
          tracks the value of 10 NFLX shares." is what makes them comparable;
          without it a reader who knows NFLX split has no way to tell whether
          this screen knows. Silent for the 37 mints still at 1.0, where there
          is nothing to say. Wording is compliance-reviewed: see
          lib/multiplier.js's multiplierLine before changing a word of it. */}
      {ratioLine && (
        <div
          className="border-t px-4 py-2.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p className="t-caption text-zinc-500">{ratioLine}</p>
        </div>
      )}
    </div>
  )
}
