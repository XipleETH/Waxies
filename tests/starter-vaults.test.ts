import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_VAULTS, starterVault } from '../lib/game/starter-vaults';
import { validFreeTraps } from '../lib/game/free-vault';
import {
  verifyRoute,
  challengeCode,
  decodeChallenge,
} from '../lib/game/route-proof';
import { newProfile, vaultLevel } from '../lib/game/mobile-profile';
import { dungeonGuardians } from '../lib/game/guardians';
import { createLeaguePlayer } from '../lib/online/starter';
import { emptyOnlineState } from '../lib/online/types';
import { applyOnline } from '../lib/online/rules';
test('all starter vaults have four compatible parts and valid shareable clean proofs', () => {
  assert.equal(STARTER_VAULTS.length, 100);
  assert.equal(
    new Set(
      STARTER_VAULTS.map((c) => c.level.traps.map((t) => t.part).join('|')),
    ).size,
    100,
  );
  for (const c of STARTER_VAULTS) {
    assert.equal(c.level.traps.length, 4);
    assert.ok(validFreeTraps(c.level.traps));
    assert.equal(dungeonGuardians(c.level).length, 1);
    assert.ok(verifyRoute(c.level, c.proof), c.level.id);
    assert.ok(verifyRoute(decodeChallenge(challengeCode(c)).level, c.proof));
  }
});
test('new profiles start certified without granting local currency', () => {
  for (let i = 0; i < 16; i++) {
    const p = newProfile();
    assert.ok(p.starterId);
    assert.equal(p.chispas, 0);
    assert.ok(p.proof);
    assert.ok(verifyRoute(vaultLevel(p), p.proof!));
  }
});
test('registration deposits exactly 100 once and preserves account state on retries', () => {
  const s = emptyOnlineState(),
    p = createLeaguePlayer(s, 'a', 'hash', 'Player', 1, 'starter-03');
  assert.equal(p.available, 0);
  assert.equal(p.chest, 100);
  assert.equal(p.active, true);
  assert.equal(p.defense!.level.id, 'starter-03');
  p.chest = 40;
  p.active = false;
  assert.equal(
    createLeaguePlayer(s, 'a', 'other', 'Changed', 2, 'starter-02'),
    p,
  );
  assert.equal(p.chest, 40);
  assert.equal(p.available, 0);
  assert.equal(p.name, 'Player');
});
test('two new accounts can immediately match at equal stakes', () => {
  const s = emptyOnlineState();
  createLeaguePlayer(s, 'a', 'a', 'Alice', 1);
  createLeaguePlayer(s, 'b', 'b', 'Bob', 1);
  applyOnline(s, 'a', { action: 'match' }, 2, () => 'abcdef01');
  assert.equal(s.matches['abcdef01'].defender, 'b');
  assert.equal(s.matches['abcdef01'].limit, 100);
});
test('unknown starter ids cannot inject a defense and returned copies are isolated', () => {
  const a = starterVault('untrusted', () => 0);
  a.level.traps = [];
  assert.equal(starterVault('starter-01').level.traps.length, 4);
  const s = emptyOnlineState(),
    p = createLeaguePlayer(s, 'a', 'a', 'Alice', 1, 'untrusted');
  assert.ok(verifyRoute(p.defense!.level, p.defense!.proof));
});
