import { decodeChallenge } from '../game/route-proof';
import { verifyRaidReplay } from '../game/raid-replay';
import {
  REVENGE_MS,
  MATCH_MS,
  type OnlineState,
  type Player,
  type Match,
  type OnlineCommand,
  type OnlineView,
} from './types';
import story from '../game/data/story-courses.json';
import practice from '../game/data/verified-courses.json';
import type { Dungeon } from '../game/physics';
function fail(message: string): never {
  throw Error(message);
}
function requireAvailable(p: Player) {
  if (p.lock) fail('Termina tu ataque pendiente antes de cambiar el cofre.');
}
function unlock(s: OnlineState, m: Match) {
  for (const id of [m.attacker, m.defender])
    if (s.players[id]?.lock === m.id) delete s.players[id].lock;
}
function release(s: OnlineState, id: string) {
  const l = s.loot[id];
  if (l?.status === 'held') {
    s.players[l.winner].available += l.amount;
    l.status = 'released';
  }
}
export function settle(s: OnlineState, now: number) {
  for (const m of Object.values(s.matches))
    if (m.status === 'pending' && m.expires <= now) {
      m.status = 'expired';
      unlock(s, m);
      if (m.kind === 'revenge' && m.lootId) release(s, m.lootId);
    }
  for (const l of Object.values(s.loot))
    if (l.status === 'held' && l.releaseAt <= now && !l.revengeMatch)
      release(s, l.id);
}
export function applyOnline(
  s: OnlineState,
  id: string,
  command: OnlineCommand,
  now: number,
  uid: () => string,
): void {
  settle(s, now);
  const p = s.players[id];
  if (!p) fail('Tu sesión no está disponible.');
  switch (command.action) {
    case 'name': {
      const name = command.name?.trim();
      if (typeof name !== 'string' || name.length < 2 || name.length > 24)
        fail('El nombre debe tener entre 2 y 24 caracteres.');
      p.name = name;
      break;
    }
    case 'activate': {
      requireAvailable(p);
      if (
        !Number.isSafeInteger(command.amount) ||
        command.amount < 1 ||
        command.amount > 1000000
      )
        fail('Elige una cantidad válida de Chispas.');
      const c = decodeChallenge(command.code);
      if (
        !c.level.freePlacement ||
        c.level.guardianGenes?.length !== 1 ||
        c.level.traps.length > 4
      )
        fail('Online individual requiere un guardián y hasta cuatro trampas.');
      if (command.amount > p.available + p.chest)
        fail('No tienes suficientes Chispas disponibles.');
      p.available += p.chest - command.amount;
      p.chest = command.amount;
      p.defense = c;
      p.active = true;
      break;
    }
    case 'withdraw':
      requireAvailable(p);
      p.available += p.chest;
      p.chest = 0;
      p.active = false;
      break;
    case 'match': {
      requireAvailable(p);
      if (!p.active || !p.defense || p.chest < 1)
        fail('Activa tu mazmorra validada y coloca Chispas en el cofre.');
      const candidates = Object.values(s.players).filter(
        (q) =>
          q.id !== id &&
          q.active &&
          q.defense &&
          q.chest > 0 &&
          !q.lock &&
          q.chest * 100 >= p.chest * 90 &&
          q.chest * 100 <= p.chest * 110,
      );
      candidates.sort(
        (a, b) =>
          Math.abs(a.chest - p.chest) - Math.abs(b.chest - p.chest) ||
          a.created - b.created,
      );
      const rival =
        candidates[
          Math.floor(
            Number.parseInt(uid().replaceAll('-', '').slice(0, 6), 16) %
              Math.max(1, candidates.length),
          )
        ];
      if (!rival)
        fail(
          'No hay rivales con cofres dentro de ±10 %. Conservas todas tus Chispas; vuelve más tarde.',
        );
      const matchId = uid();
      s.matches[matchId] = {
        id: matchId,
        attacker: id,
        defender: rival.id,
        kind: 'raid',
        level: structuredClone(rival.defense!.level),
        counterLevel: structuredClone(p.defense.level),
        limit: rival.chest,
        created: now,
        expires: now + MATCH_MS,
        status: 'pending',
      };
      p.lock = matchId;
      rival.lock = matchId;
      break;
    }
    case 'revenge': {
      requireAvailable(p);
      const l = s.loot[command.lootId];
      if (
        !l ||
        l.victim !== id ||
        l.status !== 'held' ||
        l.revengeMatch ||
        l.releaseAt <= now
      )
        fail('Esta revancha ya no está disponible.');
      const matchId = uid();
      s.matches[matchId] = {
        id: matchId,
        attacker: id,
        defender: l.winner,
        kind: 'revenge',
        level: structuredClone(l.counterLevel),
        counterLevel: structuredClone(l.counterLevel),
        limit: l.amount,
        lootId: l.id,
        created: now,
        expires: now + MATCH_MS,
        status: 'pending',
      };
      l.revengeMatch = matchId;
      p.lock = matchId;
      break;
    }
    case 'finish':
    case 'abandon': {
      const m = s.matches[command.matchId];
      if (!m || m.attacker !== id) fail('No puedes resolver ese ataque.');
      if (m.status !== 'pending') break;
      const hp =
        command.action === 'finish'
          ? verifyRaidReplay(m.level, command.replay)
          : 0;
      if (hp === null)
        fail('La repetición no coincide con una partida válida.');
      m.hp = hp;
      m.status =
        command.action === 'abandon' ? 'abandoned' : hp > 0 ? 'won' : 'lost';
      m.amount = Math.floor((m.limit * hp) / 100);
      unlock(s, m);
      if (m.kind === 'revenge') {
        const l = s.loot[m.lootId!];
        if (!l || l.status !== 'held')
          fail('El botín de esta revancha ya se resolvió.');
        p.available += m.amount;
        s.players[l.winner].available += l.amount - m.amount;
        l.recovered = m.amount;
        l.status = m.amount > 0 ? 'recovered' : 'released';
      } else if (m.amount > 0) {
        const victim = s.players[m.defender];
        if (victim.chest < m.amount) fail('El cofre cambió durante el ataque.');
        victim.chest -= m.amount;
        victim.active = victim.chest > 0;
        const lootId = uid();
        s.loot[lootId] = {
          id: lootId,
          winner: id,
          victim: victim.id,
          amount: m.amount,
          created: now,
          releaseAt: now + REVENGE_MS,
          status: 'held',
          counterLevel: m.counterLevel,
        };
        m.lootId = lootId;
      }
      break;
    }
    case 'reward': {
      if (!['story', 'practice'].includes(command.kind))
        fail('Modo de premio desconocido.');
      const list = command.kind === 'story' ? story : practice,
        c = list.find((c) => c.level.id === command.course);
      if (!c) fail('Pista desconocida.');
      const hp = verifyRaidReplay(c.level as Dungeon, command.replay);
      if (hp === null || hp <= 0) fail('No se pudo verificar este premio.');
      const key =
        command.kind +
        ':' +
        command.course +
        (command.kind === 'practice' ? ':' + Math.floor(now / 86400000) : '');
      const before = p.rewards[key] ?? 0;
      p.available += Math.max(0, hp - before);
      p.rewards[key] = Math.max(before, hp);
      break;
    }
    default:
      fail('Acción desconocida.');
  }
}
export function onlineView(
  s: OnlineState,
  id: string,
  now: number,
): OnlineView {
  const p = s.players[id];
  if (!p) return { configured: true, registered: false };
  const pending = Object.values(s.matches).find(
    (m) => m.attacker === id && m.status === 'pending',
  );
  return {
    configured: true,
    registered: true,
    player: {
      id,
      name: p.name,
      available: p.available,
      chest: p.chest,
      held: Object.values(s.loot)
        .filter((l) => l.winner === id && l.status === 'held')
        .reduce((n, l) => n + l.amount, 0),
      active: p.active,
      locked: !!p.lock,
    },
    match: pending
      ? {
          id: pending.id,
          level: pending.level,
          kind: pending.kind,
          limit: pending.limit,
          expires: pending.expires,
          opponent: s.players[pending.defender].name,
        }
      : undefined,
    activePlayers: Object.values(s.players).filter(
      (q) => q.id !== id && q.active && q.chest > 0 && !q.lock,
    ).length,
    history: Object.values(s.matches)
      .filter((m) => m.attacker === id || m.defender === id)
      .sort((a, b) => b.created - a.created)
      .slice(0, 30)
      .map((m) => ({
        id: m.id,
        attacking: m.attacker === id,
        opponent: s.players[m.attacker === id ? m.defender : m.attacker].name,
        status: m.status,
        amount: m.amount ?? 0,
        created: m.created,
        kind: m.kind,
      })),
    loot: Object.values(s.loot)
      .filter((l) => l.winner === id || l.victim === id)
      .sort((a, b) => b.created - a.created)
      .slice(0, 30)
      .map((l) => ({
        id: l.id,
        incoming: l.winner === id,
        amount: l.amount,
        releaseAt: l.releaseAt,
        status: l.status,
        opponent: s.players[l.winner === id ? l.victim : l.winner].name,
        canRevenge:
          l.victim === id &&
          l.status === 'held' &&
          !l.revengeMatch &&
          l.releaseAt > now,
        recovered: l.recovered ?? 0,
      })),
  };
}
