import { describe, it, expect } from 'vitest'
import { canAlertOnGap, driftStep, driftWindowNote, REARM_RATIO, DRIFT_COOLDOWN_MS } from './alertRules'
import { LIVE_QUOTE_SECONDS } from './provenance'

/*
 * What is being defended: a drift alert must only ever describe a gap the app
 * would itself print as reliable. Before this, AlertsContext evaluated drift
 * at 3am against yesterday's close and pushed the phantom difference to the
 * operating system. These cases fail if that ever comes back.
 */

// A Thursday inside the regular session, so getMarketDay/shareFreshness see a
// normal trading day rather than a holiday.
const NOW = Date.parse('2026-09-17T15:00:00Z') // 11:00 ET
const traded = (secondsAgo) => ({ price: 218.29, basis: 'trade', asOf: NOW - secondsAgo * 1000 })
const gate = (quote, session = 'regular') => canAlertOnGap({ quote, session, now: NOW })

describe('canAlertOnGap', () => {
  it('opens only in the regular session with a quote inside the live threshold', () => {
    expect(gate(traded(5))).toBe(true)
    expect(gate(traded(LIVE_QUOTE_SECONDS))).toBe(true)
  })

  it('shuts one second past the live threshold, while the market is open', () => {
    expect(gate(traded(LIVE_QUOTE_SECONDS + 1))).toBe(false)
    expect(gate(traded(15 * 60))).toBe(false)
  })

  it('shuts on a quote stamped in the future', () => {
    // The gate reads shareFreshness's verdict, and a negative age used to
    // come back 'live'. A device with a slow clock would have got drift
    // alerts on every stale quote it held.
    expect(gate({ price: 218.29, basis: 'trade', asOf: NOW + 5 * 60_000 })).toBe(false)
  })

  it('shuts in every session but the regular one, however fresh the quote', () => {
    for (const session of ['pre', 'post', 'closed']) {
      expect(gate(traded(1), session)).toBe(false)
    }
  })

  it('shuts on a previous close the provider sent during the session', () => {
    expect(gate({ price: 218.29, basis: 'prevClose', prevClose: 218.29, asOf: null })).toBe(false)
    // …even when it carries a timestamp of this second.
    expect(gate({ price: 218.29, basis: 'prevClose', asOf: NOW })).toBe(false)
  })

  it('shuts on an undated quote rather than guessing its age', () => {
    expect(gate({ price: 218.29, basis: 'trade', asOf: null })).toBe(false)
  })

  it('shuts when there is no quote at all', () => {
    expect(gate(null)).toBe(false)
    expect(gate(undefined)).toBe(false)
    expect(gate({ price: null, basis: 'trade', asOf: NOW })).toBe(false)
  })

  it('agrees with what the screens print: open only where the share reads live', () => {
    // The gap panel says "live" for exactly this quote and session, and says
    // "last close"/"delayed" for the others. The alert follows the words.
    expect(gate(traded(30))).toBe(true)
    expect(gate(traded(30), 'post')).toBe(false)
  })
})

describe('driftStep while the gate is shut', () => {
  const shut = (state) =>
    driftStep({ premium: 9, threshold: 1, state, lastFiredAt: 0, now: NOW, allowed: false })

  it('never fires, however far outside the band the phantom gap is', () => {
    expect(shut('inside').fire).toBe(false)
    expect(shut('outside').fire).toBe(false)
  })

  it('leaves the state machine exactly as it found it', () => {
    // Overnight drift must not mark the rule 'outside': that would consume the
    // crossing, and the real gap at 10am would fire nothing.
    expect(shut('inside').state).toBe('inside')
    expect(shut('outside').state).toBe('outside')
    // Nor may a phantom return to parity re-arm a rule that is legitimately
    // outside the band.
    expect(
      driftStep({ premium: 0, threshold: 1, state: 'outside', now: NOW, allowed: false })
    ).toEqual({ state: 'outside', fire: false })
  })

  it('does not fire the moment the gate opens on the same stale reading', () => {
    // The 09:30 case: the session flips to regular while the held quote is
    // still yesterday's close, so `allowed` is still false and the pass is
    // still a no-op. The burst only ever came from evaluating that reading.
    const held = { premium: 9, threshold: 1, state: 'inside', now: NOW }
    expect(driftStep({ ...held, allowed: false })).toEqual({ state: 'inside', fire: false })
    // Once a genuinely fresh quote lands, the same excursion is still armed
    // and fires once — it was held, not thrown away.
    expect(driftStep({ ...held, allowed: true })).toEqual({ state: 'outside', fire: true })
  })
})

describe('driftStep while the gate is open', () => {
  const step = (over) => driftStep({ threshold: 1, now: NOW, allowed: true, ...over })

  it('fires when the gap crosses the band, and only on the crossing', () => {
    expect(step({ premium: 1.42, state: 'inside' })).toEqual({ state: 'outside', fire: true })
    expect(step({ premium: 1.42, state: 'outside' })).toEqual({ state: 'outside', fire: false })
    expect(step({ premium: -1.42, state: 'inside' })).toEqual({ state: 'outside', fire: true })
  })

  it('treats the threshold itself as outside', () => {
    expect(step({ premium: 1, state: 'inside' })).toEqual({ state: 'outside', fire: true })
  })

  it('re-arms only once the gap falls clearly back inside the band', () => {
    // Hysteresis: at 90% of the threshold it is still 'outside', so a premium
    // hovering on the line cannot flip the machine on every 2.5s tick.
    expect(step({ premium: 0.9, state: 'outside' })).toEqual({ state: 'outside', fire: false })
    expect(step({ premium: REARM_RATIO - 0.01, state: 'outside' })).toEqual({
      state: 'inside',
      fire: false,
    })
  })

  it('holds the crossing armed when the cooldown suppresses the fire', () => {
    const inCooldown = step({ premium: 2, state: 'inside', lastFiredAt: NOW - 60_000 })
    // 'inside', not 'outside': the excursion is rate-limited, not dropped.
    expect(inCooldown).toEqual({ state: 'inside', fire: false })
    expect(step({ premium: 2, state: 'inside', lastFiredAt: NOW - DRIFT_COOLDOWN_MS - 1 })).toEqual({
      state: 'outside',
      fire: true,
    })
  })

  it('does nothing without a premium to read', () => {
    expect(step({ premium: null, state: 'inside' })).toEqual({ state: 'inside', fire: false })
    expect(step({ premium: null, state: 'outside' })).toEqual({ state: 'outside', fire: false })
  })

  it('starts a rule with no remembered state inside the band', () => {
    expect(driftStep({ premium: 0.1, threshold: 1, now: NOW, allowed: true })).toEqual({
      state: 'inside',
      fire: false,
    })
  })
})

describe('driftWindowNote', () => {
  it('names the share and both halves of the gate', () => {
    const note = driftWindowNote('NVDA')
    expect(note).toContain('while the US market is open')
    expect(note).toContain('NVDA quote is live')
  })

  it('says "share" rather than printing a missing underlying', () => {
    // Half the sheet's callers do not check for one first.
    for (const missing of [null, undefined, '']) {
      expect(driftWindowNote(missing)).toContain('share quote is live')
      expect(driftWindowNote(missing)).not.toMatch(/null|undefined/)
    }
  })
})
