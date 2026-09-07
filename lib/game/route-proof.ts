import { validDecorationPositions } from './decoration-layout';
import { validReach } from './trap-reach';
import { validFreeTraps } from './free-vault';
import { VAULT_SLOTS, validVaultTraps } from './vault-layout';
import { dungeonGuardians } from './guardians';
import { createState, requestJump, step, type Dungeon } from './physics';
import { MOBILE_RULES, PORTRAIT_BASE, PORTRAIT_SLOTS } from './portrait';
import { PARTS } from './catalog';
export interface RouteProof {
  rules: string;
  frames: number;
  actions: number[];
}
export interface VerifiedCourse {
  level: Dungeon;
  proof: RouteProof;
}
export function verifyRoute(level: Dungeon, proof: RouteProof): boolean {
  if (
    !proof ||
    proof.rules !== MOBILE_RULES ||
    !Number.isInteger(proof.frames) ||
    proof.frames < 1 ||
    proof.frames > 36000 ||
    !Array.isArray(proof.actions) ||
    proof.actions.length > 3000 ||
    proof.actions.some(
      (f, i) =>
        !Number.isInteger(f) ||
        f < 0 ||
        f >= proof.frames ||
        (i > 0 && f <= proof.actions[i - 1]),
    )
  )
    return false;
  const s = createState(level);
  s.phase = 'playing';
  let index = 0;
  for (let frame = 0; frame < proof.frames; frame++) {
    if (proof.actions[index] === frame) {
      requestJump(s);
      index++;
    }
    step(s, level);
    if (s.hits > 0 || s.hp < 100) return false;
    if ((s.phase as string) === 'won') return frame === proof.frames - 1;
  }
  return false;
}
export function challengeCode(course: VerifiedCourse): string {
  if (!verifyRoute(course.level, course.proof))
    throw Error('Completa esta defensa sin golpes antes de compartirla.');
  const modern = course.level.traps.every((t) => t.anchor !== undefined);
  if (modern) dungeonGuardians(course.level);
  const data = {
    v: course.level.freePlacement ? 3 : modern ? 2 : 1,
    g: modern ? course.level.guardianGenes : undefined,
    theme: course.level.theme ?? 'moss',
    decoration: course.level.decoration ?? 'none',
    d: course.level.decorationPositions,
    t: course.level.traps.map((t) => ({
      part: t.part,
      x: t.x,
      ...(modern ? { anchor: t.anchor } : {}),
      ...(course.level.freePlacement ? { y: t.y } : {}),
      ...(t.reach !== undefined ? { reach: t.reach } : {}),
    })),
    p: course.proof,
  };
  return btoa(JSON.stringify(data));
}
export function decodeChallenge(code: string): VerifiedCourse {
  if (code.length > 120000)
    throw Error('El enlace de reto es demasiado largo.');
  const data = JSON.parse(atob(code));
  const free = data.v === 3;
  const modern = free || data.v === 2;
  if (
    ![1, 2, 3].includes(data.v) ||
    !Array.isArray(data.t) ||
    (!modern && data.t.length !== 3) ||
    (modern &&
      (!Array.isArray(data.g) ||
        ![1, 2].includes(data.g.length) ||
        data.g.some((g: unknown) => typeof g !== 'string') ||
        data.t.length < 1 ||
        data.t.length > 8))
  )
    throw Error('Reto no compatible.');
  const traps = data.t.map(
    (
      t: {
        part: string;
        x: number;
        y?: number;
        reach?: number;
        anchor?: number;
      },
      i: number,
    ) => {
      const slot = modern ? VAULT_SLOTS[t.anchor!] : PORTRAIT_SLOTS[i];
      if (
        !slot ||
        (modern && !Number.isInteger(t.anchor)) ||
        !PARTS[t.part] ||
        !validReach(t as import('./physics').Trap) ||
        !Number.isFinite(t.x) ||
        (!free && Math.abs(t.x - slot.x) > 1.5)
      )
        throw Error('La defensa contiene una posición no permitida.');
      return {
        ...slot,
        part: t.part,
        x: t.x,
        ...(modern ? { anchor: t.anchor } : {}),
        ...(free ? { y: t.y! } : {}),
        ...(t.reach !== undefined ? { reach: t.reach } : {}),
      };
    },
  );
  if (
    !['moss', 'amethyst', 'ember'].includes(data.theme ?? 'moss') ||
    !['none', 'crystals', 'lanterns'].includes(data.decoration ?? 'none')
  )
    throw Error('Estilo de defensa no compatible.');
  if (
    modern &&
    !(free
      ? data.g.length === 1 && validFreeTraps(traps)
      : validVaultTraps(traps, data.g.length))
  )
    throw Error('Defensas de guardianes no válidas.');
  const level = {
    ...PORTRAIT_BASE,
    id: 'shared-vault',
    name: 'Reto de un amigo',
    freePlacement: free,
    guardianGenes: modern ? data.g : undefined,
    traps,
    theme: data.theme ?? 'moss',
    decoration: data.decoration ?? 'none',
    decorationPositions: data.d,
  };
  if (!validDecorationPositions(level.decorationPositions, level))
    throw Error('Posiciones de adornos no válidas.');
  dungeonGuardians(level);
  if (!verifyRoute(level, data.p))
    throw Error(
      'Esta defensa no incluye una ruta sin golpes válida para estas reglas.',
    );
  return { level, proof: data.p };
}
