// Mirror local rows to a Supabase table so that one rejected row cannot stop
// the rest from syncing. Used by the folder and alert sync.

/**
 * Whether an error means "try again later" rather than "the database refused
 * this data": a dropped connection (no code), or a sign-in problem such as an
 * expired token (PostgREST's PGRST3xx codes). Retrying those row by row would
 * only send one doomed request per row.
 */
export function isTransient(error) {
  const code = typeof error?.code === 'string' ? error.code : ''
  return code === '' || code.startsWith('PGRST3')
}

/**
 * Upsert `rows` into `table`. Tries them all at once first; if the database
 * refuses the batch, retries row by row so only the rows it refuses are left
 * out. Resolves { rejected, offline }: the rows the database refused, and
 * whether the attempt failed for a transient reason (then nothing is known to
 * be refused and the next change simply tries again). Never throws.
 */
export async function upsertRows(client, table, rows) {
  if (rows.length === 0) return { rejected: [], offline: false }
  try {
    const { error } = await client.from(table).upsert(rows)
    if (!error) return { rejected: [], offline: false }
    if (isTransient(error)) return { rejected: [], offline: true }
    const rejected = []
    for (const row of rows) {
      const { error: rowError } = await client.from(table).upsert(row)
      if (!rowError) continue
      if (isTransient(rowError)) return { rejected: [], offline: true }
      rejected.push(row)
    }
    return { rejected, offline: false }
  } catch {
    return { rejected: [], offline: true }
  }
}
