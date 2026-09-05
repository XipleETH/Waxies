import assert from 'node:assert/strict';
import test from 'node:test';
import { DUNGEONS, PHYSICS, createState, requestJump, step, type Dungeon } from '../lib/game/physics';
import { amount, newSave, transfer, claimReward, UNIT, validSave, migrateSave } from '../lib/game/economy';
import { stepHazards } from '../lib/game/hazards';
const empty: Dungeon = {...DUNGEONS[0],traps:[]};
void test('fixed-step runner advances and pause freezes time and motion',()=>{const s=createState(empty);s.phase='playing';for(let i=0;i<120;i++)step(s,empty);assert.ok(s.x>7);s.phase='paused';const copy={...s};step(s,empty);assert.deepEqual(s,copy);});
void test('ground jump cannot be repeated in midair',()=>{const s=createState(empty);requestJump(s);step(s,empty);assert.equal(s.jumps,1);for(let i=0;i<10;i++){requestJump(s);step(s,empty);}assert.equal(s.jumps,1);});
void test('wall jump changes direction and supplies upward velocity',()=>{const s=createState(empty);s.phase='playing';s.x=22.62;s.y=9;s.wall=1;s.grounded=false;s.direction=1;requestJump(s);step(s,empty);assert.equal(s.direction,-1);assert.ok(s.vy>12);assert.ok(s.x<22.62);});
void test('platform top collision supports player and does not tunnel',()=>{const s=createState(empty);s.phase='playing';s.x=7;s.y=3.85;s.vy=-12;s.grounded=false;step(s,empty);assert.equal(s.grounded,true);assert.ok(Math.abs(s.y-3.78)<0.001);});
void test('Grass Snake projectile applies exactly one Poison and each jump costs two HP per stack',()=>{
 const level={...empty,traps:[{part:'grass-snake',x:12,y:1.55,phase:0,patrol:0}]};const s=createState(level);s.phase='playing';s.hazards.projectiles.push({id:0,owner:0,part:'grass-snake',x:2.5,y:1.5,vx:0,vy:0,life:1});
 step(s,level);assert.equal(s.poison,1);assert.equal(s.hp,88);assert.equal(s.hazards.projectiles.length,0);requestJump(s);step(s,level);assert.equal(s.hp,86);
});
void test('Lagging reduces horizontal velocity by 20 percent',()=>{const a=createState(empty),b=createState(empty);a.phase=b.phase='playing';a.slowActions=2;step(a,empty);step(b,empty);assert.ok(Math.abs((a.x-2.5)/(b.x-2.5)-0.8)<1e-9);});
void test('Thorny activates only after its proximity warning and applies 130 percent to debuffs',()=>{
 const level={...empty,traps:[{part:'thorny-caterpillar' as const,x:2.5,y:1.4,patrol:0,phase:0}]};
 const a=createState(level),b=createState(level);a.phase=b.phase='playing';b.poison=1;
 for(const s of [a,b]) {s.hazards.traps[0].timer=0;stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hazards.traps[0].stage,'warning');assert.equal(s.hp,100);for(let i=0;i<82;i++)stepHazards(s,level,PHYSICS.step,s.y,false);}
 assert.equal(a.hp,70);assert.equal(b.hp,61);
});
void test('winning requires reaching chest and cannot trigger from spawn',()=>{const s=createState(empty);s.phase='playing';step(s,empty);assert.equal(s.phase,'playing');s.x=empty.chest.x;s.y=empty.chest.y;step(s,empty);assert.equal(s.phase,'won');});
void test('fixed precision token parser rejects invalid and excessive amounts',()=>{assert.equal(amount('1,000001'),1000001);assert.equal(amount('0.000001'),1);for(const v of ['0','-1','NaN','1e3','0.0000001','Infinity','1000001'])assert.throws(()=>amount(v));});
void test('deposits and withdrawals conserve every token and cannot overdraw',()=>{let s=newSave();for(const t of ['SLP','AXS','RON'] as const){const initial=s.balances[t]+s.chest[t];s=transfer(s,t,UNIT,'deposit');assert.equal(s.balances[t]+s.chest[t],initial);s=transfer(s,t,UNIT,'withdraw');assert.equal(s.balances[t]+s.chest[t],initial);assert.throws(()=>transfer(s,t,UNIT,'withdraw'));}assert.throws(()=>transfer(s,'AXS',100*UNIT,'deposit'));});
void test('each raid reward is single-claim and failed claims leave state untouched',()=>{const s=newSave();const n=claimReward(s,'ruins');assert.equal(n.balances.SLP,s.balances.SLP+250*UNIT);assert.throws(()=>claimReward(n,'ruins'));assert.equal(n.claimed.length,1);assert.equal(s.claimed.length,0);});
void test('save validation rejects injected amounts, parts and layout coordinates',()=>{const s=newSave();assert.ok(validSave(s));assert.ok(!validSave({...s,balances:{...s.balances,AXS:-1}}));assert.ok(!validSave({...s,traps:s.traps.map(t=>({...t,x:99}))}));assert.ok(!validSave({...s,proofs:2,validated:false}));});

void test('Carrot shield stomp bounces, grants one energy, and powers one extra projectile',()=>{
 const level={...empty,platforms:[],traps:[{part:'carrot' as const,x:6,y:1.55,patrol:0,phase:0}]};const s=createState(level);s.phase='playing';
 s.x=6;s.y=2.3;s.vy=-12;s.grounded=false;step(s,level);const t=s.hazards.traps[0];assert.equal(t.shield,false);assert.equal(t.energy,1);assert.equal(s.vy,9);assert.equal(s.hp,100);
 s.x=6;s.y=2.3;s.vy=-12;step(s,level);assert.equal(t.energy,1);
 s.x=2.5;s.y=4;t.stage='warning';t.timer=0;stepHazards(s,level,PHYSICS.step,s.y,false);
 assert.equal(t.energy,0);assert.equal(t.powered,true);assert.equal(s.hazards.projectiles.length,1);
 for(let i=0;i<28;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hazards.projectiles.length,2);
 for(let i=0;i<230;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(t.shield,true);
});
void test('Carrot fires one projectile when its shield was not broken',()=>{
 const level={...empty,traps:[{part:'carrot' as const,x:12,y:1.55,patrol:0,phase:0}]};const s=createState(level);s.phase='playing';const t=s.hazards.traps[0];t.stage='warning';t.timer=0;
 for(let i=0;i<30;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hazards.projectiles.length,1);assert.equal(t.powered,false);
});
void test('Lagging locks direction during warning, dashes, slows on impact and recovers harmlessly',()=>{
 const level={...empty,platforms:[],traps:[{part:'lagging' as const,x:5,y:1.4,patrol:0,phase:0}]};const s=createState(level);s.phase='playing';const t=s.hazards.traps[0];t.timer=0;
 stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(t.stage,'warning');assert.equal(t.facing,-1);assert.equal(t.x,5);
 for(let i=0;i<110;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.ok(t.x<4);assert.equal(s.slowActions,2);assert.equal(s.hp,88);
 t.stage='recover';t.timer=.8;s.invulnerable=0;s.x=t.x;stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hp,88);
});
void test('projectiles are absorbed by solid platforms and cannot hit an Axie behind them',()=>{
 const level={...empty,platforms:[{x:5,y:3,w:1,h:4}]};const s=createState(level);s.phase='playing';s.x=6;s.y=3;
 s.hazards.projectiles.push({id:0,owner:0,part:'carrot',x:4,y:3,vx:7.5,vy:0,life:4});
 for(let i=0;i<60;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hazards.projectiles.length,0);assert.equal(s.hp,100);
});
void test('venom fans create temporary poison pools only on horizontal surfaces',()=>{
 const level={...empty,platforms:[],traps:[{part:'grass-snake' as const,x:12,y:1.55,patrol:0,phase:0}]};const s=createState(level);s.phase='playing';s.y=6;const t=s.hazards.traps[0];t.stage='warning';t.timer=0;
 stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hazards.projectiles.length,3);assert.equal(new Set(s.hazards.projectiles.map(p=>p.vy)).size,3);
 t.stage='idle';t.timer=100;for(let i=0;i<155;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.ok(s.hazards.pools.length>0);
 const pool=s.hazards.pools[0];s.x=pool.x;s.y=1.38;stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.poison,1);
 s.y=6;for(let i=0;i<300;i++)stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hazards.pools.length,0);
});
void test('pause freezes all hazards and restart clears shots, poison and shield energy',()=>{
 const s=createState(DUNGEONS[0]);s.phase='playing';for(let i=0;i<170;i++)step(s,DUNGEONS[0]);assert.ok(s.hazards.projectiles.length>0);
 s.phase='paused';const frozen=structuredClone(s);for(let i=0;i<200;i++)step(s,DUNGEONS[0]);assert.deepEqual(s,frozen);
 const fresh=createState(DUNGEONS[0]);assert.equal(fresh.hazards.projectiles.length,0);assert.equal(fresh.hazards.pools.length,0);assert.equal(fresh.hazards.traps[0].energy,0);assert.equal(fresh.poison,0);
});
void test('new combat rules invalidate old proofs while preserving currency, claims and trap placements',()=>{
 const old={...claimReward(newSave(),'ruins'),rulesVersion:undefined,proofs:2,validated:true};old.chest.RON=UNIT;
 assert.ok(validSave(old));const migrated=migrateSave(old);assert.equal(migrated.proofs,0);assert.equal(migrated.validated,false);assert.equal(migrated.rulesVersion,3);
 assert.deepEqual(migrated.balances,old.balances);assert.deepEqual(migrated.chest,old.chest);assert.deepEqual(migrated.traps,old.traps);assert.deepEqual(migrated.claimed,old.claimed);
 assert.equal(migrateSave(migrated),migrated);
});


void test('solid platforms shield the Axie from hidden thorn attacks',()=>{
 const level={...empty,platforms:[{x:5,y:3,w:4,h:.8}],traps:[{part:'thorny-caterpillar' as const,x:5,y:3.95,patrol:0,phase:0}]};
 const s=createState(level);s.phase='playing';s.x=5;s.y=2.2;s.hazards.traps[0].stage='active';s.hazards.traps[0].timer=.4;
 stepHazards(s,level,PHYSICS.step,s.y,false);assert.equal(s.hp,100);
});
