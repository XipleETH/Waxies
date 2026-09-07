'use client';
import { useEffect, useState } from 'react';
import { Swords, ShieldCheck, Coins, Clock3, Users } from 'lucide-react';
import type { OnlineView, OnlineCommand } from '@/lib/online/types';
import { challengeCode, type RouteProof } from '@/lib/game/route-proof';
import { vaultLevel, type MobileProfile } from '@/lib/game/mobile-profile';
import type { RaidReplay } from '@/lib/game/raid-replay';
import styles from './online-panel.module.css';
export const REWARD_QUEUE = 'waxies.online-rewards.v1';
export async function onlineRequest(
  command?: OnlineCommand | { action: 'join'; name: string },
): Promise<OnlineView> {
  const res = await fetch('/api/online', {
    method: command ? 'POST' : 'GET',
    cache: 'no-store',
    headers: command ? { 'Content-Type': 'application/json' } : undefined,
    body: command ? JSON.stringify(command) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error ?? 'No se pudo conectar.');
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
  onAttack,
}: {
  profile: MobileProfile;
  onEdit: () => void;
  onAttack: (m: NonNullable<OnlineView['match']>) => void;
}) {
  const [view, setView] = useState<OnlineView | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [amount, setAmount] = useState('50');
  async function refresh() {
    try {
      const next = await onlineRequest();
      setView(next);
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
  }
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, []);
  async function act(
    command: OnlineCommand | { action: 'join'; name: string },
  ) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await onlineRequest(command);
      setView(next);
      if (
        (command.action === 'match' || command.action === 'revenge') &&
        next.match
      )
        onAttack(next.match);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function activate() {
    try {
      if (!profile.proof)
        throw Error('Completa tu mazmorra sin golpes y guarda la defensa.');
      const code = challengeCode({
        level: vaultLevel(profile),
        proof: profile.proof as RouteProof,
      });
      void act({ action: 'activate', amount: Number(amount), code });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const p = view?.player;
  return (
    <section className={styles.online} aria-label="Online asíncrono">
      <span className="m-eyebrow">GUERRA DE LOS COFRES</span>
      <h1>Incursiones.</h1>
      <p>Ataca un refugio aunque su guardián esté desconectado.</p>
      <div className={styles.modes}>
        <span>
          <Swords size={16} /> Individual
        </span>
        <span>
          <Users size={16} /> Dúos · Próximamente
        </span>
        <span>Clanes · Próximamente</span>
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
          <button onClick={onEdit}>Editar mi refugio</button>
          <button onClick={() => void refresh()}>Comprobar conexión</button>
        </div>
      ) : !view.registered ? (
        <div className={styles.card}>
          <h2>Tu nombre en Lunacia</h2>
          <p>
            Cuenta de este navegador, sin billetera. La beta comienza con 100
            Chispas online. Tus Chispas del Bazar se mantienen en este
            dispositivo.
          </p>
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
            onClick={() => void act({ action: 'join', name })}
          >
            Crear cuenta de prueba
          </button>
          <small>
            Conserva los datos de este navegador para mantener tu cuenta.
          </small>
        </div>
      ) : p ? (
        <>
          <div className={styles.balance}>
            <div>
              <Coins size={18} />
              <b>{p.available}</b>
              <span>Disponibles</span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <b>{p.chest}</b>
              <span>En tu cofre</span>
            </div>
            <div>
              <Clock3 size={18} />
              <b>{p.held}</b>
              <span>Retenidas</span>
            </div>
          </div>
          <p className={styles.muted}>
            {p.name} · Chispas online verificadas en servidor
          </p>
          <div className={styles.card}>
            <h2>{p.active ? 'Tu refugio está activo' : 'Activa tu refugio'}</h2>
            <p>
              {profile.proof
                ? 'Defensa local validada. Deposita Chispas para publicarla.'
                : 'Primero completa tu defensa local sin recibir golpes.'}
            </p>
            <label htmlFor="online-amount">Chispas en el cofre</label>
            <input
              type="number"
              id="online-amount"
              min={1}
              max={p.available + p.chest}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              disabled={busy || p.locked || !profile.proof}
              onClick={activate}
            >
              {p.active
                ? 'Actualizar defensa y depósito'
                : 'Depositar y activar'}
            </button>
            <div className={styles.actions}>
              <button disabled={busy} onClick={onEdit}>
                Editar refugio
              </button>
              <button
                disabled={busy || p.locked || p.chest === 0}
                onClick={() => void act({ action: 'withdraw' })}
              >
                Retirar y desactivar
              </button>
            </div>
            <small>
              Editar el borrador no cambia la defensa publicada hasta que la
              valides y actualices. Un ataque en curso bloquea el cofre durante
              un máximo de 10 minutos.
            </small>
          </div>
          <div className={styles.card}>
            <h2>Buscar una incursión</h2>
            <p>
              Cofres entre {Math.ceil(p.chest * 0.9)} y{' '}
              {Math.floor(p.chest * 1.1)} Chispas. {view.activePlayers ?? 0}{' '}
              refugios de otros jugadores disponibles.
            </p>
            {view.match ? (
              <>
                <p>
                  Hay un ataque reservado en otra vista. Si cerraste la partida,
                  abandónalo para liberar los cofres.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void act({ action: 'abandon', matchId: view.match!.id })
                  }
                >
                  Abandonar ataque
                </button>
              </>
            ) : (
              <button
                disabled={busy || !p.active || p.chest < 1 || p.locked}
                onClick={() => void act({ action: 'match' })}
              >
                Buscar rival · ±10 %
              </button>
            )}
            <small>
              El botín depende de tu salud al llegar. Queda retenido 24 horas o
              hasta resolver la única revancha.
            </small>
          </div>
          <div className={styles.card}>
            <h2>Botines y revanchas</h2>
            {view.loot?.length ? (
              view.loot.map((l) => (
                <article key={l.id} className={styles.event}>
                  <strong>
                    {l.incoming ? 'Robaste a' : 'Te atacó'} {l.opponent}
                  </strong>
                  <span>
                    {l.amount} Chispas ·{' '}
                    {l.status === 'held'
                      ? 'Retenidas hasta ' +
                        new Date(l.releaseAt).toLocaleString()
                      : l.status === 'recovered'
                        ? 'Recuperadas: ' + l.recovered
                        : 'Liberadas'}
                  </span>
                  {l.canRevenge ? (
                    <button
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
                Aquí aparecerán tus botines y las oportunidades de revancha.
              </p>
            )}
            <small>
              Puedes vengarte aunque tu cofre haya quedado vacío. Atacas la
              defensa que tenía el rival cuando te robó.
            </small>
          </div>
          <div className={styles.card}>
            <h2>Actividad</h2>
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
                </article>
              ))
            ) : (
              <p>Todavía no hay ataques.</p>
            )}
          </div>
          <button disabled={busy} onClick={() => void refresh()}>
            Actualizar actividad
          </button>
          <p className={styles.muted}>
            Historia aporta premios online por mejora; Práctica, por la mejor
            victoria de cada pista al día. Se validan al abrir Online. Las
            compras locales siguen usando el saldo del dispositivo durante esta
            beta.
          </p>
        </>
      ) : null}
    </section>
  );
}
