import { PARTS } from './catalog';
import type { Dungeon, GameState } from './physics';
import type { TrapState } from './hazards';
import type { Rule, Trigger } from './recipes';
export type StatusMap=Record<string,number>;
export interface CombatState { shield:number; energy:number; energyClock:number; statuses:StatusMap; lastStand:number; attackIndex:number; discarded:number; class:string; lastJumpAt:number }
export const NEGATIVE=new Set(['poison','speed-down','attack-down','stun','fear','sleep','jinx','chill','lethal','fragile','heal-block','stench','disable-mouth','disable-horn','disable-melee','disable-ranged']);
export const STATUS_NAMES:Record<string,string>={'speed-up':'Speed+','speed-down':'Speed−','attack-up':'Attack+','attack-down':'Attack−','morale-up':'Morale+','critical-block':'Bloqueo crítico',poison:'Poison',stun:'Stun',fear:'Fear',sleep:'Sleep',jinx:'Jinx',chill:'Chill',lethal:'Lethal',fragile:'Fragile','heal-block':'Sin curación',stench:'Stench',aroma:'Aroma','disable-mouth':'Boca bloqueada','disable-horn':'Cuerno bloqueado','disable-melee':'Melee bloqueado','disable-ranged':'Ranged bloqueado','guaranteed-laststand':'Último Aliento asegurado','damage-reduction':'Daño −15%'};
export function createCombat(level:Dungeon):CombatState{return {shield:level.runnerShield??0,energy:3,energyClock:0,statuses:{},lastStand:0,attackIndex:0,discarded:0,class:level.runnerClass??'Beast',lastJumpAt:-100};}
export const hasNegative=(map:StatusMap)=>Object.entries(map).some(([key,value])=>value>0&&NEGATIVE.has(key));
export function decay(map:StatusMap){for(const key of Object.keys(map)){if(['poison','stun','sleep','lethal'].includes(key))continue;if(--map[key]<=0)delete map[key];}}
function clear(map:StatusMap){for(const key of Object.keys(map))if(NEGATIVE.has(key)&&key!=='heal-block')delete map[key];}
export function addStatus(s:GameState,t:TrapState|null,key:string,n:number){const map=t?t.statuses:s.combat.statuses;
 if(key==='poison'&&!t){s.poison+=n;return;}if(key==='speed-down'&&!t){s.slowActions=Math.max(s.slowActions,n);return;}
 map[key]=['poison','attack-down'].includes(key)?Math.min(8,(map[key]??0)+n):Math.max(map[key]??0,n);
}
export function condition(key:string,s:GameState,level:Dungeon,i:number):boolean {
 const t=s.hazards.traps[i],part=PARTS[level.traps[i].part],other=level.traps.filter((_,j)=>j!==i&&s.hazards.traps[j].stage!=='disabled');
 const cl=s.combat.class.toLowerCase(),idle=s.time-s.combat.lastJumpAt>3;
 switch(key){
 case 'always':return true;
 case 'combo':return other.length>=1;case 'combo3':return other.length>=2;case 'combo4':return other.length>=3;
 case 'chain':return other.some(a=>PARTS[a.part].class===part.class);
 case 'aquatic-combo':return other.some(a=>PARTS[a.part].class==='Aquatic');case 'plant-combo':return other.some(a=>PARTS[a.part].class==='Plant');
 case 'nut-combo':return other.some(a=>PARTS[a.part].name==='Nut Cracker');
 case 'trump-chain':return other.some(a=>PARTS[a.part].name==='Trump');
 case 'lunge-chain':return other.some(a=>PARTS[a.part].card.toLowerCase().includes('lunge'));
 case 'bug-signal-chain':return other.some(a=>PARTS[a.part].card==='Bug Signal');
 case 'target-idle':return idle;case 'target-shielded':return s.combat.shield>0;case 'self-shielded':return t.shieldHp>0;
 case 'target-poison':return s.poison>0;case 'target-debuffed':return s.poison>0||s.slowActions>0||hasNegative(s.combat.statuses);
 case 'target-buffed':return Object.entries(s.combat.statuses).some(([k,v])=>v>0&&!NEGATIVE.has(k))||s.combat.shield>0;
 case 'self-debuffed':return hasNegative(t.statuses);case 'self-low':return t.hp<50;case 'self-critical':return t.hp<30;
 case 'target-faster':return 5.2*(s.slowActions>0?.8:1)>4.6*(t.statuses['speed-up']?1.2:1);
 case 'first':return i===0;case 'last':return i===level.traps.length-1;case 'round5':return t.round>=5;
 case 'shield-broken':return t.broken;case 'self-laststand':return t.lastStand>0;case 'any-laststand':return s.combat.lastStand>0||s.hazards.traps.some(a=>a.lastStand>0);
 case 'target-beast-bug-mech':return ['beast','bug','mech'].includes(cl);case 'target-plant-reptile-dusk':return ['plant','reptile','dusk'].includes(cl);
 case 'target-aquatic-bird-dawn':return ['aquatic','bird','dawn'].includes(cl);case 'target-plant-reptile':return ['plant','reptile'].includes(cl);case 'target-aquatic-bird':return ['aquatic','bird'].includes(cl);
 case 'target-aquatic':return cl==='aquatic';case 'target-bug':return cl==='bug';case 'target-plant':return cl==='plant';
 case 'self-low-aquatic':return t.hp<50&&cl==='aquatic';case 'self-low-bug':return t.hp<50&&cl==='bug';case 'combo3-bird':return other.length>=2&&cl==='bird';
 default:throw new Error('Unknown Classic condition: '+key);
 }
}
export function rulesFor(s:GameState,level:Dungeon,i:number,on:Trigger){return PARTS[level.traps[i].part].recipe.rules.filter(r=>r.on===on&&condition(r.when,s,level,i));}
export function killRunner(s:GameState,reason:string){if(s.phase!=='playing')return;s.phase='dead';s.reason=reason;s.deaths++;}
export function damageRunner(s:GameState,damage:number,ignoreShield=false,noLastStand=false){
 if(s.phase!=='playing')return 0;
 if(s.combat.lastStand>0){s.combat.lastStand=Math.max(.01,s.combat.lastStand-.5);return 0;}
 const oldHp=s.hp;let remaining=damage;
 if(!ignoreShield&&s.combat.shield>0){const multiplier=s.combat.statuses.fragile?2:1;const absorbed=Math.min(s.combat.shield,damage*multiplier);s.combat.shield-=absorbed;remaining-=absorbed/multiplier;}
 s.hp=Math.max(0,s.hp-remaining);
 if(!s.hp){if(!noLastStand&&!s.combat.statuses.chill&&s.combat.energy>0){s.combat.lastStand=1.5;s.combat.energy=0;}else killRunner(s,'Las defensas protegieron el cofre.');}
 return oldHp-s.hp;
}
function recipients(s:GameState,level:Dungeon,i:number,r:Rule):Array<TrapState|null>{
 if(r.target==='target')return [null];if(r.target==='self')return [s.hazards.traps[i]];
 if(r.target==='front')return [s.hazards.traps.find(t=>t.stage!=='disabled')??s.hazards.traps[i]];
 return s.hazards.traps.filter((t,j)=>t.stage!=='disabled'&&(r.target!=='adjacent'||Math.abs(i-j)===1));
}
export function applyRules(s:GameState,level:Dungeon,i:number,rules:Rule[],damage=0,critical=false){
 const t=s.hazards.traps[i];
 for(const r of rules){
  const targets=recipients(s,level,i,r);
  switch(r.op){
   case 'status':for(const target of targets)addStatus(s,target,r.status!,r.value);break;
   case 'heal':for(const target of targets)if(target&&!target.statuses['heal-block']&&target.hp>0)target.hp=Math.min(100,target.hp+r.value);break;
   case 'lifesteal':if(t.hp>0&&!t.statuses['heal-block'])t.hp=Math.min(100,t.hp+damage*r.value);break;
   case 'anemone-heal':if(t.hp>0&&!t.statuses['heal-block'])t.hp=Math.min(100,t.hp+level.traps.filter(a=>PARTS[a.part].name==='Anemone').length*r.value);break;
   case 'energy':{const receiver=PARTS[level.traps[i].part].attack===0?(s.hazards.traps.find((a,j)=>a.stage!=='disabled'&&PARTS[level.traps[j].part].attack>0)??t):t;receiver.energy=Math.min(3,receiver.energy+r.value);break;}
   case 'steal':{const n=Math.min(s.combat.energy,r.value);s.combat.energy-=n;t.energy=Math.min(3,t.energy+n);break;}
   case 'destroy-energy':s.combat.energy=Math.max(0,s.combat.energy-r.value);break;
   case 'draw':t.draw=Math.min(3,t.draw+r.value);break;
   case 'discard':s.combat.discarded=Math.min(3,s.combat.discarded+r.value);break;
   case 'cleanse':for(const target of targets)if(target)clear(target.statuses);break;
   case 'transfer':for(const [key,n] of Object.entries(t.statuses))if(NEGATIVE.has(key)&&key!=='heal-block'){addStatus(s,null,key,n);delete t.statuses[key];}break;
   case 'shield':t.shieldHp=Math.min(60,t.shieldHp+r.value);break;
   case 'shield-multiplier':t.shieldHp=Math.min(60,t.shieldHp*r.value);break;
   case 'debuff-shield':t.shieldHp=Math.min(60,t.shieldHp*(1+r.value*Object.keys(t.statuses).filter(k=>NEGATIVE.has(k)).length));break;
   case 'share-shield':for(const target of targets)if(target)target.shieldHp=Math.min(60,target.shieldHp+t.shieldHp*r.value);break;
   case 'self-damage':t.hp=Math.max(1,t.hp-100*r.value);break;
   case 'reflect-melee':case 'reflect-ranged':{const ranged=(s.combat.attackIndex-1)%2===1;if((r.op==='reflect-ranged')===ranged)damageRunner(s,damage*r.value);break;}
   case 'team-critical-energy':break; // Credited at the moment an allied critical strike lands, below.
   case 'end-laststand':if(r.target==='self'){if(t.lastStand>0){t.lastStand=0;t.hp=0;}}else if(s.combat.lastStand>0)killRunner(s,'Hero’s Bane terminó tu Último Aliento.');break;
   case 'damage':case 'shield-damage':case 'critical':case 'critical-multiplier':case 'ignore-shield':case 'no-laststand':case 'repeat':case 'target':case 'priority':case 'skip-laststand':case 'aquatic-cover':case 'block-overflow':break; // Read by collision, targeting, or salvo code.
   default:throw new Error('Unknown Classic operation: '+r.op);
  }
 }
 t.shield=t.shieldHp>0;
 if(critical)level.traps.forEach((part,j)=>{if(PARTS[part.part].partId==='beast-horn-04')s.hazards.traps[j].energy=Math.min(3,s.hazards.traps[j].energy+1);});
}
export function hitRunner(s:GameState,level:Dungeon,i:number){
 if(s.invulnerable>0||s.phase!=='playing')return;
 const t=s.hazards.traps[i],part=PARTS[level.traps[i].part],rules=rulesFor(s,level,i,'hit');
 if(t.statuses.stun||t.statuses.fear){delete t.statuses.stun;return;}
 let damage=part.id==='thorny-caterpillar'?30:part.id==='carrot'?20:['grass-snake','lagging'].includes(part.id)?12:Math.max(0,Math.round(part.attack*.24));
 for(const rule of rules){if(rule.op==='damage')damage*=rule.value;if(rule.op==='shield-damage')damage+=t.cycleShield*rule.value;}
 damage*=Math.max(.2,1+(t.statuses['attack-up']?.2:0)-.2*(t.statuses['attack-down']??0));
 const critical=!t.statuses.jinx&&(rules.some(r=>r.op==='critical')||!!s.combat.statuses.lethal||(!!t.statuses['morale-up']&&t.round%3===0));
 if(critical){damage*=rules.find(r=>r.op==='critical-multiplier')?.value??2;delete s.combat.statuses.lethal;}
 const amount=damageRunner(s,Math.round(damage),rules.some(r=>r.op==='ignore-shield')||!!s.combat.statuses.sleep,rules.some(r=>r.op==='no-laststand'));
 delete s.combat.statuses.sleep;
 applyRules(s,level,i,rules,amount,critical);s.invulnerable=1.1;
}
/** A stomp is the platformer's attack; movement and jumps always remain free. */
export function stomp(s:GameState,level:Dungeon,i:number){
 const t=s.hazards.traps[i],part=PARTS[level.traps[i].part],c=s.combat,slot=['mouth','horn','back','tail'][c.attackIndex%4];
 const ranged=c.attackIndex%2===1;
 const forbidden=c.statuses.fear||c.statuses.stun||c.statuses['disable-'+slot]||c.statuses[ranged?'disable-ranged':'disable-melee']||c.discarded>0||c.energy===0;
 c.attackIndex++;delete c.statuses.stun;
 if(c.discarded>0)c.discarded--;
 s.y=t.y+.74;s.vy=part.id==='carrot'?9:12.7;s.grounded=false;s.coyote=0;s.wall=0;
 if(forbidden)return;
 if(part.partId==='plant-tail-10'&&c.class==='Aquatic'&&s.hazards.traps.some((a,j)=>j!==i&&a.stage!=='disabled'))return;
 c.energy--;
 const critical=!c.statuses.jinx&&!t.statuses['critical-block']&&(c.attackIndex%4===0||!!t.statuses.lethal);
 let damage=30*(critical?2:1)*Math.max(.2,1-.2*(c.statuses['attack-down']??0));
 if(t.statuses['damage-reduction'])damage*=.85;
 const before=t.shieldHp;const absorbed=Math.min(before,damage*(t.statuses.fragile?2:1));t.shieldHp-=absorbed;
 let remainder=Math.max(0,damage-absorbed/(t.statuses.fragile?2:1));
 if(before>0&&t.shieldHp<=0){t.broken=true;if(!t.breakUsed){applyRules(s,level,i,rulesFor(s,level,i,'break'),damage);t.breakUsed=true;}
  if(part.partId==='reptile-tail-08'||part.id==='carrot')remainder=0;
 }
 t.hp=Math.max(0,t.hp-remainder);t.shield=t.shieldHp>0;
 if(!t.struckUsed||!['beast-back-10','bug-tail-06'].includes(part.partId)){applyRules(s,level,i,rulesFor(s,level,i,'struck'),damage);t.struckUsed=true;}
 if(t.hp===0&&!t.lastStand){if(!t.statuses.chill&&(t.energy>0||t.statuses['guaranteed-laststand']||t.statuses['morale-up'])){t.lastStand=1.5;t.stage='warning';t.timer=.2;}else{t.stage='disabled';t.timer=6;}}
}
export function tickCombat(s:GameState,dt:number){
 const c=s.combat;c.energyClock+=dt;if(c.energyClock>=3){c.energyClock-=3;c.energy=Math.min(3,c.energy+1);}
 if(c.lastStand>0){c.lastStand-=dt;if(c.lastStand<=0)killRunner(s,'Terminó tu Último Aliento.');}
}

