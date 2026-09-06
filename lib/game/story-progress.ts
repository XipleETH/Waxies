import type { MobileProfile } from './mobile-profile';
export const STORY_LENGTH = 50;
export const STORY_CHAPTERS = [
  {
    name: 'El despertar',
    text: 'Desde el primer patio hay defensas. Lee sus avisos y aprende a esquivarlas antes de entrar al bosque.',
  },
  {
    name: 'Senderos de Lunacia',
    text: 'Los guardianes han ocupado los senderos. Observa sus avisos y encuentra el momento de cruzar.',
  },
  {
    name: 'Ruinas de cristal',
    text: 'Entre islas y balcones, cada aterrizaje cuenta. La siguiente bóveda espera más arriba.',
  },
  {
    name: 'Guardianes del cofre',
    text: 'Las defensas comparten el camino. Encadena rebotes sin perder de vista el próximo ataque.',
  },
  {
    name: 'La última bóveda',
    text: 'Has llegado a las salas más exigentes. Conserva tu salud y conquista el último cofre.',
  },
];
export function storyUnlocked(best: number[] = []) {
  const first = Array.from(
    { length: STORY_LENGTH },
    (_, i) => best[i] ?? 0,
  ).findIndex((hp) => hp === 0);
  return first < 0 ? STORY_LENGTH : Math.min(STORY_LENGTH, first + 1);
}
export function storyStars(hp: number) {
  return hp === 100 ? 3 : hp >= 60 ? 2 : hp > 0 ? 1 : 0;
}
/** First clear unlocks the next room. Replays only pay improvement over the best prize. */
export function completeStory(
  p: MobileProfile,
  number: number,
  hp: number,
): MobileProfile {
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > STORY_LENGTH ||
    number > storyUnlocked(p.story)
  )
    throw Error('Nivel bloqueado.');
  if (![20, 40, 60, 80, 100].includes(hp))
    throw Error('Resultado de historia inválido.');
  const story = [...(p.story ?? [])],
    previous = story[number - 1] ?? 0;
  story[number - 1] = Math.max(previous, hp);
  return {
    ...p,
    story,
    chispas: p.chispas + Math.max(0, hp - previous),
    wins: p.wins + (previous === 0 ? 1 : 0),
  };
}
