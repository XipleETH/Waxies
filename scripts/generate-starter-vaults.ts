import { readFileSync, writeFileSync } from 'node:fs';
import { PART_LIST, PARTS } from '../lib/game/catalog';
import { guardianGenes } from '../lib/game/guardians';
import { validFreeTraps, snapTrap } from '../lib/game/free-vault';
import { reachSettings } from '../lib/game/trap-reach';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { replay } from './story-certification';
const path = 'lib/game/data/starter-vaults.json';
const base = JSON.parse(
  readFileSync('tests/fixtures/free-vault.json', 'utf8'),
) as VerifiedCourse;
// Preserve assigned IDs when extending the catalog.
const courses = JSON.parse(readFileSync(path, 'utf8')) as VerifiedCourse[];
const key = (c: VerifiedCourse) =>
  [...c.level.traps]
    .sort((a, b) => a.anchor! - b.anchor!)
    .map((t) => t.part)
    .join('|');
const seen = new Set(courses.map(key));
let seed = 20260920;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let attempt = 0; attempt < 30000 && courses.length < 100; attempt++) {
  const c = structuredClone(base);
  c.level.traps = c.level.traps.map((t) => {
    const choices = PART_LIST.filter((p) => p.slotId === PARTS[t.part].slotId);
    const part = choices[Math.floor(random() * choices.length)].id,
      r = reachSettings(part);
    return {
      ...t,
      part,
      ...snapTrap(t.x + (random() - 0.5) * 1.4, t.y),
      reach:
        Math.round((r.min + (r.max - r.min) * (0.15 + random() * 0.55)) * 100) /
        100,
    };
  });
  if (seen.has(key(c)) || !validFreeTraps(c.level.traps)) continue;
  const proof = replay(c.level, base.proof.actions, base.proof.frames + 120);
  if (!proof || replay(c.level, [], 4800)) continue;
  c.level.id = 'starter-' + String(courses.length + 1).padStart(2, '0');
  c.level.guardianGenes = [
    guardianGenes(
      c.level.traps.map((t) => t.part),
      c.level.id,
    ),
  ];
  c.proof = proof;
  if (!verifyRoute(c.level, proof)) throw Error('Invalid starter');
  seen.add(key(c));
  courses.push(c);
}
if (courses.length !== 100 || seen.size !== 100)
  throw Error('Expected 100 unique certified starters; got ' + courses.length);
for (const c of courses)
  if (!validFreeTraps(c.level.traps) || !verifyRoute(c.level, c.proof))
    throw Error('Invalid ' + c.level.id);
writeFileSync(path, JSON.stringify(courses, null, 2) + String.fromCharCode(10));
console.log(
  courses.length +
    ' unique certified starter vaults; ' +
    new Set(courses.flatMap((c) => c.level.traps.map((t) => t.part))).size +
    ' distinct parts',
);
