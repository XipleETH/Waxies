import * as T from 'three';
/** The raid button is a real lit 3D mesh (same spirit as object-menu-scene),
   not a CSS card. The DOM overlays only an invisible label + hit target. */
export function createStoryActionScene(host: HTMLElement) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-5.8, 5.8, 1.3, -1.3, 0.1, 40);
  camera.position.set(0, 3.4, 12);
  camera.lookAt(0, -0.1, 0);
  scene.add(new T.HemisphereLight(0xfffbe4, 0x2b4534, 2.7));
  const key = new T.DirectionalLight(0xfff0c6, 2.7);
  key.position.set(-6, 9, 10);
  scene.add(key);
  const geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [];
  const mat = (color: number) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.62 });
    materials.push(m);
    return m;
  };
  const faceOn = mat(0xd8e7a6),
    edgeOn = mat(0x9cbb70),
    baseOn = mat(0x5a7444),
    faceOff = mat(0x63806a),
    edgeOff = mat(0x49624f),
    baseOff = mat(0x2b4335);
  function roundedRect(w: number, h: number, r: number) {
    const s = new T.Shape(),
      x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w: number, h: number, r: number, depth: number, bevel: number) {
    const geo = new T.ExtrudeGeometry(roundedRect(w, h, r), {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 7,
      steps: 1,
    });
    geo.center();
    geometries.push(geo);
    return geo;
  }
  const base = new T.Mesh(slab(11.1, 1.9, 0.62, 0.4, 0), baseOn);
  base.position.set(0, -0.28, -0.3);
  scene.add(base);
  const lift = new T.Group();
  scene.add(lift);
  const top = new T.Mesh(slab(10.9, 1.78, 0.58, 0.5, 0.17), [faceOn, edgeOn]);
  lift.add(top);
  let locked = false,
    pressed = false,
    liftY = 0,
    disposed = false,
    dirty = true;
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.top = (5.8 * h) / w;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    const target = pressed ? -0.34 : 0;
    if (Math.abs(liftY - target) > 0.002) {
      liftY += (target - liftY) * 0.35;
      dirty = true;
    } else if (liftY !== target) {
      liftY = target;
      dirty = true;
    }
    const bob = reduce.matches ? 0 : Math.sin(t * 0.0016) * 0.03;
    lift.position.y = liftY + bob;
    if (!reduce.matches && !locked) dirty = true;
    if (dirty && !disposed) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  raf = requestAnimationFrame(frame);
  return {
    setLocked(next: boolean) {
      if (locked === next) return;
      locked = next;
      top.material = next ? [faceOff, edgeOff] : [faceOn, edgeOn];
      base.material = next ? baseOff : baseOn;
      pressed = false;
      dirty = true;
    },
    setPressed(next: boolean) {
      pressed = next && !locked;
      dirty = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
