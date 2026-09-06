import { PARTS, PART_LIST } from '../lib/game/catalog';
import { solveRoute } from '../lib/game/route-solver';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { replay } from './story-certification';
/** Retain position and try compatible real cards before changing the recorded route. */
export function fitGuardianParts(
  course: VerifiedCourse,
  limit = 1,
  protectedPart?: string,
): VerifiedCourse {
  const level = structuredClone(course.level);
  let proof = course.proof;
  const order = level.traps
    .map((_, i) => i)
    .sort(
      (a, b) =>
        Number(level.traps[b].part === protectedPart) -
        Number(level.traps[a].part === protectedPart),
    );
  const used: string[] = [],
    counts: Record<string, number> = {};
  for (const index of order) {
    const id = level.traps[index].part,
      slot = PARTS[id].slotId;
    if (!used.includes(id) && (counts[slot] ?? 0) < limit) {
      used.push(id);
      counts[slot] = (counts[slot] ?? 0) + 1;
      continue;
    }
    const choices = PART_LIST.filter(
      (p) => !used.includes(p.id) && (counts[p.slotId] ?? 0) < limit,
    ).sort(
      (a, b) =>
        Number(b.recipe.pattern === PARTS[id].recipe.pattern) -
        Number(a.recipe.pattern === PARTS[id].recipe.pattern),
    );
    let found = false;
    for (const part of choices) {
      const candidate = {
        ...level,
        traps: level.traps.map((t, i) =>
          i === index ? { ...t, part: part.id } : t,
        ),
      };
      const route = replay(
        candidate,
        proof.actions,
        Math.min(12000, proof.frames + 1200),
      );
      if (!route) continue;
      level.traps = candidate.traps;
      proof = route;
      used.push(part.id);
      counts[part.slotId] = (counts[part.slotId] ?? 0) + 1;
      found = true;
      break;
    }
    if (!found)
      for (const part of choices.slice(0, 8)) {
        const candidate = {
          ...level,
          traps: level.traps.map((t, i) =>
            i === index ? { ...t, part: part.id } : t,
          ),
        };
        const route = solveRoute(candidate, 200);
        if (route) {
          level.traps = candidate.traps;
          proof = route;
          used.push(part.id);
          counts[part.slotId] = (counts[part.slotId] ?? 0) + 1;
          found = true;
          break;
        }
      }
    if (!found) throw Error('No compatible guardian parts for ' + level.id);
  }
  if (!verifyRoute(level, proof)) throw Error('Guardian proof invalid');
  return { level, proof };
}
