export type HapticEvent =
  | 'select'
  | 'jump'
  | 'hit'
  | 'win'
  | 'validated'
  | 'search'
  | 'match'
  | 'error';
const patterns: Record<
  HapticEvent,
  { pattern: number[]; strength: number; priority: number }
> = {
  select: { pattern: [12], strength: 0.16, priority: 0 },
  jump: { pattern: [18], strength: 0.22, priority: 1 },
  hit: { pattern: [95], strength: 0.8, priority: 3 },
  win: { pattern: [45, 55, 90], strength: 0.6, priority: 4 },
  validated: { pattern: [45, 45, 65, 45, 100], strength: 0.7, priority: 5 },
  search: { pattern: [20, 40, 20], strength: 0.25, priority: 2 },
  match: { pattern: [60, 60, 120], strength: 0.7, priority: 4 },
  error: { pattern: [35, 35, 35], strength: 0.4, priority: 3 },
};
const key = 'waxies.haptics.v1';
let memoryEnabled = true;
let until = 0,
  priority = -1;
type Actuator = {
  playEffect?: (
    type: string,
    params: {
      duration: number;
      startDelay: number;
      strongMagnitude: number;
      weakMagnitude: number;
    },
  ) => Promise<unknown>;
  pulse?: (strength: number, duration: number) => Promise<unknown>;
  reset?: () => Promise<unknown>;
};
function pads() {
  try {
    return Array.from(navigator.getGamepads?.() ?? []).filter(
      (p): p is Gamepad => !!p && p.connected,
    );
  } catch {
    return [];
  }
}
function actuators() {
  return pads().flatMap((p) => {
    const g = p as unknown as {
      vibrationActuator?: Actuator;
      hapticActuators?: Actuator[];
    };
    return g.vibrationActuator
      ? [g.vibrationActuator]
      : (g.hapticActuators ?? []);
  });
}
function swallow(f: () => unknown) {
  try {
    void Promise.resolve(f()).catch(() => {});
  } catch {}
}
export function hapticsEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? memoryEnabled : stored !== 'off';
  } catch {
    return memoryEnabled;
  }
}
export function stopHaptics() {
  if (typeof navigator === 'undefined') return;
  swallow(() => navigator.vibrate?.(0));
  actuators().forEach((a) => {
    if (a.reset) swallow(() => a.reset!());
  });
  until = 0;
  priority = -1;
}
export function setHapticsEnabled(enabled: boolean) {
  memoryEnabled = enabled;
  try {
    localStorage.setItem(key, enabled ? 'on' : 'off');
  } catch {}
  if (!enabled) stopHaptics();
  window.dispatchEvent(new Event('waxies-haptics'));
}
export function subscribeHaptics(listener: () => void) {
  window.addEventListener('waxies-haptics', listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener('waxies-haptics', listener);
    window.removeEventListener('storage', listener);
  };
}
export function haptic(event: HapticEvent) {
  if (typeof navigator === 'undefined' || document.hidden || !hapticsEnabled())
    return;
  const effect = patterns[event],
    now = performance.now();
  if (now < until && effect.priority <= priority) return;
  const duration = effect.pattern.reduce((sum, n) => sum + n, 0);
  until = now + duration + 35;
  priority = effect.priority;
  // Only short, bounded pulses; neither matchmaking polling nor holding a button repeats them.
  swallow(() => navigator.vibrate?.(effect.pattern));
  actuators().forEach((a) => {
    if (a.playEffect)
      swallow(() =>
        a.playEffect!('dual-rumble', {
          duration,
          startDelay: 0,
          strongMagnitude: effect.strength,
          weakMagnitude: effect.strength * 0.65,
        }),
      );
    else if (a.pulse) swallow(() => a.pulse!(effect.strength, duration));
  });
}
export function createGameplayHaptics() {
  let old: { phase: string; hits: number; jumps: number } | undefined;
  return (
    s: { phase: string; hits: number; jumps: number },
    enabled: boolean,
  ) => {
    if (enabled && old) {
      if (s.hits > old.hits) haptic('hit');
      else if (s.phase === 'won' && old.phase !== 'won') haptic('win');
      else if (s.jumps > old.jumps) haptic('jump');
    }
    old = { phase: s.phase, hits: s.hits, jumps: s.jumps };
  };
}
export function createGamepadControls(actions: {
  jump: () => void;
  pause: () => void;
  restart: () => void;
}) {
  const held = new Map<number, boolean[]>();
  return () => {
    const current = pads();
    for (const id of held.keys())
      if (!current.some((p) => p.index === id)) held.delete(id);
    for (const p of current) {
      const next = p.buttons.map((b) => b.pressed),
        old = held.get(p.index);
      held.set(p.index, next);
      if (
        !old ||
        document.hidden ||
        !document.hasFocus() ||
        document.activeElement?.closest('input,textarea,select,[role="dialog"]')
      )
        continue;
      if (next[0] && !old[0]) actions.jump();
      if (next[9] && !old[9]) actions.pause();
      if (next[2] && !old[2]) actions.restart();
    }
  };
}
