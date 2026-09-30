import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SwapSheet from './SwapSheet'
import TradeButton from '../components/asset/TradeButton'
import { VERIFIED_MINTS } from '../data/verifiedMints'
import { BY_ID } from '../data/universe'
import { applyFlags, SWAP_FLAG, LINK_OUT_FLAG } from '../services/featureFlags'
import { SLIPPAGE_BPS } from '../services/swap'

/*
 * A smoke render of the two trade entry points, without a browser.
 *
 * This exists because a helper deleted during this change survived both the
 * linter and the production build: nothing in the repository ever renders a
 * component, so an identifier that only appears inside JSX is unchecked until
 * a user opens the sheet. Effects do not run in a static render, so this is a
 * floor, not a substitute for a real component test setup.
 */

const verified = BY_ID[Object.keys(VERIFIED_MINTS)[0]]
const unverified = { id: 'not-verified', ticker: 'FAKEx', name: 'Fake', mint: 'SomeUnpinnedMint' }

// Sheet reads document.activeElement while rendering, to restore focus on
// close. Nothing else here touches the DOM: effects do not run in a static
// render, so this one field is the whole shim.
beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null })
})
afterEach(() => {
  vi.unstubAllGlobals()
  applyFlags(null)
})

describe('SwapSheet renders', () => {
  // The swap is switched off by default, so these two reach for the form
  // deliberately. The switch itself is covered in
  // services/featureFlags.entryPoints.test.jsx.
  beforeEach(() => applyFlags({ [SWAP_FLAG]: true }))

  it('shows the form for a token whose address is verified', () => {
    const html = renderToStaticMarkup(<SwapSheet asset={verified} onClose={() => {}} />)
    expect(html).toContain(`Swap ${verified.ticker}`)
    // No wallet in a bare render, so it asks for one rather than offering a
    // Confirm button.
    expect(html).toContain('Connect a wallet')
  })

  it('refuses, in words, for a token whose address is not verified', () => {
    const html = renderToStaticMarkup(<SwapSheet asset={unverified} onClose={() => {}} />)
    expect(html).toContain('Can’t swap this one here')
    expect(html).not.toContain('You pay')
  })
})

/*
 * The sheet's own words about what the swap does. The slippage bound makes a
 * bad trade FAIL; it does not hand the user the minimum. The sheet used to
 * promise the minimum, and never named the tolerance or the network fee.
 */
describe('SwapSheet disclosure copy', () => {
  beforeEach(() => applyFlags({ [SWAP_FLAG]: true }))

  const render = () => renderToStaticMarkup(<SwapSheet asset={verified} onClose={() => {}} />)

  it('describes the minimum as a failure point, not a guarantee', () => {
    const html = render()
    expect(html).toContain(
      'If the price moves past the minimum shown, the swap fails and nothing is exchanged.'
    )
    expect(html).toContain('You still pay the Solana network fee.')
    expect(html).not.toContain('guaranteed')
  })

  it('keeps the two statements the review confirmed are accurate', () => {
    const html = render()
    expect(html).toContain('Onstock never holds your funds')
    expect(html).toContain('Not investment advice')
  })

  it('names the slippage tolerance, from the one definition of it', () => {
    const html = render()
    // Derived, so a change to SLIPPAGE_BPS moves the number on screen with it
    // rather than leaving a second, stale copy behind.
    expect(html).toContain(`Slippage tolerance is fixed at ${SLIPPAGE_BPS / 100}%`)
    expect(html).toContain('can&#x27;t be changed here')
  })

  it('says a Solana network fee applies on top of the quote', () => {
    expect(render()).toContain('costs a Solana network fee')
  })
})

describe('TradeButton renders', () => {
  it('offers the verified address to the external venue', () => {
    applyFlags({ [LINK_OUT_FLAG]: true })
    const html = renderToStaticMarkup(<TradeButton asset={verified} />)
    expect(html).toContain(`https://jup.ag/swap/USDC-${VERIFIED_MINTS[verified.id].mint}`)
  })

  it('offers no trade route at all for an unverified address', () => {
    expect(renderToStaticMarkup(<TradeButton asset={unverified} />)).toBe('')
    // Specifically: it must never put the unpinned address in front of anyone.
    expect(renderToStaticMarkup(<TradeButton asset={unverified} />)).not.toContain(
      unverified.mint
    )
  })
})
