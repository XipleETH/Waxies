import * as T from 'three';
import { loadMixedAvatar } from '../lib/game/mixer-avatar';
import { EMOTES } from '../lib/game/emotes';
/** Facial and body acting applied only to exported emotes, never the playable avatar. */
export async function emoteRenderer(index: number) {
  const model = await loadMixedAvatar(
    EMOTES[index].genes,
    new AbortController().signal,
  );
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x142e28, 1);
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(32, 1, 0.1, 50),
    actor = new T.Group();
  actor.add(model.root);
  scene.add(actor);
  model.root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(actor),
    center = bounds.getCenter(new T.Vector3()),
    size = bounds.getSize(new T.Vector3());
  model.root.position.sub(center);
  const fit = 1.95 / Math.max(size.x, size.y, size.z);
  actor.scale.setScalar(fit);
  camera.position.set(0, 0.2, 5.2);
  camera.lookAt(0, 0, 0);
  model.actions.idle?.play();
  model.mixer.setTime(0);
  const bones = new Map<string, T.Object3D[]>();
  model.root.traverse((n) => {
    if (n instanceof T.Bone) {
      const list = bones.get(n.name) ?? [];
      list.push(n);
      bones.set(n.name, list);
    }
  });
  const neutral = new Map<
    T.Object3D,
    { p: T.Vector3; q: T.Quaternion; s: T.Vector3 }
  >();
  bones.forEach((list) =>
    list.forEach((n) =>
      neutral.set(n, {
        p: n.position.clone(),
        q: n.quaternion.clone(),
        s: n.scale.clone(),
      }),
    ),
  );
  const turn = (name: string, x = 0, y = 0, z = 0) =>
    bones
      .get(name)
      ?.forEach((n) =>
        n.quaternion.multiply(
          new T.Quaternion().setFromEuler(new T.Euler(x, y, z)),
        ),
      );
  const stretch = (name: string, x = 1, y = 1, z = 1) =>
    bones.get(name)?.forEach((n) => n.scale.multiply(new T.Vector3(x, y, z)));
  const raiseArm = (side: string, angle: number) => {
    const arm = bones.get('Arm_' + side + '_JNT')?.[0],
      hand = bones.get('Hand_' + side + '_JNT')?.[0];
    if (!arm?.parent || !hand || !angle) return;
    model.root.updateMatrixWorld(true);
    const pivot = arm.getWorldPosition(new T.Vector3()),
      end = hand.getWorldPosition(new T.Vector3()),
      direction = end.clone().sub(pivot);
    const sign = Math.sign(direction.x) || (side === 'L' ? 1 : -1);
    const target = pivot
      .clone()
      .add(
        direction.clone().applyAxisAngle(new T.Vector3(0, 0, 1), sign * angle),
      );
    const localPivot = arm.parent.worldToLocal(pivot.clone()),
      from = arm.parent.worldToLocal(end).sub(localPivot).normalize(),
      to = arm.parent.worldToLocal(target).sub(localPivot).normalize();
    arm.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(from, to));
  };
  const lift = (side: string, amount: number) => {
    const n = bones.get('Clavivle_' + side + '_JNT')?.[0];
    if (!n?.parent) return;
    model.root.updateMatrixWorld(true);
    const pos = n.getWorldPosition(new T.Vector3());
    pos.y += amount * fit;
    n.position.copy(n.parent.worldToLocal(pos));
  };
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  function frame(f: number) {
    neutral.forEach((b, n) => {
      n.position.copy(b.p);
      n.quaternion.copy(b.q);
      n.scale.copy(b.s);
    });
    model.mixer.setTime(f / 12);
    const a = (f / 24) * Math.PI * 2,
      s = Math.sin(a),
      bounce = Math.max(0, s),
      pulse = (1 - Math.cos(a)) / 2,
      blink = 1 - 0.88 * Math.pow(Math.max(0, Math.cos(a)), 18);
    let eyes = blink,
      mouthX = 1,
      mouthY = 1,
      tilt = 0,
      head = 0,
      left = 0,
      right = 0,
      elbows = 0,
      jump = 0,
      squash = 1,
      eyeAngle = 0;
    actor.rotation.set(0, 0.08, 0);
    actor.position.set(0, 0, 0);
    switch (index) {
      case 0:
        eyes = 0.75 + 0.25 * blink;
        left = -0.85 + Math.sin(a * 2) * 0.3;
        head = 0.08 * s;
        mouthX = 1.12;
        break;
      case 1:
        eyes = 0.35 + 0.35 * (1 - pulse);
        head = 0.22 * s;
        left = -0.45;
        right = 0.45;
        mouthX = 1.2;
        mouthY = 1.2;
        break;
      case 2:
        head = 0.35 * pulse;
        eyes = 1 - 0.8 * pulse;
        left = -0.3;
        right = 0.3;
        elbows = 0.2;
        break;
      case 3:
        eyes = 0.6;
        mouthX = 1.15;
        left = -0.4;
        right = 0.8;
        head = -0.1;
        turn('Eye_ML_1_JNT', 0, 0, 0.1);
        stretch('Eye_ML_1_JNT', 1, 0.15, 1);
        break;
      case 4:
        eyes = 0.12 + 0.1 * pulse;
        mouthX = 1.35;
        mouthY = 1.5 + 0.35 * Math.sin(a * 3);
        head = -0.14;
        elbows = 0.25;
        jump = Math.abs(Math.sin(a * 2)) * 0.07;
        squash = 1 - 0.055 * Math.sin(a * 4);
        break;
      case 5:
        eyes = 1 + 0.35 * pulse;
        mouthX = 0.7;
        mouthY = 1.4;
        head = -0.2 * pulse;
        left = -0.65 * pulse;
        right = 0.65 * pulse;
        tilt = 0.12 * s;
        break;
      case 6:
        eyes = 0.18 + 0.35 * (1 - pulse);
        mouthX = 1.15;
        mouthY = 0.75;
        head = 0.08;
        left = -0.65;
        right = 0.65;
        elbows = 0.65;
        tilt = 0.08 * s;
        break;
      case 7:
        eyes = 0.2;
        mouthX = 1.4;
        mouthY = 1.5;
        left = -1.1;
        right = 1.1;
        jump = bounce * 0.3;
        squash = 1 - 0.12 * Math.max(0, -s);
        head = -0.12;
        break;
      case 8:
        eyes = 0.45;
        eyeAngle = 0.22;
        mouthX = 1.18;
        head = 0.08;
        left = -0.6 - 0.12 * s;
        right = 0.6 + 0.12 * s;
        elbows = 0.4;
        actor.rotation.y = 0.2 * s;
        break;
      case 9:
        eyes = 1 + 0.5 * pulse;
        mouthX = 0.65;
        mouthY = 1 + 0.8 * pulse;
        head = -0.2 * pulse;
        left = -0.3 * pulse;
        right = 0.3 * pulse;
        squash = 1 + 0.05 * pulse;
        break;
      case 10:
        eyes = 0.55;
        eyeAngle = -0.18;
        mouthX = 0.85;
        mouthY = 0.65;
        head = 0.24 + 0.045 * s;
        left = 0.1;
        right = -0.1;
        squash = 0.94;
        break;
      case 11:
        eyes = 0.48;
        eyeAngle = 0.3;
        mouthX = 1.25;
        mouthY = 0.8;
        head = 0.13;
        left = -0.5;
        right = 0.5;
        elbows = 0.45;
        actor.position.x = Math.sin(a * 5) * 0.02;
        squash = 1 + 0.04 * s;
        break;
      case 12:
        eyes = 0.22;
        mouthX = 1.35;
        mouthY = 1.4;
        left = -0.75 - 0.2 * s;
        right = 0.75 - 0.2 * s;
        jump = Math.abs(s) * 0.2;
        tilt = 0.13 * s;
        break;
      case 13:
        eyes = 0.07;
        mouthX = 0.8;
        mouthY = 0.75 + 0.2 * s;
        head = 0.14;
        tilt = -0.13;
        squash = 0.94 + 0.025 * s;
        left = 0.08;
        right = -0.08;
        break;
      case 14:
        eyes = 1.2;
        mouthX = 0.8;
        mouthY = 1.25;
        left = 0.6 * s;
        right = 0.6 * s;
        head = -0.06;
        jump = Math.abs(Math.sin(a * 2)) * 0.08;
        actor.rotation.y = 0.25 * Math.sin(a * 2);
        turn('Thin_L_JNT', 0.4 * s);
        turn('Thin_R_JNT', -0.4 * s);
        break;
      case 15:
        eyes = 0.65;
        left = -0.95 + 0.2 * Math.sin(a * 2);
        mouthX = 1.2;
        head = 0.1;
        tilt = 0.08;
        break;
      case 16:
        eyes = 1 - 0.9 * pulse;
        head = 0.42 * pulse;
        left = -0.2;
        right = 0.2;
        squash = 1 - 0.07 * pulse;
        break;
      case 17:
        eyes = 0.35;
        mouthX = 1.3;
        mouthY = 1.15;
        left = -0.65 + 0.45 * s;
        right = 0.65 + 0.45 * s;
        tilt = 0.19 * s;
        jump = Math.abs(s) * 0.09;
        turn('Hip_JNT', 0, 0.15 * s, 0);
        break;
      case 18:
        eyes = 1.25;
        mouthX = 0.7;
        mouthY = 1.35;
        head = -0.14;
        left = -0.7;
        right = 0.7;
        elbows = 0.65;
        squash = 0.91;
        actor.position.x = Math.sin(a * 6) * 0.035;
        turn('Root_Ear_L_JNT', 0, 0, -0.2);
        turn('Root_Ear_R_JNT', 0, 0, 0.2);
        break;
      case 19:
        eyes = 1.12;
        mouthX = 1.25;
        mouthY = 1.1;
        head = 0.1;
        left = -0.55;
        right = 0.55;
        elbows = 0.7;
        turn('Hand_L_JNT', 0, 0, 0.2 * Math.sin(a * 3));
        turn('Hand_R_JNT', 0, 0, -0.2 * Math.sin(a * 3));
        break;
    }
    const acting = Math.pow(Math.sin((Math.PI * f) / 24), 0.6);
    eyes = 1 + (eyes - 1) * acting;
    mouthX = 1 + (mouthX - 1) * acting;
    mouthY = 1 + (mouthY - 1) * acting;
    head *= acting;
    tilt *= acting;
    left *= acting;
    right *= acting;
    eyeAngle *= acting;
    lift('L', Math.abs(left) * 0.45);
    lift('R', Math.abs(right) * 0.45);
    stretch('Eye_ML_1_JNT', 1, Math.max(0.2, eyes), 1);
    stretch('Eye_MR_1_JNT', 1, Math.max(0.2, eyes), 1);
    stretch('Mouth_M_Scale', mouthX, mouthY, 1);
    turn('Eye_ML_1_JNT', 0, 0, eyeAngle);
    turn('Eye_MR_1_JNT', 0, 0, -eyeAngle);
    turn('Head_JNT', head, 0, tilt);
    raiseArm('L', Math.abs(left) * 1.7);
    raiseArm('R', Math.abs(right) * 1.7);
    turn('Elbow_L_JNT', elbows);
    turn('Elbow_R_JNT', elbows);
    actor.position.y = jump;
    actor.scale.set(fit * (1 + (1 - squash) * 0.35), fit * squash, fit);
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, 160, 160);
    ctx.drawImage(renderer.domElement, 0, 0);
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
