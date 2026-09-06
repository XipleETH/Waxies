import assert from 'node:assert/strict';
import test from 'node:test';
import data from '../lib/game/data/verified-courses.json';
import { PRACTICE_LAYOUTS } from '../lib/game/practice-layouts';
import { choosePracticeCourse } from '../lib/game/practice-selection';
import type { VerifiedCourse } from '../lib/game/route-proof';
const courses = data as VerifiedCourse[];
void test('practice contains eight genuinely different room geometries, not just different trap sets', () => {
  const fingerprints = new Set(
    PRACTICE_LAYOUTS.map((l) => JSON.stringify([l.room, l.platforms, l.chest])),
  );
  assert.equal(fingerprints.size, 8);
  assert.ok(new Set(PRACTICE_LAYOUTS.map((l) => l.room.h)).size >= 4);
  for (const layout of PRACTICE_LAYOUTS) {
    const variants = courses.filter((c) => c.level.layoutId === layout.id);
    assert.ok(variants.length >= 2, layout.id);
    for (const c of variants) {
      assert.deepEqual(c.level.room, layout.room);
      assert.deepEqual(c.level.platforms, layout.platforms);
      assert.deepEqual(c.level.chest, layout.chest);
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
