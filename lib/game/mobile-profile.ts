import { allowedParts, validLoadout, type AxieLoadout } from './axie';
import { PORTRAIT_BASE, PORTRAIT_SLOTS } from './portrait';
import { verifyRoute, type RouteProof } from './route-proof';
import { PARTS } from './catalog';
import type { Dungeon, Trap } from './physics';
export const PROFILE_KEY = 'waxies.mobile.v1';
export const GOODS = [
  {
    id: 'moss',
    name: 'Refugio musgo',
    kind: 'theme',
    price: 0,
    color: '#75ad90',
    description: 'Piedra verde y luz de Lunacia.',
  },
  {
    id: 'amethyst',
    name: 'Gruta amatista',
    kind: 'theme',
    price: 120,
    color: '#ab8cdf',
    description: 'Muros violetas y piedra encantada.',
  },
  {
    id: 'ember',
    name: 'Templo ámbar',
    kind: 'theme',
    price: 180,
    color: '#d59663',
    description: 'Un refugio de piedra cálida.',
  },
  {
    id: 'crystals',
    name: 'Cristales de luna',
    kind: 'decoration',
    price: 60,
    color: '#c3abff',
    description: 'Cristales brillantes junto al cofre.',
  },
  {
    id: 'lanterns',
    name: 'Faroles dorados',
    kind: 'decoration',
    price: 80,
    color: '#ffcf88',
    description: 'Dos faroles para tu torre.',
  },
] as const;
export interface MobileProfile {
  version: 1;
  chispas: number;
  owned: string[];
  theme: string;
  decoration: string;
  claimed: string[];
  wins: number;
  axie: AxieLoadout | null;
  traps: Trap[];
  proof: RouteProof | null;
  story: number[];
}
export function newProfile(): MobileProfile {
  return {
    version: 1,
    story: [],
    chispas: 0,
    owned: ['moss'],
    theme: 'moss',
    decoration: 'none',
    claimed: [],
    wins: 0,
    axie: null,
    traps: PORTRAIT_SLOTS.map((t) => ({ ...t })),
    proof: null,
  };
}
export function vaultLevel(p: MobileProfile): Dungeon {
  return {
    ...PORTRAIT_BASE,
    id: 'my-vault',
    name: 'Mi refugio',
    traps: p.traps,
    theme: p.theme,
    decoration: p.decoration,
  };
}
export function prize(hp: number) {
  return Math.floor(Math.max(0, Math.min(100, hp)));
}
export function claimChispas(p: MobileProfile, run: string, hp: number) {
  if (p.claimed.includes(run)) throw Error('Ya recogiste este premio.');
  if (!Number.isInteger(hp) || hp <= 0 || hp > 100)
    throw Error('La partida no tiene un premio válido.');
  return {
    ...p,
    chispas: p.chispas + prize(hp),
    wins: p.wins + 1,
    claimed: [run, ...p.claimed].slice(0, 500),
  };
}
export function buyGood(p: MobileProfile, id: string) {
  const good = GOODS.find((g) => g.id === id);
  if (!good) throw Error('Adorno desconocido.');
  if (p.owned.includes(id)) return equipGood(p, id);
  if (p.chispas < good.price)
    throw Error('Todavía te faltan Chispas. Completa otra pista.');
  return equipGood(
    { ...p, chispas: p.chispas - good.price, owned: [...p.owned, id] },
    id,
  );
}
export function equipGood(p: MobileProfile, id: string) {
  const good = GOODS.find((g) => g.id === id);
  if (!good || !p.owned.includes(id))
    throw Error('Primero consigue este adorno.');
  return { ...p, [good.kind === 'theme' ? 'theme' : 'decoration']: id };
}
export function readProfile(): MobileProfile {
  const text = localStorage.getItem(PROFILE_KEY);
  if (!text) {
    const p = newProfile();
    try {
      const old = JSON.parse(
        localStorage.getItem('waxis.practice.v1') ?? 'null',
      );
      if (validLoadout(old?.axie)) {
        p.axie = old.axie;
        const parts = allowedParts(p.axie);
        p.traps = p.traps.map((t, i) => ({
          ...t,
          part: parts[i % parts.length] ?? t.part,
        }));
      }
    } catch {}
    return p;
  }
  const p = JSON.parse(text) as MobileProfile;
  p.story ??= [];
  if (
    !Array.isArray(p.story) ||
    p.story.length > 50 ||
    p.story.some(
      (hp, i) =>
        ![20, 40, 60, 80, 100].includes(hp) || (i > 0 && !p.story[i - 1]),
    ) ||
    p.version !== 1 ||
    !Number.isSafeInteger(p.chispas) ||
    p.chispas < 0 ||
    p.chispas > 10000000 ||
    !Number.isInteger(p.wins) ||
    p.wins < 0 ||
    !Array.isArray(p.owned) ||
    p.owned.some((id) => !GOODS.some((g) => g.id === id)) ||
    !p.owned.includes(p.theme) ||
    !GOODS.some((g) => g.id === p.theme && g.kind === 'theme') ||
    (p.decoration !== 'none' &&
      (!p.owned.includes(p.decoration) ||
        !GOODS.some(
          (g) => g.id === p.decoration && g.kind === 'decoration',
        ))) ||
    !Array.isArray(p.claimed) ||
    p.claimed.length > 500 ||
    p.claimed.some((s) => typeof s !== 'string') ||
    (p.axie && !validLoadout(p.axie)) ||
    !Array.isArray(p.traps) ||
    p.traps.length !== 3 ||
    p.traps.some(
      (t, i) =>
        !PARTS[t.part] ||
        !Number.isFinite(t.x) ||
        Math.abs(t.x - PORTRAIT_SLOTS[i].x) > 1.5 ||
        t.y !== PORTRAIT_SLOTS[i].y ||
        t.phase !== PORTRAIT_SLOTS[i].phase ||
        t.patrol !== 0,
    )
  )
    throw Error('No se pudo recuperar el progreso de este dispositivo.');
  if (p.axie && p.traps.some((t) => !allowedParts(p.axie).includes(t.part)))
    throw Error('La defensa contiene partes ajenas a tu Axie.');
  if (p.proof && !verifyRoute(vaultLevel(p), p.proof)) p.proof = null;
  return p;
}
