import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PART_LIST } from '../lib/game/catalog';
import { raidFamily, FAMILY_LABELS } from '../lib/game/raid-mechanics';
import { metrics } from './story-certification';
const path = 'lib/game/data/story-courses.json',
  story = JSON.parse(readFileSync(path, 'utf8'));
for (const c of story) c.metrics = metrics(c.level, c.proof);
writeFileSync(path, JSON.stringify(story, null, 2) + String.fromCharCode(10));
const counts: Record<string, number> = {};
for (const c of story)
  for (const t of c.level.traps) {
    const k = raidFamily(t.part);
    counts[k] = (counts[k] ?? 0) + 1;
  }
console.log(counts);
mkdirSync('docs', { recursive: true });
const lines = [
  '# Trampas de mazmorra — revisión 2',
  '',
  'Las trayectorias y áreas son adaptaciones de plataforma, no habilidades oficiales nuevas de Axie Classic. Las cartas originales permanecen en el catálogo.',
  '',
  '| Pieza | Carta Classic | Familia de mazmorra |',
  '|---|---|---|',
  ...PART_LIST.map(
    (p) =>
      '| ' +
      p.name +
      ' | ' +
      p.card +
      ' | ' +
      FAMILY_LABELS[raidFamily(p.id)] +
      ' |',
  ),
];
writeFileSync(
  'docs/raid-mechanics.md',
  lines.join(String.fromCharCode(10)) + String.fromCharCode(10),
);
