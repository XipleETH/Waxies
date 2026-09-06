import {
  createState,
  requestJump,
  step,
  type Dungeon,
} from '../lib/game/physics';
import { type RouteProof } from '../lib/game/route-proof';
import { MOBILE_RULES } from '../lib/game/portrait';
export function replay(
  level: Dungeon,
  actions: number[],
  limit = 12000,
): RouteProof | null {
  const s = createState(level);
  s.phase = 'playing';
  let index = 0;
  for (let f = 0; f < limit; f++) {
    if (actions[index] === f) {
      requestJump(s);
      index++;
    }
    step(s, level);
    if (s.hits || s.hp < 100) return null;
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
export function metrics(level: Dungeon, proof: RouteProof) {
  let passed = 0,
    total = 0;
  // Independent +/- 50 ms timing errors, spread across the recorded jumps.
  const probes = proof.actions
    .filter(
      (_, i) => i % Math.max(1, Math.floor(proof.actions.length / 12)) === 0,
    )
    .slice(0, 12);
  for (const frame of probes)
    for (const offset of [-6, 6]) {
      const actions = [
        ...new Set(
          proof.actions.map((f) => (f === frame ? Math.max(0, f + offset) : f)),
        ),
      ].sort((a, b) => a - b);
      total++;
      if (replay(level, actions, Math.min(12000, proof.frames + 1200)))
        passed++;
    }
  const tolerance = total ? passed / total : 1;
  const score = Math.round(
    (1 - tolerance) * 50 +
      proof.actions.length * 0.65 +
      (proof.frames / 120) * 0.28 +
      level.traps.length * 5 +
      level.platforms.filter((p) => p.w < 3).length * 2,
  );
  return {
    score,
    timingPassed: passed,
    timingTrials: total,
    timingOffsetMs: 50,
    seconds: Math.round(proof.frames / 120),
    jumps: proof.actions.length,
  };
}
