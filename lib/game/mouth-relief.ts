import * as T from 'three';

// These official cutouts are facial strokes, not self-contained silhouettes.
export const isLineMouth = (id: string) =>
  ['serious', 'zigzag', 'cute-bunny'].includes(id);

/** A mouth-only trap housing. The official stroke stays intact; no face or teeth are added. */
export function createMouthRelief(map: T.Texture, color: string) {
  const root = new T.Group();
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];
  const surface = (tint: T.Color) => {
    // Fixed cel shading avoids both black unlit meshes and washed-out lobby lighting.
    const material = new T.ShaderMaterial({
      uniforms: { tint: { value: tint } },
      vertexShader: `varying vec3 surfaceNormal;
        void main() {
          surfaceNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform vec3 tint; varying vec3 surfaceNormal;
        void main() {
          float light = dot(normalize(surfaceNormal), normalize(vec3(-0.5, 0.8, 1.0)));
          float shade = light > 0.45 ? 1.0 : light > -0.2 ? 0.8 : 0.58;
          gl_FragColor = vec4(tint * shade, 1.0);
          #include <colorspace_fragment>
        }`,
      toneMapped: false,
      fog: false,
    });
    materials.push(material);
    return material;
  };
  const tint = new T.Color(color);
  const hsl = tint.getHSL({ h: 0, s: 0, l: 0 });
  tint.setHSL(hsl.h, Math.max(0.72, hsl.s), 0.39);
  const lipMaterial = surface(tint);
  const jaw = (upper: boolean) => {
    const sign = upper ? 1 : -1;
    const shape = new T.Shape();
    shape.moveTo(-0.49, 0);
    shape.bezierCurveTo(-0.47, sign * 0.23, 0.47, sign * 0.23, 0.49, 0);
    shape.quadraticCurveTo(0, sign * -0.02, -0.49, 0);
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.035,
      bevelSegments: 3,
      curveSegments: 16,
      steps: 1,
    });
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, lipMaterial);
    root.add(mesh);
    return mesh;
  };
  const upper = jaw(true),
    lower = jaw(false);
  const insideGeometry = new T.SphereGeometry(1, 20, 12);
  geometries.push(insideGeometry);
  const inside = new T.Mesh(
    insideGeometry,
    surface(tint.clone().multiplyScalar(0.28)),
  );
  inside.position.z = 0.025;
  root.add(inside);
  const strokeMaterial = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  materials.push(strokeMaterial);
  const strokeGeometry = new T.PlaneGeometry(1, 1);
  geometries.push(strokeGeometry);
  const stroke = new T.Mesh(strokeGeometry, strokeMaterial);
  stroke.position.z = 0.192;
  root.add(stroke);
  const setOpen = (amount: number) => {
    const open = T.MathUtils.clamp(amount, 0, 1);
    upper.position.y = 0.02 + open * 0.105;
    lower.position.y = -0.02 - open * 0.19;
    lower.rotation.x = open * 0.16;
    inside.scale.set(0.47, 0.085 + open * 0.2, 0.13);
    inside.position.y = -open * 0.045;
    const image = map.image as { width?: number; height?: number } | undefined;
    const ratio =
      image?.width && image.height ? image.height / image.width : 1 / 6;
    stroke.scale.set(0.91, 0.91 * ratio, 1);
    stroke.position.y = upper.position.y + 0.016;
  };
  setOpen(0);
  return {
    root,
    setOpen,
    dispose: () => {
      root.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
