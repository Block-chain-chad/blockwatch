import { useEffect, useRef, useState } from 'react'
import * as lib from 'lightweight-charts'
import { toCandlestickData, toVolumeData, indicatorLines } from '../lib/candleSeries'
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
    // The same pair the Gap chart uses for its two lines: accent and neutral.
    sma20: token('--color-accent', '#2dd4bf'),
    ema50: token('--color-zinc-300', '#d0d2d8'),
    rsi14: token('--color-zinc-400', '#b3b6be'),
    crosshair: token('--color-zinc-600', '#6b6f78'),
    surface: token('--color-zinc-800', '#26272b'),
  }
}

function chartOptions(c, intraday) {
  return {
    layout: {
      background: { type: lib.ColorType.Solid, color: 'transparent' },
      textColor: c.text,
      fontSize: 11,
      // Attribution is the "Charts by TradingView" link rendered beside the
      // chart instead, where it reads as a caption rather than a watermark.
      attributionLogo: false,
      panes: { separatorColor: c.axis, separatorHoverColor: c.axis, enableResize: false },
    },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    rightPriceScale: { borderColor: c.axis },
    timeScale: { borderColor: c.axis, timeVisible: intraday, secondsVisible: false, rightOffset: 2 },
    crosshair: {
      mode: lib.CrosshairMode.Normal,
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
 * Props:
 *   candles     — shared shape, ascending; the caller has already decided
 *                 there is something to draw
 *   intraday    — bars shorter than a day (axis shows clock time)
 *   indicators  — { sma20, ema50, rsi14 } booleans
 */
export default function CandleChart({ candles, intraday = true, indicators = {} }) {
  const hostRef = useRef(null)
  const chartRef = useRef(null) // { chart, candle, volume, sma20, ema50, rsi14, … }
  const [ready, setReady] = useState(false)
  // The bar under the crosshair, or null for "the latest".
  const [hover, setHover] = useState(null)

  // Build the chart on mount; tear it down on unmount. The axis mode
  // (intraday) is applied again by the data effect, so it is not a
  // dependency here — a new timeframe never rebuilds the chart.
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
    const overlay = (color) =>
      chart.addSeries(lib.LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
        priceFormat,
      })
    const refs = {
      chart,
      candle,
      volume,
      sma20: overlay(c.sma20),
      ema50: overlay(c.ema50),
      rsi14: null,
      intraday: false,
      volumeColors: { up: c.up, down: c.down },
      repaintVolume: null,
      lines: null,
    }
    chartRef.current = refs

    chart.subscribeCrosshairMove((param) => {
      const bar = param.time != null ? param.seriesData.get(candle) : null
      setHover(bar && Number.isFinite(bar.close) ? { ...bar, time: param.time } : null)
    })

    // Theme flips toggle a class on <html>; recolour without rebuilding.
    const observer = new MutationObserver(() => {
      const t = themeColors()
      chart.applyOptions(chartOptions(t, refs.intraday))
      candle.applyOptions({ upColor: t.up, downColor: t.down, wickUpColor: t.up, wickDownColor: t.down })
      refs.sma20.applyOptions({ color: t.sma20 })
      refs.ema50.applyOptions({ color: t.ema50 })
      refs.rsi14?.applyOptions({ color: t.rsi14 })
      refs.volumeColors = { up: t.up, down: t.down }
      refs.repaintVolume?.()
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

  // Data: whenever the candles change, push every series and refit.
  useEffect(() => {
    const refs = chartRef.current
    if (!ready || !refs) return
    refs.repaintVolume = () => refs.volume.setData(toVolumeData(candles, refs.volumeColors))
    refs.candle.setData(toCandlestickData(candles))
    refs.repaintVolume()
    const lines = indicatorLines(candles)
    refs.lines = lines
    refs.sma20.setData(lines.sma20)
    refs.ema50.setData(lines.ema50)
    refs.rsi14?.setData(lines.rsi14)
    refs.intraday = intraday
    refs.chart.applyOptions({ timeScale: { timeVisible: intraday } })
    refs.chart.timeScale().fitContent()
    setHover(null)
  }, [ready, candles, intraday])

  // Indicator toggles: overlays flip visibility; RSI adds or removes its pane.
  useEffect(() => {
    const refs = chartRef.current
    if (!ready || !refs) return
    refs.sma20.applyOptions({ visible: !!indicators.sma20 })
    refs.ema50.applyOptions({ visible: !!indicators.ema50 })
    const wantRsi = !!indicators.rsi14
    if (wantRsi && !refs.rsi14) {
      const c = themeColors()
      const rsi = refs.chart.addSeries(
        lib.LineSeries,
        {
          color: c.rsi14,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          priceFormat: { type: 'custom', formatter: (v) => v.toFixed(0), minMove: 1 },
          autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
        },
        1
      )
      // The bands the reading is judged against, as hairlines.
      for (const level of [30, 70]) {
        rsi.createPriceLine({
          price: level,
          color: c.axis,
          lineWidth: 1,
          lineStyle: lib.LineStyle.Solid,
          axisLabelVisible: false,
        })
      }
      rsi.setData(refs.lines?.rsi14 ?? [])
      refs.chart.panes()[1]?.setHeight(RSI_HEIGHT)
      refs.rsi14 = rsi
    } else if (!wantRsi && refs.rsi14) {
      refs.chart.removeSeries(refs.rsi14)
      refs.rsi14 = null
      // Removing the last series leaves an empty pane behind in some builds.
      if (refs.chart.panes().length > 1) refs.chart.removePane(1)
    }
  }, [ready, indicators.sma20, indicators.ema50, indicators.rsi14])

  const height = MAIN_HEIGHT + (indicators.rsi14 ? RSI_HEIGHT : 0)

  const last = candles?.length ? candles[candles.length - 1] : null
  const shown = hover ?? last
  const dir = shown ? shown.close - shown.open : null
  const closeColor = dir == null ? 'text-zinc-300' : dir > 0 ? 'text-gain' : dir < 0 ? 'text-loss' : 'text-zinc-300'

  return (
    <div>
      {/* OHLC readout: the bar under the finger, or the latest. Same job as
          the scrub readout on the Gap chart, in a caption's voice. */}
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
      <div className="relative mt-1.5" style={{ height }}>
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
