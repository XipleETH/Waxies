import * as T from 'three';
import { dungeonGuardians } from './guardians';
import { loadMixedAvatar, type MixedAvatar } from './mixer-avatar';
import { roomFor, type Dungeon } from './physics';
/** Non-colliding guardian perches above the exterior roof, using the same official Mixer as the player. */
export function createGuardianVisuals(scene: T.Scene, level: Dungeon) {
  const group = new T.Group();
  scene.add(group);
  const abort = new AbortController();
  let disposed = false;
  const models: MixedAvatar[] = [],
    geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [],
    textures: T.Texture[] = [];
  const room = roomFor(level),
    guardians = dungeonGuardians(level);
  guardians.forEach((guardian, index) => {
    const x =
      room.w / 2 + (guardians.length === 1 ? 0 : index === 0 ? -1.8 : 1.8);
    const baseY = room.h + 1.05;
    const geo = new T.CylinderGeometry(0.95, 1.1, 0.22, 12),
      material = new T.MeshStandardMaterial({
        color: index === 0 ? 0x678f77 : 0x958073,
        roughness: 0.9,
      });
    geometries.push(geo);
    materials.push(material);
    const plinth = new T.Mesh(geo, material);
    plinth.position.set(x, baseY - 0.22, -1.55);
    group.add(plinth);
    const backingGeo = new T.CircleGeometry(1.12, 24),
      backingMat = new T.MeshBasicMaterial({
        color: 0x10292a,
        transparent: true,
        opacity: 0.84,
      });
    geometries.push(backingGeo);
    materials.push(backingMat);
    const backing = new T.Mesh(backingGeo, backingMat);
    backing.position.set(x, baseY + 0.5, -2.02);
    group.add(backing);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#142b25';
    ctx.fillRect(0, 0, 512, 96);
    ctx.textAlign = 'center';
    ctx.fillStyle = index === 0 ? '#b9ebd1' : '#f1d291';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(guardian.name.toUpperCase(), 256, 66);
    const texture = new T.CanvasTexture(canvas);
    textures.push(texture);
    const labelMat = new T.SpriteMaterial({
      map: texture,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    materials.push(labelMat);
    const label = new T.Sprite(labelMat);
    label.renderOrder = 100;
    label.scale.set(2.6, 0.4875, 1);
    label.position.set(x, baseY - 0.63, -1.4);
    group.add(label);
    void loadMixedAvatar(guardian.genes, abort.signal)
      .then((model) => {
        if (disposed) {
          model.dispose();
          return;
        }
        model.root.scale.setScalar(0.92);
        model.root.position.set(x, baseY + 0.22, -1.5);
        model.root.rotation.y = index === 0 ? 0.55 : -0.55;
        model.root.userData.guardianIndex = index;
        group.add(model.root);
        models.push(model);
        model.actions.idle?.play();
      })
      .catch(() => {
        if (!disposed) {
          ctx.clearRect(0, 0, 512, 96);
          ctx.fillStyle = '#e9d29b';
          ctx.font = '24px sans-serif';
          ctx.fillText('GUARDIÁN NO DISPONIBLE', 256, 42);
          texture.needsUpdate = true;
        }
      });
  });
  return {
    setVisible: (visible: boolean) => {
      group.visible = visible;
    },
    update: (delta: number, time: number) => {
      for (const model of models) {
        model.mixer.update(delta);
        const index = model.root.userData.guardianIndex;
        model.root.rotation.y =
          (index === 0 ? 0.55 : -0.55) + Math.sin(time * 0.45) * 0.2;
      }
    },
    dispose: () => {
      disposed = true;
      abort.abort();
      models.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      group.removeFromParent();
    },
  };
}
