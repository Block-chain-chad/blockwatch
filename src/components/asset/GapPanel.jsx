import { timeAgo, EM_DASH } from '../../lib/format'
import { isThinlyTraded, premiumPct } from '../../lib/prices'
import { formatPrice, formatPct, GapBar, changeColor } from '../shared'
import { delayTooltip } from '../../lib/provenance'
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

  `delayed` (desktop only; the phone screen omits it) puts the legend's
  yellow D beside the share price while the quote is not live (spec A23).
*/
export default function GapPanel({
  asset,
  scrub,
  session,
  marketOpen,
  lastFetchAt,
  delayed = false,
}) {
  const gap = premiumPct(asset)
  const tokenNow = scrub?.price ?? asset.tokenPrice
  const diff =
    tokenNow != null && asset.stockPrice != null ? tokenNow - asset.stockPrice : null
  const thin = isThinlyTraded(asset)

  // Per-leg freshness. The two sides of this comparison have different
  // ages: the token trades continuously while the share can be hours
  // stale and shut. One global "updated 5m ago" would hide exactly the
  // caveat that makes the gap readable.
  const tokenAge = lastFetchAt ? timeAgo(lastFetchAt) : '—'
  // In pre/post the share is trading and this quote is not following
  // it, so "at last close" alone would understate how stale it is.
  const STALE_LABEL = {
    pre: 'at last close · pre-market',
    post: 'at 4pm close · after hours',
    closed: 'at last close',
  }
  const stockAge = !asset.underlying
    ? null
    : marketOpen
      ? lastFetchAt
        ? `${timeAgo(lastFetchAt)} · live`
        : '—'
      : (STALE_LABEL[session] ?? 'at last close')

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
          <span
            className={`num t-display ${thin ? 'text-zinc-500' : changeColor(gap)}`}
          >
            {gap != null ? formatPct(gap) : EM_DASH}
          </span>
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
              {delayed && (
                <span
                  className="ml-1.5 align-middle text-[10px] font-bold leading-none text-amber-400"
                  title={delayTooltip()}
                >
                  D
                </span>
              )}
            </div>
            <div className="t-caption mt-0.5 text-zinc-500">{stockAge}</div>
          </div>
        )}
      </div>
    </div>
  )
}
