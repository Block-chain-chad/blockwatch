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
