import {
  createState,
  requestJump,
  step,
  PHYSICS,
  roomFor,
  type Dungeon,
  type GameState,
} from './physics';
import { ATTACK, isRadial, isArea, areaRadius } from './hazards';
import { PARTS } from './catalog';
import type { RouteProof } from './route-proof';
export function visibleBetween(
  level: Dungeon,
  x: number,
  y: number,
  tx: number,
  ty: number,
) {
  const n = Math.ceil(Math.hypot(tx - x, ty - y) / 0.2);
  for (let i = 1; i < n; i++) {
    const px = x + ((tx - x) * i) / n,
      py = y + ((ty - y) * i) / n;
    if (
      level.platforms.some(
        (p) => Math.abs(px - p.x) < p.w / 2 && Math.abs(py - p.y) < p.h / 2,
      )
    )
      return false;
  }
  return true;
}
export function hazardClearances(level: Dungeon, s: GameState): number[] {
  return s.hazards.traps.map((t, i) => {
    let distance = visibleBetween(level, s.x, s.y, t.x, t.y)
      ? Math.hypot(s.x - t.x, s.y - t.y) - 0.78
      : 100;
    const part = level.traps[i],
      pattern = PARTS[part.part].recipe.pattern;
    if (
      t.stage === 'active' &&
      (PARTS[part.part].attack > 0 || (s.raid && isArea(part.part))) &&
      visibleBetween(level, s.x, s.y, t.x, t.y)
    ) {
      const radius =
        s.raid && isArea(part.part)
          ? areaRadius(part)
          : isRadial(part.part)
            ? (part.reach ?? ATTACK.thornRadius)
            : pattern === 'bite'
              ? (part.reach ?? 0.5)
              : 0.5;
      if (
        (s.raid && isArea(part.part)) ||
        isRadial(part.part) ||
        ['bite', 'dash', 'barrier'].includes(pattern)
      )
        distance = Math.min(
          distance,
          Math.hypot(s.x - t.x, s.y - t.y) - radius - PHYSICS.radius,
        );
    }
    for (const p of s.hazards.projectiles)
      if (p.owner === i && visibleBetween(level, s.x, s.y, p.x, p.y))
        distance = Math.min(
          distance,
          Math.hypot(s.x - p.x, s.y - p.y) -
            PHYSICS.radius -
            ATTACK.projectileRadius,
        );
    for (const p of s.hazards.pools)
      if (p.owner === i && Math.abs(s.y - p.y) < 0.8)
        distance = Math.min(
          distance,
          Math.abs(s.x - p.x) - ATTACK.poolRadius - PHYSICS.radius,
        );
    return distance;
  });
}
export function routePressure(level: Dungeon, proof: RouteProof) {
  const s = createState(level);
  s.phase = 'playing';
  let index = 0;
  const closest = level.traps.map(() => 100),
    frames = level.traps.map(() => 0),
    trace: Array<{ x: number; y: number; frame: number }> = [];
  for (let f = 0; f < proof.frames; f++) {
    if (proof.actions[index] === f) {
      requestJump(s);
      index++;
    }
    step(s, level);
    if (f % 6 === 0) {
      trace.push({ x: s.x, y: s.y, frame: f });
      hazardClearances(level, s).forEach((d, i) => {
        closest[i] = Math.min(closest[i], d);
        if (d < 1) frames[i] += 6;
      });
    }
    if (s.hits || s.phase !== 'playing') break;
  }
  return {
    encountered: closest.filter((d) => d < 1).length,
    total: closest.length,
    closest: closest.map((d) => Math.round(d * 100) / 100),
    exposureFrames: frames,
    trace,
  };
}
/** Navigation potential follows free space to the chest, so descending and side routes can be searched. */
export function goalPotential(level: Dungeon) {
  const room = roomFor(level),
    size = 0.35,
    w = Math.ceil(room.w / size) + 1,
    h = Math.ceil(room.h / size) + 1,
    field = new Float64Array(w * h).fill(Infinity),
    solid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const px = x * size,
        py = y * size;
      solid[y * w + x] = +(
        px < room.left + 0.2 ||
        px > room.right - 0.2 ||
        py < room.floor + 0.2 ||
        py > room.h - 0.6 ||
        level.platforms.some(
          (p) =>
            Math.abs(px - p.x) < p.w / 2 + 0.16 &&
            Math.abs(py - p.y) < p.h / 2 + 0.16,
        )
      );
    }
  const queue: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        !solid[y * w + x] &&
        Math.hypot(x * size - level.chest.x, y * size - level.chest.y) < 0.85
      ) {
        field[y * w + x] = 0;
        queue.push(y * w + x);
      }
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i],
      x = at % w,
      y = Math.floor(at / w);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        n = ny * w + nx;
      if (
        nx < 0 ||
        nx >= w ||
        ny < 0 ||
        ny >= h ||
        solid[n] ||
        field[n] <= field[at] + size
      )
        continue;
      field[n] = field[at] + size;
      queue.push(n);
    }
  }
  return (s: GameState) => {
    const x = Math.max(0, Math.min(w - 1, Math.round(s.x / size))),
      y = Math.max(0, Math.min(h - 1, Math.round(s.y / size)));
    const d = field[y * w + x];
    return Number.isFinite(d)
      ? -d
      : -Math.hypot(s.x - level.chest.x, s.y - level.chest.y) - 30;
  };
}
