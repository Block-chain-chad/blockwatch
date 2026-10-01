import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'

/*
 * The "Where tokens trade" sheet: the guards the old Venues screen carried,
 * moved here with its text (acceptance criterion 14).
 *
 * What is being defended is a compliance finding, not a layout. The old
 * screen promised in-app trading, said Onstock "routes", pointed people to
 * "the right place", and asked United States readers to join a waitlist for
 * tokens the issuers do not offer them. These cases fail if any of it
 * returns, if a venue becomes a link, or if the sheet can be reached from
 * Holdings.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

beforeEach(() => vi.stubGlobal('document', { activeElement: null }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const { WhereTokensTradeSheet, default: WhereTokensTrade } = await import('./WhereTokensTrade')
const render = () => renderToStaticMarkup(<WhereTokensTradeSheet onClose={() => {}} />)

describe('Where tokens trade, website', () => {
  it('says exactly what the approved text says', () => {
    const html = render()
    expect(html).toContain('Where tokens trade')
    expect(html).toContain(
      'Tokenized stocks trade on outside services. Onstock does not operate, check or recommend any of them, and each one decides who may use it.',
    )
    expect(html).toContain('Not offered in the United States')
    expect(html).toContain(
      'These exchanges say they do not serve people in the United States. The tokens&#x27; issuers also restrict the United Kingdom and some other countries.',
    )
    expect(html).toContain(
      'These are outside services with their own terms and their own rules about who may use them. Onstock does not route orders, hold funds or execute trades.',
    )
  })

  it('names the four exchanges as plain text, with no links, no Jupiter and no Nasdaq paragraph', () => {
    const html = render()
    for (const name of ['Kraken', 'Bybit', 'Gate.io', 'KuCoin']) expect(html).toContain(`>${name}<`)
    expect(html.match(/>Exchange</g)).toHaveLength(4)
    expect(html).not.toContain('href=')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('Jupiter')
    expect(html).not.toContain('Nasdaq')
    expect(html).not.toContain('paused')
  })

  it('offers, routes and recommends nothing, and asks nobody for an email', () => {
    const html = render()
    for (const gone of ['The market is open', 'the right place', 'Onstock routes', 'In-app trading is', 'links to them', 'type="email"', 'waitlist']) {
      expect(html).not.toContain(gone)
    }
  })

  it('sends no trade_out event', () => {
    const src = readFileSync(new URL('./WhereTokensTrade.jsx', import.meta.url), 'utf8')
    expect(src).not.toContain('track(')
    expect(src).not.toContain('trade_out')
  })

  it('opens from a quiet text row', () => {
    const html = renderToStaticMarkup(<WhereTokensTrade />)
    expect(html).toMatch(/^<button[^>]*>Where tokens trade<svg/)
  })
})

describe('Where tokens trade, iPhone build', () => {
  it('is the one approved sentence, with no venue names', () => {
    vi.stubEnv('VITE_BUILD_TARGET', 'ios')
    const html = render()
    expect(html).toContain(
      'Tokenized stocks trade on outside venues that Onstock does not operate. Their issuers say the tokens are not offered in the United States, and each venue decides who may use it.',
    )
    for (const name of ['Kraken', 'Bybit', 'Gate.io', 'KuCoin', 'Not offered in the United States']) expect(html).not.toContain(name)
  })
})

describe('where the sheet opens from', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

  it('the token screen (phone and desktop) and the About sheet', () => {
    expect(read('../screens/AssetDetail.jsx')).toContain('<WhereTokensTrade')
    expect(read('../components/desktop/DetailTabs.jsx')).toContain('<WhereTokensTrade')
    expect(read('./AboutSheet.jsx')).toContain('<WhereTokensTrade')
  })

  it('never from Holdings', () => {
    for (const path of ['../screens/Holdings.jsx', './HoldingSheet.jsx', './AddHoldingSheet.jsx', '../components/HoldingParts.jsx', '../state/HoldingsContext.jsx']) {
      expect(read(path), path).not.toContain('WhereTokensTrade')
      expect(read(path), path).not.toMatch(/SwapSheet|services\/swap|jup\.ag|trade_out/)
    }
  })
})
