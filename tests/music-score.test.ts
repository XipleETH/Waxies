import assert from 'node:assert/strict';
import test from 'node:test';
import { musicStep, musicTempo } from '../lib/game/music-score';
void test('both arrangements loop with bounded voices, percussion, bass and evolving sections', () => {
  for (const scene of ['lobby', 'dungeon'] as const) {
    const steps = Array.from({ length: 256 }, (_, i) => musicStep(scene, i));
    const voices = new Set(steps.flat().map((n) => n.voice));
    for (const voice of ['kick', 'snare', 'hat', 'bass', 'pad', 'lead'])
      assert.ok(voices.has(voice as never));
    for (const events of steps) {
      assert.ok(events.length <= 8);
      for (const event of events) {
        assert.ok(event.duration > 0 && event.duration <= 2);
        assert.ok(event.volume > 0 && event.volume <= 0.7);
        assert.ok(Number.isFinite(event.midi));
      }
    }
    assert.deepEqual(musicStep(scene, 256), steps[0]);
    assert.notDeepEqual(steps.slice(0, 64), steps.slice(128, 192));
  }
  assert.ok(musicTempo('dungeon') > musicTempo('lobby'));
  assert.notDeepEqual(musicStep('lobby', 4), musicStep('dungeon', 4));
});
