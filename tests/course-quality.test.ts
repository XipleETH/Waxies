import assert from 'node:assert/strict';
import test from 'node:test';
import story from '../lib/game/data/story-courses.json';
import practice from '../lib/game/data/verified-courses.json';
import { routePressure } from '../lib/game/route-pressure';
import { replay } from '../scripts/story-certification';
import { type VerifiedCourse } from '../lib/game/route-proof';
import { createState, type Dungeon } from '../lib/game/physics';
import { stepHazards } from '../lib/game/hazards';
import {
  projectileVolley,
  projectilePaths,
} from '../lib/game/projectile-flight';
import { reachSettings } from '../lib/game/trap-reach';
import { PART_LIST } from '../lib/game/catalog';
const courses = [...story, ...practice] as VerifiedCourse[];
void test('every authored defense has a visible encounter and no route wins untouched', () => {
  for (const c of courses) {
    const pressure = routePressure(c.level, c.proof);
    assert.equal(pressure.encountered, pressure.total, c.level.id);
    assert.equal(
      replay(c.level, [], Math.max(4800, c.proof.frames + 1200)),
      null,
      c.level.id,
    );
  }
});
void test('story and practice include entrances above the chest, floor vaults and intermediate balconies', () => {
  for (const group of [story, practice]) {
    assert.ok(
      group.filter((c) => c.level.spawn.y > c.level.chest.y + 2).length >= 15,
    );
    assert.ok(group.some((c) => c.level.chest.y < 3));
    assert.ok(
      group.some(
        (c) => c.level.spawn.y > c.level.chest.y + 2 && c.level.chest.y > 5,
      ),
    );
    assert.ok(group.some((c) => c.level.spawn.x > 8));
  }
});
const level: Dungeon = {
  id: 'range-test',
  name: 'Range',
  subtitle: '',
  difficulty: '',
  rules: 'raid',
  room: { w: 40, h: 30, left: 1, right: 39, floor: 1 },
  spawn: { x: 2, y: 2 },
  chest: { x: 37, y: 2 },
  platforms: [],
  traps: [],
};
void test('every shooting part exposes a configurable range and trajectory', () => {
  for (const part of PART_LIST) {
    const trap = { part: part.id, x: 20, y: 15, phase: 0, patrol: 0, reach: 4 };
    const volley = projectileVolley(trap, {
      ...trap,
      facing: 1,
      aimX: 28,
      aimY: 15,
    });
    if (!volley.length) continue;
    assert.equal(reachSettings(part.id).kind, 'line', part.id);
    assert.ok(
      volley.every(
        (p) => p.maxTravel === (part.recipe.pattern === 'boomerang' ? 8 : 4),
      ),
      part.id,
    );
    assert.ok(
      projectilePaths({ ...level, traps: [trap] }, trap, 1).every(
        (path) => path.length > 2,
      ),
      part.id,
    );
  }
});
void test('changing Carrot range changes actual flight distance and the preview', () => {
  function flight(reach: number) {
    const trap = { part: 'carrot', x: 20, y: 15, phase: 0, patrol: 0, reach },
      d = { ...level, traps: [trap] },
      s = createState(d);
    s.phase = 'playing';
    let id: number | undefined,
      max = 0;
    for (let i = 0; i < 600; i++) {
      stepHazards(s, d, 1 / 120, s.y, false);
      const p =
        id === undefined
          ? s.hazards.projectiles[0]
          : s.hazards.projectiles.find((p) => p.id === id);
      if (p) {
        id = p.id;
        max = Math.max(max, p.travel ?? 0);
      } else if (id !== undefined) break;
    }
    return { max, path: projectilePaths(d, trap, -1)[0] };
  }
  const short = flight(2),
    long = flight(10);
  assert.ok(short.max <= 2 && short.max > 1.8);
  assert.ok(long.max <= 10 && long.max > 9.8);
  assert.ok(long.path.length > short.path.length * 3);
});
