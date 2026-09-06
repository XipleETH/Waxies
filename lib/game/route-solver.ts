import {
  createState,
  requestJump,
  step,
  type Dungeon,
  type GameState,
} from './physics';
import { MOBILE_RULES } from './portrait';
import { verifyRoute, type RouteProof } from './route-proof';
/** Bounded search over the same fixed-step simulation as the live game. */
export function solveRoute(level: Dungeon, width = 100): RouteProof | null {
  let beam: Array<{ s: GameState; actions: number[] }> = [
    { s: { ...createState(level), phase: 'playing' }, actions: [] },
  ];
  const quantum = 12;
  for (let frame = 0; frame < 7800; frame += quantum) {
    const candidates = new Map<string, { s: GameState; actions: number[] }>();
    for (const item of beam)
      for (const jump of item.s.grounded || item.s.wall || item.s.coyote > 0
        ? [false, true]
        : [false]) {
        const s = structuredClone(item.s),
          actions = jump ? [...item.actions, frame] : item.actions;
        if (jump) requestJump(s);
        for (let f = 0; f < quantum; f++) {
          step(s, level);
          if (s.phase !== 'playing') break;
        }
        if (s.hits || s.hp < 100) continue;
        if ((s.phase as string) === 'won') {
          const proof = { rules: MOBILE_RULES, frames: s.frame, actions };
          return verifyRoute(level, proof) ? proof : null;
        }
        const key = [
          Math.round(s.x * 5),
          Math.round(s.y * 5),
          Math.round(s.vy),
          s.direction,
          s.grounded ? 1 : 0,
          s.wall,
          ...s.hazards.traps.map(
            (t) => t.stage + Math.round(t.timer * 2) + t.facing,
          ),
        ].join(':');
        if (!candidates.has(key)) candidates.set(key, { s, actions });
      }
    beam = [...candidates.values()]
      .sort((a, b) => b.s.y + 0.018 * b.s.vy - (a.s.y + 0.018 * a.s.vy))
      .slice(0, width);
    if (!beam.length) return null;
  }
  return null;
}
