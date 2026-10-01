// Mirror local rows to a Supabase table so that one rejected row cannot stop
// the rest from syncing. Used by the folder and alert sync.

/** A refusal from the database (it has a code), not a dropped connection. */
const isRejection = (error) => typeof error?.code === 'string' && error.code !== ''

/**
 * Upsert `rows` into `table`. Tries them all at once first; if the database
 * refuses the batch, retries row by row so only the rows it refuses are left
 * out. Resolves { rejected, offline }: how many rows the database refused,
 * and whether the connection failed (then nothing is known to be refused and
 * the next change simply tries again). Never throws.
 */
export async function upsertRows(client, table, rows) {
  if (rows.length === 0) return { rejected: 0, offline: false }
  try {
    const { error } = await client.from(table).upsert(rows)
    if (!error) return { rejected: 0, offline: false }
    if (!isRejection(error)) return { rejected: 0, offline: true }
    let rejected = 0
    for (const row of rows) {
      const { error: rowError } = await client.from(table).upsert(row)
      if (!rowError) continue
      if (!isRejection(rowError)) return { rejected, offline: true }
      rejected += 1
    }
    return { rejected, offline: false }
  } catch {
    return { rejected: 0, offline: true }
  }
}
