import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../../services/analytics'
import { recordView } from '../../lib/recentViews'
import { usePrices } from '../../state/PricesContext'
import { useAssetWorkspace } from '../../hooks/useAssetWorkspace'
import { useLocalState } from '../../hooks/useLocalState'
import { DEFAULT_CHART_SETTINGS, normalizeChartSettings, secondsToBarClose, formatCountdown, legendChange } from '../../lib/chartSettings'
import { chartTitle, DEFAULT_TITLE } from '../../lib/pageTitle'
import { legendStatus, delayTooltip, isStockDelayed } from '../../lib/provenance'
import { premiumPct } from '../../lib/prices'
import { candleSeconds } from '../../lib/candles'
import { coerceTimeframe, isIntraday, networkName, timeframeLabel, cleanCandles } from '../../lib/candleSeries'
import { computePlots, describeKey } from '../../lib/indicatorCatalog'
import { formatPrice, formatPct, formatCompact, changeColor, EM_DASH } from '../../lib/format'
import { CloseIcon } from '../Icons'
import DualLineChart from '../DualLineChart'
import PremiumChart from '../PremiumChart'
import SetAlertSheet from '../../overlays/SetAlertSheet'
import ChartToolbar from './ChartToolbar'
import IntervalPrompt from './IntervalPrompt'
import IndicatorDialog from './IndicatorDialog'
import DetailTabs from './DetailTabs'
import { useFolders } from '../../state/FoldersContext'
import { timeframesFor } from '../../lib/candleSeries'
import GapHeader from './GapHeader'
import ChartFootStrip from './ChartFootStrip'

/*
 * The center of the desktop (spec §6.9): the chart toolbar, the Gap chart
 * over the gap-history pane (or the Candles chart), the legend on the
 * chart, and the four tabs under it. TradingView's rule for settings
 * (A15): mode, range, side, timeframe, indicators and the log scale belong
 * to the chart slot, live in one localStorage object (bw.desktop.chart.v1),
 * and do NOT reset when the asset changes. The data does.
 *
 * The shell hands in `onScrub` (a Gap-chart scrub drives the right column's
 * gap panel), `searchRef` (the legend's ticker focuses the symbol search)
 * and `actionsRef`, which this component fills with what the keyboard map
 * needs: the interval prompt, Alt+R / Alt+L, `/`, Alt+A. The tab title is
 * the quote (A21) while this is mounted; never on phones, which never mount
 * this file.
 */
const CandlesPanel = lazy(() => import('../CandlesPanel'))

/* If that chunk cannot be fetched, the mode renders one caption line rather
   than throwing to the app-level boundary (same as the phone screen). */
class CandlesBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error, info) {
    console.error('Candles crashed:', error, info?.componentStack)
    window.__bwReportError?.(error, info?.componentStack)
  }
  render() {
    if (this.state.failed) {
      return <p className="t-caption mt-3 px-4 text-zinc-600">Candles could not load right now.</p>
    }
    return this.props.children
  }
}

const GAP_HEIGHT = 'clamp(240px, 38vh, 420px)'
const CANDLES_HEIGHT = 'clamp(280px, 42vh, 480px)'
// The drill-in's chart column is h-full (GapHeader + foot strip above/below
// it, no toolbar/legend competing for the row), so it should fill the
// column instead of the phone's viewport-fraction clamps above.
const DRILL_GAP_HEIGHT = 'clamp(320px, calc(100dvh - 420px), 720px)'
const DRILL_CANDLES_HEIGHT = 'clamp(320px, calc(100dvh - 400px), 720px)'
const CANDLES_SKELETON = <div className="mx-3 mt-3 animate-pulse rounded-2xl bg-zinc-900" style={{ height: CANDLES_HEIGHT }} />

/* CandleChart's line palette as classes — the legend swatch has to be the
   colour of the line it names, and both cycle on the indicator's slot. */
const SWATCHES = ['bg-accent', 'bg-zinc-300', 'bg-zinc-400']

/*
 * An indicator reading in the legend. Indicators are not all prices: RSI is
 * 0–100, ROC is a percentage, OBV runs to the millions. formatPrice would
 * print "$71.4" for an RSI and "$1,204,000,000" for an OBV, so the magnitude
 * picks the format — compact above a million, two decimals below, four for
 * the sub-penny readings a cheap token produces.
 */
function formatIndicator(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return formatCompact(value)
  if (abs >= 1) return value.toFixed(2)
  return value.toFixed(4)
}

export default function ChartWorkspace({ assetId, onSelectAsset, onScrub, searchRef, actionsRef, drillIn = null }) {
  if (!assetId) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="t-body text-center text-zinc-400">
          Search for a ticker, or pick one from your watchlist.
        </p>
      </div>
    )
  }
  return (
    <Workspace
      assetId={assetId}
      onSelectAsset={onSelectAsset}
      onScrub={onScrub}
      searchRef={searchRef}
      actionsRef={actionsRef}
      drillIn={drillIn}
    />
  )
}

/** One time label for the legend: clock time on intraday bars, a date on daily ones. */
function whenLabel(time, intraday) {
  if (!Number.isFinite(time)) return ''
  return new Date(time * 1000).toLocaleString(
    'en-US',
    intraday
      ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  )
}

function Workspace({ assetId, onSelectAsset, onScrub, searchRef, actionsRef, drillIn }) {
  const [saved, setSaved] = useLocalState('bw.desktop.chart.v1', DEFAULT_CHART_SETTINGS)
  const settings = useMemo(() => normalizeChartSettings(saved), [saved])
  const { mode, range, side, timeframe, indicators, log } = settings
  const patch = (p) => setSaved((s) => ({ ...normalizeChartSettings(s), ...p }))

  const [chartRetry, setChartRetry] = useState(0)
  const [visibleLines, setVisibleLines] = useState({ token: true, stock: true })
  const [scrubT, setScrubT] = useState(null)
  const [hoverBar, setHoverBar] = useState(null)
  const [candleData, setCandleData] = useState(null)
  const [auto, setAuto] = useState(true)
  const [prompt, setPrompt] = useState(null) // { prefill } | null
  const [alertOpen, setAlertOpen] = useState(false)
  const [indicatorsOpen, setIndicatorsOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const chartRef = useRef(null)
  const { stocksAt, lastFetchAt } = usePrices()
  const { watchlistIds, toggleWatchlist } = useFolders()

  const {
    asset,
    staticAsset,
    session,
    chart,
    info,
    spread,
    siblings,
    hasTokenStats,
    hasStockStats,
    bothSides,
  } = useAssetWorkspace(assetId, range, chartRetry)

  // Feed the search's "Recently viewed" shelf, as the phone screen does.
  useEffect(() => {
    recordView(assetId)
  }, [assetId])

  // A new asset or range invalidates the old pointer position.
  useEffect(() => {
    setScrubT(null)
    setHoverBar(null)
  }, [assetId, range, mode, side, timeframe])

  // The tab title is the quote — or, in Gap mode, the gap (A21).
  // The Meter's drill-in leaves the title to its shell, so both writes are
  // gated on `drillIn`; with it null they behave exactly as before.
  const gapPct = asset ? premiumPct(asset) : null
  useEffect(() => {
    if (!asset || drillIn) return
    document.title = chartTitle({
      ticker: asset.ticker,
      price: asset.tokenPrice,
      changePct: asset.dayChange,
      mode,
      gapPct,
    })
  }, [asset?.ticker, asset?.tokenPrice, asset?.dayChange, mode, gapPct, drillIn]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    if (!drillIn) document.title = DEFAULT_TITLE
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown to bar close (A13): token side only, ticking once a second
  // while there is a bar to count from. The stock leg is delayed; a countdown
  // there would lie.
  const lastBar = candleData?.candles?.length ? candleData.candles[candleData.candles.length - 1] : null
  const countdownOn = !drillIn && mode === 'candles' && side === 'token' && lastBar != null

  /*
   * One legend row per active indicator, with its reading at the bar under
   * the crosshair (the latest bar when the pointer is away) — TradingView's
   * status line. Without this an indicator is an unnamed line: the chart
   * draws it, and nothing on screen says what it is or what it reads.
   *
   * Computed here rather than handed back out of CandleChart because the
   * values are a pure function of candles the workspace already holds, and
   * routing them through the chart would make the legend wait on a canvas
   * render to catch up with the crosshair.
   *
   * Sits above the `if (!asset)` return with the other hooks: a hook after
   * an early return runs in a different order on the renders that take it.
   */
  const indicatorRows = useMemo(() => {
    if (mode !== 'candles' || indicators.length === 0) return []
    const clean = cleanCandles(candleData?.candles ?? [])
    if (clean.length === 0) return []
    const bar = hoverBar ?? lastBar
    const found = bar ? clean.findIndex((c) => c.time === bar.time) : -1
    const at = found >= 0 ? found : clean.length - 1
    return indicators.map((key, slot) => ({
      key,
      slot,
      label: describeKey(key),
      plots: computePlots(key, clean).map((p) => ({
        id: p.id,
        label: p.label,
        tone: p.tone,
        value: p.values[at],
      })),
    }))
  }, [mode, indicators, candleData, hoverBar, lastBar])
  useEffect(() => {
    if (!countdownOn) return undefined
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [countdownOn])

  // The log scale is a chart option, re-applied whenever the chart comes
  // back (CandlesPanel remounts CandleChart on every fetch).
  useEffect(() => {
    if (mode === 'candles') chartRef.current?.setLog(log)
  }, [mode, log, candleData])

  // The Auto chip mirrors the price scale's autoScale flag. The library has
  // no event for it — a drag on the axis turns it off silently, and the
  // crosshair does not move during that drag — so it is read twice a
  // second while the Candles chart is up (one option read; no layout).
  useEffect(() => {
    if (mode !== 'candles') return undefined
    const t = setInterval(() => {
      const on = chartRef.current?.isAuto()
      if (typeof on === 'boolean') setAuto((prev) => (prev === on ? prev : on))
    }, 500)
    return () => clearInterval(t)
  }, [mode])

  // What the keyboard map can do to this workspace (hooks/useDesktopShortcuts).
  useEffect(() => {
    actionsRef.current = {
      mode,
      openIntervalPrompt: (prefill) => setPrompt({ prefill }),
      closePrompt: () => {
        if (!prompt) return false
        setPrompt(null)
        return true
      },
      reset: () => {
        chartRef.current?.reset()
        setAuto(true)
      },
      toggleLog: () => patch({ log: !log }),
      // `/` opens the catalogue, as it does on TradingView. It used to move
      // focus to the first of three fixed chips, which no longer exist.
      focusIndicators: () => setIndicatorsOpen(true),
      openAlert: () => {
        if (asset?.underlying) setAlertOpen(true)
      },
    }
    return () => {
      actionsRef.current = null
    }
  })

  if (!asset || !staticAsset) return null

  function toggleLine(key) {
    setVisibleLines((v) => {
      const next = { ...v, [key]: !v[key] }
      return next.token || next.stock ? next : v
    })
  }

  function setMode(next) {
    if (next === mode) return
    if (next === 'candles') {
      onScrub(null)
      setScrubT(null)
      track('chart_mode', { mode: 'candles', ticker: asset.ticker })
    }
    patch({ mode: next })
  }

  // A new range invalidates the pointer position first (the shell's gap
  // panel follows it); shared by the toolbar and the foot strip.
  const onRange = (r) => {
    onScrub(null)
    setScrubT(null)
    patch({ range: r })
  }

  function setSide(next) {
    if (next === side) return
    // The stock side offers fewer bar lengths; land on the nearest it has.
    patch({ side: next, timeframe: coerceTimeframe(timeframe, next) })
  }

  function applyInterval(parsed) {
    setPrompt(null)
    if (parsed.kind === 'range') patch({ range: parsed.id })
    else patch({ timeframe: coerceTimeframe(parsed.id, side) })
  }

  function onCrosshair(bar) {
    setHoverBar(bar)
    setAuto(chartRef.current?.isAuto() ?? true)
  }

  // --- The legend's words ------------------------------------------------
  const stockAge = stocksAt ? (Date.now() - stocksAt) / 1000 : null
  const stockDelayed = isStockDelayed(session, stockAge)
  const tokenVenue = networkName(candleData?.network) ?? asset.chain ?? 'DEX'
  const tokenStatus = legendStatus('token', session, null, { venue: tokenVenue })
  const stockStatus = legendStatus('stock', session, stockAge)
  const shownBar = hoverBar ?? lastBar
  const change = legendChange(candleData?.candles, shownBar)
  const barDir = shownBar ? shownBar.close - shownBar.open : null
  const closeColor = barDir == null ? 'text-zinc-300' : changeColor(barDir)
  const countdown = countdownOn
    ? formatCountdown(secondsToBarClose(lastBar.time, candleSeconds(timeframe), now / 1000))
    : ''


  const tickerButton = (
    <button
      type="button"
      onClick={() => searchRef.current?.focus('')}
      title="Symbol search"
      className="t-body font-medium text-zinc-100 transition-colors hover:text-accent"
    >
      {mode === 'candles' && side === 'stock' ? asset.underlying : asset.ticker}
    </button>
  )
  const intervalButton = (
    <button
      type="button"
      onClick={() => setPrompt({ prefill: '' })}
      title="Change interval"
      className="t-body text-zinc-300 transition-colors hover:text-accent"
    >
      {mode === 'gap' ? range : timeframeLabel(timeframe)}
    </button>
  )
  const DelayBadge = (
    <span className="text-[10px] font-bold leading-none text-amber-400" title={delayTooltip()}>
      D
    </span>
  )

  const footStrip = drillIn ? (
    <ChartFootStrip
      mode={mode}
      onMode={setMode}
      range={range}
      onRange={onRange}
      side={side}
      onSide={setSide}
      timeframe={timeframe}
      onTimeframe={(id) => patch({ timeframe: id })}
      offeredTimeframes={timeframesFor(side)}
      log={log}
      onLog={() => patch({ log: !log })}
      indicatorCount={indicators.length}
      onOpenIndicators={() => setIndicatorsOpen(true)}
      onShortcuts={drillIn.onShortcuts}
      hasStock={Boolean(asset.underlying)}
      ticker={asset.ticker}
      underlying={asset.underlying}
    />
  ) : null

  return (
    <div className={drillIn ? 'flex h-full min-h-0 flex-col' : 'flex min-h-full flex-col'}>
      {drillIn ? (
        <GapHeader
          asset={asset}
          session={session}
          stocksAt={stocksAt}
          lastFetchAt={lastFetchAt}
          onExit={drillIn.onExit}
          onSheet={drillIn.onSheet}
          inWatchlist={watchlistIds.includes(asset.id)}
          onToggleWatch={() => toggleWatchlist(asset.id)}
        />
      ) : (
        <ChartToolbar
          asset={asset}
          settings={settings}
          onMode={setMode}
          onRange={onRange}
          onSide={setSide}
          onTimeframe={(id) => patch({ timeframe: id })}
          onIndicators={(next) => patch({ indicators: next })}
          onOpenIndicators={() => setIndicatorsOpen(true)}
          onLog={() => patch({ log: !log })}
          auto={auto}
          onAuto={() => {
            chartRef.current?.setAuto()
            setAuto(true)
          }}
          onLatest={() => chartRef.current?.scrollToLatest()}
          onReset={() => {
            chartRef.current?.reset()
            setAuto(true)
          }}
        />
      )}

      <div className={drillIn ? 'min-h-0 flex-1 overflow-y-auto px-6 pb-4' : 'px-6 pb-10'}>
        {mode === 'gap' && (
          <div className="relative mt-3">
            {/* The legend, Gap mode: the title row over the chart's own
                readout row (the readout is DualLineChart's, kept as is so
                the Gap chart stays the phone's), then one provenance line
                per leg (A23). */}
            {!drillIn && (
              <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-2">
                {tickerButton}
                {intervalButton}
                {asset.underlying && (
                  <span className="t-caption text-zinc-500">vs {asset.underlying}</span>
                )}
                <span className="t-caption text-zinc-500">{tokenStatus}</span>
                {asset.underlying && (
                  <span className="t-caption flex items-center gap-1 text-zinc-500">
                    {stockDelayed && DelayBadge}
                    {stockStatus}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col" style={{ height: drillIn ? DRILL_GAP_HEIGHT : GAP_HEIGHT }}>
              <DualLineChart
                fill
                token={chart.token}
                stock={chart.stock}
                premium={chart.premium}
                loading={chart.loading}
                error={chart.error}
                onRetry={() => setChartRetry((n) => n + 1)}
                onScrub={onScrub}
                onScrubT={setScrubT}
                showToken={visibleLines.token}
                showStock={visibleLines.stock}
                idleHint="Hover the chart to inspect"
              />
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {asset.underlying && chart.stock.length >= 2 && (
                <button
                  onClick={() => toggleLine('stock')}
                  aria-pressed={visibleLines.stock}
                  className={`t-label flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                    visibleLines.stock ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
                  }`}
                  style={
                    visibleLines.stock
                      ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' }
                      : undefined
                  }
                >
                  <span
                    className={`h-0.5 w-4 rounded bg-zinc-400 ${visibleLines.stock ? '' : 'opacity-40'}`}
                  />
                  {asset.underlying} stock
                  {chart.stockIsFlat && <span className="text-zinc-500">(last close)</span>}
                </button>
              )}
              <button
                onClick={() => toggleLine('token')}
                aria-pressed={visibleLines.token}
                className={`t-label flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                  visibleLines.token ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
                }`}
                style={
                  visibleLines.token ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined
                }
              >
                <span
                  className={`h-0.5 w-4 rounded bg-accent ${visibleLines.token ? '' : 'opacity-40'}`}
                />
                {asset.ticker} token
              </button>
            </div>
            {asset.underlying && chart.stock.length >= 2 && (
              <p className="t-caption pt-1.5 text-center text-zinc-500">
                Click either to hide that line and read the other on its own.
              </p>
            )}
            {/* The gap-history pane, its rule following the Gap chart's
                pointer (A11). 96px of chart under its own header. On the
                Meter's drill-in the gap is never green or red; Phase 1
                (drillIn null) keeps the component's 'direction' default. */}
            {!chart.loading && !chart.error && chart.premium.length >= 2 && (
              <div className="flex flex-col" style={{ height: 132 }}>
                <PremiumChart fill premium={chart.premium} scrubT={scrubT} tone={drillIn ? 'accent' : 'direction'} />
              </div>
            )}
            {prompt && (
              <IntervalPrompt
                mode="gap"
                initial={prompt.prefill}
                onApply={applyInterval}
                onCancel={() => setPrompt(null)}
              />
            )}
          </div>
        )}

        {mode === 'candles' && (
          <div className="relative mt-3" tabIndex={0} aria-label="Price chart">
            {/* The legend (A8, A23): inset from the pane corner on a
                half-alpha plate, TradingView's status line. Title row —
                symbol and interval as buttons, the venue, the provenance;
                values row — O H L C, the change, the volume, the time, and
                on the token side the countdown to bar close (A13). */}
            <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-4rem)] rounded-md bg-zinc-950/50 px-2 py-1">
              {!drillIn && (
                <div className="pointer-events-auto flex flex-wrap items-baseline gap-x-2">
                  {tickerButton}
                  {intervalButton}
                  <span className="t-caption text-zinc-500">
                    {side === 'stock' ? 'NASDAQ' : tokenVenue}
                  </span>
                  <span className="t-caption flex items-center gap-1 text-zinc-500">
                    {side === 'stock' && stockDelayed && DelayBadge}
                    {side === 'stock' ? stockStatus : tokenStatus}
                  </span>
                </div>
              )}
              {/* On the drill-in the O H L C row appears only under the
                  crosshair; the gap header above the canvas is the reading. */}
              {(!drillIn || hoverBar) && (
                <div className="num t-caption flex flex-wrap items-baseline gap-x-2 text-zinc-500">
                  {shownBar ? (
                    <>
                      <span>
                        O <span className="text-zinc-300">{formatPrice(shownBar.open)}</span>
                      </span>
                      <span>
                        H <span className="text-zinc-300">{formatPrice(shownBar.high)}</span>
                      </span>
                      <span>
                        L <span className="text-zinc-300">{formatPrice(shownBar.low)}</span>
                      </span>
                      <span>
                        C <span className={closeColor}>{formatPrice(shownBar.close)}</span>
                      </span>
                      {change && (
                        <span className={changeColor(change.delta)}>
                          Δ {formatPrice(Math.abs(change.delta))} ({formatPct(change.pct)})
                        </span>
                      )}
                      {Number.isFinite(shownBar.volume) && (
                        <span>
                          Vol <span className="text-zinc-300">{formatCompact(shownBar.volume)}</span>
                        </span>
                      )}
                      <span className="text-zinc-600">{whenLabel(shownBar.time, isIntraday(timeframe))}</span>
                      {countdown && !hoverBar && (
                        <span className="text-zinc-500">closes in {countdown}</span>
                      )}
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              )}

              {/* One row per indicator, under the price line it is drawn
                  over. The swatch is the line's own colour (same palette,
                  same cycle as CandleChart), so a row and its line can be
                  matched up without reading the names. The X removes it —
                  TradingView's hover controls, without the hover, because a
                  control that only exists on hover cannot be found. */}
              {indicatorRows.map((row) => (
                <div
                  key={row.key}
                  className="num t-caption flex flex-wrap items-baseline gap-x-2 text-zinc-500"
                >
                  <span
                    aria-hidden="true"
                    className={`mb-[3px] inline-block h-0.5 w-3 rounded ${
                      SWATCHES[row.slot % SWATCHES.length]
                    }`}
                  />
                  <span className="text-zinc-400">{row.label}</span>
                  {row.plots.map((p) => (
                    <span key={p.id}>
                      {row.plots.length > 1 && <span className="text-zinc-600">{p.label} </span>}
                      <span className="text-zinc-300">
                        {p.value == null ? EM_DASH : formatIndicator(p.value)}
                      </span>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      patch({ indicators: indicators.filter((k) => k !== row.key) })
                    }
                    aria-label={`Remove ${row.label}`}
                    title={`Remove ${row.label}`}
                    className="rounded px-1 text-zinc-600 transition-colors hover:text-loss"
                  >
                    <CloseIcon size={11} />
                  </button>
                </div>
              ))}
            </div>

            <CandlesBoundary>
              <Suspense fallback={CANDLES_SKELETON}>
                <CandlesPanel
                  asset={staticAsset}
                  side={side}
                  timeframe={timeframe}
                  indicators={indicators}
                  onSide={setSide}
                  onTimeframe={(id) => patch({ timeframe: id })}
                  onIndicators={(next) => patch({ indicators: next })}
                  hideControls
                  onData={setCandleData}
                  chartProps={{
                    fontSize: 12,
                    magnet: true,
                    hideReadout: true,
                    height: drillIn ? DRILL_CANDLES_HEIGHT : CANDLES_HEIGHT,
                    rsiHeight: 96,
                    resetKey: `${asset.id}:${side}:${timeframe}`,
                    onCrosshair,
                    ref: chartRef,
                  }}
                />
              </Suspense>
            </CandlesBoundary>
            {prompt && (
              <IntervalPrompt
                mode="candles"
                initial={prompt.prefill}
                onApply={applyInterval}
                onCancel={() => setPrompt(null)}
              />
            )}
          </div>
        )}

        {!drillIn && (
          <DetailTabs
            asset={asset}
            info={info}
            spread={spread}
            siblings={siblings}
            hasTokenStats={hasTokenStats}
            hasStockStats={hasStockStats}
            bothSides={bothSides}
            onSelectAsset={onSelectAsset}
          />
        )}
      </div>

      {footStrip}

      {alertOpen && <SetAlertSheet asset={asset} onClose={() => setAlertOpen(false)} />}

      {indicatorsOpen && (
        <IndicatorDialog
          active={indicators}
          onChange={(next) => patch({ indicators: next })}
          onClose={() => setIndicatorsOpen(false)}
        />
      )}
    </div>
  )
}
