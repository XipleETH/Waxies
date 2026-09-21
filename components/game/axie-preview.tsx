'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

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
  useLocale();
  const host = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState('Preparando tu refugio…');
  const balanceUpdater = useRef<((amount: number | null) => void) | null>(null);
  const balance = useRef<number | null>(null);
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
        balanceUpdater.current = scene.updateChestBalance;
        scene.updateChestBalance(balance.current);
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
      balanceUpdater.current = null;
      dispose();
    };
  }, [genes, theme, decoration, parts, validated]);
  useEffect(() => {
    const abort = new AbortController();
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const res = await fetch('/api/online', {
          cache: 'no-store',
          signal: abort.signal,
        });
        if (!res.ok) throw Error();
        const view = await res.json();
        const amount = view.configured ? (view.player?.chest ?? 0) : null;
        balance.current = amount;
        balanceUpdater.current?.(amount);
        if (host.current)
          host.current.setAttribute(
            'aria-label',
            translateText('Tu Axie y cofre: ') +
              (amount === null
                ? translateText('saldo no disponible')
                : translateText(amount + ' Chispas cargadas')),
          );
      } catch {
        if (!abort.signal.aborted) balanceUpdater.current?.(null);
      } finally {
        busy = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online-balance-changed', refresh);
    return () => {
      abort.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online-balance-changed', refresh);
    };
  }, []);
  return (
    <div
      className="refuge-backdrop"
      ref={host}
      aria-label={translateText('Tu Axie animado en tu refugio personal')}
    >
      {status ? (
        <span className="refuge-loading">{translateText(status)}</span>
      ) : null}
    </div>
  );
}
