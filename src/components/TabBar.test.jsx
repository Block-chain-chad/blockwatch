import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The navigation: Home, Gaps, Folders, News and Holdings on the web. There is
 * no Trade or Venues tab any more; the venue information lives in the "Where
 * tokens trade" sheet. No tab may promise that trading is on its way (no
 * "soon" tag). Holdings is web only in version one, so the iPhone build has
 * the four other tabs (acceptance criteria 1 and 20).
 */

vi.mock('../state/AlertsContext', () => ({ useAlerts: () => ({ unread: false }) }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('navigation', () => {
  it('ends with Holdings, and promises nothing about trading', async () => {
    const { default: TabBar } = await import('./TabBar')
    const { default: NavRail } = await import('./desktop/NavRail')
    const { TABS } = await import('../lib/tabs')
    expect(TABS.map((t) => t.label)).toEqual(['Home', 'Gaps', 'Folders', 'News', 'Holdings'])
    expect(TABS.map((t) => t.id)).not.toContain('trade')
    for (const html of [
      renderToStaticMarkup(<TabBar tab="home" onChange={() => {}} />),
      renderToStaticMarkup(<NavRail tab="home" onTab={() => {}} />),
    ]) {
      expect(html).toContain('Holdings')
      expect(html).not.toContain('Venues')
      expect(html).not.toContain('>Trade<')
      expect(html.toLowerCase()).not.toContain('soon')
    }
  })

  it('has no Holdings tab in the iPhone build', async () => {
    vi.stubEnv('VITE_BUILD_TARGET', 'ios')
    const { TABS } = await import('../lib/tabs')
    expect(TABS.map((t) => t.label)).toEqual(['Home', 'Gaps', 'Folders', 'News'])
  })
})
