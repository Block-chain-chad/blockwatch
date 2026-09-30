import { describe, it, expect } from 'vitest'
import { displayIdentity, isAppleRelayEmail } from './identity'

const RELAY = 'w7k6vt4yj9@privaterelay.appleid.com'

describe('displayIdentity', () => {
  it('is null for a guest', () => {
    expect(displayIdentity(null)).toBeNull()
  })

  it('leads with the full name and keeps the email as a second line', () => {
    const user = { email: RELAY, user_metadata: { full_name: 'Marcus LoTempio', name: 'Other' } }
    expect(displayIdentity(user)).toEqual({ title: 'Marcus LoTempio', detail: RELAY, initial: 'M' })
  })

  it('falls back to name when full_name is missing or blank', () => {
    const user = { email: 'a@b.c', user_metadata: { full_name: '  ', name: ' dana ' } }
    expect(displayIdentity(user)).toEqual({ title: 'dana', detail: 'a@b.c', initial: 'D' })
  })

  it('shows a real email on its own when there is no name', () => {
    expect(displayIdentity({ email: 'zoe@example.com', user_metadata: {} })).toEqual({
      title: 'zoe@example.com',
      detail: null,
      initial: 'Z',
    })
  })

  it('never uses a hidden Apple address as the title or the avatar letter', () => {
    expect(displayIdentity({ email: RELAY, user_metadata: {} })).toEqual({
      title: 'Signed in with Apple',
      detail: RELAY,
      initial: null,
    })
    expect(displayIdentity({ email: RELAY.toUpperCase() }).initial).toBeNull()
  })

  it('takes the whole first character when a name starts with an emoji', () => {
    expect(displayIdentity({ email: 'a@b.c', user_metadata: { full_name: '\u{1F680} Rocket' } }).initial).toBe('\u{1F680}')
    expect(displayIdentity({ email: 'a@b.c', user_metadata: { full_name: '\u{1F469}\u200D\u{1F4BB} Dev' } }).initial).toBe(
      '\u{1F469}\u200D\u{1F4BB}'
    )
    expect(displayIdentity({ user_metadata: { name: 'e\u0301mile' } }).initial).toBe('E\u0301')
  })

  it('copes with no email and no metadata', () => {
    expect(displayIdentity({ id: 'u1', email: '' })).toEqual({ title: 'Signed in', detail: null, initial: null })
  })

  it('ignores metadata values that are not text', () => {
    expect(displayIdentity({ email: 'a@b.c', user_metadata: { full_name: 42, name: null } }).title).toBe('a@b.c')
  })
})

describe('isAppleRelayEmail', () => {
  it('matches only the Apple relay domain', () => {
    expect(isAppleRelayEmail(RELAY)).toBe(true)
    expect(isAppleRelayEmail('me@privaterelay.appleid.com.evil.io')).toBe(false)
    expect(isAppleRelayEmail('me@icloud.com')).toBe(false)
    expect(isAppleRelayEmail(undefined)).toBe(false)
  })
})
