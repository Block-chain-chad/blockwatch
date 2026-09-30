import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TradeButton from './TradeButton'
import { VERIFIED_MINTS } from '../../data/verifiedMints'
import { BY_ID } from '../../data/universe'
import { applyFlags, LINK_OUT_FLAG } from '../../services/featureFlags'

/*
 * The per-asset Jupiter link is off (the jupiter-link-out flag, September
 * 30, 2026). If it is ever switched back on, its words must already be the
 * Compliance Reviewer's: "View", not "Trade", and a caption that says the
 * issuer does not offer the token in the United States instead of
 * "availability depends on your region".
 */

vi.mock('../../state/WalletContext', () => ({ useWallet: () => ({ publicKey: null }) }))

const verified = BY_ID[Object.keys(VERIFIED_MINTS)[0]]

afterEach(() => applyFlags(null))

describe('TradeButton link-out wording', () => {
  it('views rather than trades, and states the United States restriction', () => {
    applyFlags({ [LINK_OUT_FLAG]: true })
    const html = renderToStaticMarkup(<TradeButton asset={verified} />)
    expect(html).toContain('View on Jupiter ↗')
    expect(html).not.toContain(`Trade ${verified.ticker}`)
    expect(html).toContain('an outside service Onstock does not operate')
    expect(html).toContain('does not offer it in the United States')
    expect(html).toContain('Not investment advice.')
    expect(html).not.toContain('Availability depends on your region')
  })
})
