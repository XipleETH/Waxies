import { loadEnvFile } from 'node:process';
import { neon } from '@neondatabase/serverless';
loadEnvFile('.env.maintenance.local');
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw Error('No database URL configured');
const sql = neon(url);
const rows =
  await sql`SELECT revision, state FROM waxies_online_ledger WHERE id=1`;
const { state, revision } = rows[0];
const players = Object.values(
  state.players,
) as import('../lib/online/types').Player[];
console.log({
  revision,
  players: players.length,
  cloud: players.filter((p) => p.cloud).length,
  selectedAxie: players.filter((p) => p.cloud?.profile.axie).length,
  pending: Object.values(state.matches).filter(
    (m: any) => m.status === 'pending',
  ).length,
  locked: players.filter((p) => p.lock).length,
});
