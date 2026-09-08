import assert from 'node:assert/strict';
import test from 'node:test';
import data from '../lib/game/data/verified-courses.json';
import { PRACTICE_LAYOUTS } from '../lib/game/practice-layouts';
import { choosePracticeCourse } from '../lib/game/practice-selection';
import type { VerifiedCourse } from '../lib/game/route-proof';
const courses = data as VerifiedCourse[];
void test('practice keeps eight room families with distinct, individually authored paths', () => {
  const fingerprints = new Set(
    PRACTICE_LAYOUTS.map((l) => JSON.stringify([l.room, l.platforms, l.chest])),
  );
  assert.equal(fingerprints.size, 8);
  assert.ok(
    new Set(courses.map((c) => JSON.stringify(c.level.platforms))).size >= 20,
  );
  assert.ok(new Set(PRACTICE_LAYOUTS.map((l) => l.room.h)).size >= 4);
  for (const layout of PRACTICE_LAYOUTS) {
    const variants = courses.filter((c) => c.level.layoutId === layout.id);
    assert.ok(variants.length >= 2, layout.id);
    for (const c of variants) {
      assert.deepEqual(c.level.room, layout.room);
      assert.ok(c.level.platforms.length >= 3, c.level.id);
      for (const platform of c.level.platforms) {
        assert.ok(platform.w > 0 && platform.h > 0, c.level.id);
        assert.ok(
          platform.x - platform.w / 2 >= -0.01 &&
            platform.x + platform.w / 2 <= layout.room.w + 0.01,
          c.level.id,
        );
        assert.ok(
          platform.y > layout.room.floor && platform.y < layout.room.h,
          c.level.id,
        );
      }
      assert.ok(
        c.level.chest.x > layout.room.left &&
          c.level.chest.x < layout.room.right,
      );
      assert.ok(
        c.level.chest.y > layout.room.floor && c.level.chest.y < layout.room.h,
      );
    }
  }
});
void test('random practice changes room on every entry and explicit room selection is respected', () => {
  let previous: string | undefined;
  for (let i = 0; i < 100; i++) {
    const c = choosePracticeCourse(
      courses,
      previous,
      undefined,
      () => ((i * 17) % 100) / 100,
    );
    assert.notEqual(c.level.layoutId, previous);
    previous = c.level.layoutId;
  }
  for (const l of PRACTICE_LAYOUTS)
    assert.equal(
      choosePracticeCourse(courses, null, l.id, () => 0.9).level.layoutId,
      l.id,
    );
  assert.throws(() => choosePracticeCourse(courses, null, 'missing'));
  assert.throws(() => choosePracticeCourse([]));
});
