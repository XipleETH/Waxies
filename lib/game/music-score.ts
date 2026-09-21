export type MusicScene = 'lobby' | 'dungeon';
export type MusicVoice = 'kick' | 'hat' | 'snare' | 'bass' | 'pad' | 'lead';
export interface MusicNote {
  voice: MusicVoice;
  midi: number;
  duration: number;
  volume: number;
  cutoff?: number;
}
export const musicTempo = (scene: MusicScene) =>
  scene === 'lobby' ? 100 : 128;
/** Original 16-bar arrangements in E minor: intro, drive, breakdown and return. */
export function musicStep(scene: MusicScene, step: number): MusicNote[] {
  const n = ((step % 256) + 256) % 256,
    bar = Math.floor(n / 16),
    tick = n % 16;
  const battle = scene === 'dungeon',
    section = Math.floor(bar / 4);
  const root = [40, 36, 43, 38][Math.floor(bar / 2) % 4];
  const breakdown = section === 2;
  const events: MusicNote[] = [];
  const add = (
    voice: MusicVoice,
    midi: number,
    duration: number,
    volume: number,
    cutoff?: number,
  ) => events.push({ voice, midi, duration, volume, cutoff });
  if (
    (!breakdown && tick % (battle ? 4 : 8) === 0) ||
    (breakdown && tick === 0)
  )
    add('kick', 43, 0.24, battle ? 0.7 : 0.48);
  if (
    tick % (battle ? 2 : 4) === 2 ||
    (battle && section === 3 && tick % 4 === 3)
  )
    add('hat', 0, tick % 4 === 2 ? 0.08 : 0.035, breakdown ? 0.055 : 0.11);
  if (!breakdown && (tick === 4 || tick === 12))
    add('snare', 0, 0.14, battle ? 0.18 : 0.1);
  if (bar === 15 && tick >= 13)
    add('snare', 0, 0.06, 0.08 + (tick - 13) * 0.02);
  const bassPattern = battle ? [0, 3, 6, 8, 10, 14] : [0, 6, 10, 14];
  if (bassPattern.includes(tick) && (!breakdown || tick === 0 || tick === 10)) {
    add(
      'bass',
      root + (tick === 14 ? 7 : 0),
      0.19,
      battle ? 0.28 : 0.22,
      180 + (tick % 8) * 65 + section * 80,
    );
  }
  if (tick === 0 && bar % 2 === 0) {
    for (const interval of [12, 15, 19, 26])
      add('pad', root + interval, 1.8, 0.04, 700);
  }
  const riff = battle
    ? [12, 19, 15, 22, 12, 24, 19, 15]
    : [12, 0, 19, 15, 0, 22, 19, 0];
  if (tick % 2 === 0 && (section !== 0 || bar % 2 === 1)) {
    const offset = riff[(tick / 2 + (bar % 2) * 3) % 8];
    if (offset)
      add(
        'lead',
        root + offset + (section === 3 ? 12 : 0),
        breakdown ? 0.45 : 0.16,
        battle ? 0.075 : 0.055,
        breakdown ? 850 : 1200 + tick * 65,
      );
  }
  return events;
}
