'use client';
import { useEffect, useRef, useState } from 'react';
import type { Trap } from '@/lib/game/physics';
export function AxiePreview({
  genes,
  theme,
  decoration,
  traps,
  validated,
}: {
  genes: string;
  theme: string;
  decoration: string;
  traps: Trap[];
  validated: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState('Preparando tu refugio…');
  const parts = traps.map((t) => t.part).join('|');
  useEffect(() => {
    let stopped = false,
      dispose = () => {};
    void import('@/lib/game/lobby-scene')
      .then(({ createLobbyScene }) => {
        if (stopped || !host.current) return;
        const scene = createLobbyScene(
          host.current,
          { genes, theme, decoration, parts: parts.split('|'), validated },
          (error) => {
            if (!stopped) setStatus(error ?? '');
          },
        );
        dispose = scene.dispose;
      })
      .catch(() => {
        if (!stopped)
          setStatus(
            'La vista 3D no está disponible. Puedes seguir usando el menú.',
          );
      });
    return () => {
      stopped = true;
      dispose();
    };
  }, [genes, theme, decoration, parts, validated]);
  return (
    <div
      className="refuge-backdrop"
      ref={host}
      aria-label="Tu Axie animado en tu refugio personal"
    >
      {status ? <span className="refuge-loading">{status}</span> : null}
    </div>
  );
}
