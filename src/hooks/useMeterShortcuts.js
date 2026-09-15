import { useEffect, useRef } from 'react'
import { classifyMeterKey, keyContext, isControl, isMacPlatform } from '../lib/meterKeys'

/*
 * The Meter's keyboard map, mounted once by MeterShell as its only window
 * keydown listener. lib/meterKeys.js decides what a key means; this hook
 * wires the action to the thing that does it. `opts` is read through a ref
 * on every press so the caller passes fresh values without re-subscribing.
 *
 *   scope        'board' | 'chart' — which map is live
 *   searchRef    SymbolSearch's handle: focus(prefill), close() → bool
 *   boardRef     Board's handle: step(delta), expand(open), select(), focusedId()
 *   chartRef     ChartWorkspace's handle (closePrompt() → bool is the only member used here)
 *   onWatch(id) / onAlert(id) / onChart() / onFullscreen() / onExitFullscreen() → bool
 *   onExitChart() → bool / onShortcuts() / onIndicators()
 *
 * Esc closes the top-most thing, in order: the search popover, the chart's
 * interval prompt, fullscreen, then the chart itself.
 */
export function useMeterShortcuts(opts) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const mac = isMacPlatform()
    function onKeyDown(e) {
      if (e.defaultPrevented || e.isComposing) return
      const o = optsRef.current ?? {}
      const action = classifyMeterKey(e, {
        mac,
        scope: o.scope ?? 'board',
        control: isControl(e.target),
        ...keyContext(e.target),
      })
      if (!action) return
      const board = o.boardRef?.current
      switch (action.type) {
        case 'focusSearch':
          e.preventDefault()
          o.searchRef?.current?.focus('')
          break
        case 'step':
          e.preventDefault()
          board?.step(action.delta)
          break
        case 'expand':
          e.preventDefault()
          board?.expand(action.open)
          break
        case 'select':
          e.preventDefault()
          board?.select()
          break
        case 'watch': {
          const id = board?.focusedId?.()
          if (id) {
            e.preventDefault()
            o.onWatch?.(id)
          }
          break
        }
        case 'alert': {
          const id = board?.focusedId?.()
          if (id) {
            e.preventDefault()
            o.onAlert?.(id)
          }
          break
        }
        case 'chart':
          e.preventDefault()
          o.onChart?.()
          break
        case 'fullscreen':
          e.preventDefault()
          o.onFullscreen?.()
          break
        case 'indicators':
          e.preventDefault()
          o.onIndicators?.()
          break
        case 'shortcuts':
          e.preventDefault()
          o.onShortcuts?.()
          break
        case 'escape':
          if (o.searchRef?.current?.close?.()) return
          if (o.chartRef?.current?.closePrompt?.()) return
          if (o.onExitFullscreen?.()) return
          o.onExitChart?.()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export default useMeterShortcuts
