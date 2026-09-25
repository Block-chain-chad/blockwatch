// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * learn_open, from the one component all three placements share (Home, News,
 * the desktop Learn tab). The claim under test is that a tap is counted once,
 * with the placement it came from, and that the sheet still opens exactly as
 * before. A tap needs a DOM, so this file runs in jsdom.
 */

const track = vi.fn()
vi.mock('../services/analytics', () => ({ track: (...args) => track(...args) }))

const { default: LearnCards } = await import('./LearnCards')

let container
let root

function mount(source) {
  act(() => root.render(<LearnCards source={source} />))
}

function rowButton(title) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent === title)
}

beforeEach(() => {
  track.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('LearnCards', () => {
  it('sends nothing just for being on screen', () => {
    mount('home')
    expect(container.textContent).toContain('Learn the basics')
    expect(track).not.toHaveBeenCalled()
  })

  it.each(['home', 'news', 'desktop'])('counts a tap from %s once, with its source', (source) => {
    mount(source)
    act(() => rowButton("What's a basis point?").click())
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('learn_open', { source, lesson: 'basispoints' })
  })

  it('still opens the lesson sheet on tap', () => {
    mount('home')
    act(() => rowButton("What's a premium?").click())
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('A tokenized stock usually trades within a whisker')
  })
})

/*
 * Wording the Compliance Reviewer changed on 2026-09-24, pinned so it does not
 * drift back. Each old phrase either read a gap as a signal, overstated what a
 * token is, left out who can redeem, or promised no one could freeze a token.
 */
describe('LearnCards wording', () => {
  const lessonText = (title) => {
    mount('news')
    act(() => rowButton(title).click())
    return document.querySelector('[role="dialog"]').textContent
  }

  it('says a big gap has many causes and is not a signal', () => {
    const t = lessonText("What's a premium?")
    expect(t).toContain('They can come from thin trading, a stale share price, a pause at the issuer or an exchange, or a data error')
    expect(t).toContain("A gap describes prices; it isn't a signal to buy or sell.")
    expect(t).not.toContain('paying up')
  })

  it('describes backing without calling the token a claim on the share, and states the redemption limits', () => {
    const t = lessonText('How are tokens backed?')
    expect(t).toContain("holds it with a licensed custodian as backing, and the token is built to track that share's price")
    expect(t).not.toContain('claim on that share')
    expect(t).not.toContain('pocket the difference')
    expect(t).toContain('not available to people in the United States')
  })

  it('does not promise the weekend gap snaps back', () => {
    const t = lessonText('Why weekend prices drift')
    expect(t).toContain('It may narrow, persist or widen.')
    expect(t).not.toContain('snaps back')
  })

  it('does not steer toward the cheaper issuer', () => {
    const t = lessonText('Meet the issuers')
    expect(t).toContain("Price isn't the only difference")
    expect(t).not.toContain('cheaper')
  })

  it('does not promise that nobody can freeze a token', () => {
    const t = lessonText('Who actually holds my money?')
    expect(t).toContain("The token's issuer may still be able to pause or freeze it.")
    expect(t).not.toContain('can freeze, lend out or lose')
  })
})
