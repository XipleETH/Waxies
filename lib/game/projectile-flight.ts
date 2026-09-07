import { PARTS } from './catalog';
import { roomFor, type Dungeon, type Trap } from './physics';
import type { Projectile, TrapState } from './hazards';
export function projectileBlocked(
  level: Dungeon,
  x: number,
  y: number,
  radius: number,
) {
  const room = roomFor(level);
  return (
    x - radius <= room.left ||
    x + radius >= room.right ||
    y - radius <= room.floor ||
    y + radius >= room.h - 0.5 ||
    level.platforms.some(
      (p) =>
        x + radius > p.x - p.w / 2 &&
        x - radius < p.x + p.w / 2 &&
        y + radius > p.y - p.h / 2 &&
        y - radius < p.y + p.h / 2,
    )
  );
}
export function projectileVolley(
  trap: Trap,
  t: Pick<TrapState, 'x' | 'y' | 'facing' | 'aimX' | 'aimY'>,
): Array<Omit<Projectile, 'id' | 'owner' | 'part'>> {
  const pattern = PARTS[trap.part].recipe.pattern,
    fan = pattern === 'fan',
    arc = pattern === 'arc' || fan,
    gravity = arc ? 9 : pattern === 'sniper' ? 0 : 0.8;
  if (
    PARTS[trap.part].attack === 0 ||
    ['bite', 'dash', 'barrier', 'aura'].includes(pattern) ||
    ['thorny-caterpillar', 'cactus', 'pupae'].includes(trap.part)
  )
    return [];
  const speeds = fan ? [1.6, 3.6, 5.6] : [pattern === 'arc' ? 5 : 0.4];
  return speeds.map((vy) => {
    const aim =
      pattern === 'sniper'
        ? Math.atan2(t.aimY - t.y, Math.abs(t.aimX - t.x))
        : 0;
    return {
      x: t.x + t.facing * 0.68,
      y: t.y + 0.06,
      vx:
        t.facing * (pattern === 'sniper' ? 9 * Math.cos(aim) : arc ? 5.8 : 7.5),
      vy: pattern === 'sniper' ? 9 * Math.sin(aim) : vy,
      gravity,
      life: 4,
      returnAt:
        pattern === 'boomerang' && trap.reach === undefined ? 3.25 : undefined,
      ...(trap.reach !== undefined
        ? {
            travel: 0,
            maxTravel: trap.reach * (pattern === 'boomerang' ? 2 : 1),
            turnAfter: pattern === 'boomerang' ? trap.reach : undefined,
          }
        : {}),
    };
  });
}
/** Same launch parameters and 120 Hz integration as the live projectile. Preview points stop at walls or range. */
export function projectilePaths(level: Dungeon, trap: Trap, facing: 1 | -1) {
  return projectileVolley(trap, {
    ...trap,
    facing,
    aimX: trap.x + facing * 8,
    aimY: trap.y,
  }).map((p) => {
    const points = [{ x: p.x, y: p.y }];
    const dt = 1 / 120;
    for (let i = 0; i < 480; i++) {
      p.life -= dt;
      if (p.returnAt !== undefined && p.life < p.returnAt) {
        p.vx = -p.vx;
        p.returnAt = undefined;
      }
      p.vy -= (p.gravity ?? 0.8) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.maxTravel !== undefined) {
        p.travel = (p.travel ?? 0) + Math.hypot(p.vx, p.vy) * dt;
        if (p.travel >= p.maxTravel) break;
        if (p.turnAfter !== undefined && p.travel >= p.turnAfter) {
          p.vx = -p.vx;
          p.turnAfter = undefined;
        }
      }
      if (projectileBlocked(level, p.x, p.y, 0.19) || p.life <= 0) break;
      if (i % 6 === 0) points.push({ x: p.x, y: p.y });
    }
    return points;
  });
}
