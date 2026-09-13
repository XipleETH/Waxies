import * as T from 'three';

/** Seeded, instanced scenery: each region is a landscape, with a clear route corridor. */
export function createStoryLandscape(
  scene: T.Scene,
  chapter: number,
  route: T.CatmullRomCurve3,
  length: number,
) {
  const palettes = [
    {
      ground: 0x35533b,
      patch: 0x658049,
      rock: 0x496050,
      accent: 0xabc963,
      water: 0x397c78,
    },
    {
      ground: 0x285953,
      patch: 0x4b8d70,
      rock: 0x356e67,
      accent: 0xadd891,
      water: 0x286c78,
    },
    {
      ground: 0x403953,
      patch: 0x625071,
      rock: 0x776491,
      accent: 0xc298e6,
      water: 0x373b65,
    },
    {
      ground: 0x79583e,
      patch: 0xa7794c,
      rock: 0xb78358,
      accent: 0xe5bd75,
      water: 0x534333,
    },
    {
      ground: 0x486574,
      patch: 0x779b9f,
      rock: 0x91b5be,
      accent: 0xd6e9dc,
      water: 0x345e76,
    },
  ][chapter];
  const root = new T.Group();
  scene.add(root);
  const geos: T.BufferGeometry[] = [],
    mats: T.Material[] = [];
  let seed = 1531 + chapter * 917;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mat = (color: number) => {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: 1,
      flatShading: true,
    });
    mats.push(m);
    return m;
  };
  const ground = new T.PlaneGeometry(
    38,
    length + 40,
    30,
    Math.ceil((length + 40) / 1.4),
  );
  ground.rotateX(-Math.PI / 2);
  ground.translate(0, -1.45, length / 2);
  geos.push(ground);
  const pos = ground.attributes.position;
  for (let i = 0; i < pos.count; i++)
    pos.setY(
      i,
      -1.45 +
        Math.sin(pos.getX(i) * 0.7 + pos.getZ(i) * 0.27) * 0.16 +
        rand() * 0.07,
    );
  const terrain = ground.toNonIndexed();
  geos.push(terrain);
  const colors = [];
  const a = new T.Color(palettes.ground),
    b = new T.Color(palettes.patch);
  for (let i = 0; i < terrain.attributes.position.count; i += 3) {
    const c = a.clone().lerp(b, rand() * 0.24);
    for (let j = 0; j < 3; j++) colors.push(c.r, c.g, c.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const terrainMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: true,
  });
  mats.push(terrainMat);
  root.add(new T.Mesh(terrain, terrainMat));
  const corridor = route.getPoints(160);
  const clear = (x: number, z: number, r = 2.7) =>
    corridor.every((p) => Math.hypot(p.x - x, p.z - z) > r);
  const points: Array<{ x: number; z: number; s: number }> = [];
  for (let i = 0; i < 420; i++) {
    const x = (rand() - 0.5) * 27,
      z = rand() * (length + 22) - 11;
    if (clear(x, z)) points.push({ x, z, s: 0.45 + rand() * 0.9 });
  }
  const dummy = new T.Object3D();
  function batch(
    geo: T.BufferGeometry,
    color: number,
    places: typeof points,
    shape: (p: (typeof points)[number], i: number) => void,
  ) {
    geos.push(geo);
    const objects = new T.InstancedMesh(geo, mat(color), places.length);
    places.forEach((p, i) => {
      dummy.position.set(p.x, -1.05, p.z);
      dummy.rotation.set(0, rand() * 6.28, 0);
      dummy.scale.setScalar(p.s);
      shape(p, i);
      dummy.updateMatrix();
      objects.setMatrixAt(i, dummy.matrix);
    });
    objects.instanceMatrix.needsUpdate = true;
    objects.computeBoundingSphere();
    root.add(objects);
  }
  batch(
    new T.DodecahedronGeometry(1, 0),
    palettes.rock,
    points.filter((_, i) => i % 3 === 0),
    (p) => {
      dummy.scale.set(p.s * 0.9, p.s * 0.35, p.s * 0.7);
    },
  );
  const large = points.filter((p, i) => i % 3 === 1 && Math.abs(p.x) > 4.5);
  if (chapter === 0) {
    batch(new T.CylinderGeometry(0.09, 0.16, 1, 5), 0x765239, large, (p) => {
      dummy.position.y = -0.65;
      dummy.scale.y = p.s * 1.4;
    });
    batch(new T.IcosahedronGeometry(1, 0), palettes.patch, large, (p) => {
      dummy.position.y = 0.25;
      dummy.scale.set(p.s, p.s * 1.2, p.s);
    });
    batch(
      new T.IcosahedronGeometry(0.17, 0),
      palettes.accent,
      points.filter((_, i) => i % 3 === 2),
      () => {
        dummy.position.y = -0.85;
      },
    );
  } else if (chapter === 1) {
    batch(
      new T.CylinderGeometry(1, 1, 0.045, 12),
      palettes.water,
      points.filter((_, i) => i % 4 === 0),
      (p) => {
        dummy.position.y = -1.06;
        dummy.scale.set(p.s * 2.3, 1, p.s * 1.25);
      },
    );
    batch(new T.ConeGeometry(0.27, 1.5, 5), palettes.accent, large, (p) => {
      dummy.position.y = -0.4;
      dummy.scale.set(p.s * 0.7, p.s, p.s * 0.7);
    });
    batch(
      new T.CylinderGeometry(0.45, 0.5, 0.1, 7),
      palettes.patch,
      points.filter((_, i) => i % 4 === 0),
      () => {
        dummy.position.y = -1;
      },
    );
  } else if (chapter === 2) {
    batch(new T.OctahedronGeometry(0.75), palettes.accent, large, (p) => {
      dummy.position.y = -0.1;
      dummy.scale.set(p.s * 0.7, p.s * 2, p.s * 0.7);
      dummy.rotation.z = 0.2;
    });
    batch(
      new T.OctahedronGeometry(0.35),
      palettes.patch,
      points.filter((_, i) => i % 3 === 2),
      (p) => {
        dummy.position.y = -0.8;
        dummy.scale.y = p.s * 1.6;
      },
    );
  } else if (chapter === 3) {
    batch(
      new T.CylinderGeometry(0.7, 1.15, 1.7, 6),
      palettes.rock,
      large,
      (p) => {
        dummy.position.y = -0.45;
        dummy.scale.set(p.s * 1.2, p.s, p.s);
      },
    );
    batch(
      new T.CylinderGeometry(0.72, 0.85, 0.25, 6),
      palettes.accent,
      large,
      (p) => {
        dummy.position.y = -0.45 + p.s * 0.8;
        dummy.scale.set(p.s * 1.2, p.s, p.s);
      },
    );
    batch(
      new T.ConeGeometry(0.2, 0.8, 4),
      0x79916a,
      points.filter((_, i) => i % 3 === 2),
      () => {
        dummy.position.y = -0.9;
      },
    );
  } else {
    batch(new T.ConeGeometry(1, 2.6, 5), palettes.rock, large, (p) => {
      dummy.position.y = -0.25;
      dummy.scale.set(p.s, p.s, p.s);
    });
    batch(new T.ConeGeometry(0.57, 1.35, 5), palettes.accent, large, (p) => {
      dummy.position.y = -0.25 + p.s * 0.66;
    });
    batch(
      new T.CylinderGeometry(1, 1, 0.08, 7),
      palettes.accent,
      points.filter((_, i) => i % 3 === 2),
      (p) => {
        dummy.position.y = -1.08;
        dummy.scale.set(p.s * 1.5, 1, p.s * 0.6);
      },
    );
  }
  // Broken earth shelves follow the route, visually joining the dungeon islands.
  batch(
    new T.CylinderGeometry(1, 1.15, 0.4, 7),
    palettes.patch,
    corridor
      .filter((_, i) => i % 4 === 0)
      .map((p) => ({ x: p.x, z: p.z, s: 1.1 })),
    () => {
      dummy.position.y = -0.9;
      dummy.scale.set(1.45, 1, 1.25);
    },
  );
  return () => {
    root.removeFromParent();
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    root.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
    });
  };
}
