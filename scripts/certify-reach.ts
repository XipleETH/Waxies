import { readFileSync, writeFileSync } from 'node:fs';
import { reachSettings } from '../lib/game/trap-reach';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { replay, metrics } from './story-certification';
import { solveRoute } from '../lib/game/route-solver';
for (const path of [
  'lib/game/data/verified-courses.json',
  'lib/game/data/story-courses.json',
]) {
  const courses = JSON.parse(readFileSync(path, 'utf8')) as (VerifiedCourse & {
    metrics?: ReturnType<typeof metrics>;
  })[];
  let changed = 0;
  for (const [n, c] of courses.entries()) {
    for (let i = 0; i < c.level.traps.length; i++) {
      const old = c.level.traps[i],
        r = reachSettings(old.part);
      const values =
        r.kind === 'fixed'
          ? [r.default]
          : [
              r.min + (r.max - r.min) * [0.25, 0.5, 0.75, 1][(n + i) % 4],
              r.default,
              r.min,
            ];
      let fitted = false;
      for (const value of values) {
        const reach = Math.round(value * 100) / 100,
          level = {
            ...c.level,
            traps: c.level.traps.map((t, j) => (j === i ? { ...t, reach } : t)),
          };
        const proof = replay(
          level,
          c.proof.actions,
          Math.min(12000, c.proof.frames + 1200),
        );
        if (proof) {
          c.level = level;
          c.proof = proof;
          changed++;
          fitted = true;
          break;
        }
      }
      if (!fitted) {
        const level = {
            ...c.level,
            traps: c.level.traps.map((t, j) =>
              j === i ? { ...t, reach: r.default } : t,
            ),
          },
          proof = solveRoute(level, 160);
        if (proof) {
          c.level = level;
          c.proof = proof;
          changed++;
        }
      }
    }
    if (!verifyRoute(c.level, c.proof))
      throw Error('Ruta inválida ' + c.level.id);
    if (c.metrics) c.metrics = metrics(c.level, c.proof);
  }
  writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
  console.log(
    path +
      ': ' +
      changed +
      ' alcances, ' +
      courses.length +
      ' rutas sin golpes',
  );
}
