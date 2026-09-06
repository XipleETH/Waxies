import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createState,
  step,
  requestJump,
  type Dungeon,
} from '../lib/game/physics';
import { raidContact } from '../lib/game/combat';
import { stepHazards } from '../lib/game/hazards';
import {
  PORTRAIT_BASE,
  PORTRAIT_SLOTS,
  MOBILE_RULES,
} from '../lib/game/portrait';
import {
  verifyRoute,
  challengeCode,
  decodeChallenge,
  type VerifiedCourse,
} from '../lib/game/route-proof';
import {
  newProfile,
  claimChispas,
  buyGood,
  equipGood,
  prize,
} from '../lib/game/mobile-profile';
import { PART_LIST } from '../lib/game/catalog';
import { raidPowerDescription } from '../lib/game/raid-powers';
import courses from '../lib/game/data/verified-courses.json';
const verified = courses as VerifiedCourse[];
const level = {
  ...PORTRAIT_BASE,
  traps: PORTRAIT_SLOTS.map((t) => ({ ...t })),
};
void test('every certified portrait course wins with full health under the live physics', () => {
  assert.ok(verified.length >= 8);
  for (const c of verified)
    assert.ok(verifyRoute(c.level, c.proof), c.level.name);
});
void test('one contact deducts 20 once, resets the full hazard cycle, and preserves the remaining prize', () => {
  const s = createState(level);
  s.phase = 'playing';
  s.x = 9;
  s.y = 10;
  s.hazards.projectiles.push({
    id: 1,
    owner: 0,
    part: 'carrot',
    x: 3,
    y: 4,
    vx: 1,
    vy: 0,
    life: 3,
  });
  raidContact(s, 'Carrot');
  raidContact(s, 'Carrot');
  assert.equal(s.hp, 80);
  assert.equal(s.hits, 1);
  assert.equal(s.phase, 'resetting');
  for (let f = 0; f < 78; f++) step(s, level);
  assert.equal(s.phase, 'playing');
  assert.equal(s.x, level.spawn.x);
  assert.equal(s.y, level.spawn.y);
  assert.equal(s.hp, 80);
  assert.equal(s.frame, 0);
  assert.deepEqual(s.hazards, createState(level).hazards);
  assert.equal(prize(s.hp), 80);
});
void test('five contacts exhaust health and a dead run cannot resume from a jump', () => {
  const s = createState(level);
  for (let i = 0; i < 5; i++) {
    s.phase = 'playing';
    raidContact(s, 'Carrot');
  }
  assert.equal(s.hp, 0);
  assert.equal(s.phase, 'dead');
  requestJump(s);
  step(s, level);
  assert.equal(s.phase, 'dead');
  assert.equal(prize(s.hp), 0);
});
void test('trap bodies remain lethal during idle, warning, active, recovery, and disabled stages', () => {
  for (const stage of [
    'idle',
    'warning',
    'active',
    'recover',
    'disabled',
  ] as const) {
    const s = createState(level);
    s.phase = 'playing';
    s.x = level.traps[0].x;
    s.y = level.traps[0].y;
    s.hazards.traps[0].stage = stage;
    stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hp, 80, stage);
    assert.equal(s.phase, 'resetting', stage);
  }
});
void test('poison projectile and pool contacts reset immediately without leaving post-hit poison', () => {
  for (const pool of [false, true]) {
    const s = createState(level);
    s.phase = 'playing';
    if (pool)
      s.hazards.pools.push({
        id: 1,
        owner: 2,
        part: 'grass-snake',
        x: s.x,
        y: s.y - 0.3,
        life: 1,
      });
    else
      s.hazards.projectiles.push({
        id: 1,
        owner: 2,
        part: 'grass-snake',
        x: s.x,
        y: s.y,
        vx: 0,
        vy: 0,
        life: 1,
      });
    stepHazards(s, level, 1 / 120, s.y, false);
    assert.equal(s.hp, 80);
    assert.equal(s.phase, 'resetting');
    assert.equal(s.poison, 0);
  }
});
void test('certificates reject missing jumps, incompatible rules, bad frames and altered geometry', () => {
  const c = verified[0];
  assert.equal(verifyRoute(c.level, { ...c.proof, actions: [] }), false);
  assert.equal(verifyRoute(c.level, { ...c.proof, rules: 'old' }), false);
  assert.equal(verifyRoute(c.level, { ...c.proof, frames: 9000 }), false);
  assert.equal(verifyRoute(c.level, { ...c.proof, actions: [0, 0] }), false);
  assert.equal(
    verifyRoute({ ...c.level, chest: { x: 2, y: 21 } }, c.proof),
    false,
  );
});
void test('a shared defense is reconstructed and replayed before it can be attacked', () => {
  const c = verified[0];
  const decoded = decodeChallenge(challengeCode(c));
  assert.ok(verifyRoute(decoded.level, decoded.proof));
  assert.deepEqual(decoded.level.traps, c.level.traps);
  assert.throws(() => decodeChallenge('x'.repeat(120001)));
  assert.throws(() =>
    decodeChallenge(
      btoa(
        JSON.stringify({
          v: 1,
          t: [
            { part: 'invented', x: 2 },
            { part: 'carrot', x: 2 },
            { part: 'carrot', x: 2 },
          ],
          p: c.proof,
        }),
      ),
    ),
  );
  assert.throws(() =>
    decodeChallenge(
      btoa(
        JSON.stringify({
          v: 1,
          t: c.level.traps,
          p: { rules: MOBILE_RULES, frames: 1, actions: [] },
        }),
      ),
    ),
  );
});
void test('Chispas rewards follow health, cannot be claimed twice, and never spend more than the balance', () => {
  const p = newProfile();
  assert.throws(() => buyGood(p, 'crystals'));
  assert.throws(() => claimChispas(p, 'a', 0));
  const won = claimChispas(p, 'a', 80);
  assert.equal(won.chispas, 80);
  assert.equal(won.wins, 1);
  assert.throws(() => claimChispas(won, 'a', 100));
  const bought = buyGood(won, 'crystals');
  assert.equal(bought.chispas, 20);
  assert.equal(bought.decoration, 'crystals');
  assert.equal(buyGood(bought, 'crystals').chispas, 20);
  assert.throws(() => equipGood(bought, 'amethyst'));
  assert.equal(p.chispas, 0);
});
void test('all 132 catalog parts have a movement-focused raid description', () => {
  assert.equal(PART_LIST.length, 132);
  for (const p of PART_LIST)
    assert.ok(raidPowerDescription(p.id).length > 40, p.id);
});
void test('every part can cycle in raid mode without damaging the player remotely or removing its body', () => {
  for (const part of PART_LIST) {
    const d: Dungeon = {
      ...PORTRAIT_BASE,
      traps: [{ ...PORTRAIT_SLOTS[0], part: part.id }],
    };
    const s = createState(d);
    s.phase = 'playing';
    for (let i = 0; i < 1200; i++) stepHazards(s, d, 1 / 120, s.y, false);
    assert.equal(s.hp, 100, part.id);
    assert.equal(s.hazards.traps.length, 1, part.id);
  }
});
