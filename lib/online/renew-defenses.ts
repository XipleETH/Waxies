import { STARTER_VAULTS } from '../game/starter-vaults';
import { raidFamily } from '../game/raid-mechanics';
import type { OnlineState } from './types';

/** One-time maintenance: no settling, payments, account edits or match rewrites. */
export function renewDefenses(state: OnlineState) {
  if (
    Object.values(state.matches).some((m) => m.status === 'pending') ||
    Object.values(state.players).some((p) => p.lock)
  )
    throw Error(
      'Hay partidas pendientes; vuelve a preparar la renovación cuando terminen.',
    );
  if (Object.values(state.players).some((p) => p.cloud))
    throw Error(
      'Hay perfiles en la nube: revisa su defensa antes de esta migración de invitados.',
    );
  const next = structuredClone(state);
  const counts: Record<string, number> = {};
  const used = new Set<string>();
  for (const player of Object.values(next.players).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const choices = STARTER_VAULTS.filter((c) => !used.has(c.level.id));
    const score = (c: (typeof STARTER_VAULTS)[number]) =>
      c.level.traps.reduce(
        (sum, t) => sum + (counts[raidFamily(t.part)] ?? 0),
        0,
      );
    const course = [...(choices.length ? choices : STARTER_VAULTS)].sort(
      (a, b) => score(a) - score(b) || a.level.id.localeCompare(b.level.id),
    )[0];
    player.defense = structuredClone(course);
    player.starterId = course.level.id;
    used.add(course.level.id);
    for (const t of course.level.traps)
      counts[raidFamily(t.part)] = (counts[raidFamily(t.part)] ?? 0) + 1;
  }
  return next;
}
