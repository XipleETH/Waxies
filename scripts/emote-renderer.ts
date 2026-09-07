import * as T from 'three';
import { loadMixedAvatar } from '../lib/game/mixer-avatar';
import { EMOTES } from '../lib/game/emotes';
export async function emoteRenderer(index: number) {
  const e = EMOTES[index],
    renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(1);
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(32, 1, 0.1, 50);
  const model = await loadMixedAvatar(e.genes, new AbortController().signal);
  const g = new T.Group();
  g.add(model.root);
  scene.add(g);
  model.root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(g),
    center = box.getCenter(new T.Vector3()),
    size = box.getSize(new T.Vector3());
  model.root.position.sub(center);
  const scale = 2.25 / Math.max(size.x, size.y, size.z);
  g.scale.setScalar(scale);
  camera.position.set(0, 0.55, 5.2);
  camera.lookAt(0, 0, 0);
  model.actions.idle?.play();
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  function frame(f: number) {
    const t = f / 24,
      a = t * Math.PI * 2;
    g.rotation.set(0, 0.12, 0);
    g.position.set(0, 0, 0);
    g.scale.setScalar(scale);
    model.mixer.setTime(t * 2);
    switch (index) {
      case 0:
        g.rotation.z = Math.sin(a) * 0.2;
        break;
      case 1:
        g.position.y = Math.abs(Math.sin(a)) * 0.3;
        break;
      case 2:
        g.rotation.x = Math.sin(a) * 0.3;
        break;
      case 3:
        g.rotation.y = a;
        break;
      case 4:
        g.scale.y = scale * (1 + Math.sin(a * 2) * 0.09);
        g.rotation.z = Math.sin(a) * 0.14;
        break;
      case 5:
        g.rotation.z = Math.sin(a) * 0.32;
        break;
      case 6:
        g.position.y = Math.sin(a) * 0.12;
        break;
      case 7:
        g.rotation.y = Math.sin(a) * 0.6;
        g.position.y = Math.abs(Math.sin(a)) * 0.25;
        break;
      case 8:
        g.position.x = Math.sin(a * 4) * 0.08;
        break;
      case 9:
        g.rotation.x = Math.sin(a) * 0.1;
        g.scale.multiplyScalar(1 + Math.sin(a) * 0.09);
        break;
      case 10:
        g.rotation.x = 0.18;
        g.position.y = -Math.abs(Math.sin(a)) * 0.12;
        break;
      case 11:
        g.rotation.z = Math.sin(a * 4) * 0.08;
        g.position.x = Math.sin(a * 4) * 0.08;
        break;
      case 12:
        g.position.y = Math.abs(Math.sin(a * 2)) * 0.35;
        g.rotation.z = Math.sin(a) * 0.25;
        break;
      case 13:
        g.rotation.z = -0.25;
        g.scale.y = scale * (0.94 + Math.sin(a) * 0.035);
        break;
      case 14:
        g.rotation.y = Math.sin(a * 2) * 0.65;
        g.position.x = Math.sin(a * 2) * 0.2;
        break;
      case 15:
        g.rotation.z = Math.sin(a * 2) * 0.16;
        g.rotation.y = -0.35;
        break;
      case 16:
        g.rotation.x = Math.sin(Math.PI * t) * 0.5;
        g.position.y = -Math.sin(Math.PI * t) * 0.12;
        break;
      case 17:
        g.rotation.y = Math.sin(a) * 0.4;
        g.position.y = Math.abs(Math.sin(a)) * 0.3;
        break;
      case 18:
        g.scale.set(
          scale * (1 - Math.abs(Math.sin(a)) * 0.08),
          scale * 0.92,
          scale,
        );
        g.rotation.z = Math.sin(a * 6) * 0.04;
        break;
      case 19:
        g.rotation.y = Math.sin(a) * 0.28;
        g.position.y = Math.sin(a) * 0.2;
        break;
    }
    renderer.render(scene, camera);
    ctx.fillStyle = '#142e28';
    ctx.fillRect(0, 0, 160, 160);
    const gradient = ctx.createRadialGradient(80, 76, 8, 80, 76, 73);
    gradient.addColorStop(0, index % 2 ? '#688e56' : '#486b62');
    gradient.addColorStop(1, '#142e28');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 160, 145);
    ctx.drawImage(renderer.domElement, 0, -9);
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6df93';
    ctx.fillText(e.name.toUpperCase(), 80, 151);
    for (let j = 0; j < 5; j++) {
      const angle = a + (j * Math.PI * 2) / 5,
        x = 80 + Math.cos(angle) * 62,
        y = 72 + Math.sin(angle) * 49;
      ctx.fillStyle = ['#ff96b5', '#f5d26b', '#aeecc3', '#c8b5fa'][index % 4];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      if (index === 6) {
        ctx.font = '18px sans-serif';
        ctx.fillText('♥', 0, 0);
      } else if (index === 13) {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('z', 0, 0);
      } else if (index === 10) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#8cd9ff';
        ctx.fill();
      } else if (index === 11) {
        ctx.font = 'bold 21px sans-serif';
        ctx.fillStyle = '#ffa75d';
        ctx.fillText('!', 0, 0);
      } else if (index === 18) {
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('?', 0, 0);
      } else if (index === 19) {
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f8d06c';
        ctx.fill();
        ctx.fillStyle = '#8b6425';
        ctx.fillRect(-1, -3, 2, 6);
      } else {
        ctx.fillRect(-2, -4, 4, 8);
        ctx.fillRect(-4, -2, 8, 4);
      }
      ctx.restore();
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }
  return {
    frame,
    dispose() {
      model.dispose();
      renderer.dispose();
    },
  };
}
