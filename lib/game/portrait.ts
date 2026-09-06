import type { Dungeon } from './physics';
export const MOBILE_RULES = 'portrait-raid-v1';
export const PORTRAIT_ROOM = { w: 12, h: 22, left: 1, right: 11, floor: 1 };
export const PORTRAIT_BASE: Dungeon = {
  id: 'portrait',
  name: 'La torre de Lunacia',
  subtitle: 'Llega al cofre sin tocar una defensa',
  difficulty: 'Práctica',
  rules: 'raid',
  room: PORTRAIT_ROOM,
  spawn: { x: 2.2, y: 1.38 },
  chest: { x: 8.8, y: 20.28 },
  platforms: Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 === 0 ? 8 : 4,
    y: 3.1 + i * 2.65,
    w: 6,
    h: 0.55,
  })),
  traps: [],
};
export const PORTRAIT_SLOTS = [
  { x: 3.4, y: 6.55, part: 'carrot', phase: 0, patrol: 0 },
  { x: 5.8, y: 11.85, part: 'lagging', phase: 1.5, patrol: 0 },
  { x: 3.4, y: 17.15, part: 'grass-snake', phase: 3, patrol: 0 },
];
