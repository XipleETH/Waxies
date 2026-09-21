import {
  musicStep,
  musicTempo,
  type MusicScene,
  type MusicNote,
} from './music-score';
export type SoundEvent =
  | 'select'
  | 'jump'
  | 'hit'
  | 'win'
  | 'validated'
  | 'search'
  | 'match'
  | 'error';
export type AudioSettings = { music: number; effects: number };
const defaults: AudioSettings = { music: 0.35, effects: 0.65 };
const key = 'waxies.audio.v1';
let settings = defaults;
let context: AudioContext | undefined;
let musicBus: GainNode, effectsBus: GainNode;
let timer: ReturnType<typeof setInterval> | undefined;
let scene: MusicScene = 'lobby';
let noise: AudioBuffer | undefined;
const musicVoices = new Set<{
  source: AudioScheduledSourceNode;
  envelope: GainNode;
}>();
let beat = 0,
  nextNote = 0;
const lastSound = new Map<SoundEvent, number>();
export function audioSettings() {
  return settings;
}
export function subscribeAudio(listener: () => void) {
  window.addEventListener('waxies-audio', listener);
  return () => window.removeEventListener('waxies-audio', listener);
}
export function setAudioSettings(next: Partial<AudioSettings>) {
  const clamp = (n: number) =>
    Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
  settings = {
    music: clamp(next.music ?? settings.music),
    effects: clamp(next.effects ?? settings.effects),
  };
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {}
  updateVolume();
  window.dispatchEvent(new Event('waxies-audio'));
}
function updateVolume() {
  if (!context) return;
  musicBus.gain.setTargetAtTime(
    settings.music * 0.35,
    context.currentTime,
    0.18,
  );
  effectsBus.gain.setTargetAtTime(
    settings.effects * 0.5,
    context.currentTime,
    0.015,
  );
}
function note(
  midi: number,
  at: number,
  duration: number,
  volume: number,
  bus: GainNode,
  type: OscillatorType = 'sine',
  endMidi = midi,
) {
  if (!context) return;
  const oscillator = context.createOscillator(),
    envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), at);
  oscillator.frequency.exponentialRampToValueAtTime(
    440 * 2 ** ((endMidi - 69) / 12),
    at + duration,
  );
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(
    volume,
    at + Math.min(0.018, duration / 4),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(envelope);
  envelope.connect(bus);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.03);
  oscillator.onended = () => {
    oscillator.disconnect();
    envelope.disconnect();
  };
}
function instrument(event: MusicNote, at: number) {
  if (!context) return;
  const envelope = context.createGain(),
    filter = context.createBiquadFilter();
  const percussion = event.voice === 'hat' || event.voice === 'snare';
  let source: AudioScheduledSourceNode;
  if (percussion) {
    if (!noise) {
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noise.getChannelData(0);
      let seed = 7331;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = seed / 2147483648 - 1;
      }
    }
    const buffer = context.createBufferSource();
    buffer.buffer = noise;
    source = buffer;
    filter.type = event.voice === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.value = event.voice === 'hat' ? 6500 : 1800;
    filter.Q.value = 0.7;
  } else {
    const oscillator = context.createOscillator();
    source = oscillator;
    oscillator.type =
      event.voice === 'kick'
        ? 'sine'
        : event.voice === 'pad'
          ? 'triangle'
          : 'sawtooth';
    const frequency = 440 * 2 ** ((event.midi - 69) / 12);
    oscillator.frequency.setValueAtTime(
      event.voice === 'kick' ? 145 : frequency,
      at,
    );
    if (event.voice === 'kick')
      oscillator.frequency.exponentialRampToValueAtTime(43, at + 0.12);
    filter.type = 'lowpass';
    filter.Q.value = event.voice === 'bass' ? 3 : 0.7;
    filter.frequency.setValueAtTime(event.cutoff ?? 900, at);
    if (event.voice === 'bass' || event.voice === 'lead')
      filter.frequency.exponentialRampToValueAtTime(140, at + event.duration);
  }
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(
    event.volume,
    at + (event.voice === 'pad' ? 0.25 : 0.006),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + event.duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(musicBus);
  const voice = { source, envelope };
  musicVoices.add(voice);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    envelope.disconnect();
    musicVoices.delete(voice);
  };
  source.start(at);
  source.stop(at + event.duration + 0.03);
}
function scheduleMusic() {
  if (!context || context.state !== 'running' || document.hidden) return;
  if (!settings.music) {
    nextNote = context.currentTime;
    return;
  }
  if (nextNote < context.currentTime) nextNote = context.currentTime + 0.04;
  while (nextNote < context.currentTime + 0.15) {
    for (const event of musicStep(scene, beat)) instrument(event, nextNote);
    nextNote += 60 / musicTempo(scene) / 4;
    beat = (beat + 1) % 256;
  }
}
export function unlockAudio() {
  if (typeof window === 'undefined' || document.hidden) return;
  try {
    if (!context) {
      const Audio =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Audio) return;
      context = new Audio();
      musicBus = context.createGain();
      effectsBus = context.createGain();
      musicBus.connect(context.destination);
      effectsBus.connect(context.destination);
      musicBus.gain.value = 0;
      effectsBus.gain.value = settings.effects * 0.5;
      updateVolume();
      nextNote = context.currentTime + 0.04;
      timer = setInterval(scheduleMusic, 60);
    }
    if (context.state !== 'running')
      void context
        .resume()
        .then(scheduleMusic)
        .catch(() => {});
    else scheduleMusic();
  } catch {
    /* Unsupported audio must never interrupt gameplay. */
  }
}
export function setMusicScene(next: MusicScene) {
  if (scene === next) return;
  scene = next;
  beat = 0;
  if (context) {
    const now = context.currentTime;
    for (const voice of musicVoices) {
      voice.envelope.gain.cancelScheduledValues(now);
      voice.envelope.gain.setTargetAtTime(0, now, 0.025);
      voice.source.stop(now + 0.1);
    }
    musicVoices.clear();
    nextNote = now + 0.12;
  }
}
export function playSound(event: SoundEvent) {
  if (
    !context ||
    context.state !== 'running' ||
    document.hidden ||
    !settings.effects
  )
    return;
  const now = context.currentTime;
  if (now - (lastSound.get(event) ?? -10) < (event === 'select' ? 0.09 : 0.06))
    return;
  lastSound.set(event, now);
  if (event === 'jump') note(64, now, 0.14, 0.18, effectsBus, 'sine', 83);
  else if (event === 'hit') {
    note(48, now, 0.2, 0.18, effectsBus, 'triangle', 27);
    note(37, now, 0.14, 0.12, effectsBus, 'sawtooth', 24);
  } else if (event === 'select')
    note(79, now, 0.075, 0.15, effectsBus, 'sine', 84);
  else {
    const sequence =
      event === 'error'
        ? [55, 49]
        : event === 'search'
          ? [62, 69]
          : event === 'match'
            ? [62, 69, 74]
            : event === 'validated'
              ? [62, 66, 69, 74, 81]
              : [62, 66, 69, 74];
    sequence.forEach((pitch, i) =>
      note(pitch, now + i * 0.12, 0.35, 0.17, effectsBus),
    );
  }
}
export function mountGameAudio() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved)
      setAudioSettings({
        music: typeof saved.music === 'number' ? saved.music : defaults.music,
        effects:
          typeof saved.effects === 'number' ? saved.effects : defaults.effects,
      });
  } catch {}
  const gesture = (event: Event) => {
    unlockAudio();
    if (
      event.type === 'click' &&
      event.target instanceof Element &&
      event.target.closest('button:not(:disabled)')
    )
      playSound('select');
  };
  const visibility = () => {
    if (document.hidden) {
      if (context) void context.suspend().catch(() => {});
    } else if (context) unlockAudio();
  };
  document.addEventListener('click', gesture, true);
  document.addEventListener('keydown', gesture, true);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    document.removeEventListener('click', gesture, true);
    document.removeEventListener('keydown', gesture, true);
    document.removeEventListener('visibilitychange', visibility);
    if (timer) clearInterval(timer);
    if (context) void context.close().catch(() => {});
    musicVoices.clear();
    noise = undefined;
    context = undefined;
    timer = undefined;
    beat = 0;
    lastSound.clear();
  };
}
