import { readFileSync } from 'node:fs';
import { FAMILY_LABELS, raidFamily } from '../lib/game/raid-mechanics';
import type { VerifiedCourse } from '../lib/game/route-proof';
for (const name of ['verified-courses', 'story-courses', 'starter-vaults']) {
  const courses = JSON.parse(
    readFileSync(`lib/game/data/${name}.json`, 'utf8'),
  ) as VerifiedCourse[];
  const counts = Object.fromEntries(
    Object.keys(FAMILY_LABELS).map((f) => [f, 0]),
  );
  for (const c of courses)
    for (const t of c.level.traps) counts[raidFamily(t.part)]++;
  console.log(
    name,
    'rules',
    [...new Set(courses.map((c) => c.level.rules))],
    counts,
  );
}
