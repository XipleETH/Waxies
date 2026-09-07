import * as T from 'three';
import type { Dungeon } from './physics';
import { decorationPositionsFor } from './decoration-layout';
/** Cosmetic objects stay behind the player and never participate in collision. */
export function createDecorationVisuals(scene: T.Scene) {
  const root = new T.Group();
  scene.add(root);
  let kind: string | undefined;
  const objects: T.Group[] = [],
    geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [];
  function clear() {
    root.clear();
    objects.length = 0;
    geometries.splice(0).forEach((g) => g.dispose());
    materials.splice(0).forEach((m) => m.dispose());
  }
  function mesh(
    parent: T.Group,
    geometry: T.BufferGeometry,
    color: number,
    y = 0,
    glow = 0,
  ) {
    const material = new T.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: glow,
      roughness: 0.65,
    });
    const item = new T.Mesh(geometry, material);
    item.position.y = y;
    parent.add(item);
    geometries.push(geometry);
    materials.push(material);
  }
  return {
    update(level: Dungeon) {
      if (kind !== level.decoration) {
        clear();
        kind = level.decoration;
        if (kind === 'crystals' || kind === 'lanterns')
          for (let i = 0; i < 2; i++) {
            const object = new T.Group();
            root.add(object);
            objects.push(object);
            if (kind === 'crystals') {
              mesh(object, new T.OctahedronGeometry(0.46), 0xb7a0fc, 0, 0.7);
            } else {
              mesh(
                object,
                new T.BoxGeometry(0.36, 0.55, 0.3),
                0xffd391,
                0,
                1.3,
              );
              mesh(object, new T.BoxGeometry(0.49, 0.12, 0.42), 0x765a31, 0.33);
              mesh(
                object,
                new T.BoxGeometry(0.49, 0.12, 0.42),
                0x765a31,
                -0.33,
              );
            }
          }
      }
      const positions = decorationPositionsFor(level);
      objects.forEach((object, i) =>
        object.position.set(positions[i].x, positions[i].y, -0.8),
      );
    },
    dispose() {
      clear();
      root.removeFromParent();
    },
  };
}
