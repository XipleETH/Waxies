import story from '../lib/game/data/story-courses.json';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  raidFamily,
  raidMotion,
  raidZone,
  zoneClearance,
  stepRaidTrap,
  FAMILY_LABELS,
} from '../lib/game/raid-mechanics';
import { PART_LIST } from '../lib/game/catalog';
import { createState, type Dungeon } from '../lib/game/physics';
import {
  projectileVolley,
  projectilePaths,
} from '../lib/game/projectile-flight';
const level: Dungeon = {
  id: 'mechanics',
  name: '',
  subtitle: '',
  difficulty: '',
  rules: 'raid',
  room: { w: 30, h: 30, left: 1, right: 29, floor: 1 },
  platforms: [],
  traps: [],
  spawn: { x: 2, y: 2 },
  chest: { x: 25, y: 25 },
};
function fixture(part: string) {
  const l = {
    ...level,
    traps: [{ part, x: 10, y: 10, phase: 0, patrol: 0, reach: 2 }],
  };
  const s = createState(l);
  s.phase = 'playing';
  return { l, s, t: s.hazards.traps[0], trap: l.traps[0] };
}
test('all 132 cards have a named raid family and all proposed families are represented', () => {
  const covered = new Set(PART_LIST.map((p) => raidFamily(p.id)));
  for (const p of PART_LIST) assert.ok(FAMILY_LABELS[raidFamily(p.id)], p.id);
  for (const family of [
    'orbit',
    'pendulum',
    'lift',
    'leap',
    'cloud',
    'gas',
    'wave',
    'spikes',
    'gate',
    'cannon',
    'mortar',
    'breath',
    'boomerang',
  ])
    assert.ok(covered.has(family as ReturnType<typeof raidFamily>), family);
});
test('orbital, pendulum and lift motion are periodic and bounded', () => {
  for (const part of ['indian-star', 'dual-blade', 'balloon']) {
    const { trap } = fixture(part),
      a = raidMotion(trap, 0),
      b = raidMotion(trap, (Math.PI * 2) / 1.65);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8);
    const points = Array.from({ length: 60 }, (_, i) =>
      raidMotion(trap, i / 10),
    );
    assert.ok(points.some((p) => Math.hypot(p.x - a.x, p.y - a.y) > 0.5));
  }
});
test('gas damages away from emitter, fades and cannot reach through a wall', () => {
  for (const wall of [false, true]) {
    const { l, s, t, trap } = fixture('yam');
    t.stage = 'active';
    t.timer = 0.7;
    s.x = 11.2;
    s.y = 10;
    if (wall) l.platforms = [{ x: 10.6, y: 10, w: 0.1, h: 5 }];
    stepRaidTrap(s, l, 0, 1 / 120);
    assert.equal(s.hits, wall ? 0 : 1);
    t.timer = 0.01;
    assert.ok(raidZone(trap, t)!.radius < 0.1);
  }
});
test('wave has a safe center and a harmful moving rim', () => {
  const { trap, t } = fixture('goda');
  t.stage = 'active';
  t.timer = 0.1;
  const z = raidZone(trap, t)!;
  assert.ok(zoneClearance(z, z.x, z.y) > 0);
  assert.ok(zoneClearance(z, z.x + z.radius - 0.1, z.y) < 0);
});
test('barrier remains non damaging while open and closes with damage', () => {
  const { l, s, t } = fixture('pumpkin');
  s.x = 10;
  s.y = 10;
  t.stage = 'recover';
  t.timer = 0.5;
  stepRaidTrap(s, l, 0, 1 / 120);
  assert.equal(s.hits, 0);
  t.stage = 'active';
  t.timer = 1;
  stepRaidTrap(s, l, 0, 1 / 120);
  assert.equal(s.hits, 1);
});
test('cannon has larger slow ammunition and boomerang retraces its height', () => {
  const cannon = fixture('carrot'),
    boomerang = fixture('shoal-star');
  const shot = projectileVolley(cannon.trap, cannon.t)[0];
  assert.equal(shot.radius, 0.32);
  assert.ok(Math.abs(shot.vx) < 5);
  const path = projectilePaths(boomerang.l, boomerang.trap, 1)[0];
  assert.ok(path.length > 5);
  assert.ok(path.every((p) => Math.abs(p.y - path[0].y) < 1e-9));
  assert.ok(path.at(-1)!.x < Math.max(...path.map((p) => p.x)) - 1);
});

test('story introduces every raid family without losing the existing families', () => {
  const covered = new Set(
    story.flatMap((c) => c.level.traps.map((t) => raidFamily(t.part))),
  );
  for (const family of Object.keys(FAMILY_LABELS))
    assert.ok(covered.has(family as ReturnType<typeof raidFamily>), family);
});
