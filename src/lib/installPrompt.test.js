import { describe, it, expect } from 'vitest'
import { isIosSafari, shouldOfferInstall, browserInstallContext } from './installPrompt'

/*
 * Who is told to add Onstock to their Home Screen. The instruction names
 * Safari's Share sheet, so the claims worth pinning are that it reaches
 * Safari on iPhone and iPad, and nobody else: not other iOS browsers, not
 * in-app browsers, not Android or desktop, not someone who already installed
 * it, and never the native app.
 *
 * The user agents are real strings as those browsers send them.
 */

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipadSafariDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.7258.76 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/142.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/139.3405.86 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85 (iPhone15,2; iOS 18_5; en_US; en; scale=3.00; 1179x2556)',
  iphoneWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
}

const offer = (userAgent, extra = {}) =>
  shouldOfferInstall({ userAgent, maxTouchPoints: 5, standalone: false, native: false, ...extra })

describe('isIosSafari', () => {
  it('recognises Safari on an iPhone', () => {
    expect(isIosSafari({ userAgent: UA.iphoneSafari, maxTouchPoints: 5 })).toBe(true)
  })

  it('recognises Safari on an iPad that reports itself as a Mac', () => {
    expect(isIosSafari({ userAgent: UA.ipadSafariDesktopMode, maxTouchPoints: 5 })).toBe(true)
  })

  it('does not take a real Mac for an iPad', () => {
    expect(isIosSafari({ userAgent: UA.macSafari, maxTouchPoints: 0 })).toBe(false)
  })

  it.each(['iphoneChrome', 'iphoneFirefox', 'iphoneEdge', 'iphoneInstagram', 'iphoneWebView'])(
    'refuses %s, whose Share sheet may not say Add to Home Screen',
    (name) => {
      expect(isIosSafari({ userAgent: UA[name], maxTouchPoints: 5 })).toBe(false)
    },
  )

  it.each(['androidChrome', 'windowsChrome'])('refuses %s', (name) => {
    expect(isIosSafari({ userAgent: UA[name], maxTouchPoints: 5 })).toBe(false)
  })

  it('refuses a missing user agent', () => {
    expect(isIosSafari()).toBe(false)
    expect(isIosSafari({ userAgent: undefined })).toBe(false)
  })
})

describe('shouldOfferInstall', () => {
  it('offers to iPhone Safari in a normal tab', () => {
    expect(offer(UA.iphoneSafari)).toBe(true)
  })

  it('never offers once launched from the Home Screen', () => {
    expect(offer(UA.iphoneSafari, { standalone: true })).toBe(false)
  })

  it('never offers inside the native app, whatever the user agent says', () => {
    expect(offer(UA.iphoneSafari, { native: true })).toBe(false)
    expect(offer(UA.iphoneWebView, { native: true })).toBe(false)
  })

  it('leaves Android and desktop alone', () => {
    expect(offer(UA.androidChrome)).toBe(false)
    expect(offer(UA.windowsChrome, { maxTouchPoints: 0 })).toBe(false)
    expect(offer(UA.macSafari, { maxTouchPoints: 0 })).toBe(false)
  })
})

describe('browserInstallContext', () => {
  const win = ({ standalone, displayMode = false, matchMedia } = {}) => ({
    navigator: { userAgent: UA.iphoneSafari, maxTouchPoints: 5, standalone },
    matchMedia: matchMedia ?? (() => ({ matches: displayMode })),
  })

  it('reads a normal Safari tab as not standalone', () => {
    expect(browserInstallContext(win({ standalone: false }))).toEqual({
      userAgent: UA.iphoneSafari,
      maxTouchPoints: 5,
      standalone: false,
    })
  })

  it("reads Safari's own standalone flag", () => {
    expect(browserInstallContext(win({ standalone: true })).standalone).toBe(true)
  })

  it('reads the display-mode media query', () => {
    expect(browserInstallContext(win({ displayMode: true })).standalone).toBe(true)
  })

  it('treats a throwing matchMedia as not standalone', () => {
    const w = win({
      matchMedia: () => {
        throw new Error('no')
      },
    })
    expect(browserInstallContext(w).standalone).toBe(false)
  })

  it('copes with no window at all', () => {
    expect(browserInstallContext(undefined)).toEqual({ userAgent: '', maxTouchPoints: 0, standalone: false })
  })
})
