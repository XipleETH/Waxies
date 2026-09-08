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
void test('every radial and aura trap damages inside its active field without body contact', () => {
  for (const p of PART_LIST.filter((p) => isArea(p.id))) {
    const { level, s } = scene(p.id);
    stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hazards.traps[0].stage, 'warning', p.id);
    assert.equal(s.hits, 0);
    for (let i = 0; i < Math.ceil(AREA_WARNING * 120) + 3; i++)
      stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hits, 1, p.id);
    assert.equal(s.hp, 80, p.id);
  }
});
void test('area warnings catch a fast descent beside the body and respect walls and radius', () => {
  const { level, s } = scene('cottontail');
  s.x = 11.5;
  s.y = 13;
  s.vy = -12;
  for (let i = 0; i < 55 && s.hits === 0; i++) {
    const old = s.y;
    s.y -= 12 / 120;
    stepHazards(s, level, 1 / 120, old, true);
  }
  assert.equal(s.hits, 1);
  for (const blocked of [false, true]) {
    const { level, s } = scene('cactus');
    if (blocked) level.platforms = [{ x: 10.65, y: 10, w: 0.2, h: 4 }];
    else s.x = 12.1;
    s.hazards.traps[0].stage = 'active';
    s.hazards.traps[0].timer = 1;
    stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hits, 0);
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
