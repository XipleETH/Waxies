import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mountGameAudio,
  unlockAudio,
  playSound,
  setAudioSettings,
  setLobbyMusic,
} from '../lib/game/audio';

void test('audio uses one context, separates channels, suspends in background and releases resources', async () => {
  const keys = ['window', 'document', 'localStorage'];
  const originals = keys.map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  const storage = new Map<string, string>();
  let contexts = 0,
    notes = 0,
    closed = false;
  const gains: {
    gain: {
      value: number;
      setTargetAtTime: (value: number) => void;
      setValueAtTime: () => void;
      linearRampToValueAtTime: () => void;
      exponentialRampToValueAtTime: () => void;
    };
    connect: () => void;
    disconnect: () => void;
  }[] = [];
  const parameter = () => ({
    value: 0,
    setTargetAtTime(value: number) {
      this.value = value;
    },
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  class Context {
    currentTime = 0;
    state = 'running';
    destination = {};
    constructor() {
      contexts++;
    }
    createGain() {
      const node = { gain: parameter(), connect() {}, disconnect() {} };
      gains.push(node);
      return node;
    }
    createOscillator() {
      return {
        frequency: parameter(),
        connect() {},
        disconnect() {},
        start() {
          notes++;
        },
        stop() {},
        onended: null,
      };
    }
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    async close() {
      closed = true;
    }
  }
  const win = Object.assign(new EventTarget(), { AudioContext: Context });
  const doc = Object.assign(new EventTarget(), { hidden: false });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: win },
    document: { configurable: true, value: doc },
    localStorage: {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  const cleanup = mountGameAudio();
  try {
    assert.equal(contexts, 0);
    unlockAudio();
    unlockAudio();
    assert.equal(contexts, 1);
    setLobbyMusic(false);
    assert.equal(gains[0].gain.value, 0);
    const before = notes;
    playSound('hit');
    assert.ok(notes > before);
    setAudioSettings({ effects: 0 });
    const muted = notes;
    playSound('win');
    assert.equal(notes, muted);
    setAudioSettings({ music: 0.5, effects: 0.5 });
    setLobbyMusic(true);
    assert.ok(gains[0].gain.value > 0);
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    playSound('match');
    assert.equal(notes, muted);
    assert.ok(storage.has('waxies.audio.v1'));
  } finally {
    cleanup();
    assert.equal(closed, true);
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
