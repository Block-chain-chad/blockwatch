/*
 * How a signed-in person is named on screen.
 *
 * Sign in with Apple can hide the real address behind a random
 * @privaterelay.appleid.com one. That address is not who the person is, so it
 * never becomes the headline or the avatar letter. Apple sends the name only
 * on the first sign-in; Supabase keeps it in user_metadata, which is where we
 * read it from.
 */

const APPLE_RELAY = /@privaterelay\.appleid\.com$/i

// The title for an account with no name and no email at all.
export const UNNAMED_TITLE = 'Signed in'

const clean = (v) => (typeof v === 'string' ? v.trim() : '')

export function isAppleRelayEmail(email) {
  return APPLE_RELAY.test(clean(email))
}

/**
 * Returns `{ title, detail, initial }` for a Supabase user, or null for a guest.
 * - title: the name if we have one, else a real email, else a neutral label.
 * - detail: the email as a quieter second line, only when the title is not
 *   already the email. Null when there is nothing more to say.
 * - initial: one capital letter for the avatar, or null to show the person icon.
 */
export function displayIdentity(user) {
  if (!user) return null
  const meta = user.user_metadata || {}
  const name = clean(meta.full_name) || clean(meta.name)
  const email = clean(user.email)
  const relay = isAppleRelayEmail(email)

  const title = name || (email && !relay ? email : relay ? 'Signed in with Apple' : UNNAMED_TITLE)
  const detail = email && title !== email ? email : null
  const source = name || (relay ? '' : email)
  const initial = source ? source[0].toUpperCase() : null
  return { title, detail, initial }
}
