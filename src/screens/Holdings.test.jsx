// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync, readdirSync } from 'node:fs'

/*
 * The Holdings screen and its two sheets, in every state the brief names
 * (acceptance criteria 6 to 13, and 9 and 10 for the add flow), with the
 * prices and the stored list supplied directly.
 *
 * The last block is the whole-word scan: the rendered text of every state
 * must read as an estimate of typed-in amounts, never as a brokerage
 * statement or a nudge to trade.
 */

const h = vi.hoisted(() => ({
  holdings: [],
  loaded: true,
  signedIn: false,
  byId: {},
  status: 'live',
  add: null,
  update: null,
  remove: null,
}))

vi.mock('../state/HoldingsContext', () => ({
  useHoldings: () => ({ holdings: h.holdings, loaded: h.loaded, signedIn: h.signedIn, add: h.add, update: h.update, remove: h.remove }),
}))
vi.mock('../state/PricesContext', () => ({
  usePrices: () => ({ byId: h.byId, assets: Object.values(h.byId), status: h.status }),
  useAsset: (id) => h.byId[id] ?? null,
  useAssetSubscription: vi.fn(),
}))
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ available: true, user: null }) }))
vi.mock('../services/analytics', () => ({ track: vi.fn() }))
vi.mock('../components/AssetLogo', () => ({ default: () => <span data-logo="" /> }))
vi.mock('../overlays/SignInSheet', () => ({ default: () => <div>sign-in sheet</div> }))

const { default: Holdings } = await import('./Holdings')
const { track } = await import('../services/analytics')
const { useAssetSubscription } = await import('../state/PricesContext')
const { BY_ID, ASSETS } = await import('../data/universe')
const { sharesPerToken } = await import('../lib/gapCheck')

// Wednesday September 30, 2026, 11:00 in New York: the market is open.
const OPEN = Date.parse('2026-09-30T15:00:00Z')
// Saturday October 3, 2026: closed, and the share leg is Friday's close.
const WEEKEND = Date.parse('2026-10-03T15:00:00Z')
const FRIDAY_CLOSE = Date.parse('2026-10-02T20:00:00Z')

/** A merged asset (lib/prices mergeAssets) from the real universe entry. */
function priced(id, over = {}) {
  const seed = BY_ID[id]
  return {
    ...seed,
    sharesPerToken: sharesPerToken(seed),
    tokenPrice: 181.24,
    stockPrice: 180.83,
    dayChange: 0.5,
    volume24h: 5_000_000,
    priceUpdatedAt: Date.now() - 60_000,
    stockQuote: { price: 180.83, asOf: Date.now() - 60_000 },
    ...over,
  }
}

const NVDAX = 'nvidia-xstock'
const NVDAON = 'nvidia-ondo-tokenized-stock'
const TSLAX = 'tesla-xstock'
const SPYX = 'sp500-xstock'
const hold = (assetId, amount = '10') => ({ assetId, amount, updatedAt: 1 })

let container
let root
let onOpenAsset

function mount(props = {}) {
  act(() => root.render(<Holdings onOpenProfile={() => {}} onOpenAsset={onOpenAsset} settleMs={0} {...props} />))
  // Let the settle timer (0 ms here) fire.
  act(() => vi.advanceTimersByTime(1))
}
const text = () => document.body.textContent
const buttons = () => [...document.querySelectorAll('button')]
const button = (label) => buttons().find((b) => b.textContent === label)
const rowFor = (ticker) => buttons().find((b) => b.querySelector('.t-label')?.textContent === ticker)
function type(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
function submit(form) {
  act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}

// Every state rendered below adds its text here for the whole-word scan.
const seen = []
const keep = () => seen.push(text())

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(OPEN)
  h.holdings = []
  h.loaded = true
  h.signedIn = false
  h.status = 'live'
  h.byId = { [NVDAX]: priced(NVDAX) }
  h.add = vi.fn(() => 'added')
  h.update = vi.fn()
  h.remove = vi.fn()
  onOpenAsset = vi.fn()
  track.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('empty state (criterion 11)', () => {
  it('for a guest: the approved text, one button, no link and no numbers', () => {
    mount()
    keep()
    expect(text()).toContain(
      "Add tokens you already hold to see their estimated value, and how far each token's price sits from the share it tracks.",
    )
    expect(text()).toContain("Onstock can't see or move your tokens. You type the amounts in, and they are kept on this device.")
    expect(buttons().filter((b) => b.textContent === 'Add a holding')).toHaveLength(1)
    expect(text()).not.toContain('Where tokens trade')
    expect(text()).not.toMatch(/\$\d/)
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  it('for someone signed in', () => {
    h.signedIn = true
    mount()
    keep()
    expect(text()).toContain("Onstock can't see or move your tokens. You type the amounts in, and they sync to your account.")
  })

  it('counts the visit once, with nothing about holdings', () => {
    mount()
    expect(track.mock.calls).toEqual([['holdings_opened']])
  })
})

describe('one holding (criteria 2 and 12)', () => {
  beforeEach(() => {
    h.holdings = [hold(NVDAX)]
  })

  it('values it at amount x token price, with the price move under it', () => {
    mount()
    keep()
    expect(text()).toContain('Estimated value')
    expect(text()).toContain('$1,812.40')
    expect(text()).toContain('Price move, past 24 hours +$9.02 (+0.50%)')
    expect(text()).toContain('Prices updated 1m ago')
    expect(text()).toContain('10 NVDAx · tracks NVIDIA')
    expect(useAssetSubscription).toHaveBeenLastCalledWith('holdings', [NVDAX])
  })

  it('has the caption above the list and both lines under it, plus the guest line', () => {
    mount()
    const t = text()
    const caption =
      'Estimated from the amounts you entered and third-party prices, which may be delayed or wrong. Not a statement from any broker, exchange or issuer.'
    expect(t.indexOf(caption)).toBeGreaterThan(-1)
    expect(t.indexOf(caption)).toBeLessThan(t.indexOf('10 NVDAx'))
    const under = [
      "Tokens are not the shares they track. They give no shareholder rights, and each token's issuer decides who may hold or redeem it.",
      'Amounts can change without a trade. xStocks add reinvested dividends and stock splits to your wallet balance, so the number you typed can fall behind. Check your wallet and update it here.',
      'Kept on this device only. Sign in to keep them across devices.',
    ]
    let at = t.indexOf('10 NVDAx')
    for (const line of under) {
      expect(t.indexOf(line)).toBeGreaterThan(at)
      at = t.indexOf(line)
    }
    act(() => button('Sign in').click())
    expect(text()).toContain('sign-in sheet')
  })

  it('drops the guest line when signed in', () => {
    h.signedIn = true
    mount()
    expect(text()).not.toContain('Kept on this device only')
  })

  it('puts nothing in the address bar or the page title', () => {
    const before = [window.location.href, document.title]
    mount()
    expect([window.location.href, document.title]).toEqual(before)
  })
})

describe('what is left out (criterion 5)', () => {
  it('names how many have no current price, and leaves them out of both figures', () => {
    h.holdings = [hold(NVDAX), hold(TSLAX), hold(SPYX)]
    h.byId = {
      [NVDAX]: priced(NVDAX),
      [TSLAX]: priced(TSLAX, { tokenPrice: null }),
      [SPYX]: priced(SPYX, { priceUpdatedAt: Date.now() - 25 * 3600_000 }),
    }
    mount()
    keep()
    expect(text()).toContain('$1,812.40')
    expect(text()).toContain('Covers 1 of 3 holdings. 2 have no current price.')
    expect(text().match(/No current price/g)).toHaveLength(2)
  })

  it('shows placeholders, not "No current price", while the first prices load', () => {
    h.holdings = [hold(TSLAX)]
    h.byId = { [TSLAX]: priced(TSLAX, { tokenPrice: null }) }
    act(() => root.render(<Holdings onOpenProfile={() => {}} onOpenAsset={onOpenAsset} />))
    expect(text()).not.toContain('No current price')
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('sorts by estimated value, largest first', () => {
    h.holdings = [hold(TSLAX, '1'), hold(NVDAX, '10')]
    h.byId = { [NVDAX]: priced(NVDAX), [TSLAX]: priced(TSLAX, { tokenPrice: 400 }) }
    mount()
    const tickers = [...document.querySelectorAll('button .t-label')].map((n) => n.textContent)
    expect(tickers.filter((t) => ['NVDAx', 'TSLAx'].includes(t))).toEqual(['NVDAx', 'TSLAx'])
  })
})

describe('gap chips (criterion 6)', () => {
  const cases = [
    ['ok', {}, 'Gap +0.23%'],
    ['ratio-unverified', { sharesPerToken: null }, 'Ratio unverified'],
    ['price-check-failed', { stockPrice: 100 }, 'Gap not confirmed'],
    ['none', { underlying: null }, 'No share to compare'],
  ]
  for (const [status, over, words] of cases) {
    it(`${status}: ${words}`, () => {
      h.holdings = [hold(NVDAX)]
      h.byId = { [NVDAX]: priced(NVDAX, over) }
      mount()
      keep()
      expect(rowFor('NVDAx').textContent).toContain(words)
      if (status !== 'ok') expect(rowFor('NVDAx').textContent).not.toMatch(/Gap [+−]/)
    })
  }

  it('pending: a placeholder and no number', () => {
    h.holdings = [hold(NVDAX)]
    h.byId = { [NVDAX]: priced(NVDAX, { stockPrice: null }) }
    mount()
    expect(rowFor('NVDAx').querySelector('[data-gap="pending"]')).not.toBeNull()
    expect(rowFor('NVDAx').textContent).not.toContain('Gap')
  })
})

describe('market closed (criterion 7)', () => {
  it('tags the gap with the close, and not the value or the price move', () => {
    vi.setSystemTime(WEEKEND)
    h.holdings = [hold(NVDAX)]
    h.byId = { [NVDAX]: priced(NVDAX, { stockQuote: { price: 180.83, asOf: FRIDAY_CLOSE } }) }
    mount()
    keep()
    const row = rowFor('NVDAx')
    expect(row.textContent).toContain('Market closed')
    expect(row.textContent).toContain('vs Friday’s close')
    const summary = document.querySelector('section').textContent
    expect(summary).not.toContain('Market closed')
    expect(summary).toContain('$1,812.40')
  })
})

describe('issuer notes (criterion 9)', () => {
  const ondoLine =
    'Enter the number of tokens. On some chains your wallet may show an adjusted amount that already includes reinvested dividends; if so, the value here may be off.'

  it('puts the Ondo line on Ondo rows only, and values an Ondo token per token', () => {
    h.holdings = [hold(NVDAX), hold(NVDAON, '2')]
    h.byId = {
      [NVDAX]: priced(NVDAX),
      [NVDAON]: priced(NVDAON, { sharesPerToken: 10, tokenPrice: 705, stockPrice: 70, stockQuote: { price: 70, asOf: Date.now() } }),
    }
    mount()
    keep()
    expect(rowFor('NVDAon').textContent).toContain(ondoLine)
    expect(rowFor('NVDAon').textContent).toContain('$1,410.00')
    expect(rowFor('NVDAx').textContent).not.toContain(ondoLine)
  })

  it('notes a thinly traded token', () => {
    h.holdings = [hold(NVDAX)]
    h.byId = { [NVDAX]: priced(NVDAX, { volume24h: 1000 }) }
    mount()
    keep()
    expect(rowFor('NVDAx').textContent).toContain('Thinly traded. Value can swing on small trades.')
  })
})

describe('the row sheet (criterion 8)', () => {
  function openRow(ticker) {
    act(() => rowFor(ticker).click())
    return document.querySelector('[role="dialog"]')
  }

  it('says the dollar gap only in the sheet, with the market open', () => {
    h.holdings = [hold(NVDAX)]
    mount()
    const sentence = 'At the latest prices, these tokens are valued about $4.10 more than the shares they track.'
    expect(text()).not.toContain('valued about')
    const sheet = openRow('NVDAx')
    keep()
    expect(sheet.textContent).toContain(sentence)
    expect(sheet.textContent).toContain('tracks NVIDIA')
    for (const label of ['Change amount', 'Open token page', 'Remove from Holdings']) expect(button(label)).toBeTruthy()
    expect(sheet.textContent).not.toMatch(/\b(Buy|Sell|Swap|Trade)\b/)
  })

  it('names the close with the market closed', () => {
    vi.setSystemTime(WEEKEND)
    h.holdings = [hold(NVDAX)]
    h.byId = { [NVDAX]: priced(NVDAX, { stockQuote: { price: 180.83, asOf: FRIDAY_CLOSE } }) }
    mount()
    const sheet = openRow('NVDAx')
    keep()
    expect(sheet.textContent).toContain(
      'At the latest token price, these tokens are valued about $4.10 more than the shares they track at Friday’s close.',
    )
  })

  it('says about the same inside the parity band', () => {
    h.holdings = [hold(NVDAX)]
    h.byId = { [NVDAX]: priced(NVDAX, { tokenPrice: 180.85 }) }
    mount()
    const sheet = openRow('NVDAx')
    keep()
    expect(sheet.textContent).toContain('At the latest prices, these tokens are valued about the same as the shares they track.')
  })

  it('has no dollar sentence when the gap is not confirmed', () => {
    h.holdings = [hold(NVDAX)]
    h.byId = { [NVDAX]: priced(NVDAX, { sharesPerToken: null }) }
    mount()
    const sheet = openRow('NVDAx')
    expect(sheet.textContent).not.toContain('valued about')
  })

  it('changes the amount with Update, never Save', () => {
    h.holdings = [hold(NVDAX)]
    mount()
    openRow('NVDAx')
    act(() => button('Change amount').click())
    keep()
    expect(button('Update')).toBeTruthy()
    const input = document.querySelector('input[inputmode="decimal"]')
    act(() => type(input, '1,5'))
    submit(input.form)
    expect(text()).toContain('Enter a number greater than zero, such as 12.5.')
    expect(h.update).not.toHaveBeenCalled()
    act(() => type(input, '12.5'))
    submit(input.form)
    expect(h.update).toHaveBeenCalledWith(NVDAX, '12.5')
  })

  it('removes with a label for the Undo toast, and opens the token page', () => {
    h.holdings = [hold(NVDAX)]
    mount()
    openRow('NVDAx')
    act(() => button('Remove from Holdings').click())
    expect(h.remove).toHaveBeenCalledWith(NVDAX, 'Removed NVDAx')
    openRow('NVDAx')
    act(() => button('Open token page').click())
    expect(onOpenAsset).toHaveBeenCalledWith(expect.objectContaining({ id: NVDAX }))
  })
})

describe('the add sheet (criteria 9 and 10)', () => {
  beforeEach(() => {
    h.byId = Object.fromEntries(ASSETS.map((a) => [a.id, priced(a.id)]))
  })
  const search = (q) => {
    act(() => type(document.querySelector('input[placeholder="Search by name or ticker"]'), q))
  }

  it('offers verified xStocks and Ondo tokens, then asks for the amount with the issuer help', () => {
    mount()
    act(() => button('Add a holding').click())
    keep()
    search('NVDA')
    const offered = [...document.querySelectorAll('[role="dialog"] button .t-label')].map((n) => n.textContent)
    expect(offered).toContain('NVDAx')
    expect(offered).toContain('NVDAon')
    expect(offered).not.toContain('NVDAb')
    act(() => buttons().find((b) => b.querySelector('.t-label')?.textContent === 'NVDAx').click())
    keep()
    expect(text()).toContain('Enter the number your wallet shows for this token.')
    expect(text()).not.toContain('Enter the number of tokens.')
    const input = document.querySelector('input[inputmode="decimal"]')
    act(() => type(input, '0'))
    submit(input.form)
    expect(text()).toContain('Enter a number greater than zero, such as 12.5.')
    act(() => type(input, ' 10 '))
    submit(input.form)
    expect(h.add).toHaveBeenCalledWith(NVDAX, '10')
  })

  it('shows the Ondo help for an Ondo token', () => {
    mount()
    act(() => button('Add a holding').click())
    search('NVDAon')
    act(() => buttons().find((b) => b.querySelector('.t-label')?.textContent === 'NVDAon').click())
    keep()
    expect(text()).toContain('Enter the number of tokens. On some chains your wallet may show an adjusted amount')
  })

  it('says a bStocks token cannot be added yet', () => {
    const b = ASSETS.find((a) => a.issuer === 'bStocks')
    mount()
    act(() => button('Add a holding').click())
    search(b.ticker)
    keep()
    expect(text()).toContain(
      "We can't add that token yet. For now, Holdings supports only xStocks and Ondo tokens whose details we have verified.",
    )
  })

  it('does not add a token twice: it opens the sheet to change its amount', () => {
    h.holdings = [hold(NVDAX)]
    mount()
    act(() => button('Add a holding').click())
    search('NVDAx')
    act(() => buttons().find((b) => b.querySelector('.t-label')?.textContent === 'NVDAx' && b.closest('[role="dialog"]')).click())
    keep()
    expect(text()).toContain('NVDAx is already in your Holdings. Change its amount instead.')
    expect(button('Update')).toBeTruthy()
    expect(h.add).not.toHaveBeenCalled()
  })

  it('stops at 50 different tokens', () => {
    h.holdings = ASSETS.slice(0, 50).map((a) => hold(a.id))
    mount()
    act(() => button('Add a holding').click())
    keep()
    expect(text()).toContain('Holdings can list up to 50 different tokens.')
    expect(document.querySelector('input[placeholder="Search by name or ticker"]')).toBeNull()
  })
})

describe('whole-word scan of every state above (criterion 13)', () => {
  // Approved exceptions, removed before the scan: the dividend line says
  // "your wallet balance", and the closed-market sentence may say "today's
  // close". "account" is not on the list; it appears only in approved lines.
  const APPROVED = [/your wallet balance/g, /today[’']s close/g]
  const BANNED = [
    'gain', 'gains', 'return', 'returns', 'profit', 'profits', 'loss', 'losses', 'earned', 'you made', 'net worth',
    'balance', 'portfolio', 'position', 'positions', 'shares held', 'you own', 'equity', 'cheaper', 'save', 'saved',
    'better', 'deal', 'deals', 'opportunity', 'discount', 'switch', 'arbitrage', 'buy', 'sell', 'today',
  ]

  it('finds none of the banned words, matching whole words only', () => {
    expect(seen.length).toBeGreaterThan(15)
    for (const state of seen) {
      let t = state
      for (const re of APPROVED) t = t.replace(re, '')
      for (const word of BANNED) {
        expect(t, `"${word}" in: ${state.slice(0, 120)}`).not.toMatch(new RegExp(`\\b${word}\\b`, 'i'))
      }
    }
  })

  it('lets "Update" and "small trades" through, and catches a banned word', () => {
    const re = (w) => new RegExp(`\\b${w}\\b`, 'i')
    expect('Update').not.toMatch(re('date'))
    expect('Value can swing on small trades.').not.toMatch(re('trade'))
    expect('Save').toMatch(re('save'))
  })
})

describe('holdings code', () => {
  const FILES = [
    '../screens/Holdings.jsx',
    '../overlays/AddHoldingSheet.jsx',
    '../overlays/HoldingSheet.jsx',
    '../components/HoldingParts.jsx',
    '../state/HoldingsContext.jsx',
    '../lib/holdings.js',
    '../lib/holdingsKeys.js',
  ]

  it('never calls console (Sentry keeps console breadcrumbs)', () => {
    for (const f of FILES) expect(readFileSync(new URL(f, import.meta.url), 'utf8'), f).not.toMatch(/\bconsole\./)
  })

  it('is the whole list of holdings files', () => {
    const named = (dir, re) => readdirSync(new URL(dir, import.meta.url)).filter((n) => re.test(n) && !n.includes('.test.'))
    expect(named('../screens/', /olding/)).toEqual(['Holdings.jsx'])
    expect(named('../overlays/', /olding/).sort()).toEqual(['AddHoldingSheet.jsx', 'HoldingSheet.jsx'])
  })
})
