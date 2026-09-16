import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * The one-time ask for system notifications, and the single event that comes
 * out of it. Someone who says yes has handed us a reason to bring them back,
 * so "how many say yes" is the number this exists to answer — and it is only
 * true if every answer is counted once and a refusal to ask is counted as
 * nothing at all.
 *
 * Both browser shapes are covered: the promise every current browser returns,
 * and the callback older Safari takes instead.
 */

vi.mock('./analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))

const { track } = await import('./analytics')
const { requestNotificationPermission, permissionOutcome } = await import('./notifications')

/** A browser that answers through the returned promise. */
function promiseStyle(answer) {
  vi.stubGlobal('Notification', { requestPermission: () => Promise.resolve(answer) })
}

/** Older Safari: takes a callback, returns undefined. */
function callbackStyle(answer) {
  vi.stubGlobal('Notification', {
    requestPermission: (cb) => {
      cb(answer)
    },
  })
}

beforeEach(() => {
  track.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('permissionOutcome', () => {
  it('passes through the two answers the browser actually commits to', () => {
    expect(permissionOutcome('granted')).toBe('granted')
    expect(permissionOutcome('denied')).toBe('denied')
  })

  it('reads anything else as default — dismissed, or a browser that said nothing', () => {
    for (const odd of ['default', undefined, null, '', 'GRANTED', 0, {}]) {
      expect(permissionOutcome(odd)).toBe('default')
    }
  })
})

describe('requestNotificationPermission', () => {
  it('counts a yes once, and says so', async () => {
    promiseStyle('granted')
    await expect(requestNotificationPermission()).resolves.toBe('granted')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('notification_permission', { result: 'granted' })
  })

  it('counts a no once, and says so', async () => {
    promiseStyle('denied')
    await expect(requestNotificationPermission()).resolves.toBe('denied')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('notification_permission', { result: 'denied' })
  })

  it('counts a dismissed bubble as default', async () => {
    promiseStyle('default')
    await expect(requestNotificationPermission()).resolves.toBe('default')
    expect(track).toHaveBeenCalledWith('notification_permission', { result: 'default' })
  })

  it('counts the callback-style answer the same way, and only once', async () => {
    callbackStyle('granted')
    await expect(requestNotificationPermission()).resolves.toBe('granted')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('notification_permission', { result: 'granted' })
  })

  it('counts nothing when the browser refuses to ask at all', async () => {
    vi.stubGlobal('Notification', undefined)
    await expect(requestNotificationPermission()).rejects.toBeDefined()
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing when requestPermission itself throws', async () => {
    vi.stubGlobal('Notification', {
      requestPermission: () => {
        throw new Error('no user gesture')
      },
    })
    await expect(requestNotificationPermission()).rejects.toThrow('no user gesture')
    expect(track).not.toHaveBeenCalled()
  })

  it('carries nothing but the answer', async () => {
    promiseStyle('granted')
    await requestNotificationPermission()
    expect(track.mock.calls[0][1]).toEqual({ result: 'granted' })
  })
})
