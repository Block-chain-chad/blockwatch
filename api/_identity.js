// Facts about a Supabase user record, shared by the app and the server.
// Pure, with no Node or browser imports, so both sides can load it (the app
// already imports ./_geckoterminal.js the same way).

/** Whether this account signs in with Apple (and so has a grant to revoke). */
export function usesApple(user) {
  if (user?.identities?.some((i) => i?.provider === 'apple')) return true
  const providers = user?.app_metadata?.providers
  return Array.isArray(providers) && providers.includes('apple')
}
