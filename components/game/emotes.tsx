'use client';
import Image from 'next/image';
import { Smile, X } from 'lucide-react';
import { useState } from 'react';
import { EMOTES, type EmoteEvent } from '@/lib/game/emotes';
export function EmoteBubble({ event }: { event: EmoteEvent | null }) {
  const emote = EMOTES.find((e) => e.id === event?.id);
  if (!emote || !event) return null;
  const key = event.attempt + '-' + event.frame;
  return (
    <output
      className="emote-bubble"
      aria-label={'Gesto: ' + emote.name}
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
          src={emote.src + '?event=' + key}
          alt={emote.name}
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
  const [open, setOpen] = useState(false),
    [count, setCount] = useState(0);
  const blocked = disabled || wait > 0 || count >= 30;
  return (
    <aside
      className="emote-controls"
      aria-label="Gestos del ataque"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {open ? (
        <fieldset className="emote-tray" aria-label="20 gestos Axie">
          <header>
            <strong>Gestos</strong>
            <small>{count}/30</small>
            <button aria-label="Cerrar gestos" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <div className="emote-grid">
            {EMOTES.map((e) => (
              <button
                key={e.id}
                title={e.name}
                aria-label={'Enviar ' + e.name}
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
                  alt={e.name}
                />
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <button
        className="emote-toggle"
        aria-label={open ? 'Cerrar gestos' : 'Abrir gestos'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        <Smile size={25} />
        {wait > 0 ? <small>{Math.ceil(wait / 120)}s</small> : null}
      </button>
    </aside>
  );
}
