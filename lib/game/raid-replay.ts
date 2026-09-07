import { createState, requestJump, step, type Dungeon } from './physics';
import { MOBILE_RULES } from './portrait';
import type { RouteProof } from './route-proof';
export interface RaidAttempt extends RouteProof {
  end: 'hit' | 'restart' | 'won';
}
export interface RaidReplay {
  attempts: RaidAttempt[];
}
/** Replays inputs; health and victories are never accepted from the client. */
export function verifyRaidReplay(
  level: Dungeon,
  replay: RaidReplay,
): number | null {
  if (
    !replay ||
    !Array.isArray(replay.attempts) ||
    replay.attempts.length < 1 ||
    replay.attempts.length > 25
  )
    return null;
  let hits = 0,
    frames = 0,
    inputs = 0;
  for (const [i, a] of replay.attempts.entries()) {
    if (
      !a ||
      a.rules !== MOBILE_RULES ||
      !Number.isInteger(a.frames) ||
      a.frames < 1 ||
      !Array.isArray(a.actions) ||
      !['hit', 'restart', 'won'].includes(a.end)
    )
      return null;
    frames += a.frames;
    inputs += a.actions.length;
    if (frames > 36000 || inputs > 4000) return null;
    if (
      a.actions.some(
        (f, j) =>
          !Number.isInteger(f) ||
          f < 0 ||
          f >= a.frames ||
          (j > 0 && f <= a.actions[j - 1]),
      )
    )
      return null;
    const s = createState(level);
    s.phase = 'playing';
    let n = 0;
    for (let f = 0; f < a.frames; f++) {
      if (a.actions[n] === f) {
        requestJump(s);
        n++;
      }
      step(s, level);
      if (s.hits || (s.phase as string) === 'won') {
        if (f !== a.frames - 1) return null;
        if (s.hits) {
          if (a.end !== 'hit') return null;
          hits++;
        } else if (a.end !== 'won' || i !== replay.attempts.length - 1)
          return null;
      }
    }
    if (a.end === 'hit' && !s.hits) return null;
    if (a.end === 'restart' && (s.hits || s.phase !== 'playing')) return null;
    if (a.end === 'won')
      return (s.phase as string) === 'won' && hits < 5 ? 100 - hits * 20 : null;
    if (hits >= 5) return i === replay.attempts.length - 1 ? 0 : null;
  }
  return null;
}
