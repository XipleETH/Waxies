import * as THREE from 'three';
import { dungeonGuardians } from './guardians';
import { loadMixedAvatar, type MixedAvatar } from './mixer-avatar';
import type { Dungeon } from './physics';
export function createMapGuardians(
  rooms: Array<{ level: Dungeon; roof: THREE.Group }>,
  onChange: () => void,
) {
  let disposed = false;
  const entries = rooms.map(({ level, roof }) => ({
    roof,
    guardians: dungeonGuardians(level),
    wanted: false,
    failed: false,
    controller: null as AbortController | null,
    models: [] as MixedAvatar[],
  }));
  let loading = 0;
  function pump() {
    if (disposed || loading >= 2) return;
    const e = entries.find(
      (e) => e.wanted && !e.failed && !e.controller && !e.models.length,
    );
    if (!e) return;
    const controller = new AbortController();
    e.controller = controller;
    loading++;
    void (async () => {
      for (const [i, guardian] of e.guardians.entries()) {
        const model = await loadMixedAvatar(guardian.genes, controller.signal);
        if (disposed || controller.signal.aborted || !e.wanted) {
          model.dispose();
          break;
        }
        const perch = new THREE.Group();
        const scale = e.guardians.length === 2 ? 0.65 : 1.02;
        perch.scale.setScalar(scale);
        perch.position.set(
          e.guardians.length === 2 ? (i === 0 ? -0.65 : 0.65) : 0,
          0.38 * scale,
          0,
        );
        model.root.rotation.y = i === 0 ? 0.28 : -0.28;
        perch.add(model.root);
        e.roof.add(perch);
        e.models.push(model);
        model.actions.idle?.play();
        onChange();
      }
    })()
      .catch(() => {
        if (!controller.signal.aborted) e.failed = true;
      })
      .finally(() => {
        loading--;
        if (e.controller === controller) e.controller = null;
        pump();
      });
    pump();
  }
  return {
    visible(indices: number[]) {
      const selected = new Set(indices);
      entries.forEach((e, i) => {
        e.wanted = selected.has(i);
        if (!e.wanted) {
          e.controller?.abort();
          e.models.forEach((m) => {
            const parent = m.root.parent;
            m.dispose();
            parent?.removeFromParent();
          });
          e.models = [];
        }
      });
      pump();
    },
    update(delta: number) {
      entries.forEach((e) => e.models.forEach((m) => m.mixer.update(delta)));
    },
    dispose() {
      disposed = true;
      entries.forEach((e) => {
        e.controller?.abort();
        e.models.forEach((m) => m.dispose());
        e.models = [];
      });
    },
  };
}
