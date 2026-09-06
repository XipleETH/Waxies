import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { parseMetadata } from '../lib/game/axie';
import { PARTS, PART_LIST } from '../lib/game/catalog';
import {
  guardianGenes,
  guardianGroups,
  dungeonGuardians,
} from '../lib/game/guardians';
import { decodeGenes } from '../lib/game/genes';
import {
  decodeAppearance,
  resolveAppearanceParts,
} from '../lib/game/appearance';
import { makeVaultTraps, validVaultTraps } from '../lib/game/vault-layout';
import {
  newProfile,
  readProfile,
  PROFILE_KEY,
  vaultLevel,
} from '../lib/game/mobile-profile';
import { PORTRAIT_SLOTS } from '../lib/game/portrait';
import {
  challengeCode,
  decodeChallenge,
  verifyRoute,
  type VerifiedCourse,
} from '../lib/game/route-proof';
import type { MixerCatalog } from '../lib/game/mixer-avatar';
import practice from '../lib/game/data/verified-courses.json';
import story from '../lib/game/data/story-courses.json';
import fixture from './fixtures/guardian-vault.json';
void test('every Classic trap resolves to an exact shipped body part on its guardian', () => {
  const catalog = JSON.parse(
    fs.readFileSync('public/assets/mixer/catalog.json', 'utf8'),
  ) as MixerCatalog;
  const available = new Set(
    Object.entries(catalog.parts)
      .filter(([, p]) => p.models.length && !p.unavailable?.length)
      .map(([key]) => key),
  );
  for (const part of PART_LIST) {
    const genes = guardianGenes([part.id], 'guard-' + part.id);
    assert.ok(decodeGenes(genes).some((p) => p.card === part.id));
    for (const p of resolveAppearanceParts(decodeAppearance(genes), available))
      assert.ok(p.exact, part.id + ': ' + p.key);
  }
  assert.throws(() =>
    guardianGenes(['carrot', 'grass-snake'], 'duplicate-tail'),
  );
});
void test('all certified rooms have at most two coherent guardians and distinct powers', () => {
  for (const c of [...practice, ...story]) {
    const level = (c as VerifiedCourse).level,
      guards = dungeonGuardians(level);
    assert.ok(guards.length <= 2);
    assert.equal(
      new Set(level.traps.map((t) => t.part)).size,
      level.traps.length,
    );
    assert.equal(guards.flatMap((g) => g.traps).length, level.traps.length);
    for (const g of guards) {
      assert.ok(g.traps.length <= 4);
      const decoded = decodeGenes(g.genes);
      for (const i of g.traps)
        assert.ok(decoded.some((p) => p.card === level.traps[i].part));
    }
  }
  assert.throws(() => guardianGroups(['carrot', 'grass-snake', 'snake-jar']));
});
void test('vault supports four or eight distinct slot-bound defenses, and deduplicates shared powers', () => {
  const p = newProfile();
  assert.equal(p.traps.length, 4);
  assert.ok(validVaultTraps(p.traps, 1));
  p.guardianCount = 2;
  p.traps = makeVaultTraps([], 2, [null, null]);
  assert.equal(p.traps.length, 8);
  assert.ok(validVaultTraps(p.traps, 2));
  assert.equal(dungeonGuardians(vaultLevel(p)).length, 2);
  const axie = parseMetadata(
    JSON.parse(fs.readFileSync('tests/fixtures/4200042.json', 'utf8')),
    '4200042',
  );
  const shared = makeVaultTraps([], 2, [axie, axie]);
  assert.equal(shared.length, 4);
  assert.ok(validVaultTraps(shared, 2));
  const loaded = { ...p, axie, companion: axie, traps: shared };
  assert.equal(dungeonGuardians(vaultLevel(loaded))[1].traps.length, 0);
  assert.equal(dungeonGuardians(vaultLevel(loaded))[0].genes, axie.genes);
  const duplicate = p.traps.map((t) => ({ ...t }));
  duplicate[4].part = duplicate[0].part;
  assert.equal(validVaultTraps(duplicate, 2), false);
});
void test('new shared eight-trap defense replays cleanly and rejects altered genes and anchors', () => {
  const c = fixture as VerifiedCourse;
  assert.ok(verifyRoute(c.level, c.proof));
  const code = challengeCode(c),
    decoded = decodeChallenge(code);
  assert.equal(decoded.level.traps.length, 8);
  assert.equal(dungeonGuardians(decoded.level).length, 2);
  assert.ok(verifyRoute(decoded.level, decoded.proof));
  const wrongGenes = JSON.parse(atob(code));
  wrongGenes.g[1] = wrongGenes.g[0];
  assert.throws(() => decodeChallenge(btoa(JSON.stringify(wrongGenes))));
  const wrongAnchor = JSON.parse(atob(code));
  wrongAnchor.t[1].anchor = wrongAnchor.t[0].anchor;
  assert.throws(() => decodeChallenge(btoa(JSON.stringify(wrongAnchor))));
});
void test('migration keeps story, purchases and balance while revalidating legacy three-trap vaults', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  const old = {
    ...newProfile(),
    vaultVersion: undefined,
    guardianCount: undefined,
    companion: undefined,
    traps: PORTRAIT_SLOTS.map((t) => ({ ...t })),
    story: [100, 80],
    chispas: 321,
    owned: ['moss', 'amethyst'],
    theme: 'amethyst',
    proof: { rules: 'old', frames: 1, actions: [] },
  };
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) =>
          key === PROFILE_KEY ? JSON.stringify(old) : null,
      },
    });
    const p = readProfile();
    assert.equal(p.vaultVersion, 2);
    assert.equal(p.traps.length, 4);
    assert.equal(p.chispas, 321);
    assert.deepEqual(p.story, [100, 80]);
    assert.equal(p.theme, 'amethyst');
    assert.equal(p.proof, null);
    assert.equal(new Set(p.traps.map((t) => PARTS[t.part].slotId)).size, 4);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
