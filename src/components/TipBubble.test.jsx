// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import TipBubble from './TipBubble'
import { TIP_COPY } from '../lib/tips'
import { closedGapLabel } from '../lib/sessionCopy'

/*
 * The bubble on its own: both tips' text, every {close} fill of the Market
 * closed sentence, the caret on either side, and the look rules (hairline
 * border, no shadow, 44px targets, the fade that reduced motion turns off).
 * Placement and when it shows are Home's (Home.tips.test.jsx).
 */

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(props) {
  act(() => root.render(<TipBubble id="tip-body" onClose={() => {}} onLink={() => {}} {...props} />))
  return container.querySelector('[data-tip-bubble]')
}

const button = (label) => [...container.querySelectorAll('button')].find((b) => b.textContent === label)

describe('tip 1, the gap', () => {
  it('shows the approved title, body, link and button, as a note named by its title', () => {
    const b = render({ title: TIP_COPY.gap.title, body: TIP_COPY.gap.body, link: TIP_COPY.gap.link })
    expect(b.getAttribute('role')).toBe('note')
    expect(document.getElementById(b.getAttribute('aria-labelledby')).textContent).toBe('The gap')
    expect(document.getElementById('tip-body').textContent).toBe(TIP_COPY.gap.body)
    expect(button("What's a premium?")).toBeTruthy()
    expect(button('Got it')).toBeTruthy()
  })

  it('calls back on Got it and on the link', () => {
    const onClose = vi.fn()
    const onLink = vi.fn()
    render({ title: 'The gap', body: 'b', link: TIP_COPY.gap.link, onClose, onLink })
    act(() => button('Got it').click())
    act(() => button("What's a premium?").click())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onLink).toHaveBeenCalledTimes(1)
  })

  it('leaves the link out when there is none', () => {
    render({ title: 'The gap', body: 'b' })
    expect(container.querySelectorAll('button')).toHaveLength(1)
  })
})

describe('tip 2, Market closed, with each close it can name', () => {
  // Times are UTC; New York time in the comments.
  const CASES = [
    [
      'Saturday, Friday’s close',
      '2026-10-03T15:00:00Z', // Sat 11:00
      'The US market is closed. This gap compares the token’s latest price with the share price at Friday’s close, so the two prices are from different times.',
    ],
    [
      'overnight, today’s close',
      '2026-10-01T02:30:00Z', // Wed 22:30
      'The US market is closed. This gap compares the token’s latest price with the share price at today’s close, so the two prices are from different times.',
    ],
    [
      'after hours, today’s close',
      '2026-10-01T21:00:00Z', // Thu 17:00
      'The share is trading outside regular hours, but this gap compares the token’s latest price with the share price at today’s close, so it may not match where the share is trading now.',
    ],
    [
      'Monday pre-market, Friday’s close',
      '2026-10-05T12:00:00Z', // Mon 08:00
      'The share is trading outside regular hours, but this gap compares the token’s latest price with the share price at Friday’s close, so it may not match where the share is trading now.',
    ],
  ]

  for (const [name, iso, sentence] of CASES) {
    it(name, () => {
      const label = closedGapLabel({ now: Date.parse(iso) })
      const b = render({ title: label.tag, body: label.title, link: TIP_COPY.closed.link })
      expect(document.getElementById(b.getAttribute('aria-labelledby')).textContent).toBe('Market closed')
      expect(document.getElementById('tip-body').textContent).toBe(sentence)
      expect(button('Why weekend prices drift')).toBeTruthy()
    })
  }

  it('says the last close when the quote is older than the calendar’s close', () => {
    const label = closedGapLabel({ now: Date.parse('2026-10-03T15:00:00Z'), quoteAsOf: Date.parse('2026-10-01T20:00:00Z') })
    render({ title: label.tag, body: label.title })
    expect(document.getElementById('tip-body').textContent).toBe(
      'The US market is closed. This gap compares the token’s latest price with the share price at the last close, so the two prices are from different times.',
    )
  })
})

describe('caret', () => {
  const caret = () => container.querySelector('[data-tip-caret]')

  it('sits on the top edge when the bubble is under its row', () => {
    const b = render({ title: 't', body: 'b', side: 'below', caret: 200 })
    expect(b.dataset.side).toBe('below')
    expect(caret().style.top).toBe('-4.5px')
    expect(caret().style.bottom).toBe('')
    expect(caret().style.borderWidth).toBe('1px 0px 0px 1px')
    expect(caret().style.left).toBe('196px')
  })

  it('sits on the bottom edge when the bubble is above its row', () => {
    const b = render({ title: 't', body: 'b', side: 'above', caret: 40 })
    expect(b.dataset.side).toBe('above')
    expect(caret().style.bottom).toBe('-4.5px')
    expect(caret().style.top).toBe('')
    expect(caret().style.borderWidth).toBe('0px 1px 1px 0px')
  })

  it('defaults to the right side before it is measured', () => {
    render({ title: 't', body: 'b' })
    expect(caret().style.right).toBe('20px')
    expect(caret().getAttribute('aria-hidden')).toBe('true')
  })
})

describe('look (criterion 10) and targets', () => {
  it('has a hairline border and no shadow anywhere', () => {
    const b = render({ title: 't', body: 'b', link: 'l' })
    expect(b.className).toMatch(/(^| )border( |$)/)
    expect(b.style.borderColor).toBe('var(--border-default)')
    for (const el of [b, ...b.querySelectorAll('*')]) {
      expect(el.getAttribute('class') ?? '').not.toMatch(/shadow/)
      expect(el.style.boxShadow).toBe('')
    }
  })

  it('caps the width at 280px with 16px either side on a narrow screen', () => {
    expect(render({ title: 't', body: 'b' }).className).toContain('w-[min(280px,calc(100%-32px))]')
  })

  it('fades in with the overlay fade, which reduced motion turns off', () => {
    expect(render({ title: 't', body: 'b' }).className).toContain('overlay-in')
    // A path, not new URL('../index.css', import.meta.url), which Vite would turn into an asset URL.
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8')
    expect(css).toMatch(/\.overlay-in\s*\{\s*animation:\s*bw-fade 0\.15s/)
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced.slice(0, reduced.indexOf('}')).replace(/\s+/g, ' ')).toMatch(/\.overlay-in \{ animation: none;/)
  })

  it('gives Got it and the link 44px targets, and keeps Got it legible in the light theme', () => {
    render({ title: 't', body: 'b', link: 'Why weekend prices drift' })
    expect(button('Got it').className).toContain('min-h-11')
    expect(button('Got it').className).toContain('min-w-11')
    expect(button('Why weekend prices drift').className).toContain('min-h-11')
    expect(button('Got it').className).toContain('[html.light_&]:text-accent-dim')
    expect(button('Why weekend prices drift').className).toContain('underline')
  })
})
