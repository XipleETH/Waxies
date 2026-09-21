'use client';
import { AccountAccess } from './account-access';
import { useCallback, useEffect, useState } from 'react';
import type { OnlineView, OnlineCommand } from '@/lib/online/types';
import type { MobileProfile } from '@/lib/game/mobile-profile';
import type { RaidReplay } from '@/lib/game/raid-replay';
import styles from './online-panel.module.css';
import { haptic } from '@/lib/game/haptics';
import { ObjectDialogContent } from './object-dialog';
import { ObjectMenu } from './object-menu';
import { RaidReplayViewer } from './raid-replay-viewer';
import type { MatchReplayView } from '@/lib/online/types';
import { Dialog } from '@/components/ui/dialog';
export const REWARD_QUEUE = 'waxies.online-rewards.v1';
export async function onlineRequest(
  command?:
    | OnlineCommand
    | { action: 'join'; name: string; starterId?: string },
): Promise<OnlineView> {
  const res = await fetch('/api/online', {
    method: command ? 'POST' : 'GET',
    cache: 'no-store',
    headers: command ? { 'Content-Type': 'application/json' } : undefined,
    body: command ? JSON.stringify(command) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error ?? 'No se pudo conectar.');
  if (command) window.dispatchEvent(new Event('online-balance-changed'));
  return data;
}
export function queueOnlineReward(
  course: string,
  kind: 'story' | 'practice',
  replay: RaidReplay,
) {
  try {
    const queue = JSON.parse(
      localStorage.getItem(REWARD_QUEUE) || '[]',
    ) as OnlineCommand[];
    queue.push({ action: 'reward', course, kind, replay });
    localStorage.setItem(REWARD_QUEUE, JSON.stringify(queue.slice(-20)));
  } catch {}
}
export function OnlinePanel({
  profile,
  onEdit,
  onStarter,
  onAttack,
}: {
  profile: MobileProfile;
  onEdit: () => void;
  onStarter: (id: string) => void;
  onAttack: (m: NonNullable<OnlineView['match']>) => void;
}) {
  const [view, setView] = useState<OnlineView | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [replayMatch, setReplayMatch] = useState<MatchReplayView | null>(null),
    [panel, setPanel] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const next = await onlineRequest();
      setView(next);
      if (next.starterId) onStarter(next.starterId);
      if (next.registered) {
        const queue = JSON.parse(
          localStorage.getItem(REWARD_QUEUE) || '[]',
        ) as OnlineCommand[];
        while (queue.length) {
          try {
            setView(await onlineRequest(queue[0]));
            queue.shift();
            localStorage.setItem(REWARD_QUEUE, JSON.stringify(queue));
          } catch {
            break;
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [onStarter]);
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  async function act(
    command:
      | OnlineCommand
      | { action: 'join'; name: string; starterId?: string },
  ) {
    if (busy) return;
    if (command.action === 'match' || command.action === 'revenge')
      haptic('search');
    setBusy(true);
    setError('');
    try {
      const next = await onlineRequest(command);
      setView(next);
      if (next.starterId) onStarter(next.starterId);
      if (command.action === 'join') setPanel(null);
      if (
        (command.action === 'match' || command.action === 'revenge') &&
        next.match
      ) {
        haptic('match');
        onAttack(next.match);
      }
    } catch (e) {
      haptic('error');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function watchReplay(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        '/api/online?replay=' + encodeURIComponent(id),
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error ?? 'No se pudo cargar la repetición.');
      setReplayMatch(data);
      setPanel(null);
    } catch (e) {
      setError((e as Error).message);
      setPanel(null);
    } finally {
      setBusy(false);
    }
  }
  const p = view?.player;
  if (replayMatch)
    return (
      <RaidReplayViewer
        match={replayMatch}
        onClose={() => {
          setReplayMatch(null);
          setPanel('activity');
        }}
      />
    );
  return (
    <section
      className={styles.online + ' online-object-room'}
      aria-label="Online asíncrono"
    >
      <div
        className="object-room-title"
        data-object="title"
        data-label="Online"
        data-value="Guerra de los cofres"
      >
        <span>GUERRA DE LOS COFRES</span>
      </div>
      {error ? <output className={styles.error}>{error}</output> : null}
      {!view ? (
        <p>Conectando con los refugios…</p>
      ) : !view.configured ? (
        <div className={styles.card}>
          <h2>Preparando el servidor</h2>
          <p>
            Falta conectar la base de datos para compartir cofres y resultados
            entre jugadores. Puedes preparar y validar tu refugio.
          </p>
          <button data-object="map" data-label="Refugio" onClick={onEdit}>
            Editar mi refugio
          </button>
          <button
            data-object="retry"
            data-label="Actualizar"
            onClick={() => void refresh()}
          >
            Comprobar conexión
          </button>
        </div>
      ) : !view.registered ? (
        <>
          <ObjectMenu
            label="Entrar a Online"
            actions={[
              {
                id: 'join',
                label: 'Entrar',
                kind: 'portal',
                onClick: () => setPanel('join'),
              },
              { id: 'vault', label: 'Refugio', kind: 'chest', onClick: onEdit },
            ]}
          />
          <Dialog
            open={panel === 'join'}
            onOpenChange={(open) => {
              if (!open) setPanel(null);
            }}
          >
            <ObjectDialogContent
              className="online-object-dialog online-join-dialog"
              title="Entrar"
              description="Tu nombre en Lunacia"
              onClose={() => setPanel(null)}
            >
              <div className={styles.online}>
                <div className={styles.card}>
                  <div
                    className="online-join-avatar"
                    data-object="axie"
                    aria-hidden="true"
                  />
                  <p>
                    Refugio listo con 4 trampas y 100 Chispas en el cofre. Sin
                    billetera.
                  </p>
                  <AccountAccess />
                  <label htmlFor="online-name">Nombre</label>
                  <input
                    id="online-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={24}
                    autoComplete="off"
                  />
                  <button
                    disabled={busy || name.trim().length < 2}
                    data-object="portal"
                    data-label="Crear"
                    onClick={() =>
                      void act({
                        action: 'join',
                        name,
                        starterId: profile.starterId,
                      })
                    }
                  >
                    Crear cuenta de prueba
                  </button>
                  <small>
                    Tu cuenta se conserva en este navegador. El saldo del Bazar
                    es independiente.
                  </small>
                </div>
              </div>
            </ObjectDialogContent>
          </Dialog>
        </>
      ) : p ? (
        <>
          <ObjectMenu
            label="Acciones Online"
            actions={[
              {
                id: 'raid',
                label: 'Atacar',
                kind: 'swords',
                onClick: () => setPanel('raid'),
              },
              {
                id: 'loot',
                label: 'Revancha',
                kind: 'revenge',
                onClick: () => setPanel('loot'),
                badge: String(
                  view.loot?.filter((l) => l.canRevenge).length ?? 0,
                ),
              },
              {
                id: 'activity',
                label: 'Actividad',
                kind: 'book',
                onClick: () => setPanel('activity'),
              },
            ]}
          />
          <Dialog
            open={panel === 'raid'}
            onOpenChange={(open) => {
              if (!open) setPanel(null);
            }}
          >
            <ObjectDialogContent
              className="online-object-dialog"
              title="Atacar"
              description="Guerra de los cofres"
              onClose={() => setPanel(null)}
            >
              <div className={styles.online}>
                <div className={styles.card}>
                  <div
                    className="matchmaking-emblem"
                    data-object="swords"
                    aria-hidden="true"
                  />
                  <h2>Elige tu próximo desafío</h2>
                  <div className="matchmaking-stats">
                    <div>
                      <b>{p.rank ? `#${p.rank}` : '—'}</b>
                      <span>Tu puesto</span>
                    </div>
                    <div>
                      <b>{view.activePlayers ?? 0}</b>
                      <span>Rivales disponibles</span>
                    </div>
                  </div>
                  <p>
                    Cofres entre {Math.ceil(p.chest * 0.9)} y{' '}
                    {Math.floor(p.chest * 1.1)} Chispas aseguradas.
                  </p>
                  {view.match ? (
                    <>
                      <p>
                        Hay un ataque reservado en otra vista. Si cerraste la
                        partida, abandónalo para liberar los cofres.
                      </p>
                      <button
                        data-object="close"
                        data-label="Abandonar"
                        disabled={busy}
                        onClick={() =>
                          void act({
                            action: 'abandon',
                            matchId: view.match!.id,
                          })
                        }
                      >
                        Abandonar ataque
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busy || !p.active || p.chest < 1 || p.locked}
                      data-object="swords"
                      data-label="Buscar rival"
                      onClick={() => void act({ action: 'match' })}
                    >
                      Buscar rival · ±10 %
                    </button>
                  )}
                  <small>
                    Un ataque por rival cada 24 h, desde que lo inicias. El
                    rival también puede atacarte una vez y cada robo permite una
                    revancha. El botín espera en el cofre temporal hasta
                    resolverla o vencer sus 24 h.
                  </small>
                </div>
              </div>
            </ObjectDialogContent>
          </Dialog>
          <Dialog
            open={panel === 'loot'}
            onOpenChange={(open) => {
              if (!open) setPanel(null);
            }}
          >
            <ObjectDialogContent
              className="online-object-dialog"
              title="Revancha"
              description="Guerra de los cofres"
              onClose={() => setPanel(null)}
            >
              <div className={styles.online}>
                <div className={styles.card}>
                  <div
                    className="matchmaking-emblem"
                    data-object="revenge"
                    aria-hidden="true"
                  />
                  <h2>Cofre temporal de revancha</h2>
                  {view.loot?.length ? (
                    view.loot.map((l) => (
                      <article key={l.id} className={styles.event}>
                        <strong>
                          {l.incoming ? 'Robaste a' : 'Te atacó'} {l.opponent}
                        </strong>
                        <span>
                          {l.amount} Chispas ·{' '}
                          {l.status === 'held'
                            ? 'Revancha disponible hasta ' +
                              new Date(l.releaseAt).toLocaleString()
                            : l.status === 'recovered'
                              ? 'Al defensor: ' +
                                l.recovered +
                                ' · Al atacante: ' +
                                (l.amount - l.recovered)
                              : 'Aseguradas en el cofre del atacante'}
                        </span>
                        {l.canRevenge ? (
                          <button
                            data-object="revenge"
                            data-label="Revancha"
                            disabled={busy || p.locked}
                            onClick={() =>
                              void act({ action: 'revenge', lootId: l.id })
                            }
                          >
                            Contraatacar · una oportunidad
                          </button>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p>
                      Aquí aparecerán tus botines y las oportunidades de
                      revancha.
                    </p>
                  )}
                  <small>
                    Puedes vengarte aunque tu cofre haya quedado vacío. Atacas
                    la defensa que tenía el rival cuando te robó. Con 100 de
                    salud recuperas todo; con 80, el 80 %. Lo recuperado va a tu
                    cofre y el resto al del atacante. El saldo temporal no suma
                    al ranking.
                  </small>
                </div>
              </div>
            </ObjectDialogContent>
          </Dialog>
          <Dialog
            open={panel === 'activity'}
            onOpenChange={(open) => {
              if (!open) setPanel(null);
            }}
          >
            <ObjectDialogContent
              className="online-object-dialog"
              title="Actividad"
              description="Guerra de los cofres"
              onClose={() => setPanel(null)}
            >
              <div className={styles.online}>
                <div className={styles.card}>
                  <h2>Clasificación de cofres</h2>
                  <p>
                    Tu puesto: {p.rank ? `#${p.rank}` : 'sin clasificar'}. Solo
                    cuenta el saldo asegurado del cofre.
                  </p>
                  <ol
                    className="league-ranking"
                    aria-label="Ranking de Chispas aseguradas"
                  >
                    {view.ranking?.map((entry) => (
                      <li
                        key={entry.id}
                        aria-current={entry.id === p.id ? 'true' : undefined}
                      >
                        <b>#{entry.rank}</b>
                        <span>{entry.name}</span>
                        <strong aria-label={`${entry.chest} Chispas`}>
                          ✦ {entry.chest}
                        </strong>
                      </li>
                    ))}
                  </ol>
                  <h2>Últimos combates</h2>
                  <button
                    disabled={busy}
                    data-object="retry"
                    data-label="Actualizar"
                    onClick={() => void refresh()}
                  >
                    Actualizar
                  </button>
                  {view.history?.length ? (
                    view.history.map((m) => (
                      <article key={m.id} className={styles.event}>
                        <strong>
                          {m.attacking ? 'Atacaste a' : 'Te atacó'} {m.opponent}
                        </strong>
                        <span>
                          {m.kind === 'revenge' ? 'Revancha' : 'Incursión'} ·{' '}
                          {{
                            pending: 'En curso',
                            won: 'Cofre alcanzado',
                            lost: 'Sin botín',
                            expired: 'Tiempo agotado',
                            abandoned: 'Abandonado',
                          }[m.status] ?? m.status}{' '}
                          · {m.amount} Chispas
                        </span>
                        {m.hasReplay ? (
                          <button
                            disabled={busy}
                            data-object="play"
                            data-label="Repetición"
                            onClick={() => void watchReplay(m.id)}
                          >
                            Ver repetición
                          </button>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p>Todavía no hay ataques.</p>
                  )}
                  <details className="online-guide">
                    <summary>Cómo funciona</summary>
                    <p className={styles.muted}>
                      Historia aporta premios online por mejora; Práctica, por
                      la mejor victoria de cada pista al día. Se validan al
                      abrir Online. Las compras locales siguen usando el saldo
                      del dispositivo durante esta beta.
                    </p>
                  </details>
                </div>
              </div>
            </ObjectDialogContent>
          </Dialog>
        </>
      ) : null}
    </section>
  );
}
