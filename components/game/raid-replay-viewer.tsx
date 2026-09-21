'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useEffect, useRef, useState } from 'react';
import { GameObjects } from './game-objects';
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
  useLocale();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="replay-dialog" showCloseButton={false}>
        <DialogTitle className="sr-only">
          {translateText('Repetición del ataque')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {translateText('Ataque de ')}
          {props.match.attacker}
          {translateText(' a ')}
          {props.match.defender}
          {translateText(', con sus gestos grabados.')}
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
  useLocale();
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
    <section
      className="raid-viewer"
      aria-label={translateText('Repetición del ataque')}
    >
      <div className="raid-viewer-canvas" ref={host} />
      <header className="replay-hud">
        <button
          className="m-icon"
          onClick={onClose}
          data-object="close"
          data-label={translateText('Salir')}
          aria-label={translateText('Cerrar repetición')}
        >
          <ArrowLeft size={21} />
        </button>
        <div
          data-object="title"
          data-label={match.attacker}
          data-value={translateText('REPETICIÓN')}
        >
          <small>{translateText('REPETICIÓN')}</small>
          <strong>{match.attacker}</strong>
        </div>
        <span
          data-object="heart"
          data-value={translateText(state?.hp ?? 100)}
          aria-label={translateText(`Salud: ${state?.hp ?? 100}`)}
        >
          <Heart size={15} />
          {state?.hp ?? 100}
        </span>
      </header>
      <EmoteBubble event={event} />
      {!ready || error ? (
        <output className="replay-message">
          {translateText(error || 'Preparando Axie…')}
        </output>
      ) : null}
      {playback?.complete ? (
        <output
          className="replay-result"
          data-object="balance"
          data-value={translateText(match.amount)}
          aria-label={translateText(
            `${match.amount} Chispas, ${state?.phase === 'won' ? 'cofre alcanzado' : 'sin botín'}`,
          )}
        >
          <Sparkles size={22} />
          {match.amount}
          {translateText(' Chispas')}
          <small>
            {translateText(
              state?.phase === 'won' ? 'Cofre alcanzado' : 'Sin botín',
            )}
          </small>
        </output>
      ) : null}
      <footer className="replay-controls">
        <span>
          {translateText('Intento ')}
          {(playback?.attempt ?? 0) + 1}/{match.replay.attempts.length}
        </span>
        <button
          className="m-icon"
          disabled={!ready || playback?.complete}
          data-object={playback?.paused ? 'play' : 'pause'}
          data-label={translateText(playback?.paused ? 'Seguir' : 'Pausa')}
          onClick={() => engine.current?.pause()}
          aria-label={translateText(
            playback?.paused ? 'Continuar repetición' : 'Pausar repetición',
          )}
        >
          {playback?.paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        <button
          className="m-icon"
          disabled={!ready}
          data-object="retry"
          data-label={translateText('Repetir')}
          onClick={() => engine.current?.playRaidReplay(match.replay)}
          aria-label={translateText('Repetir ataque')}
        >
          <RotateCcw size={20} />
        </button>
      </footer>
      <GameObjects />
    </section>
  );
}
