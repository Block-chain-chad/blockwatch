import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as lib from 'lightweight-charts'
import { toCandlestickData, toVolumeData, toLineData, cleanCandles } from '../lib/candleSeries'
import { computePlots, parseKey } from '../lib/indicatorCatalog'
import { formatPrice, EM_DASH } from '../lib/format'

/*
 * A candlestick chart on TradingView's Lightweight Charts (Apache-2.0). This
 * file is only ever reached through the lazily loaded CandlesPanel, so the
 * library — about the size of the rest of the bundle's growth budget — comes
 * down the first time someone taps Candles and never with the app itself.
 *
 * Colours come from the design tokens at mount and again on every theme
 * flip. The library parses hex / rgb / hsl only and the tokens are oklch,
 * so each value is pushed through a canvas context, which hands back the
 * same colour in a form the library reads. The chart background is
 * transparent so it sits on the page like the SVG charts do — no card.
 *
 * Indicators are series the chart keeps and shows or hides, except RSI,
 * which lives in its own pane (v5 panes) and is added and removed with its
 * toggle so an empty pane never takes height.
 */

const MAIN_HEIGHT = 220
const RSI_HEIGHT = 80
/* One frozen empty list, so the default prop keeps a stable identity. */
const EMPTY_KEYS = Object.freeze([])

let colorCtx = null
const SENTINEL = '#010203'
/**
 * A CSS colour as rgba(), or the fallback if the browser cannot parse it.
 * Reading `fillStyle` back is not enough: Chrome serialises an oklch value
 * as oklch again, which is the form the library rejects. Painting one pixel
 * and reading it back yields sRGB whatever the input syntax was.
 */
function resolveColor(value, fallback) {
  try {
    if (!colorCtx) {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      colorCtx = canvas.getContext('2d', { willReadFrequently: true })
    }
    colorCtx.fillStyle = SENTINEL // an unparseable value leaves this untouched
    colorCtx.fillStyle = value
    if (colorCtx.fillStyle === SENTINEL) return fallback
    colorCtx.clearRect(0, 0, 1, 1)
    colorCtx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  } catch {
    return fallback
  }
}

function themeColors() {
  const style = getComputedStyle(document.documentElement)
  const token = (name, fallback) => resolveColor(style.getPropertyValue(name).trim(), fallback)
  return {
    text: token('--color-zinc-500', '#8b8f98'),
    grid: token('--border-subtle', 'rgba(255, 255, 255, 0.06)'),
    axis: token('--border-default', 'rgba(255, 255, 255, 0.1)'),
    up: token('--color-gain', '#3fb950'),
    down: token('--color-loss', '#f85149'),
    // Indicator lines. Three, cycled per active indicator, so two moving
    // averages at different lengths never come out the same colour. There is
    // no fourth: this system's remaining colours (gain, loss) mean direction,
    // and borrowing one would say a line is "up".
    palette: [
      token('--color-accent', '#2dd4bf'),
      token('--color-zinc-300', '#d0d2d8'),
      token('--color-zinc-400', '#b3b6be'),
    ],
    muted: token('--color-zinc-600', '#6b6f78'),
    crosshair: token('--color-zinc-600', '#6b6f78'),
    surface: token('--color-zinc-800', '#26272b'),
  }
}

/** The colour a plot's tone resolves to, cycling `primary` by slot. */
function toneColor(colors, tone, slot) {
  if (tone === 'muted') return colors.muted
  const offset = tone === 'secondary' ? 1 : 0
  return colors.palette[(slot + offset) % colors.palette.length]
}

function chartOptions(c, intraday, fontSize = 11, magnet = false) {
  return {
    layout: {
      background: { type: lib.ColorType.Solid, color: 'transparent' },
      textColor: c.text,
      fontSize,
      // Attribution is the "Charts by TradingView" link rendered beside the
      // chart instead, where it reads as a caption rather than a watermark.
      attributionLogo: false,
      panes: { separatorColor: c.axis, separatorHoverColor: c.axis, enableResize: false },
    },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    rightPriceScale: { borderColor: c.axis },
    timeScale: { borderColor: c.axis, timeVisible: intraday, secondsVisible: false, rightOffset: 2 },
    crosshair: {
      // Magnet snaps the crosshair to OHLC values (TradingView's desktop
      // default); Normal follows the pointer, which a finger needs.
      mode: magnet ? lib.CrosshairMode.Magnet : lib.CrosshairMode.Normal,
      vertLine: { color: c.crosshair, labelBackgroundColor: c.surface },
      horzLine: { color: c.crosshair, labelBackgroundColor: c.surface },
    },
    // A vertical finger drag must keep scrolling the page: the chart sits in
    // the middle of a long screen. Horizontal drag and pinch still pan/zoom.
    handleScroll: { vertTouchDrag: false },
  }
}

const priceFormat = { type: 'custom', formatter: (p) => formatPrice(p), minMove: 0.01 }

/**
 * One time label for the readout: clock time on intraday bars, a date on
 * daily ones. Bars are stamped in UTC seconds and shown in local time.
 */
function whenLabel(time, intraday) {
  if (!Number.isFinite(time)) return ''
  return new Date(time * 1000).toLocaleString(
    'en-US',
    intraday
      ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  )
}

/**
 * Put the active indicators on the chart, replacing whatever is there.
 *
 * Wholesale rather than a diff on purpose. Lightweight Charts numbers panes
 * positionally, so removing the pane of one indicator renumbers every pane
 * after it; a diff would have to track that renumbering through add, remove
 * and reorder, and the failure mode is a line silently drawn in the wrong
 * pane. Rebuilding is a few dozen series operations on a chart that already
 * redraws every 30 seconds, and it cannot get the mapping wrong.
 *
 * Overlays share the price pane and its scale. Every separate-pane indicator
 * gets a pane of its own, in list order, with its bands drawn as price lines
 * and its scale fixed when the catalogue declares one (RSI is 0–100 whatever
 * the readings happen to be, or the bands mean nothing).
 */
function rebuildIndicators(refs, keys, candles, colors, paneHeight) {
  const { chart } = refs
  for (const entry of refs.indicatorSeries) {
    try {
      chart.removeSeries(entry.series)
    } catch {
      // Already gone with its pane; nothing to undo.
    }
  }
  refs.indicatorSeries = []
  // Drop every pane but the price pane, highest index first so the ones
  // still to be removed keep their numbers.
  for (let i = chart.panes().length - 1; i >= 1; i--) {
    try {
      chart.removePane(i)
    } catch {
      // A build that will not remove a pane leaves it empty; harmless.
    }
  }
  refs.paneCount = 1

  const clean = cleanCandles(candles)
  const times = clean.map((c) => c.time)
  let pane = 0

  keys.forEach((key, slot) => {
    const parsed = parseKey(key)
    if (!parsed) return
    const { entry } = parsed
    const plots = computePlots(key, clean)
    if (plots.length === 0) return
    const separate = entry.pane === 'separate'
    if (separate) pane += 1
    const paneIndex = separate ? pane : 0
    const scale = entry.scale ?? {}

    plots.forEach((plot, i) => {
      const options = {
        color: toneColor(colors, plot.tone, slot),
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: separate && i === 0,
        crosshairMarkerVisible: false,
        priceFormat:
          scale.decimals == null
            ? priceFormat
            : {
                type: 'custom',
                formatter: (v) => v.toFixed(scale.decimals),
                minMove: 10 ** -scale.decimals,
              },
      }
      // A bounded oscillator keeps its full range on screen; without this the
      // scale hugs the readings and the 30/70 bands drift off the pane.
      if (scale.min != null && scale.max != null) {
        options.autoscaleInfoProvider = () => ({
          priceRange: { minValue: scale.min, maxValue: scale.max },
        })
      }
      const series = chart.addSeries(lib.LineSeries, options, paneIndex)
      series.setData(toLineData(times, plot.values))
      if (separate && i === 0) {
        for (const level of scale.bands ?? []) {
          series.createPriceLine({
            price: level,
            color: colors.grid,
            lineWidth: 1,
            lineStyle: lib.LineStyle.Solid,
            axisLabelVisible: false,
          })
        }
        if (scale.zeroLine) {
          series.createPriceLine({
            price: 0,
            color: colors.grid,
            lineWidth: 1,
            lineStyle: lib.LineStyle.Solid,
            axisLabelVisible: false,
          })
        }
      }
      refs.indicatorSeries.push({ key, plotId: plot.id, series })
    })
  })

  refs.paneCount = pane + 1
  for (let i = 1; i < refs.paneCount; i++) chart.panes()[i]?.setHeight(paneHeight)
}

/**
 * Props:
 *   candles     — shared shape, ascending; the caller has already decided
 *                 there is something to draw
 *   intraday    — bars shorter than a day (axis shows clock time)
 *   indicators  — active indicator KEYS in draw order, e.g. ['sma:20',
 *                 'rsi:14']; see lib/indicatorCatalog.js. Unknown keys are
 *                 skipped rather than throwing.
 *
 * Desktop props, every one optional and inert when omitted, so the phone
 * call site (which passes none of them) renders and behaves as before:
 *   fontSize    — scale text size; 11 on phones, 12 on the desktop
 *   magnet      — crosshair snaps to OHLC (CrosshairMode.Magnet)
 *   onCrosshair — called with the same bar-or-null the readout receives
 *   resetKey    — when given, the chart refits ONLY when this changes (the
 *                 desktop passes asset:side:timeframe), so a 30-second
 *                 refresh of the same bars keeps the user's zoom and scroll;
 *                 omitted, every data change refits, as the phone expects
 *   ref         — { reset, scrollToLatest, setLog, isAuto, setAuto } for the
 *                 toolbar's Auto / Latest / Reset / Log buttons
 *   hideReadout — drop the OHLC caption row above the chart (the desktop
 *                 draws its legend on the chart instead)
 *   height      — the main pane's height, a number of pixels or any CSS
 *                 length (the desktop passes a clamp()); 220 by default
 *   rsiHeight   — the height in pixels of EACH separate indicator pane; 80
 *                 by default (the name is historical: RSI was the only one)
 */
export default function CandleChart({
  candles,
  intraday = true,
  indicators = EMPTY_KEYS,
  fontSize = 11,
  magnet = false,
  onCrosshair,
  resetKey,
  ref,
  hideReadout = false,
  height: mainHeight = MAIN_HEIGHT,
  rsiHeight: paneHeight = RSI_HEIGHT,
}) {
  const keys = Array.isArray(indicators) ? indicators : EMPTY_KEYS
  // The identity the effects key on: a new array of the same keys must not
  // count as a change, or every parent render would rebuild the chart.
  const keysKey = keys.join('|')
  // Read inside redrawIndicators, which is built by the data effect and also
  // called by the theme observer — both need the CURRENT list, not the one
  // captured when they were created.
  const keysRef = useRef(keys)
  keysRef.current = keys

  const hostRef = useRef(null)
  const chartRef = useRef(null) // { chart, candle, volume, indicatorSeries, … }
  const [ready, setReady] = useState(false)
  // The bar under the crosshair, or null for "the latest".
  const [hover, setHover] = useState(null)
  // Latest callback, read by the one crosshair subscription made at mount.
  const onCrosshairRef = useRef(onCrosshair)
  useEffect(() => {
    onCrosshairRef.current = onCrosshair
  })
  // The resetKey the last fitContent() ran for (see the data effect).
  const lastFitKey = useRef(undefined)

  // Build the chart on mount; tear it down on unmount. The axis mode
  // (intraday) is applied again by the data effect, so it is not a
  // dependency here — a new timeframe never rebuilds the chart. Likewise
  // fontSize and magnet: their own effect below applies them once `ready`
  // flips, before the skeleton lifts, and again whenever they change.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const c = themeColors()
    const chart = lib.createChart(host, { autoSize: true, ...chartOptions(c, false) })
    const candle = chart.addSeries(lib.CandlestickSeries, {
      upColor: c.up,
      downColor: c.down,
      borderVisible: false,
      wickUpColor: c.up,
      wickDownColor: c.down,
      priceFormat,
    })
    // Volume rides the bottom fifth of the main pane on its own hidden scale.
    const volume = chart.addSeries(lib.HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    const refs = {
      chart,
      candle,
      volume,
      // Every indicator line currently on the chart, in the order the active
      // list put them. Rebuilt wholesale — see rebuildIndicators.
      indicatorSeries: [],
      paneCount: 1,
      intraday: false,
      fontSize: 11,
      magnet: false,
      volumeColors: { up: c.up, down: c.down },
      repaintVolume: null,
      redrawIndicators: null,
    }
    chartRef.current = refs

    chart.subscribeCrosshairMove((param) => {
      const bar = param.time != null ? param.seriesData.get(candle) : null
      const next = bar && Number.isFinite(bar.close) ? { ...bar, time: param.time } : null
      setHover(next)
      onCrosshairRef.current?.(next)
    })

    // Theme flips toggle a class on <html>; recolour without rebuilding.
    const observer = new MutationObserver(() => {
      const t = themeColors()
      chart.applyOptions(chartOptions(t, refs.intraday, refs.fontSize, refs.magnet))
      candle.applyOptions({ upColor: t.up, downColor: t.down, wickUpColor: t.up, wickDownColor: t.down })
      refs.volumeColors = { up: t.up, down: t.down }
      refs.repaintVolume?.()
      // Indicator panes carry band lines in theme colours too, so they are
      // rebuilt rather than recoloured in place.
      refs.redrawIndicators?.()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    setReady(true)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      setReady(false)
    }
  }, [])

  // Text size and crosshair mode, applied without a rebuild. The theme
  // observer re-applies the whole option set, so it reads them from refs.
  useEffect(() => {
    const refs = chartRef.current
    if (!ready || !refs) return
    refs.fontSize = fontSize
    refs.magnet = magnet
    refs.chart.applyOptions({
      layout: { fontSize },
      crosshair: { mode: magnet ? lib.CrosshairMode.Magnet : lib.CrosshairMode.Normal },
    })
  }, [ready, fontSize, magnet])

  // Data: whenever the candles change, push every series and refit — unless
  // a resetKey is in play, in which case only a NEW key refits: the desktop
  // refreshes the same timeframe every 30 seconds and a refit there would
  // throw away the user's zoom (the phone passes no key and refits always).
  useEffect(() => {
    const refs = chartRef.current
    if (!ready || !refs) return
    refs.repaintVolume = () => refs.volume.setData(toVolumeData(candles, refs.volumeColors))
    refs.candle.setData(toCandlestickData(candles))
    refs.repaintVolume()
    // New bars mean new indicator values, so the lines are rebuilt with the
    // data. redrawIndicators closes over the current candles and keys, and
    // the theme observer calls it too.
    refs.redrawIndicators = () =>
      rebuildIndicators(refs, keysRef.current, candles, themeColors(), paneHeight)
    refs.redrawIndicators()
    refs.intraday = intraday
    refs.chart.applyOptions({ timeScale: { timeVisible: intraday } })
    if (resetKey === undefined || lastFitKey.current !== resetKey) {
      refs.chart.timeScale().fitContent()
      lastFitKey.current = resetKey
    }
    setHover(null)
    onCrosshairRef.current?.(null)
  }, [ready, candles, intraday, resetKey, paneHeight])

  // The toolbar's handle. Each method reads the live chart when called, so
  // the object never needs rebuilding; before mount they are no-ops.
  useImperativeHandle(
    ref,
    () => ({
      // "Reset chart view": fit every bar and hand the price scale back to
      // auto — the two things a drag on either axis takes away.
      reset() {
        const refs = chartRef.current
        if (!refs) return
        refs.chart.timeScale().fitContent()
        refs.chart.priceScale('right').applyOptions({ autoScale: true })
      },
      scrollToLatest() {
        chartRef.current?.chart.timeScale().scrollToRealTime()
      },
      setLog(on) {
        chartRef.current?.chart
          .priceScale('right')
          .applyOptions({ mode: on ? lib.PriceScaleMode.Logarithmic : lib.PriceScaleMode.Normal })
      },
      isAuto() {
        return chartRef.current?.chart.priceScale('right').options().autoScale ?? true
      },
      setAuto() {
        chartRef.current?.chart.priceScale('right').applyOptions({ autoScale: true })
      },
    }),
    []
  )

  // The active list changed: redraw the indicator layer. Keyed on the joined
  // list rather than the array, so a caller that rebuilds an equal array on
  // every render does not tear the chart down each time.
  useEffect(() => {
    const refs = chartRef.current
    if (!ready || !refs || !refs.redrawIndicators) return
    refs.redrawIndicators()
  }, [ready, keysKey, paneHeight])

  // A number adds up in pixels; a CSS length (the desktop's clamp()) adds up
  // in calc(). With no extra pane the main height stands alone either way.
  const extraPanes = keys.filter((k) => parseKey(k)?.entry.pane === 'separate').length
  const rsiExtra = extraPanes * paneHeight
  const height =
    typeof mainHeight === 'number'
      ? mainHeight + rsiExtra
      : rsiExtra
        ? `calc(${mainHeight} + ${rsiExtra}px)`
        : mainHeight

  const last = candles?.length ? candles[candles.length - 1] : null
  const shown = hover ?? last
  const dir = shown ? shown.close - shown.open : null
  const closeColor = dir == null ? 'text-zinc-300' : dir > 0 ? 'text-gain' : dir < 0 ? 'text-loss' : 'text-zinc-300'

  return (
    <div>
      {/* OHLC readout: the bar under the finger, or the latest. Same job as
          the scrub readout on the Gap chart, in a caption's voice. */}
      {!hideReadout && (
      <div className="num t-caption flex flex-wrap items-baseline gap-x-3 px-1 text-zinc-500">
        {shown ? (
          <>
            <span>
              O <span className="text-zinc-300">{formatPrice(shown.open)}</span>
            </span>
            <span>
              H <span className="text-zinc-300">{formatPrice(shown.high)}</span>
            </span>
            <span>
              L <span className="text-zinc-300">{formatPrice(shown.low)}</span>
            </span>
            <span>
              C <span className={closeColor}>{formatPrice(shown.close)}</span>
            </span>
            <span className="ml-auto text-zinc-600">{whenLabel(shown.time, intraday)}</span>
          </>
        ) : (
          <span>{EM_DASH}</span>
        )}
      </div>
      )}
      <div className={hideReadout ? 'relative' : 'relative mt-1.5'} style={{ height }}>
        {!ready && <div className="absolute inset-0 animate-pulse rounded-2xl bg-zinc-900" />}
        <div ref={hostRef} className="h-full w-full" />
      </div>
      <p className="t-caption mt-1 px-1 text-right text-zinc-600">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity active:opacity-60"
        >
          Charts by TradingView
        </a>
      </p>
    </div>
  )
}
