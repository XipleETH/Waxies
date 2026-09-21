import data from './data/starter-vaults.json';
import legacy from './data/starter-vaults-legacy.json';
import type { VerifiedCourse } from './route-proof';
export const STARTER_CHISPAS = 100;
export const STARTER_VAULTS = data as VerifiedCourse[];
export function starterVault(
  id?: string,
  random: () => number = Math.random,
): VerifiedCourse {
  const selected =
    STARTER_VAULTS.find((c) => c.level.id === id) ??
    (legacy as VerifiedCourse[]).find((c) => c.level.id === id) ??
    STARTER_VAULTS[
      Math.min(
        STARTER_VAULTS.length - 1,
        Math.max(0, Math.floor(random() * STARTER_VAULTS.length)),
      )
    ];
  return structuredClone(selected);
}
