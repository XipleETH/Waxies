import type { Trap, Dungeon } from './physics';
export const MOTION_LABELS = {
  bounce: 'Rebote',
  flight: 'Vuelo lateral',
  diagonal: 'Diagonal',
} as const;
export function validMotion(
  t: Pick<Trap, 'motion' | 'motionDirection' | 'motionRange' | 'motionPhase'>,
) {
  return (
    (t.motionPhase === undefined ||
      (Number.isFinite(t.motionPhase) &&
        t.motionPhase >= 0 &&
        t.motionPhase <= Math.PI * 2)) &&
    (t.motion === undefined || Object.hasOwn(MOTION_LABELS, t.motion)) &&
    (t.motionDirection === undefined ||
      t.motionDirection === 1 ||
      t.motionDirection === -1) &&
    (t.motionRange === undefined ||
      (Number.isFinite(t.motionRange) &&
        t.motionRange >= 0.35 &&
        t.motionRange <= 5))
  );
}
/** Deterministic paths start at their anchor and use the same body for visuals and hits. */
export function trapMotion(t: Trap, time: number, level: Dungeon) {
  const direction = t.motionDirection ?? 1,
    angle = time * 1.6 + (t.motionPhase ?? 0);
  const range =
    t.motionRange ??
    (t.motion === 'flight' ? 4 : t.motion === 'diagonal' ? 1.4 : 0.8);
  const left = (level.room?.left ?? 1) + 0.45,
    right = (level.room?.right ?? 11) - 0.45;
  if (t.motion === 'bounce')
    return { x: t.x, y: t.y + Math.abs(Math.sin(angle)) * range };
  if (t.motion === 'diagonal') {
    const travel = Math.sin(angle) * range;
    return {
      x: Math.max(left, Math.min(right, t.x + direction * travel)),
      y: t.y + Math.abs(travel) * 0.65,
    };
  }
  if (t.motion === 'flight') {
    const lo = Math.max(left, t.x - range),
      hi = Math.min(right, t.x + range),
      width = hi - lo;
    if (width <= 0) return { x: t.x, y: t.y };
    const distance =
      (((t.x - lo + direction * (time + (t.motionPhase ?? 0) / 1.6) * 1.65) %
        (2 * width)) +
        2 * width) %
      (2 * width);
    return {
      x: lo + (distance <= width ? distance : 2 * width - distance),
      y: t.y + 0.16 * (1 - Math.cos(angle)),
    };
  }
  return { x: t.x, y: t.y };
}
export function moveTrap(
  t: Trap,
  current: { x: number; y: number },
  time: number,
  level: Dungeon,
) {
  if (!t.motion) return;
  const next = trapMotion(t, time, level);
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(next.x - current.x, next.y - current.y) / 0.12),
  );
  for (let i = 1; i <= steps; i++) {
    const x = current.x + ((next.x - current.x) * i) / steps,
      y = current.y + ((next.y - current.y) * i) / steps;
    if (
      level.platforms.some(
        (p) =>
          Math.abs(x - p.x) < p.w / 2 + 0.34 &&
          Math.abs(y - p.y) < p.h / 2 + 0.34,
      )
    )
      return;
  }
  current.x = next.x;
  current.y = next.y;
}
