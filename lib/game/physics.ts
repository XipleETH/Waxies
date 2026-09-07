import { createCombat, decay, type CombatState } from './combat';
import { createHazards, stepHazards, type HazardState } from './hazards';
import type { PartId } from './catalog';
export interface Rect { x: number; y: number; w: number; h: number }
export interface Trap { reach?:number; anchor?:number; part: PartId; x: number; y: number; patrol: number; phase: number }
export interface Dungeon {
  id: string; guardianGenes?: string[]; freePlacement?:boolean; layoutId?: string; name: string; subtitle: string; difficulty: string;
  rules?:'raid'; room?:typeof ROOM; theme?:string; decoration?:string; runnerClass?: string; runnerShield?: number; platforms: Rect[]; traps: Trap[]; spawn: { x: number; y: number }; chest: { x: number; y: number };
}
export const ROOM = { w: 24, h: 14, left: 1, right: 23, floor: 1 };
export const PHYSICS = { speed: 5.2, gravity: 24, jump: 12.7, radius: 0.38, step: 1 / 120, wallSlide: -2.2 };
const platforms: Rect[] = [
  { x: 7, y: 3, w: 6, h: 0.8 },
  { x: 18, y: 5.5, w: 8, h: 0.8 },
  { x: 8, y: 8, w: 10, h: 0.8 },
  { x: 20, y: 10.5, w: 6, h: 0.8 },
];
export const DUNGEONS: Dungeon[] = [
  { id: 'ruins', name: 'Las ruinas de Lunacia', subtitle: 'La primera incursión', difficulty: 'Aprendiz', platforms,
    spawn: { x: 2.5, y: 1.4 }, chest: { x: 20.5, y: 11.45 },
    traps: [
      { part: 'carrot', x: 12, y: 1.55, patrol: 2.6, phase: 0 },
      { part: 'grass-snake', x: 18, y: 6.45, patrol: 1.7, phase: 1.2 },
      { part: 'thorny-caterpillar', x: 8, y: 8.95, patrol: 2.1, phase: 2.8 },
    ],
  },
  { id: 'grove', name: 'El jardín del veneno', subtitle: 'Cada salto cuenta', difficulty: 'Intermedio', platforms,
    spawn: { x: 2.5, y: 1.4 }, chest: { x: 20.5, y: 11.45 },
    traps: [
      { part: 'grass-snake', x: 7, y: 3.95, patrol: 2, phase: 1 },
      { part: 'lagging', x: 18, y: 6.45, patrol: 2.2, phase: 0.4 },
      { part: 'thorny-caterpillar', x: 20, y: 11.45, patrol: 2, phase: 2 },
    ],
  },
  { id: 'sanctum', name: 'El santuario olvidado', subtitle: 'Un tesoro bien protegido', difficulty: 'Experto', platforms,
    spawn: { x: 2.5, y: 1.4 }, chest: { x: 20.5, y: 11.45 },
    traps: [
      { part: 'thorny-caterpillar', x: 7, y: 3.95, patrol: 2.3, phase: 0.7 },
      { part: 'grass-snake', x: 8, y: 8.95, patrol: 2.6, phase: 2 },
      { part: 'lagging', x: 20, y: 11.45, patrol: 2.2, phase: 0 },
    ],
  },
];
export const roomFor=(level:Dungeon)=>level.room??ROOM;
export type Phase = 'resetting' | 'ready' | 'playing' | 'paused' | 'dead' | 'won';
export interface GameState {
  raid:boolean; frame:number; resetTimer:number; hits:number; phase: Phase; x: number; y: number; vy: number; direction: 1 | -1;
  grounded: boolean; wall: number; coyote: number; jumpBuffer: number;
  time: number; hp: number; poison: number; slowActions: number; invulnerable: number;
  jumps: number; deaths: number; reason: string; hazards: HazardState; combat: CombatState;
}
export function createState(level: Dungeon, deaths = 0): GameState {
  return {raid:level.rules==='raid',frame:0,resetTimer:0,hits:0, phase: 'ready', x: level.spawn.x, y: level.spawn.y, vy: 0, direction: 1, grounded: true,
    wall: 0, coyote: 0, jumpBuffer: 0, time: 0, hp: 100, poison: 0, slowActions: 0,
    invulnerable: 0, jumps: 0, deaths, reason: '', hazards: createHazards(level), combat: createCombat(level) };
}
export function trapPosition(trap: Trap, _time: number) {
  return { x: trap.x, y: trap.y };
}
export function requestJump(state: GameState) {
  if (state.phase === 'ready') state.phase = 'playing';
  if (state.phase === 'playing') state.jumpBuffer = 0.15;
}
function die(state: GameState, reason: string) { state.phase = 'dead'; state.reason = reason; state.deaths++; }
/** Arcade conversion: one successful jump is one action; trap hit values are scaled, not Classic card stats. */
export function step(state: GameState, level: Dungeon, dt = PHYSICS.step) {
  if(state.phase==='resetting'){state.resetTimer-=dt;if(state.resetTimer<=0){const hp=state.hp,hits=state.hits,deaths=state.deaths;Object.assign(state,createState(level,deaths),{hp,hits,phase:'playing'});}return;}
  if (state.phase !== 'playing') return;
  const room=roomFor(level),r = PHYSICS.radius;state.frame++;
  state.time += dt;
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.coyote = state.grounded ? 0.1 : Math.max(0, state.coyote - dt);
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  if (state.jumpBuffer > 0 && (state.grounded || state.wall !== 0 || state.coyote > 0)) {
    if (state.wall) state.direction = state.wall < 0 ? 1 : -1;
    state.vy = PHYSICS.jump; state.grounded = false; state.wall = 0;
    state.coyote = 0; state.jumpBuffer = 0; state.jumps++; state.combat.lastJumpAt=state.time; decay(state.combat.statuses);
    state.hp = Math.max(0, state.hp - state.poison * 2);
    state.slowActions = Math.max(0, state.slowActions - 1);
    if (state.hp <= 0) { die(state, 'El veneno agotó tu vida.'); return; }
  }
  const oldX = state.x;
  const vx = state.direction * PHYSICS.speed * (state.slowActions > 0 ? 0.8 : 1);
  state.x += vx * dt;
  state.wall = 0;
  if (state.x - r <= room.left) { state.x = room.left + r; state.wall = -1; if (state.grounded) state.direction = 1; }
  if (state.x + r >= room.right) { state.x = room.right - r; state.wall = 1; if (state.grounded) state.direction = -1; }
  for (const p of level.platforms) {
    const l = p.x - p.w / 2, rr = p.x + p.w / 2, b = p.y - p.h / 2, t = p.y + p.h / 2;
    if (state.y + r > b + 0.02 && state.y - r < t - 0.02) {
      if (oldX + r <= l + 0.03 && state.x + r > l) { state.x = l - r; state.wall = 1; }
      if (oldX - r >= rr - 0.03 && state.x - r < rr) { state.x = rr + r; state.wall = -1; }
    }
  }
  const oldY = state.y; const descending = state.vy <= 0;
  state.vy -= PHYSICS.gravity * dt;
  if (state.wall && state.vy < PHYSICS.wallSlide) state.vy = PHYSICS.wallSlide;
  state.y += state.vy * dt; state.grounded = false;
  if (state.y - r <= room.floor) { state.y = room.floor + r; state.vy = 0; state.grounded = true; }
  for (const p of level.platforms) {
    if (state.x + r <= p.x - p.w / 2 + 0.015 || state.x - r >= p.x + p.w / 2 - 0.015) continue;
    const top = p.y + p.h / 2, bottom = p.y - p.h / 2;
    if (oldY - r >= top - 0.06 && state.y - r <= top && state.vy <= 0) {
      state.y = top + r; state.vy = 0; state.grounded = true;
    } else if (oldY + r <= bottom + 0.025 && state.y + r > bottom && state.vy > 0) {
      state.y = bottom - r; state.vy = 0;
    }
  }
  if (state.y + r > room.h - 0.5) { state.y = room.h - 0.5 - r; state.vy = Math.min(0, state.vy); }
  if (state.grounded && state.wall) state.direction = state.wall < 0 ? 1 : -1;
  stepHazards(state, level, dt, oldY, descending);
  if (state.phase === 'playing' && Math.abs(state.x - level.chest.x) < 0.95 && Math.abs(state.y - level.chest.y) < 0.85) state.phase = 'won';
}
