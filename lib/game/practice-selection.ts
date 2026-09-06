import type { VerifiedCourse } from './route-proof';
/** Pick a room first so templates with more card combinations aren't favored. */
export function choosePracticeCourse(
  courses: VerifiedCourse[],
  previous?: string | null,
  requested?: string,
  rng = Math.random,
): VerifiedCourse {
  const layouts = [
    ...new Set(courses.map((c) => c.level.layoutId ?? c.level.id)),
  ];
  const choices = requested
    ? layouts.filter((id) => id === requested)
    : layouts.filter((id) => id !== previous);
  const candidates = choices.length ? choices : layouts;
  if (!candidates.length) throw Error('No hay salas verificadas disponibles.');
  if (requested && !choices.length) throw Error('Sala no disponible.');
  const pick = <T>(items: T[]) =>
    items[
      Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)))
    ];
  const layout = pick(candidates);
  return pick(
    courses.filter((c) => (c.level.layoutId ?? c.level.id) === layout),
  );
}
