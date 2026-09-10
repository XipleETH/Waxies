import test from 'node:test';
import assert from 'node:assert/strict';
import { randomVaultParts } from '../lib/game/mobile-profile';
import { validFreeTraps } from '../lib/game/free-vault';

function lcg(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

void test('guest free-mode vaults are valid and differ between users', () => {
  const random = lcg(7);
  const signatures = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const traps = randomVaultParts(random);
    assert.equal(traps.length, 4, 'one defender per battle slot');
    assert.ok(validFreeTraps(traps), 'passes the free-placement rules');
    assert.equal(new Set(traps.map((t) => t.anchor)).size, 4, 'unique anchors');
    assert.equal(new Set(traps.map((t) => t.part)).size, 4, 'unique parts');
    signatures.add(traps.map((t) => t.part).join(','));
  }
  // Random selection must spread across many distinct vaults, not one shared set.
  assert.ok(
    signatures.size > 30,
    `expected varied vaults, got ${signatures.size}`,
  );
});

void test('a fixed seed yields a stable vault, so the cache stays consistent', () => {
  const a = randomVaultParts(lcg(99))
    .map((t) => t.part)
    .join(',');
  const b = randomVaultParts(lcg(99))
    .map((t) => t.part)
    .join(',');
  assert.equal(a, b);
});
