import { readFileSync, writeFileSync } from 'node:fs';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { solveRoute } from '../lib/game/route-solver';
import { PART_LIST } from '../lib/game/catalog';
const path = 'lib/game/data/verified-courses.json';
const courses = JSON.parse(readFileSync(path, 'utf8')) as VerifiedCourse[];
const generate = process.argv.includes('--generate');
for (const course of courses) {
  if (generate) {
    const proof = solveRoute(course.level, 180);
    if (!proof) throw Error('No route: ' + course.level.name);
    course.proof = proof;
  }
  if (!verifyRoute(course.level, course.proof))
    throw Error('Invalid proof: ' + course.level.name);
}
const covered = new Set(
  courses.flatMap((c) => c.level.traps.map((t) => t.part)),
);
for (const part of PART_LIST)
  if (!covered.has(part.id)) throw Error('Missing part: ' + part.id);
if (generate) writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
console.log(
  `${courses.length} courses verified without hits. ${covered.size} Classic parts covered.`,
);
