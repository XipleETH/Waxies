import { roomFor, type Dungeon } from './physics';
import { dungeonRoofY } from './dungeon-framing';
export interface DecorationPosition {
  x: number;
  y: number;
}
export function validDecorationPositions(
  value: unknown,
  level: Dungeon,
): value is DecorationPosition[] | undefined {
  if (value === undefined) return true;
  const r = roomFor(level);
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= r.left + 0.35 &&
        p.x <= r.right - 0.35 &&
        p.y >= r.floor + 0.5 &&
        p.y <= dungeonRoofY(level) - 0.9,
    )
  );
}
export function decorationPositionsFor(level: Dungeon): DecorationPosition[] {
  if (
    level.decorationPositions &&
    validDecorationPositions(level.decorationPositions, level)
  )
    return level.decorationPositions;
  const r = roomFor(level),
    y = dungeonRoofY(level) - (level.decoration === 'lanterns' ? 2 : 1.4);
  return [
    { x: r.left + 0.7, y },
    { x: r.right - 0.7, y },
  ];
}
export function clampDecorationPosition(
  x: number,
  y: number,
  level: Dungeon,
): DecorationPosition {
  const r = roomFor(level);
  return {
    x:
      Math.round(Math.max(r.left + 0.35, Math.min(r.right - 0.35, x)) * 100) /
      100,
    y:
      Math.round(
        Math.max(r.floor + 0.5, Math.min(dungeonRoofY(level) - 0.9, y)) * 100,
      ) / 100,
  };
}
