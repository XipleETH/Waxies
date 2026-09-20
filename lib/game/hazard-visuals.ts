import {
  raidFamily,
  raidZone,
  raidReach,
  CUSTOM_FAMILIES,
} from './raid-mechanics';
import { createMouthRelief, isLineMouth } from './mouth-relief';
import { partSpriteMaterial } from './part-sprite-material';
import * as THREE from 'three';
import { ATTACK, isRadial, AREA_WARNING, areaRadius } from './hazards';
import { PARTS } from './catalog';
import type { Dungeon, GameState } from './physics';

/** Reusable effect pools: no GPU allocation during attacks. */
export function createHazardVisuals(scene: THREE.Scene, level: Dungeon) {
  const root = new THREE.Group();
  scene.add(root);
  const geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [],
    textures: THREE.Texture[] = [];
  const geometry = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g);
    return g;
  };
  const material = (color: string | number, opacity = 1) => {
    const m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    materials.push(m);
    return m;
  };
  const disk = geometry(new THREE.CircleGeometry(1, 48)),
    ring = geometry(new THREE.RingGeometry(0.94, 1, 48));
  const quad = geometry(new THREE.PlaneGeometry(1, 1)),
    spike = geometry(new THREE.ConeGeometry(0.16, 0.65, 5));
  const loader = new THREE.TextureLoader();
  const maps = Object.fromEntries(
    [...new Set([...level.traps.map((t) => t.part), 'carrot'])].map((id) => {
      const t = loader.load(PARTS[id].partImage);
      t.colorSpace = THREE.SRGBColorSpace;
      textures.push(t);
      return [id, t];
    }),
  );
  const sprite = (id: string, w: number, h: number) => {
    const m = partSpriteMaterial(maps[id], PARTS[id].color);
    materials.push(m);
    const mesh = new THREE.Sprite(m);
    mesh.scale.set(w, h, 1);
    return mesh;
  };
  const mesh = (g: THREE.BufferGeometry, color: string | number, opacity = 1) =>
    new THREE.Mesh(g, material(color, opacity));
  const stations = level.traps.map((trap) => {
    const group = new THREE.Group();
    root.add(group);
    const color = new THREE.Color(PARTS[trap.part].color)
      .lerp(new THREE.Color(0xffffff), 0.28)
      .getHex();
    const backing = mesh(
      disk,
      new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.68).getHex(),
      0.9,
    );
    backing.scale.set(0.66, 0.56, 1);
    backing.position.z = 0.84;
    group.add(backing);
    const base = mesh(disk, 0x10282a, 0.9);
    base.scale.set(0.69, 0.2, 1);
    base.position.set(0, -0.41, 0.65);
    group.add(base);
    const body = sprite(
      trap.part,
      1.32,
      trap.part === 'grass-snake' ? 0.82 : 1.04,
    );
    body.position.z = 1;
    group.add(body);
    const mouth = isLineMouth(trap.part)
      ? createMouthRelief(maps[trap.part], PARTS[trap.part].color)
      : undefined;
    if (mouth) {
      mouth.root.position.z = 1;
      mouth.root.scale.setScalar(1.15);
      group.add(mouth.root);
      body.visible = false;
    }
    const shield = mesh(ring, 0x9bffd6, 0.8);
    shield.scale.setScalar(0.77);
    shield.position.z = 0.8;
    group.add(shield);
    const charge = mesh(disk, 0xffd56d);
    charge.scale.setScalar(0.1);
    charge.position.set(0, 0.88, 1);
    group.add(charge);
    const cue = mesh(ring, color, 0.6);
    cue.position.z = 0.6;
    group.add(cue);
    const area = mesh(disk, color, 0.1);
    area.position.z = 0.55;
    group.add(area);
    const beam = mesh(quad, color, 0.22);
    beam.position.z = 0.75;
    group.add(beam);
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0.3, 0);
    arrowShape.lineTo(-0.15, 0.18);
    arrowShape.lineTo(-0.15, -0.18);
    arrowShape.closePath();
    const arrow = mesh(
      geometry(new THREE.ShapeGeometry(arrowShape)),
      color,
      0.85,
    );
    arrow.position.z = 0.8;
    group.add(arrow);
    const thorns = new THREE.Group();
    group.add(thorns);
    for (let j = 0; j < 10; j++) {
      const angle = (j * Math.PI * 2) / 10;
      const tooth = mesh(spike, color);
      tooth.position.set(Math.cos(angle) * 1.3, Math.sin(angle) * 1.3, 0.9);
      tooth.rotation.z = angle - Math.PI / 2;
      thorns.add(tooth);
    }
    const health = mesh(quad, 0x8ddeaf, 0.9);
    health.scale.set(0.9, 0.06, 1);
    health.position.set(0, 0.64, 1.1);
    group.add(health);
    const links = level.traps.map((target) => {
      const line = mesh(quad, 0x87efba, 0.3);
      const dx = target.x - trap.x,
        dy = target.y - trap.y;
      line.scale.set(Math.hypot(dx, dy), 0.045, 1);
      line.rotation.z = Math.atan2(dy, dx);
      line.position.set(dx / 2, dy / 2, 0.85);
      group.add(line);
      return line;
    });
    const waveRing = mesh(
      geometry(new THREE.RingGeometry(0.76, 1, 48)),
      0xffc46f,
      0.9,
    );
    waveRing.position.z = 0.8;
    group.add(waveRing);
    const sector = mesh(
      geometry(new THREE.CircleGeometry(1, 32, -0.38, 0.76)),
      0xffb15a,
      0.55,
    );
    sector.position.z = 0.7;
    group.add(sector);
    const gasPuffs = Array.from({ length: 7 }, (_, j) => {
      const puff = mesh(disk, 0xc8ff85, 0.3);
      puff.position.z = 0.72 + j * 0.001;
      group.add(puff);
      return puff;
    });
    const tether = mesh(quad, 0xffe49b, 0.8);
    tether.position.z = 0.7;
    group.add(tether);
    return {
      waveRing,
      sector,
      gasPuffs,
      tether,
      group,
      body,
      mouth,
      backing,
      shield,
      charge,
      cue,
      area,
      beam,
      arrow,
      thorns,
      health,
      links,
    };
  });
  const darts = Array.from({ length: 64 }, () => {
    const group = new THREE.Group();
    root.add(group);
    const carrot = sprite('carrot', 0.66, 0.48);
    group.add(carrot);
    const venom = mesh(disk, 0xc198ff);
    venom.scale.setScalar(0.19);
    group.add(venom);
    const glow = mesh(disk, 0xad77ff, 0.18);
    glow.scale.setScalar(0.32);
    group.add(glow);
    const trail = mesh(quad, 0xe9c493, 0.42);
    trail.scale.set(0.6, 0.065, 1);
    trail.position.set(-0.35, 0, -0.04);
    group.add(trail);
    return { group, carrot, venom, glow, trail };
  });
  const puddles = Array.from({ length: 32 }, () => {
    const group = new THREE.Group();
    root.add(group);
    const fill = mesh(disk, 0xbd7eff, 0.68);
    fill.scale.set(ATTACK.poolRadius, 0.16, 1);
    group.add(fill);
    const edge = mesh(ring, 0xf0d9ff, 0.95);
    edge.scale.set(ATTACK.poolRadius, 0.16, 1);
    group.add(edge);
    return { group, fill, edge };
  });
  function update(s: GameState) {
    stations.forEach((v, i) => {
      const t = s.hazards.traps[i],
        part = level.traps[i].part,
        warn = t.stage === 'warning',
        active = t.stage === 'active';
      v.group.position.set(t.x, t.y, 0);
      if (v.mouth) {
        const warningDuration =
          s.raid && (isRadial(part) || PARTS[part].recipe.pattern === 'aura')
            ? AREA_WARNING
            : ATTACK.warning;
        const open = warn
          ? 0.2 + 0.8 * (1 - t.timer / warningDuration)
          : active
            ? 0.04
            : 0.12;
        v.mouth.setOpen(open);
        v.mouth.root.position.x = warn ? Math.sin(s.time * 45) * 0.035 : 0;
      }
      v.body.material.opacity = 1;
      v.body.material.color.set(t.stage === 'disabled' ? 0x9aafba : 0xffffff);
      v.health.visible = !s.raid && t.hp < 100;
      v.health.scale.x = (0.9 * Math.max(0, t.hp)) / 100;
      v.health.position.x = -(0.9 - v.health.scale.x) / 2;
      v.links.forEach((l) => {
        l.visible = !s.raid && PARTS[part].recipe.pattern === 'aura' && active;
      });
      v.body.position.x = warn ? Math.sin(s.time * 45) * 0.035 : 0;
      v.body.material.rotation =
        part === 'lagging'
          ? t.facing < 0
            ? -0.35
            : 0.35
          : part === 'grass-snake'
            ? t.facing < 0
              ? 0.1
              : -0.1
            : 0;
      v.shield.visible = t.shield && t.stage !== 'disabled';
      v.shield.material.opacity = 0.5 + Math.sin(s.time * 4) * 0.15;
      v.charge.visible = warn || active || t.energy > 0 || t.powered;
      v.charge.material.color.set(
        warn ? 0xffe180 : active ? 0xffffff : 0x8bffd4,
      );
      v.charge.scale.setScalar(0.11 + Math.sin(s.time * 9) * 0.02);
      const thorn = isRadial(part),
        aura = PARTS[part].recipe.pattern === 'aura';
      v.cue.visible = true;
      v.area.visible = (thorn || aura) && (warn || active);
      const radius =
        aura && s.raid
          ? areaRadius(level.traps[i])
          : aura
            ? 2.2
            : thorn
              ? (level.traps[i].reach ?? ATTACK.thornRadius)
              : 0.65 +
                (warn
                  ? (1 -
                      t.timer /
                        ((thorn || aura) && s.raid
                          ? AREA_WARNING
                          : ATTACK.warning)) *
                    0.2
                  : 0);
      v.cue.scale.setScalar(radius);
      v.area.scale.setScalar(radius);
      v.area.material.color.set(active ? 0xffa65e : 0xffe79a);
      v.area.material.opacity = active
        ? 0.36
        : 0.06 + (1 - t.timer / ATTACK.warning) * 0.1;
      v.cue.material.opacity = active
        ? 0.95
        : warn
          ? 0.55 + (Math.sin(s.time * 18) + 1) * 0.2
          : 0.3;
      v.cue.material.color.set(warn ? 0xffe28a : active ? 0xffa06b : 0xbdebdc);
      if (!warn && !active) v.cue.scale.setScalar(0.7);
      v.backing.material.opacity = warn ? 0.98 : 0.88;
      v.thorns.visible = thorn && active;
      v.thorns.scale.setScalar(
        (level.traps[i].reach ?? ATTACK.thornRadius) / ATTACK.thornRadius,
      );
      v.beam.visible = warn && !thorn && !aura;
      v.arrow.visible = warn && !thorn && !aura;
      const range =
        level.traps[i].reach ??
        (PARTS[part].recipe.pattern === 'dash'
          ? ATTACK.dashSpeed * ATTACK.dashDuration
          : 4.5);
      const angle =
        PARTS[part].recipe.pattern === 'sniper'
          ? Math.atan2(t.aimY - t.y, t.aimX - t.x)
          : t.facing === 1
            ? 0
            : Math.PI;
      v.beam.scale.set(range, 0.07, 1);
      v.beam.rotation.z = angle;
      v.beam.position.set(
        (Math.cos(angle) * range) / 2,
        (Math.sin(angle) * range) / 2,
        0.75,
      );
      v.arrow.position.set(
        Math.cos(angle) * range,
        Math.sin(angle) * range,
        0.8,
      );
      v.arrow.rotation.z = angle;
      const family = raidFamily(part),
        custom = s.raid && CUSTOM_FAMILIES.has(family),
        trap = level.traps[i];
      v.waveRing.visible = false;
      v.sector.visible = false;
      v.tether.visible = false;
      v.gasPuffs.forEach((p) => (p.visible = false));
      if (custom) {
        v.area.visible = false;
        v.thorns.visible = false;
        v.beam.visible = false;
        v.arrow.visible = false;
        v.cue.scale.setScalar(0.7);
        if (['orbit', 'pendulum', 'lift'].includes(family)) {
          const dx = trap.x - t.x,
            dy = trap.y + (family === 'pendulum' ? raidReach(trap) : 0) - t.y;
          v.tether.visible = true;
          v.tether.scale.set(Math.hypot(dx, dy), 0.055, 1);
          v.tether.position.set(dx / 2, dy / 2, 0.7);
          v.tether.rotation.z = Math.atan2(dy, dx);
          v.body.material.rotation = s.time * (family === 'orbit' ? 2 : 0.25);
        }
        const zone = raidZone(trap, t);
        if (zone && (warn || active)) {
          const radius = warn ? raidReach(trap) : zone.radius;
          if (zone.angle !== undefined) {
            v.sector.visible = true;
            v.sector.scale.set(
              radius,
              radius * (family === 'spikes' ? 0.58 : 1),
              1,
            );
            v.sector.rotation.z = zone.angle;
            v.sector.material.opacity = active ? 0.6 : 0.16;
            v.sector.material.color.set(
              family === 'breath' ? 0xffa657 : 0xe5ffa5,
            );
            if (family === 'breath' && active)
              v.gasPuffs.forEach((p, j) => {
                const f = (j + 1) / 8;
                p.visible = true;
                p.material.color.set(j % 2 ? 0xffe083 : 0xff954f);
                p.position.set(
                  t.facing * radius * f,
                  Math.sin(s.time * 16 + j) * radius * 0.1 * f,
                  0.83,
                );
                p.scale.set(radius * 0.18 * f, radius * 0.28 * f, 1);
                p.material.opacity = 0.48;
              });
          } else {
            v.cue.position.set(zone.x - t.x, zone.y - t.y, 0.8);
            v.cue.scale.setScalar(radius);
            v.area.position.copy(v.cue.position);
            v.area.scale.setScalar(radius);
            v.area.visible = family !== 'wave';
            v.area.material.opacity = active ? 0.23 : 0.07;
            if (family === 'wave' && active) {
              v.cue.visible = false;
              v.waveRing.visible = true;
              v.waveRing.scale.setScalar(radius);
              const positions = v.waveRing.geometry.attributes.position;
              for (let k = 0; k < positions.count; k++) {
                const a = ((k % 49) * Math.PI * 2) / 48,
                  r = k < 49 ? (zone.inner ?? 0) / Math.max(0.01, radius) : 1;
                positions.setXYZ(k, Math.cos(a) * r, Math.sin(a) * r, 0);
              }
              positions.needsUpdate = true;
            }
            if (family === 'gas' || family === 'cloud')
              v.gasPuffs.forEach((p, j) => {
                p.visible = active;
                const a = (j * Math.PI * 2) / 7 + s.time * 0.6;
                p.position.set(
                  zone.x - t.x + Math.cos(a) * radius * 0.45,
                  zone.y - t.y + Math.sin(a) * radius * 0.45,
                  0.82,
                );
                p.scale.setScalar(radius * 0.5);
                p.material.opacity = 0.24;
              });
          }
        } else {
          v.cue.position.set(0, 0, 0.6);
          v.area.position.set(0, 0, 0.55);
        }
        if (family === 'gate') {
          v.shield.visible = active;
          v.backing.material.opacity = active ? 0.9 : 0.25;
          v.body.material.opacity = active ? 1 : 0.55;
        }
        if (family === 'leap' && warn) {
          const dx = Math.max(
            -raidReach(trap),
            Math.min(raidReach(trap), t.aimX - trap.x),
          );
          v.beam.visible = true;
          v.beam.position.set(dx / 2, 0, 0.75);
          v.beam.rotation.z = 0;
          v.beam.scale.set(Math.abs(dx), 0.08, 1);
        }
      }
    });
    darts.forEach((v, i) => {
      const p = s.hazards.projectiles[i];
      v.group.visible = !!p;
      if (!p) return;
      v.group.scale.setScalar((p.radius ?? 0.19) / 0.19);
      v.group.position.set(p.x, p.y, 1.05);
      v.group.rotation.z = Math.atan2(p.vy, p.vx);
      const venom = ['grass-snake', 'yam', 'garish-worm'].includes(p.part);
      v.carrot.visible = !venom;
      v.carrot.material.map = maps[p.part];
      v.venom.visible = venom;
      v.glow.visible = true;
      v.glow.material.color.set(venom ? 0xe2bfff : 0xffe5a3);
      v.glow.material.opacity = 0.92;
      v.carrot.material.rotation = Math.atan2(p.vy, p.vx) - Math.PI / 4;
      v.trail.material.color.set(p.part === 'carrot' ? 0xffbb70 : 0xad77ff);
    });
    puddles.forEach((v, i) => {
      const p = s.hazards.pools[i];
      v.group.visible = !!p;
      if (!p) return;
      v.group.position.set(p.x, p.y, 0.95);
      const fade = Math.min(1, p.life / 0.4);
      v.fill.material.opacity = 0.58 * fade;
      v.edge.material.opacity = 0.85 * fade;
    });
  }
  return {
    update,
    dispose: () => {
      root.removeFromParent();
      stations.forEach((v) => v.mouth?.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
