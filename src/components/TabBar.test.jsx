import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The Trade tab used to wear a "soon" tag, a promise that in-app trading is
 * coming. Onstock does not offer trading and no lawyer has ruled on it, so
 * neither the phone tab bar nor the desktop rail may say it is on its way.
 */

vi.mock('../state/AlertsContext', () => ({ useAlerts: () => ({ unread: false }) }))

const { default: TabBar } = await import('./TabBar')
const { default: NavRail } = await import('./desktop/NavRail')

describe('navigation', () => {
  it('promises nothing about trading', () => {
    for (const html of [
      renderToStaticMarkup(<TabBar tab="home" onChange={() => {}} />),
      renderToStaticMarkup(<NavRail tab="home" onTab={() => {}} />),
    ]) {
      expect(html).toContain('Trade')
      expect(html.toLowerCase()).not.toContain('soon')
    }
  })
})
