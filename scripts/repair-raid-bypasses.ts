import { readFileSync, writeFileSync } from 'node:fs';
import { replay } from './story-certification';
import { routePressure } from '../lib/game/route-pressure';
import { descentBypass, descends } from './descent-certification';
import { type VerifiedCourse } from '../lib/game/route-proof';
for (const path of [
  'lib/game/data/story-courses.json',
  'lib/game/data/verified-courses.json',
]) {
  const courses = JSON.parse(readFileSync(path, 'utf8')) as VerifiedCourse[];
  for (const c of courses) {
    const pressure = routePressure(c.level, c.proof),
      bypass = descends(c.level) ? descentBypass(c.level) : null;
    if (pressure.encountered === pressure.total && !bypass) continue;
    const trace = routePressure(c.level, bypass ?? c.proof).trace;
    let fixed = false;
    outer: for (let i = 0; i < c.level.traps.length; i++) {
      const old = c.level.traps[i];
      for (const p of trace.filter((_, n) => n % 5 === 0))
        for (const [dx, dy] of [
          [0, 0],
          [0.6, 0],
          [-0.6, 0],
          [0, 0.7],
          [0, -0.7],
          [1.1, 0],
          [-1.1, 0],
        ]) {
          const x = p.x + dx,
            y = p.y + dy;
          if (
            Math.hypot(x - c.level.spawn.x, y - c.level.spawn.y) < 2 ||
            Math.hypot(x - c.level.chest.x, y - c.level.chest.y) < 1.1 ||
            c.level.platforms.some(
              (r) =>
                Math.abs(x - r.x) < r.w / 2 + 0.3 &&
                Math.abs(y - r.y) < r.h / 2 + 0.3,
            ) ||
            c.level.traps.some(
              (r, j) => i !== j && Math.hypot(x - r.x, y - r.y) < 0.9,
            )
          )
            continue;
          c.level.traps[i] = { ...old, x, y };
          const proof = replay(c.level, c.proof.actions, c.proof.frames + 120);
          if (
            proof &&
            routePressure(c.level, proof).encountered ===
              c.level.traps.length &&
            (!descends(c.level) || !descentBypass(c.level))
          ) {
            c.proof = proof;
            fixed = true;
            break outer;
          }
        }
      c.level.traps[i] = old;
    }
    console.log(c.level.id, fixed ? 'FIXED' : 'UNRESOLVED');
  }
  writeFileSync(
    path,
    JSON.stringify(courses, null, 2) + String.fromCharCode(10),
  );
}
