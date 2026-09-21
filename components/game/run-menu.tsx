'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useState } from 'react';
import type { RunConfig } from './mobile-run';
import { PARTS } from '@/lib/game/catalog';
import { raidPowerDescription } from '@/lib/game/raid-powers';

export function RunMenu({
  run,
  phase,
  loaded,
  demo,
  claimed,
  submitting,
  hp,
  hits,
  reward,
  error,
  onEnter,
  onExit,
  onResume,
  onRestart,
  onFresh,
  onProof,
  onCollect,
  onNext,
  onSubmit,
}: {
  run: RunConfig;
  phase: string;
  loaded: boolean;
  demo: boolean;
  claimed: boolean;
  submitting: boolean;
  hp: number;
  hits: number;
  reward: number;
  error: string;
  onEnter: () => void;
  onExit: () => void;
  onResume: () => void;
  onRestart: () => void;
  onFresh: () => void;
  onProof: () => void;
  onCollect: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  useLocale();
  const [help, setHelp] = useState(false);
  const [tip, setTip] = useState<number | null>(null);
  const online = run.mode === 'online';
  const title =
    phase === 'ready'
      ? run.level.name
      : phase === 'paused'
        ? 'Un respiro'
        : phase === 'dead'
          ? 'Sin salud'
          : demo
            ? 'Tu turno'
            : 'Cofre encontrado';
  const mode = demo
    ? 'DEMOSTRACIÓN · SIN PREMIO'
    : online
      ? run.onlineKind === 'revenge'
        ? 'REVANCHA'
        : 'ATAQUE ONLINE'
      : run.mode === 'validate'
        ? 'TU DEFENSA'
        : run.mode === 'shared'
          ? 'RETO COMPARTIDO'
          : 'PRÁCTICA';
  const action = (
    kind: string,
    label: string,
    click: () => void,
    disabled = false,
    aria = label,
  ) => (
    <button
      type="button"
      data-object={kind}
      data-label={translateText(label)}
      onClick={click}
      disabled={disabled}
      aria-label={translateText(aria)}
    >
      {translateText(label)}
    </button>
  );
  return (
    <section
      className="object-run-menu"
      aria-label={translateText(
        phase === 'ready'
          ? 'Entrada a la partida'
          : phase === 'paused'
            ? 'Pausa'
            : 'Resultado',
      )}
    >
      <h1
        className="object-run-title"
        data-object="title"
        data-label={translateText(title)}
        data-value={translateText(mode)}
      >
        {translateText(title)} · {translateText(mode)}
      </h1>
      {phase === 'ready' ? (
        <div
          className="object-run-powers"
          aria-label={translateText('Poderes de la mazmorra')}
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, run.level.traps.length))}, minmax(0, 1fr))`,
          }}
        >
          {run.level.traps.map((t, i) => (
            <button
              key={i}
              type="button"
              data-object="power"
              data-value={t.part}
              data-label={translateText(PARTS[t.part].name)}
              aria-label={translateText('Cómo esquivar ' + PARTS[t.part].name)}
              aria-pressed={tip === i}
              onClick={() => setTip(tip === i ? null : i)}
            >
              {translateText(PARTS[t.part].name)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="object-run-notes">
        {phase !== 'ready' ? (
          <div
            className="object-run-emblem"
            data-object={
              phase === 'dead'
                ? 'heart'
                : phase === 'paused'
                  ? 'pause'
                  : 'reward'
            }
            data-value={translateText(phase === 'dead' ? '0' : undefined)}
            aria-hidden="true"
          />
        ) : null}
        {phase === 'ready' && tip !== null ? (
          <p>
            {translateText(raidPowerDescription(run.level.traps[tip].part))}
          </p>
        ) : null}
        {phase === 'ready' && tip === null ? (
          <p>
            {translateText('Toca un poder para descubrir cómo esquivarlo.')}
          </p>
        ) : null}
        {help ? (
          <div className="story-run-help">
            <div
              data-object="jump"
              data-label={translateText('Toca')}
              aria-label={translateText('Toca para saltar')}
            />
            <div
              data-object="next"
              data-label={translateText('Rebota')}
              aria-label={translateText('Rebota en los muros')}
            />
            <div
              data-object="heart"
              data-label={translateText('Esquiva')}
              aria-label={translateText('Esquiva los poderes')}
            />
            <p>
              {translateText(
                'Toca la pantalla o pulsa Espacio para saltar. Rebota en los muros. Cada golpe resta 20 de salud.',
              )}
            </p>
            {run.proof && loaded
              ? action('bot', 'Ver ruta', onProof, false, 'Ver ruta sin premio')
              : null}
          </div>
        ) : null}
        {phase === 'ready' && online ? (
          <p>
            {translateText(
              'El botín depende de tu salud al llegar. Queda retenido para la revancha.',
            )}
          </p>
        ) : null}
        {phase === 'ready' && run.mode === 'validate' ? (
          <p>{translateText('Llega sin golpes para guardar tu defensa.')}</p>
        ) : null}
        {phase === 'paused' ? (
          <p>{translateText('Las trampas también están en pausa.')}</p>
        ) : null}
        {phase === 'dead' ? (
          <p>
            {translateText(
              online
                ? 'Ataque terminado sin botín. Confirma el resultado para cerrarlo.'
                : 'Respira y vuelve a intentarlo.',
            )}
          </p>
        ) : null}
        {phase === 'won' && demo ? (
          <p>{translateText('Ruta completada sin golpes. Ahora prueba tú.')}</p>
        ) : null}
        {phase === 'won' && !demo && run.mode === 'validate' ? (
          <p>
            {translateText(
              hits
                ? 'Necesitas un intento sin golpes para validar.'
                : 'Defensa validada. Lista para guardar.',
            )}
          </p>
        ) : null}
        {phase === 'won' && !demo && run.mode === 'shared' ? (
          <p>{translateText('¡Has superado la defensa de tu amigo!')}</p>
        ) : null}
        {phase === 'won' && !demo && (online || run.mode === 'practice') ? (
          <>
            <div
              className="object-run-reward"
              data-object="balance"
              data-value={translateText(reward)}
              aria-label={translateText(`${reward} Chispas`)}
            >
              {reward}
              {translateText(' Chispas')}
            </div>
            <p>
              {hp}
              {translateText(' de salud · ')}
              {hits}
              {translateText(' golpes')}
            </p>
            {online ? (
              <p>
                {translateText(
                  claimed
                    ? 'Resultado confirmado.'
                    : run.onlineKind === 'revenge'
                      ? 'Recuperas como máximo lo perdido.'
                      : 'Botín retenido 24 horas o hasta resolver la revancha.',
                )}
              </p>
            ) : null}
            {claimed ? (
              <output>{translateText('Premio guardado.')}</output>
            ) : null}
          </>
        ) : null}
        {error ? (
          <p role="alert" className="m-error">
            {translateText(error)}
          </p>
        ) : null}
      </div>
      <div className="object-run-actions">
        {action('home', 'Lobby', onExit, submitting, 'Salir al lobby')}
        {phase === 'ready'
          ? action(
              'portal',
              loaded ? 'Entrar' : 'Cargando',
              onEnter,
              !loaded,
              'Entrar a la sala',
            )
          : null}
        {phase === 'paused' ? (
          <>
            {action('play', 'Seguir', onResume)}
            {action(
              'retry',
              'Reiniciar',
              onRestart,
              false,
              'Volver al inicio conservando salud',
            )}
          </>
        ) : null}
        {phase === 'dead'
          ? online
            ? action(
                claimed ? 'swords' : 'save',
                claimed ? 'Online' : submitting ? 'Guardando' : 'Cerrar ataque',
                claimed ? onExit : onSubmit,
                submitting,
                claimed ? 'Volver a Online' : 'Cerrar ataque sin botín',
              )
            : action('retry', 'Reintentar', onFresh)
          : null}
        {phase === 'won'
          ? demo
            ? action('play', 'Mi turno', onFresh)
            : online
              ? action(
                  claimed ? 'swords' : 'reward',
                  claimed ? 'Online' : submitting ? 'Verificando' : 'Confirmar',
                  claimed ? onExit : onSubmit,
                  submitting,
                  claimed ? 'Volver a Online' : 'Confirmar resultado',
                )
              : run.mode === 'validate'
                ? action(
                    hits ? 'retry' : 'save',
                    hits ? 'Sin golpes' : 'Guardar',
                    hits ? onFresh : onCollect,
                  )
                : run.mode === 'shared'
                  ? action('retry', 'Otra vez', onFresh)
                  : action(
                      claimed ? 'next' : 'reward',
                      claimed ? 'Siguiente' : 'Recoger',
                      claimed ? onNext : onCollect,
                    )
          : null}
        {phase === 'ready'
          ? action('book', help ? 'Cerrar ayuda' : 'Ayuda', () =>
              setHelp((v) => !v),
            )
          : run.proof
            ? action(
                'bot',
                'Ver ruta',
                onProof,
                submitting,
                'Ver ruta sin premio',
              )
            : null}
      </div>
    </section>
  );
}
