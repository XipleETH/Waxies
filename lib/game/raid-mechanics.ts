import { PARTS } from './catalog';
import type { Trap, Dungeon, GameState } from './physics';
import type { TrapState } from './hazards';
import { hitRunner } from './combat';

export type RaidFamily =
  | 'orbit'
  | 'pendulum'
  | 'lift'
  | 'dash'
  | 'leap'
  | 'boomerang'
  | 'cannon'
  | 'mortar'
  | 'breath'
  | 'cloud'
  | 'gas'
  | 'wave'
  | 'spikes'
  | 'gate'
  | 'bolt'
  | 'fan'
  | 'burst'
  | 'sniper'
  | 'bite';
const overrides: Partial<Record<string, RaidFamily>> = {
  yam: 'gas',
  'grass-snake': 'cloud',
  'garish-worm': 'cloud',
  gila: 'gas',
  'hot-butt': 'breath',
  doubletalk: 'breath',
  ranchu: 'breath',
  'indian-star': 'orbit',
  'shoal-star': 'boomerang',
  'twin-tail': 'boomerang',
  'dual-blade': 'pendulum',
  'scaly-spoon': 'pendulum',
  incisor: 'pendulum',
  balloon: 'lift',
  cuckoo: 'lift',
  goldfish: 'lift',
  gerbil: 'leap',
  hare: 'leap',
  kotaro: 'leap',
  'pigeon-post': 'leap',
  carrot: 'cannon',
  watermelon: 'cannon',
  'nut-cracker-tail': 'cannon',
  turnip: 'mortar',
  eggshell: 'mortar',
  'anemone-horn': 'mortar',
  goda: 'wave',
  'buzz-buzz': 'wave',
  trump: 'wave',
  cactus: 'spikes',
  'thorny-caterpillar': 'spikes',
  pupae: 'spikes',
  'green-thorns': 'spikes',
  'tri-spikes': 'spikes',
};
export function raidFamily(part: string): RaidFamily {
  return (
    overrides[part] ??
    ({ aura: 'wave', barrier: 'gate', arc: 'mortar' } as const)[
      PARTS[part].recipe.pattern as 'aura' | 'barrier' | 'arc'
    ] ??
    (PARTS[part].recipe.pattern as RaidFamily)
  );
}
export const FAMILY_LABELS: Record<RaidFamily, string> = {
  orbit: 'Órbita',
  pendulum: 'Péndulo',
  lift: 'Ascensor',
  dash: 'Embestida',
  leap: 'Salto de ataque',
  boomerang: 'Búmeran',
  cannon: 'Cañón',
  mortar: 'Mortero',
  breath: 'Soplido',
  cloud: 'Nube viajera',
  gas: 'Gas cíclico',
  wave: 'Onda expansiva',
  spikes: 'Espinas retráctiles',
  gate: 'Barrera cíclica',
  bolt: 'Disparo',
  fan: 'Abanico',
  burst: 'Ráfaga',
  sniper: 'Mira fija',
  bite: 'Mordida',
};
export const CUSTOM_FAMILIES = new Set<RaidFamily>([
  'orbit',
  'pendulum',
  'lift',
  'leap',
  'breath',
  'cloud',
  'gas',
  'wave',
  'spikes',
  'gate',
]);
export const MOVING_FAMILIES = new Set<RaidFamily>([
  'orbit',
  'pendulum',
  'lift',
  'leap',
]);
export function raidReach(trap: Trap) {
  return (
    trap.reach ??
    (['orbit', 'pendulum', 'lift'].includes(raidFamily(trap.part)) ? 1.25 : 2)
  );
}
export function clearRay(
  level: Dungeon,
  x: number,
  y: number,
  tx: number,
  ty: number,
) {
  const n = Math.ceil(Math.hypot(tx - x, ty - y) / 0.12);
  for (let i = 1; i <= n; i++) {
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
export function raidMotion(trap: Trap, time: number) {
  const family = raidFamily(trap.part),
    r = raidReach(trap),
    a = time * 1.65 + trap.phase;
  if (family === 'orbit')
    return { x: trap.x + Math.cos(a) * r, y: trap.y + Math.sin(a) * r };
  if (family === 'pendulum') {
    const angle = Math.sin(a) * 1.05;
    return {
      x: trap.x + Math.sin(angle) * r,
      y: trap.y + r - Math.cos(angle) * r,
    };
  }
  if (family === 'lift')
    return { x: trap.x, y: trap.y + ((Math.sin(a) + 1) * r) / 2 };
  return { x: trap.x, y: trap.y };
}
export interface RaidZone {
  x: number;
  y: number;
  radius: number;
  inner?: number;
  angle?: number;
  halfAngle?: number;
}
export function raidZone(trap: Trap, t: TrapState): RaidZone | null {
  const family = raidFamily(trap.part),
    r = raidReach(trap),
    p = Math.max(0, Math.min(1, 1 - t.timer / 1.25));
  if (family === 'gas')
    return {
      x: t.x,
      y: t.y,
      radius: r * Math.min(1, 0.2 + p * 2, (1 - p) * 5),
    };
  if (family === 'cloud')
    return {
      x: t.x + t.facing * r * p,
      y: t.y + 0.22 * Math.sin(p * Math.PI),
      radius: 0.58 * Math.min(1, p * 8, (1 - p) * 6),
    };
  if (family === 'wave')
    return {
      x: t.x,
      y: t.y,
      radius: 0.3 + r * p,
      inner: Math.max(0, 0.3 + r * p - 0.24),
    };
  if (family === 'breath' || family === 'spikes')
    return {
      x: t.x,
      y: t.y,
      radius: r,
      angle: t.facing === 1 ? 0 : Math.PI,
      halfAngle: family === 'breath' ? 0.38 : 0.22,
    };
  if (family === 'gate') return { x: t.x, y: t.y, radius: r };
  return null;
}
export function zoneClearance(z: RaidZone, x: number, y: number) {
  const dx = x - z.x,
    dy = y - z.y,
    d = Math.hypot(dx, dy);
  if (z.angle !== undefined) {
    const angle = Math.abs(
      Math.atan2(
        Math.sin(Math.atan2(dy, dx) - z.angle),
        Math.cos(Math.atan2(dy, dx) - z.angle),
      ),
    );
    return (
      Math.max(
        d - z.radius,
        Math.sin(Math.min(Math.PI / 2, Math.max(0, angle - z.halfAngle!))) * d,
      ) - 0.38
    );
  }
  return (
    Math.max(d - z.radius, z.inner === undefined ? -Infinity : z.inner - d) -
    0.38
  );
}
/** Raid-only obstacle choreography. Classic combat rules remain in the original engine. */
export function stepRaidTrap(
  s: GameState,
  level: Dungeon,
  i: number,
  dt: number,
) {
  const trap = level.traps[i],
    t = s.hazards.traps[i],
    family = raidFamily(trap.part);
  if (!CUSTOM_FAMILIES.has(family)) return false;
  const moving = MOVING_FAMILIES.has(family),
    oldX = t.x,
    oldY = t.y;
  if (
    !trap.motion &&
    (family === 'orbit' || family === 'pendulum' || family === 'lift')
  ) {
    const pos = raidMotion(trap, s.time);
    if (clearRay(level, oldX, oldY, pos.x, pos.y)) {
      t.x = pos.x;
      t.y = pos.y;
    }
  }
  t.timer -= dt;
  if (t.stage === 'idle' && t.timer <= 0) {
    t.stage = 'warning';
    t.timer = 0.55;
    t.facing = s.x < t.x ? -1 : 1;
    t.aimX = s.x;
    t.aimY = s.y;
  } else if (t.stage === 'warning' && t.timer <= 0) {
    t.stage = 'active';
    t.timer = 1.25;
    t.hitThisAttack = false;
  } else if (t.stage === 'active') {
    if (family === 'leap' && !trap.motion) {
      const p = Math.min(1, Math.max(0, 1 - t.timer / 1.25)),
        r = raidReach(trap);
      const endX = trap.x + Math.max(-r, Math.min(r, t.aimX - trap.x));
      const x = trap.x + (endX - trap.x) * Math.sin(p * Math.PI),
        y = trap.y + Math.sin(p * Math.PI) * Math.min(2, r * 0.75);
      if (clearRay(level, oldX, oldY, x, y)) {
        t.x = x;
        t.y = y;
      }
    }
    const zone = raidZone(trap, t);
    if (
      zone &&
      zoneClearance(zone, s.x, s.y) < 0 &&
      clearRay(level, t.x, t.y, zone.x, zone.y) &&
      clearRay(level, zone.x, zone.y, s.x, s.y)
    ) {
      hitRunner(s, level, i);
      return true;
    }
    if (t.timer <= 0) {
      t.stage = 'recover';
      t.timer = 0.95;
    }
  } else if (t.stage === 'recover' && t.timer <= 0) {
    t.stage = 'idle';
    t.timer = 0.35;
    t.round++;
  }
  // Station bodies remain visible. Closed barriers alone become safe while open.
  if (
    (family !== 'gate' || t.stage === 'active') &&
    Math.hypot(s.x - t.x, s.y - t.y) < 0.78 &&
    clearRay(level, t.x, t.y, s.x, s.y)
  ) {
    hitRunner(s, level, i);
  }
  if (!moving && !trap.motion) {
    t.x = trap.x;
    t.y = trap.y;
  }
  return true;
}
