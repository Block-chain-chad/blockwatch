import { describe, it, expect } from 'vitest'
import { resolveDesktopHome, DESKTOP_HOME_KEY, HOMES } from './desktopHome'

describe('resolveDesktopHome', () => {
  it('honours the query first, then the saved choice, then the default', () => {
    expect(resolveDesktopHome({ search: '?home=chart', saved: 'meter' })).toBe('chart')
    expect(resolveDesktopHome({ search: '?x=1&home=meter', saved: 'chart' })).toBe('meter')
    expect(resolveDesktopHome({ search: '', saved: 'chart' })).toBe('chart')
    expect(resolveDesktopHome({ search: '', saved: null })).toBe('meter')
    expect(resolveDesktopHome({ search: '?home=nonsense', saved: 'chart' })).toBe('chart')
    expect(resolveDesktopHome({})).toBe('meter')
    expect(DESKTOP_HOME_KEY).toBe('bw.desktop.home.v1')
    expect(HOMES).toEqual(['meter', 'chart'])
  })
})
