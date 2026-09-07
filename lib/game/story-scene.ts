import * as T from 'three';
import { loadMixedAvatar, type MixedAvatar } from './mixer-avatar';
import { guardianGenes } from './guardians';
import { PARTS } from './catalog';

/** Short in-engine story scenes, using official Axie geometry and animation. */
export function createStoryScene(
  host: HTMLElement,
  onReady: (error?: string) => void,
) {
  let needsRender = true;
  let disposed = false,
    raf = 0,
    last = 0,
    time = 0,
    panel = 0,
    paused = false;
  const abort = new AbortController();
  const models: (MixedAvatar | undefined)[] = [];
  const geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [],
    textures: T.Texture[] = [];
  const renderer = new T.WebGLRenderer({
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.setClearColor(0x102a28);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x102a28, 0.035);
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 50);
  const ambient = new T.HemisphereLight(0xf8edca, 0x344739, 3);
  scene.add(ambient);
  const sun = new T.DirectionalLight(0xffe6b4, 4);
  sun.position.set(-3, 6, 5);
  scene.add(sun);
  const glow = new T.PointLight(0xffcd7a, 20, 8);
  glow.position.set(0, 1.8, 1);
  scene.add(glow);
  const mat = (color: number, extra: T.MeshStandardMaterialParameters = {}) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
    materials.push(m);
    return m;
  };
  const stone = mat(0x37584a),
    trim = mat(0x769679),
    floor = mat(0x27483f);
  const wood = mat(0x754c30),
    gold = mat(0xd7ad56, { metalness: 0.5, roughness: 0.3 });
  const mesh = (
    geo: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = scene,
  ) => {
    geometries.push(geo);
    const m = new T.Mesh(geo, material);
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
    m: T.Material,
    parent: T.Object3D = scene,
  ) => {
    const b = mesh(new T.BoxGeometry(w, h, d), m, parent);
    b.position.set(x, y, z);
    return b;
  };
  const platform = mesh(new T.CylinderGeometry(4.7, 5, 0.45, 32), floor);
  platform.position.y = -0.26;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 7; c++)
      box(
        (c - 3) * 1.25 + (r % 2) * 0.25,
        r * 0.78 + 0.3,
        -2.8,
        1.18,
        0.72,
        0.35,
        (r + c) % 3 ? stone : trim,
      );
  for (const x of [-3.5, 3.5]) {
    box(x, 1.5, -1, 0.6, 3.1, 0.7, stone);
    box(x, 3.1, -1, 0.85, 0.22, 0.9, trim);
  }
  for (let i = 0; i < 10; i++)
    box(
      ((i % 5) - 2) * 1.3,
      0.005,
      Math.floor(i / 5) * 1.3 - 0.5,
      1.22,
      0.035,
      1.22,
      i % 3 ? floor : stone,
    );
  const chest = new T.Group();
  scene.add(chest);
  chest.position.set(0, 0, 0.2);
  box(0, 0.38, 0, 1.65, 0.76, 1.1, wood, chest);
  const lid = new T.Group();
  lid.position.set(0, 0.78, -0.53);
  chest.add(lid);
  box(0, 0.12, 0.53, 1.7, 0.3, 1.15, wood, lid);
  for (const x of [-0.58, 0.58]) {
    box(x, 0.39, 0, 0.14, 0.8, 1.14, gold, chest);
    box(x, 0.13, 0.53, 0.15, 0.33, 1.18, gold, lid);
  }
  box(0, 0.5, 0.59, 0.29, 0.35, 0.12, gold, chest);
  const rune = mesh(
    new T.OctahedronGeometry(0.15),
    mat(0xc5ffc9, { emissive: 0x66c188, emissiveIntensity: 1 }),
    chest,
  );
  rune.position.set(0, 0.52, 0.68);
  const label = (text: string, color: string, size = 1) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 83);
    const texture = new T.CanvasTexture(canvas);
    textures.push(texture);
    const material = new T.SpriteMaterial({
      map: texture,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    materials.push(material);
    const sprite = new T.Sprite(material);
    sprite.scale.set(size, size / 2, 1);
    return sprite;
  };
  const tokens = ['SLP', 'AXS', 'RON'].map((name, i) => {
    const group = new T.Group();
    scene.add(group);
    const color = [0xf39daf, 0xb4a3ff, 0x74bdf0][i];
    if (i === 0) {
      const bottle = mesh(
        new T.SphereGeometry(0.32, 16, 12),
        mat(color, { emissive: color, emissiveIntensity: 0.25 }),
        group,
      );
      bottle.scale.y = 1.12;
      box(0, 0.35, 0, 0.2, 0.23, 0.2, gold, group);
      const heart = label('♥', '#fff1db', 0.45);
      heart.position.set(0, 0, 0.34);
      group.add(heart);
    } else {
      const coin = mesh(
        new T.CylinderGeometry(0.36, 0.36, 0.14, 6),
        mat(color, { metalness: 0.4, roughness: 0.3 }),
        group,
      );
      coin.rotation.x = Math.PI / 2;
    }
    const caption = label(name, '#fff0ca', 0.95);
    caption.position.set(0, 0.7, 0);
    group.add(caption);
    return group;
  });
  const sleepMarks = [-1.8, 1.8].map((x) => {
    const z = label('Z z', '#d6e8ca', 1.2);
    z.position.set(x, 2, 0);
    scene.add(z);
    return z;
  });
  const trapGroup = new T.Group();
  scene.add(trapGroup);
  trapGroup.position.set(1.55, 0.46, 1.4);
  const trapTexture = new T.TextureLoader().load(PARTS.carrot.partImage, () => {
    if (disposed) trapTexture.dispose();
    else needsRender = true;
  });
  textures.push(trapTexture);
  trapTexture.colorSpace = T.SRGBColorSpace;
  const trapMat = new T.SpriteMaterial({ map: trapTexture, depthWrite: false });
  materials.push(trapMat);
  const trap = new T.Sprite(trapMat);
  trap.scale.set(0.9, 0.9, 1);
  trapGroup.add(trap);
  const ring = mesh(
    new T.TorusGeometry(0.55, 0.025, 6, 32),
    mat(0xf3b679, { emissive: 0xd9a953, emissiveIntensity: 0.8 }),
    trapGroup,
  );
  const moonMaterial = new T.MeshBasicMaterial({ color: 0xe7eac8 });
  materials.push(moonMaterial);
  const moon = mesh(new T.SphereGeometry(0.35, 16, 12), moonMaterial);
  moon.position.set(2.8, 3.6, -2.9);
  const actorGenes = [
    guardianGenes(['serious', 'cactus', 'pumpkin', 'carrot'], 'story-keeper'),
    guardianGenes(['risky-fish', 'oranda', 'goldfish', 'nimo'], 'story-raider'),
  ];
  void Promise.all(
    actorGenes.map(async (genes, i) => {
      const model = await loadMixedAvatar(genes, abort.signal);
      if (disposed) {
        model.dispose();
        return;
      }
      models[i] = model;
      scene.add(model.root);
      needsRender = true;
      model.actions.idle?.play();
    }),
  )
    .then(() => {
      if (!disposed) {
        pose(0);
        needsRender = true;
        onReady();
      }
    })
    .catch(() => {
      if (!disposed)
        onReady('La animación no pudo cargar. Puedes seguir leyendo y jugar.');
    });
  function pose(delta: number) {
    const night = panel >= 2;
    moon.visible = night;
    sun.intensity = night ? 1.3 : 4;
    sun.color.setHex(night ? 0x93b8e4 : 0xffe6b4);
    ambient.intensity = night ? 1.7 : 3;
    renderer.setClearColor(night ? 0x101e31 : 0x102a28);
    scene.fog!.color.setHex(night ? 0x101e31 : 0x102a28);
    lid.rotation.x = panel === 0 ? -0.3 : panel === 1 ? -1.0 : 0;
    glow.color.setHex(
      panel === 3 ? 0xf19a69 : panel === 2 ? 0x90bcd9 : 0xffcd7a,
    );
    glow.intensity = panel === 3 ? 16 + Math.sin(time * 1.8) * 3 : 18;
    tokens.forEach((token, i) => {
      token.visible = panel < 2;
      if (panel === 0)
        token.position.set(
          (i - 1) * 1.5,
          2.1 + Math.sin(time * 0.9 + i) * 0.08,
          0.6,
        );
      else {
        const t = (time * 0.16 + i / 3) % 1;
        token.position.set((i - 1) * 1.4 * (1 - t), 2.4 - 1.45 * t, 0.2);
        token.scale.setScalar(1 - 0.5 * t);
      }
      if (panel === 0) token.scale.setScalar(1);
      token.rotation.y = Math.sin(time * 0.4 + i) * 0.15;
    });
    sleepMarks.forEach((z, i) => {
      z.visible = panel === 2 || (panel === 3 && i === 0);
      z.position.y = 1.85 + Math.sin(time + i) * 0.12;
    });
    trapGroup.visible = panel >= 2;
    ring.scale.setScalar(1 + Math.sin(time * 2) * 0.08);
    models.forEach((model, i) => {
      if (!model) return;
      const sleeping = panel === 2 || (panel === 3 && i === 0);
      model.mixer.update(sleeping ? delta * 0.12 : delta);
      model.root.scale.set(
        1.2,
        sleeping ? 1.06 + Math.sin(time * 1.4) * 0.018 : 1.2,
        1.2,
      );
      model.root.position.set(
        i === 0 ? -1.95 : 1.95,
        sleeping ? 0.28 : 0.43,
        0.55,
      );
      model.root.rotation.set(
        0,
        i === 0 ? 0.5 : -0.5,
        sleeping ? (i === 0 ? -0.16 : 0.16) : 0,
      );
      if (sleeping) model.root.rotation.y = i === 0 ? 1.7 : -1.7;
      if (panel === 3 && i === 1) {
        model.root.position.x = 2.5 - ((time % 6) / 6) * 0.9;
        model.root.position.z = 1.3;
        model.root.rotation.y = -0.7;
      }
    });
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.set(
      0,
      4.3,
      Math.max(9.3, 4 / (camera.aspect * Math.tan((Math.PI * 42) / 360))),
    );
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.04);
    last = now;
    if (document.hidden || (paused && !needsRender)) return;
    if (!paused) time += delta;
    pose(paused ? 0 : delta);
    renderer.render(scene, camera);
    needsRender = false;
  }
  raf = requestAnimationFrame(frame);
  return {
    setPanel(next: number) {
      needsRender = true;
      panel = next;
      time = 0;
      pose(0);
    },
    setPaused(value: boolean) {
      needsRender = true;
      paused = value;
    },
    dispose() {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      observer.disconnect();
      models.forEach((m) => m?.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
