import { PORTRAIT_BASE, PORTRAIT_ROOM } from './portrait';
import { PARTS, BATTLE_SLOTS } from './catalog';
import { VAULT_SLOTS } from './vault-layout';
import { validReach } from './trap-reach';
import type { Trap } from './physics';
export const VAULT_SURFACES = [
  { x: 6, y: PORTRAIT_ROOM.floor, w: 9.4 },
  ...PORTRAIT_BASE.platforms,
];
export function snapTrap(x: number, y: number) {
  const choices = VAULT_SURFACES.map((p) => ({
    x:
      Math.round(
        Math.max(
          Math.max(1.65, p.x - p.w / 2 + 0.55),
          Math.min(Math.min(10.35, p.x + p.w / 2 - 0.55), x),
        ) * 10,
      ) / 10,
    y: Math.round((p.y + 0.8) * 100) / 100,
  }));
  return choices.sort(
    (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
  )[0];
}
export function validFreeTraps(traps: Trap[]) {
  return (
    Array.isArray(traps) &&
    traps.length >= 1 &&
    traps.length <= 4 &&
    new Set(traps.map((t) => t.anchor)).size === traps.length &&
    new Set(traps.map((t) => t.part)).size === traps.length &&
    traps.every((t, i) => {
      if (
        !t ||
        !Number.isInteger(t.anchor) ||
        t.anchor! < 0 ||
        t.anchor! > 3 ||
        !PARTS[t.part] ||
        !Number.isFinite(t.x) ||
        !Number.isFinite(t.y)
      )
        return false;
      const snapped = snapTrap(t.x, t.y);
      return (
        PARTS[t.part].slotId === BATTLE_SLOTS[t.anchor!] &&
        Math.abs(snapped.x - t.x) < 0.011 &&
        Math.abs(snapped.y - t.y) < 0.011 &&
        t.phase === VAULT_SLOTS[t.anchor!].phase &&
        t.patrol === 0 &&
        validReach(t) &&
        Math.hypot(t.x - PORTRAIT_BASE.spawn.x, t.y - PORTRAIT_BASE.spawn.y) >
          1.2 &&
        Math.hypot(t.x - PORTRAIT_BASE.chest.x, t.y - PORTRAIT_BASE.chest.y) >
          1.1 &&
        traps.every(
          (other, j) =>
            j === i || Math.hypot(t.x - other.x, t.y - other.y) > 0.85,
        )
      );
    })
  );
}
