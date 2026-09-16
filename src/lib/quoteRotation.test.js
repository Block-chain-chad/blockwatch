import { describe, it, expect } from 'vitest'
import { quoteCycle, withRetries } from './quoteRotation'

/*
 * Round-1 finding 10: two users behind one office or carrier address
 * cold-loading a board at once can collect 429s from the quote proxy, and a
 * 429 used to render as a blank share price rather than a retry.
 *
 * The blank is not the merge — PricesContext already merges new quotes over
 * old, so a warm board keeps its numbers. The blank is the ROTATION. A cold
 * board has no old quote to keep, and the rotor had already moved past the
 * refused symbol, so nothing asked for it again for three minutes. These cases
 * are about the rotor moving on while the refused symbols come back first.
 */

const board = (n) => Array.from({ length: n }, (_, i) => `T${i}`)

describe('quoteCycle', () => {
  it('quotes a short list whole and leaves the rotor alone', () => {
    const all = board(12)
    expect(quoteCycle(all, 7, 50)).toEqual({ list: all, nextRotor: 7 })
  })

  it('walks a wide board one cap at a time', () => {
    // The desktop Board's real shape: 150 subscribed, 50 a cycle.
    const all = board(150)
    const first = quoteCycle(all, 0, 50)
    expect(first.list).toEqual(all.slice(0, 50))
    const second = quoteCycle(all, first.nextRotor, 50)
    expect(second.list).toEqual(all.slice(50, 100))
    const third = quoteCycle(all, second.nextRotor, 50)
    expect(third.list).toEqual(all.slice(100, 150))
    // Three cycles of 60 seconds: every symbol asked for once per 180s, which
    // is the number the 300s quote cache is sized against.
    expect(third.nextRotor).toBe(0)
  })

  it('wraps rather than returning a short slice at the end', () => {
    const all = board(150)
    const { list, nextRotor } = quoteCycle(all, 130, 50)
    expect(list.length).toBe(50)
    expect(list.slice(0, 20)).toEqual(all.slice(130))
    expect(list.slice(20)).toEqual(all.slice(0, 30))
    expect(nextRotor).toBe(30)
  })

  it('covers every symbol over a full rotation, none twice', () => {
    const all = board(150)
    const seen = []
    let rotor = 0
    for (let i = 0; i < 3; i += 1) {
      const cycle = quoteCycle(all, rotor, 50)
      seen.push(...cycle.list)
      rotor = cycle.nextRotor
    }
    expect([...seen].sort()).toEqual([...all].sort())
  })
})

describe('withRetries', () => {
  it('asks for a refused symbol before the ones whose turn it is', () => {
    // The whole point: NVDA was refused, so it is showing a blank cell. It
    // goes first rather than waiting out a rotation.
    expect(withRetries(['A', 'B', 'C'], ['NVDA'], 50)).toEqual(['NVDA', 'A', 'B', 'C'])
  })

  it('does not ask for a symbol twice in one cycle', () => {
    expect(withRetries(['A', 'B'], ['B'], 50)).toEqual(['B', 'A'])
  })

  it('never answers a rate limit by asking for more than a cycle holds', () => {
    // A retry queue that could push a cycle past the cap would deepen the very
    // deficit that caused the refusal.
    const list = board(50)
    const retries = board(50).map((t) => `R${t}`)
    const due = withRetries(list, retries, 50)
    expect(due.length).toBe(50)
    expect(due).toEqual(retries)
  })

  it('leaves an ordinary cycle exactly as the rotation built it', () => {
    const list = board(50)
    expect(withRetries(list, [], 50)).toEqual(list)
  })

  it('fills the rest of the cycle from the rotation after a partial refusal', () => {
    // Thirty refused, so twenty of this cycle's own slice still fit.
    const list = board(50).map((t) => `N${t}`)
    const retries = board(30)
    const due = withRetries(list, retries, 50)
    expect(due.slice(0, 30)).toEqual(retries)
    expect(due.slice(30)).toEqual(list.slice(0, 20))
  })
})
