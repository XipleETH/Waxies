import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  decorationPositionsFor,
  validDecorationPositions,
  clampDecorationPosition,
} from '../lib/game/decoration-layout';
import {
  challengeCode,
  decodeChallenge,
  verifyRoute,
  type VerifiedCourse,
} from '../lib/game/route-proof';
import {
  newProfile,
  buyGood,
  readProfile,
  PROFILE_KEY,
  vaultLevel,
} from '../lib/game/mobile-profile';
const fixture = JSON.parse(
  readFileSync('tests/fixtures/free-vault.json', 'utf8'),
) as VerifiedCourse;
void test('moved decorations survive sharing and leave the certified route unchanged', () => {
  const level = {
    ...fixture.level,
    theme: 'amethyst',
    decoration: 'crystals',
    decorationPositions: [
      { x: 2.4, y: 18 },
      { x: 9.2, y: 12 },
    ],
  };
  const shared = decodeChallenge(
    challengeCode({ level, proof: fixture.proof }),
  );
  assert.deepEqual(shared.level.decorationPositions, level.decorationPositions);
  assert.equal(shared.level.theme, 'amethyst');
  assert.ok(verifyRoute(shared.level, shared.proof));
});
void test('untrusted decoration coordinates cannot escape the room or add unbounded objects', () => {
  for (const value of [
    null,
    [],
    [{ x: 2, y: 5 }],
    Array(100).fill({ x: 2, y: 5 }),
    [
      { x: Infinity, y: 5 },
      { x: 3, y: 5 },
    ],
    [
      { x: 2, y: 999 },
      { x: 3, y: 5 },
    ],
    [
      { x: -1, y: 5 },
      { x: 3, y: 5 },
    ],
  ]) {
    assert.equal(validDecorationPositions(value, fixture.level), false);
    const data = JSON.parse(atob(challengeCode(fixture)));
    data.d = value;
    assert.throws(() => decodeChallenge(btoa(JSON.stringify(data))), /adornos/);
  }
  const positions = [
    clampDecorationPosition(-10, -20, fixture.level),
    clampDecorationPosition(100, 100, fixture.level),
  ];
  assert.ok(validDecorationPositions(positions, fixture.level));
});
void test('old defenses get defaults and cosmetic purchases preserve balance and validation rules', () => {
  assert.equal(decorationPositionsFor(fixture.level).length, 2);
  assert.ok(
    verifyRoute(decodeChallenge(challengeCode(fixture)).level, fixture.proof),
  );
  const p = {
    ...newProfile(),
    traps: fixture.level.traps,
    proof: fixture.proof,
    chispas: 200,
  };
  const bought = buyGood(p, 'crystals');
  assert.equal(p.chispas, 200);
  assert.equal(p.decoration, 'none');
  assert.equal(bought.chispas, 140);
  assert.equal(buyGood(bought, 'crystals').chispas, 140);
  assert.ok(verifyRoute(vaultLevel(bought), bought.proof!));
});
void test('profile reload preserves positioned cosmetics and rejects corrupted coordinates', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const p = {
    ...newProfile(),
    traps: fixture.level.traps,
    proof: fixture.proof,
    owned: ['moss', 'crystals'],
    decoration: 'crystals',
    decorationPositions: [
      { x: 2, y: 7 },
      { x: 9, y: 15 },
    ],
  };
  let text = JSON.stringify(p);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => (key === PROFILE_KEY ? text : null) },
  });
  try {
    assert.deepEqual(readProfile().decorationPositions, p.decorationPositions);
    text = JSON.stringify({
      ...p,
      decorationPositions: [
        { x: -100, y: 7 },
        { x: 9, y: 15 },
      ],
    });
    assert.throws(readProfile, /adornos/);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
