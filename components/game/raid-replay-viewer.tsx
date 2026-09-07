'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Heart,
  Sparkles,
} from 'lucide-react';
import type { MatchReplayView } from '@/lib/online/types';
import type { Engine } from '@/lib/game/scene';
import { EmoteBubble } from './emotes';
import type { EmoteEvent } from '@/lib/game/emotes';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function RaidReplayViewer(props: {
  match: MatchReplayView;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="replay-dialog" showCloseButton={false}>
        <DialogTitle className="sr-only">Repetición del ataque</DialogTitle>
        <DialogDescription className="sr-only">
          Ataque de {props.match.attacker} a {props.match.defender}, con sus
          gestos grabados.
        </DialogDescription>
        <ReplayScene {...props} />
      </DialogContent>
    </Dialog>
  );
}
function ReplayScene({
  match,
  onClose,
}: {
  match: MatchReplayView;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null);
  const [snapshot, setSnapshot] = useState<{
      hp: number;
      phase: string;
      playback: ReturnType<Engine['getPlayback']>;
      event: EmoteEvent | null;
    }>({ hp: 100, phase: 'ready', playback: null, event: null }),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let stopped = false,
      game: Engine | undefined;
    import('@/lib/game/scene')
      .then(({ createEngine }) => {
        if (stopped || !host.current) return;
        game = createEngine(
          host.current,
          (s) => {
            if (!stopped)
              setSnapshot({
                hp: s.hp,
                phase: s.phase,
                playback: game?.getPlayback() ?? null,
                event: game?.getEmote() ?? null,
              });
          },
          async (problem) => {
            if (stopped || !game) return;
            if (problem) {
              setError(problem);
              return;
            }
            game.setLevel(match.level);
            if (match.replay.runnerGenes)
              await game.setAxie({
                genes: match.replay.runnerGenes,
                class: match.level.runnerClass ?? 'Beast',
                name: match.attacker,
              });
            if (stopped) return;
            game.playRaidReplay(match.replay);
            setReady(true);
          },
        );
        engine.current = game;
      })
      .catch(() => {
        if (!stopped) setError('No se pudo abrir la repetición 3D.');
      });
    return () => {
      stopped = true;
      game?.dispose();
      engine.current = null;
    };
  }, [match]);
  const { playback, event, ...state } = snapshot;
  return (
    <section className="raid-viewer" aria-label="Repetición del ataque">
      <div className="raid-viewer-canvas" ref={host} />
      <header className="replay-hud">
        <button
          className="m-icon"
          onClick={onClose}
          aria-label="Cerrar repetición"
        >
          <ArrowLeft size={21} />
        </button>
        <div>
          <small>REPETICIÓN</small>
          <strong>{match.attacker}</strong>
        </div>
        <span>
          <Heart size={15} />
          {state?.hp ?? 100}
        </span>
      </header>
      <EmoteBubble event={event} />
      {!ready || error ? (
        <output className="replay-message">
          {error || 'Preparando Axie…'}
        </output>
      ) : null}
      {playback?.complete ? (
        <output className="replay-result">
          <Sparkles size={22} />
          {match.amount} Chispas
          <small>
            {state?.phase === 'won' ? 'Cofre alcanzado' : 'Sin botín'}
          </small>
        </output>
      ) : null}
      <footer className="replay-controls">
        <span>
          Intento {(playback?.attempt ?? 0) + 1}/{match.replay.attempts.length}
        </span>
        <button
          className="m-icon"
          disabled={!ready || playback?.complete}
          onClick={() => engine.current?.pause()}
          aria-label={
            playback?.paused ? 'Continuar repetición' : 'Pausar repetición'
          }
        >
          {playback?.paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        <button
          className="m-icon"
          disabled={!ready}
          onClick={() => engine.current?.playRaidReplay(match.replay)}
          aria-label="Repetir ataque"
        >
          <RotateCcw size={20} />
        </button>
      </footer>
    </section>
  );
}
