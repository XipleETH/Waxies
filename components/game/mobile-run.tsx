'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUp,
  Pause,
  Play,
  RotateCcw,
  Heart,
  Sparkles,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { createState, type Dungeon } from '@/lib/game/physics';
import type { Engine } from '@/lib/game/scene';
import { verifyRoute, type RouteProof } from '@/lib/game/route-proof';
import { randomAxie } from '@/lib/game/random-axie';
import type { AxieLoadout } from '@/lib/game/axie';
import { PARTS } from '@/lib/game/catalog';
import { raidPowerDescription } from '@/lib/game/raid-powers';
import {
  STORY_LENGTH,
  STORY_CHAPTERS,
  storyStars,
} from '@/lib/game/story-progress';
export interface RunConfig {
  id: string;
  level: Dungeon;
  proof?: RouteProof;
  mode: 'practice' | 'validate' | 'shared' | 'story';
  storyNumber?: number;
  previousBest?: number;
  axie: Pick<AxieLoadout, 'genes' | 'class' | 'name'> | null;
}
export function MobileRun({
  run,
  onExit,
  onNext,
  onClaim,
  onValidate,
}: {
  run: RunConfig;
  onExit: () => void;
  onNext: () => void;
  onClaim: (id: string, hp: number) => void;
  onValidate: (proof: RouteProof) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null),
    handled = useRef(false);
  const [state, setState] = useState(() => createState(run.level)),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [demo, setDemo] = useState(false),
    [claimed, setClaimed] = useState(false),
    [tip, setTip] = useState<number | null>(null);
  useEffect(() => {
    let stopped = false;
    const appearance = run.axie ?? randomAxie();
    import('@/lib/game/scene')
      .then(({ createEngine }) => {
        if (stopped || !host.current) return;
        const game = createEngine(
          host.current,
          (s) => {
            if (!stopped) setState(s);
          },
          async (problem) => {
            if (stopped) return;
            if (problem) {
              setError(problem);
              return;
            }
            game.setLevel(run.level);
            await game.setAxie(appearance);
            if (!stopped) setLoaded(true);
          },
          (status) => {
            if (status.kind === 'error' && !stopped)
              setError(
                'No se pudo montar este Axie. Se muestra Buba como respaldo.',
              );
            else if (
              status.kind === 'mixed' &&
              status.fallbacks.length &&
              !stopped
            )
              setError(
                'Variantes sustituidas por piezas disponibles del Mixer: ' +
                  status.fallbacks.join(', '),
              );
          },
        );
        engine.current = game;
      })
      .catch(() => {
        if (!stopped)
          setError(
            'No se pudo iniciar el motor 3D. Comprueba que tu navegador permita WebGL.',
          );
      });
    return () => {
      stopped = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [run]);
  const rewards = run.mode === 'practice' || run.mode === 'story';
  const reward =
    run.mode === 'story'
      ? Math.max(0, state.hp - (run.previousBest ?? 0))
      : state.hp;
  const start = () => {
    engine.current?.start();
  };
  function collect() {
    const game = engine.current;
    if (!game || handled.current || demo) return;
    const s = game.getState();
    if (s.phase !== 'won') return;
    if (run.mode === 'validate') {
      const proof = game.getProof();
      if (proof.frames > 36000 || proof.actions.length > 3000) {
        setError(
          'La repetición admite hasta 5 minutos y 3000 pulsaciones. Inicia una nueva validación.',
        );
        return;
      }
      if (s.hits || s.hp !== 100 || !verifyRoute(run.level, proof)) {
        setError(
          'Necesitas completar la torre desde el inicio sin ningún golpe.',
        );
        return;
      }
      handled.current = true;
      onValidate(proof);
    } else if (rewards) {
      try {
        onClaim(run.id, s.hp);
        handled.current = true;
        setClaimed(true);
      } catch {
        setError(
          'No se pudo guardar el premio. Libera espacio e inténtalo otra vez.',
        );
      }
    }
  }
  function fresh() {
    handled.current = false;
    setClaimed(false);
    setDemo(false);
    engine.current?.setLevel(run.level);
  }
  function showProof() {
    if (!run.proof) return;
    setDemo(true);
    handled.current = false;
    engine.current?.playProof(run.proof);
  }
  const overlay =
    state.phase === 'ready' ||
    state.phase === 'paused' ||
    state.phase === 'won' ||
    state.phase === 'dead';
  return (
    <main className="mobile-run" aria-label="Partida vertical">
      <header className="run-hud">
        <button
          className="m-icon"
          aria-label="Volver al lobby"
          onClick={onExit}
        >
          <ArrowLeft size={21} />
        </button>
        <div className="run-vitals">
          <div>
            <Heart size={15} fill="currentColor" />
            <strong>{state.hp}</strong>
            <span>
              {demo
                ? 'REPETICIÓN'
                : run.mode === 'validate'
                  ? 'VALIDACIÓN'
                  : 'SALUD'}
            </span>
          </div>
          <progress aria-label="Salud restante" value={state.hp} max={100} />
        </div>
        <div className="run-prize">
          <Sparkles size={17} />
          <strong>{rewards && !demo ? reward : 0}</strong>
          <small>premio</small>
        </div>
        <button
          className="m-icon"
          aria-label="Pausar partida"
          onClick={() => engine.current?.pause()}
          disabled={!loaded || state.phase !== 'playing'}
        >
          <Pause size={20} />
        </button>
      </header>
      <div
        className="run-canvas"
        ref={host}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).tagName === 'CANVAS' && loaded) {
            e.preventDefault();
            engine.current?.jump();
          }
        }}
      />
      {state.phase === 'resetting' ? (
        <output className="run-hit">
          <Heart size={24} /> −20 salud{' '}
          <small>{state.reason} · Volvemos al inicio</small>
        </output>
      ) : null}
      {overlay ? (
        <div className="run-overlay">
          <section className="run-panel">
            <span className="m-eyebrow">
              {demo
                ? 'DEMOSTRACIÓN SIN PREMIO'
                : run.mode === 'validate'
                  ? 'TU DEFENSA'
                  : run.mode === 'shared'
                    ? 'RETO COMPARTIDO'
                    : run.mode === 'story'
                      ? `HISTORIA · NIVEL ${run.storyNumber} / ${STORY_LENGTH}`
                      : 'PRÁCTICA ALEATORIA'}
            </span>
            <h1>
              {state.phase === 'won'
                ? demo
                  ? 'La ruta es posible'
                  : run.mode === 'validate'
                    ? 'Llegaste al cofre'
                    : '¡Cofre encontrado!'
                : state.phase === 'dead'
                  ? 'Sin salud'
                  : state.phase === 'paused'
                    ? 'Un respiro'
                    : run.level.name}
            </h1>
            {state.phase === 'ready' ? (
              <>
                {rewards ? (
                  <p className="room-intro">
                    {run.mode === 'story' && run.storyNumber! % 10 === 1
                      ? STORY_CHAPTERS[Math.floor((run.storyNumber! - 1) / 10)]
                          .text + ' '
                      : ''}
                    {run.level.subtitle}
                  </p>
                ) : null}
                <p>
                  Tu Axie corre solo. Toca para saltar y rebota en las paredes.
                  Cualquier contacto con una trampa reinicia el intento.
                </p>
                {run.level.traps.length === 0 ? (
                  <p className="run-rule">Sala de aprendizaje · sin trampas</p>
                ) : null}
                <div className="run-traps">
                  {run.level.traps.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setTip(tip === i ? null : i)}
                      aria-label={'Cómo esquivar ' + PARTS[t.part].name}
                    >
                      <Image
                        unoptimized
                        src={PARTS[t.part].partImage}
                        width={48}
                        height={40}
                        alt=""
                      />
                      <span>{PARTS[t.part].name}</span>
                    </button>
                  ))}
                </div>
                {tip !== null ? (
                  <p className="run-tactic">
                    {raidPowerDescription(run.level.traps[tip].part)}
                  </p>
                ) : (
                  <p className="run-tip-hint">
                    {run.level.traps.length
                      ? 'Toca una parte para ver cómo esquivarla.'
                      : 'Practica los rebotes antes de conocer a los guardianes.'}
                  </p>
                )}
                <p className="run-rule">
                  {run.mode === 'validate'
                    ? 'Solo puedes guardar tu defensa con 100 de salud y cero golpes.'
                    : run.mode === 'story'
                      ? 'Cada golpe reinicia el intento y resta 20 de salud. Mejora tu marca para ganar estrellas.'
                      : 'Cada golpe: −20 salud y −20 Chispas del cofre.'}
                </p>
                <button
                  className="m-primary"
                  disabled={!loaded}
                  onClick={start}
                >
                  <Play size={19} fill="currentColor" />
                  {loaded ? 'Entrar a la sala' : 'Preparando tu Axie…'}
                </button>
                {run.proof && loaded && run.mode !== 'story' ? (
                  <button className="m-secondary" onClick={showProof}>
                    <Bot size={18} />{' '}
                    {run.mode === 'shared'
                      ? 'Ver ruta del defensor'
                      : 'Ver ruta del bot'}
                  </button>
                ) : null}
              </>
            ) : null}
            {state.phase === 'paused' ? (
              <>
                <p>Las trampas también están en pausa.</p>
                <button
                  className="m-primary"
                  onClick={() => engine.current?.pause()}
                >
                  <Play size={18} /> Continuar
                </button>
                <button
                  className="m-secondary"
                  onClick={() => engine.current?.restart()}
                >
                  <RotateCcw size={16} /> Volver al inicio · conserva salud
                </button>
                {run.mode === 'story' && run.proof ? (
                  <button className="m-secondary" onClick={showProof}>
                    <Bot size={18} /> Ver una solución · sin premio
                  </button>
                ) : null}
              </>
            ) : null}
            {state.phase === 'dead' ? (
              <>
                <p>
                  Los cinco golpes agotaron el premio. Practica los saltos y
                  vuelve a intentarlo.
                </p>
                <button className="m-primary" onClick={fresh}>
                  Intentar de nuevo
                </button>
                {run.proof ? (
                  <button className="m-secondary" onClick={showProof}>
                    <Bot size={18} /> Aprender la ruta
                  </button>
                ) : null}
              </>
            ) : null}
            {state.phase === 'won' ? (
              <>
                {demo ? (
                  <>
                    <p>
                      La repetición llegó sin golpes. Ahora prueba tú: los
                      ataques y sus tiempos serán los mismos.
                    </p>
                    <button className="m-primary" onClick={fresh}>
                      Mi turno
                    </button>
                  </>
                ) : run.mode === 'validate' ? (
                  <>
                    {state.hits === 0 ? (
                      <>
                        <p>
                          Defensa superada sin daño. Ya puedes guardar esta
                          versión y compartir el reto.
                        </p>
                        <button className="m-primary" onClick={collect}>
                          <ShieldCheck size={18} /> Guardar defensa validada
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          Recibiste {state.hits} golpe(s). Para guardar tu
                          defensa debes completarla en un intento limpio.
                        </p>
                        <button className="m-primary" onClick={fresh}>
                          Validar sin golpes
                        </button>
                      </>
                    )}
                  </>
                ) : rewards ? (
                  <>
                    {run.mode === 'story' ? (
                      <p>
                        Mejor salud: {Math.max(state.hp, run.previousBest ?? 0)}{' '}
                        / 100.{' '}
                        {run.previousBest
                          ? 'Solo recibes Chispas si mejoras tu marca.'
                          : run.storyNumber === STORY_LENGTH
                            ? 'Has conquistado el último cofre.'
                            : 'Este cofre abre el siguiente nivel.'}
                      </p>
                    ) : null}
                    <div className="reward-number">
                      <Sparkles /> {reward}
                      <small>
                        Chispas · {state.hits} golpe(s)
                        {run.mode === 'story'
                          ? ` · ${storyStars(state.hp)} ★`
                          : ''}
                      </small>
                    </div>
                    <button
                      className="m-primary"
                      onClick={claimed ? onNext : collect}
                    >
                      {claimed
                        ? run.mode === 'story'
                          ? run.storyNumber === STORY_LENGTH
                            ? 'Volver al refugio'
                            : `Ir al nivel ${run.storyNumber! + 1}`
                          : 'Siguiente pista'
                        : run.mode === 'story'
                          ? 'Guardar resultado'
                          : 'Recoger premio'}
                    </button>
                    {claimed ? (
                      <output className="claim-status">
                        {run.mode === 'story'
                          ? run.storyNumber === STORY_LENGTH
                            ? '¡Historia completada! Puedes volver por las 150 estrellas.'
                            : 'Progreso guardado. Siguiente nivel desbloqueado.'
                          : 'Premio guardado en este dispositivo.'}
                      </output>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p>¡Has superado la defensa de tu amigo!</p>
                    <button className="m-primary" onClick={onExit}>
                      Volver al lobby
                    </button>
                  </>
                )}
              </>
            ) : null}
            {error ? (
              <p className="m-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="m-text" onClick={onExit}>
              Salir al lobby
            </button>
          </section>
        </div>
      ) : null}
      {!overlay && demo ? (
        <div className="run-demo">
          <Bot size={15} />{' '}
          {run.mode === 'shared' ? 'Ruta del defensor' : 'Ruta del bot'} · sin
          recompensa
        </div>
      ) : null}
      {!overlay && error ? (
        <div className="run-demo" role="alert">
          {error}
        </div>
      ) : null}
      <footer className="run-controls">
        <div>
          <strong>
            {run.mode === 'story' ? `${run.storyNumber}. ` : ''}
            {run.level.name}
          </strong>
          <span>
            {state.phase === 'resetting'
              ? 'Nuevo intento…'
              : demo
                ? 'Observa los saltos'
                : 'Toca la pantalla o el botón'}
          </span>
        </div>
        <button
          className="jump-button"
          disabled={!loaded || demo || state.phase !== 'playing'}
          onPointerDown={(e) => {
            e.preventDefault();
            engine.current?.jump();
          }}
          onKeyDown={(e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
              e.preventDefault();
              engine.current?.jump();
            }
          }}
        >
          <ArrowUp size={24} /> SALTAR
        </button>
      </footer>
    </main>
  );
}
