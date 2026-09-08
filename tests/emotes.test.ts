import assert from 'node:assert/strict';
import test from 'node:test';
import { EMOTES, validEmotes, visibleEmote } from '../lib/game/emotes';
import { RaidPlayback } from '../lib/game/raid-playback';
import { verifyRaidReplay, type RaidReplay } from '../lib/game/raid-replay';
import { createState, step, type Dungeon } from '../lib/game/physics';
import fixture from './fixtures/free-vault.json';
import { readFileSync } from 'node:fs';
const level = fixture.level as Dungeon;
const win: RaidReplay = { attempts: [{ ...fixture.proof, end: 'won' }] };
void test('20 distinct authentic Axie GIFs are present with GIF89a signatures', () => {
  assert.equal(EMOTES.length, 20);
  assert.equal(new Set(EMOTES.map((e) => e.genes)).size, 20);
  for (const e of EMOTES) {
    assert.match(e.genes, /^0x[0-9a-f]{128}$/i);
    assert.equal(e.testParts.length, 6);
    assert.equal(
      readFileSync('public' + e.src.split('?')[0])
        .subarray(0, 6)
        .toString(),
      'GIF89a',
    );
  }
});
void test('emotes are cosmetic, bounded and tied to the recorded attempts', () => {
  const e = { id: EMOTES[0].id, attempt: 0, frame: 0 };
  assert.equal(verifyRaidReplay(level, { ...win, emotes: [e] }), 100);
  assert.equal(
    verifyRaidReplay(level, {
      ...win,
      emotes: [{ ...e, frame: win.attempts[0].frames }],
    }),
    100,
  );
  for (const bad of [
    { ...e, id: 'unknown' },
    { ...e, frame: -1 },
    { ...e, attempt: 1 },
    { ...e, frame: win.attempts[0].frames + 1 },
  ])
    assert.equal(verifyRaidReplay(level, { ...win, emotes: [bad] }), null);
  assert.equal(
    validEmotes([e, { ...e, frame: 359 }], [{ frames: 600 }]),
    false,
  );
  assert.equal(validEmotes([e, { ...e, frame: 360 }], [{ frames: 600 }]), true);
  assert.equal(
    validEmotes(
      [e, { ...e, attempt: 1, frame: 160 }],
      [{ frames: 200 }, { frames: 500 }],
    ),
    true,
  );
  assert.equal(
    validEmotes(
      [e, { ...e, attempt: 1, frame: 159 }],
      [{ frames: 200 }, { frames: 500 }],
    ),
    false,
  );
  assert.equal(
    validEmotes(
      Array.from({ length: 31 }, (_, i) => ({ ...e, frame: i * 360 })),
      [{ frames: 20000 }],
    ),
    false,
  );
  assert.equal(
    verifyRaidReplay(level, {
      ...win,
      runnerGenes: 'https://example.com/model',
    }),
    null,
  );
});
void test('spectator replays every input and pauses without consuming frames or emotes', () => {
  const replay: RaidReplay = {
    attempts: [
      { rules: fixture.proof.rules, actions: [], frames: 10, end: 'restart' },
      ...win.attempts,
    ],
    emotes: [
      { id: 'axie-01', attempt: 0, frame: 3 },
      { id: 'axie-02', attempt: 1, frame: 360 },
    ],
  };
  assert.equal(verifyRaidReplay(level, replay), 100);
  const playback = new RaidPlayback(level, replay);
  let state = playback.initial();
  for (let i = 0; i < 5; i++) state = playback.tick(state);
  assert.equal(
    visibleEmote(replay.emotes!, replay.attempts, 0, state.frame)?.id,
    'axie-01',
  );
  playback.paused = true;
  const before = structuredClone(state);
  for (let i = 0; i < 400; i++) state = playback.tick(state);
  assert.deepEqual(state, before);
  playback.paused = false;
  let ticks = 0;
  while (!playback.complete && ticks++ < 20000) state = playback.tick(state);
  assert.equal(playback.attempt, 1);
  assert.equal(state.phase, 'won');
  assert.equal(state.hp, 100);
  assert.equal(state.frame, fixture.proof.frames);
  assert.equal(
    visibleEmote(replay.emotes!, replay.attempts, 1, 360)?.id,
    'axie-02',
  );
  assert.equal(visibleEmote(replay.emotes!, replay.attempts, 1, 600), null);
});
void test('spectator preserves health across all five failed attempts', () => {
  const l: Dungeon = {
    ...level,
    spawn: { x: 2.2, y: 1.38 },
    traps: [
      { part: 'serious', anchor: 0, x: 3.5, y: 1.8, phase: 0, patrol: 0 },
    ],
  };
  const s = createState(l);
  s.phase = 'playing';
  while (!s.hits && s.frame < 1000) step(s, l);
  const replay: RaidReplay = {
    attempts: Array.from({ length: 5 }, () => ({
      rules: fixture.proof.rules,
      frames: s.frame,
      actions: [],
      end: 'hit',
    })),
  };
  const p = new RaidPlayback(l, replay);
  let state = p.initial(),
    ticks = 0;
  while (!p.complete && ticks++ < 10000) state = p.tick(state);
  assert.equal(state.hp, 0);
  assert.equal(state.hits, 5);
  assert.equal(state.phase, 'dead');
  assert.equal(p.attempt, 4);
  assert.equal(verifyRaidReplay(l, replay), 0);
});

void test('recorded appearances preserve unprefixed and unpadded imported genes', async () => {
  const { canonicalRunnerGenes } = await import('../lib/game/raid-replay');
  const source = EMOTES.find((e) => e.genes.startsWith('0x0'))!.genes;
  assert.equal(
    canonicalRunnerGenes(source.slice(2).replace(/^0+/, '')),
    source,
  );
  assert.equal(canonicalRunnerGenes(source.toUpperCase()), source);
  assert.equal(canonicalRunnerGenes(undefined), undefined);
  assert.equal(canonicalRunnerGenes('https://bad'), undefined);
  assert.equal(
    verifyRaidReplay(level, {
      ...win,
      runnerGenes: canonicalRunnerGenes(source.slice(2)),
    }),
    100,
  );
});
