// @vitest-environment jsdom

// React checks this flag to decide whether act() is really act(). Without it
// act still runs the work, but React is not in act mode — so it prints "the
// current testing environment is not configured to support act(...)" on every
// update, and, more to the point, its warning about state updates that were
// NOT wrapped in act is never raised. That warning is the one worth having:
// it is how an un-awaited effect writing into a money path gets caught.
// Must be set before react-dom loads.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The sell path, exercised through the real component.
 *
 * Why this file exists, and why it is the only one in the repository that
 * runs in a DOM. Review of this branch replaced SwapSheet.jsx wholesale with
 * its pre-branch version and all 879 tests stayed green: the existing sheet
 * tests render static markup, which never runs an effect and never types an
 * amount, so the line that decides how many tokens a sell transaction carries
 * was covered only through the helper it calls. A helper being right is not
 * the same claim as the screen using it.
 *
 * So these tests type into the amount box and assert what getSwapQuote is
 * asked for. The environment is set per file, so the other suites stay in
 * node exactly as before.
 *
 * The ratios below are FIXTURES, not reads of data/verifiedMints.json, and
 * that is deliberate. The pinned file is regenerated from the chain — weekly
 * by .github/workflows/repin-mints.yml, and by hand whenever anyone re-pins —
 * and the issuer accrues most of these ratios continuously. Tests asserting
 * exact raw amounts against a file that legitimately changes underneath them
 * are tests that fail for being right: a simulated re-pin (CRMx rolled
 * forward, AZNx one accrual step, a later checkedAt) broke four of them, which
 * would have failed the re-pin job and stopped the pull request ever opening.
 *
 * So the pinned lookup is mocked here exactly as the live read already is, and
 * the real file gets one test of its own at the bottom that checks what should
 * genuinely never change: that it parses, and still has 103 entries with
 * readable ratios.
 *
 * The fixture values are the issuer's real ratios as of 2026-09-16, all with
 * 8 decimals:
 *   NFLXx  10                   -> typing 1 must quote 10000000 raw
 *   AZNx   0.5111362527152737   -> typing 1 must quote 195642550 raw
 *   TSLAx  1                    -> typing 1 must quote 100000000 raw
 *   CRMx   1.0054716788543585   -> typing 1 must quote 99455809 raw
 */

const getSwapQuote = vi.fn()
const fetchLiveRatio = vi.fn()

vi.mock('../services/swap', async (importOriginal) => ({
  ...(await importOriginal()),
  getSwapQuote: (...args) => getSwapQuote(...args),
}))

// The sheet reads the wallet and the remote switch. Neither is what these
// tests are about, so both are stubbed to the state that shows the form.
vi.mock('../services/jupiter', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchLiveRatio: (...args) => fetchLiveRatio(...args),
}))

vi.mock('../state/WalletContext', () => ({
  useWallet: () => ({ publicKey: 'TestWa11etPubkey1111111111111111111111111111', provider: {} }),
}))

const { BY_ID } = await import('../data/universe')

/** When the fixture pin was taken. Fixed, so schedules can be dated against it. */
const VERIFIED_AT = '2026-09-16T20:57:21.973Z'

/** The pinned ratios these tests assert against, keyed by asset id. */
const PINS = {
  'netflix-xstock': { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: '2025-11-16T23:55:00.000Z' },
  'astrazeneca-xstock': { multiplier: '0.5111362527152737' },
  'tesla-xstock': { multiplier: '1' },
  'salesforce-xstock': {
    multiplier: '1.0036630653273484',
    nextMultiplier: '1.0054716788543585',
    nextMultiplierAt: '2026-06-11T00:30:00.000Z',
  },
}

vi.mock('../data/verifiedMints', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    VERIFIED_AT: '2026-09-16T20:57:21.973Z',
    verifiedToken: (asset) => {
      const pin = PINS[asset?.id]
      return pin ? { mint: asset.mint, ticker: asset.ticker, decimals: 8, issuer: 'xStocks', ...pin } : null
    },
  }
})

const { default: SwapSheet } = await import('./SwapSheet')
const { applyFlags, SWAP_FLAG } = await import('../services/featureFlags')

const NFLX = BY_ID['netflix-xstock']
const AZN = BY_ID['astrazeneca-xstock']
const TSLA = BY_ID['tesla-xstock']

let container
let root

beforeEach(() => {
  applyFlags({ [SWAP_FLAG]: true })
  getSwapQuote.mockReset()
  fetchLiveRatio.mockReset()
  // Default: the live read finds nothing to say, so the pin stands. Tests
  // about the live path override this.
  fetchLiveRatio.mockResolvedValue(null)
  // A quote that never resolves: these tests are about what is ASKED for, and
  // a resolved quote would start the 8s refresh loop mid-assertion.
  getSwapQuote.mockImplementation(() => new Promise(() => {}))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  applyFlags(null)
  // Always, not at the end of a test body: a failed assertion returns early
  // and would leak a mocked clock into every test after it.
  vi.useRealTimers()
})

/** Render the sheet, switch to Sell, and type `typed` into the amount box. */
async function sell(asset, typed) {
  await act(async () => {
    root.render(<SwapSheet asset={asset} onClose={() => {}} />)
  })
  const sellTab = [...container.querySelectorAll('button')].find(
    (b) => b.textContent.trim().toLowerCase() === 'sell'
  )
  expect(sellTab, 'no Sell tab rendered').toBeTruthy()
  await act(async () => {
    sellTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })
  const input = container.querySelector('input[type="number"]')
  expect(input, 'no amount input rendered').toBeTruthy()
  // React tracks the previous value on the DOM node, so setting .value alone
  // is swallowed as a no-op change. Go through the native setter.
  const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setValue.call(input, typed)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  return input
}

/** The amount from the most recent getSwapQuote call. */
const lastQuotedAmount = () => getSwapQuote.mock.calls.at(-1)?.[0]?.amountRaw

describe('the sell amount the sheet actually quotes', () => {
  it('quotes a tenth of a base token when the user types 1 of a ratio-10 mint', async () => {
    await sell(NFLX, '1')
    expect(getSwapQuote).toHaveBeenCalled()
    // The bug: 100000000 here is ten NFLXx as the wallet counts them.
    expect(lastQuotedAmount()).toBe('10000000')
    expect(lastQuotedAmount()).not.toBe('100000000')
  })

  it('quotes against the right mint and side', async () => {
    await sell(NFLX, '1')
    const call = getSwapQuote.mock.calls.at(-1)[0]
    expect(call.side).toBe('sell')
    expect(call.mint).toBe(NFLX.mint)
  })

  it('quotes nearly two base tokens for AZNx, whose ratio is below one', async () => {
    await sell(AZN, '1')
    expect(lastQuotedAmount()).toBe('195642550')
  })

  it('is unchanged for a mint the issuer left at 1.0', async () => {
    await sell(TSLA, '1')
    expect(lastQuotedAmount()).toBe('100000000')
  })

  it('scales a fractional amount too', async () => {
    await sell(NFLX, '2.5')
    expect(lastQuotedAmount()).toBe('25000000')
  })

  it('leaves a BUY in USDC, where no ratio applies', async () => {
    await act(async () => {
      root.render(<SwapSheet asset={NFLX} onClose={() => {}} />)
    })
    const input = container.querySelector('input[type="number"]')
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setValue.call(input, '100')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    // 100 USDC at 6 decimals, untouched by the token's ratio.
    expect(lastQuotedAmount()).toBe('100000000')
    expect(getSwapQuote.mock.calls.at(-1)[0].side).toBe('buy')
  })
})

/*
 * The live ratio read.
 *
 * The pin only knows changes the issuer had scheduled when verify-mints ran.
 * CRMx proved that within half an hour: pinned at 1.0054716788543585 with
 * nothing pending, while the chain already carried 1.0067077500492987
 * effective the next morning. So the sheet asks Jupiter, and reconcileRatio
 * decides between the two answers.
 */
describe('the sheet sizes on the live ratio, and falls back to the pin', () => {
  const CRM = BY_ID['salesforce-xstock']

  it('uses a scheduled change the pin never saw, once it has taken effect', async () => {
    vi.setSystemTime(new Date('2026-09-17T01:00:00.000Z')) // after it takes effect
    fetchLiveRatio.mockResolvedValue({
      multiplier: '1.0054716788543585',
      nextMultiplier: '1.0067077500492987',
      nextMultiplierAt: '2026-09-17T00:30:00.000Z',
    })
    await sell(CRM, '1')
    // 10^8 / 1.0067077500492987, truncated. The pin alone would have sized
    // this at 99455809 — 0.12293% more than the user asked to sell.
    expect(lastQuotedAmount()).toBe('99333694')
    expect(lastQuotedAmount()).not.toBe('99455809')
  })

  it('falls back to the pin when Jupiter cannot be reached', async () => {
    // The clock is pinned BEFORE the change the pin itself now carries takes
    // effect. Left on the real clock this test dies of old age: from
    // 2026-09-17T00:30Z the pinned schedule fires and the answer becomes
    // 99333694 with nothing having changed in the code.
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'))
    fetchLiveRatio.mockRejectedValue(new Error('offline'))
    await sell(CRM, '1')
    expect(lastQuotedAmount()).toBe('99455809') // the pin's effective ratio
  })

  it('falls back to the pin when the mint carries no live ratio', async () => {
    fetchLiveRatio.mockResolvedValue(null)
    await sell(NFLX, '1')
    expect(lastQuotedAmount()).toBe('10000000')
  })

  it('refuses to size anything when live and pin disagree beyond drift', async () => {
    // A split the pin has not seen, or a feed that is wrong. Either way we do
    // not know the ratio, and sizing on the stale pin would oversell tenfold.
    fetchLiveRatio.mockResolvedValue({ multiplier: '100' })
    await sell(NFLX, '1')
    expect(getSwapQuote).not.toHaveBeenCalled()
  })

  it('sizes on a split the pin never saw, when the live config proves it', async () => {
    // The case the live read exists for. TSLAx is pinned at 1; pretend the
    // issuer has just split it 10-for-1 and the pin has not caught up. The
    // live config carries the pin's own standing value rolled forward plus a
    // schedule dated after verification ran, which is what makes it provable.
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    fetchLiveRatio.mockResolvedValue({
      multiplier: '1',
      nextMultiplier: '10',
      nextMultiplierAt: '2026-09-18T23:55:00.000Z',
    })
    await sell(TSLA, '1')
    // Sized at the new ratio, not refused and not sized at the stale pin —
    // which would have sold ten times what the user typed.
    expect(lastQuotedAmount()).toBe('10000000')
    expect(lastQuotedAmount()).not.toBe('100000000')
  })

  it('does NOT let a proven ratio inflate what a BUY says it receives', async () => {
    // The reproduction. On a buy the ratio multiplies the displayed output
    // rather than dividing the size, so a proven-but-huge value overstates
    // what the user is signing for while the USDC-sized transaction stays
    // perfectly valid — nothing downstream can catch it. Before the hatch was
    // made sell-only this printed "You receive 400 TSLAx" for a quote
    // delivering 0.4.
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    getSwapQuote.mockResolvedValue({
      inAmount: '100000000',
      outAmount: '40000000', // 0.4 TSLAx at 8 decimals
      otherAmountThreshold: '39800000',
      priceImpactPct: '0.001',
    })
    // 15, INSIDE the twenty-times cap. A larger value is refused by the cap
    // whatever the hatch does, so it would pass this test with the buy-side
    // guard removed — which is exactly what happened: flipping the sheet back
    // to allowProvenUpdate: true left all 983 tests green while a proven 15x
    // printed "You receive 6 TSLAx" for a 0.4 quote, Confirm enabled.
    fetchLiveRatio.mockResolvedValue({
      multiplier: '1',
      nextMultiplier: '15',
      nextMultiplierAt: new Date(Date.parse(VERIFIED_AT) + 60_000).toISOString(),
    })
    await act(async () => {
      root.render(<SwapSheet asset={TSLA} onClose={() => {}} />)
    })
    const input = container.querySelector('input[type="number"]')
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setValue.call(input, '100')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    expect(container.textContent).not.toContain('6 TSLAx')
    expect(container.textContent).toContain("we won't size a trade we can't state the size of")
    // And nothing signable is on screen: a promised output we will not state
    // must not sit next to a live button.
    const confirm = [...container.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Swap into')
    )
    expect(confirm?.disabled ?? true).toBe(true)
  })

  it('refuses an absurd ratio on a SELL too, where the cap is the only guard', async () => {
    // The sell side opens the hatch, so here the twenty-times cap is what
    // stands between a feed reporting 1000 and a real trade.
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    fetchLiveRatio.mockResolvedValue({
      multiplier: '1',
      nextMultiplier: '1000',
      nextMultiplierAt: new Date(Date.parse(VERIFIED_AT) + 60_000).toISOString(),
    })
    await sell(TSLA, '1')
    expect(getSwapQuote).not.toHaveBeenCalled()
  })

  it('opens the hatch for a SELL at a ratio the cap allows', async () => {
    // The mirror of the buy case above: the same proven 15x that a buy
    // refuses is exactly what a sell needs, because there it divides the size.
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    fetchLiveRatio.mockResolvedValue({
      multiplier: '1',
      nextMultiplier: '15',
      nextMultiplierAt: new Date(Date.parse(VERIFIED_AT) + 60_000).toISOString(),
    })
    await sell(TSLA, '1')
    expect(lastQuotedAmount()).toBe('6666666') // 10^8 / 15, truncated
  })

  it('still displays a BUY under a ratio inside the band', async () => {
    getSwapQuote.mockResolvedValue({
      inAmount: '100000000',
      outAmount: '40000000',
      otherAmountThreshold: '39800000',
      priceImpactPct: '0.001',
    })
    fetchLiveRatio.mockResolvedValue({ multiplier: '1.02' })
    await act(async () => {
      root.render(<SwapSheet asset={TSLA} onClose={() => {}} />)
    })
    const input = container.querySelector('input[type="number"]')
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setValue.call(input, '100')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    // 0.4 base tokens at a ratio of 1.02 is 0.408 in the wallet.
    expect(container.textContent).toContain('0.408 TSLAx')
    expect(container.textContent).not.toContain("we won't size a trade")
  })

  it('refuses a provable config that points the ratio DOWN', async () => {
    // The hatch that lets a missed split through checks shape, not value, and
    // TSLAx is one of the 48 pins sitting at exactly 1 — so a feed reporting
    // the true standing value clears its first condition for free. Downward
    // that is a multiplier on the amount sold: at 0.1 a typed 1 becomes
    // 1000000000 raw, ten times what was asked for.
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    fetchLiveRatio.mockResolvedValue({
      multiplier: '1',
      nextMultiplier: '0.1',
      nextMultiplierAt: new Date(Date.parse(VERIFIED_AT) + 60_000).toISOString(),
    })
    await sell(TSLA, '1')
    expect(getSwapQuote).not.toHaveBeenCalled()
  })

  it('still refuses a large jump with nothing tying it to the pin', async () => {
    fetchLiveRatio.mockResolvedValue({ multiplier: '100' })
    await sell(NFLX, '1')
    expect(getSwapQuote).not.toHaveBeenCalled()
  })

  it('refuses a BUY too, where the received amount is the thing we cannot state', async () => {
    // Buying is sized in USDC, so the amount would be right — but the trade's
    // whole promise is "you receive N tokens", and N is quoted in the unit a
    // refused ratio means we cannot compute. A dash beside a live Confirm
    // button is an unpriced trade with a working button.
    fetchLiveRatio.mockResolvedValue({ multiplier: '100' })
    await act(async () => {
      root.render(<SwapSheet asset={NFLX} onClose={() => {}} />)
    })
    const input = container.querySelector('input[type="number"]')
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setValue.call(input, '100')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    expect(getSwapQuote).not.toHaveBeenCalled()
    expect(container.textContent).toContain("we won't size a trade we can't state the size of")
  })

  it('says why, instead of leaving an unexplained dash', async () => {
    fetchLiveRatio.mockResolvedValue({ multiplier: '100' })
    await sell(NFLX, '1')
    expect(container.textContent).toContain(
      "We can't confirm how many shares one NFLXx token currently represents right now"
    )
    expect(container.textContent).toContain('Nothing has been sent and your balance is unchanged')
    // Claims the Compliance Reviewer struck. The message fires on four paths,
    // three of them Onstock's own gap, so it must not assert the issuer did
    // anything; and Onstock cannot promise the token is swappable elsewhere.
    expect(container.textContent).not.toContain('Try again shortly')
    expect(container.textContent).not.toContain('issuer has changed')
    expect(container.textContent).not.toContain('swapped from your wallet')
    expect(container.textContent).not.toContain('Your tokens are unaffected')
  })

  it('stays silent when nothing has been typed yet', async () => {
    fetchLiveRatio.mockResolvedValue({ multiplier: '100' })
    await act(async () => {
      root.render(<SwapSheet asset={NFLX} onClose={() => {}} />)
    })
    expect(container.textContent).not.toContain("we won't size a trade")
  })
})

/*
 * The real pinned file still gets a guard, just not one that asserts values
 * the issuer is entitled to change. These are the things a re-pin must never
 * do: lose the file, lose mints, or write a ratio nothing can read.
 */
describe('the real pinned file', () => {
  it('parses, keeps all 103 mints, and gives every one a readable ratio', async () => {
    const { VERIFIED_MINTS } = await vi.importActual('../data/verifiedMints')
    const { effectiveMultiplier, toRational } = await vi.importActual('../lib/multiplier')
    const entries = Object.values(VERIFIED_MINTS)
    expect(entries).toHaveLength(103)
    for (const m of entries) {
      expect(toRational(effectiveMultiplier(m)), `${m.ticker} has an unreadable ratio`).not.toBeNull()
      expect(m.decimals).toBe(8)
    }
  })
})
