import { describe, it, expect, afterEach } from 'vitest'
import {
  envEnabled,
  readFlags,
  resolveFlag,
  flagEnabled,
  applyFlags,
  loadFeatureFlags,
  SWAP_FLAG,
  LINK_OUT_FLAG,
  ACCOUNT_DELETION_FLAG,
} from './featureFlags'

/*
 * The switch that decides whether a real-money button is on screen.
 *
 * The property that matters most here is negative: there must be no input —
 * no answer, a broken answer, a variant string, a dropped connection — that
 * turns the swap ON when nothing affirmatively said so.
 */

// The store is module-level, so every test hands it back empty.
afterEach(() => applyFlags(null))

describe('envEnabled', () => {
  it('reads Vite string values, including the string "false"', () => {
    // Vite passes env through as strings. A truthiness test would read the
    // string "false" as on, which is the bug this exists to prevent.
    expect(envEnabled('false', true)).toBe(false)
    expect(envEnabled('true', false)).toBe(true)
  })

  it('falls back for unset or unrecognised values', () => {
    expect(envEnabled(undefined, false)).toBe(false)
    expect(envEnabled('', false)).toBe(false)
    expect(envEnabled('yes', false)).toBe(false)
    expect(envEnabled(undefined, true)).toBe(true)
  })
})

describe('readFlags', () => {
  it('reads the /flags?v=2 shape', () => {
    expect(readFlags({ flags: { [SWAP_FLAG]: { enabled: true } } })).toEqual({
      [SWAP_FLAG]: true,
    })
  })

  it('reads the older featureFlags map', () => {
    expect(readFlags({ featureFlags: { [SWAP_FLAG]: true } })).toEqual({ [SWAP_FLAG]: true })
  })

  it('lets the detailed shape win when a body carries both', () => {
    const body = {
      flags: { [SWAP_FLAG]: { enabled: false } },
      featureFlags: { [SWAP_FLAG]: true },
    }
    expect(readFlags(body)[SWAP_FLAG]).toBe(false)
  })

  it('treats a multivariate variant string as off', () => {
    // A variant name is not permission to spend someone's money.
    expect(readFlags({ featureFlags: { [SWAP_FLAG]: 'control' } })[SWAP_FLAG]).toBe(false)
    expect(readFlags({ flags: { [SWAP_FLAG]: { variant: 'test' } } })[SWAP_FLAG]).toBe(false)
  })

  it('survives junk bodies without throwing', () => {
    for (const body of [null, undefined, {}, { flags: 'nope' }, { featureFlags: 7 }]) {
      expect(readFlags(body)).toEqual({})
    }
  })
})

describe('resolveFlag', () => {
  it('lets a remote answer win in both directions', () => {
    expect(resolveFlag(true, false)).toBe(true)
    expect(resolveFlag(false, true)).toBe(false)
  })

  it('takes the fallback when there is no remote answer', () => {
    expect(resolveFlag(undefined, true)).toBe(true)
    expect(resolveFlag(undefined, false)).toBe(false)
  })
})

describe('the swap flag defaults off', () => {
  it('is off before PostHog has answered', () => {
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })

  it('is off when PostHog answers without mentioning it', () => {
    applyFlags({ 'some-other-flag': true })
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })

  it('turns on only when PostHog says so, and off again when it says so', () => {
    applyFlags({ [SWAP_FLAG]: true })
    expect(flagEnabled(SWAP_FLAG)).toBe(true)
    applyFlags({ [SWAP_FLAG]: false })
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })

  it('goes back off when the answer is dropped', () => {
    // Losing contact with the switch must not leave the swap running.
    applyFlags({ [SWAP_FLAG]: true })
    applyFlags(null)
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })
})

describe('the link-out flag defaults off', () => {
  it('is off before PostHog has answered, so an outage cannot bring the link-outs back', () => {
    expect(flagEnabled(LINK_OUT_FLAG)).toBe(false)
  })

  it('follows PostHog when it answers', () => {
    applyFlags({ [LINK_OUT_FLAG]: true })
    expect(flagEnabled(LINK_OUT_FLAG)).toBe(true)
    applyFlags({ [LINK_OUT_FLAG]: false })
    expect(flagEnabled(LINK_OUT_FLAG)).toBe(false)
  })
})

describe('loadFeatureFlags fails closed', () => {
  // No VITE_POSTHOG_KEY under vitest, so the loader short-circuits to the
  // fallbacks. That is itself the "key is missing" case.
  it('leaves the swap off when there is no project key', async () => {
    await loadFeatureFlags({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) })
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })

  it('drops a previous answer rather than keeping a stale ON', async () => {
    applyFlags({ [SWAP_FLAG]: true })
    await loadFeatureFlags({
      fetchImpl: async () => {
        throw new Error('network down')
      },
    })
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })

  it('never throws, whatever the transport does', async () => {
    await expect(
      loadFeatureFlags({ fetchImpl: async () => ({ ok: false, status: 500 }) })
    ).resolves.toBeUndefined()
    await expect(
      loadFeatureFlags({
        fetchImpl: async () => ({
          ok: true,
          json: async () => {
            throw new Error('not json')
          },
        }),
      })
    ).resolves.toBeUndefined()
    expect(flagEnabled(SWAP_FLAG)).toBe(false)
  })
})

describe('account deletion switch', () => {
  it('uses the PostHog key account-deletion', () => {
    expect(ACCOUNT_DELETION_FLAG).toBe('account-deletion')
  })

  it('is off until PostHog says on, and off again when PostHog cannot be reached', async () => {
    expect(flagEnabled(ACCOUNT_DELETION_FLAG)).toBe(false)
    applyFlags({ [ACCOUNT_DELETION_FLAG]: true })
    expect(flagEnabled(ACCOUNT_DELETION_FLAG)).toBe(true)
    await loadFeatureFlags({
      fetchImpl: async () => {
        throw new Error('network down')
      },
    })
    expect(flagEnabled(ACCOUNT_DELETION_FLAG)).toBe(false)
  })
})
