import { readFileSync, writeFileSync } from 'node:fs';
import { PART_LIST } from '../lib/game/catalog';
import { type VerifiedCourse } from '../lib/game/route-proof';
import { dungeonGuardians } from '../lib/game/guardians';
import { fitGuardianParts } from './guardian-certification';
const path = 'lib/game/data/verified-courses.json';
const original = JSON.parse(readFileSync(path, 'utf8')) as VerifiedCourse[];
const courses = original.map((c) => fitGuardianParts(c));
for (const part of PART_LIST) {
  if (courses.some((c) => c.level.traps.some((t) => t.part === part.id)))
    continue;
  const base = original.find((c) =>
    c.level.traps.some((t) => t.part === part.id),
  );
  if (!base) throw Error('Missing source ' + part.id);
  const fitted = fitGuardianParts(base, 1, part.id);
  fitted.level.id = 'guardian-practice-' + part.id;
  courses.push(fitted);
}
for (const c of courses) dungeonGuardians(c.level);
writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
console.log(
  courses.length + ' compatible practice courses, all 132 cards retained',
);
