import { readFileSync, writeFileSync } from 'node:fs';
import { replay, metrics } from './story-certification';
import { solveRoute } from '../lib/game/route-solver';
import { routePressure } from '../lib/game/route-pressure';
import { reachSettings } from '../lib/game/trap-reach';
import { type VerifiedCourse } from '../lib/game/route-proof';
for (const path of [
  'lib/game/data/story-courses.json',
  'lib/game/data/verified-courses.json',
]) {
  const courses = JSON.parse(readFileSync(path, 'utf8')) as (VerifiedCourse & {
    metrics?: ReturnType<typeof metrics>;
  })[];
  for (const c of courses) {
    c.level.traps = c.level.traps.map((t) => {
      const r = reachSettings(t.part);
      return {
        ...t,
        reach: Math.max(r.min, Math.min(r.max, t.reach ?? r.default)),
      };
    });
    const original = structuredClone(c.level.traps);
    let result = replay(c.level, c.proof.actions, c.proof.frames + 1200);
    for (let attempt = 0; !result && attempt < 160; attempt++) {
      c.level.traps = original.map((t, i) => {
        const r = reachSettings(t.part);
        return {
          ...t,
          reach:
            Math.round(
              (r.min +
                (r.max - r.min) * [0.2, 0.35, 0.5, 0.65][(attempt + i) % 4]) *
                100,
            ) / 100,
          phase: (t.phase + attempt * 0.37 + i * 0.17) % 7,
        };
      });
      result = replay(c.level, c.proof.actions, c.proof.frames + 1200);
    }
    if (!result) {
      console.log('SOLVE', c.level.id);
      result = solveRoute(c.level, 160);
    }
    if (!result) throw Error('No route ' + c.level.id);
    c.proof = result;
    if (c.metrics) c.metrics = metrics(c.level, result);
    console.log(
      c.level.id,
      'OK',
      routePressure(c.level, result).encountered + '/' + c.level.traps.length,
    );
  }
  writeFileSync(
    path,
    JSON.stringify(courses, null, 2) + String.fromCharCode(10),
  );
}
