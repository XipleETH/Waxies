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
  const data = {
    v: 1,
    theme: course.level.theme ?? 'moss',
    decoration: course.level.decoration ?? 'none',
    t: course.level.traps.map((t) => ({ part: t.part, x: t.x })),
    p: course.proof,
  };
  return btoa(JSON.stringify(data));
}
export function decodeChallenge(code: string): VerifiedCourse {
  if (code.length > 120000)
    throw Error('El enlace de reto es demasiado largo.');
  const data = JSON.parse(atob(code));
  if (data.v !== 1 || !Array.isArray(data.t) || data.t.length !== 3)
    throw Error('Reto no compatible.');
  const traps = data.t.map((t: { part: string; x: number }, i: number) => {
    if (
      !PARTS[t.part] ||
      !Number.isFinite(t.x) ||
      Math.abs(t.x - PORTRAIT_SLOTS[i].x) > 1.5
    )
      throw Error('La defensa contiene una posición no permitida.');
    return { ...PORTRAIT_SLOTS[i], part: t.part, x: t.x };
  });
  if (
    !['moss', 'amethyst', 'ember'].includes(data.theme ?? 'moss') ||
    !['none', 'crystals', 'lanterns'].includes(data.decoration ?? 'none')
  )
    throw Error('Estilo de defensa no compatible.');
  const level = {
    ...PORTRAIT_BASE,
    id: 'shared-vault',
    name: 'Reto de un amigo',
    traps,
    theme: data.theme ?? 'moss',
    decoration: data.decoration ?? 'none',
  };
  if (!verifyRoute(level, data.p))
    throw Error(
      'Esta defensa no incluye una ruta sin golpes válida para estas reglas.',
    );
  return { level, proof: data.p };
}
