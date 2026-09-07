import { roomFor, type Dungeon } from './physics';

/** Decorative headroom above the certified play area, including the chest's pulsing halo. */
export function dungeonRoofY(level: Dungeon): number {
  const room = roomFor(level);
  return level.rules === 'raid'
    ? Math.max(room.h + 1.5, level.chest.y + 3)
    : room.h;
}
