import assert from 'node:assert/strict';
import test from 'node:test';
import data from '../lib/game/data/story-courses.json';
import { storyTrapCount } from '../lib/game/story-difficulty';
import { createState, requestJump, step } from '../lib/game/physics';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import {
  newProfile,
  readProfile,
  PROFILE_KEY,
} from '../lib/game/mobile-profile';
import {
  completeStory,
  storyUnlocked,
  storyStars,
  STORY_LENGTH,
} from '../lib/game/story-progress';
void test('50 story rooms have distinct geometry, progressive obstacles and clean live-physics replays', () => {
  assert.equal(data.length, STORY_LENGTH);
  assert.equal(
    new Set(data.map((c) => JSON.stringify(c.level.platforms))).size,
    50,
  );
  assert.equal(new Set(data.map((c) => c.level.layoutId)).size, 9);
  data.forEach((c, i) => {
    assert.equal(c.number, i + 1);
    assert.equal(c.chapter, Math.floor(i / 10) + 1);
    assert.ok(verifyRoute((c as VerifiedCourse).level, c.proof), c.level.id);
    assert.equal(c.level.traps.length, storyTrapCount(i + 1));
    if (i) assert.ok(c.level.traps.length >= data[i - 1].level.traps.length);
    assert.ok(Number.isFinite(c.metrics.score));
    assert.equal(c.metrics.timingOffsetMs, 50);
    assert.ok(c.metrics.timingPassed <= c.metrics.timingTrials);
  });
  assert.ok(data.slice(0, 3).every((c) => c.level.traps.length === 1));
  assert.ok(data.slice(-10).every((c) => c.level.traps.length === 5));
});
void test('story unlocks sequentially, pays only improvements and finishes without a 51st level', () => {
  let p = newProfile();
  assert.equal(storyUnlocked(p.story), 1);
  assert.throws(() => completeStory(p, 2, 100));
  p = completeStory(p, 1, 40);
  assert.equal(p.chispas, 40);
  assert.equal(storyUnlocked(p.story), 2);
  assert.equal(storyStars(40), 1);
  p = completeStory(p, 1, 20);
  assert.equal(p.chispas, 40);
  assert.equal(p.story[0], 40);
  p = completeStory(p, 1, 100);
  assert.equal(p.chispas, 100);
  assert.equal(p.wins, 1);
  assert.equal(storyStars(100), 3);
  for (let n = 2; n <= 50; n++) p = completeStory(p, n, 60);
  assert.equal(p.story.length, 50);
  assert.equal(storyUnlocked(p.story), 50);
  assert.equal(p.wins, 50);
  assert.throws(() => completeStory(p, 51, 100));
  for (const hp of [0, 21, 99, 101, NaN])
    assert.throws(() => completeStory(p, 1, hp));
});
void test('old mobile profiles gain empty story progress without losing purchases or Chispas', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    const p: Omit<ReturnType<typeof newProfile>, 'story'> & {
      story?: number[];
    } = newProfile();
    delete p.story;
    p.chispas = 321;
    p.owned.push('amethyst');
    p.theme = 'amethyst';
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) =>
          key === PROFILE_KEY ? JSON.stringify(p) : null,
      },
    });
    const read = readProfile();
    assert.deepEqual(read.story, []);
    assert.equal(read.chispas, 321);
    assert.equal(read.theme, 'amethyst');
    p.story = [100, 0, 100];
    assert.throws(() => readProfile());
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

void test('the first story obstacle fires real projectiles during the certified run', () => {
  const c = data[0] as VerifiedCourse,
    s = createState(c.level);
  s.phase = 'playing';
  let action = 0,
    fired = false;
  assert.equal(c.level.traps[0].part, 'carrot');
  for (let frame = 0; frame < c.proof.frames; frame++) {
    if (c.proof.actions[action] === frame) {
      requestJump(s);
      action++;
    }
    step(s, c.level);
    if (s.hazards.projectiles.some((p) => p.part === 'carrot')) fired = true;
  }
  assert.ok(
    fired,
    'Carrot must actually attack before the player reaches the chest',
  );
  assert.equal(s.phase, 'won');
  assert.equal(s.hp, 100);
});
