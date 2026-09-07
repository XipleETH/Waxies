'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, X } from 'lucide-react';
import { STORY_PANELS } from '@/lib/game/story-narrative';
import type { createStoryScene } from '@/lib/game/story-scene';
import styles from './story-intro.module.css';

export function StoryIntro({
  replay,
  onFinish,
  onClose,
}: {
  replay: boolean;
  onFinish: () => void;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState(0),
    [paused, setPaused] = useState(false),
    [status, setStatus] = useState('Preparando la escena…');
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<ReturnType<typeof createStoryScene> | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef(panel),
    pausedRef = useRef(paused);
  useEffect(() => {
    let stopped = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) {
      pausedRef.current = true;
      queueMicrotask(() => {
        if (!stopped) setPaused(true);
      });
    }
    void import('@/lib/game/story-scene')
      .then(({ createStoryScene }) => {
        if (stopped || !host.current) return;
        const instance = createStoryScene(host.current, (error) => {
          if (!stopped) setStatus(error ?? '');
        });
        engine.current = instance;
        instance.setPanel(panelRef.current);
        instance.setPaused(pausedRef.current);
      })
      .catch(() => {
        if (!stopped)
          setStatus(
            'La animación no está disponible. Puedes leer la historia y continuar.',
          );
      });
    return () => {
      stopped = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    panelRef.current = panel;
    engine.current?.setPanel(panel);
    heading.current?.focus({ preventScroll: true });
  }, [panel]);
  useEffect(() => {
    pausedRef.current = paused;
    engine.current?.setPaused(paused);
  }, [paused]);
  const page = STORY_PANELS[panel],
    last = panel === STORY_PANELS.length - 1;
  return (
    <main
      className={styles.intro}
      aria-label="La guerra de los cofres"
      data-paused={paused}
    >
      <header className={styles.top}>
        <button onClick={onClose} aria-label="Cerrar historia">
          <X size={20} />
        </button>
        <span>CRÓNICAS DE LUNACIA</span>
        <button onClick={onFinish}>{replay ? 'Cerrar' : 'Saltar'}</button>
      </header>
      <div className={styles.stage}>
        <figure className={styles.canvas} ref={host} aria-label={page.scene} />
        <span className={styles.issue}>
          WAXIS STORIES <b>№ 01</b>
        </span>
        <span key={panel} className={styles.whisper} aria-hidden="true">
          {page.whisper}
        </span>
        {status ? <output className={styles.status}>{status}</output> : null}
        <button
          className={styles.motion}
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? 'Reanudar animación' : 'Pausar animación'}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <span className={styles.resources}>SLP · AXS · RON</span>
      </div>
      <section className={styles.caption}>
        <div
          className={styles.progress}
          aria-label={`Escena ${panel + 1} de ${STORY_PANELS.length}`}
        >
          {STORY_PANELS.map((p, i) => (
            <button
              key={p.tag}
              onClick={() => setPanel(i)}
              aria-label={`Escena ${i + 1}: ${p.title}`}
              aria-current={i === panel ? 'step' : undefined}
              className={i <= panel ? styles.read : ''}
            />
          ))}
        </div>
        <div className={styles.copy} key={panel}>
          <span className={styles.tag}>{page.tag}</span>
          <h1 ref={heading} tabIndex={-1}>
            {page.title}
          </h1>
          <p>{page.text}</p>
        </div>
        <div className={styles.controls}>
          <button
            className={styles.back}
            disabled={panel === 0}
            onClick={() => setPanel((p) => p - 1)}
            aria-label="Escena anterior"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            className={styles.next}
            onClick={() => (last ? onFinish() : setPanel((p) => p + 1))}
          >
            {last
              ? replay
                ? 'Volver a capítulos'
                : 'Entrar a la mazmorra'
              : 'Continuar'}
            <ArrowRight size={19} />
          </button>
        </div>
        <small className={styles.note}>
          Relato de WAXIS · En la partida ganas Chispas.
        </small>
      </section>
    </main>
  );
}
