// src/components/desktop/GapHeader.jsx
import { track } from '../../services/analytics'
import { useNow } from '../../hooks/useNow'
import { premiumPct, isThinlyTraded } from '../../lib/prices'
import { gapCheck, GAP_STATUS_LABEL } from '../../lib/gapCheck'
import { formatPct, formatPrice, EM_DASH } from '../../lib/format'
import { tokenLegLine, shareLegLine } from '../../lib/provenance'
import { STOCK_QUOTE_SOURCE } from '../../services/stocks'
import { verifiedToken } from '../../data/verifiedMints'
import { useFlag, LINK_OUT_FLAG, TRADE_PAUSED_SHORT } from '../../services/featureFlags'
import { GapBar } from '../shared'
import ClosedGapMark from '../ClosedGapMark'
import { closedGapLabelFor } from '../../lib/sessionCopy'
import { ChevronLeft, StarIcon, BellIcon, PlusIcon, ShareIcon } from '../Icons'

/*
 * The drill-in's header (spec §3.2 "The drill-in"), 56 px: the way back, the
 * wrapper, the reading, the dollar line, the rule, both legs with their
 * ages, the actions. The gap sits above the canvas, not in a legend inside
 * it.
 *
 * At 1280 px the row cannot hold everything at full width, so the legs block
 * is the flexible child: it takes the slack and truncates (full line in the
 * title), and the bar only appears from xl up. Everything else is shrink-0.
 */
const ICON_BTN = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-zinc-900'

export default function GapHeader({ asset, session, lastFetchAt, onExit, onSheet, inWatchlist, onToggleWatch }) {
  const now = useNow() // both legs' ages tick once a second
  // This header's only trade affordance is the link-out, so that is the
  // switch it answers to. The in-app swap lives in the Readout's TradeButton
  // and is switched separately. See services/featureFlags.
  const linkOutOn = useFlag(LINK_OUT_FLAG)
  const token = verifiedToken(asset)
  const gap = premiumPct(asset)
  const thin = isThinlyTraded(asset)
  // In share units, and only when the gap itself can be vouched for.
  const check = gapCheck(asset)
  const diff = check.status === 'ok' ? check.tokenPerShare - asset.stockPrice : null
  const tokenAge = lastFetchAt ? (now - lastFetchAt) / 1000 : null
  const tokenLine = tokenLegLine({
    price: asset.tokenPrice,
    ageSeconds: tokenAge,
    source: asset.mint ? 'Jupiter and CoinGecko' : 'CoinGecko',
  })
  // The share leg's age comes from THIS quote's own timestamp. The batch
  // fetch time used to stand in when a quote carried none, which turned an
  // undated quote into a fresh-looking one — exactly backwards.
  const shareLine = asset.underlying
    ? shareLegLine({ price: asset.stockPrice, quote: asset.stockQuote, session, now, source: STOCK_QUOTE_SOURCE })
    : null
  return (
    <div
      className="flex h-14 shrink-0 items-center gap-4 border-b px-6"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <button type="button" onClick={onExit} className="t-caption flex shrink-0 items-center gap-1 text-zinc-500 hover:text-zinc-300">
        <ChevronLeft size={12} />
        Board
        <kbd className="rounded border px-1 font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>Esc</kbd>
      </button>
      <div className="flex shrink-0 items-baseline gap-2.5">
        <span className="t-body font-medium text-zinc-100">{asset.ticker}</span>
        {GAP_STATUS_LABEL[check.status] ? (
          <span className="t-body text-zinc-500">{GAP_STATUS_LABEL[check.status]}</span>
        ) : (
          <>
            <span className={`num t-title ${thin ? 'text-zinc-500' : 'text-zinc-100'}`}>{gap != null ? formatPct(gap) : EM_DASH}</span>
            {gap != null && <ClosedGapMark label={closedGapLabelFor(asset, now)} stacked className="self-center" />}
          </>
        )}
        {asset.underlying && (
          <span className="t-caption text-zinc-500">
            vs {asset.underlying}
            {diff != null && (
              <>
                {' · '}
                <span className="num">{formatPrice(Math.abs(diff))}</span> {diff >= 0 ? 'above' : 'below'} the share
              </>
            )}
          </span>
        )}
      </div>
      <span className="hidden shrink-0 xl:inline-flex">
        <GapBar pct={gap} thin={thin} width={160} height={8} tone="accent" />
      </span>
      <div className="num t-label flex min-w-0 flex-1 items-center gap-3.5 overflow-hidden text-zinc-300">
        <span className="min-w-0 truncate" title={tokenLine}>{tokenLine}</span>
        {shareLine && (
          <span className="min-w-0 truncate" title={shareLine}>{shareLine}</span>
        )}
      </div>
      <button type="button" onClick={onToggleWatch} aria-label={inWatchlist ? 'Remove from Watching' : 'Add to Watching'} className={`${ICON_BTN} ${inWatchlist ? 'text-accent' : 'text-zinc-300'}`}>
        <StarIcon size={18} filled={inWatchlist} />
      </button>
      {asset.underlying && (
        <button type="button" onClick={() => onSheet('alert')} aria-label="Set alert" className={`${ICON_BTN} text-zinc-300`}>
          <BellIcon size={18} />
        </button>
      )}
      <button type="button" onClick={() => onSheet('folder')} aria-label="Add to folder" className={`${ICON_BTN} text-zinc-300`}>
        <PlusIcon size={18} />
      </button>
      <button type="button" onClick={() => onSheet('share')} aria-label="Share" className={`${ICON_BTN} text-zinc-300`}>
        <ShareIcon size={18} />
      </button>
      {/* The link-out, TradeButton's rung one. The wallet-connected swap
          stays in the Readout's TradeButton; the header only links out. The
          address comes from the verified list, not the asset record: sending
          someone to a venue pre-filled with an unverified mint is the same
          wrong-token risk as swapping at it. */}
      {token && !linkOutOn && (
        // Two words, in the row's own type, where the button was. A control
        // that simply disappears from a header reads as a rendering bug.
        <span className="t-label flex h-8 shrink-0 items-center px-3 font-medium text-zinc-500">
          {TRADE_PAUSED_SHORT}
        </span>
      )}
      {token && linkOutOn && (
        <a
          href={`https://jup.ag/swap/USDC-${token.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('trade_out', { ticker: asset.ticker, venue: 'jupiter' })}
          className="t-label flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-medium text-zinc-100"
          style={{ boxShadow: 'inset 0 0 0 1px var(--border-strong)' }}
        >
          View on Jupiter ↗
        </a>
      )}
    </div>
  )
}
