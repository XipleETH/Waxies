'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import Image from 'next/image';
import { Smile, X } from 'lucide-react';
import { useState } from 'react';
import { EMOTES, type EmoteEvent } from '@/lib/game/emotes';
export function EmoteBubble({ event }: { event: EmoteEvent | null }) {
  useLocale();
  const emote = EMOTES.find((e) => e.id === event?.id);
  if (!emote || !event) return null;
  const key = event.attempt + '-' + event.frame;
  return (
    <output
      className="emote-bubble"
      aria-label={translateText('Gesto: ' + emote.name)}
      key={key}
    >
      <picture>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet={emote.poster}
        />
        <img
          width={96}
          height={96}
          src={emote.src + '&event=' + key}
          alt={translateText(emote.name)}
        />
      </picture>
    </output>
  );
}
export function EmotePicker({
  onSend,
  wait,
  disabled = false,
}: {
  onSend: (id: string) => boolean;
  wait: number;
  disabled?: boolean;
}) {
  useLocale();
  const [open, setOpen] = useState(false),
    [count, setCount] = useState(0);
  const blocked = disabled || wait > 0 || count >= 30;
  return (
    <aside
      className="emote-controls"
      aria-label={translateText('Gestos del ataque')}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {open ? (
        <fieldset
          className="emote-tray"
          aria-label={translateText('20 gestos Axie')}
        >
          <header>
            <strong data-object="title" data-label={translateText('Gestos')}>
              {translateText('Gestos')}
            </strong>
            <small>{count}/30</small>
            <button
              data-object="close"
              aria-label={translateText('Cerrar gestos')}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          <div className="emote-grid">
            {EMOTES.map((e) => (
              <button
                key={e.id}
                title={translateText(e.name)}
                aria-label={translateText('Enviar ' + e.name)}
                disabled={blocked}
                onClick={() => {
                  if (onSend(e.id)) {
                    setCount((n) => n + 1);
                    setOpen(false);
                  }
                }}
              >
                <Image
                  unoptimized
                  width={64}
                  height={64}
                  src={e.poster}
                  alt={translateText(e.name)}
                />
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <button
        className="emote-toggle"
        data-object="emotes"
        data-label={translateText(
          wait > 0 ? `${Math.ceil(wait / 120)}s` : 'Gestos',
        )}
        aria-label={translateText(open ? 'Cerrar gestos' : 'Abrir gestos')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        <Smile size={25} />
        {wait > 0 ? (
          <small>
            {Math.ceil(wait / 120)}
            {translateText('s')}
          </small>
        ) : null}
      </button>
    </aside>
  );
}
