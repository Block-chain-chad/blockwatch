// src/components/desktop/Readout.jsx
import { useState } from 'react'
import { usePrices } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { useAlerts } from '../../state/AlertsContext'
import { useAssetWorkspace, alertLabelFor } from '../../hooks/useAssetWorkspace'
import { useLocalState } from '../../hooks/useLocalState'
import { useNow } from '../../hooks/useNow'
import { premiumPct, isThinlyTraded } from '../../lib/prices'
import { gapCheck, GAP_STATUS_LABEL, tokenUnitsNote } from '../../lib/gapCheck'
import { formatPct, formatPrice, EM_DASH } from '../../lib/format'
import {
  SIZES, RANGE_WORDS, formatSize, gapDollars, readingSentence, roundTrip, gapPercentile, percentileCaption,
} from '../../lib/reading'
import { tokenLegLine, shareLegLine } from '../../lib/provenance'
import { STOCK_QUOTE_SOURCE } from '../../services/stocks'
import { GapBar } from '../shared'
import { BIG_SCREEN_BASE } from '../../lib/bigScreen'
import RuleTicks from './RuleTicks'
import { ShareIcon, PlusIcon, BellIcon, StarIcon, ChevronRight } from '../Icons'
import PremiumChart from '../PremiumChart'
import TradeButton from '../asset/TradeButton'
import DetailTabs from './DetailTabs'
import AddToFolderSheet from '../../overlays/AddToFolderSheet'
import SetAlertSheet from '../../overlays/SetAlertSheet'
import ShareSheet from '../../overlays/ShareSheet'

/*
 * The Readout (spec §3.2 region C): the selected wrapper read out loud. The
 * sentence in dollars at a size the reader picks, the reading, the rule,
 * both legs with their ages in words, the round trip, the gap history as
 * the only chart on the home, the way into the price chart, the actions
 * and the tabs. Nothing floats over a canvas.
 *
 * useAssetWorkspace already loads the chart series, the company info, the
 * DEX spread and the siblings for the phone screen; the Readout is the same
 * data in a different order.
 */
const ICON_BTN = 'flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-zinc-900 active:bg-zinc-800'
const PILL = 't-label flex h-[26px] items-center rounded-md px-2.5 transition-colors'
const RANGES = ['1D', '1W', '1M', '1Y']

export default function Readout({ assetId, onSelectAsset, onOpenChart, sheet, onSheet, big = BIG_SCREEN_BASE }) {
  const [size, setSize] = useLocalState('bw.meter.size.v1', 1000)
  const [range, setRange] = useLocalState('bw.meter.range.v1', '1W')
  const [chartRetry, setChartRetry] = useState(0)
  const now = useNow() // both legs' ages tick once a second
  const { session, lastFetchAt } = usePrices()
  const { folders, watchlistIds, toggleWatchlist } = useFolders()
  const { rules } = useAlerts()
  const { asset, chart, info, spread, siblings, hasTokenStats, hasStockStats, bothSides } =
    useAssetWorkspace(assetId, range, chartRetry)

  // MeterShell mounts the Readout only with an asset and owns the empty state.
  if (!asset) return null

  const gap = premiumPct(asset)
  const thin = isThinlyTraded(asset)
  // In share units, and only when the gap itself can be vouched for.
  const check = gapCheck(asset)
  const diff = check.status === 'ok' ? check.tokenPerShare - asset.stockPrice : null
  const companyName = asset.underlying ? asset.name : asset.ticker
  const sentence = readingSentence({ ticker: asset.ticker, companyName, gapPct: gap, size, thin, volume24h: asset.volume24h })
  const trip = roundTrip({ gapPct: gap, spreadPct: spread?.spreadPct ?? null, size })
  // useChartData keeps the previous range's series while a new one loads, so
  // the percentile must not be computed from stale data mid-fetch.
  const pct = chart.loading ? null : gapPercentile(chart.premium, gap)
  const percentileLine = percentileCaption(range, pct)
  const tokenAgeSeconds = lastFetchAt ? (now - lastFetchAt) / 1000 : null
  const inWatchlist = watchlistIds.includes(asset.id)
  const memberCount = folders.filter((f) => f.assetIds.includes(asset.id)).length
  const alertLabel = alertLabelFor(rules[asset.id])
  const folderLabel = memberCount > 0 ? `In ${memberCount} folder${memberCount === 1 ? '' : 's'}` : 'Add to folder'
  const wrappers = [asset, ...siblings].sort((a, b) => a.ticker.localeCompare(b.ticker))
  // trip is null whenever the gap or the spread isn't a finite number yet;
  // these have to be told apart so the copy never gets stuck on "Measuring…"
  // for a wrapper that will never resolve (no mint, or a spread fetch that
  // already failed).
  const tripCopy = !asset.mint
    ? 'No DEX quote for this wrapper.'
    : gap == null
      ? 'No share price to price a round trip yet.'
      : 'No DEX quote right now.'

  return (
    <section aria-label={`${asset.ticker} readout`} className="flex flex-col gap-3 px-6 pb-8 pt-5">
      <p className="t-body text-zinc-100" style={{ textWrap: 'pretty' }}>{sentence}</p>

      <div className="flex items-center gap-1">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-pressed={size === s}
            className={`num ${PILL} ${size === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            style={size === s ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
          >
            {formatSize(s)}
          </button>
        ))}
        <div className="flex-1" />
        {wrappers.length > 1 &&
          wrappers.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelectAsset(w.id)}
              aria-pressed={w.id === asset.id}
              className={`${PILL} ${w.id === asset.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              style={w.id === asset.id ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
            >
              {w.ticker}
            </button>
          ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          {GAP_STATUS_LABEL[check.status] ? (
            <span className="t-title text-zinc-500">{GAP_STATUS_LABEL[check.status]}</span>
          ) : (
            <span className={`num t-display ${thin ? 'text-zinc-500' : 'text-zinc-100'}`}>
              {gap != null ? formatPct(gap) : EM_DASH}
            </span>
          )}
          {diff != null && (
            <span className="t-caption text-zinc-500">
              <span className="num">{formatPrice(Math.abs(diff))}</span> {diff >= 0 ? 'above the share' : 'below the share'}
            </span>
          )}
        </div>
        <GapBar pct={gap} thin={thin} width="100%" height={10} tone="accent" />
        {big.readoutTicks ? (
          <RuleTicks width="100%" />
        ) : (
          <div className="num flex justify-between text-[11px] text-zinc-500">
            <span>−2%</span>
            <span>0</span>
            <span>+2%</span>
          </div>
        )}
        {/* The percentile sits under the number it describes (spec 2026-09-15
            §3.2), not three sections down under the history pane. */}
        {percentileLine && <p className="t-caption text-zinc-500">{percentileLine}</p>}
        {/* The gap and its history are in share units; say so when one token
            is not one share (lib/gapCheck.js). */}
        {tokenUnitsNote(asset) && <p className="t-caption text-zinc-400">{tokenUnitsNote(asset)}</p>}
        <div className="num t-label flex flex-col gap-1 text-zinc-300">
          <div>{tokenLegLine({ price: asset.tokenPrice, ageSeconds: tokenAgeSeconds, source: asset.mint ? 'Jupiter and CoinGecko' : 'CoinGecko' })}</div>
          {asset.underlying && (
            <div>{shareLegLine({ price: asset.stockPrice, quote: asset.stockQuote, session, now, source: STOCK_QUOTE_SOURCE })}</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="t-micro text-zinc-500">At your size</span>
        <div className="grid grid-cols-3 gap-3">
          {SIZES.map((s) => {
            const d = gapDollars(gap, s)
            return (
              <div key={s} className={`num t-label ${s === size ? 'text-zinc-100' : 'text-zinc-300'}`}>
                {formatSize(s)} · {d == null ? EM_DASH : formatPrice(Math.abs(d))}
              </div>
            )
          })}
        </div>
        <div className="t-caption text-zinc-500">
          {trip ? (
            <>
              Round trip on <span className="num">{formatSize(size)}</span>: gap{' '}
              <span className="num">{formatPrice(trip.gapUsd)}</span> + DEX spread{' '}
              <span className="num">{formatPrice(trip.spreadUsd)}</span> ={' '}
              <span className="num text-zinc-300">{formatPrice(trip.total)}</span> · spread measured on a{' '}
              {formatPrice(spread.refUsd)} trade
            </>
          ) : (
            tripCopy
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex flex-col" style={{ height: big.history }}>
          {chart.loading ? (
            <div className="h-full animate-pulse rounded-xl bg-zinc-900" />
          ) : chart.error ? (
            <button type="button" onClick={() => setChartRetry((n) => n + 1)} className="t-caption text-zinc-400">
              The history could not load. Try again.
            </button>
          ) : chart.premium.length >= 2 ? (
            <PremiumChart fill premium={chart.premium} tone="accent" />
          ) : (
            <p className="t-caption text-zinc-500">
              {asset.underlying ? 'No stored history yet.' : 'No share to compare against, so no gap history.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`t-caption ${range === r ? 'font-medium text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {RANGE_WORDS[r]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenChart}
        className="flex h-8 items-center justify-between rounded-md border px-3 transition-colors hover:bg-zinc-900"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <span className="t-label text-zinc-300">Price chart</span>
        <span className="t-caption flex items-center gap-2 text-zinc-500">
          Open chart <kbd className="rounded border px-1 font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>C</kbd>
          <ChevronRight size={12} />
        </span>
      </button>

      <div className="flex items-center gap-1 pt-1">
        <button
          type="button"
          onClick={() => toggleWatchlist(asset.id)}
          aria-label={inWatchlist ? 'Remove from Watching' : 'Add to Watching'}
          title={inWatchlist ? 'Remove from Watching' : 'Add to Watching'}
          className={`${ICON_BTN} ${inWatchlist ? 'text-accent' : 'text-zinc-300'}`}
        >
          <StarIcon size={18} filled={inWatchlist} />
        </button>
        {asset.underlying && (
          <button type="button" onClick={() => onSheet('alert')} aria-label={alertLabel} title={alertLabel} className={`${ICON_BTN} text-zinc-300`}>
            <BellIcon size={18} />
          </button>
        )}
        <button type="button" onClick={() => onSheet('folder')} aria-label={folderLabel} title={folderLabel} className={`${ICON_BTN} text-zinc-300`}>
          <PlusIcon size={18} />
        </button>
        <button type="button" onClick={() => onSheet('share')} aria-label="Share" title="Share" className={`${ICON_BTN} text-zinc-300`}>
          <ShareIcon size={18} />
        </button>
        <div className="flex-1" />
      </div>
      {asset.mint && (
        <div className="-mx-4">
          <TradeButton asset={asset} />
        </div>
      )}

      <DetailTabs
        variant="meter"
        asset={asset}
        info={info}
        spread={spread}
        siblings={siblings}
        hasTokenStats={hasTokenStats}
        hasStockStats={hasStockStats}
        bothSides={bothSides}
        onSelectAsset={onSelectAsset}
      />

      {sheet === 'folder' && <AddToFolderSheet asset={asset} onClose={() => onSheet(null)} />}
      {sheet === 'alert' && asset.underlying && <SetAlertSheet asset={asset} onClose={() => onSheet(null)} notify />}
      {sheet === 'share' && <ShareSheet asset={asset} onClose={() => onSheet(null)} />}
    </section>
  )
}
