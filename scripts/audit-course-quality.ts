import type { AuthoredCourse } from './course-types';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createState, requestJump, step } from '../lib/game/physics';
import { routePressure } from '../lib/game/route-pressure';
import { replay } from '../scripts/story-certification';
const report: Record<string, unknown> = {};
mkdirSync('outputs', { recursive: true });
for (const name of ['story-courses', 'verified-courses']) {
  const courses = JSON.parse(
    readFileSync('lib/game/data/' + name + '.json', 'utf8'),
  ) as AuthoredCourse[];
  const rows = courses.map((c) => {
    let timingHits = 0,
      trials = 0;
    for (const f of c.proof.actions
      .filter(
        (_, i: number) =>
          i % Math.max(1, Math.floor(c.proof.actions.length / 8)) === 0,
      )
      .slice(0, 8))
      for (const offset of [-12, -6, 6, 12]) {
        const actions = [
          ...new Set(
            c.proof.actions.map((v: number) =>
              v === f ? Math.max(0, v + offset) : v,
            ),
          ),
        ].sort((a, b) => a - b) as number[];
        const s = createState(c.level);
        s.phase = 'playing';
        let i = 0;
        trials++;
        for (let frame = 0; frame < c.proof.frames + 240; frame++) {
          if (actions[i] === frame) {
            requestJump(s);
            i++;
          }
          step(s, c.level);
          if (s.hits) {
            timingHits++;
            break;
          }
          if (s.phase !== 'playing') break;
        }
      }
    const { trace: _trace, ...pressure } = routePressure(c.level, c.proof);
    return {
      id: c.level.id,
      traversal: c.traversal,
      frames: c.proof.frames,
      jumps: c.proof.actions.length,
      pressure,
      timingHits,
      trials,
      autoWin: !!replay(c.level, [], Math.max(4800, c.proof.frames + 1200)),
    };
  });
  const summary = {
    routes: rows.length,
    encounters: rows.reduce((a: number, c) => a + c.pressure.encountered, 0),
    traps: rows.reduce((a: number, c) => a + c.pressure.total, 0),
    directions: rows.reduce<Record<string, number>>(
      (a, c) => (
        (a[c.traversal ?? 'ascent'] = (a[c.traversal ?? 'ascent'] ?? 0) + 1),
        a
      ),
      {},
    ),
    noTimingHits: rows.filter((c) => !c.timingHits).map((c) => c.id),
    autowins: rows.filter((c) => c.autoWin).map((c) => c.id),
    rows,
  };
  report[name] = summary;
  console.log(name, JSON.stringify({ ...summary, rows: undefined }));
}
writeFileSync(
  'outputs/course-quality-report.json',
  JSON.stringify(report, null, 2),
);
