import { parseProfile } from '../game/mobile-profile';
import type { Player } from './types';
export function saveCloudProfile(
  player: Player,
  revision: number,
  input: unknown,
  now: number,
) {
  if (!player.wallet)
    throw Error('Vincula tu cuenta antes de guardar en la nube.');
  if (revision !== (player.cloud?.revision ?? 0)) return false;
  const profile = parseProfile(input);
  player.cloud = { profile, revision: revision + 1, updated: now };
  return true;
}
