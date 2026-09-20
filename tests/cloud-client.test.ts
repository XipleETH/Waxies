import test from 'node:test';
import assert from 'node:assert/strict';
import { newProfile } from '../lib/game/mobile-profile';
import {
  restoreCloud,
  queueCloudSave,
  flushCloudSave,
} from '../lib/online/cloud-client';
test('cloud client imports once, serializes updates and keeps conflicting changes local', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  let revision = 0;
  let saved: ReturnType<typeof newProfile> | undefined;
  let conflict = false;
  const messages: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    if (!init?.body)
      return Response.json({ id: 'account-a', wallet: '0x1234' });
    const body = JSON.parse(String(init.body));
    assert.equal(body.id, 'account-a');
    if (conflict || body.revision !== revision)
      return Response.json({ error: 'Conflicto' }, { status: 409 });
    revision++;
    saved = body.profile;
    return Response.json({ revision });
  }) as typeof fetch;
  try {
    const profile = newProfile();
    profile.story = [100];
    profile.chispas = 100;
    assert.deepEqual(
      await restoreCloud(profile, (m) => messages.push(m)),
      profile,
    );
    await flushCloudSave();
    assert.equal(revision, 1);
    assert.deepEqual(saved!.story, [100]);
    queueCloudSave({ ...profile, story: [100, 80], chispas: 180 });
    queueCloudSave({ ...profile, story: [100, 100], chispas: 200 });
    await flushCloudSave();
    assert.deepEqual(saved!.story, [100, 100]);
    assert.equal(saved!.chispas, 200);
    assert.equal(JSON.parse(storage.get('waxies.cloud-save.v1')!).dirty, false);
    conflict = true;
    queueCloudSave({ ...profile, chispas: 999 });
    await assert.rejects(flushCloudSave());
    assert.equal(JSON.parse(storage.get('waxies.cloud-save.v1')!).dirty, true);
    assert.equal(saved!.chispas, 200);
    assert.ok(messages.length);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage)
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
