import test from 'node:test';
import assert from 'node:assert/strict';
import practice from '../lib/game/data/verified-courses.json';
import story from '../lib/game/data/story-courses.json';
import { STARTER_VAULTS } from '../lib/game/starter-vaults';
import { raidFamily, FAMILY_LABELS } from '../lib/game/raid-mechanics';
import { newProfile, syncStarterProfile } from '../lib/game/mobile-profile';
void test('all three catalogs represent all 19 families without the old static/shooter bias', () => {
  for (const courses of [practice, story, STARTER_VAULTS]) {
    const counts = Object.fromEntries(
      Object.keys(FAMILY_LABELS).map((f) => [f, 0]),
    );
    for (const c of courses)
      for (const t of c.level.traps) counts[raidFamily(t.part)]++;
    const values = Object.values(counts);
    assert.ok(Math.min(...values) > 0);
    assert.ok(
      Math.max(...values) / Math.min(...values) <= 1.8,
      JSON.stringify(counts),
    );
  }
});
void test('renewing a customized guest vault preserves progress, currency and purchases and applies only once', () => {
  const p = newProfile();
  p.starterId = 'starter-01';
  p.chispas = 321;
  p.story = [100, 80];
  p.traps = [];
  const next = syncStarterProfile(p, STARTER_VAULTS[0].level.id);
  assert.equal(next.chispas, 321);
  assert.deepEqual(next.story, [100, 80]);
  assert.deepEqual(next.owned, p.owned);
  assert.equal(next.traps.length, 4);
  assert.ok(next.proof);
  assert.equal(syncStarterProfile(next, next.starterId!), next);
});
