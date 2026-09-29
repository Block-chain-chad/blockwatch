// What the gap-history pane says when the token's price history is missing,
// and when it may ask again. Pure; the Readout and the gap chart both read it.
// The kinds come from HistoryUnavailable in services/coingecko.js.

const REASON = {
  busy: 'The price source for this token’s history is busy right now',
  unreachable: 'The price source for this token’s history could not be reached',
  missing: 'The price source has no history for this token yet',
}

/**
 * historyProblem({ kind, retryAt }, now) → { text, retry }
 *
 * `text` says what is missing and why, then that the rest still works.
 * `retry` is null when asking again cannot help (the source has no such
 * token), otherwise { disabled, label }: disabled with a countdown until the
 * cooldown ends, so a click can never spend the budget the prices need.
 */
export function historyProblem(problem, now = Date.now()) {
  const kind = REASON[problem?.kind] ? problem.kind : 'unreachable'
  if (kind === 'missing') {
    return { text: `${REASON.missing}, so there is no gap history to draw.`, retry: null }
  }
  const text = `${REASON[kind]}, so the gap history cannot be drawn. The prices above still update.`
  const wait = Number.isFinite(problem?.retryAt) ? Math.ceil((problem.retryAt - now) / 1000) : 0
  return {
    text,
    retry: wait > 0 ? { disabled: true, label: `Try again in ${wait} s` } : { disabled: false, label: 'Try again' },
  }
}

/** Said under a gap history drawn from the pool because the usual source failed. */
export const POOL_SOURCE_NOTE = 'Token history from its trading pool, because the usual price source is busy.'
