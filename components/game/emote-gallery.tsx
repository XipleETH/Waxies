'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { ObjectDialogContent } from './object-dialog';
import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { EMOTES } from '@/lib/game/emotes';
import { Dialog } from '@/components/ui/dialog';
import styles from './emote-gallery.module.css';
export function EmoteGallery({ onClose }: { onClose: () => void }) {
  useLocale();
  const [selected, setSelected] = useState(0),
    [replay, setReplay] = useState(0);
  const emote = EMOTES[selected];
  const choose = (i: number) => {
    setSelected((i + EMOTES.length) % EMOTES.length);
    setReplay((n) => n + 1);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ObjectDialogContent
        title={translateText('Gestos')}
        description={translateText(
          'Tus emociones también aparecen en la repetición del ataque.',
        )}
        onClose={onClose}
        className={'emote-objects ' + styles.gallery}
      >
        <div className={styles.preview}>
          <button
            onClick={() => choose(selected - 1)}
            aria-label={translateText('Gesto anterior')}
            data-object="previous"
          >
            <ChevronLeft size={23} />
          </button>
          <figure>
            <picture key={emote.id + '-' + replay}>
              <source
                media="(prefers-reduced-motion: reduce)"
                srcSet={emote.poster}
              />
              <img
                src={emote.src + '&preview=' + replay}
                width={160}
                height={160}
                alt={translateText(emote.name)}
              />
            </picture>
            <figcaption
              aria-live="polite"
              data-object="title"
              data-label={translateText(emote.name)}
            >
              {translateText(emote.name)}
            </figcaption>
          </figure>
          <button
            onClick={() => choose(selected + 1)}
            aria-label={translateText('Gesto siguiente')}
            data-object="next"
          >
            <ChevronRight size={23} />
          </button>
        </div>
        <div className={styles.tools}>
          <small>
            {selected + 1} / {EMOTES.length}
          </small>
          <button
            onClick={() => setReplay((n) => n + 1)}
            aria-label={translateText('Repetir gesto')}
            data-object="retry"
            data-label={translateText('Repetir')}
          >
            <RotateCcw size={15} />
            {translateText('Repetir')}
          </button>
        </div>
        <fieldset className={styles.grid} data-object-scroll>
          <legend className="sr-only">
            {translateText('Galería de 20 gestos')}
          </legend>
          {EMOTES.map((e, i) => (
            <button
              key={e.id}
              aria-label={translateText('Ver ' + e.name)}
              aria-pressed={selected === i}
              onClick={() => choose(i)}
            >
              <Image
                unoptimized
                src={e.poster}
                alt={''}
                width={64}
                height={64}
              />
              <span data-object="title" data-label={translateText(e.name)}>
                {translateText(e.name)}
              </span>
            </button>
          ))}
        </fieldset>
      </ObjectDialogContent>
    </Dialog>
  );
}
