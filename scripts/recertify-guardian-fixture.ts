import { readFileSync, writeFileSync } from 'node:fs';
import { solveRoute } from '../lib/game/route-solver';
import { replay } from './story-certification';
const path = 'tests/fixtures/free-vault.json',
  c = JSON.parse(readFileSync(path, 'utf8'));
const proof = replay(c.level, c.proof.actions) || solveRoute(c.level, 250);
if (!proof) throw Error('Guardian fixture has no clean route');
c.proof = proof;
writeFileSync(path, JSON.stringify(c, null, 2) + String.fromCharCode(10));
