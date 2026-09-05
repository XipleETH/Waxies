import type { Dungeon, GameState, Trap } from './physics';
import type { PartId } from './catalog';

export type AttackStage = 'idle' | 'warning' | 'active' | 'recover';
export interface TrapState {
  x: number; y: number; facing: 1 | -1; stage: AttackStage; timer: number;
  shield: boolean; energy: number; powered: boolean; shots: number; shotTimer: number;
}
export interface Projectile { id: number; owner: number; part: 'carrot' | 'grass-snake'; x: number; y: number; vx: number; vy: number; life: number }
export interface PoisonPool { id: number; x: number; y: number; life: number }
export interface HazardState { traps: TrapState[]; projectiles: Projectile[]; pools: PoisonPool[]; nextId: number }
export const ATTACK = { warning: 0.65, thornRadius: 1.65, dashSpeed: 10, dashDuration: 0.38, projectileRadius: 0.19, poolRadius: 0.75 };
export function createHazards(level: Dungeon): HazardState {
  return { traps: level.traps.map(t => ({ x: t.x, y: t.y, facing: -1, stage: 'idle', timer: 0.7 + t.phase * 0.4,
    shield: t.part === 'carrot', energy: 0, powered: false, shots: 0, shotTimer: 0 })), projectiles: [], pools: [], nextId: 0 };
}
export function hurt(s: GameState, part: PartId) {
  if (s.invulnerable > 0 || s.phase !== 'playing') return;
  const damage = part === 'thorny-caterpillar' ? (s.poison > 0 || s.slowActions > 0 ? 39 : 30) : part === 'carrot' ? 20 : 12;
  s.hp = Math.max(0, s.hp - damage);
  if (part === 'grass-snake') s.poison++;
  if (part === 'lagging') s.slowActions = 2;
  s.invulnerable = 1.1;
  if (!s.hp) { s.phase = 'dead'; s.reason = 'Las defensas protegieron el cofre.'; s.deaths++; }
}
function blocked(level: Dungeon, x: number, y: number, radius: number) {
  return x - radius <= 1 || x + radius >= 23 || y - radius <= 1 || y + radius >= 13.5 || level.platforms.some(p =>
    x + radius > p.x - p.w / 2 && x - radius < p.x + p.w / 2 && y + radius > p.y - p.h / 2 && y - radius < p.y + p.h / 2);
}
function lineClear(level: Dungeon, x: number, y: number, targetX: number, targetY: number) {
  const count = Math.ceil(Math.hypot(targetX-x, targetY-y)/0.15);
  for(let n=1;n<count;n++) if(blocked(level,x+(targetX-x)*n/count,y+(targetY-y)*n/count,0)) return false;
  return true;
}
function fire(s: GameState, index: number, part: 'carrot' | 'grass-snake') {
  const h = s.hazards, t = h.traps[index];
  const speeds = part === 'grass-snake' ? [1.6, 3.6, 5.6] : [0.4];
  for (const vy of speeds) h.projectiles.push({id: h.nextId++, owner: index, part, x: t.x + t.facing * 0.68, y: t.y + 0.06,
    vx: t.facing * (part === 'carrot' ? 7.5 : 5.8), vy, life: 4});
}
function beginAttack(s: GameState, i: number, trap: Trap) {
  const t = s.hazards.traps[i]; t.stage = 'active';
  t.timer = trap.part === 'lagging' ? ATTACK.dashDuration : trap.part === 'thorny-caterpillar' ? 0.5 : 0.4;
  if (trap.part === 'carrot') {
    t.powered = t.energy > 0; t.energy = 0; t.shots = t.powered ? 1 : 0; t.shotTimer = 0.22;
    fire(s, i, 'carrot');
  } else if (trap.part === 'grass-snake') fire(s, i, 'grass-snake');
}
/** Classic conditions preserved; attack patterns and one cycle per round are arcade conversions. */
export function stepHazards(s: GameState, level: Dungeon, dt: number, oldY: number, descending: boolean) {
  const h = s.hazards;
  for (let i = 0; i < level.traps.length; i++) {
    const trap = level.traps[i], t = h.traps[i];
    t.timer -= dt;
    if (trap.part === 'carrot' && t.shield && descending && Math.abs(s.x - t.x) < 0.75 && oldY - 0.38 >= t.y + 0.25 && s.y - 0.38 <= t.y + 0.35) {
      t.shield = false; t.energy = 1;
      s.y = t.y + 0.74; s.vy = 9; s.grounded = false; s.coyote = 0; s.wall = 0;
    }
    if (t.stage === 'idle' && t.timer <= 0) {
      const automatic = trap.part === 'carrot' || trap.part === 'grass-snake';
      if (automatic || (Math.abs(s.x - t.x) < 4.2 && Math.abs(s.y - t.y) < 1.8 && lineClear(level,t.x,t.y,s.x,s.y))) {
        t.stage = 'warning'; t.timer = ATTACK.warning; t.facing = s.x < t.x ? -1 : 1;
      }
    } else if (t.stage === 'warning' && t.timer <= 0) beginAttack(s, i, trap);
    else if (t.stage === 'active') {
      if (trap.part === 'lagging') {
        const next = t.x + t.facing * ATTACK.dashSpeed * dt;
        if (blocked(level, next, t.y, 0.35)) t.timer = 0; else t.x = next;
        if (Math.hypot(s.x - t.x, s.y - t.y) < 0.88) hurt(s, trap.part);
      } else if (trap.part === 'thorny-caterpillar' && Math.hypot(s.x - t.x, s.y - t.y) < ATTACK.thornRadius + 0.38 && lineClear(level,t.x,t.y,s.x,s.y)) hurt(s, trap.part);
      if (trap.part === 'carrot' && t.shots > 0) { t.shotTimer -= dt; if (t.shotTimer <= 0) {fire(s, i, 'carrot'); t.shots--; } }
      if (t.timer <= 0) { t.stage = 'recover'; t.timer = trap.part === 'lagging' ? 1.1 : 1.5; }
    } else if (t.stage === 'recover') {
      if (trap.part === 'lagging') t.x += (trap.x - t.x) * Math.min(1, dt * 5);
      if (t.timer <= 0) {t.x = trap.x; t.stage = 'idle'; t.timer = 0.6; t.powered = false; if (trap.part === 'carrot') t.shield = true;}
    }
  }
  for (const p of h.projectiles) {
    const previousY = p.y;
    p.life -= dt; p.vy -= (p.part === 'grass-snake' ? 9 : 0.8) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (blocked(level, p.x, p.y, ATTACK.projectileRadius)) {
      p.life = 0;
      if (p.part === 'grass-snake' && p.vy < 0) {
        // Only an exposed horizontal surface holds poison; walls and ceilings absorb it.
        let surface = p.y - ATTACK.projectileRadius <= 1 && previousY >= 1 ? 1 : null;
        for (const platform of level.platforms) {
          const top = platform.y + platform.h / 2;
          if (p.x >= platform.x - platform.w / 2 && p.x <= platform.x + platform.w / 2 && previousY - ATTACK.projectileRadius >= top - 0.08 && p.y - ATTACK.projectileRadius <= top) surface = top;
        }
        if (surface !== null && p.x > 1.25 && p.x < 22.75) h.pools.push({id:h.nextId++,x:p.x,y:surface + 0.06,life:2.2});
      }
      continue;
    }
    if (Math.hypot(s.x - p.x, s.y - p.y) < 0.38 + ATTACK.projectileRadius) {hurt(s, p.part); p.life = 0;}
  }
  for (const pool of h.pools) {
    pool.life -= dt;
    if (Math.abs(s.x - pool.x) < ATTACK.poolRadius && s.y - 0.38 < pool.y + 0.2 && s.y + 0.38 > pool.y) hurt(s, 'grass-snake');
  }
  h.projectiles = h.projectiles.filter(p => p.life > 0).slice(-64);
  h.pools = h.pools.filter(p => p.life > 0).slice(-32);
}
