'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

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
  useLocale();
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
        data-label={translateText('Sonido')}
        aria-label={translateText('Configurar sonido')}
        onClick={() => setOpen(true)}
      >
        {translateText('Sonido')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <ObjectDialogContent
          title={translateText('Sonido')}
          description={translateText('La música de Lunacia')}
          onClose={() => setOpen(false)}
        >
          <div className="sound-settings">
            <label htmlFor="music-volume">
              {translateText('Música · ')}
              {Math.round(settings.music * 100)} %
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
              {translateText('Efectos · ')}
              {Math.round(settings.effects * 100)} %
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
                data-label={translateText('Probar')}
                onClick={() => {
                  unlockAudio();
                  playSound('win');
                }}
              >
                {translateText('Probar efectos')}
              </button>
              <button
                data-object="music"
                data-label={translateText('Silenciar')}
                onClick={() => setAudioSettings({ music: 0, effects: 0 })}
              >
                {translateText('Silenciar todo')}
              </button>
            </div>
            <p>
              {translateText(
                'Volúmenes guardados en este dispositivo. Lobby oscuro y techno en las mazmorras. Todo el audio se pausa al salir del juego.',
              )}
            </p>
          </div>
        </ObjectDialogContent>
      </Dialog>
    </>
  );
}
