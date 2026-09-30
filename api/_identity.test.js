import { describe, it, expect } from 'vitest'
import { appleSubjects, jwtClaims, lastSignInAt, signedInRecently, RECENT_SIGN_IN_SECONDS } from './_identity.js'

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (claims) => `${b64url({ alg: 'HS256' })}.${b64url(claims)}.sig`
const NOW = Date.parse('2026-09-30T12:00:00Z')
const at = (secondsAgo) => NOW / 1000 - secondsAgo

describe('jwtClaims', () => {
  it('reads the payload, including non-ASCII text', () => {
    expect(jwtClaims(jwt({ sub: 'x', name: 'Zoë' }))).toEqual({ sub: 'x', name: 'Zoë' })
  })

  it('is null for anything that is not a JWT', () => {
    for (const t of [undefined, '', 'abc', 'a.!!!.c', 'a.bnVsbA.c', 42]) expect(jwtClaims(t)).toBeNull()
  })
})

describe('recent sign-in', () => {
  it('reads the latest amr time, not iat', () => {
    const token = jwt({ iat: at(0), amr: [{ method: 'password', timestamp: at(3600) }, { method: 'otp', timestamp: at(120) }] })
    expect(lastSignInAt(token)).toBe(at(120))
  })

  it('counts a sign-in within 10 minutes as recent, and one just over as not', () => {
    expect(signedInRecently(jwt({ amr: [{ timestamp: at(RECENT_SIGN_IN_SECONDS - 1) }] }), NOW)).toBe(true)
    expect(signedInRecently(jwt({ amr: [{ timestamp: at(RECENT_SIGN_IN_SECONDS + 1) }] }), NOW)).toBe(false)
  })

  it('is not recent without amr times, and tolerates only a small clock skew', () => {
    expect(signedInRecently(jwt({ iat: at(0) }), NOW)).toBe(false)
    expect(signedInRecently(jwt({ amr: [{ timestamp: 'soon' }] }), NOW)).toBe(false)
    expect(signedInRecently(jwt({ amr: [{ timestamp: at(-30) }] }), NOW)).toBe(true)
    expect(signedInRecently(jwt({ amr: [{ timestamp: at(-3600) }] }), NOW)).toBe(false)
  })
})

describe('appleSubjects', () => {
  it('collects the Apple user id from every place Supabase puts it, and nothing else', () => {
    const user = {
      identities: [
        { provider: 'email', id: 'not-apple' },
        { provider: 'apple', id: 'a1', identity_id: 'row-uuid', provider_id: 'a1', identity_data: { sub: 'a1' } },
      ],
    }
    expect([...appleSubjects(user)]).toEqual(['a1'])
    expect(appleSubjects(null).size).toBe(0)
  })
})
