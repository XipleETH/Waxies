import { readFileSync, writeFileSync } from 'node:fs';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { solveRoute } from '../lib/game/route-solver';
import { PART_LIST } from '../lib/game/catalog';
import {
  PRACTICE_LAYOUTS,
  practiceDungeon,
} from '../lib/game/practice-layouts';
const path = 'lib/game/data/verified-courses.json';
const courses = JSON.parse(readFileSync(path, 'utf8')) as VerifiedCourse[];
const generate = process.argv.includes('--generate');
for (const course of courses) {
  if (generate) {
    const layout = PRACTICE_LAYOUTS.find((l) => l.id === course.level.layoutId);
    if (!layout) throw Error('Unknown layout: ' + course.level.id);
    course.level = {
      ...practiceDungeon(
        layout,
        course.level.traps.map((t) => t.part),
      ),
      id: course.level.id,
    };
    const proof =
      solveRoute(course.level, 200) ?? solveRoute(course.level, 450);
    if (!proof) throw Error('No route: ' + course.level.name);
    course.proof = proof;
  }
  if (!verifyRoute(course.level, course.proof))
    throw Error('Invalid proof: ' + course.level.name);
}
for (const layout of PRACTICE_LAYOUTS)
  if (!courses.some((c) => c.level.layoutId === layout.id))
    throw Error('Missing room: ' + layout.name);
const covered = new Set(
  courses.flatMap((c) => c.level.traps.map((t) => t.part)),
);
for (const part of PART_LIST)
  if (!covered.has(part.id)) throw Error('Missing part: ' + part.id);
if (generate) writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
console.log(
  `${courses.length} courses across ${PRACTICE_LAYOUTS.length} rooms verified without hits. ${covered.size} Classic parts covered.`,
);
