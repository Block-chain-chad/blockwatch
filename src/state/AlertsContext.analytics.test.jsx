import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * alert_created, from AlertsProvider — the one place both alert types are
 * written, and therefore the one place that can count them without a second
 * screen quietly going uncounted later. Same probe-the-provider approach as
 * state/FoldersContext.analytics.test.jsx; the reasoning is written out there.
 *
 * The event's name is the claim under test: moving an existing alert's
 * threshold is an update, not a creation, and must not count twice.
 */

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: null, ready: false }) }))
vi.mock('./PricesContext', () => ({
  usePrices: () => ({ assets: [], session: 'regular' }),
  useAssetSubscription: () => {},
}))

const { track } = await import('../services/analytics')
const { AlertsProvider, useAlerts } = await import('./AlertsContext')

const ASSET = 'nvidia-xstock'

/** Mount against whatever is already stored (null = a device with no alerts). */
function mount(stored = null) {
  vi.stubGlobal('localStorage', {
    getItem: () => (stored == null ? null : JSON.stringify(stored)),
    setItem: () => {},
    removeItem: () => {},
  })
  let api = null
  function Probe() {
    api = useAlerts()
    return null
  }
  renderToStaticMarkup(
    <AlertsProvider>
      <Probe />
    </AlertsProvider>,
  )
  return api
}

beforeEach(() => {
  track.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('alert_created', () => {
  it('fires nothing on render, however many times React renders', () => {
    mount()
    mount()
    expect(track).not.toHaveBeenCalled()
  })

  it('counts a first drift alert once', () => {
    const alerts = mount()
    alerts.setDriftAlert(ASSET, 1)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('alert_created', { type: 'drift' })
  })

  it('counts a first price target once, as type target', () => {
    const alerts = mount()
    alerts.setPriceAlert(ASSET, 220, 'above')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('alert_created', { type: 'target' })
  })

  it('does not count moving the threshold of a drift alert that already exists', () => {
    const alerts = mount({ rules: { [ASSET]: { drift: { threshold: 1 } } } })
    alerts.setDriftAlert(ASSET, 5)
    expect(track).not.toHaveBeenCalled()
  })

  it('does not count re-setting a price target that already exists', () => {
    const alerts = mount({ rules: { [ASSET]: { price: { target: 220, direction: 'above' } } } })
    alerts.setPriceAlert(ASSET, 250, 'above')
    expect(track).not.toHaveBeenCalled()
  })

  it('counts a drift alert on an asset that so far only has a price target', () => {
    const alerts = mount({ rules: { [ASSET]: { price: { target: 220, direction: 'above' } } } })
    alerts.setDriftAlert(ASSET, 2)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('alert_created', { type: 'drift' })
  })

  it('never puts the asset or the threshold in a property', () => {
    const alerts = mount()
    alerts.setDriftAlert(ASSET, 5)
    const sent = JSON.stringify(track.mock.calls)
    expect(sent).not.toContain(ASSET)
    expect(sent).not.toContain('5')
  })
})
