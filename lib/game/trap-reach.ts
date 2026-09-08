import { PARTS } from './catalog';
import type { Trap } from './physics';
export function reachSettings(part: string) {
  const pattern = PARTS[part].recipe.pattern;
  if (['thorny-caterpillar', 'cactus', 'pupae'].includes(part))
    return {
      min: 0.8,
      max: 2.8,
      default: 1.65,
      label: 'Radio de espinas',
      kind: 'radius' as const,
    };
  if (pattern === 'dash')
    return {
      min: 1,
      max: 6,
      default: 3.8,
      label: 'Recorrido de embestida',
      kind: 'line' as const,
    };
  if (pattern === 'bite')
    return {
      min: 0.4,
      max: 1.2,
      default: 0.5,
      label: 'Alcance de mordida',
      kind: 'radius' as const,
    };
  if (pattern === 'aura')
    return {
      min: 0.4,
      max: 2.8,
      default: 1.65,
      label: 'Radio del pulso',
      kind: 'radius' as const,
    };
  if (pattern === 'barrier')
    return {
      min: 0.4,
      max: 0.4,
      default: 0.4,
      label: 'Obstáculo de contacto',
      kind: 'fixed' as const,
    };
  return {
    min: 2,
    max: 12,
    default: 6,
    label:
      pattern === 'boomerang' ? 'Distancia de ida' : 'Recorrido del proyectil',
    kind: 'line' as const,
  };
}
export function validReach(t: Trap) {
  const r = reachSettings(t.part);
  return (
    t.reach === undefined ||
    (Number.isFinite(t.reach) && t.reach >= r.min && t.reach <= r.max)
  );
}
