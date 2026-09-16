import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * notification_shown — one event per notification the browser actually
 * accepted. This is the strongest retention signal the app has: it is the app
 * reaching out to someone who is not looking at it.
 *
 * There is no DOM in this suite and no renderer, so the two React hooks this
 * file uses are replaced with the smallest honest stand-ins: useEffect runs
 * its body immediately, and useRef keeps one box across calls. Calling
 * useAlertNotifications() is then exactly one render plus its effect, which
 * is what the assertions are about. The rest of the hook — the real cursor,
 * the real shouldPost gate, the real notification text — is untouched.
 *
 * What is being defended:
 *   1. The events already on file when the shell mounts are not replayed, so
 *      a reload does not invent a burst of notifications.
 *   2. One event per notification posted, never per render.
 *   3. A notification the browser refused counts nothing — nobody saw it.
 */

const hooks = vi.hoisted(() => ({ refs: [], index: 0 }))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRef: (initial) => {
      const i = hooks.index++
      if (!hooks.refs[i]) hooks.refs[i] = { current: initial }
      return hooks.refs[i]
    },
    useEffect: (fn) => {
      fn()
    },
  }
})

const alertsState = vi.hoisted(() => ({ events: [] }))
vi.mock('../state/AlertsContext', () => ({ useAlerts: () => ({ events: alertsState.events }) }))
vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))

const { track } = await import('../services/analytics')
const { useAlertNotifications } = await import('./useAlertNotifications')

const driftEvent = (at) => ({
  type: 'drift',
  at,
  assetId: 'nvidia-xstock',
  ticker: 'NVDAx',
  underlying: 'NVDA',
  premium: 1.42,
  threshold: 1,
})

let posted

/** One render of the component that owns this hook, with `events` in place. */
function render(events) {
  alertsState.events = events
  hooks.index = 0
  // Standing in for MeterShell, which is the real caller. The hooks this file
  // replaces above are what make that legal here.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useAlertNotifications()
}

/** A fresh mount: the ref box is what survives renders, so drop it. */
function remount() {
  hooks.refs = []
}

beforeEach(() => {
  remount()
  track.mockClear()
  posted = []
  vi.stubGlobal(
    'Notification',
    Object.assign(
      class {
        constructor(title, options) {
          posted.push({ title, options })
        }
      },
      { permission: 'granted' },
    ),
  )
  // Nobody is looking at the tab, so a fired alert is allowed to post.
  vi.stubGlobal('document', { hidden: true, hasFocus: () => false })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('notification_shown', () => {
  it('counts nothing for the events already stored when the shell mounts', () => {
    render([driftEvent(1000), driftEvent(2000)])
    expect(posted).toHaveLength(0)
    expect(track).not.toHaveBeenCalled()
  })

  it('counts one event per notification posted, with no properties', () => {
    render([driftEvent(1000)])
    render([driftEvent(2000), driftEvent(1000)])
    expect(posted).toHaveLength(1)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('notification_shown')
  })

  it('counts each notification when several fire at once', () => {
    render([driftEvent(1000)])
    render([driftEvent(3000), driftEvent(2000), driftEvent(1000)])
    expect(posted).toHaveLength(2)
    expect(track).toHaveBeenCalledTimes(2)
  })

  it('counts nothing on a re-render that brings no new event', () => {
    render([driftEvent(1000)])
    render([driftEvent(2000), driftEvent(1000)])
    track.mockClear()
    render([driftEvent(2000), driftEvent(1000)])
    render([driftEvent(2000), driftEvent(1000)])
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing while the reader is looking at the tab', () => {
    vi.stubGlobal('document', { hidden: false, hasFocus: () => true })
    render([driftEvent(1000)])
    render([driftEvent(2000), driftEvent(1000)])
    expect(posted).toHaveLength(0)
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing when permission was never granted', () => {
    vi.stubGlobal(
      'Notification',
      Object.assign(
        class {
          constructor() {
            posted.push({})
          }
        },
        { permission: 'default' },
      ),
    )
    render([driftEvent(1000)])
    render([driftEvent(2000), driftEvent(1000)])
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing when the browser refuses the notification it was handed', () => {
    vi.stubGlobal(
      'Notification',
      Object.assign(
        class {
          constructor() {
            throw new Error('notifications are not allowed in this context')
          }
        },
        { permission: 'granted' },
      ),
    )
    render([driftEvent(1000)])
    render([driftEvent(2000), driftEvent(1000)])
    expect(track).not.toHaveBeenCalled()
  })
})
