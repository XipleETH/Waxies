'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useState, useSyncExternalStore } from 'react';
import {
  hapticsEnabled,
  setHapticsEnabled,
  subscribeHaptics,
  testHaptics,
  type HapticResult,
} from '@/lib/game/haptics';
import { Dialog } from '@/components/ui/dialog';
import { ObjectDialogContent } from './object-dialog';
const messages: Record<HapticResult, string> = {
  requested:
    'Prueba enviada: dos pulsos largos. Si no los sientes, revisa la vibración del teléfono, el modo silencio y No molestar. El navegador no confirma la vibración física.',
  unsupported:
    'Este navegador no ofrece vibración y no detectamos un mando compatible. Prueba abriendo el juego directamente en Chrome para Android.',
  blocked:
    'El navegador no aceptó la vibración. Abre el juego directamente en el navegador y vuelve a pulsar Probar.',
  disabled: 'La vibración está desactivada.',
  suppressed: 'Hay otra vibración en curso. Vuelve a probar.',
};
export function HapticToggle() {
  useLocale();
  const enabled = useSyncExternalStore(
    subscribeHaptics,
    hapticsEnabled,
    () => true,
  );
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<HapticResult | null>(null);
  return (
    <>
      <button
        className="haptic-toggle"
        data-object="haptics"
        data-label={translateText(enabled ? 'Vibración' : 'Sin vibrar')}
        aria-label={translateText('Configurar vibración')}
        onClick={() => setOpen(true)}
      >
        {translateText('Vibración')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <ObjectDialogContent
          title={translateText('Vibración')}
          description={translateText('Teléfono y mando')}
          onClose={() => setOpen(false)}
        >
          <p>
            {translateText(
              'Saltos, golpes, victorias, mapa y encuentros online.',
            )}
          </p>
          <button
            data-object="haptics"
            data-label={translateText(enabled ? 'Activada' : 'Desactivada')}
            aria-label={translateText('Activar vibración')}
            aria-pressed={enabled}
            onClick={() => {
              setHapticsEnabled(!enabled);
              setResult(null);
            }}
          >
            {translateText(
              enabled ? 'Desactivar vibración' : 'Activar vibración',
            )}
          </button>
          <button
            data-object="play"
            data-label={translateText('Probar')}
            onClick={() => setResult(testHaptics())}
          >
            {translateText('Activar y probar vibración')}
          </button>
          <output aria-live="polite">
            {translateText(
              result
                ? messages[result]
                : 'Pulsa Probar para activar la vibración y sentir dos pulsos largos.',
            )}
          </output>
        </ObjectDialogContent>
      </Dialog>
    </>
  );
}
