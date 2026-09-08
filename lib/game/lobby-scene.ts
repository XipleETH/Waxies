import { partSpriteMaterial } from './part-sprite-material';
import * as T from 'three';
import { loadMixedAvatar, type MixedAvatar } from './mixer-avatar';
import { PARTS } from './catalog';
export interface LobbyAppearance {
  genes: string;
  theme: string;
  decoration: string;
  parts: string[];
  validated: boolean;
}
const PALETTES = {
  moss: {
    background: 0x122c29,
    stone: 0x355c4a,
    edge: 0x71957a,
    floor: 0x334d3e,
    glow: 0xbde6ae,
  },
  amethyst: {
    background: 0x231d36,
    stone: 0x55476c,
    edge: 0xa58cb4,
    floor: 0x453b56,
    glow: 0xd1b3f1,
  },
  ember: {
    background: 0x32231b,
    stone: 0x77503b,
    edge: 0xc09562,
    floor: 0x58422e,
    glow: 0xffd69a,
  },
};
/** A personal refuge diorama. All Axie bodies and part sprites are official assets. */
export function createLobbyScene(
  host: HTMLElement,
  appearance: LobbyAppearance,
  onReady: (error?: string) => void,
) {
  const palette =
    PALETTES[appearance.theme as keyof typeof PALETTES] ?? PALETTES.moss;
  let disposed = false,
    raf = 0,
    last = 0,
    avatar: MixedAvatar | undefined;
  const abort = new AbortController(),
    geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [],
    textures: T.Texture[] = [];
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(palette.background);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(palette.background, 0.055);
  const camera = new T.PerspectiveCamera(46, 1, 0.1, 60);
  scene.add(new T.HemisphereLight(0xf6f3d7, palette.background, 2.2));
  const sun = new T.DirectionalLight(0xffedc6, 3.7);
  sun.position.set(-3, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4 });
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  const fill = new T.PointLight(palette.glow, 13, 9);
  fill.position.set(2.5, 2.8, 1);
  scene.add(fill);
  const portalLight = new T.PointLight(
    appearance.validated ? 0x8ff2c1 : 0xf2c886,
    8,
    5,
  );
  portalLight.position.set(0, 1.8, -1.5);
  scene.add(portalLight);
  const mat = (color: number, extra: T.MeshStandardMaterialParameters = {}) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.86, ...extra });
    materials.push(m);
    return m;
  };
  const stone = mat(palette.stone),
    trim = mat(palette.edge),
    floor = mat(palette.floor),
    dark = mat(palette.background),
    gold = mat(0xba8d40, { metalness: 0.55, roughness: 0.4 }),
    wood = mat(0x654529);
  const mesh = (
    geo: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = scene,
  ) => {
    geometries.push(geo);
    const m = new T.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: T.Material,
    parent: T.Object3D = scene,
  ) => {
    const m = mesh(new T.BoxGeometry(w, h, d), material, parent);
    m.position.set(x, y, z);
    return m;
  };
  const stage = mesh(new T.CylinderGeometry(7, 7.4, 0.65, 48), floor);
  stage.position.y = -0.37;
  // Stone paving continues to the edges of every viewport.
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 9; col++) {
      const x = (col - 4) * 1.35 + (row % 2) * 0.45,
        z = (row - 4) * 1.2;
      const tile = box(
        x,
        -0.025,
        z,
        1.28,
        0.075,
        1.12,
        (col + row) % 4 === 0 ? trim : floor,
      );
      tile.rotation.y = (((row * 3 + col) % 3) - 1) * 0.012;
    }
  box(0, 2.1, -3.6, 15, 5, 0.5, stone);
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 11; col++) {
      box(
        (col - 5) * 1.3 + (row % 2) * 0.6,
        row * 0.87 + 0.32,
        -3.29,
        1.23,
        0.8,
        0.25,
        (col + row) % 4 === 0 ? trim : stone,
      );
    }
  // An entrance, rather than a second game board, keeps the Axie the focus.
  box(0, 1.25, -2.95, 2.1, 2.7, 0.3, dark);
  for (const x of [-1.2, 1.2]) {
    box(x, 1.35, -2.66, 0.36, 2.9, 0.7, trim);
    box(x, 0.12, -2.6, 0.65, 0.3, 0.9, stone);
  }
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * i) / 6;
    const b = box(
      Math.cos(angle) * 1.2,
      2.65 + Math.sin(angle) * 0.64,
      -2.66,
      0.48,
      0.42,
      0.7,
      trim,
    );
    b.rotation.z = angle - Math.PI / 2;
  }
  const rune = mat(appearance.validated ? 0x99dbaa : 0xc9a367, {
    emissive: appearance.validated ? 0x55956c : 0x7e5d30,
    emissiveIntensity: 0.8,
  });
  for (let i = 0; i < 3; i++)
    box((i - 1) * 0.4, 2.8, -2.19, 0.16, 0.16, 0.05, rune).rotation.z =
      Math.PI / 4;
  for (const x of [-3.25, 3.25]) {
    box(x, 1.65, -1.4, 0.65, 3.4, 0.85, stone);
    box(x, 3.35, -1.4, 0.95, 0.2, 1.1, trim);
    box(x, 0.15, -1.4, 0.95, 0.3, 1.1, trim);
  }
  const plants: T.Group[] = [];
  for (const [x, z] of [
    [-2.25, -0.5],
    [2.4, -1.6],
    [-1.9, 1.6],
  ]) {
    const clump = new T.Group();
    clump.position.set(x, 0, z);
    scene.add(clump);
    plants.push(clump);
    for (let i = 0; i < 5; i++) {
      const leaf = mesh(
        new T.ConeGeometry(0.13, 0.55, 4),
        mat(appearance.theme === 'amethyst' ? 0x78748b : 0x688664),
        clump,
      );
      leaf.position.set((i - 2) * 0.07, 0.22, Math.sin(i) * 0.09);
      leaf.rotation.z = (i - 2) * 0.27;
    }
  }
  // Equipped defenses are shown in their saved order.
  const defenseDisplays: T.Group[] = [];
  const loader = new T.TextureLoader();
  appearance.parts.forEach((id, i) => {
    const part = PARTS[id];
    if (!part) return;
    const compact = appearance.parts.length > 3;
    const x = compact ? [-1.6, -0.65, 0.65, 1.6][i % 4] : [-1.5, 0, 1.5][i],
      y = compact ? (i < 4 ? 0.75 : 1.7) : [0.75, 1.7, 0.75][i],
      z = compact ? (i < 4 ? -0.85 : -2.1) : i === 1 ? -2.1 : -0.85;
    const base = mesh(new T.CylinderGeometry(0.42, 0.5, y, 7), stone);
    base.position.set(x, y / 2, z);
    const cap = mesh(new T.CylinderGeometry(0.47, 0.47, 0.1, 7), trim);
    cap.position.set(x, y + 0.02, z);
    const display = new T.Group();
    display.position.set(x, y + 0.44, z);
    display.userData.baseY = y + 0.44;
    scene.add(display);
    defenseDisplays.push(display);
    const texture = loader.load(part.partImage, (loaded) => {
      if (disposed) return;
      const image = loaded.image as { width: number; height: number };
      const scale = Math.min(0.72 / image.width, 0.62 / image.height);
      sprite.scale.set(image.width * scale, image.height * scale, 1);
      // A closed mouth alone is only a few pixels high. Show its official
      // Classic illustration on a solid medallion instead of stretching it.
      if (image.height / image.width < 0.28) {
        const art = loader.load(part.image, () => {
          if (disposed) return;
          sprite.visible = false;
          const badge = new T.Group();
          display.add(badge);
          badge.quaternion.copy(camera.quaternion);
          const rim = mesh(
            new T.CylinderGeometry(0.37, 0.37, 0.1, 32),
            mat(0xe8ad3d, { metalness: 0, roughness: 0.85 }),
            badge,
          );
          rim.rotation.x = Math.PI / 2;
          const faceMaterial = new T.MeshBasicMaterial({
            map: art,
            toneMapped: false,
            fog: false,
          });
          materials.push(faceMaterial);
          const face = mesh(
            new T.CircleGeometry(0.335, 40),
            faceMaterial,
            badge,
          );
          face.position.z = 0.056;
        });
        // Frame the illustration, excluding the card's empty text panel.
        art.colorSpace = T.SRGBColorSpace;
        art.repeat.set(0.76, 0.5);
        art.offset.set(0.12, 0.43);
        textures.push(art);
      }
    });
    texture.colorSpace = T.SRGBColorSpace;
    textures.push(texture);
    const material = partSpriteMaterial(texture, part.color);
    materials.push(material);
    const sprite = new T.Sprite(material);
    sprite.scale.set(0.72, 0.62, 1);
    display.add(sprite);
  });
  const chest = new T.Group();
  chest.position.set(1.12, 0.25, 1.1);
  chest.rotation.y = -0.3;
  scene.add(chest);
  box(0, 0, 0, 0.72, 0.48, 0.54, wood, chest);
  box(0, 0.27, 0, 0.76, 0.16, 0.58, wood, chest);
  for (const x of [-0.25, 0.25])
    box(x, 0.07, 0, 0.065, 0.65, 0.59, gold, chest);
  box(0, 0.05, 0.29, 0.13, 0.17, 0.055, gold, chest);
  const jewel = mesh(new T.OctahedronGeometry(0.07), rune, chest);
  jewel.position.set(0, 0.05, 0.33);
  if (appearance.decoration === 'crystals') {
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const crystal = mesh(
          new T.OctahedronGeometry(0.24 + i * 0.07),
          mat(0xbda0ec, {
            emissive: 0x705395,
            emissiveIntensity: 0.45,
            roughness: 0.35,
          }),
        );
        crystal.position.set(
          side * (1.42 + i * 0.13),
          0.25 + i * 0.08,
          -0.05 - i * 0.25,
        );
        crystal.scale.set(0.65, 1.9, 0.65);
        crystal.rotation.z = side * (i - 1) * 0.22;
      }
  }
  if (appearance.decoration === 'lanterns') {
    for (const x of [-1.55, 1.55]) {
      box(x, 0.6, 0.2, 0.12, 1.2, 0.12, gold);
      box(x, 1.22, 0.2, 0.38, 0.52, 0.38, gold);
      box(
        x,
        1.22,
        0.4,
        0.26,
        0.34,
        0.015,
        mat(0xffd98e, { emissive: 0xffbd5b, emissiveIntensity: 1.2 }),
      );
      const lamp = new T.PointLight(0xffc577, 5, 3);
      lamp.position.set(x, 1.3, 0.5);
      scene.add(lamp);
    }
  }
  const pointsGeo = new T.BufferGeometry(),
    positions = new Float32Array(34 * 3);
  for (let i = 0; i < 34; i++) {
    positions[i * 3] = Math.sin(i * 91) * 3.5;
    positions[i * 3 + 1] = 0.5 + (i % 9) * 0.37;
    positions[i * 3 + 2] = Math.cos(i * 13) * 2.5;
  }
  pointsGeo.setAttribute('position', new T.BufferAttribute(positions, 3));
  geometries.push(pointsGeo);
  const dustMat = new T.PointsMaterial({
    color: palette.glow,
    size: 0.023,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  materials.push(dustMat);
  const dust = new T.Points(pointsGeo, dustMat);
  scene.add(dust);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const resize = () => {
    const w = host.clientWidth,
      h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const distance = camera.aspect < 0.47 ? 9.1 : 8.2;
    camera.position.set(0, 3.5, distance);
    camera.lookAt(0, 1.25, 0);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) {
      last = now;
      return;
    }
    if (now - last < 1000 / 30) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced.matches) {
      avatar?.mixer.update(delta);
      dust.rotation.y = Math.sin(now * 0.00008) * 0.1;
      plants.forEach(
        (p, i) => (p.rotation.z = Math.sin(now * 0.0006 + i) * 0.025),
      );
      defenseDisplays.forEach(
        (s, i) =>
          (s.position.y = s.userData.baseY + Math.sin(now * 0.001 + i) * 0.035),
      );
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);
  void loadMixedAvatar(appearance.genes, abort.signal)
    .then((model) => {
      if (disposed) {
        model.dispose();
        return;
      }
      avatar = model;
      model.root.position.set(0, 0.43, 0.6);
      model.root.rotation.y = 0.28;
      model.root.traverse((o) => {
        if (o instanceof T.Mesh) o.castShadow = true;
      });
      scene.add(model.root);
      model.actions.idle?.play();
      onReady();
    })
    .catch(() => {
      if (!disposed)
        onReady('No se pudo cargar el Axie. Puedes seguir usando el menú.');
    });
  return {
    dispose: () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      observer.disconnect();
      avatar?.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
