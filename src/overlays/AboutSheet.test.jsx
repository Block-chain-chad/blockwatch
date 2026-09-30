import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import AboutSheet from './AboutSheet'

/*
 * The "what Onstock is" sentence, which appears in two places that have to
 * agree: the About sheet and the published privacy policy.
 *
 * It used to say Onstock "does not hold funds, execute trades, or give
 * investment advice". The first and third are still true and stay. The middle
 * one stopped being a clean statement once the app could build a swap
 * transaction for the user's wallet to sign, so it is now stated precisely
 * rather than dropped. The policy also claimed push-notification access was
 * disabled at the platform level, while SetAlertSheet asks for exactly that
 * permission.
 */

const privacy = readFileSync(new URL('../../public/privacy.html', import.meta.url), 'utf8')

// Sheet reads document.activeElement while rendering, to restore focus on
// close. Effects do not run in a static render, so this one field is the
// whole shim.
beforeEach(() => vi.stubGlobal('document', { activeElement: null }))
afterEach(() => vi.unstubAllGlobals())

describe('AboutSheet custody and advice copy', () => {
  const render = () => renderToStaticMarkup(<AboutSheet onClose={() => {}} />)

  it('keeps the two claims that are true', () => {
    const html = render()
    expect(html).toContain('never holds your funds')
    expect(html).toContain('gives no investment advice')
  })

  it('states the trade-execution position precisely instead of flatly', () => {
    const html = render()
    expect(html).toContain('prepares the transaction for your own')
    expect(html).toContain('wallet to approve and send')
    expect(html).not.toContain('does not hold funds, execute trades')
  })
})

describe('privacy.html', () => {
  it('makes the same custody and advice claims as the About sheet', () => {
    expect(privacy).toContain('never holds your funds')
    expect(privacy).toContain('gives no investment advice')
    expect(privacy).toContain('prepares the transaction for your own wallet')
    expect(privacy).not.toContain('does not hold funds, execute trades')
  })

  it('no longer claims notification access is disabled', () => {
    expect(privacy).not.toContain('push-notification access')
    expect(privacy).toContain('only if you grant permission when asked')
    // The three the app genuinely never asks for are still listed.
    expect(privacy).toContain('No camera, microphone, or location access')
  })
})
