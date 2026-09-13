'use client';
import { useEffect, useRef } from 'react';
export function GameObjects() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    const parent = host.current?.parentElement;
    if (!parent || !host.current) return;
    void import('@/lib/game/game-objects-scene')
      .then((m) => m.createGameObjects(host.current!, parent, abort.signal))
      .then((cleanup) => {
        if (abort.signal.aborted) cleanup?.();
        else dispose = cleanup;
      })
      .catch(() => {});
    return () => {
      abort.abort();
      dispose?.();
    };
  }, []);
  return <div ref={host} className="game-objects-layer" aria-hidden="true" />;
}
