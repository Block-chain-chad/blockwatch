// @vitest-environment jsdom
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
 * The numbers are the issuer's real ratios, read off Solana mainnet:
 *   NFLXx  10                   -> typing 1 must quote 10000000 raw
 *   AZNx   0.5111362527152737   -> typing 1 must quote 195642550 raw
 *   TSLAx  1                    -> typing 1 must quote 100000000 raw
 * All three have 8 decimals.
 */

const getSwapQuote = vi.fn()

vi.mock('../services/swap', async (importOriginal) => ({
  ...(await importOriginal()),
  getSwapQuote: (...args) => getSwapQuote(...args),
}))

// The sheet reads the wallet and the remote switch. Neither is what these
// tests are about, so both are stubbed to the state that shows the form.
vi.mock('../state/WalletContext', () => ({
  useWallet: () => ({ publicKey: 'TestWa11etPubkey1111111111111111111111111111', provider: {} }),
}))

const { default: SwapSheet } = await import('./SwapSheet')
const { applyFlags, SWAP_FLAG } = await import('../services/featureFlags')
const { BY_ID } = await import('../data/universe')

const NFLX = BY_ID['netflix-xstock']
const AZN = BY_ID['astrazeneca-xstock']
const TSLA = BY_ID['tesla-xstock']

let container
let root

beforeEach(() => {
  applyFlags({ [SWAP_FLAG]: true })
  getSwapQuote.mockReset()
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
