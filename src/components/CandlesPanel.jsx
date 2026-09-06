import { useState } from 'react'
import CandleChart from './CandleChart'
import { Chip } from './shared'
import { useCandles } from '../hooks/useCandles'
import { DEFAULT_TIMEFRAME_ID } from '../lib/candles'
import { INDICATORS, timeframesFor, coerceTimeframe, isIntraday, networkName } from '../lib/candleSeries'

/*
 * The Candles mode of the asset chart: one side of the gap at a time, drawn
 * as bars the way a trader expects, with the controls that go with it.
 *
 * Loaded lazily by AssetDetail — this file, the candle service and the
 * TradingView library arrive together the first time someone taps Candles,
 * so the Gap chart (the app's thesis, and what most sessions look at) costs
 * nothing extra. State lives here rather than on the screen so leaving the
 * mode and coming back starts fresh, which is also what unmounting the chart
 * does anyway.
 *
 * Controlled mode, for the desktop toolbar, which owns the same three
 * settings so they follow the user across assets: pass `side`, `timeframe`,
 * `indicators` with their `onSide` / `onTimeframe` / `onIndicators`, set
 * `hideControls` to drop the chip rows (the toolbar draws them), and
 * `chartProps` to reach the chart (fontSize, magnet, onCrosshair, resetKey,
 * ref). Each setting falls back to local state on its own when its prop is
 * omitted; with all of them omitted this is exactly the phone panel.
 *
 * `asset` is the STATIC universe record (id, ticker, mint, issuer,
 * underlying, chain) — stable across price ticks, so the fetch hook can key
 * on it directly.
 */

const INDICATOR_SWATCH = { sma20: 'bg-accent', ema50: 'bg-zinc-300', rsi14: 'bg-zinc-400' }

export default function CandlesPanel({
  asset,
  side: sideProp,
  timeframe: timeframeProp,
  indicators: indicatorsProp,
  onSide,
  onTimeframe,
  onIndicators,
  hideControls = false,
  chartProps,
}) {
  const [ownSide, setOwnSide] = useState('token')
  const [ownTimeframe, setOwnTimeframe] = useState(DEFAULT_TIMEFRAME_ID)
  const [ownIndicators, setOwnIndicators] = useState({ sma20: false, ema50: false, rsi14: false })
  const side = sideProp ?? ownSide
  const timeframe = timeframeProp ?? ownTimeframe
  const indicators = indicatorsProp ?? ownIndicators
  const candles = useCandles(asset, side, timeframe)

  function switchSide(next) {
    if (onSide) onSide(next)
    else setOwnSide(next)
    // The stock side offers fewer bar lengths; land on the nearest it has.
    if (onTimeframe) onTimeframe(coerceTimeframe(timeframe, next))
    else setOwnTimeframe((t) => coerceTimeframe(t, next))
  }

  function pickTimeframe(id) {
    if (onTimeframe) onTimeframe(id)
    else setOwnTimeframe(id)
  }

  function toggleIndicator(id) {
    if (onIndicators) onIndicators({ ...indicators, [id]: !indicators[id] })
    else setOwnIndicators((v) => ({ ...v, [id]: !v[id] }))
  }

  const network = candles.data ? networkName(candles.data.network) : null
  const caption = candles.loading
    ? null
    : candles.data
      ? side === 'token'
        ? `Token candles are the largest ${network ?? asset.chain ?? 'DEX'} pool, one venue, not a composite.`
        : `${asset.underlying} share candles, regular session only, via Yahoo Finance.`
      : side === 'token'
        ? `No ${asset.ticker} candles right now.`
        : `No ${asset.underlying} candles at this interval.`

  return (
    <div className="mt-3 px-2">
      {/* Which side of the gap. Token is the default because the token is
          what this screen is about; the share is offered only when there is
          one. */}
      {!hideControls && (
        <div className="flex gap-2 px-2">
          <Chip active={side === 'token'} onClick={() => switchSide('token')}>
            {asset.ticker} token
          </Chip>
          {asset.underlying && (
            <Chip active={side === 'stock'} onClick={() => switchSide('stock')}>
              {asset.underlying} stock
            </Chip>
          )}
        </div>
      )}

      {/* Bar length. The token side gets every bucket GeckoTerminal serves;
          the stock side only what /api/history can answer. */}
      {!hideControls && (
        <div className="mt-2 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
          {timeframesFor(side).map((t) => (
            <Chip key={t.id} active={timeframe === t.id} onClick={() => pickTimeframe(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-3 px-1">
        {candles.loading ? (
          <div className="mx-1 h-[204px] animate-pulse rounded-2xl bg-zinc-900" />
        ) : candles.data ? (
          <CandleChart
            candles={candles.data.candles}
            intraday={isIntraday(timeframe)}
            indicators={indicators}
            {...chartProps}
          />
        ) : null}
      </div>

      {/* Indicators. Overlays share the price scale; RSI opens a pane of its
          own under the bars. Only offered when there is a chart to draw them
          on. */}
      {!hideControls && candles.data && (
        <div className="mt-2 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
          {INDICATORS.map((d) => (
            <Chip
              key={d.id}
              active={indicators[d.id]}
              swatch={INDICATOR_SWATCH[d.id]}
              onClick={() => toggleIndicator(d.id)}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      )}

      {/* One line under the chart saying where the bars come from — or, when
          there are none, that there are none. Never a box. */}
      {caption && <p className="t-caption mt-1.5 px-2 text-zinc-600">{caption}</p>}
    </div>
  )
}
