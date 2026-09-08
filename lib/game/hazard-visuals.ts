import {partSpriteMaterial} from './part-sprite-material';
import * as THREE from 'three';
import { ATTACK, isRadial, AREA_WARNING, areaRadius } from './hazards';
import { PARTS } from './catalog';
import type { Dungeon, GameState } from './physics';

/** Reusable effect pools: no GPU allocation during attacks. */
export function createHazardVisuals(scene: THREE.Scene, level: Dungeon) {
  const root = new THREE.Group(); scene.add(root);
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [];
  const geometry = <T extends THREE.BufferGeometry>(g:T) => {geometries.push(g);return g;};
  const material = (color: string | number, opacity = 1) => {const m = new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,fog:false});materials.push(m);return m;};
  const disk = geometry(new THREE.CircleGeometry(1,48)), ring = geometry(new THREE.RingGeometry(0.94,1,48));
  const quad = geometry(new THREE.PlaneGeometry(1,1)), spike = geometry(new THREE.ConeGeometry(0.16,0.65,5));
  const loader = new THREE.TextureLoader();
  const maps = Object.fromEntries([...new Set([...level.traps.map(t=>t.part),'carrot'])].map(id=>{const t=loader.load(PARTS[id].partImage);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return [id,t];}));
  const sprite = (id: string, w: number, h: number) => {const m = partSpriteMaterial(maps[id],PARTS[id].color);materials.push(m);const mesh=new THREE.Sprite(m);mesh.scale.set(w,h,1);return mesh;};
  const mesh = (g:THREE.BufferGeometry,color:string|number,opacity=1) => new THREE.Mesh(g,material(color,opacity));
  const stations = level.traps.map(trap=>{
    const group=new THREE.Group();root.add(group);
    const color=new THREE.Color(PARTS[trap.part].color).lerp(new THREE.Color(0xffffff),.28).getHex();
    const backing=mesh(disk,new THREE.Color(color).lerp(new THREE.Color(0xffffff),.68).getHex(),.9);backing.scale.set(.66,.56,1);backing.position.z=.84;group.add(backing);
    const base=mesh(disk,0x10282a,0.9);base.scale.set(.69,.2,1);base.position.set(0,-.41,.65);group.add(base);
    const body=sprite(trap.part,1.32,trap.part==='grass-snake'?.82:1.04);body.position.z=1;group.add(body);
    const shield=mesh(ring,0x9bffd6,.8);shield.scale.setScalar(.77);shield.position.z=.8;group.add(shield);
    const charge=mesh(disk,0xffd56d);charge.scale.setScalar(.1);charge.position.set(0,.88,1);group.add(charge);
    const cue=mesh(ring,color,.6);cue.position.z=.6;group.add(cue);
    const area=mesh(disk,color,.1);area.position.z=.55;group.add(area);
    const beam=mesh(quad,color,.22);beam.position.z=.75;group.add(beam);
    const arrowShape=new THREE.Shape();arrowShape.moveTo(.3,0);arrowShape.lineTo(-.15,.18);arrowShape.lineTo(-.15,-.18);arrowShape.closePath();
    const arrow=mesh(geometry(new THREE.ShapeGeometry(arrowShape)),color,.85);arrow.position.z=.8;group.add(arrow);
    const thorns=new THREE.Group();group.add(thorns);
    for(let j=0;j<10;j++){const angle=j*Math.PI*2/10;const tooth=mesh(spike,color);tooth.position.set(Math.cos(angle)*1.3,Math.sin(angle)*1.3,.9);tooth.rotation.z=angle-Math.PI/2;thorns.add(tooth);}
    const health=mesh(quad,0x8ddeaf,.9);health.scale.set(.9,.06,1);health.position.set(0,.64,1.1);group.add(health);
    const links=level.traps.map(target=>{const line=mesh(quad,0x87efba,.3);const dx=target.x-trap.x,dy=target.y-trap.y;line.scale.set(Math.hypot(dx,dy),.045,1);line.rotation.z=Math.atan2(dy,dx);line.position.set(dx/2,dy/2,.85);group.add(line);return line;});
    return {group,body,backing,shield,charge,cue,area,beam,arrow,thorns,health,links};
  });
  const darts=Array.from({length:64},()=>{
    const group=new THREE.Group();root.add(group);
    const carrot=sprite('carrot',.66,.48);group.add(carrot);
    const venom=mesh(disk,0xc198ff);venom.scale.setScalar(.19);group.add(venom);
    const glow=mesh(disk,0xad77ff,.18);glow.scale.setScalar(.32);group.add(glow);
    const trail=mesh(quad,0xe9c493,.42);trail.scale.set(.6,.065,1);trail.position.set(-.35,0,-.04);group.add(trail);
    return {group,carrot,venom,glow,trail};
  });
  const puddles=Array.from({length:32},()=>{const group=new THREE.Group();root.add(group);const fill=mesh(disk,0xbd7eff,.68);fill.scale.set(ATTACK.poolRadius,.16,1);group.add(fill);const edge=mesh(ring,0xf0d9ff,.95);edge.scale.set(ATTACK.poolRadius,.16,1);group.add(edge);return {group,fill,edge};});
  function update(s:GameState) {
    stations.forEach((v,i)=>{
      const t=s.hazards.traps[i],part=level.traps[i].part,warn=t.stage==='warning',active=t.stage==='active';
      v.group.position.set(t.x,t.y,0);
      v.body.material.opacity=1;
      v.body.material.color.set(t.stage==='disabled'?0x9aafba:0xffffff);
      v.health.visible=!s.raid&&t.hp<100;v.health.scale.x=.9*Math.max(0,t.hp)/100;v.health.position.x=-(.9-v.health.scale.x)/2;
      v.links.forEach(l=>{l.visible=!s.raid&&PARTS[part].recipe.pattern==='aura'&&active;});
      v.body.position.x=warn?Math.sin(s.time*45)*.035:0;
      v.body.material.rotation=part==='lagging'?(t.facing<0?-.35:.35):part==='grass-snake'?(t.facing<0?.1:-.1):0;
      v.shield.visible=t.shield&&t.stage!=='disabled';
      v.shield.material.opacity=.5+Math.sin(s.time*4)*.15;
      v.charge.visible=warn||active||t.energy>0||t.powered;
      v.charge.material.color.set(warn?0xffe180:active?0xffffff:0x8bffd4);
      v.charge.scale.setScalar(.11+Math.sin(s.time*9)*.02);
      const thorn=isRadial(part),aura=PARTS[part].recipe.pattern==='aura';
      v.cue.visible=true;v.area.visible=(thorn||aura)&&(warn||active);
      const radius=aura&&s.raid?areaRadius(level.traps[i]):aura?2.2:thorn?(level.traps[i].reach??ATTACK.thornRadius):.65+(warn?(1-t.timer/((thorn||aura)&&s.raid?AREA_WARNING:ATTACK.warning))*.2:0);
      v.cue.scale.setScalar(radius);v.area.scale.setScalar(radius);
      v.area.material.color.set(active?0xffa65e:0xffe79a);
      v.area.material.opacity=active?.36:.06+(1-t.timer/ATTACK.warning)*.1;
      v.cue.material.opacity=active?.95:warn?.55+(Math.sin(s.time*18)+1)*.2:.3;
      v.cue.material.color.set(warn?0xffe28a:active?0xffa06b:0xbdebdc);
      if(!warn&&!active)v.cue.scale.setScalar(.7);
      v.backing.material.opacity=warn?.98:.88;
      v.thorns.visible=thorn&&active;v.thorns.scale.setScalar((level.traps[i].reach??ATTACK.thornRadius)/ATTACK.thornRadius);
      v.beam.visible=warn&&!thorn&&!aura;v.arrow.visible=warn&&!thorn&&!aura;
      const range=level.traps[i].reach??(PARTS[part].recipe.pattern==='dash'?ATTACK.dashSpeed*ATTACK.dashDuration:4.5);
      const angle=PARTS[part].recipe.pattern==='sniper'?Math.atan2(t.aimY-t.y,t.aimX-t.x):(t.facing===1?0:Math.PI);
      v.beam.scale.set(range,.07,1);v.beam.rotation.z=angle;v.beam.position.set(Math.cos(angle)*range/2,Math.sin(angle)*range/2,.75);
      v.arrow.position.set(Math.cos(angle)*range,Math.sin(angle)*range,.8);v.arrow.rotation.z=angle;
    });
    darts.forEach((v,i)=>{const p=s.hazards.projectiles[i];v.group.visible=!!p;if(!p)return;
      v.group.position.set(p.x,p.y,1.05);v.group.rotation.z=Math.atan2(p.vy,p.vx);
      const venom=['grass-snake','yam','garish-worm'].includes(p.part);
      v.carrot.visible=!venom;v.carrot.material.map=maps[p.part];v.venom.visible=venom;v.glow.visible=true;v.glow.material.color.set(venom?0xe2bfff:0xffe5a3);v.glow.material.opacity=.92;
      v.carrot.material.rotation=Math.atan2(p.vy,p.vx)-Math.PI/4;
      v.trail.material.color.set(p.part==='carrot'?0xffbb70:0xad77ff);
    });
    puddles.forEach((v,i)=>{const p=s.hazards.pools[i];v.group.visible=!!p;if(!p)return;
      v.group.position.set(p.x,p.y,.95);const fade=Math.min(1,p.life/.4);v.fill.material.opacity=.58*fade;v.edge.material.opacity=.85*fade;
    });
  }
  return {update,dispose:()=>{root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
