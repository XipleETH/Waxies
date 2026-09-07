import type { AuthoredCourse } from './course-types';
import { readFileSync, writeFileSync } from 'node:fs';
import { replay, metrics } from './story-certification';
import { routePressure } from '../lib/game/route-pressure';
import { roomFor } from '../lib/game/physics';
for (const name of ['story-courses', 'verified-courses']) {
  const path = 'lib/game/data/' + name + '.json',
    courses = JSON.parse(readFileSync(path, 'utf8')) as AuthoredCourse[];
  for (const c of courses) {
    const auto = replay(c.level, [], Math.max(4800, c.proof.frames + 1200));
    if (!auto) continue;
    const r = roomFor(c.level),
      trace = routePressure(c.level, auto).trace;
    let fixed = false;
    search: for (let i = 0; i < c.level.traps.length; i++)
      for (const point of trace) {
        const x = Math.round(point.x * 100) / 100,
          y = Math.round((point.y + 0.145) * 1000) / 1000;
        const support =
          Math.abs(point.y - r.floor - 0.38) < 0.1 ||
          c.level.platforms.some(
            (p) =>
              Math.abs(point.y - p.y - p.h / 2 - 0.38) < 0.1 &&
              x > p.x - p.w / 2 &&
              x < p.x + p.w / 2,
          );
        if (
          !support ||
          Math.hypot(x - c.level.spawn.x, y - c.level.spawn.y) < 1.4 ||
          Math.hypot(x - c.level.chest.x, y - c.level.chest.y) < 1.2 ||
          c.level.traps.some(
            (t, j) => i !== j && Math.hypot(t.x - x, t.y - y) < 0.9,
          )
        )
          continue;
        for (const phase of [0, 1.2, 2.4]) {
          const level = {
              ...c.level,
              traps: c.level.traps.map((t, j) =>
                j === i ? { ...t, x, y, phase } : t,
              ),
            },
            proof = replay(level, c.proof.actions, c.proof.frames + 240);
          if (!proof || replay(level, [], Math.max(4800, proof.frames + 1200)))
            continue;
          const { trace: _trace, ...pressure } = routePressure(level, proof);
          if (pressure.encountered !== pressure.total) continue;
          c.level = level;
          c.proof = proof;
          c.pressure = pressure;
          if (c.metrics) c.metrics = metrics(level, proof);
          fixed = true;
          break search;
        }
      }
    if (!fixed) {
      const originals = JSON.parse(
        readFileSync('outputs/' + name + '-rebalance-original.json', 'utf8'),
      ) as AuthoredCourse[];
      const original = originals.find((v) => v.level.id === c.level.id);
      if (
        !original ||
        replay(original.level, [], Math.max(4800, original.proof.frames + 1200))
      )
        throw Error('Auto route remains ' + c.level.id);
      Object.assign(c, original);
    }
    console.log('Fixed untouched win', c.level.id);
  }
  writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
}
