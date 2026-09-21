import { loadEnvFile } from 'node:process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { isDeepStrictEqual } from 'node:util';
import { renewDefenses } from '../lib/online/renew-defenses';
import { verifyRoute } from '../lib/game/route-proof';
import type { OnlineState } from '../lib/online/types';
loadEnvFile('.env.maintenance.local');
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw Error('No database URL configured');
const sql = neon(url);
const folder = 'output/league-renewal-v3';
mkdirSync(folder, { recursive: true });
const planPath = `${folder}/plan.json`;
function validatePlan(before: OnlineState, after: OnlineState) {
  const restored = structuredClone(after);
  for (const [id, player] of Object.entries(after.players)) {
    if (!player.defense || !verifyRoute(player.defense.level, player.defense.proof))
      throw Error('Invalid defense');
    restored.players[id] = { ...player };
    for (const key of ['defense', 'starterId'] as const) {
      delete restored.players[id][key];
      if (Object.hasOwn(before.players[id], key))
        Object.assign(restored.players[id], { [key]: before.players[id][key] });
    }
  }
  if (!isDeepStrictEqual(restored, before))
    throw Error('Migration changed data outside defenses and template ids');
}

if (process.argv.includes('--verify')) {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const [row] =
    await sql`SELECT revision,state FROM waxies_online_ledger WHERE id=1`;
  if (!isDeepStrictEqual(row.state, plan.after))
    throw Error(
      'El estado actual difiere del plan aplicado; revisar antes de repetir.',
    );
  console.log({
    verified: Object.keys(row.state.players).length,
    revision: row.revision,
    balancesAndHistoryPreserved: true,
  });
} else if (!process.argv.includes('--apply')) {
  const [row] =
    await sql`SELECT revision,state FROM waxies_online_ledger WHERE id=1`;
  const before = row.state as OnlineState;
  const after = renewDefenses(before);
  validatePlan(before, after);
  const backup = `${folder}/before-${row.revision}.json`;
  writeFileSync(backup, JSON.stringify(row), { flag: 'wx', mode: 0o600 });
  writeFileSync(
    planPath,
    JSON.stringify({ revision: row.revision, before, after }),
    { mode: 0o600 },
  );
  console.log({
    prepared: Object.keys(after.players).length,
    revision: row.revision,
    backup,
    databaseChanged: false,
  });
} else {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  if (JSON.stringify(renewDefenses(plan.before)) !== JSON.stringify(plan.after))
    throw Error('Plan no longer matches certified templates');
  validatePlan(plan.before, plan.after);
  const rows =
    await sql`UPDATE waxies_online_ledger SET state=${JSON.stringify(plan.after)}::jsonb,revision=revision+1 WHERE id=1 AND revision=${plan.revision} AND state=${JSON.stringify(plan.before)}::jsonb RETURNING revision`;
  if (!rows.length)
    throw Error('La base cambió: prepara un nuevo plan; no se modificó nada.');
  console.log({
    renewed: Object.keys(plan.after.players).length,
    revision: rows[0].revision,
  });
}
