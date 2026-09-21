'use client';
import { useState, useSyncExternalStore } from 'react';
import {
  audioSettings,
  subscribeAudio,
  setAudioSettings,
  unlockAudio,
  playSound,
} from '@/lib/game/audio';
import { Dialog } from '@/components/ui/dialog';
import { ObjectDialogContent } from './object-dialog';
const serverSettings = { music: 0.35, effects: 0.65 };
export function SoundControls() {
  const settings = useSyncExternalStore(
    subscribeAudio,
    audioSettings,
    () => serverSettings,
  );
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="sound-toggle"
        data-object="music"
        data-label="Sonido"
        aria-label="Configurar sonido"
        onClick={() => setOpen(true)}
      >
        Sonido
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <ObjectDialogContent
          title="Sonido"
          description="La música de Lunacia"
          onClose={() => setOpen(false)}
        >
          <div className="sound-settings">
            <label htmlFor="music-volume">
              Música del lobby · {Math.round(settings.music * 100)} %
            </label>
            <input
              id="music-volume"
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.music * 100)}
              onChange={(e) => {
                unlockAudio();
                setAudioSettings({ music: Number(e.target.value) / 100 });
              }}
            />
            <label htmlFor="effects-volume">
              Efectos · {Math.round(settings.effects * 100)} %
            </label>
            <input
              id="effects-volume"
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.effects * 100)}
              onChange={(e) => {
                unlockAudio();
                setAudioSettings({ effects: Number(e.target.value) / 100 });
              }}
            />
            <div className="sound-actions">
              <button
                data-object="play"
                data-label="Probar"
                onClick={() => {
                  unlockAudio();
                  playSound('win');
                }}
              >
                Probar efectos
              </button>
              <button
                data-object="music"
                data-label="Silenciar"
                onClick={() => setAudioSettings({ music: 0, effects: 0 })}
              >
                Silenciar todo
              </button>
            </div>
            <p>
              Volúmenes guardados en este dispositivo. La música descansa
              durante las mazmorras y todo el audio se pausa al salir del juego.
            </p>
          </div>
        </ObjectDialogContent>
      </Dialog>
    </>
  );
}
