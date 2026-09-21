import assert from 'node:assert/strict';
import test from 'node:test';
import { trapMotion, moveTrap, validMotion } from '../lib/game/trap-motion';
import { createState, type Dungeon, type Trap } from '../lib/game/physics';
import { stepHazards } from '../lib/game/hazards';
import { raidFamily, MOVING_FAMILIES } from '../lib/game/raid-mechanics';
import story from '../lib/game/data/story-courses.json';
import practice from '../lib/game/data/verified-courses.json';
import starters from '../lib/game/data/starter-vaults.json';
import {
  challengeCode,
  decodeChallenge,
  verifyRoute,
  type VerifiedCourse,
} from '../lib/game/route-proof';
const room = story[0].level as Dungeon;
void test('new paths are deterministic, bounded and paired diagonals have opposite horizontal motion', () => {
  const t: Trap = {
    part: 'serious',
    x: 6,
    y: 5,
    phase: 0,
    patrol: 0,
    motion: 'diagonal',
    motionRange: 1.4,
  };
  for (let time = 0; time < 20; time += 0.1) {
    const a = trapMotion(t, time, room),
      b = trapMotion({ ...t, motionDirection: -1 }, time, room);
    assert.ok(Math.abs(a.x + b.x - 12) < 1e-8);
    assert.equal(a.y, b.y);
    assert.deepEqual(a, trapMotion(t, time, room));
  }
  const flight = { ...t, motion: 'flight' as const, motionRange: 5 };
  for (let time = 0; time < 100; time += 0.1) {
    const p = trapMotion(flight, time, room);
    assert.ok(p.x >= room.room!.left + 0.45 && p.x <= room.room!.right - 0.45);
  }
  const current = { x: 6, y: 5 };
  moveTrap({ ...t, motion: 'bounce' }, current, 1, {
    ...room,
    platforms: [{ x: 6, y: 5.8, w: 3, h: 0.5 }],
  });
  assert.deepEqual(current, { x: 6, y: 5 });
  assert.equal(validMotion({ ...t, motionRange: Infinity }), false);
  assert.equal(validMotion({ ...t, motionPhase: NaN }), false);
});
void test('all current catalogs move every trap and every new trajectory actually travels', () => {
  const stuck: string[] = [];
  for (const c of [...story, ...practice, ...starters]) {
    const level = c.level as Dungeon,
      s = createState(level);
    s.phase = 'playing';
    s.x = -100;
    s.y = -100;
    const points = level.traps.map(() => [] as { x: number; y: number }[]);
    for (let frame = 0; frame < 720; frame++) {
      s.time = frame / 120;
      stepHazards(s, level, 1 / 120, -100, false);
      if (frame > 120)
        s.hazards.traps.forEach((t, i) => points[i].push({ x: t.x, y: t.y }));
    }
    level.traps.forEach((t, i) => {
      const family = raidFamily(t.part);
      assert.ok(
        t.motion || MOVING_FAMILIES.has(family) || family === 'dash',
        `${level.id}:${t.part}`,
      );
      {
        const p = points[i];
        const travel = Math.hypot(
          Math.max(...p.map((v) => v.x)) - Math.min(...p.map((v) => v.x)),
          Math.max(...p.map((v) => v.y)) - Math.min(...p.map((v) => v.y)),
        );
        if (travel < 0.15) stuck.push(`${level.id}:${t.part}`);
      }
    });
  }
  assert.deepEqual(stuck, []);
});
void test('movement survives sharing and manipulated movement settings are rejected', () => {
  const course = starters.find((c) =>
    c.level.traps.some((t) => 'motion' in t),
  )! as VerifiedCourse;
  const decoded = decodeChallenge(challengeCode(course));
  assert.deepEqual(
    JSON.parse(JSON.stringify(decoded.level.traps)),
    course.level.traps,
  );
  assert.ok(verifyRoute(decoded.level, decoded.proof));
  const payload = JSON.parse(atob(challengeCode(course)));
  payload.t[0].motion = 'teleport';
  assert.throws(() => decodeChallenge(btoa(JSON.stringify(payload))));
});
