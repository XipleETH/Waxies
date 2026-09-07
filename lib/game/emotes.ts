import catalog from './data/emotes.json';
export const EMOTES = catalog.map((e) => ({
  ...e,
  name: e.label,
  src: '/assets/emotes/' + e.id + '.gif',
  poster: '/assets/emotes/' + e.id + '.png',
}));
export interface EmoteEvent {
  id: string;
  attempt: number;
  frame: number;
}
export const EMOTE_COOLDOWN = 360;
export function validEmotes(
  events: unknown,
  attempts: Array<{ frames: number }>,
) {
  if (events === undefined) return true;
  if (!Array.isArray(events) || events.length > 30) return false;
  let previous = -Infinity;
  for (const e of events) {
    if (
      !e ||
      !EMOTES.some((v) => v.id === e.id) ||
      !Number.isInteger(e.attempt) ||
      e.attempt < 0 ||
      e.attempt >= attempts.length ||
      !Number.isInteger(e.frame) ||
      e.frame < 0 ||
      e.frame > attempts[e.attempt].frames
    )
      return false;
    const time =
      attempts.slice(0, e.attempt).reduce((n, a) => n + a.frames, 0) + e.frame;
    if (time - previous < EMOTE_COOLDOWN) return false;
    previous = time;
  }
  return true;
}

export function emoteTime(
  attempts: Array<{ frames: number }>,
  attempt: number,
  frame: number,
) {
  return attempts.slice(0, attempt).reduce((n, a) => n + a.frames, 0) + frame;
}
export function visibleEmote(
  events: EmoteEvent[],
  attempts: Array<{ frames: number }>,
  attempt: number,
  frame: number,
) {
  const time = emoteTime(attempts, attempt, frame);
  return (
    events.findLast((e) => {
      const age = time - emoteTime(attempts, e.attempt, e.frame);
      return age >= 0 && age < 240;
    }) ?? null
  );
}
