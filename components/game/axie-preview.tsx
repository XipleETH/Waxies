'use client';
import { useEffect, useRef, useState } from 'react';
import { randomAxie } from '@/lib/game/random-axie';
export function AxiePreview({ genes }: { genes?: string }) {
  const host = useRef<HTMLDivElement>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let stop = false,
      dispose = () => {};
    const abort = new AbortController();
    void Promise.all([import('three'), import('@/lib/game/mixer-avatar')])
      .then(async ([T, { loadMixedAvatar }]) => {
        if (stop || !host.current) return;
        const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.outputColorSpace = T.SRGBColorSpace;
        host.current.appendChild(renderer.domElement);
        const scene = new T.Scene(),
          camera = new T.PerspectiveCamera(32, 1, 0.1, 40);
        camera.position.set(0, 1.25, 5);
        camera.lookAt(0, 0.6, 0);
        scene.add(new T.HemisphereLight(0xffffff, 0x547661, 2.5));
        const light = new T.DirectionalLight(0xffffff, 3);
        light.position.set(-3, 5, 4);
        scene.add(light);
        const resize = () => {
          if (!host.current) return;
          const w = host.current.clientWidth,
            h = host.current.clientHeight;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host.current);
        resize();
        let avatar: Awaited<ReturnType<typeof loadMixedAvatar>> | undefined,
          raf = 0,
          last = 0;
        dispose = () => {
          observer.disconnect();
          cancelAnimationFrame(raf);
          avatar?.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
        try {
          avatar = await loadMixedAvatar(
            genes ?? randomAxie().genes,
            abort.signal,
          );
          if (stop) {
            avatar.dispose();
            return;
          }
          scene.add(avatar.root);
          avatar.root.rotation.y = 0.35;
          avatar.actions.idle?.play();
          const loop = (now: number) => {
            if (stop) return;
            raf = requestAnimationFrame(loop);
            avatar?.mixer.update(Math.min((now - last) / 1000, 0.05));
            last = now;
            renderer.render(scene, camera);
          };
          raf = requestAnimationFrame(loop);
        } catch {
          if (!stop) setError(true);
        }
      })
      .catch(() => {
        if (!stop) setError(true);
      });
    return () => {
      stop = true;
      abort.abort();
      dispose();
    };
  }, [genes]);
  return (
    <div className="mobile-axie-preview" ref={host} aria-label="Tu Axie 3D">
      {error ? <span>Tu Axie te espera en la partida</span> : null}
    </div>
  );
}
