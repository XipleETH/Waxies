'use client';
import { useState } from 'react';
import { storyStars } from '@/lib/game/story-progress';
export function StoryRunMenu({
  phase,
  loaded,
  demo,
  claimed,
  number,
  title,
  hp,
  reward,
  error,
  proof,
  onEnter,
  onExit,
  onResume,
  onRestart,
  onFresh,
  onProof,
  onCollect,
  onNext,
}: {
  phase: string;
  loaded: boolean;
  demo: boolean;
  claimed: boolean;
  number: number;
  title: string;
  hp: number;
  reward: number;
  error: string;
  proof: boolean;
  onEnter: () => void;
  onExit: () => void;
  onResume: () => void;
  onRestart: () => void;
  onFresh: () => void;
  onProof: () => void;
  onCollect: () => void;
  onNext: () => void;
}) {
  const [help, setHelp] = useState(false);
  const button = (
    kind: string,
    label: string,
    action: () => void,
    disabled = false,
    aria = label,
  ) => (
    <button
      type="button"
      data-object={kind}
      data-label={label}
      aria-label={aria}
      onClick={action}
      disabled={disabled}
    >
      {label}
    </button>
  );
  return (
    <section
      className="story-run-menu"
      aria-label={
        phase === 'ready'
          ? 'Entrada al nivel'
          : phase === 'paused'
            ? 'Pausa'
            : 'Resultado'
      }
    >
      <div
        className="story-run-heading"
        data-object="title"
        data-label={
          phase === 'ready'
            ? title
            : phase === 'paused'
              ? 'Pausa'
              : phase === 'dead'
                ? 'Sin salud'
                : demo
                  ? 'Tu turno'
                  : 'Cofre abierto'
        }
        data-value={`NIVEL ${number} / 50`}
      >
        {title} · Nivel {number}
      </div>
      {help ? (
        <div className="story-run-help">
          <div data-object="jump" data-label="Toca" />
          <div data-object="next" data-label="Rebota" />
          <div data-object="heart" data-label="Esquiva" />
          <p>
            Toca para saltar y rebota en los muros. Cada golpe reinicia el
            intento y resta 20 de salud y de premio.
          </p>
        </div>
      ) : null}
      {phase === 'won' && !demo ? (
        <div
          className="story-run-loot"
          data-object="title"
          data-label={`+${reward} CHISPAS`}
          data-value={`${storyStars(hp)} ESTRELLAS${claimed ? ' · GUARDADO' : ''}`}
        >
          +{reward} Chispas · {storyStars(hp)} estrellas
          {claimed ? ' · Guardado' : ''}
        </div>
      ) : null}
      {demo ? (
        <p className="story-demo-note">Demostración · sin premio</p>
      ) : null}
      {error ? (
        <p className="m-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="story-menu-actions">
        {button('path', 'Camino', onExit)}
        {phase === 'ready'
          ? button('portal', loaded ? 'Entrar' : 'Cargando', onEnter, !loaded)
          : null}
        {phase === 'paused' ? button('play', 'Seguir', onResume) : null}
        {phase === 'paused'
          ? button(
              'retry',
              'Reintentar',
              onRestart,
              false,
              'Reintentar conservando salud',
            )
          : null}
        {phase === 'dead' || (phase === 'won' && demo)
          ? button('retry', 'Reintentar', onFresh)
          : null}
        {phase === 'won' && !demo
          ? button(
              claimed ? (number === 50 ? 'path' : 'next') : 'reward',
              claimed ? (number === 50 ? 'Camino' : 'Siguiente') : 'Recoger',
              claimed ? onNext : onCollect,
            )
          : null}
        {(phase === 'paused' || phase === 'dead') && proof
          ? button('bot', 'Ruta', onProof, false, 'Ver solución sin premio')
          : button('book', 'Ayuda', () => setHelp((v) => !v))}
      </div>
    </section>
  );
}
