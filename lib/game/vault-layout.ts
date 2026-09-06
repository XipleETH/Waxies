import { PORTRAIT_SLOTS, PORTRAIT_BASE } from './portrait';
import { PARTS, BATTLE_SLOTS } from './catalog';
import { allowedParts, type AxieLoadout } from './axie';
import type { Trap } from './physics';
export const VAULT_SLOTS = [
  ...PORTRAIT_SLOTS,
  { x: 8.8, y: 3.9, part: 'carrot', phase: 0.8, patrol: 0 },
  { x: 8.5, y: 9.2, part: 'serious', phase: 1.2, patrol: 0 },
  { x: 8.5, y: 14.5, part: 'cactus', phase: 2.2, patrol: 0 },
  { x: 8, y: 19.8, part: 'pumpkin', phase: 3.2, patrol: 0 },
  { x: 6.2, y: 3.9, part: 'grass-snake', phase: 4, patrol: 0 },
];
export function vaultRange(anchor: number) {
  const t = VAULT_SLOTS[anchor];
  if (!t) throw Error('Posición de defensa desconocida.');
  const p = PORTRAIT_BASE.platforms.find(
    (p) => Math.abs(p.y + 0.8 - t.y) < 0.1,
  )!;
  return {
    min: Math.max(t.x - 1.5, p.x - p.w / 2 + 0.5),
    max: Math.min(t.x + 1.5, p.x + p.w / 2 - 0.5),
  };
}
export function defenderParts(
  axie: AxieLoadout | null,
  anchor: number,
  used: string[] = [],
) {
  return allowedParts(axie).filter(
    (id) => PARTS[id].slotId === BATTLE_SLOTS[anchor % 4] && !used.includes(id),
  );
}
export function makeVaultTraps(
  previous: Trap[],
  count: 1 | 2,
  axies: Array<AxieLoadout | null>,
): Trap[] {
  const traps: Trap[] = [],
    preferred = [
      'serious',
      'lagging',
      'pumpkin',
      'carrot',
      'zigzag',
      'cactus',
      'watering-can',
      'grass-snake',
    ];
  for (let anchor = 0; anchor < count * 4; anchor++) {
    const old = previous.find((t, i) => (t.anchor ?? i) === anchor),
      used = traps.map((t) => t.part),
      choices = defenderParts(
        axies[Math.floor(anchor / 4)] ?? null,
        anchor,
        used,
      );
    if (!choices.length) continue;
    const part =
      old && choices.includes(old.part)
        ? old.part
        : choices.includes(preferred[anchor])
          ? preferred[anchor]
          : choices[0];
    const range = vaultRange(anchor),
      base = VAULT_SLOTS[anchor];
    traps.push({
      ...base,
      anchor,
      part,
      x: Math.max(range.min, Math.min(range.max, old?.x ?? base.x)),
    });
  }
  return traps;
}
export function validVaultTraps(traps: Trap[], count: 1 | 2) {
  return (
    Array.isArray(traps) &&
    traps.length >= 1 &&
    traps.length <= count * 4 &&
    new Set(traps.map((t) => t.anchor)).size === traps.length &&
    new Set(traps.map((t) => t.part)).size === traps.length &&
    traps.every((t) => {
      if (
        !Number.isInteger(t.anchor) ||
        t.anchor! < 0 ||
        t.anchor! >= count * 4 ||
        !PARTS[t.part]
      )
        return false;
      const base = VAULT_SLOTS[t.anchor!],
        range = vaultRange(t.anchor!);
      return (
        PARTS[t.part].slotId === BATTLE_SLOTS[t.anchor! % 4] &&
        Number.isFinite(t.x) &&
        t.x >= range.min &&
        t.x <= range.max &&
        t.y === base.y &&
        t.phase === base.phase &&
        t.patrol === 0
      );
    })
  );
}
