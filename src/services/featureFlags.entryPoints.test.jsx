import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// GapHeader reaches the stock service → services/apiBase, which reads
// window.location.origin as the module loads. These tests run under node, so
// the window has to exist before the import graph resolves — the vi.hoisted
// pattern from components/asset/GapPanel.test.jsx.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { default: SwapSheet } = await import('../overlays/SwapSheet')
const { default: TradeButton } = await import('../components/asset/TradeButton')
const { default: GapHeader } = await import('../components/desktop/GapHeader')
const { default: Trade } = await import('../screens/Trade')
const { VERIFIED_MINTS } = await import('../data/verifiedMints')
const { BY_ID } = await import('../data/universe')
const {
  applyFlags,
  SWAP_FLAG,
  LINK_OUT_FLAG,
  SWAP_PAUSED_LINE,
  LINK_OUT_PAUSED_LINE,
  TRADE_PAUSED_SHORT,
} = await import('./featureFlags')

/*
 * The kill switch, from the user's side: every place OnStock offers a trade,
 * under every state of the two flags.
 *
 * Two properties are being pinned down here.
 *
 *   1. Off means off EVERYWHERE, including the state where nothing has
 *      answered yet. A static render has run no effects and received no
 *      network reply, so it is exactly the "flag not loaded" case — and the
 *      swap must already be gone in it. That is the synchronous, fail-closed
 *      requirement, tested by construction rather than by timing.
 *
 *   2. Off says so. A vanished button reads as a broken app to the person who
 *      opened the screen to trade.
 */

const verified = BY_ID[Object.keys(VERIFIED_MINTS)[0]]
const mint = VERIFIED_MINTS[verified.id].mint
const JUPITER_URL = `https://jup.ag/swap/USDC-${mint}`
// What the Trade screen renders when, and only when, the link-out is on.
const TRADE_VENUE_CARD = 'Jupiter ↗'

// A connected wallet, so the in-app swap is the rung under test rather than
// the link-out. Mocked at the module: these are static renders, so there is
// no provider tree to put a value into.
vi.mock('../state/WalletContext', () => ({
  useWallet: () => ({ publicKey: 'Wa11etPub1icKeyFor7esting', provider: null }),
}))

// Trade reads the waitlist from a context whose default is null.
vi.mock('../state/WaitlistContext', () => ({
  useWaitlist: () => ({ entry: null, join: async () => {} }),
}))

// Sheet reads document.activeElement while rendering, to restore focus on
// close. Effects do not run in a static render, so this one field is the
// whole shim.
beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null })
})
afterEach(() => {
  vi.unstubAllGlobals()
  applyFlags(null)
})

const headerProps = {
  asset: verified,
  session: 'regular',
  lastFetchAt: Date.now(),
  onExit: () => {},
  onSheet: () => {},
  inWatchlist: false,
  onToggleWatch: () => {},
}

const renderAll = () => ({
  sheet: renderToStaticMarkup(<SwapSheet asset={verified} onClose={() => {}} />),
  button: renderToStaticMarkup(<TradeButton asset={verified} />),
  header: renderToStaticMarkup(<GapHeader {...headerProps} />),
  trade: renderToStaticMarkup(<Trade onOpenProfile={() => {}} />),
})

describe('with no answer from PostHog — the default, and the loading state', () => {
  it('offers no in-app swap anywhere', () => {
    const { sheet, button } = renderAll()
    // The sheet refuses outright rather than rendering a form.
    expect(sheet).not.toContain('You pay')
    expect(sheet).toContain('Swapping is paused')
    // The button never offers the swap, even with a wallet connected.
    expect(button).not.toContain(`Swap ${verified.ticker}`)
  })

  it('says so in plain words instead of leaving a gap', () => {
    const { sheet, button } = renderAll()
    expect(sheet).toContain(SWAP_PAUSED_LINE)
    expect(button).toContain(SWAP_PAUSED_LINE)
  })

  it('pauses the link-out too, because its fallback is off since September 30, 2026', () => {
    const { button, header, trade } = renderAll()
    expect(button).not.toContain(JUPITER_URL)
    expect(header).not.toContain(JUPITER_URL)
    expect(button).toContain(LINK_OUT_PAUSED_LINE)
    expect(trade).toContain(LINK_OUT_PAUSED_LINE)
  })
})

describe('with the swap flag explicitly off', () => {
  it('matches the no-answer state exactly', () => {
    applyFlags({ [SWAP_FLAG]: false })
    const { sheet, button } = renderAll()
    expect(sheet).toContain(SWAP_PAUSED_LINE)
    expect(button).not.toContain(`Swap ${verified.ticker}`)
  })
})

describe('with the swap flag on', () => {
  beforeEach(() => applyFlags({ [SWAP_FLAG]: true }))

  it('brings the swap button back', () => {
    const { button } = renderAll()
    expect(button).toContain(`Swap ${verified.ticker}`)
    expect(button).not.toContain(SWAP_PAUSED_LINE)
  })

  it('brings the swap form back', () => {
    const { sheet } = renderAll()
    expect(sheet).toContain('You pay')
    expect(sheet).not.toContain('Swapping is paused')
  })

  it('does not put the unverified address in front of anyone even so', () => {
    const unverified = { id: 'not-verified', ticker: 'FAKEx', name: 'Fake', mint: 'UnpinnedMint' }
    const html = renderToStaticMarkup(<SwapSheet asset={unverified} onClose={() => {}} />)
    expect(html).toContain('Can’t swap this one here')
    expect(html).not.toContain(unverified.mint)
  })
})

describe('with the link-out flag off', () => {
  beforeEach(() => applyFlags({ [LINK_OUT_FLAG]: false }))

  it('sends nobody to Jupiter from any screen', () => {
    const { button, header, trade } = renderAll()
    expect(button).not.toContain('jup.ag')
    expect(header).not.toContain('jup.ag')
    expect(trade).not.toContain('Open to you')
  })

  it('says so on every screen it removed something from', () => {
    const { button, header, trade } = renderAll()
    expect(button).toContain(LINK_OUT_PAUSED_LINE)
    expect(header).toContain(TRADE_PAUSED_SHORT)
    expect(trade).toContain(LINK_OUT_PAUSED_LINE)
  })
})

describe('with both flags off', () => {
  beforeEach(() => applyFlags({ [SWAP_FLAG]: false, [LINK_OUT_FLAG]: false }))

  it('leaves no route to spend money and no silent gap', () => {
    const { sheet, button, header, trade } = renderAll()
    for (const html of [sheet, button, header, trade]) {
      expect(html).not.toContain('jup.ag')
    }
    expect(button).not.toContain(`Swap ${verified.ticker}`)
    expect(sheet).toContain(SWAP_PAUSED_LINE)
    // Every surface that lost a control explains itself.
    expect(button).toContain('paused')
    expect(header).toContain('paused')
    expect(trade).toContain('paused')
  })
})

describe('with both flags on', () => {
  it('is the app as it shipped', () => {
    applyFlags({ [SWAP_FLAG]: true, [LINK_OUT_FLAG]: true })
    const { button, header, trade } = renderAll()
    expect(button).toContain(`Swap ${verified.ticker}`)
    expect(header).toContain(JUPITER_URL)
    expect(trade).toContain(TRADE_VENUE_CARD)
  })
})
