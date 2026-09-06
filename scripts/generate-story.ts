import { PART_LIST, PARTS } from '../lib/game/catalog';
import { fitGuardianParts } from './guardian-certification';
import { dungeonGuardians } from '../lib/game/guardians';
import { readFileSync, writeFileSync } from 'node:fs';
import { type Trap } from '../lib/game/physics';
import {
  verifyRoute,
  type VerifiedCourse,
  type RouteProof,
} from '../lib/game/route-proof';
import { solveRoute } from '../lib/game/route-solver';
import { storyTrapCount } from '../lib/game/story-difficulty';
import { replay, metrics } from './story-certification';
const path = 'lib/game/data/story-courses.json';
const story = JSON.parse(readFileSync(path, 'utf8')) as Array<
  VerifiedCourse & {
    number: number;
    chapter: number;
    metrics: ReturnType<typeof metrics>;
  }
>;
const attackers = [
  ...new Set([
    'carrot',
    'lagging',
    'cactus',
    'grass-snake',
    ...PART_LIST.map((p) => p.id),
  ]),
];
for (const course of story) {
  const target = storyTrapCount(course.number);
  const fitted = fitGuardianParts(course, target <= 4 ? 1 : 2);
  const level = fitted.level;
  let proof: RouteProof | null = fitted.proof;
  level.traps = level.traps.slice(0, target);
  if (!verifyRoute(level, proof))
    proof = replay(level, proof.actions, Math.min(12000, proof.frames + 1200));
  if (!proof) proof = solveRoute(level, 200);
  if (!proof) throw Error('Cannot certify existing defenses ' + course.number);
  while (level.traps.length < target) {
    const index = level.traps.length;
    const stations = level.platforms
      .filter((p) => p.y + p.h / 2 + 0.5 < level.chest.y + 0.4)
      .flatMap((p) =>
        [0.32, -0.32, 0, 0.16, -0.16, 0.42, -0.42].map((f) => ({
          x: Number((p.x + p.w * f).toFixed(3)),
          y: Number((p.y + p.h / 2 + 0.525).toFixed(3)),
        })),
      )
      .filter(
        (s) =>
          s.x > level.room!.left + 0.6 &&
          s.x < level.room!.right - 0.6 &&
          !level.traps.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < 1.1) &&
          Math.hypot(level.chest.x - s.x, level.chest.y - s.y) > 1.25,
      );
    // Ground defenses punish missed landings; never occupy the spawn or a solid pillar.
    for (let x = level.room!.left + 1; x < level.room!.right - 0.6; x += 1.3) {
      const y = level.room!.floor + 0.525;
      if (Math.hypot(x - level.spawn.x, y - level.spawn.y) < 3) continue;
      if (
        level.platforms.some(
          (p) =>
            Math.abs(p.x - x) < p.w / 2 + 0.55 &&
            Math.abs(p.y - y) < p.h / 2 + 0.55,
        )
      )
        continue;
      if (level.traps.some((t) => Math.hypot(t.x - x, t.y - y) < 1.1)) continue;
      stations.push({ x: Number(x.toFixed(3)), y });
    }
    // Spread defenses through the climb, then try different attack patterns if necessary.
    stations.sort((a, b) => {
      const desired = ((index + 1) / (target + 1)) * level.chest.y;
      return Math.abs(a.y - desired) - Math.abs(b.y - desired);
    });
    if (course.number <= 3 && index === 0) stations.unshift({ x: 8.8, y: 3.9 });
    let chosen: { trap: Trap; proof: RouteProof } | undefined;
    const availableAttackers = attackers.filter(
      (id) =>
        !level.traps.some((t) => t.part === id) &&
        level.traps.filter((t) => PARTS[t.part].slotId === PARTS[id].slotId)
          .length < (target <= 4 ? 1 : 2),
    );
    for (const part of course.number <= 3 ? ['carrot'] : availableAttackers) {
      for (const station of stations) {
        const trap = {
          ...station,
          part,
          phase: Number((index * 0.8).toFixed(2)),
          patrol: 0,
        };
        const candidate = { ...level, traps: [...level.traps, trap] };
        const route = replay(
          candidate,
          proof.actions,
          Math.min(12000, proof.frames + 1200),
        );
        if (route) {
          chosen = { trap, proof: route };
          break;
        }
      }
      if (chosen) break;
    }
    if (!chosen) {
      for (const station of stations.slice(0, 6)) {
        const trap = {
          ...station,
          part: availableAttackers[index % availableAttackers.length],
          phase: index * 0.8,
          patrol: 0,
        };
        const route = solveRoute(
          { ...level, traps: [...level.traps, trap] },
          200,
        );
        if (route) {
          chosen = { trap, proof: route };
          break;
        }
      }
    }
    if (!chosen)
      throw Error(
        `No clean route for level ${course.number} with ${target} traps`,
      );
    level.traps.push(chosen.trap);
    proof = chosen.proof;
  }
  if (course.number <= 3)
    level.subtitle =
      'Carrot lanza zanahorias. Mira el aviso, salta el disparo y rebota hacia el cofre.';
  if (!verifyRoute(level, proof))
    throw Error('Invalid final proof ' + course.number);
  dungeonGuardians(level);
  course.level = level;
  course.proof = proof;
  course.metrics = metrics(level, proof);
  console.log(
    `Level ${course.number}: ${target} traps, ${proof.frames} frames, verified`,
  );
}
// Write only after every published room is certified; never reorder or replace geometries.
writeFileSync(path, JSON.stringify(story, null, 2) + '\n');
console.log('50 story levels certified with progressive defenses.');
