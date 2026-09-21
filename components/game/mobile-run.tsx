'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useEffect, useRef, useState } from 'react';
import { RunMenu } from './run-menu';
import { GameObjects } from './game-objects';
import { StoryRunMenu } from './story-run-menu';
import { EmoteBubble, EmotePicker } from './emotes';
import { Heart } from 'lucide-react';
import { createState, type Dungeon } from '@/lib/game/physics';
import type { Engine } from '@/lib/game/scene';
import { verifyRoute, type RouteProof } from '@/lib/game/route-proof';
import type { RaidReplay } from '@/lib/game/raid-replay';
import type { EmoteEvent } from '@/lib/game/emotes';
import { randomAxie } from '@/lib/game/random-axie';
import type { AxieLoadout } from '@/lib/game/axie';
export interface RunConfig {
  id: string;
  level: Dungeon;
  proof?: RouteProof;
  mode: 'practice' | 'validate' | 'shared' | 'story' | 'online';
  onlineId?: string;
  onlineLimit?: number;
  opponent?: string;
  onlineKind?: 'raid' | 'revenge';
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
  onOnline,
}: {
  run: RunConfig;
  onExit: () => void;
  onNext: () => void;
  onClaim: (id: string, hp: number, replay: RaidReplay) => void;
  onOnline?: (replay: RaidReplay) => Promise<number>;
  onValidate: (proof: RouteProof) => void;
}) {
  useLocale();
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null),
    handled = useRef(false);
  const [state, setState] = useState(() => createState(run.level)),
    [gesture, setGesture] = useState<{
      event: EmoteEvent | null;
      wait: number;
    }>({ event: null, wait: 0 }),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [demo, setDemo] = useState(false),
    [claimed, setClaimed] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [onlineAmount, setOnlineAmount] = useState<number | null>(null);
  useEffect(() => {
    let stopped = false;
    const appearance = run.axie ?? randomAxie();
    import('@/lib/game/scene')
      .then(({ createEngine }) => {
        if (stopped || !host.current) return;
        const game = createEngine(
          host.current,
          (s) => {
            if (!stopped) {
              setState(s);
              if (run.mode === 'online')
                setGesture({
                  event: engine.current?.getEmote() ?? null,
                  wait: engine.current?.getEmoteWait() ?? 0,
                });
            }
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
        onClaim(run.id, s.hp, game.getRaidReplay());
        handled.current = true;
        setClaimed(true);
      } catch {
        setError(
          'No se pudo guardar el premio. Libera espacio e inténtalo otra vez.',
        );
      }
    }
  }
  async function submitOnline() {
    if (!onOnline || !engine.current || submitting || handled.current) return;
    setSubmitting(true);
    setError('');
    try {
      const amount = await onOnline(engine.current.getRaidReplay());
      handled.current = true;
      setOnlineAmount(amount);
      setClaimed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
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
  const hudReward = demo
    ? 0
    : run.mode === 'online'
      ? Math.floor(((run.onlineLimit ?? 0) * state.hp) / 100)
      : rewards
        ? reward
        : 0;
  return (
    <main
      className="mobile-run is-story-objects"
      aria-label={translateText('Partida vertical')}
    >
      <div
        className="story-vitals"
        aria-label={translateText('Estado de la partida')}
      >
        <div
          data-object="heart"
          data-value={translateText(state.hp)}
          aria-label={translateText(`Salud: ${state.hp} de 100`)}
        >
          {translateText('Salud ')}
          {state.hp}
        </div>
        <div
          data-object="title"
          data-label={translateText(
            run.mode === 'story'
              ? `${run.storyNumber} / 50`
              : demo
                ? 'Ruta'
                : run.mode === 'online'
                  ? 'Online'
                  : run.mode === 'validate'
                    ? 'Validación'
                    : run.mode === 'shared'
                      ? 'Reto'
                      : 'Práctica',
          )}
        />
        <div
          data-object="balance"
          data-value={translateText(hudReward)}
          aria-label={translateText(`Premio: ${hudReward} Chispas`)}
        />
      </div>
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
      {run.mode === 'online' ? (
        <>
          <EmoteBubble event={gesture.event} />
          <EmotePicker
            wait={gesture.wait}
            onSend={(id) => {
              const sent = engine.current?.sendEmote(id) ?? false;
              if (sent)
                setGesture({
                  event: engine.current?.getEmote() ?? null,
                  wait: engine.current?.getEmoteWait() ?? 0,
                });
              return sent;
            }}
            disabled={
              !loaded ||
              claimed ||
              submitting ||
              !['playing', 'won', 'dead'].includes(state.phase)
            }
          />
        </>
      ) : null}
      {state.phase === 'resetting' ? (
        <output className="run-hit">
          <Heart size={24} />
          {translateText(' −20 salud')}
          {translateText(' ')}
          <small>
            {translateText(state.reason)}
            {translateText(' · Volvemos al inicio')}
          </small>
        </output>
      ) : null}
      {overlay && run.mode === 'story' ? (
        <StoryRunMenu
          phase={state.phase}
          loaded={loaded}
          demo={demo}
          claimed={claimed}
          number={run.storyNumber ?? 1}
          title={translateText(run.level.name)}
          hp={state.hp}
          reward={reward}
          error={error}
          proof={!!run.proof}
          onEnter={start}
          onExit={onExit}
          onResume={() => engine.current?.pause()}
          onRestart={() => engine.current?.restart()}
          onFresh={fresh}
          onProof={showProof}
          onCollect={collect}
          onNext={onNext}
        />
      ) : overlay ? (
        <RunMenu
          run={run}
          phase={state.phase}
          loaded={loaded}
          demo={demo}
          claimed={claimed}
          submitting={submitting}
          hp={state.hp}
          hits={state.hits}
          reward={
            run.mode === 'online'
              ? (onlineAmount ??
                Math.floor(((run.onlineLimit ?? 0) * state.hp) / 100))
              : reward
          }
          error={error}
          onEnter={start}
          onExit={onExit}
          onResume={() => engine.current?.pause()}
          onRestart={() => engine.current?.restart()}
          onFresh={fresh}
          onProof={showProof}
          onCollect={collect}
          onNext={onNext}
          onSubmit={submitOnline}
        />
      ) : null}
      {!overlay && demo ? (
        <div
          className="story-demo-mark"
          data-object="bot"
          data-label={translateText('Sin premio')}
          aria-label={translateText('Demostración sin premio')}
        >
          {translateText('Sin premio')}
        </div>
      ) : null}
      {!overlay && error ? (
        <div className="run-demo" role="alert">
          {translateText(error)}
        </div>
      ) : null}
      <>
        {!overlay ? (
          <div className="story-play-controls">
            <button
              data-object={run.mode === 'story' ? 'path' : 'home'}
              data-label={translateText(
                run.mode === 'story' ? 'Camino' : 'Lobby',
              )}
              aria-label={translateText(
                run.mode === 'story' ? 'Volver al camino' : 'Volver al lobby',
              )}
              onClick={onExit}
            >
              {translateText('Camino')}
            </button>
            <button
              data-object="jump"
              data-label={translateText('Saltar')}
              aria-label={translateText('Saltar')}
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
              {translateText('Saltar')}
            </button>
            <button
              data-object="pause"
              data-label={translateText('Pausa')}
              aria-label={translateText('Pausar partida')}
              disabled={!loaded || state.phase !== 'playing'}
              onClick={() => engine.current?.pause()}
            >
              {translateText('Pausa')}
            </button>
          </div>
        ) : null}
        <GameObjects />
      </>
    </main>
  );
}
