import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haptic,
  testHaptics,
  setHapticsEnabled,
  stopHaptics,
  createGameplayHaptics,
} from '../lib/game/haptics';

void test('haptics diagnose Android rejection, retry without cooldown and preserve gameplay priorities', () => {
  const previous = new Map(
    ['navigator', 'document', 'window', 'localStorage'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const pulses: unknown[] = [];
  let accepted = false;
  const navigatorMock = {
    vibrate: (pattern: unknown) => {
      pulses.push(pattern);
      return accepted;
    },
    getGamepads: () => [],
  };
  const documentMock = { hidden: false };
  const storage = new Map<string, string>();
  Object.defineProperties(globalThis, {
    navigator: { configurable: true, value: navigatorMock },
    document: { configurable: true, value: documentMock },
    window: { configurable: true, value: new EventTarget() },
    localStorage: {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  try {
    setHapticsEnabled(true);
    assert.equal(haptic('hit'), 'blocked');
    accepted = true;
    assert.equal(haptic('jump'), 'requested');
    assert.equal(haptic('select'), 'suppressed');
    assert.equal(haptic('hit'), 'requested');
    setHapticsEnabled(false);
    assert.equal(haptic('win'), 'disabled');
    assert.equal(testHaptics(), 'requested');
    assert.deepEqual(pulses.at(-1), [180, 100, 180]);
    documentMock.hidden = true;
    assert.equal(testHaptics(), 'blocked');
    documentMock.hidden = false;
    stopHaptics();
    const report = createGameplayHaptics();
    report({ phase: 'playing', hits: 0, jumps: 0 }, true);
    report({ phase: 'playing', hits: 0, jumps: 1 }, true);
    assert.deepEqual(pulses.at(-1), [30]);
    report({ phase: 'playing', hits: 1, jumps: 1 }, true);
    assert.deepEqual(pulses.at(-1), [95]);
    report({ phase: 'won', hits: 1, jumps: 1 }, true);
    assert.deepEqual(pulses.at(-1), [45, 55, 90]);
    stopHaptics();
    Object.defineProperty(navigatorMock, 'vibrate', {
      value: undefined,
      configurable: true,
    });
    assert.equal(testHaptics(), 'unsupported');
  } finally {
    stopHaptics();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
