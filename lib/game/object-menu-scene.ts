import * as T from 'three';
export type MenuObject =
  | 'emotes'
  | 'wallet'
  | 'portal'
  | 'book'
  | 'chest'
  | 'scroll'
  | 'swords';
/** Lit solid objects; accessible labels and hit targets are overlaid by ObjectMenu. */
export function createObjectMenu(
  host: HTMLElement,
  kinds: MenuObject[],
  layout: 'grid' | 'corner' = 'grid',
) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-4, 4, 3, -3, 0.1, 30);
  camera.position.set(0, layout === 'corner' ? 0 : 3, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new T.HemisphereLight(0xffffd9, 0x355748, 3));
  const light = new T.DirectionalLight(0xffefc5, 3);
  light.position.set(-5, 8, 9);
  scene.add(light);
  const geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [],
    groups: T.Group[] = [];
  const mat = (color: number) => {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.12,
    });
    materials.push(m);
    return m;
  };
  const gold = mat(0xe8bc59),
    stone = mat(0x739c6b),
    wood = mat(0x89532b),
    paper = mat(0xe8dfb0),
    teal = mat(0x77d3bc),
    dark = mat(0x253f32);
  function box(
    g: T.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
  ) {
    const geo = new T.BoxGeometry(w, h, d);
    geometries.push(geo);
    const mesh = new T.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  }
  kinds.forEach((kind) => {
    const g = new T.Group();
    groups.push(g);
    scene.add(g);
    box(g, 0, -0.57, 0, 1.7, 0.18, 1, stone);
    box(g, 0, -0.68, -0.04, 1.85, 0.12, 1.08, dark);
    if (kind === 'chest' || kind === 'wallet') {
      box(g, 0, -0.15, 0, 1.2, 0.75, 0.75, wood);
      box(g, 0, 0.25, 0, 1.28, 0.24, 0.8, gold);
      for (const x of [-0.4, 0.4]) box(g, x, -0.1, 0.39, 0.1, 0.9, 0.04, gold);
      box(g, 0, -0.03, 0.45, 0.28, 0.26, 0.12, gold);
    }
    if (kind === 'portal') {
      box(g, -0.5, 0.08, 0, 0.25, 1.2, 0.55, stone);
      box(g, 0.5, 0.08, 0, 0.25, 1.2, 0.55, stone);
      box(g, 0, 0.7, 0, 1.5, 0.3, 0.65, gold);
      box(g, 0, 0.04, -0.1, 0.8, 1.05, 0.12, teal);
    }
    if (kind === 'book' || kind === 'scroll') {
      const b = new T.Group();
      g.add(b);
      b.rotation.y = -0.18;
      box(b, 0, 0, 0, 1.15, 0.95, 0.38, kind === 'book' ? teal : wood);
      box(b, 0, 0.02, 0.22, 1.03, 0.81, 0.12, paper);
      for (let i = 0; i < 3; i++)
        box(b, 0, 0.22 - i * 0.2, 0.3, 0.66, 0.035, 0.025, gold);
      box(b, -0.51, 0.01, 0.33, 0.08, 0.97, 0.08, gold);
    }
    if (kind === 'emotes') {
      const faceGeo = new T.SphereGeometry(0.56, 24, 16);
      geometries.push(faceGeo);
      const face = new T.Mesh(faceGeo, gold);
      face.scale.z = 0.32;
      g.add(face);
      for (const x of [-0.19, 0.19]) {
        const geo = new T.SphereGeometry(0.06, 12, 8);
        geometries.push(geo);
        const eye = new T.Mesh(geo, dark);
        eye.position.set(x, 0.12, 0.19);
        g.add(eye);
      }
      const points = Array.from(
        { length: 13 },
        (_, i) =>
          new T.Vector3(
            -0.24 + i * 0.04,
            -0.08 - Math.sin((i / 12) * Math.PI) * 0.15,
            0.19,
          ),
      );
      const smileGeo = new T.TubeGeometry(
        new T.CatmullRomCurve3(points),
        24,
        0.024,
        6,
        false,
      );
      geometries.push(smileGeo);
      g.add(new T.Mesh(smileGeo, dark));
    }
    if (kind === 'swords') {
      for (const sign of [-1, 1]) {
        const b = new T.Group();
        b.rotation.z = sign * 0.55;
        g.add(b);
        box(b, 0, 0.2, 0, 0.17, 1.1, 0.17, paper);
        box(b, 0, -0.35, 0, 0.6, 0.12, 0.23, gold);
        box(b, 0, -0.57, 0, 0.17, 0.35, 0.2, wood);
      }
    }
  });
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const half = (4 * h) / w;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    groups.forEach((g, i) => {
      if (layout === 'corner') {
        const column = i < 3 ? 0 : i - 2,
          row = i < 3 ? i : 2;
        g.position.set(
          -4 + ((column + 0.5) * 8) / 3,
          half - ((row + 0.36) * 2 * half) / 3,
          0,
        );
        g.scale.setScalar(0.73);
        g.rotation.x = 0.1;
        return;
      }
      const x = i % 2 === 0 ? -2 : 2,
        y =
          half -
          ((Math.floor(i / 2) + 0.5) * 2 * half) / Math.ceil(kinds.length / 2);
      g.position.set(x, y, 0);
    });
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let raf = 0,
    last = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function tick(t: number) {
    raf = requestAnimationFrame(tick);
    if (document.hidden || reduced.matches || t - last < 65) return;
    last = t;
    groups.forEach((g, i) => (g.rotation.y = Math.sin(t * 0.0007 + i) * 0.12));
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);
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
