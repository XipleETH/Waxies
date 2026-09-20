import {
  newProfile,
  parseProfile,
  type MobileProfile,
} from '../game/mobile-profile';
const META = 'waxies.cloud-save.v1';
export interface CloudMeta {
  id: string;
  revision: number;
  dirty: boolean;
}
interface Account {
  id?: string;
  wallet?: string;
  cloud?: { revision: number; profile: MobileProfile };
}
let current: CloudMeta | null = null;
let pending: MobileProfile | null = null;
let active: Promise<void> | null = null;
let report: (message: string) => void = () => {};
let halted = false;
export async function accountRequest(body?: unknown) {
  const res = await fetch('/api/account', {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error ?? 'No se pudo conectar con tu cuenta.');
  return data;
}
function storeMeta() {
  if (current) localStorage.setItem(META, JSON.stringify(current));
}
export function queueCloudSave(profile: MobileProfile) {
  if (!current) return;
  pending = structuredClone(profile);
  current.dirty = true;
  storeMeta();
  if (!halted) void flushCloudSave().catch((e) => report(e.message));
}
export async function flushCloudSave(): Promise<void> {
  if (active) return active;
  if (halted && pending)
    throw Error(
      'El guardado está pendiente. Recarga para recuperar la versión de la nube; se conservará una copia local.',
    );
  active = (async () => {
    while (pending && current) {
      const snapshot = pending;
      pending = null;
      try {
        const result = await accountRequest({
          action: 'save',
          id: current.id,
          revision: current.revision,
          profile: snapshot,
        });
        current.revision = result.revision;
        current.dirty = pending !== null;
        storeMeta();
      } catch (e) {
        pending ??= snapshot;
        halted = true;
        throw e;
      }
    }
  })();
  try {
    await active;
  } finally {
    active = null;
  }
}
/** Account-scoped snapshots; never combine balances from two saves or two accounts. */
export async function restoreCloud(
  local: MobileProfile,
  onNotice: (message: string) => void,
): Promise<MobileProfile> {
  report = onNotice;
  let meta: CloudMeta | null = null;
  try {
    meta = JSON.parse(localStorage.getItem(META) ?? 'null');
  } catch {}
  let account: Account;
  try {
    account = await accountRequest();
  } catch {
    // Preserve offline edits against the last known revision, but don't send them to an unknown session.
    current = meta;
    halted = true;
    report(
      'Sin conexión: el progreso sigue en este dispositivo. Se sincronizará al volver a abrir el juego con internet.',
    );
    return local;
  }
  halted = false;
  if (!account.wallet || !account.id) {
    current = null;
    return local;
  }
  const cloud = account.cloud;
  if (
    meta?.id === account.id &&
    meta.dirty &&
    meta.revision === (cloud?.revision ?? 0)
  ) {
    current = meta;
    queueCloudSave(local);
    return local;
  }
  const restored = cloud
    ? parseProfile(cloud.profile)
    : !meta || meta.id === account.id
      ? local
      : newProfile();
  if (JSON.stringify(restored) !== JSON.stringify(local)) {
    localStorage.setItem(
      'waxies.profile-backup.' + (meta?.id ?? 'guest'),
      JSON.stringify(local),
    );
    if (meta?.dirty)
      report(
        'Se recuperó el progreso de la nube. Los cambios de este dispositivo se conservaron en una copia local.',
      );
  }
  current = { id: account.id, revision: cloud?.revision ?? 0, dirty: false };
  storeMeta();
  if (!cloud) queueCloudSave(restored);
  return restored;
}
