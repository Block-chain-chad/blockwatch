import { describe, it, expect } from 'vitest'
import { NOTIFY_KEY, alertNotification, unseenEvents, notifyOfferVisible, shouldPost } from './alertNotify'

const DRIFT = {
  id: 'nvdax-d-1', kind: 'alert', type: 'drift', assetId: 'nvdax', ticker: 'NVDAx', underlying: 'NVDA',
  premium: 1.42, threshold: 1, at: 1000,
}
const PRICE = {
  id: 'nvdax-p-2', kind: 'alert', type: 'price', assetId: 'nvdax', ticker: 'NVDAx',
  target: 220, direction: 'above', price: 220.5, at: 2000,
}

describe('alertNotification', () => {
  it('titles a drift with the Meter headline and says what crossed', () => {
    expect(alertNotification(DRIFT)).toEqual({
      title: 'NVDAx +1.42% gap',
      body: 'NVDAx drifted +1.42% from NVDA. Crossed your ±1% drift alert.',
      tag: 'nvdax',
    })
    expect(alertNotification({ ...DRIFT, premium: -0.31, threshold: 0.5 })).toEqual({
      title: 'NVDAx −0.31% gap',
      body: 'NVDAx drifted −0.31% from NVDA. Crossed your ±0.5% drift alert.',
      tag: 'nvdax',
    })
  })

  it('titles a price target with the crossing and says where it trades', () => {
    expect(alertNotification(PRICE)).toEqual({
      title: 'NVDAx crossed $220.00',
      body: 'Your price target hit — trading at $220.50.',
      tag: 'nvdax',
    })
  })

  it('tags by asset so repeats collapse', () => {
    expect(alertNotification(DRIFT).tag).toBe(alertNotification(PRICE).tag)
    expect(alertNotification({ ...DRIFT, assetId: 'tslax' }).tag).toBe('tslax')
  })
})

describe('unseenEvents', () => {
  const events = [{ at: 3 }, { at: 2 }, { at: 1 }] // AlertsContext keeps newest first
  it('returns the events after the cursor, oldest first', () => {
    expect(unseenEvents(events, 1)).toEqual([{ at: 2 }, { at: 3 }])
    expect(unseenEvents(events, 0)).toEqual([{ at: 1 }, { at: 2 }, { at: 3 }])
  })
  it('is empty at or past the newest, and for no events', () => {
    expect(unseenEvents(events, 3)).toEqual([])
    expect(unseenEvents(events, 99)).toEqual([])
    expect(unseenEvents([], 0)).toEqual([])
    expect(unseenEvents(undefined, 0)).toEqual([])
  })
  it('does not mutate the list', () => {
    const copy = [...events]
    unseenEvents(events, 0)
    expect(events).toEqual(copy)
  })
})

describe('notifyOfferVisible', () => {
  it('offers only while the browser has not been asked and the app has not been told no', () => {
    expect(notifyOfferVisible({ permission: 'default', saved: null })).toBe(true)
    expect(notifyOfferVisible({ permission: 'default', saved: undefined })).toBe(true)
    expect(notifyOfferVisible({ permission: 'default', saved: 'declined' })).toBe(false)
    expect(notifyOfferVisible({ permission: 'granted', saved: null })).toBe(false)
    expect(notifyOfferVisible({ permission: 'denied', saved: null })).toBe(false)
    expect(notifyOfferVisible({ permission: null, saved: null })).toBe(false)
  })
  it('asks again when the browser forgot a grant this app remembers', () => {
    expect(notifyOfferVisible({ permission: 'default', saved: 'on' })).toBe(true)
  })
})

describe('shouldPost', () => {
  it('posts only when granted and the reader is not looking at the tab', () => {
    expect(shouldPost({ permission: 'granted', hidden: true, focused: false })).toBe(true)
    expect(shouldPost({ permission: 'granted', hidden: false, focused: false })).toBe(true)
    expect(shouldPost({ permission: 'granted', hidden: false, focused: true })).toBe(false)
    expect(shouldPost({ permission: 'default', hidden: true, focused: false })).toBe(false)
    expect(shouldPost({ permission: 'denied', hidden: true, focused: false })).toBe(false)
  })
})

describe('NOTIFY_KEY', () => {
  it('is a bw.meter key', () => {
    expect(NOTIFY_KEY).toBe('bw.meter.notify.v1')
  })
})
