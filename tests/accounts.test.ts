import test from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import { emptyOnlineState } from '../lib/online/types';
import { createLeaguePlayer } from '../lib/online/starter';
import { loginMessage, finishLogin } from '../lib/online/account';
import { saveCloudProfile } from '../lib/online/cloud-profile';
import { newProfile } from '../lib/game/mobile-profile';
const address = '0x1234567890123456789012345678901234567890';
function challenge(s: ReturnType<typeof emptyOnlineState>, id?: string) {
  s.loginChallenges = {
    nonce: { address, message: 'message', expires: 1000, playerId: id },
  };
}
test('signed login binds domain, chain and nonce; signatures cannot be reused with another message', async () => {
  const account = privateKeyToAccount(
    ('0x' + '11'.repeat(32)) as `0x${string}`,
  );
  const message = loginMessage(
    'https://game.example',
    account.address,
    '0123456789abcdef',
    1,
  );
  assert.match(message, /game.example wants/);
  assert.match(message, /Chain ID: 2020/);
  const signature = await account.signMessage({ message });
  assert.ok(
    await verifyMessage({ address: account.address, message, signature }),
  );
  assert.equal(await verifyMessage({ address, message, signature }), false);
  assert.equal(
    await verifyMessage({
      address: account.address,
      message: message + 'x',
      signature,
    }),
    false,
  );
});
test('linking preserves guest funds and progress and consumes the challenge exactly once', () => {
  const s = emptyOnlineState();
  const p = createLeaguePlayer(s, 'guest', 'old', 'Rider', 1);
  p.available = 17;
  p.chest = 73;
  challenge(s, 'guest');
  const linked = finishLogin(
    s,
    'nonce',
    'message',
    'guest',
    'new-session',
    'unused',
    2,
  );
  assert.equal(linked.id, 'guest');
  assert.equal(linked.available, 17);
  assert.equal(linked.chest, 73);
  assert.equal(linked.secretHash, '');
  assert.equal(linked.wallet, address);
  assert.throws(() =>
    finishLogin(s, 'nonce', 'message', 'guest', 'another', 'unused', 3),
  );
});
test('wallet recovery reuses the same account without importing another guest balance', () => {
  const s = emptyOnlineState();
  challenge(s);
  const p = finishLogin(
    s,
    'nonce',
    'message',
    undefined,
    'session',
    'wallet-user',
    2,
  );
  p.chest = 29;
  createLeaguePlayer(s, 'guest', 'old', 'Other', 3);
  challenge(s, 'guest');
  const recovered = finishLogin(
    s,
    'nonce',
    'message',
    'guest',
    'second',
    'unused',
    4,
  );
  assert.equal(recovered.id, 'wallet-user');
  assert.equal(recovered.chest, 29);
  assert.equal(s.players.guest.chest, 100);
  assert.equal(Object.keys(s.players).length, 2);
  assert.equal(recovered.sessions?.length, 2);
});
test('expired, mismatched and session-swapped challenges cannot link an account', () => {
  const s = emptyOnlineState();
  challenge(s, 'guest');
  assert.throws(() =>
    finishLogin(s, 'nonce', 'message', 'guest', 's', 'id', 1000),
  );
  assert.throws(() => finishLogin(s, 'nonce', 'wrong', 'guest', 's', 'id', 2));
  assert.throws(() =>
    finishLogin(s, 'nonce', 'message', 'other', 's', 'id', 2),
  );
  assert.equal(Object.keys(s.players).length, 0);
});
test('cloud progress survives restore, rejects stale writes and never credits competitive funds', () => {
  const s = emptyOnlineState();
  const p = createLeaguePlayer(s, 'a', 'hash', 'Rider', 1);
  const local = newProfile();
  local.story = [100, 80];
  local.chispas = 180;
  assert.throws(() => saveCloudProfile(p, 0, local, 2));
  p.wallet = address;
  assert.equal(saveCloudProfile(p, 0, local, 2), true);
  const restored = structuredClone(p.cloud!.profile);
  assert.deepEqual(restored.story, [100, 80]);
  assert.equal(restored.chispas, 180);
  assert.equal(p.available, 0);
  assert.equal(p.chest, 100);
  assert.equal(saveCloudProfile(p, 0, { ...local, chispas: 999 }, 3), false);
  assert.equal(p.cloud!.profile.chispas, 180);
  assert.throws(() => saveCloudProfile(p, 1, { ...local, chispas: -1 }, 3));
  assert.equal(p.cloud!.revision, 1);
});
