import type { VerifiedCourse } from './route-proof';
import { raidFamily } from './raid-mechanics';
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
  const rooms = courses.filter(
    (c) => (c.level.layoutId ?? c.level.id) === layout,
  );
  // Choose a family first so common card combinations don't hide rarer effects.
  const family = pick([
    ...new Set(
      rooms.flatMap((c) => c.level.traps.map((t) => raidFamily(t.part))),
    ),
  ]);
  return pick(
    rooms.filter((c) =>
      c.level.traps.some((t) => raidFamily(t.part) === family),
    ),
  );
}
