import * as T from 'three';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
let fontPromise: Promise<Font> | undefined;
const fontForUI = () =>
  (fontPromise ??= new FontLoader()
    .loadAsync('/assets/ui/helvetiker-bold.json')
    .then((font) => {
      // Extend the bundled Latin font with raised accents, keeping real geometry.
      for (const [accented, base] of Object.entries({
        á: 'a',
        é: 'e',
        í: 'i',
        ó: 'o',
        ú: 'u',
        Á: 'A',
        É: 'E',
        Í: 'I',
        Ó: 'O',
        Ú: 'U',
      })) {
        if (font.data.glyphs[accented]) continue;
        const glyph = font.data.glyphs[base];
        const x = glyph.ha * 0.5,
          y = base === base.toUpperCase() ? 1080 : 820;
        font.data.glyphs[accented] = {
          ...glyph,
          o:
            glyph.o +
            ' m ' +
            x +
            ' ' +
            y +
            ' l ' +
            (x + 90) +
            ' ' +
            (y + 150) +
            ' l ' +
            (x + 210) +
            ' ' +
            (y + 150) +
            ' l ' +
            (x + 75) +
            ' ' +
            y +
            ' l ' +
            x +
            ' ' +
            y,
        };
      }
      for (const [accented, base] of [
        ['ñ', 'n'],
        ['Ñ', 'N'],
      ]) {
        if (font.data.glyphs[accented]) continue;
        const glyph = font.data.glyphs[base],
          x = glyph.ha * 0.2,
          y = base === 'n' ? 840 : 1100;
        font.data.glyphs[accented] = {
          ...glyph,
          o:
            glyph.o +
            ' m ' +
            x +
            ' ' +
            y +
            ' l ' +
            (x + 90) +
            ' ' +
            (y + 70) +
            ' l ' +
            (x + 230) +
            ' ' +
            (y + 20) +
            ' l ' +
            (x + 320) +
            ' ' +
            (y + 70) +
            ' l ' +
            (x + 350) +
            ' ' +
            (y + 10) +
            ' l ' +
            (x + 240) +
            ' ' +
            (y - 50) +
            ' l ' +
            (x + 100) +
            ' ' +
            y +
            ' l ' +
            (x + 30) +
            ' ' +
            (y - 50) +
            ' l ' +
            x +
            ' ' +
            y,
        };
      }
      return font;
    })
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
    teal = mat(0x55d4bf),
    violet = mat(0xad83e6),
    ember = mat(0xe49a53);
  const entries = new Map<
    HTMLElement,
    {
      key: string;
      group: T.Group;
      geos: T.BufferGeometry[];
      ownedMaterials: T.Material[];
      width: number;
      height: number;
    }
  >();
  const remove = (
    entry: typeof entries extends Map<HTMLElement, infer E> ? E : never,
  ) => {
    entry.group.removeFromParent();
    entry.geos.forEach((g) => g.dispose());
    entry.ownedMaterials.forEach((m) => m.dispose());
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
    const aliases: Record<string, string> = {
      wallet: 'wallet',
      chest: 'reward',
      scroll: 'scroll',
      emotes: 'emotes',
    };
    const kind = aliases[el.dataset.object ?? ''] ?? el.dataset.object,
      label = el.dataset.label ?? '',
      value = el.dataset.value ?? '';
    if (kind === 'balance') {
      const spark = shape(
        [
          [0, 0.55],
          [0.12, 0.12],
          [0.5, 0],
          [0.12, -0.12],
          [0, -0.55],
          [-0.12, -0.12],
          [-0.5, 0],
          [-0.12, 0.12],
        ],
        gold,
      );
      spark.position.x = -1;
      mesh(new T.OctahedronGeometry(0.1), gold, -1.43, 0.44, 0.1);
      const amount = text(value, 0, 0.58, gold);
      const offset =
        new T.Box3().setFromObject(amount).getSize(new T.Vector3()).x / 2 -
        0.45;
      group.children.slice(-2).forEach((child) => {
        child.position.x += offset;
      });
    } else if (kind === 'title') {
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
      if (kind === 'haptics') {
        box(0, 0, 0, 1.05, 0.55, 0.4, mint);
        for (const x of [-0.48, 0.48]) box(x, -0.24, 0, 0.27, 0.55, 0.4, mint);
        box(-0.27, 0.04, 0.23, 0.32, 0.08, 0.08, dark);
        box(-0.27, 0.04, 0.23, 0.08, 0.32, 0.08, dark);
        for (const x of [0.18, 0.37])
          mesh(new T.SphereGeometry(0.075, 8, 6), gold, x, x - 0.2, 0.25);
        for (const side of [-1, 1]) {
          const wave = mesh(
            new T.TorusGeometry(0.32, 0.035, 5, 12, 2.2),
            gold,
            side * 0.79,
            0,
            0,
          );
          wave.rotation.z = side === 1 ? -1.1 : Math.PI - 1.1;
        }
      } else if (kind === 'pedestal') {
        const active = el.getAttribute('aria-pressed') === 'true';
        mesh(
          new T.CylinderGeometry(0.68, 0.78, 0.2, 8),
          active ? gold : mint,
          0,
          0,
          0,
        );
        mesh(new T.CylinderGeometry(0.76, 0.72, 0.12, 8), dark, 0, -0.15, 0);
        text(label, -0.54, 0.3);
        if (el.dataset.placed === 'true')
          mesh(new T.OctahedronGeometry(0.09), gold, 0.65, 0.13, 0);
      } else if (kind === 'moss' || kind === 'amethyst' || kind === 'ember') {
        const stone =
          kind === 'amethyst' ? violet : kind === 'ember' ? ember : mint;
        box(0, -0.07, 0, 1.15, 1, 0.7, stone);
        for (const x of [-0.55, 0.55]) {
          box(x, 0.2, 0, 0.38, 1.3, 0.85, stone);
          for (const dx of [-0.1, 0.1])
            box(x + dx, 0.93, 0, 0.14, 0.2, 0.85, gold);
        }
        box(0, -0.26, 0.38, 0.4, 0.65, 0.1, dark);
        box(0, -0.7, 0.04, 1.6, 0.18, 1, wood);
      } else if (kind === 'crystals') {
        for (const [x, y, r] of [
          [-0.4, 0, 0.3],
          [0, 0.2, 0.46],
          [0.42, -0.1, 0.28],
        ]) {
          const crystal = mesh(new T.OctahedronGeometry(r), violet, x, y, 0);
          crystal.scale.y = 1.8;
        }
        mesh(new T.CylinderGeometry(0.65, 0.75, 0.17, 7), mint, 0, -0.6, 0);
      } else if (kind === 'lantern') {
        box(0, -0.52, 0, 0.9, 0.15, 0.65, wood);
        box(0, 0.55, 0, 0.95, 0.18, 0.7, gold);
        for (const x of [-0.36, 0.36]) box(x, 0, 0.25, 0.09, 1, 0.09, gold);
        const flame = mesh(new T.OctahedronGeometry(0.34), ember, 0, 0, 0.07);
        flame.scale.y = 1.5;
        mesh(new T.TorusGeometry(0.18, 0.045, 6, 12), gold, 0, 0.83, 0);
      } else if (kind === 'wallet') {
        box(0, -0.05, 0, 1.2, 0.8, 0.75, wood);
        box(0, 0.45, 0, 1.3, 0.24, 0.82, gold);
        for (const x of [-0.4, 0.4]) box(x, 0, 0.4, 0.11, 0.8, 0.06, gold);
        box(0, 0.05, 0.46, 0.25, 0.25, 0.12, gold);
      } else if (kind === 'scroll') {
        box(0, 0, 0, 1.05, 1.2, 0.09, paper);
        for (const y of [-0.62, 0.62])
          mesh(
            new T.CylinderGeometry(0.13, 0.13, 1.35, 8),
            gold,
            0,
            y,
            0.03,
          ).rotation.z = Math.PI / 2;
        for (let i = 0; i < 3; i++)
          box(0, 0.3 - i * 0.25, 0.07, 0.65, 0.035, 0.025, wood);
      } else if (kind === 'emotes') {
        const face = mesh(new T.SphereGeometry(0.63, 16, 12), gold);
        face.scale.z = 0.45;
        for (const x of [-0.22, 0.22])
          mesh(new T.SphereGeometry(0.075, 8, 6), dark, x, 0.14, 0.29);
        mesh(
          new T.TorusGeometry(0.28, 0.04, 6, 16, Math.PI),
          dark,
          0,
          -0.08,
          0.3,
        ).rotation.z = Math.PI;
      } else if (kind === 'search') {
        mesh(new T.TorusGeometry(0.48, 0.1, 6, 20), gold, 0, 0.16, 0);
        const handle = box(0.4, -0.47, 0, 0.18, 0.6, 0.23, wood);
        handle.rotation.z = 0.65;
      } else if (kind === 'axie') {
        const body = mesh(new T.IcosahedronGeometry(0.7, 2), mint);
        body.scale.set(1.15, 0.9, 0.8);
        for (const x of [-0.28, 0.28]) {
          mesh(new T.SphereGeometry(0.19, 12, 8), paper, x, 0.08, 0.48);
          mesh(new T.SphereGeometry(0.115, 12, 8), dark, x, 0.08, 0.63);
          mesh(new T.SphereGeometry(0.045, 8, 6), paper, x - 0.035, 0.13, 0.72);
          const ear = mesh(
            new T.ConeGeometry(0.18, 0.5, 5),
            gold,
            x * 1.7,
            0.69,
            0,
          );
          ear.rotation.z = -x;
          mesh(new T.SphereGeometry(0.16, 8, 6), teal, x, -0.56, 0.1);
        }
        mesh(
          new T.TorusGeometry(0.13, 0.025, 5, 12, Math.PI),
          dark,
          0,
          -0.23,
          0.56,
        ).rotation.z = Math.PI;
      } else if (kind === 'swords' || kind === 'edit') {
        for (const angle of kind === 'edit' ? [-0.55] : [-0.65, 0.65]) {
          const weapon = new T.Group();
          const start = icon.children.length;
          box(0, 0.1, 0, 0.17, 1.1, 0.17, kind === 'edit' ? gold : paper);
          mesh(
            new T.ConeGeometry(0.13, 0.32, 4),
            kind === 'edit' ? dark : paper,
            0,
            0.78,
            0,
          );
          box(0, -0.48, 0, 0.58, 0.13, 0.25, gold);
          box(0, -0.72, 0, 0.15, 0.35, 0.18, wood);
          const pieces = icon.children.slice(start);
          pieces.forEach((p) => weapon.add(p));
          weapon.rotation.z = angle;
          icon.add(weapon);
        }
      } else if (kind === 'training') {
        box(0, 0, 0, 1.25, 0.17, 0.2, gold);
        for (const x of [-0.52, 0.52]) {
          mesh(
            new T.CylinderGeometry(0.36, 0.36, 0.25, 8),
            mint,
            x,
            0,
            0,
          ).rotation.z = Math.PI / 2;
          mesh(
            new T.CylinderGeometry(0.24, 0.24, 0.15, 8),
            gold,
            x * 1.5,
            0,
            0,
          ).rotation.z = Math.PI / 2;
        }
        icon.rotation.z = 0.35;
      } else if (kind === 'shop') {
        box(0, -0.28, 0, 1.3, 0.6, 0.75, wood);
        for (const x of [-0.56, 0.56]) box(x, 0.25, 0, 0.1, 1, 0.1, gold);
        for (let i = 0; i < 5; i++)
          box((i - 2) * 0.3, 0.65, 0.12, 0.3, 0.22, 1.05, i % 2 ? paper : mint);
        mesh(new T.OctahedronGeometry(0.22), gold, 0, 0.04, 0.36);
      } else if (kind === 'save') {
        box(0, 0, 0, 1.1, 1.25, 0.25, wood);
        box(0, 0, 0.16, 0.92, 1.08, 0.08, paper);
        const a = box(-0.18, -0.05, 0.24, 0.16, 0.48, 0.15, mint);
        a.rotation.z = 0.7;
        const b = box(0.12, 0.09, 0.24, 0.16, 0.8, 0.15, mint);
        b.rotation.z = -0.55;
      } else if (kind === 'home') {
        box(0, -0.1, 0, 1.1, 0.9, 0.7, mint);
        const roof = mesh(new T.ConeGeometry(0.92, 0.65, 4), gold, 0, 0.65, 0);
        roof.rotation.y = Math.PI / 4;
        box(0, -0.27, 0.37, 0.34, 0.6, 0.08, dark);
        box(0, -0.65, 0.1, 1.35, 0.14, 0.95, wood);
      } else if (kind === 'portal' || kind === 'map') {
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
      if (label && kind !== 'pedestal')
        text(
          label,
          -1,
          el.dataset.frame ? 0.4 : 0.32,
          el.getAttribute('aria-selected') === 'true' ? gold : paper,
        );
      if (el.dataset.caption) text(el.dataset.caption, 1.08, 0.28, gold);
      if (value) text(value, -1, 0.52, paper);
    }
    if (el.dataset.frame === 'true') {
      group.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(group),
        size = b.getSize(new T.Vector3()),
        center = b.getCenter(new T.Vector3());
      const rect = el.getBoundingClientRect();
      const h = size.y + 0.5,
        w = Math.max(size.x + 0.5, (h * rect.width) / Math.max(1, rect.height));
      const outline = new T.Shape();
      const rounded = (
        path: T.Shape | T.Path,
        x: number,
        y: number,
        width: number,
        height: number,
        r: number,
      ) => {
        path.moveTo(x + r, y);
        path.lineTo(x + width - r, y);
        path.quadraticCurveTo(x + width, y, x + width, y + r);
        path.lineTo(x + width, y + height - r);
        path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        path.lineTo(x + r, y + height);
        path.quadraticCurveTo(x, y + height, x, y + height - r);
        path.lineTo(x, y + r);
        path.quadraticCurveTo(x, y, x + r, y);
      };
      rounded(outline, -w / 2, -h / 2, w, h, 0.22);
      const hole = new T.Path();
      rounded(hole, -w / 2 + 0.14, -h / 2 + 0.14, w - 0.28, h - 0.28, 0.14);
      outline.holes.push(hole);
      const selected =
        el.getAttribute('aria-current') === 'page' ||
        el.getAttribute('aria-pressed') === 'true';
      mesh(
        new T.ExtrudeGeometry(outline, {
          depth: 0.18,
          bevelEnabled: true,
          bevelSize: 0.025,
          bevelThickness: 0.035,
          bevelSegments: 1,
          curveSegments: 4,
        }),
        [selected ? gold : mint, dark],
        center.x,
        center.y,
        -0.38,
        group,
      );
    }
    group.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(group),
      center = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3());
    for (const child of group.children) child.position.sub(center);
    const ownedMaterials: T.Material[] = [];
    if (el.matches(':disabled')) {
      const faded = new Map<T.Material, T.Material>();
      const dim = (material: T.Material) => {
        if (!faded.has(material)) {
          const clone = material.clone();
          clone.transparent = true;
          clone.opacity = 0.35;
          clone.depthWrite = false;
          faded.set(material, clone);
          ownedMaterials.push(clone);
        }
        return faded.get(material)!;
      };
      group.traverse((o) => {
        if (o instanceof T.Mesh)
          o.material = Array.isArray(o.material)
            ? o.material.map(dim)
            : dim(o.material);
      });
    }
    scene.add(group);
    return {
      key,
      group,
      geos,
      ownedMaterials,
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
    ).filter((el) => el.closest('[data-object-scope]') === scope);
    for (const [el, entry] of entries)
      if (!targets.includes(el)) {
        remove(entry);
        entries.delete(el);
      }
    for (const el of targets) {
      const key = JSON.stringify([
        el.dataset.object,
        el.matches(':disabled'),
        el.dataset.label,
        el.dataset.value,
        el.dataset.stars,
        el.dataset.caption,
        el.dataset.frame,
        el.dataset.placed,
        el.getAttribute('aria-current'),
        el.getAttribute('aria-selected'),
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
      let insideScroll = true;
      let scroll = el.parentElement?.closest<HTMLElement>(
        '[data-object-scroll]',
      );
      while (scroll && scope.contains(scroll)) {
        const clip = scroll.getBoundingClientRect();
        insideScroll =
          insideScroll &&
          r.top >= clip.top &&
          r.bottom <= clip.bottom &&
          r.left >= clip.left &&
          r.right <= clip.right;
        scroll = scroll.parentElement?.closest<HTMLElement>(
          '[data-object-scroll]',
        );
      }
      const node = el.dataset.object === 'node';
      e!.group.visible =
        r.width > 0 &&
        r.height > 0 &&
        insideScroll &&
        r.bottom > bounds.top &&
        r.top < bounds.bottom &&
        (!node || (r.top > bounds.top + 85 && r.bottom < bounds.bottom - 145));
      const scale =
        Math.min(r.width / e!.width, r.height / e!.height) *
        (el.matches(':active') ? 0.92 : 1) *
        (el.matches(':disabled') ? 0.88 : 1);
      e!.group.scale.setScalar(scale);
      e!.group.position.set(
        r.left - bounds.left + r.width / 2,
        bounds.bottom - r.top - r.height / 2,
        node ? 0 : 30,
      );
      e!.group.rotation.y =
        !reduced.matches &&
        (el.getAttribute('aria-pressed') === 'true' ||
          el.getAttribute('aria-current') === 'page')
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
