import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { PART_LIST, PARTS } from '../lib/game/catalog';
import { FAMILY_LABELS, raidFamily } from '../lib/game/raid-mechanics';
import { guardianGenes, guardianGroups } from '../lib/game/guardians';
import { reachSettings } from '../lib/game/trap-reach';
import {
  validFreeTraps,
  snapTrap,
  VAULT_SURFACES,
} from '../lib/game/free-vault';
import { routePressure } from '../lib/game/route-pressure';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { replay, metrics } from './story-certification';
import { descends, descentBypass } from './descent-certification';

// Generate review artifacts only. Never overwrite the source catalogs here.
const output = 'output/power-variety';
mkdirSync(output, { recursive: true });
for (const name of ['story-courses', 'verified-courses', 'starter-vaults']) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  const backup = `${output}/${name}.before.json`;
  const original = readFileSync(
    existsSync(backup) ? backup : `lib/game/data/${name}.json`,
    'utf8',
  );
  if (!existsSync(backup)) writeFileSync(backup, original);
  const courses = JSON.parse(original) as VerifiedCourse[];
  const starter = name === 'starter-vaults';
  const counts: Record<string, number> = Object.fromEntries(
    Object.keys(FAMILY_LABELS).map((f) => [f, 0]),
  );
  const parts: Record<string, number> = {};
  for (const c of courses)
    for (const t of c.level.traps) {
      counts[raidFamily(t.part)]++;
      parts[t.part] = (parts[t.part] ?? 0) + 1;
    }
  const changed = new Set<VerifiedCourse>();
  for (let pass = 0; pass < 3; pass++) {
    let swaps = 0;
    for (const course of courses) {
      if (name === 'story-courses' && course === courses[0]) continue;
      const level = course.level;
      for (let i = 0; i < level.traps.length; i++) {
        const old = level.traps[i],
          family = raidFamily(old.part);
        if (name === 'verified-courses' && parts[old.part] <= 1) continue;
        const others = level.traps.filter((_, j) => j !== i);
        const choices = PART_LIST.filter((p) => {
          if (others.some((t) => t.part === p.id)) return false;
          if (starter && p.slotId !== PARTS[old.part].slotId) return false;
          if (
            others.filter((t) => PARTS[t.part].slotId === p.slotId).length >=
            (level.traps.length <= 4 ? 1 : 2)
          )
            return false;
          return counts[raidFamily(p.id)] + 2 < counts[family];
        }).sort(
          (a, b) =>
            counts[raidFamily(a.id)] - counts[raidFamily(b.id)] ||
            (parts[a.id] ?? 0) - (parts[b.id] ?? 0) ||
            a.id.localeCompare(b.id),
        );
        let done = false;
        for (const p of choices) {
          const settings = reachSettings(p.id);
          const placements = starter
            ? [0, -0.6, 0.6, -1.2, 1.2].flatMap((dx) =>
                [settings.default, Math.max(settings.min, 0.75)].map(
                  (reach) => ({
                    ...snapTrap(old.x + dx, old.y),
                    phase: old.phase,
                    reach,
                  }),
                ),
              )
            : [old.phase, 0, 0.8, 1.6].map((phase) => ({
                x: old.x,
                y: old.y,
                phase,
                reach: settings.default,
              }));
          if (starter && raidFamily(p.id) === 'pendulum')
            for (const surface of VAULT_SURFACES)
              for (const dx of [-1.5, 0, 1.5])
                placements.push({
                  ...snapTrap(surface.x + dx, surface.y + 0.8),
                  phase: old.phase,
                  reach: settings.default,
                });
          for (const placement of placements) {
            const traps = level.traps.map((t, j) =>
              j === i ? { ...t, part: p.id, ...placement } : t,
            );
            if (
              starter &&
              courses.some(
                (c) =>
                  c !== course &&
                  c.level.traps.map((t) => t.part).join('|') ===
                    traps.map((t) => t.part).join('|'),
              )
            )
              continue;
            if (starter && !validFreeTraps(traps)) continue;
            const candidate = { ...level, traps, guardianGenes: undefined };
            const proof = replay(
              candidate,
              course.proof.actions,
              course.proof.frames + 120,
            );
            if (!proof) continue;
            if (
              !starter &&
              routePressure(candidate, proof).encountered !== traps.length
            )
              continue;
            if (descends(candidate) && descentBypass(candidate)) continue;
            level.traps = traps;
            course.proof = proof;
            counts[family]--;
            counts[raidFamily(p.id)]++;
            parts[old.part]--;
            parts[p.id] = (parts[p.id] ?? 0) + 1;
            changed.add(course);
            swaps++;
            done = true;
            break;
          }
          if (done) break;
        }
      }
    }
    console.log(name, 'pass', pass + 1, 'swaps', swaps);
    if (!swaps) break;
  }
  for (const c of courses) {
    if (starter && !c.level.id.startsWith('starter-v2-'))
      c.level.id = c.level.id.replace('starter-', 'starter-v2-');
    c.level.guardianGenes = guardianGroups(
      c.level.traps.map((t) => t.part),
    ).map((group, i) =>
      guardianGenes(
        group.map((j) => c.level.traps[j].part),
        c.level.id + '-' + i,
      ),
    );
    if (
      !verifyRoute(c.level, c.proof) ||
      replay(c.level, [], Math.max(4800, c.proof.frames + 120))
    )
      throw Error('Invalid defense ' + c.level.id);
    if (name === 'story-courses' && changed.has(c))
      Object.assign(c, { metrics: metrics(c.level, c.proof) });
  }
  writeFileSync(
    `${output}/${name}.json`,
    JSON.stringify(courses, null, 2) + '\n',
  );
  console.log(name, counts);
}
