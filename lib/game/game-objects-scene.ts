import * as T from 'three';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
let fontPromise: Promise<Font> | undefined;
const fontForUI = () =>
  (fontPromise ??= new FontLoader()
    .loadAsync('/assets/ui/helvetiker-bold.json')
    .catch((e) => {
      fontPromise = undefined;
      throw e;
    }));

/** One transparent renderer for every accessible DOM hit target in a menu. */
export async function createGameObjects(
  host: HTMLElement,
  scope: HTMLElement,
  signal: AbortSignal,
) {
  const font = await fontForUI();
  if (signal.aborted) return;
  const renderer = new T.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(0, 1, 1, 0, 0.1, 1000);
  camera.position.z = 500;
  scene.add(new T.HemisphereLight(0xfff7d7, 0x263e34, 2));
  const light = new T.DirectionalLight(0xffefc2, 2.4);
  light.position.set(-150, 300, 500);
  scene.add(light);
  const materials: T.Material[] = [];
  const mat = (color: number) => {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: 0.8,
      flatShading: true,
    });
    materials.push(m);
    return m;
  };
  const gold = mat(0xf1c55c),
    mint = mat(0x83c98d),
    wood = mat(0x946238),
    paper = mat(0xffedb5),
    dark = mat(0x284d40),
    pink = mat(0xf68f87),
    teal = mat(0x55d4bf);
  const entries = new Map<
    HTMLElement,
    {
      key: string;
      group: T.Group;
      geos: T.BufferGeometry[];
      width: number;
      height: number;
    }
  >();
  const remove = (
    entry: typeof entries extends Map<HTMLElement, infer E> ? E : never,
  ) => {
    entry.group.removeFromParent();
    entry.geos.forEach((g) => g.dispose());
  };
  function build(el: HTMLElement, key: string) {
    const group = new T.Group(),
      icon = new T.Group(),
      geos: T.BufferGeometry[] = [];
    group.add(icon);
    icon.rotation.set(0.24, -0.38, 0);
    const mesh = (
      g: T.BufferGeometry,
      m: T.Material | T.Material[],
      x = 0,
      y = 0,
      z = 0,
      parent: T.Group = icon,
    ) => {
      geos.push(g);
      const o = new T.Mesh(g, m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };
    const box = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      m: T.Material,
    ) => mesh(new T.BoxGeometry(w, h, d), m, x, y, z);
    const shape = (points: number[][], m: T.Material) => {
      const s = new T.Shape();
      points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
      s.closePath();
      return mesh(
        new T.ExtrudeGeometry(s, {
          depth: 0.18,
          bevelEnabled: true,
          bevelSize: 0.04,
          bevelThickness: 0.04,
          bevelSegments: 1,
          steps: 1,
        }),
        m,
      );
    };
    const text = (
      value: string,
      y: number,
      size = 0.36,
      color: T.Material = paper,
    ) => {
      const geo = new TextGeometry(value, {
        font,
        size,
        depth: 0.12,
        curveSegments: 3,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 1,
      });
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
      const letters = mesh(geo, [color, dark], 0, y, 0.32, group);
      letters.rotation.set(0.1, -0.12, 0);
      const shadow = new T.Mesh(geo, dark);
      shadow.position.set(0.035, y - 0.055, 0.1);
      shadow.rotation.copy(letters.rotation);
      group.add(shadow);
      return letters;
    };
    const star = (x: number, y: number, filled = true) => {
      const points = Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 0.13 : 0.28;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
      const outline = new T.Shape(
        points.map(([px, py]) => new T.Vector2(px, py)),
      );
      if (!filled)
        outline.holes.push(
          new T.Path(
            points
              .map(([px, py]) => new T.Vector2(px * 0.56, py * 0.56))
              .reverse(),
          ),
        );
      const geometry = new T.ExtrudeGeometry(outline, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSize: 0.015,
        bevelThickness: 0.02,
        bevelSegments: 1,
      });
      mesh(geometry, [gold, wood], x, y, 0.2);
    };
    const kind = el.dataset.object,
      label = el.dataset.label ?? '',
      value = el.dataset.value ?? '';
    if (kind === 'title') {
      text(label, 0.15, 0.6);
      if (value) text(value, -0.52, 0.29, gold);
    } else if (kind === 'node') {
      text(
        label,
        0.4,
        0.88,
        el.dataset.locked === 'true'
          ? mint
          : el.getAttribute('aria-pressed') === 'true'
            ? gold
            : paper,
      );
      for (let i = 0; i < 3; i++)
        star((i - 1) * 0.65, -0.45, i < Number(el.dataset.stars ?? 0));
      text(value, -1.08, 0.34, gold);
      if (el.dataset.locked === 'true') {
        box(-0.83, 0.4, 0, 0.32, 0.36, 0.2, dark);
        mesh(
          new T.TorusGeometry(0.12, 0.04, 5, 12, Math.PI),
          gold,
          -0.83,
          0.6,
          0.04,
        );
      }
    } else {
      if (kind === 'portal' || kind === 'map') {
        box(-0.55, 0, 0, 0.28, 1.3, 0.45, mint);
        box(0.55, 0, 0, 0.28, 1.3, 0.45, mint);
        box(0, 0.7, 0, 1.6, 0.3, 0.55, gold);
        box(0, -0.65, 0.05, 1.65, 0.18, 0.8, wood);
        box(0, 0, -0.12, 0.85, 1.1, 0.14, teal);
        if (kind === 'map')
          for (let i = 0; i < 3; i++)
            box((i - 1) * 0.5, 0.98, 0, 0.22, 0.25, 0.35, mint);
      } else if (kind === 'book') {
        box(0, 0, 0, 1.3, 1, 0.25, wood);
        box(-0.33, 0.05, 0.18, 0.59, 0.84, 0.13, paper);
        box(0.33, 0.05, 0.18, 0.59, 0.84, 0.13, paper);
        box(0, 0, 0.28, 0.09, 1.1, 0.14, gold);
        for (let i = 0; i < 3; i++) {
          box(-0.33, 0.26 - i * 0.23, 0.27, 0.38, 0.04, 0.03, gold);
          box(0.33, 0.26 - i * 0.23, 0.27, 0.38, 0.04, 0.03, gold);
        }
      } else if (kind === 'heart') {
        const s = new T.Shape();
        s.moveTo(0, -0.6);
        s.bezierCurveTo(-1, 0.08, -0.65, 0.92, 0, 0.43);
        s.bezierCurveTo(0.65, 0.92, 1, 0.08, 0, -0.6);
        mesh(
          new T.ExtrudeGeometry(s, {
            depth: 0.25,
            bevelEnabled: true,
            bevelSize: 0.07,
            bevelThickness: 0.08,
            bevelSegments: 2,
            curveSegments: 8,
          }),
          pink,
        );
      } else if (kind === 'gem' || kind === 'reward') {
        mesh(new T.OctahedronGeometry(0.65), gold);
        if (kind === 'reward') {
          box(0, -0.3, -0.2, 1.4, 0.7, 0.7, wood);
          box(0, 0.1, -0.2, 1.5, 0.2, 0.8, gold);
        }
      } else if (kind === 'pause') {
        box(-0.3, 0, 0, 0.32, 1.15, 0.3, gold);
        box(0.3, 0, 0, 0.32, 1.15, 0.3, gold);
      } else if (kind === 'close') {
        for (const a of [-0.7, 0.7]) {
          const m = box(0, 0, 0, 0.22, 1.3, 0.28, gold);
          m.rotation.z = a;
        }
      } else if (
        kind === 'previous' ||
        kind === 'next' ||
        kind === 'jump' ||
        kind === 'retry'
      ) {
        const arrow = shape(
          [
            [-0.7, -0.18],
            [0.05, -0.18],
            [0.05, -0.48],
            [0.72, 0],
            [0.05, 0.48],
            [0.05, 0.18],
            [-0.7, 0.18],
          ],
          gold,
        );
        if (kind === 'previous') arrow.rotation.z = Math.PI;
        if (kind === 'jump') arrow.rotation.z = Math.PI / 2;
        if (kind === 'retry') {
          arrow.rotation.z = Math.PI / 2;
          mesh(new T.TorusGeometry(0.65, 0.13, 6, 20, 4.4), mint);
        }
        if (kind === 'previous' || kind === 'next')
          box(0, -0.58, -0.1, 0.13, 0.65, 0.14, wood);
      } else if (kind === 'play')
        shape(
          [
            [-0.45, -0.65],
            [0.7, 0],
            [-0.45, 0.65],
          ],
          mint,
        );
      else if (kind === 'bot') {
        box(0, 0, 0, 1.2, 0.9, 0.65, mint);
        for (const x of [-0.3, 0.3]) box(x, 0.1, 0.35, 0.2, 0.2, 0.09, gold);
        box(0, 0.7, 0, 0.1, 0.4, 0.1, wood);
        mesh(new T.OctahedronGeometry(0.16), gold, 0, 0.95, 0);
      }
      if (label) text(label, -1, 0.32);
      if (value) text(value, -1, 0.52, paper);
    }
    group.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(group),
      center = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3());
    for (const child of group.children) child.position.sub(center);
    scene.add(group);
    return {
      key,
      group,
      geos,
      width: Math.max(0.1, size.x) + 0.18,
      height: Math.max(0.1, size.y) + 0.18,
    };
  }
  let raf = 0,
    last = 0,
    disposed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const render = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (document.hidden || now - last < 33) return;
    last = now;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const drawingSize = renderer.getSize(new T.Vector2());
    if (drawingSize.x !== bounds.width || drawingSize.y !== bounds.height)
      renderer.setSize(bounds.width, bounds.height);
    camera.right = bounds.width;
    camera.top = bounds.height;
    camera.updateProjectionMatrix();
    const targets = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-object]'),
    );
    for (const [el, entry] of entries)
      if (!targets.includes(el)) {
        remove(entry);
        entries.delete(el);
      }
    for (const el of targets) {
      const key = JSON.stringify([
        el.dataset.object,
        el.dataset.label,
        el.dataset.value,
        el.dataset.stars,
        el.dataset.locked,
        el.getAttribute('aria-pressed'),
      ]);
      let e = entries.get(el);
      if (e?.key !== key) {
        if (e) remove(e);
        e = build(el, key);
        entries.set(el, e);
      }
      const r = el.getBoundingClientRect();
      const node = el.dataset.object === 'node';
      e!.group.visible =
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > bounds.top &&
        r.top < bounds.bottom &&
        (!node || (r.top > bounds.top + 85 && r.bottom < bounds.bottom - 145));
      const scale =
        Math.min(r.width / e!.width, r.height / e!.height) *
        (el.matches(':active') ? 0.92 : 1);
      e!.group.scale.setScalar(scale);
      e!.group.position.set(
        r.left - bounds.left + r.width / 2,
        bounds.bottom - r.top - r.height / 2,
        node ? 0 : 30,
      );
      e!.group.rotation.y =
        !reduced.matches && el.getAttribute('aria-pressed') === 'true'
          ? Math.sin(now * 0.002) * 0.09
          : 0;
    }
    renderer.render(scene, camera);
    scope.dataset.objectsReady = 'true';
  };
  raf = requestAnimationFrame(render);
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    entries.forEach(remove);
    materials.forEach((m) => m.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    delete scope.dataset.objectsReady;
  };
}
