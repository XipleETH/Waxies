import type { AuthoredCourse } from './course-types';
import { readFileSync, writeFileSync } from 'node:fs';
import { routePressure, visibleBetween } from '../lib/game/route-pressure';
import { roomFor, type Dungeon } from '../lib/game/physics';
import { reachSettings } from '../lib/game/trap-reach';
import { replay, metrics } from './story-certification';
import { verifyRoute, type RouteProof } from '../lib/game/route-proof';
for (const file of ['story-courses', 'verified-courses']) {
  const path = 'lib/game/data/' + file + '.json',
    courses = JSON.parse(readFileSync(path, 'utf8')) as AuthoredCourse[];
  for (const c of courses) {
    let pressure = routePressure(c.level, c.proof);
    for (let round = 0; round < 2; round++)
      for (let i = 0; i < c.level.traps.length; i++) {
        if (pressure.closest[i] < 1) continue;
        const level = c.level as Dungeon,
          old = level.traps[i],
          r = roomFor(level),
          rule = reachSettings(old.part),
          candidates: Array<{ x: number; y: number; rank: number }> = [];
        function add(x: number, y: number) {
          if (
            x < r.left + 0.4 ||
            x > r.right - 0.4 ||
            y < r.floor + 0.5 ||
            y > r.h - 0.7 ||
            Math.hypot(x - level.spawn.x, y - level.spawn.y) < 1.45 ||
            Math.hypot(x - level.chest.x, y - level.chest.y) < 1.2
          )
            return;
          if (
            level.platforms.some(
              (p) =>
                Math.abs(p.x - x) < p.w / 2 + 0.22 &&
                Math.abs(p.y - y) < p.h / 2 + 0.22,
            ) ||
            level.traps.some(
              (t, j) => j !== i && Math.hypot(t.x - x, t.y - y) < 0.9,
            )
          )
            return;
          let d = 100;
          for (const s of pressure.trace) {
            const v = Math.hypot(s.x - x, s.y - y);
            if (v < d && visibleBetween(level, x, y, s.x, s.y)) d = v;
          }
          if (d < 0.8 || d > 2) return;
          candidates.push({
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 1000) / 1000,
            rank: Math.abs(d - 1.15),
          });
        }
        for (let y = r.floor + 0.525; y < r.h - 0.8; y += 0.35)
          for (const x of [
            r.left + 0.55,
            r.left + 0.95,
            r.left + 1.35,
            r.right - 0.55,
            r.right - 0.95,
            r.right - 1.35,
          ])
            add(x, y);
        for (const p of level.platforms)
          for (let x = p.x - p.w / 2 + 0.3; x < p.x + p.w / 2 - 0.2; x += 0.2)
            add(x, p.y + p.h / 2 + 0.525);
        for (const p of level.platforms.filter((p) => p.h > 1.5))
          for (let y = p.y - p.h / 2 + 0.6; y < p.y + p.h / 2; y += 0.35)
            for (const x of [p.x - p.w / 2 - 0.95, p.x + p.w / 2 + 0.95])
              add(x, y);
        let best:
          | {
              level: Dungeon;
              proof: RouteProof;
              pressure: ReturnType<typeof routePressure>;
              score: number;
            }
          | undefined;
        for (const point of candidates
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 70))
          for (const reach of new Set([
            old.reach ?? rule.default,
            rule.max,
            rule.default,
          ]))
            for (const phase of [old.phase, 0, 1.2, 2.4]) {
              const next = {
                  ...level,
                  traps: level.traps.map((t, j) =>
                    j === i
                      ? { ...t, x: point.x, y: point.y, phase, reach }
                      : t,
                  ),
                },
                proof = replay(next, c.proof.actions, c.proof.frames + 240);
              if (!proof) continue;
              const pr = routePressure(next, proof);
              if (
                pr.encountered < pressure.encountered ||
                pr.closest[i] >= 1 ||
                pr.closest[i] < 0.06
              )
                continue;
              const score =
                pr.encountered * 100 +
                Math.min(pr.exposureFrames[i], 120) / 10 -
                Math.abs(pr.closest[i] - 0.3);
              if (!best || score > best.score)
                best = { level: next, proof, pressure: pr, score };
              if (pr.encountered === pr.total && pr.exposureFrames[i] >= 30)
                break;
            }
        if (best) {
          c.level = best.level;
          c.proof = best.proof;
          pressure = best.pressure;
        }
      }
    const { trace: _trace, ...pr } = pressure;
    c.pressure = pr;
    c.traversal =
      c.level.spawn.y > c.level.chest.y + 2
        ? c.level.chest.y < 3
          ? 'descent'
          : 'balcony'
        : c.level.spawn.y > 3
          ? 'crossing'
          : 'ascent';
    if (c.metrics) c.metrics = metrics(c.level, c.proof);
    if (!verifyRoute(c.level, c.proof)) throw Error(c.level.id);
    console.log(file, c.level.id, pr.encountered + '/' + pr.total);
  }
  writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
}
