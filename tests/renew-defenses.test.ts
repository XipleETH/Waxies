import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyOnlineState } from '../lib/online/types';
import { createLeaguePlayer } from '../lib/online/starter';
import { renewDefenses } from '../lib/online/renew-defenses';
void test('renewal changes only defenses and template ids, preserving all account and ledger data', () => {
  const state = emptyOnlineState();
  for (let i = 0; i < 13; i++) {
    const p = createLeaguePlayer(
      state,
      String(i),
      'secret',
      'Player',
      1,
      'starter-01',
    );
    p.chest = i * 7;
    p.available = i * 3;
    p.active = i % 2 === 0;
    p.rewards = { story: 80 };
  }
  const before = structuredClone(state);
  const after = renewDefenses(state);
  assert.deepEqual(state, before);
  assert.equal(
    new Set(Object.values(after.players).map((p) => p.starterId)).size,
    13,
  );
  for (const id of Object.keys(state.players)) {
    const { defense: _a, starterId: _b, ...original } = state.players[id];
    const { defense: _c, starterId: _d, ...updated } = after.players[id];
    assert.deepEqual(updated, original);
  }
  assert.deepEqual(after.matches, state.matches);
  assert.deepEqual(after.loot, state.loot);
});
void test('renewal refuses to replace locked defenses', () => {
  const state = emptyOnlineState();
  createLeaguePlayer(state, 'a', 'secret', 'Player', 1).lock = 'match';
  assert.throws(() => renewDefenses(state), /pendientes/);
});
