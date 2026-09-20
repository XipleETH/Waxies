import { readFileSync, writeFileSync } from 'node:fs';
import { replay, metrics } from './story-certification';
import { routePressure } from '../lib/game/route-pressure';
import { descentBypass, descends } from './descent-certification';
import { type VerifiedCourse } from '../lib/game/route-proof';
import { roomFor } from '../lib/game/physics';
import { reachSettings } from '../lib/game/trap-reach';
for (const path of [
  'lib/game/data/story-courses.json',
  'lib/game/data/verified-courses.json',
]) {
  const courses = JSON.parse(readFileSync(path, 'utf8')) as (VerifiedCourse & {
    metrics?: ReturnType<typeof metrics>;
  })[];
  for (const c of courses) {
    let pressure = routePressure(c.level, c.proof);
    for (let i = 0; i < c.level.traps.length; i++) {
      if (pressure.closest[i] < 1) continue;
      const original = c.level.traps[i],
        room = roomFor(c.level);
      let found = false;
      for (const point of pressure.trace.filter((_, n) => n % 10 === 0)) {
        if (found) break;
        for (const [dx, dy] of [
          [1.1, 0],
          [-1.1, 0],
          [0, 1.1],
          [0, -1.1],
          [0.8, 0.8],
          [-0.8, 0.8],
        ]) {
          const x = point.x + dx,
            y = point.y + dy;
          if (
            x < room.left + 0.5 ||
            x > room.right - 0.5 ||
            y < room.floor + 0.5 ||
            y > room.h - 0.8 ||
            Math.hypot(x - c.level.spawn.x, y - c.level.spawn.y) < 2 ||
            Math.hypot(x - c.level.chest.x, y - c.level.chest.y) < 1.2 ||
            c.level.platforms.some(
              (p) =>
                Math.abs(x - p.x) < p.w / 2 + 0.45 &&
                Math.abs(y - p.y) < p.h / 2 + 0.45,
            ) ||
            c.level.traps.some(
              (t, j) => j !== i && Math.hypot(x - t.x, y - t.y) < 1,
            )
          )
            continue;
          c.level.traps[i] = {
            ...original,
            x: +x.toFixed(3),
            y: +y.toFixed(3),
          };
          const proof = replay(c.level, c.proof.actions, c.proof.frames + 120);
          if (proof) {
            const p = routePressure(c.level, proof);
            if (p.closest[i] < 1 && p.encountered >= pressure.encountered) {
              c.proof = proof;
              pressure = p;
              found = true;
              break;
            }
          }
        }
      }
      if (!found) {
        c.level.traps[i] = original;
        console.log('UNRESOLVED PRESSURE', c.level.id, i);
      }
    }
    // Block trivial descent inputs without removing the certified skill route.
    let bypass = descends(c.level) ? descentBypass(c.level) : null;
    if (bypass) {
      outer: for (let attempt = 0; attempt < 120; attempt++) {
        const i = attempt % c.level.traps.length,
          t = c.level.traps[i],
          r = reachSettings(t.part);
        c.level.traps[i] = {
          ...t,
          phase: (attempt * 0.29) % 6,
          reach: Math.min(r.max, (t.reach ?? r.default) + 0.15),
        };
        const proof = replay(c.level, c.proof.actions, c.proof.frames + 120);
        if (
          proof &&
          routePressure(c.level, proof).encountered === c.level.traps.length &&
          !descentBypass(c.level)
        ) {
          c.proof = proof;
          bypass = null;
          break outer;
        }
        c.level.traps[i] = t;
      }
    }
    if (c.metrics) c.metrics = metrics(c.level, c.proof);
    console.log(
      c.level.id,
      routePressure(c.level, c.proof).encountered + '/' + c.level.traps.length,
      bypass ? 'BYPASS' : 'OK',
    );
  }
  writeFileSync(
    path,
    JSON.stringify(courses, null, 2) + String.fromCharCode(10),
  );
}
