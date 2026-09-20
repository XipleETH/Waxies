import { raidFamily } from '../lib/game/raid-mechanics';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PART_LIST } from '../lib/game/catalog';
import { createState, type Dungeon } from '../lib/game/physics';
import { AREA_WARNING, isArea, stepHazards } from '../lib/game/hazards';
import story from '../lib/game/data/story-courses.json';
import practice from '../lib/game/data/verified-courses.json';
import { descentBypass, descends } from '../scripts/descent-certification';
const base: Dungeon = {
  id: 'area-test',
  name: 'Area',
  subtitle: '',
  difficulty: '',
  rules: 'raid',
  room: { w: 24, h: 24, left: 1, right: 23, floor: 1 },
  spawn: { x: 3, y: 3 },
  chest: { x: 21, y: 3 },
  platforms: [],
  traps: [],
};
function scene(part: string) {
  const level = {
    ...base,
    traps: [{ part, x: 10, y: 10, phase: 0, patrol: 0, reach: 1.65 }],
  };
  const s = createState(level);
  s.phase = 'playing';
  s.x = 11.3;
  s.y = 10;
  return { level, s };
}
void test('every converted area damages away from the body during its active cycle', () => {
  for (const p of PART_LIST.filter((p) =>
    ['wave', 'spikes', 'gas'].includes(raidFamily(p.id)),
  )) {
    const { level, s } = scene(p.id),
      t = s.hazards.traps[0];
    t.stage = 'active';
    t.timer = 0.3;
    t.facing = 1;
    for (let i = 0; i < 30 && !s.hits; i++)
      stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hits, 1, p.id);
    assert.equal(s.hp, 80, p.id);
  }
});
void test('directional spikes respect walls, range and their open recovery window', () => {
  for (const mode of ['wall', 'far', 'behind', 'recover']) {
    const { level, s } = scene('cactus'),
      t = s.hazards.traps[0];
    t.stage = mode === 'recover' ? 'recover' : 'active';
    t.timer = 1;
    t.facing = 1;
    if (mode === 'wall') level.platforms = [{ x: 10.65, y: 10, w: 0.2, h: 4 }];
    if (mode === 'far') s.x = 12.2;
    if (mode === 'behind') s.x = 8.7;
    stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hits, 0, mode);
  }
});
void test('Classic support auras retain their original non-damaging behaviour', () => {
  const { level, s } = scene('cottontail');
  delete level.rules;
  s.raid = false;
  s.hazards.traps[0].stage = 'active';
  s.hazards.traps[0].timer = 1;
  stepHazards(s, level, 1 / 120, s.y, false);
  assert.equal(s.hp, 100);
});
void test('all descending maps reject passive slides, single jumps and simple routes around defenses', () => {
  const courses = [...story, ...practice].filter((c) =>
    descends(c.level as Dungeon),
  );
  assert.ok(courses.length >= 78);
  for (const c of courses)
    assert.equal(descentBypass(c.level as Dungeon), null, c.level.id);
});
