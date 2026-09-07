import {
  createState,
  requestJump,
  step,
  type Dungeon,
  type GameState,
} from './physics';
import type { RaidReplay } from './raid-replay';
/** Deterministic spectator clock. Intermissions never consume recorded input frames. */
export class RaidPlayback {
  attempt = 0;
  paused = false;
  complete = false;
  private input = 0;
  private hold = 0;
  constructor(
    readonly level: Dungeon,
    readonly replay: RaidReplay,
  ) {}
  initial(): GameState {
    return { ...createState(this.level), phase: 'playing' };
  }
  tick(state: GameState): GameState {
    if (this.paused || this.complete) return state;
    if (this.hold > 0) {
      if (--this.hold === 0) {
        this.attempt++;
        this.input = 0;
        return {
          ...this.initial(),
          hp: state.hp,
          hits: state.hits,
          deaths: state.deaths,
        };
      }
      return state;
    }
    const a = this.replay.attempts[this.attempt];
    if (a.actions[this.input] === state.frame) {
      requestJump(state);
      this.input++;
    }
    step(state, this.level);
    if (state.frame >= a.frames) {
      if (this.attempt === this.replay.attempts.length - 1)
        this.complete = true;
      else this.hold = 72;
    }
    return state;
  }
}
