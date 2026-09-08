import {
  createState,
  requestJump,
  step,
  type Dungeon,
} from '../lib/game/physics';
import { routePressure } from '../lib/game/route-pressure';
import { MOBILE_RULES } from '../lib/game/portrait';
import type { RouteProof } from '../lib/game/route-proof';
export const descends = (l: Dungeon) => l.spawn.y > l.chest.y + 2;
export function cleanRun(
  level: Dungeon,
  actions: number[],
  limit = 3600,
): RouteProof | null {
  const s = createState(level);
  s.phase = 'playing';
  let i = 0;
  for (let f = 0; f < limit; f++) {
    if (actions[i] === f) {
      requestJump(s);
      i++;
    }
    step(s, level);
    if (s.hits) return null;
    if ((s.phase as string) === 'won')
      return {
        rules: MOBILE_RULES,
        frames: s.frame,
        actions: actions.filter((a) => a < s.frame),
      };
    if (s.phase !== 'playing') return null;
  }
  return null;
}
export function descentBypass(level: Dungeon, considerEncounters = true) {
  if (!descends(level)) return null;
  const schedules: number[][] = [[]];
  for (let f = 0; f < 1800; f += 12) schedules.push([f]);
  for (const gap of [24, 36, 48, 60, 90, 120, 180])
    for (const offset of [0, 12, 24])
      schedules.push(
        Array.from(
          { length: Math.ceil(3600 / gap) },
          (_, i) => offset + i * gap,
        ),
      );
  for (const actions of schedules) {
    const proof = cleanRun(level, actions);
    if (!proof) continue;
    if (!considerEncounters && proof.actions.length > 1) continue;
    const pressure = routePressure(level, proof);
    if (proof.actions.length <= 1 || pressure.encountered < pressure.total)
      return proof;
  }
  return null;
}
