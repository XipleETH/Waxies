import { starterVault, STARTER_CHISPAS } from '../game/starter-vaults';
import type { OnlineState, Player } from './types';
/** Called inside the account transaction; retries never mint a second allocation. */
export function createLeaguePlayer(
  s: OnlineState,
  id: string,
  secretHash: string,
  name: string,
  now: number,
  starterId?: string,
): Player {
  if (s.players[id]) return s.players[id];
  const defense = starterVault(starterId);
  return (s.players[id] = {
    id,
    secretHash,
    name,
    available: 0,
    chest: STARTER_CHISPAS,
    active: true,
    created: now,
    rewards: {},
    defense,
    starterId: defense.level.id,
  });
}
