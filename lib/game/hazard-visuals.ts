import * as THREE from 'three';
import { ATTACK } from './hazards';
import { PARTS } from './catalog';
import type { Dungeon, GameState } from './physics';

/** Reusable effect pools: no GPU allocation during attacks. */
export function createHazardVisuals(scene: THREE.Scene, level: Dungeon) {
  const root = new THREE.Group(); scene.add(root);
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [];
  const geometry = <T extends THREE.BufferGeometry>(g:T) => {geometries.push(g);return g;};
  const material = (color: string | number, opacity = 1) => {const m = new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false});materials.push(m);return m;};
  const disk = geometry(new THREE.CircleGeometry(1,48)), ring = geometry(new THREE.RingGeometry(0.94,1,48));
  const quad = geometry(new THREE.PlaneGeometry(1,1)), spike = geometry(new THREE.ConeGeometry(0.16,0.65,5));
  const loader = new THREE.TextureLoader();
  const maps = Object.fromEntries(Object.keys(PARTS).map(id=>{const t=loader.load('/assets/'+id+'-part.png');t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return [id,t];}));
  const sprite = (id: string, w: number, h: number) => {const m = new THREE.SpriteMaterial({map:maps[id],transparent:true,depthWrite:false});materials.push(m);const mesh=new THREE.Sprite(m);mesh.scale.set(w,h,1);return mesh;};
  const mesh = (g:THREE.BufferGeometry,color:string|number,opacity=1) => new THREE.Mesh(g,material(color,opacity));
  const stations = level.traps.map(trap=>{
    const group=new THREE.Group();root.add(group);
    const color=PARTS[trap.part].color;
    const base=mesh(disk,0x10282a,0.9);base.scale.set(.69,.2,1);base.position.set(0,-.41,.65);group.add(base);
    const body=sprite(trap.part,1.22,trap.part==='grass-snake'?.72:.96);body.position.z=1;group.add(body);
    const shield=mesh(ring,0x9bffd6,.8);shield.scale.setScalar(.77);shield.position.z=.8;group.add(shield);
    const charge=mesh(disk,0xffd56d);charge.scale.setScalar(.1);charge.position.set(0,.88,1);group.add(charge);
    const cue=mesh(ring,color,.6);cue.position.z=.6;group.add(cue);
    const area=mesh(disk,color,.1);area.position.z=.55;group.add(area);
    const beam=mesh(quad,color,.22);beam.position.z=.75;group.add(beam);
    const arrowShape=new THREE.Shape();arrowShape.moveTo(.3,0);arrowShape.lineTo(-.15,.18);arrowShape.lineTo(-.15,-.18);arrowShape.closePath();
    const arrow=mesh(geometry(new THREE.ShapeGeometry(arrowShape)),color,.85);arrow.position.z=.8;group.add(arrow);
    const thorns=new THREE.Group();group.add(thorns);
    for(let j=0;j<10;j++){const angle=j*Math.PI*2/10;const tooth=mesh(spike,color);tooth.position.set(Math.cos(angle)*1.3,Math.sin(angle)*1.3,.9);tooth.rotation.z=angle-Math.PI/2;thorns.add(tooth);}
    return {group,body,shield,charge,cue,area,beam,arrow,thorns};
  });
  const darts=Array.from({length:64},()=>{
    const group=new THREE.Group();root.add(group);
    const carrot=sprite('carrot',.66,.48);group.add(carrot);
    const venom=mesh(disk,0xc198ff);venom.scale.setScalar(.19);group.add(venom);
    const glow=mesh(disk,0xad77ff,.18);glow.scale.setScalar(.32);group.add(glow);
    const trail=mesh(quad,0xe9c493,.42);trail.scale.set(.6,.065,1);trail.position.set(-.35,0,-.04);group.add(trail);
    return {group,carrot,venom,glow,trail};
  });
  const puddles=Array.from({length:32},()=>{const group=new THREE.Group();root.add(group);const fill=mesh(disk,0xa567ee,.58);fill.scale.set(ATTACK.poolRadius,.16,1);group.add(fill);const edge=mesh(ring,0xd3a7ff,.85);edge.scale.set(ATTACK.poolRadius,.16,1);group.add(edge);return {group,fill,edge};});
  function update(s:GameState) {
    stations.forEach((v,i)=>{
      const t=s.hazards.traps[i],part=level.traps[i].part,warn=t.stage==='warning',active=t.stage==='active';
      v.group.position.set(t.x,t.y,0);
      v.body.material.opacity=t.stage==='recover'?.45:1;
      v.body.position.x=warn?Math.sin(s.time*45)*.035:0;
      v.body.material.rotation=part==='lagging'?(t.facing<0?-.35:.35):part==='grass-snake'?(t.facing<0?.1:-.1):0;
      v.shield.visible=part==='carrot'&&t.shield;
      v.shield.material.opacity=.5+Math.sin(s.time*4)*.15;
      v.charge.visible=part==='carrot'&&(t.energy>0||t.powered);
      v.charge.scale.setScalar(.11+Math.sin(s.time*9)*.02);
      const thorn=part==='thorny-caterpillar';
      v.cue.visible=warn||active;v.area.visible=thorn&&(warn||active);
      const radius=thorn?ATTACK.thornRadius:.65+(warn?(1-t.timer/ATTACK.warning)*.2:0);
      v.cue.scale.setScalar(radius);v.area.scale.setScalar(radius);
      v.area.material.opacity=active?.2:.06+(1-t.timer/ATTACK.warning)*.1;
      v.cue.material.opacity=active?.9:.35+(Math.sin(s.time*18)+1)*.2;
      v.thorns.visible=thorn&&active;
      v.beam.visible=warn&&!thorn;v.arrow.visible=warn&&!thorn;
      const range=part==='lagging'?ATTACK.dashSpeed*ATTACK.dashDuration:4.5;
      v.beam.scale.set(range,.07,1);v.beam.position.x=t.facing*range/2;
      v.arrow.position.x=t.facing*range;v.arrow.rotation.z=t.facing===1?0:Math.PI;
    });
    darts.forEach((v,i)=>{const p=s.hazards.projectiles[i];v.group.visible=!!p;if(!p)return;
      v.group.position.set(p.x,p.y,1.05);v.group.rotation.z=Math.atan2(p.vy,p.vx);
      v.carrot.visible=p.part==='carrot';v.venom.visible=v.glow.visible=p.part==='grass-snake';
      v.carrot.material.rotation=Math.atan2(p.vy,p.vx)-Math.PI/4;
      v.trail.material.color.set(p.part==='carrot'?0xffbb70:0xad77ff);
    });
    puddles.forEach((v,i)=>{const p=s.hazards.pools[i];v.group.visible=!!p;if(!p)return;
      v.group.position.set(p.x,p.y,.95);const fade=Math.min(1,p.life/.4);v.fill.material.opacity=.58*fade;v.edge.material.opacity=.85*fade;
    });
  }
  return {update,dispose:()=>{root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
