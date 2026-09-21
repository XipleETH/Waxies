'use client';
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
        data-label={enabled ? 'Vibración' : 'Sin vibrar'}
        aria-label="Configurar vibración"
        onClick={() => setOpen(true)}
      >
        Vibración
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <ObjectDialogContent
          title="Vibración"
          description="Teléfono y mando"
          onClose={() => setOpen(false)}
        >
          <p>Saltos, golpes, victorias, mapa y encuentros online.</p>
          <button
            data-object="haptics"
            data-label={enabled ? 'Activada' : 'Desactivada'}
            aria-label="Activar vibración"
            aria-pressed={enabled}
            onClick={() => {
              setHapticsEnabled(!enabled);
              setResult(null);
            }}
          >
            {enabled ? 'Desactivar vibración' : 'Activar vibración'}
          </button>
          <button
            data-object="play"
            data-label="Probar"
            onClick={() => setResult(testHaptics())}
          >
            Activar y probar vibración
          </button>
          <output aria-live="polite">
            {result
              ? messages[result]
              : 'Pulsa Probar para activar la vibración y sentir dos pulsos largos.'}
          </output>
        </ObjectDialogContent>
      </Dialog>
    </>
  );
}
