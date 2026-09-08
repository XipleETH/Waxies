import { projectileVolley, projectileBlocked as blocked } from './projectile-flight';
import { PARTS } from './catalog';
import { applyRules, decay, hitRunner, rulesFor, stomp, tickCombat, type StatusMap } from './combat';
import {roomFor, type Dungeon, type GameState, type Trap} from './physics';
export type AttackStage='idle'|'warning'|'active'|'recover'|'disabled';
export interface TrapState { x:number;y:number;facing:1|-1;stage:AttackStage;timer:number;shield:boolean;energy:number;powered:boolean;shots:number;shotTimer:number;
 hp:number;shieldHp:number;maxShield:number;cycleShield:number;statuses:StatusMap;round:number;broken:boolean;breakUsed:boolean;struckUsed:boolean;draw:number;lastStand:number;aimY:number;hitThisAttack:boolean;aimX:number }
export interface Projectile { id:number;owner:number;part:string;x:number;y:number;vx:number;vy:number;life:number;gravity?:number;returnAt?:number;travel?:number;maxTravel?:number;turnAfter?:number }
export interface PoisonPool { id:number;x:number;y:number;life:number;owner?:number;part?:string }
export interface HazardState {traps:TrapState[];projectiles:Projectile[];pools:PoisonPool[];nextId:number}
export const ATTACK={warning:.65,thornRadius:1.65,dashSpeed:10,dashDuration:.38,projectileRadius:.19,poolRadius:.75};
export const AREA_WARNING=.3;
export const isArea=(id:string)=>isRadial(id)||PARTS[id].recipe.pattern==='aura';
export const areaRadius=(t:Trap)=>t.reach??ATTACK.thornRadius;
export const isRadial=(id:string)=>['thorny-caterpillar','cactus','pupae'].includes(id);
function fresh(t:Trap):TrapState {const shield=Math.round(PARTS[t.part].shield*.2);return {x:t.x,y:t.y,facing:-1,stage:'idle',timer:.7+t.phase*.4,shield:shield>0,energy:0,powered:false,shots:0,shotTimer:0,hp:100,shieldHp:shield,maxShield:shield,cycleShield:shield,statuses:{},round:1,broken:false,breakUsed:false,struckUsed:false,draw:0,lastStand:0,aimX:t.x,aimY:t.y,hitThisAttack:false};}
export function createHazards(level:Dungeon):HazardState {return {traps:level.traps.map(t=>({...fresh(t),...(level.rules==='raid'&&isArea(t.part)?{timer:0}:{})})),projectiles:[],pools:[],nextId:0};}
function lineClear(level:Dungeon,x:number,y:number,tx:number,ty:number){const count=Math.ceil(Math.hypot(tx-x,ty-y)/.15);for(let n=1;n<count;n++)if(blocked(level,x+(tx-x)*n/count,y+(ty-y)*n/count,0))return false;return true;}
function fire(s:GameState,level:Dungeon,i:number){
 const h=s.hazards,t=h.traps[i],part=level.traps[i].part,p=PARTS[part],pattern=p.recipe.pattern;
 if(p.attack===0||isRadial(part)||['bite','dash','barrier','aura'].includes(pattern))return;
 for(const shot of projectileVolley(level.traps[i],t))h.projectiles.push({id:h.nextId++,owner:i,part,...shot});
}
function beginAttack(s:GameState,level:Dungeon,i:number){
 const t=s.hazards.traps[i],p=PARTS[level.traps[i].part],pattern=p.recipe.pattern;
 if((t.statuses.stun||t.statuses.fear)&&p.id!=='bidens'){delete t.statuses.stun;t.stage='recover';t.timer=1.5;return;}
 t.stage='active';t.timer=pattern==='dash'?(level.traps[i].reach??(ATTACK.dashSpeed*ATTACK.dashDuration))/ATTACK.dashSpeed:s.raid&&isArea(p.id)?.7:isRadial(p.id)?.5:.4;t.hitThisAttack=false;
 const rules=rulesFor(s,level,i,'fire');
 const energy=t.energy;t.powered=energy>0;t.energy=0;
 t.shots=Math.max(1,...rules.filter(r=>r.op==='repeat').map(r=>r.value))-1+Math.min(2,energy);t.shotTimer=.22;
 applyRules(s,level,i,rules);
 t.cycleShield=t.shieldHp;
 if(['aura','bite','barrier','dash'].includes(pattern)||isRadial(p.id)){t.shots=0;t.draw+=energy;}
 fire(s,level,i);
}
export function stepHazards(s:GameState,level:Dungeon,dt:number,oldY:number,descending:boolean){
 if(!s.raid)tickCombat(s,dt);if(s.phase!=='playing')return;
 const h=s.hazards;
 // Aroma changes attack priority only within an assisted stomp's short reach.
 if(descending&&!s.raid){const target=h.traps.find(t=>t.stage!=='disabled'&&t.statuses.aroma&&!t.statuses.stench&&Math.abs(s.x-t.x)<1.05&&oldY-.38>=t.y+.25&&s.y-.38<=t.y+.35&&lineClear(level,s.x,s.y,t.x,t.y+.74));if(target)s.x=target.x;}
 for(let i=0;i<level.traps.length;i++){
  const trap=level.traps[i],t=h.traps[i],p=PARTS[trap.part],pattern=p.recipe.pattern;
  if(s.raid&&Math.hypot(s.x-t.x,s.y-t.y)<.38+.4&&lineClear(level,t.x,t.y,s.x,s.y)){hitRunner(s,level,i);return;}
  t.timer-=dt;
  if(t.stage==='disabled'){if(t.timer<=0)Object.assign(t,fresh(trap),{round:t.round+1});continue;}
  if(t.lastStand>0){t.lastStand-=dt;if(t.lastStand<=0){t.stage='disabled';t.timer=6;continue;}}
  if(t.hp<=0&&t.lastStand<=0){t.stage='disabled';t.timer=6;continue;}
  if(!s.raid&&descending&&Math.abs(s.x-t.x)<.75&&oldY-.38>=t.y+.25&&s.y-.38<=t.y+.35)stomp(s,level,i);
  // Last-stand priority is evaluated while waiting, so it can actually advance the attack.
  if(p.id==='jaguar'&&(s.combat.lastStand>0||h.traps.some(a=>a.lastStand>0))&&t.stage==='idle')t.timer=0;
  if(t.stage==='idle'&&t.timer<=0){
   const auto=['bolt','arc','fan','sniper','boomerang','aura'].includes(pattern)||(pattern==='burst'&&!isRadial(p.id));
   const distant=rulesFor(s,level,i,'fire').some(r=>r.op==='target');
   const targetOK=p.id!=='perch'||!rulesFor(s,level,i,'fire').some(r=>r.op==='target')||s.time-s.combat.lastJumpAt>3;
   const skip=p.id==='cloud'&&s.combat.lastStand>0;
   const area=s.raid&&isArea(p.id),nearArea=Math.hypot(s.x-t.x,s.y-t.y)<areaRadius(trap)+.38+Math.max(6,Math.abs(s.vy))*AREA_WARNING+.4&&lineClear(level,t.x,t.y,s.x,s.y);
   if(!skip&&targetOK&&(area?nearArea:(auto||(Math.abs(s.x-t.x)<(distant?9:4.2)&&Math.abs(s.y-t.y)<1.8&&lineClear(level,t.x,t.y,s.x,s.y))))){t.stage='warning';t.timer=area?AREA_WARNING:ATTACK.warning;t.facing=s.x<t.x?-1:1;t.aimY=s.y;t.aimX=s.x;}
  }else if(t.stage==='warning'&&t.timer<=0)beginAttack(s,level,i);
  else if(t.stage==='active'){
   if(pattern==='dash'){
    const speed=ATTACK.dashSpeed*(t.statuses['speed-up']?1.2:1)*(t.statuses['speed-down']?.8:1),next=t.x+t.facing*speed*dt;
    if(blocked(level,next,t.y,.35))t.timer=0;else if(trap.reach!==undefined&&Math.abs(next-trap.x)>=trap.reach){t.x=trap.x+t.facing*trap.reach;t.timer=0;}else t.x=next;
   }
   const radius=s.raid&&isArea(p.id)?areaRadius(trap)+.38:isRadial(p.id)?(trap.reach??ATTACK.thornRadius)+.38:pattern==='bite'?(trap.reach??.5)+.38:.88;
   if(((s.raid&&isArea(p.id))||(p.attack>0&&(isRadial(p.id)||['dash','bite','barrier'].includes(pattern))))&&!t.hitThisAttack&&Math.hypot(s.x-t.x,s.y-t.y)<radius&&lineClear(level,t.x,t.y,s.x,s.y)){hitRunner(s,level,i);t.hitThisAttack=true;}
   if(t.shots>0){t.shotTimer-=dt;if(t.shotTimer<=0){fire(s,level,i);t.shots--;t.shotTimer=.22;t.timer=Math.max(t.timer,.23);}}
   if(t.timer<=0){applyRules(s,level,i,rulesFor(s,level,i,'end'));t.stage='recover';t.timer=Math.max(.35,(s.raid&&isArea(p.id)?.65:pattern==='dash'?1.1:1.5)-t.draw*.35);t.draw=0;}
  }else if(t.stage==='recover'){
   if(pattern==='dash')t.x+=(trap.x-t.x)*Math.min(1,dt*5);
   if(t.timer<=0){t.x=trap.x;t.stage='idle';t.timer=.6*(t.statuses['speed-up']?.8:1);t.powered=false;t.round++;decay(t.statuses);t.hp=Math.max(0,t.hp-(t.statuses.poison??0)*2);t.shieldHp=t.maxShield;t.shield=t.shieldHp>0;t.cycleShield=t.shieldHp;t.broken=false;t.breakUsed=false;t.struckUsed=false;}
  }
  if(s.phase!=='playing')return;
 }
 for(const p of h.projectiles){
  const old=p.y;p.life-=dt;
  if(p.returnAt!==undefined&&p.life<p.returnAt){p.vx=-p.vx;p.returnAt=undefined;}
  p.vy-=(p.gravity??(p.part==='grass-snake'?9:.8))*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.maxTravel!==undefined){p.travel=(p.travel??0)+Math.hypot(p.vx,p.vy)*dt;if(p.travel>=p.maxTravel){p.life=0;continue;}if(p.turnAfter!==undefined&&p.travel>=p.turnAfter){p.vx=-p.vx;p.turnAfter=undefined;}}
  if(blocked(level,p.x,p.y,ATTACK.projectileRadius)){
   p.life=0;
   if(['grass-snake','yam','garish-worm'].includes(p.part)&&p.vy<0&&level.traps[p.owner]&&rulesFor(s,level,p.owner,'hit').some(r=>r.status==='poison')){
    let surface=p.y-ATTACK.projectileRadius<=1&&old>=1?1:null;
    for(const platform of level.platforms){const top=platform.y+platform.h/2;if(p.x>=platform.x-platform.w/2&&p.x<=platform.x+platform.w/2&&old-ATTACK.projectileRadius>=top-.08&&p.y-ATTACK.projectileRadius<=top)surface=top;}
    if(surface!==null&&p.x>roomFor(level).left+.25&&p.x<roomFor(level).right-.25)h.pools.push({id:h.nextId++,x:p.x,y:surface+.06,life:2.2,owner:p.owner,part:p.part});
   }continue;
  }
  if(Math.hypot(s.x-p.x,s.y-p.y)<.38+ATTACK.projectileRadius){if(level.traps[p.owner])hitRunner(s,level,p.owner);p.life=0;}
 }
 for(const pool of h.pools){pool.life-=dt;if(Math.abs(s.x-pool.x)<ATTACK.poolRadius&&s.y-.38<pool.y+.2&&s.y+.38>pool.y){if(pool.owner!==undefined&&level.traps[pool.owner])hitRunner(s,level,pool.owner);}}
 h.projectiles=h.projectiles.filter(p=>p.life>0).slice(-64);h.pools=h.pools.filter(p=>p.life>0).slice(-32);
}
