import {
  createState,
  requestJump,
  step,
  type Dungeon,
} from '../lib/game/physics';
import {
  verifyRoute,
  type RouteProof,
  type VerifiedCourse,
} from '../lib/game/route-proof';
import { solveRoute } from '../lib/game/route-solver';
import { MOBILE_RULES } from '../lib/game/portrait';
import { readFileSync, writeFileSync } from 'node:fs';
const source = JSON.parse(
  readFileSync('lib/game/data/verified-courses.json', 'utf8'),
) as VerifiedCourse[];
function replay(
  level: Dungeon,
  actions: number[],
  limit = 12000,
): RouteProof | null {
  const s = createState(level);
  s.phase = 'playing';
  let index = 0;
  for (let f = 0; f < limit; f++) {
    if (actions[index] === f) {
      requestJump(s);
      index++;
    }
    step(s, level);
    if (s.hits || s.hp < 100) return null;
    if ((s.phase as string) === 'won')
      return {
        rules: MOBILE_RULES,
        frames: s.frame,
        actions: actions.filter((a) => a < s.frame),
      };
    if (s.phase !== 'playing') return null;
  }
  return null;
}
function metrics(level: Dungeon, proof: RouteProof) {
  let passed = 0,
    total = 0;
  // Independent +/- 50 ms timing errors, spread across the recorded jumps.
  const probes = proof.actions
    .filter(
      (_, i) => i % Math.max(1, Math.floor(proof.actions.length / 12)) === 0,
    )
    .slice(0, 12);
  for (const frame of probes)
    for (const offset of [-6, 6]) {
      const actions = [
        ...new Set(
          proof.actions.map((f) => (f === frame ? Math.max(0, f + offset) : f)),
        ),
      ].sort((a, b) => a - b);
      total++;
      if (replay(level, actions, Math.min(12000, proof.frames + 1200)))
        passed++;
    }
  const tolerance = total ? passed / total : 1;
  const score = Math.round(
    (1 - tolerance) * 50 +
      proof.actions.length * 0.65 +
      (proof.frames / 120) * 0.28 +
      level.traps.length * 5 +
      level.platforms.filter((p) => p.w < 3).length * 2,
  );
  return {
    score,
    timingPassed: passed,
    timingTrials: total,
    timingOffsetMs: 50,
    seconds: Math.round(proof.frames / 120),
    jumps: proof.actions.length,
  };
}
const candidates: Array<
  VerifiedCourse & { metrics: ReturnType<typeof metrics> }
> = [];
const signatures = new Set<string>();
// Three short rooms teach jumping and wall rebounds before combinations of powers.
for (let count = 2; count <= 4; count++) {
  const base = structuredClone(
    source.find((c) => c.level.layoutId === 'patio')!.level,
  );
  base.platforms = base.platforms.slice(0, count);
  const top = base.platforms.at(-1)!;
  base.chest = { x: count % 2 === 0 ? 2.4 : 9, y: top.y + 0.8 };
  base.room!.h = top.y + 2.1;
  base.traps = [];
  base.layoutId = 'first-steps';
  base.name = ['', '', 'Primer salto', 'De pared en pared', 'Camino al bosque'][
    count
  ];
  const proof = solveRoute(base, 160);
  if (!proof) throw Error('Tutorial could not be certified');
  candidates.push({ level: base, proof, metrics: metrics(base, proof) });
  signatures.add(JSON.stringify(base.platforms));
  console.log('Tutorial', count);
}
// Authored rooms keep their topology; variants change real ledge widths and hazard placement.
for (let variant = 0; variant < 9; variant++)
  for (let i = 0; i < source.length; i++) {
    const seed = source[i],
      level = structuredClone(seed.level);
    const inset = [0.12, 0.26, -0.16, 0.4, 0, 0.04, -0.06, 0.55, -0.35][
      variant
    ];
    level.platforms = level.platforms.map((p, j) => {
      if (p.h > 1) return { ...p };
      const delta = inset * (1 + ((i + j) % 4) * 0.25);
      const left = p.x - p.w / 2 <= level.room!.left + 0.05,
        right = p.x + p.w / 2 >= level.room!.right - 0.05;
      return {
        ...p,
        w: Number((p.w - delta).toFixed(3)),
        x: Number(
          (p.x + (left ? -delta / 2 : right ? delta / 2 : 0)).toFixed(3),
        ),
      };
    });
    if (variant === 0) level.traps = level.traps.slice(0, 1 + (i % 2));
    if (variant === 2)
      level.traps = level.traps.map((t, j) => ({
        ...t,
        phase: t.phase + (i % 3) * 0.2,
        x: t.x + (j % 2 ? -0.2 : 0.2),
      }));
    if (variant === 3) {
      const p = level.platforms.find(
        (p) =>
          p.h < 1 &&
          p.y > 2 &&
          !level.traps.some((t) => Math.abs(t.y - p.y) < 1),
      );
      if (p)
        level.traps.push({
          part: 'carrot',
          x: p.x,
          y: p.y + 0.8,
          phase: 2.4,
          patrol: 0,
        });
    }
    const sig = JSON.stringify(level.platforms);
    if (signatures.has(sig)) continue;
    const proof = replay(
      level,
      seed.proof.actions,
      Math.min(12000, seed.proof.frames + 1200),
    );
    if (!proof) continue;
    signatures.add(sig);
    candidates.push({ level, proof, metrics: metrics(level, proof) });
    console.log(
      'Candidate',
      candidates.length,
      level.layoutId,
      variant,
      candidates.at(-1)!.metrics.score,
    );
  }
if (candidates.length < 50)
  throw Error('Only ' + candidates.length + ' certified candidates');
const tutorials = candidates
  .slice(0, 3)
  .sort((a, b) => a.metrics.score - b.metrics.score);
const pool = candidates
  .slice(3)
  .filter((c) => c.metrics.score >= tutorials.at(-1)!.metrics.score)
  .sort((a, b) => a.metrics.score - b.metrics.score);
if (pool.length < 47) throw Error('Not enough graded candidates');
// Sample the full difficulty range, retaining all eight room families.
const chosen = Array.from(
  { length: 47 },
  (_, i) => pool[Math.round((i * (pool.length - 1)) / 46)],
);
for (const family of new Set(pool.map((c) => c.level.layoutId))) {
  if (chosen.some((c) => c.level.layoutId === family)) continue;
  const candidate = pool.find((c) => c.level.layoutId === family)!;
  const replace = chosen.findIndex(
    (c) =>
      chosen.filter((x) => x.level.layoutId === c.level.layoutId).length > 1,
  );
  chosen[replace] = candidate;
}
const levels = [
  ...tutorials,
  ...chosen.sort((a, b) => a.metrics.score - b.metrics.score),
];
const chapterNames = [
  'El despertar',
  'Senderos de Lunacia',
  'Ruinas de cristal',
  'Guardianes del cofre',
  'La última bóveda',
];
const story = levels.map((c, i) => ({
  ...c,
  number: i + 1,
  chapter: Math.floor(i / 10) + 1,
  level: {
    ...c.level,
    id: 'story-' + String(i + 1).padStart(2, '0'),
    name: c.level.name,
    difficulty: chapterNames[Math.floor(i / 10)],
    subtitle:
      i < 3
        ? 'Aprende a saltar y rebotar. No hay trampas en esta sala.'
        : c.level.subtitle,
  },
}));
for (const c of story)
  if (!verifyRoute(c.level, c.proof))
    throw Error('Invalid final proof ' + c.number);
writeFileSync(
  'lib/game/data/story-courses.json',
  JSON.stringify(story, null, 2) + '\n',
);
console.log(
  'STORY READY',
  story.length,
  'candidates',
  candidates.length,
  'score range',
  story[0].metrics.score,
  story.at(-1)!.metrics.score,
);
