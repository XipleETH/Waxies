import { descentBypass, descends } from './descent-certification';
import { routePressure } from '../lib/game/route-pressure';
import { replay } from './story-certification';
import { dungeonGuardians } from '../lib/game/guardians';
import { storyTrapCount } from '../lib/game/story-difficulty';
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
  dungeonGuardians(course.level);
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

console.log(
  `${courses.length} courses across ${PRACTICE_LAYOUTS.length} rooms verified without hits. ${covered.size} Classic parts covered.`,
);

const story = JSON.parse(
  readFileSync('lib/game/data/story-courses.json', 'utf8'),
) as VerifiedCourse[];
if (story.length !== 50) throw Error('Story must contain 50 levels');
for (const [index, course] of story.entries()) {
  if (course.level.traps.length !== storyTrapCount(index + 1))
    throw Error('Invalid story obstacle progression: ' + course.level.id);
  if (!verifyRoute(course.level, course.proof))
    throw Error('Invalid story proof: ' + course.level.id);
}
console.log('50 story levels verified without hits.');

for (const course of [...courses, ...story]) {
  const pressure = routePressure(course.level, course.proof);
  if (pressure.encountered !== pressure.total)
    throw Error('Defensa fuera del recorrido: ' + course.level.id);
  if (replay(course.level, [], Math.max(4800, course.proof.frames + 1200)))
    throw Error('Victoria sin entradas: ' + course.level.id);
}
if (generate) writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
console.log(
  `${[...courses, ...story].reduce((sum, c) => sum + c.level.traps.length, 0)} defenses encountered; no room wins without jump input.`,
);

const descending = [...courses, ...story].filter((c) => descends(c.level));
for (const c of descending)
  if (descentBypass(c.level)) throw Error('Atajo descendente: ' + c.level.id);
console.log(
  descending.length +
    ' descending courses checked against passive, single-jump and repeated-input bypasses.',
);
