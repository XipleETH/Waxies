import { raidFamily } from './raid-mechanics';
import { PARTS } from './catalog';
import type { Trap } from './physics';
export function reachSettings(part: string) {
  const family = raidFamily(part);
  const custom: Partial<
    Record<
      typeof family,
      {
        min: number;
        max: number;
        default: number;
        label: string;
        kind: 'radius' | 'line';
      }
    >
  > = {
    orbit: {
      min: 0.5,
      max: 2.8,
      default: 1.25,
      label: 'Radio orbital',
      kind: 'radius',
    },
    pendulum: {
      min: 0.5,
      max: 2.8,
      default: 1.25,
      label: 'Longitud del péndulo',
      kind: 'radius',
    },
    lift: {
      min: 0.5,
      max: 4,
      default: 1.25,
      label: 'Ascenso vertical',
      kind: 'line',
    },
    leap: {
      min: 1,
      max: 5,
      default: 2,
      label: 'Alcance del salto',
      kind: 'line',
    },
    breath: {
      min: 0.5,
      max: 3,
      default: 2,
      label: 'Longitud del soplido',
      kind: 'line',
    },
    cloud: {
      min: 1,
      max: 6,
      default: 2,
      label: 'Viaje de la nube',
      kind: 'line',
    },
    gas: {
      min: 0.5,
      max: 2.8,
      default: 2,
      label: 'Radio del gas',
      kind: 'radius',
    },
    wave: {
      min: 0.5,
      max: 2.8,
      default: 2,
      label: 'Expansión de la onda',
      kind: 'radius',
    },
    spikes: {
      min: 0.5,
      max: 2.8,
      default: 2,
      label: 'Alcance de espinas',
      kind: 'line',
    },
    gate: {
      min: 0.4,
      max: 2,
      default: 1,
      label: 'Radio de la barrera',
      kind: 'radius',
    },
  };
  if (custom[family]) return custom[family]!;
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
