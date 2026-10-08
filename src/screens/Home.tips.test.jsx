// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Home's two tip bubbles, end to end (acceptance criteria in section 7 of
 * claude/team/tips-build-brief.md). The rules themselves are tested in
 * lib/tips.test.js; this file checks what someone on Home sees and what
 * gets stored and counted.
 *
 * The watchlist is three real universe assets: TSLAx with its ratio made
 * unverified (no gap), then NVDAx (a stock) and SPYx (an ETF) with confirmed
 * gaps. Only Date is faked, to put the clock in each market session.
 */

const track = vi.fn()
vi.mock('../services/analytics', () => ({ track: (...args) => track(...args), deviceId: () => 'test-device' }))
vi.mock('../components/Header', () => ({ default: () => null }))
vi.mock('../components/TreasuryYields', () => ({ default: () => null }))
vi.mock('../components/UpdatedAgo', () => ({ default: () => null }))
vi.mock('../components/InstallPrompt', () => ({ default: () => null }))
vi.mock('../components/AssetLogo', () => ({ default: () => <span data-logo="" /> }))
vi.mock('../hooks/useSparklines', () => ({ useSparklines: () => ({}) }))

const prices = { assets: [], marketOpen: true, session: 'regular', status: 'live' }
vi.mock('../state/PricesContext', () => ({
  usePrices: () => prices,
  useAssetSubscription: () => {},
}))
const folders = { watchlistIds: [] }
vi.mock('../state/FoldersContext', () => ({ useFolders: () => folders }))

const { default: Home } = await import('./Home')
const { default: Sheet } = await import('../components/Sheet')
const { BY_ID } = await import('../data/universe')
const { sharesPerToken } = await import('../lib/gapCheck')
const { TAP_GUARD_MS } = await import('../components/TipBubble')

const OPEN = Date.parse('2026-09-30T15:00:00Z') // Wed 11:00 New York
const AFTER_HOURS = Date.parse('2026-10-01T21:00:00Z') // Thu 17:00
const THURSDAY_CLOSE = Date.parse('2026-10-01T20:00:00Z')
const WEEKEND = Date.parse('2026-10-03T15:00:00Z') // Sat 11:00
const FRIDAY_CLOSE = Date.parse('2026-10-02T20:00:00Z')

const FRIDAY_SENTENCE =
  'The US market is closed. This gap compares the token’s latest price with the share price at Friday’s close, so the two prices are from different times.'
const AFTER_HOURS_SENTENCE =
  'The share is trading outside regular hours, but this gap compares the token’s latest price with the share price at today’s close, so it may not match where the share is trading now.'
const GAP_BODY =
  'How far the token’s price sits from the price of the share it tracks: green above, red below, gray when they match. Tap a row to see both prices. A gap describes prices, not what to buy or sell.'

function priced(id, now, closeAt, over = {}) {
  const seed = BY_ID[id]
  return {
    ...seed,
    sharesPerToken: sharesPerToken(seed),
    tokenPrice: 181.24,
    stockPrice: 180.83,
    dayChange: 0.5,
    volume24h: 5_000_000,
    priceUpdatedAt: now - 60_000,
    stockQuote: { price: 180.83, asOf: closeAt ?? now - 60_000 },
    ...over,
  }
}

const TSLAX = 'tesla-xstock'
const NVDAX = 'nvidia-xstock'
const SPYX = 'sp500-xstock'

/** Put the clock at `now` and the watchlist in that session. */
function market(now, closeAt = null, { okRows = true } = {}) {
  vi.setSystemTime(now)
  const over = okRows ? {} : { sharesPerToken: null }
  prices.assets = [
    priced(TSLAX, now, closeAt, { sharesPerToken: null }),
    priced(NVDAX, now, closeAt, over),
    priced(SPYX, now, closeAt, over),
  ]
  prices.marketOpen = now === OPEN
  folders.watchlistIds = prices.assets.map((a) => a.id)
}

let store
let container
let root
const onOpenAsset = vi.fn()

function stubStorage(throwing = false) {
  store = {}
  const fail = () => {
    throw new Error('SecurityError')
  }
  vi.stubGlobal('localStorage', {
    getItem: throwing ? fail : (k) => store[k] ?? null,
    setItem: throwing ? fail : (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  })
}

function mount(props = {}) {
  act(() => root.render(<Home onOpenProfile={() => {}} onOpenAsset={onOpenAsset} onOpenSearch={() => {}} {...props} />))
}

function remount(props) {
  act(() => root.unmount())
  root = createRoot(container)
  mount(props)
}

const phoneList = () => [...container.querySelectorAll('div')].find((d) => d.className === 'lg:hidden')
const tableList = () => [...container.querySelectorAll('div')].find((d) => d.className === 'hidden lg:block')
const bubble = (list = phoneList()) => list.querySelector('[data-tip-bubble]')
const rowFor = (ticker, list = phoneList()) =>
  [...list.querySelectorAll('button')].find((b) => b.querySelector('.t-label')?.textContent === ticker)
const button = (label, scope = container) => [...scope.querySelectorAll('button')].find((b) => b.textContent === label)
const titleOf = (b) => document.getElementById(b.getAttribute('aria-labelledby'))?.textContent
const bodyOf = (b) => b.querySelector('p').textContent
const click = (el) => act(() => el.click())
/** A tap on a bubble's button, once its tap guard has passed. */
const tap = (el) => {
  vi.setSystemTime(Date.now() + TAP_GUARD_MS)
  click(el)
}
const escape = () => act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  track.mockClear()
  onOpenAsset.mockClear()
  stubStorage()
  window.matchMedia = () => ({ matches: false })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  delete window.matchMedia
})

describe('tip 1, the gap (criteria 1, 2, 6)', () => {
  it('shows under the first row with a confirmed gap, never on the unverified one, and no tip 2', () => {
    market(OPEN)
    mount()
    const b = bubble()
    expect(titleOf(b)).toBe('The gap')
    expect(bodyOf(b)).toBe(GAP_BODY)
    expect(phoneList().querySelectorAll('[data-tip-bubble]')).toHaveLength(1)
    // Right after the NVDAx row, not the TSLAx row above it.
    expect(rowFor('NVDAx').nextElementSibling.contains(b)).toBe(true)
    expect(rowFor('TSLAx').nextElementSibling).toBe(rowFor('NVDAx'))
    expect(container.textContent).not.toContain('Market closed')
  })

  it('closes on Got it, stores the old caption key, and stays closed after a reload', () => {
    market(OPEN)
    mount()
    tap(button('Got it', bubble()))
    expect(bubble()).toBeNull()
    expect(store['bw.tip.premium.v1']).toBe('1')
    remount()
    expect(bubble()).toBeNull()
  })

  it('never shows to someone who closed the old caption', () => {
    market(OPEN)
    store['bw.tip.premium.v1'] = '1'
    remount()
    expect(bubble()).toBeNull()
  })

  it('shows nothing when no row has a confirmed gap', () => {
    market(OPEN, null, { okRows: false })
    mount()
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
  })

  it('moves with a filter to the new first eligible row, or hides', () => {
    market(OPEN)
    mount()
    click(button('ETFs'))
    expect(rowFor('SPYx').nextElementSibling.contains(bubble())).toBe(true)
    click(button('Bonds'))
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
  })

  it('shows nothing until prices are live or stale', () => {
    market(OPEN)
    prices.status = 'loading'
    try {
      mount()
      expect(container.querySelector('[data-tip-bubble]')).toBeNull()
    } finally {
      prices.status = 'live'
    }
  })
})

describe('tip 2, Market closed (criteria 3, 4, 5)', () => {
  it('follows tip 1 on a weekend, on the first row’s pill, naming Friday’s close', () => {
    market(WEEKEND, FRIDAY_CLOSE)
    mount()
    expect(titleOf(bubble())).toBe('The gap')
    tap(button('Got it', bubble()))
    const b = bubble()
    expect(titleOf(b)).toBe('Market closed')
    expect(bodyOf(b)).toBe(FRIDAY_SENTENCE)
    expect(button('Why weekend prices drift', b)).toBeTruthy()
    const row = rowFor('NVDAx')
    expect(row.querySelector('[data-closed-mark]')).toBeTruthy()
    expect(row.nextElementSibling.contains(b)).toBe(true)
    tap(button('Got it', b))
    expect(bubble()).toBeNull()
    expect(store['bw.tip.closed.v1']).toBe('1')
  })

  it('survives a double tap on tip 1’s Got it: tip 2 is a new bubble and ignores the second tap', () => {
    market(WEEKEND, FRIDAY_CLOSE)
    mount()
    const first = bubble()
    tap(button('Got it', first))
    const second = bubble()
    expect(second).not.toBe(first)
    click(button('Got it', second)) // the second tap of the double tap, at once
    expect(bubble()).toBe(second)
    expect(titleOf(second)).toBe('Market closed')
    expect(store['bw.tip.closed.v1']).toBeUndefined()
    expect(track.mock.calls.filter(([e]) => e === 'tip_closed')).toEqual([['tip_closed', { tip: 'gap', how: 'got_it' }]])
    tap(button('Got it', second))
    expect(bubble()).toBeNull()
  })

  it('uses the outside-regular-hours sentence with today’s close after hours', () => {
    market(AFTER_HOURS, THURSDAY_CLOSE)
    store['bw.tip.premium.v1'] = '1'
    mount()
    expect(bodyOf(bubble())).toBe(AFTER_HOURS_SENTENCE)
  })

  it('waits while the market is open, then shows on the first visit with a pill', () => {
    market(OPEN)
    store['bw.tip.premium.v1'] = '1'
    mount()
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
    market(WEEKEND, FRIDAY_CLOSE)
    remount()
    expect(titleOf(bubble())).toBe('Market closed')
  })

  it('reads the same sentence as the pill’s desktop hover text (criterion 12)', () => {
    market(WEEKEND, FRIDAY_CLOSE)
    store['bw.tip.premium.v1'] = '1'
    mount()
    const pill = rowFor('NVDAx').querySelector('[data-closed-mark]')
    expect(pill.getAttribute('title')).toBe(bodyOf(bubble()))
  })
})

describe('sheets and overlays (criterion 7)', () => {
  it('closes the tip when its lesson opens: key written at once, one tip_closed, and it does not come back', () => {
    market(OPEN)
    mount()
    tap(button("What's a premium?", bubble()))
    expect(store['bw.tip.premium.v1']).toBe('1')
    expect(track.mock.calls.filter(([e]) => e === 'tip_closed')).toEqual([['tip_closed', { tip: 'gap', how: 'lesson' }]])
    expect(track).toHaveBeenCalledWith('learn_open', { source: 'tip', lesson: 'premium' })
    const sheet = document.querySelector('[role="dialog"]')
    expect(sheet.textContent).toContain("What's a premium?")
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
    click(button('Got it', sheet))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
  })

  it('moves the focus to the anchor row before the lesson opens, so the sheet returns it there', () => {
    market(OPEN)
    mount()
    tap(button("What's a premium?", bubble()))
    click(button('Got it', document.querySelector('[role="dialog"]')))
    expect(document.activeElement).toBe(rowFor('NVDAx'))
  })

  it('shows tip 2 on a weekend after the lesson opened from tip 1 closes', () => {
    market(WEEKEND, FRIDAY_CLOSE)
    mount()
    tap(button("What's a premium?", bubble()))
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
    click(button('Got it', document.querySelector('[role="dialog"]')))
    expect(titleOf(bubble())).toBe('Market closed')
    tap(button('Why weekend prices drift', bubble()))
    expect(store['bw.tip.closed.v1']).toBe('1')
    expect(track).toHaveBeenCalledWith('tip_closed', { tip: 'closed', how: 'lesson' })
    expect(track).toHaveBeenCalledWith('learn_open', { source: 'tip', lesson: 'weekend' })
  })

  it('hides under any other sheet', () => {
    market(OPEN)
    mount()
    const other = document.createElement('div')
    document.body.appendChild(other)
    const otherRoot = createRoot(other)
    act(() => otherRoot.render(<Sheet onClose={() => {}} label="Profile" />))
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
    act(() => otherRoot.unmount())
    other.remove()
    expect(bubble()).toBeTruthy()
  })

  it('hides under search or an open asset, which App reports as covered', () => {
    market(OPEN)
    mount({ covered: true })
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
    mount({ covered: false })
    expect(bubble()).toBeTruthy()
  })
})

describe('the three ways it counts as seen (criteria 8, 13)', () => {
  it('a row tap opens the asset and closes the tip, with no ticker in the event', () => {
    market(OPEN)
    mount()
    click(rowFor('NVDAx'))
    expect(onOpenAsset).toHaveBeenCalledWith(expect.objectContaining({ id: NVDAX }))
    expect(bubble()).toBeNull()
    expect(store['bw.tip.premium.v1']).toBe('1')
    expect(track.mock.calls.filter(([e]) => e === 'tip_closed')).toEqual([['tip_closed', { tip: 'gap', how: 'row' }]])
  })

  it('ignores the second tap of a double tap on Got it when it lands on the row under the bubble', () => {
    market(OPEN) // a weekday: no tip 2 follows, so the row under the bubble is bare
    mount()
    tap(button('Got it', bubble()))
    expect(bubble()).toBeNull()
    click(rowFor('SPYx'))
    expect(onOpenAsset).not.toHaveBeenCalled()
  })

  it('opens a row tapped 301 ms after the tip closed', () => {
    market(OPEN)
    mount()
    tap(button('Got it', bubble()))
    vi.setSystemTime(Date.now() + 301)
    click(rowFor('SPYx'))
    expect(onOpenAsset).toHaveBeenCalledWith(expect.objectContaining({ id: SPYX }))
  })

  it('guards row taps after Escape and after opening a lesson too', () => {
    market(OPEN)
    mount()
    escape()
    click(rowFor('SPYx'))
    expect(onOpenAsset).not.toHaveBeenCalled()

    market(WEEKEND, FRIDAY_CLOSE)
    store['bw.tip.premium.v1'] = '1'
    remount()
    tap(button('Why weekend prices drift', bubble()))
    click(button('Got it', document.querySelector('[role="dialog"]')))
    click(rowFor('SPYx'))
    expect(onOpenAsset).not.toHaveBeenCalled()
    vi.setSystemTime(Date.now() + 301)
    click(rowFor('SPYx'))
    expect(onOpenAsset).toHaveBeenCalledTimes(1)
  })

  it('a tap on another row also opens normally and leaves the tip alone', () => {
    market(OPEN)
    mount()
    click(rowFor('SPYx'))
    expect(onOpenAsset).toHaveBeenCalledWith(expect.objectContaining({ id: SPYX }))
    expect(bubble()).toBeTruthy()
  })

  it('Escape closes it', () => {
    market(OPEN)
    mount()
    escape()
    expect(bubble()).toBeNull()
    expect(store['bw.tip.premium.v1']).toBe('1')
    expect(track.mock.calls.filter(([e]) => e === 'tip_closed')).toEqual([['tip_closed', { tip: 'gap', how: 'escape' }]])
  })

  it('sends one tip_closed per close, with the right tip and how', () => {
    market(WEEKEND, FRIDAY_CLOSE)
    mount()
    tap(button('Got it', bubble()))
    escape()
    escape()
    expect(track.mock.calls.filter(([e]) => e === 'tip_closed')).toEqual([
      ['tip_closed', { tip: 'gap', how: 'got_it' }],
      ['tip_closed', { tip: 'closed', how: 'escape' }],
    ])
  })
})

describe('layout (criterion 9) and the old caption', () => {
  it('puts nothing above the first price row: the markup before it is the same with and without a bubble', () => {
    market(OPEN)
    // The anchor is the first row here, the worst case.
    prices.assets = prices.assets.slice(1)
    folders.watchlistIds = prices.assets.map((a) => a.id)
    mount()
    const firstRow = rowFor('NVDAx')
    expect(firstRow.nextElementSibling.contains(bubble())).toBe(true)
    const before = (row) => container.innerHTML.slice(0, container.innerHTML.indexOf(row.outerHTML))
    const withBubble = before(firstRow)
    tap(button('Got it', bubble()))
    expect(before(rowFor('NVDAx'))).toBe(withBubble)
  })

  it('floats in a zero-height box, so the rows below do not move', () => {
    market(OPEN)
    mount()
    const box = bubble().parentElement
    expect(box.className).toBe('relative h-0')
    expect(bubble().className).toContain('absolute')
  })

  it('no longer shows the inline caption', () => {
    market(OPEN)
    mount()
    expect(container.textContent).not.toContain('The number on each row')
    expect(button('Dismiss tip')).toBeUndefined()
  })
})

describe('screen readers and keyboards (criterion 11)', () => {
  it('describes the anchor row by the bubble body, names the note by its title, and puts Got it next in Tab order', () => {
    market(OPEN)
    mount()
    const row = rowFor('NVDAx')
    const b = bubble()
    expect(b.getAttribute('role')).toBe('note')
    expect(document.getElementById(row.getAttribute('aria-describedby')).textContent).toBe(GAP_BODY)
    const gotIt = button('Got it', b)
    expect(gotIt.getAttribute('tabindex')).toBeNull()
    expect(row.compareDocumentPosition(gotIt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(gotIt.compareDocumentPosition(rowFor('SPYx')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(rowFor('SPYx').hasAttribute('aria-describedby')).toBe(false)
  })

  it('drops the description once the tip is closed', () => {
    market(OPEN)
    mount()
    tap(button('Got it', bubble()))
    expect(rowFor('NVDAx').hasAttribute('aria-describedby')).toBe(false)
  })

  it('gives the desktop table row its own copy with its own ids', () => {
    market(OPEN)
    mount()
    const phone = bubble()
    const table = bubble(tableList())
    expect(titleOf(table)).toBe('The gap')
    expect(rowFor('NVDAx', tableList()).nextElementSibling.contains(table)).toBe(true)
    expect(table.querySelector('p').id).not.toBe(phone.querySelector('p').id)
  })
})

describe('storage that throws (criterion 14)', () => {
  it('shows no bubble and does not crash', () => {
    stubStorage(true)
    market(WEEKEND, FRIDAY_CLOSE)
    mount()
    expect(rowFor('NVDAx')).toBeTruthy()
    expect(container.querySelector('[data-tip-bubble]')).toBeNull()
  })
})
