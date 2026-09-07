import assert from 'node:assert/strict';
import test from 'node:test';
import courses from '../lib/game/data/story-courses.json';
import {
  storyMapNodes,
  dungeonMapSize,
  storyMapHeight,
} from '../lib/game/story-map-layout';
import { dungeonGuardians } from '../lib/game/guardians';
void test('each region has a distinct ordered path with room for its guardians', () => {
  const paths = Array.from({ length: 5 }, (_, c) => storyMapNodes(c));
  assert.equal(
    new Set(paths.map((p) => JSON.stringify(p.map((v) => v.x)))).size,
    5,
  );
  for (const p of paths) {
    assert.equal(p.length, 10);
    for (let i = 1; i < p.length; i++) assert.ok(p[i].z - p[i - 1].z > 4.5);
    assert.ok(p.every((v) => Math.abs(v.x) < 2.6));
  }
  assert.ok(storyMapHeight(4) > storyMapHeight(0));
});
void test('map fortresses grow with story progression and preserve the actual defenders', () => {
  let previous = { width: 0, height: 0 };
  for (const [i, c] of courses.entries()) {
    const size = dungeonMapSize(i + 1, c.level.traps.length);
    assert.ok(size.width >= previous.width && size.height >= previous.height);
    previous = size;
    const guardians = dungeonGuardians(c.level);
    assert.equal(
      guardians.flatMap((g) => g.traps).length,
      c.level.traps.length,
    );
    if (i >= 40) assert.equal(guardians.length, 2);
  }
  assert.ok(previous.height > dungeonMapSize(1, 1).height * 2);
});
