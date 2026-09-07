import * as THREE from 'three';
export type MapPin = { x: number; y: number };
const PALETTES = [
  [0x172f2b, 0x497762, 0x95b68a, 0x314d40],
  [0x132d30, 0x38766a, 0x99c3a3, 0x214d48],
  [0x26263f, 0x605981, 0xb5a6d1, 0x403952],
  [0x372922, 0x8a6348, 0xd5b083, 0x604333],
  [0x202b34, 0x496779, 0xafd0c6, 0x304652],
];
/** A single low-poly diorama per chapter. DOM controls use the same projected positions. */
export function createStoryMapScene(
  host: HTMLElement,
  chapter: number,
  best: number[],
  unlocked: number,
  onPins: (pins: MapPin[]) => void,
) {
  const colors = PALETTES[chapter],
    scene = new THREE.Scene();
  scene.background = new THREE.Color(colors[0]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-7, 7, 23, -23, 0.1, 150);
  camera.position.set(0, 44, 57);
  camera.lookAt(0, 0, 18.9);
  scene.add(new THREE.HemisphereLight(0xf5f2d9, colors[3], 2.5));
  const sun = new THREE.DirectionalLight(0xffeac1, 3);
  sun.position.set(-12, 25, 12);
  scene.add(sun);
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  function material(color: number) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      flatShading: true,
    });
    materials.add(m);
    return m;
  }
  const rock = material(colors[3]),
    grass = material(colors[1]),
    stone = material(colors[2]),
    dark = material(0x12241f),
    wood = material(0x99672e),
    gold = material(0xf2cd73),
    foliage = material(colors[1]),
    path = material(0x9b9b70);
  const glow = new THREE.MeshBasicMaterial({
    color: 0xd6ffc0,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  materials.add(glow);
  function mesh(
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
  ) {
    geometries.add(g);
    const obj = new THREE.Mesh(g, m);
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    parent?: THREE.Object3D,
  ) {
    return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  }
  const nodes = Array.from(
    { length: 10 },
    (_, i) => new THREE.Vector3(Math.sin(i * 1.45) * 3, 0, i * 4.2),
  );
  const curve = new THREE.CatmullRomCurve3(
    nodes.map((p) => new THREE.Vector3(p.x, -0.5, p.z)),
  );
  mesh(new THREE.TubeGeometry(curve, 100, 0.57, 5, false), rock, 0, 0, 0);
  for (let i = 0; i <= 95; i++) {
    const p = curve.getPoint(i / 95);
    const slab = box(p.x, -0.02, p.z, 0.65, 0.12, 0.5, path);
    slab.rotation.y = i * 0.33;
  }
  const sparks: THREE.Mesh[] = [];
  nodes.forEach((p, i) => {
    const number = chapter * 10 + i + 1,
      cleared = (best[number - 1] ?? 0) > 0,
      locked = number > unlocked;
    const group = new THREE.Group();
    group.position.copy(p);
    scene.add(group);
    mesh(
      new THREE.CylinderGeometry(1.65, 1.25, 0.85, 7),
      rock,
      0,
      -0.4,
      0,
      group,
    );
    mesh(
      new THREE.CylinderGeometry(1.7, 1.64, 0.2, 7),
      grass,
      0,
      0.1,
      0,
      group,
    );
    if (i === 9) group.scale.set(1.15, 1.2, 1.15);
    // Stone lintel, columns and recessed doorway echo the refuge architecture.
    box(0, 0.78, -0.25, 1.8, 1.3, 0.85, locked ? rock : stone, group);
    box(0, 0.66, 0.21, 0.68, 1.05, 0.06, dark, group);
    box(-0.76, 0.85, 0.4, 0.32, 1.55, 0.5, stone, group);
    box(0.76, 0.85, 0.4, 0.32, 1.55, 0.5, stone, group);
    box(0, 1.64, 0.15, 2.05, 0.3, 1.1, stone, group);
    for (const x of [-0.8, 0, 0.8])
      box(x, 1.93, 0.15, 0.35, 0.3, 0.65, stone, group);
    const chest = new THREE.Group();
    chest.position.set(0.92, 0.38, 0.85);
    chest.rotation.y = -0.25;
    group.add(chest);
    box(0, 0, 0, 0.58, 0.4, 0.42, wood, chest);
    const lid = box(0, 0.23, 0, 0.64, 0.16, 0.48, gold, chest);
    if (cleared) {
      lid.rotation.x = -0.8;
      lid.position.set(0, 0.42, -0.12);
    }
    box(0, 0.06, 0.23, 0.12, 0.19, 0.035, gold, chest);
    if (number === unlocked) {
      const ring = mesh(
        new THREE.TorusGeometry(1.82, 0.045, 6, 48),
        glow,
        0,
        0.24,
        0,
        group,
      );
      ring.rotation.x = -Math.PI / 2;
    }
    for (let j = 0; j < 3; j++) {
      const side = j % 2 ? -1 : 1,
        x = side * (2 + 0.3 * j),
        z = -0.9 + j * 0.65;
      if (chapter === 2) {
        const crystal = mesh(
          new THREE.OctahedronGeometry(0.46),
          stone,
          x,
          0.48,
          z,
          group,
        );
        crystal.scale.y = 1.8;
        crystal.rotation.z = side * 0.2;
      } else if (chapter >= 3) {
        box(x, 0.4, z, 0.24, 0.9, 0.24, rock, group);
        mesh(new THREE.OctahedronGeometry(0.23), gold, x, 0.98, z, group);
      } else {
        box(x, 0.18, z, 0.12, 0.65, 0.12, wood, group);
        mesh(new THREE.ConeGeometry(0.55, 1.2, 5), foliage, x, 0.86, z, group);
      }
    }
    if (!locked && (best[number - 1] ?? 0) < 100) {
      const s = mesh(
        new THREE.OctahedronGeometry(0.09),
        gold,
        p.x - 1.1,
        1.4,
        p.z + 0.3,
      );
      sparks.push(s);
    }
    for (let j = 0; j < 3; j++)
      mesh(
        new THREE.DodecahedronGeometry(0.2 + j * 0.07, 0),
        rock,
        p.x + (j % 2 ? -2.6 : 2.8),
        -0.15,
        p.z + j,
        scene,
      );
  });
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    const half = 18.5;
    camera.left = (-half * w) / h;
    camera.right = (half * w) / h;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setSize(w, h);
    onPins(
      nodes.map((p) => {
        const v = new THREE.Vector3(p.x, 0.2, p.z + 1.45).project(camera);
        return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
      }),
    );
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0,
    last = 0;
  function animate(t: number) {
    raf = requestAnimationFrame(animate);
    if (document.hidden || t - last < 50 || reduce.matches) return;
    last = t;
    sparks.forEach((s, i) => {
      s.position.y = 1.4 + Math.sin(t * 0.002 + i) * 0.2;
      s.rotation.y = t * 0.001;
    });
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(animate);
  return {
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
