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
 * `asset` is the STATIC universe record (id, ticker, mint, issuer,
 * underlying, chain) — stable across price ticks, so the fetch hook can key
 * on it directly.
 */

const INDICATOR_SWATCH = { sma20: 'bg-accent', ema50: 'bg-zinc-300', rsi14: 'bg-zinc-400' }

export default function CandlesPanel({ asset }) {
  const [side, setSide] = useState('token')
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME_ID)
  const [indicators, setIndicators] = useState({ sma20: false, ema50: false, rsi14: false })
  const candles = useCandles(asset, side, timeframe)

  function switchSide(next) {
    setSide(next)
    // The stock side offers fewer bar lengths; land on the nearest it has.
    setTimeframe((t) => coerceTimeframe(t, next))
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

      {/* Bar length. The token side gets every bucket GeckoTerminal serves;
          the stock side only what /api/history can answer. */}
      <div className="mt-2 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
        {timeframesFor(side).map((t) => (
          <Chip key={t.id} active={timeframe === t.id} onClick={() => setTimeframe(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 px-1">
        {candles.loading ? (
          <div className="mx-1 h-[204px] animate-pulse rounded-2xl bg-zinc-900" />
        ) : candles.data ? (
          <CandleChart
            candles={candles.data.candles}
            intraday={isIntraday(timeframe)}
            indicators={indicators}
          />
        ) : null}
      </div>

      {/* Indicators. Overlays share the price scale; RSI opens a pane of its
          own under the bars. Only offered when there is a chart to draw them
          on. */}
      {candles.data && (
        <div className="mt-2 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
          {INDICATORS.map((d) => (
            <Chip
              key={d.id}
              active={indicators[d.id]}
              swatch={INDICATOR_SWATCH[d.id]}
              onClick={() => setIndicators((v) => ({ ...v, [d.id]: !v[d.id] }))}
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
