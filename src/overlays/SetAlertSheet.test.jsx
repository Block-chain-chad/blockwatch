import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * A smoke render of the alert sheet, without a browser (the static-render
 * pattern from overlays/SwapSheet.test.jsx).
 *
 * What is being defended: drift alerts now only fire in the regular session
 * against a live share quote (lib/alertRules.js). A gate nobody is told about
 * reads as broken alerts, so the drift tab has to say when one can reach you.
 * Effects do not run in a static render, so this is a floor, not a substitute
 * for a real component test setup.
 */

// The sheet reads the alert store on render; no provider exists here.
vi.mock('../state/AlertsContext', () => ({
  useAlerts: () => ({
    rules: {},
    setDriftAlert: () => {},
    setPriceAlert: () => {},
    removeAlert: () => {},
  }),
}))

const { default: SetAlertSheet } = await import('./SetAlertSheet')

const asset = {
  id: 'nvdax',
  ticker: 'NVDAx',
  underlying: 'NVDA',
  tokenPrice: 218.49,
  stockPrice: 218.29,
  volume24h: 2_000_000,
}

// Sheet reads document.activeElement while rendering, to restore focus on
// close. Nothing else here touches the DOM.
beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const render = (over) =>
  renderToStaticMarkup(<SetAlertSheet asset={{ ...asset, ...over }} onClose={() => {}} />)

describe('SetAlertSheet renders', () => {
  it('opens on the drift tab with its thresholds', () => {
    const html = render()
    expect(html).toContain('Alerts for NVDAx')
    expect(html).toContain('Drift vs NVDA')
    expect(html).toContain('Set drift alert')
    expect(html).toContain('±1%')
  })

  it('says a drift alert only fires while the market is open and the share is live', () => {
    const html = render()
    expect(html).toContain('while the US market is open')
    expect(html).toContain('NVDA quote is live')
  })

  it('names the asset’s own underlying in that promise', () => {
    expect(render({ underlying: 'TSLA', ticker: 'TSLAx' })).toContain('TSLA quote is live')
  })

  it('still warns separately about a thinly traded token', () => {
    const html = render({ volume24h: 1_000 })
    expect(html).toContain('trades thinly')
    // The two cautions are different claims and both belong on screen.
    expect(html).toContain('while the US market is open')
  })
})
