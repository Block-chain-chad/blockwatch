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

// The ask for system notifications now lives in services/notifications.js.
// Stubbed so the test can prove the sheet does not make it while rendering.
vi.mock('../services/notifications', () => ({
  requestNotificationPermission: vi.fn(() => Promise.resolve('granted')),
  permissionOutcome: (r) => r,
}))

// The sheet reads the alert store on render; no provider exists here.
vi.mock('../state/AlertsContext', () => ({
  useAlerts: () => ({
    rules: {},
    setDriftAlert: () => {},
    setPriceAlert: () => {},
    removeAlert: () => {},
  }),
}))

const { requestNotificationPermission } = await import('../services/notifications')
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

  it('says a drift alert only fires while the market is open and the share quote is recent', () => {
    const html = render()
    expect(html).toContain('while the US market is open')
    expect(html).toContain('NVDA quote is recent')
  })

  it('names the asset’s own underlying in that promise', () => {
    expect(render({ underlying: 'TSLA', ticker: 'TSLAx' })).toContain('TSLA quote is recent')
  })

  it('still warns separately about a thinly traded token', () => {
    const html = render({ volume24h: 1_000 })
    expect(html).toContain('trades thinly')
    // The two cautions are different claims and both belong on screen.
    expect(html).toContain('while the US market is open')
  })
})

/*
 * The one-time ask for system notifications. Rendering must never ask and
 * never record an answer: React runs a component body twice under StrictMode,
 * and a permission bubble nobody pressed a button for is both a broken
 * browser contract and a false product number. The event itself is covered in
 * services/notifications.test.js.
 */
describe('the notification offer', () => {
  it('shows the ask on the desktop sheet when the browser has not been asked', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    const html = renderToStaticMarkup(
      <SetAlertSheet asset={asset} onClose={() => {}} notify />,
    )
    expect(html).toContain('Get a system notification')
  })

  it('asks nothing while rendering, however many times React renders', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    for (let i = 0; i < 3; i++) {
      renderToStaticMarkup(<SetAlertSheet asset={asset} onClose={() => {}} notify />)
    }
    expect(requestNotificationPermission).not.toHaveBeenCalled()
  })

  it('does not offer at all on the phone sheet, which passes no notify', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    const html = renderToStaticMarkup(<SetAlertSheet asset={asset} onClose={() => {}} />)
    expect(html).not.toContain('Get a system notification')
    expect(requestNotificationPermission).not.toHaveBeenCalled()
  })
})
