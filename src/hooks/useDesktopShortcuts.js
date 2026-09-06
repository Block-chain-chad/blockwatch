import { useEffect, useRef } from 'react'
import { classifyKey, keyContext, isMacPlatform } from '../lib/desktopKeys'
import { stepId } from '../lib/desktopState'

/*
 * The desktop keyboard map (spec §6.10), mounted once by DesktopShell as the
 * shell's only window keydown listener. What each key means is decided by
 * lib/desktopKeys.js (pure, tested); this hook only wires the actions to the
 * things that do them. Nothing here runs on phones — the shell is the only
 * caller.
 *
 * `opts` is read through a ref on every key press, so the caller passes
 * fresh values each render without re-subscribing:
 *
 *   searchRef     — SymbolSearch's handle: focus(prefill), close() → bool
 *   chartRef      — ChartWorkspace's handle (a ref object whose .current
 *                   the workspace fills): mode, openIntervalPrompt(prefill),
 *                   closePrompt() → bool, reset(), toggleLog(),
 *                   focusIndicators(), openAlert()
 *   ids           — the right column's visible asset ids, for ↓/↑
 *   currentId     — the selected asset
 *   onSelectAsset — select an asset by id
 *   onToggleWatchlist — Alt+W
 *   onFullscreen  — Shift+F (toggle)
 *   onExitFullscreen — Esc's last resort
 *   onShortcuts   — Ctrl+/ opens the sheet
 *
 * Esc closes the top-most thing, in order: the search popover, the interval
 * prompt, then fullscreen. A Sheet owns its own Esc (classifyKey returns
 * nothing inside one), so a dialog never leaks a key to the shell.
 */
export function useDesktopShortcuts(opts) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const mac = isMacPlatform()
    function onKeyDown(e) {
      if (e.defaultPrevented || e.isComposing) return
      const action = classifyKey(e, { mac, ...keyContext(e.target) })
      if (!action) return
      const o = optsRef.current ?? {}
      const chart = o.chartRef?.current
      switch (action.type) {
        case 'focusSearch':
          e.preventDefault()
          o.searchRef?.current?.focus(action.prefill)
          break
        case 'interval':
          if (!chart) return
          e.preventDefault()
          chart.openIntervalPrompt(action.prefill)
          break
        case 'indicators':
          if (chart?.mode !== 'candles') return
          e.preventDefault()
          chart.focusIndicators()
          break
        case 'step': {
          const next = stepId(o.ids ?? [], o.currentId, action.delta)
          // Space must never scroll the page; the arrows must not either
          // while they mean "next symbol".
          e.preventDefault()
          if (next != null && next !== o.currentId) o.onSelectAsset?.(next)
          break
        }
        case 'watchlist':
          if (o.currentId == null) return
          e.preventDefault()
          o.onToggleWatchlist?.(o.currentId)
          break
        case 'alert':
          if (!chart) return
          e.preventDefault()
          chart.openAlert()
          break
        case 'reset':
          if (chart?.mode !== 'candles') return
          e.preventDefault()
          chart.reset()
          break
        case 'log':
          if (chart?.mode !== 'candles') return
          e.preventDefault()
          chart.toggleLog()
          break
        case 'fullscreen':
          e.preventDefault()
          o.onFullscreen?.()
          break
        case 'shortcuts':
          e.preventDefault()
          o.onShortcuts?.()
          break
        case 'escape':
          if (o.searchRef?.current?.close?.()) return
          if (chart?.closePrompt?.()) return
          o.onExitFullscreen?.()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export default useDesktopShortcuts
