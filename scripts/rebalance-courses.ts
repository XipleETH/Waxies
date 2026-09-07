import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { roomFor, type Dungeon, type Trap } from '../lib/game/physics';
import { routePressure, visibleBetween } from '../lib/game/route-pressure';
import { reachSettings } from '../lib/game/trap-reach';
import { replay, metrics } from './story-certification';
import { solveRoute } from '../lib/game/route-solver';
import {
  verifyRoute,
  type VerifiedCourse,
  type RouteProof,
} from '../lib/game/route-proof';
import { dungeonGuardians } from '../lib/game/guardians';
type Course = VerifiedCourse & {
  number?: number;
  metrics?: ReturnType<typeof metrics>;
  pressure?: unknown;
  traversal?: string;
};
function seeds(level: Dungeon): RouteProof | null {
  for (const interval of [72, 96, 120, 48, 60, 84, 144, 36])
    for (const delay of [0, 24, 48]) {
      const actions = Array.from(
          { length: Math.floor(4800 / interval) },
          (_, i) => delay + i * interval,
        ),
        p = replay(level, actions, 4800);
      if (p && p.actions.length >= 3 && p.frames > 360) return p;
    }
  return solveRoute(level, 70);
}
function vary(c: Course, n: number) {
  if (n < 3 || n % 3 === 0) return;
  const level = structuredClone(c.level),
    r = roomFor(level),
    platforms = level.platforms
      .filter((p) => p.h < 1.5)
      .sort((a, b) => a.y - b.y);
  if (platforms.length < 3) return;
  const top = platforms.at(-1)!,
    middle = platforms[Math.floor(platforms.length * 0.45)];
  const descent = n % 3 === 1;
  level.spawn = {
    x: Math.max(
      r.left + 0.8,
      Math.min(r.right - 0.8, top.x + (n % 2 ? -0.22 : 0.22) * top.w),
    ),
    y: top.y + top.h / 2 + 0.38,
  };
  level.chest = descent
    ? { x: n % 2 ? r.left + 1.5 : r.right - 1.5, y: r.floor + 0.8 }
    : {
        x: Math.max(
          r.left + 1.2,
          Math.min(r.right - 1.2, middle.x + (n % 2 ? 0.22 : -0.22) * middle.w),
        ),
        y: middle.y + middle.h / 2 + 0.525,
      };
  if (
    Math.hypot(level.spawn.x - level.chest.x, level.spawn.y - level.chest.y) < 4
  )
    return;
  const bare = { ...level, traps: [] },
    proof = seeds(bare);
  if (!proof) return;
  // Start from a reachable new objective; fitting below reintroduces every real Axie part.
  const withTraps = replay(level, proof.actions, proof.frames + 1200);
  c.level = level;
  c.proof = withTraps ?? proof;
  c.traversal = descent ? 'descent' : 'balcony';
  c.level.subtitle = descent
    ? 'Entra por arriba y desciende entre las defensas hasta el cofre.'
    : 'Busca el cofre en un balcón intermedio: controla las caídas y los cambios de lado.';
}
function stations(
  level: Dungeon,
  trace: Array<{ x: number; y: number }>,
  trap: Trap,
) {
  const r = roomFor(level),
    surfaces = [
      { x: r.w / 2, y: r.floor - 0.275, w: r.right - r.left, h: 0.55 },
      ...level.platforms,
    ];
  const candidates: Array<{ x: number; y: number; rank: number }> = [];
  for (const p of surfaces)
    for (
      let x = Math.max(r.left + 0.5, p.x - p.w / 2 + 0.35);
      x <= Math.min(r.right - 0.5, p.x + p.w / 2 - 0.35);
      x += 0.4
    ) {
      const y = p.y + p.h / 2 + 0.525;
      if (
        y > r.h - 0.9 ||
        Math.hypot(x - level.spawn.x, y - level.spawn.y) < 2 ||
        Math.hypot(x - level.chest.x, y - level.chest.y) < 1.45
      )
        continue;
      if (
        level.platforms.some(
          (other) =>
            other !== p &&
            Math.abs(other.x - x) < other.w / 2 + 0.3 &&
            Math.abs(other.y - y) < other.h / 2 + 0.3,
        )
      )
        continue;
      let d = 100;
      for (const s of trace) {
        const dist = Math.hypot(s.x - x, s.y - y);
        if (dist < d && visibleBetween(level, s.x, s.y, x, y)) d = dist;
      }
      if (d < 0.82 || d > 5) continue;
      candidates.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 1000) / 1000,
        rank: Math.abs(d - 1.1),
      });
    }
  return [
    { x: trap.x, y: trap.y, rank: 10 },
    ...candidates.sort((a, b) => a.rank - b.rank).slice(0, 24),
  ];
}
function fit(c: Course, n: number) {
  const original = structuredClone(c),
    base = structuredClone(c.level),
    parts = base.traps;
  let level = { ...base, traps: [] as Trap[] },
    proof =
      replay(level, c.proof.actions, c.proof.frames + 1200) ?? seeds(level);
  if (!proof) throw Error('No base route ' + level.id);
  for (let i = 0; i < parts.length; i++) {
    const old = parts[i],
      r = reachSettings(old.part),
      trace = routePressure(level, proof).trace;
    let best: { level: Dungeon; proof: RouteProof; score: number } | undefined;
    const options = stations(level, trace, old).filter(
      (p) => !level.traps.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 1),
    );
    const distances =
      r.kind === 'fixed'
        ? [r.default]
        : [
            r.min + (r.max - r.min) * [0.55, 0.75, 1][(n + i) % 3],
            r.max,
            r.default,
          ];
    for (const position of options)
      for (const reach of new Set(
        distances.map((v) => Math.round(v * 10) / 10),
      ))
        for (const phase of [old.phase, 0, 2.4]) {
          const trap = { ...old, x: position.x, y: position.y, reach, phase },
            candidate = { ...level, traps: [...level.traps, trap] };
          const p = replay(candidate, proof.actions, proof.frames + 360);
          if (!p) continue;
          const pressure = routePressure(candidate, p),
            d = pressure.closest[i],
            exposure = pressure.exposureFrames[i];
          const score =
            (d < 1 ? 100 : 0) +
            Math.min(exposure, 180) / 6 -
            Math.abs(d - (n < 5 ? 0.5 : 0.25)) * 6;
          if (!best || score > best.score)
            best = { level: candidate, proof: p, score };
          if (d < 0.65 && d > 0.08 && exposure >= 48) break;
        }
    if (!best) {
      const candidate = { ...level, traps: [...level.traps, old] },
        p = solveRoute(candidate, 100);
      if (p) best = { level: candidate, proof: p, score: 0 };
    }
    if (!best) {
      c.level = original.level;
      c.proof = original.proof;
      console.log('RETAIN ' + c.level.id);
      return;
    }
    level = best.level;
    proof = best.proof;
  }
  // Descents must still require player input; a room that wins untouched is not a challenge.
  if (replay(level, [], proof.frames + 1200)) {
    const p = solveRoute(
      {
        ...level,
        traps: level.traps.map((t, i) =>
          i === 0
            ? {
                ...t,
                x: level.spawn.x + (level.spawn.x < 6 ? 1.4 : -1.4),
                y: level.spawn.y + 0.145,
              }
            : t,
        ),
      },
      100,
    );
    if (p) {
      level = {
        ...level,
        traps: level.traps.map((t, i) =>
          i === 0
            ? {
                ...t,
                x: level.spawn.x + (level.spawn.x < 6 ? 1.4 : -1.4),
                y: level.spawn.y + 0.145,
              }
            : t,
        ),
      };
      proof = p;
    }
    if (replay(level, [], proof.frames + 1200)) {
      c.level = original.level;
      c.proof = original.proof;
      return;
    }
  }
  if (!verifyRoute(level, proof)) throw Error('Invalid ' + level.id);
  dungeonGuardians(level);
  c.level = level;
  c.proof = proof;
  const { trace: _trace, ...pressure } = routePressure(level, proof);
  c.pressure = pressure;
  if (c.metrics) c.metrics = metrics(level, proof);
}
mkdirSync('outputs', { recursive: true });
for (const name of ['story-courses', 'verified-courses']) {
  const path = 'lib/game/data/' + name + '.json',
    courses = JSON.parse(readFileSync(path, 'utf8')) as Course[];
  writeFileSync(
    'outputs/' + name + '-rebalance-original.json',
    JSON.stringify(courses),
  );
  for (const [n, c] of courses.entries()) {
    const before = structuredClone(c);
    vary(c, n);
    fit(c, n);
    if (!verifyRoute(c.level, c.proof)) {
      Object.assign(c, before);
      fit(c, n);
    }
    const { trace: _trace, ...pressure } = routePressure(c.level, c.proof);
    c.pressure = pressure;
    console.log(
      name,
      n + 1,
      c.traversal ?? 'ascent',
      pressure.encountered + '/' + pressure.total,
      c.proof.frames,
    );
    writeFileSync(
      'outputs/' + name + '-rebalance-progress.json',
      JSON.stringify(courses, null, 2),
    );
  }
  if (courses.some((c) => !verifyRoute(c.level, c.proof)))
    throw Error('Unverified catalog');
  writeFileSync(path, JSON.stringify(courses, null, 2) + '\n');
}
