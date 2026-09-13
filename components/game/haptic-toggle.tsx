'use client';
import { useSyncExternalStore } from 'react';
import {
  haptic,
  hapticsEnabled,
  setHapticsEnabled,
  subscribeHaptics,
} from '@/lib/game/haptics';
export function HapticToggle() {
  const enabled = useSyncExternalStore(
    subscribeHaptics,
    hapticsEnabled,
    () => true,
  );
  return (
    <button
      className="haptic-toggle"
      data-object="haptics"
      data-label={enabled ? 'Vibración' : 'Sin vibrar'}
      aria-label="Vibración"
      aria-pressed={enabled}
      onClick={() => {
        setHapticsEnabled(!enabled);
        if (!enabled) haptic('select');
      }}
    >
      {enabled ? 'Vibración' : 'Sin vibrar'}
    </button>
  );
}
