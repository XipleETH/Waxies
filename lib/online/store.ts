import { neon } from '@neondatabase/serverless';
import { emptyOnlineState, type OnlineState } from './types';
export function onlineConfigured() {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}
/** Optimistic compare-and-swap keeps a beta ledger atomic across Vercel instances. */
export async function transact<T>(work: (state: OnlineState) => T): Promise<T> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw Error('Database is not configured');
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS waxies_online_ledger (id integer PRIMARY KEY, revision bigint NOT NULL DEFAULT 0, state jsonb NOT NULL)`;
  await sql`INSERT INTO waxies_online_ledger(id,state) VALUES (1, ${JSON.stringify(emptyOnlineState())}::jsonb) ON CONFLICT(id) DO NOTHING`;
  for (let retry = 0; retry < 8; retry++) {
    const rows =
        await sql`SELECT revision,state FROM waxies_online_ledger WHERE id=1`,
      row = rows[0];
    const state = row.state as OnlineState,
      result = work(state);
    const updated =
      await sql`UPDATE waxies_online_ledger SET revision=revision+1,state=${JSON.stringify(state)}::jsonb WHERE id=1 AND revision=${row.revision} RETURNING revision`;
    if (updated.length) return result;
  }
  throw Error('Ledger contention');
}
