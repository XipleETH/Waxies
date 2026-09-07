import storyCourses from '../lib/game/data/story-courses.json';
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOnline, settle, onlineView } from '../lib/online/rules';
import {
  emptyOnlineState,
  REVENGE_MS,
  MATCH_MS,
  type OnlineCommand,
} from '../lib/online/types';
import {
  challengeCode,
  decodeChallenge,
  type VerifiedCourse,
} from '../lib/game/route-proof';
import { verifyRaidReplay, type RaidReplay } from '../lib/game/raid-replay';
import { validFreeTraps, snapTrap } from '../lib/game/free-vault';
import { createState, step, type Dungeon } from '../lib/game/physics';
import { stepHazards } from '../lib/game/hazards';
import fixture from './fixtures/free-vault.json';
const course = fixture as VerifiedCourse,
  code = challengeCode(course),
  win: RaidReplay = { attempts: [{ ...course.proof, end: 'won' }] };
function setup() {
  const s = emptyOnlineState();
  for (const id of ['a', 'b', 'c'])
    s.players[id] = {
      id,
      name: id,
      secretHash: id,
      available: 200,
      chest: 0,
      active: false,
      created: 0,
      rewards: {},
    };
  let n = 0;
  const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  const act = (id: string, c: OnlineCommand, now = 1000) =>
    applyOnline(s, id, c, now, uid);
  return { s, act };
}
function total(s: ReturnType<typeof emptyOnlineState>) {
  return (
    Object.values(s.players).reduce((n, p) => n + p.available + p.chest, 0) +
    Object.values(s.loot)
      .filter((l) => l.status === 'held')
      .reduce((n, l) => n + l.amount, 0)
  );
}
void test('free trap placement snaps to platforms and rejects overlaps, entry camping and excessive reach', () => {
  assert.ok(validFreeTraps(course.level.traps));
  assert.equal(snapTrap(6, 11.9).y, 11.85);
  assert.equal(
    validFreeTraps(
      course.level.traps.map((t, i) => (i ? t : { ...t, x: 2.2, y: 1.8 })),
    ),
    false,
  );
  assert.equal(
    validFreeTraps(
      course.level.traps.map((t, i) => (i ? t : { ...t, reach: 999 })),
    ),
    false,
  );
  const shared = decodeChallenge(code);
  assert.deepEqual(shared.level.traps, course.level.traps);
  assert.equal(shared.level.freePlacement, true);
  const data = JSON.parse(atob(code));
  data.t[0].y = 10;
  assert.throws(() => decodeChallenge(btoa(JSON.stringify(data))));
});
void test('recorded inputs determine online health; fabricated wins and malformed traces fail', () => {
  assert.equal(verifyRaidReplay(course.level, win), 100);
  assert.equal(
    verifyRaidReplay(course.level, {
      attempts: [{ ...course.proof, frames: 1, actions: [], end: 'won' }],
    }),
    null,
  );
  assert.equal(
    verifyRaidReplay(course.level, {
      attempts: [{ ...course.proof, actions: [0, 0], end: 'won' }],
    }),
    null,
  );
  const l: Dungeon = {
    ...course.level,
    spawn: { x: 2.2, y: 1.38 },
    traps: [
      { part: 'serious', anchor: 0, x: 3.5, y: 1.8, phase: 0, patrol: 0 },
    ],
  };
  const s = createState(l);
  s.phase = 'playing';
  while (!s.hits && s.frame < 1000) step(s, l);
  assert.equal(s.hits, 1);
  const attempt = {
    rules: course.proof.rules,
    frames: s.frame,
    actions: [],
    end: 'hit' as const,
  };
  assert.equal(
    verifyRaidReplay(l, { attempts: Array.from({ length: 5 }, () => attempt) }),
    0,
  );
});
void test('configurable dash distance changes movement and keeps the body visible through recovery', () => {
  const travel = (reach: number) => {
    const l: Dungeon = {
        ...course.level,
        platforms: [],
        traps: [{ part: 'lagging', x: 2, y: 3, phase: 0, patrol: 0, reach }],
      },
      s = createState(l);
    s.phase = 'playing';
    s.x = 10;
    s.y = 10;
    const t = s.hazards.traps[0];
    t.stage = 'active';
    t.facing = 1;
    t.timer = 1;
    let max = 2;
    for (let i = 0; i < 100; i++) {
      stepHazards(s, l, 1 / 120, s.y, false);
      max = Math.max(max, t.x);
      assert.notEqual(t.stage, 'disabled');
    }
    return max - 2;
  };
  assert.ok(travel(1) <= 1.001);
  assert.ok(travel(4) > 3.8);
});
void test('activation and matching require verified defense and funds; ±10% boundaries are enforced', () => {
  const { s, act } = setup();
  assert.throws(() => act('a', { action: 'match' }));
  assert.throws(() => act('a', { action: 'activate', amount: 201, code }));
  act('a', { action: 'activate', amount: 100, code });
  act('b', { action: 'activate', amount: 111, code });
  assert.throws(() => act('a', { action: 'match' }));
  act('b', { action: 'activate', amount: 110, code });
  act('a', { action: 'match' });
  const m = Object.values(s.matches)[0];
  assert.equal(m.defender, 'b');
  assert.equal(m.limit, 110);
  assert.equal(total(s), 600);
  assert.throws(() => act('b', { action: 'withdraw' }));
  assert.throws(() => act('a', { action: 'match' }));
});
void test('winning transfers into escrow once; early withdrawal and duplicate results cannot spend it', () => {
  const { s, act } = setup();
  for (const id of ['a', 'b'])
    act(id, { action: 'activate', amount: 100, code });
  act('a', { action: 'match' });
  const m = Object.values(s.matches)[0];
  assert.throws(() =>
    act('b', { action: 'finish', matchId: m.id, replay: win }),
  );
  act('a', { action: 'finish', matchId: m.id, replay: win }, 30000);
  assert.equal(s.players.b.chest, 0);
  assert.equal(s.players.b.active, false);
  assert.equal(s.players.a.available, 100);
  assert.equal(onlineView(s, 'a', 30000).player?.held, 100);
  act('a', { action: 'finish', matchId: m.id, replay: win }, 30001);
  assert.equal(total(s), 600);
  assert.equal(Object.keys(s.loot).length, 1);
  act('a', { action: 'withdraw' }, 30002);
  assert.equal(s.players.a.available, 200);
  assert.equal(onlineView(s, 'a', 30002).player?.held, 100);
  settle(s, 30000 + REVENGE_MS);
  assert.equal(s.players.a.available, 300);
  settle(s, 30000 + REVENGE_MS + 1);
  assert.equal(total(s), 600);
});
void test('one revenge works with an empty chest against the frozen attacker defense', () => {
  const { s, act } = setup();
  for (const id of ['a', 'b'])
    act(id, { action: 'activate', amount: 100, code });
  act('a', { action: 'match' });
  const first = Object.values(s.matches)[0];
  act('a', { action: 'finish', matchId: first.id, replay: win }, 30000);
  const loot = Object.values(s.loot)[0];
  act('a', { action: 'withdraw' }, 31000);
  act('b', { action: 'revenge', lootId: loot.id }, 32000);
  const revenge = Object.values(s.matches)[1];
  assert.equal(s.players.b.chest, 0);
  assert.deepEqual(revenge.level, first.counterLevel);
  act('b', { action: 'finish', matchId: revenge.id, replay: win }, 62000);
  assert.equal(s.players.b.available, 200);
  assert.equal(loot.status, 'recovered');
  assert.equal(total(s), 600);
  assert.throws(() => act('b', { action: 'revenge', lootId: loot.id }, 63000));
});
void test('abandoned revenge releases the held loot; timeout unlocks normal cofres without transferring', () => {
  const { s, act } = setup();
  for (const id of ['a', 'b'])
    act(id, { action: 'activate', amount: 100, code });
  act('a', { action: 'match' });
  settle(s, 1000 + MATCH_MS);
  assert.equal(s.players.a.lock, undefined);
  assert.equal(s.players.b.chest, 100);
  act('a', { action: 'match' }, MATCH_MS + 2000);
  const raid = Object.values(s.matches)[1];
  act(
    'a',
    { action: 'finish', matchId: raid.id, replay: win },
    MATCH_MS + 32000,
  );
  const loot = Object.values(s.loot)[0];
  act('b', { action: 'revenge', lootId: loot.id }, MATCH_MS + 33000);
  const revenge = Object.values(s.matches)[2];
  act('b', { action: 'abandon', matchId: revenge.id }, MATCH_MS + 34000);
  assert.equal(loot.status, 'released');
  assert.equal(s.players.a.available, 200);
  assert.equal(total(s), 600);
});
void test('a revenge begun before the deadline reserves escrow until its match resolves', () => {
  const { s, act } = setup();
  for (const id of ['a', 'b'])
    act(id, { action: 'activate', amount: 100, code });
  act('a', { action: 'match' });
  act(
    'a',
    { action: 'finish', matchId: Object.keys(s.matches)[0], replay: win },
    30000,
  );
  const loot = Object.values(s.loot)[0];
  act('b', { action: 'revenge', lootId: loot.id }, loot.releaseAt - 1000);
  settle(s, loot.releaseAt + 1);
  assert.equal(loot.status, 'held');
  settle(s, loot.releaseAt + MATCH_MS);
  assert.equal(loot.status, 'released');
  assert.equal(total(s), 600);
});

void test('server rewards only verified improvements and rejects forged reward categories', () => {
  const { s, act } = setup();
  const c = storyCourses[0];
  const command: OnlineCommand = {
    action: 'reward',
    kind: 'story',
    course: c.level.id,
    replay: { attempts: [{ ...c.proof, end: 'won' }] },
  };
  act('a', command);
  assert.equal(s.players.a.available, 300);
  act('a', command);
  assert.equal(s.players.a.available, 300);
  assert.throws(() =>
    act('a', { ...command, kind: 'fake' } as unknown as OnlineCommand),
  );
  assert.equal(s.players.a.available, 300);
});

void test('completed attacks retain validated emotes and only participants can watch', async () => {
  const { matchReplayView } = await import('../lib/online/rules');
  const { s, act } = setup();
  act('a', { action: 'activate', code, amount: 50 });
  act('b', { action: 'activate', code, amount: 50 });
  act('a', { action: 'match' });
  const id = s.players.a.lock!;
  const replay: RaidReplay = {
    ...win,
    emotes: [{ id: 'axie-01', attempt: 0, frame: 0 }],
  };
  act('a', { action: 'finish', matchId: id, replay });
  const before = JSON.stringify(s);
  assert.deepEqual(matchReplayView(s, 'b', id)?.replay, replay);
  assert.ok(matchReplayView(s, 'a', id));
  assert.equal(matchReplayView(s, 'c', id), null);
  assert.equal(matchReplayView(s, 'b', 'missing'), null);
  assert.equal(JSON.stringify(s), before);
  assert.equal(onlineView(s, 'b', 1000).history?.[0].hasReplay, true);
  assert.equal('replay' in onlineView(s, 'b', 1000).history![0], false);
  assert.equal(total(s), 600);
});

void test('replay retention removes only old recordings, never results or balances', () => {
  const { s, act } = setup();
  act('a', { action: 'activate', code, amount: 50 });
  act('b', { action: 'activate', code, amount: 50 });
  act('a', { action: 'match' });
  const id = s.players.a.lock!,
    match = s.matches[id];
  for (let i = 0; i < 201; i++)
    s.matches['old-' + i] = {
      ...structuredClone(match),
      id: 'old-' + i,
      created: i - 1000,
      status: 'lost',
      amount: 0,
      replay: structuredClone(win),
    };
  act('a', { action: 'finish', matchId: id, replay: win });
  assert.equal(Object.keys(s.matches).length, 202);
  assert.equal(Object.values(s.matches).filter((m) => m.replay).length, 200);
  assert.equal(s.matches['old-0'].status, 'lost');
  assert.equal(s.matches['old-0'].replay, undefined);
  assert.ok(s.matches[id].replay);
  assert.equal(total(s), 600);
});
