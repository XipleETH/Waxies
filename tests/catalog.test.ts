import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PARTS, PART_LIST } from '../lib/game/catalog';
import { RECIPES } from '../lib/game/recipes';
import { BODY_PARTS, parseAxieId, parseMetadata, parseMetadataFile, validLoadout, allowedParts } from '../lib/game/axie';
import { decodeGenes } from '../lib/game/genes';
import { newSave, equipAxie, validSave, customDungeon, migrateSave } from '../lib/game/economy';
import { DUNGEONS,createState,PHYSICS,type Dungeon } from '../lib/game/physics';
import { stepHazards } from '../lib/game/hazards';
import { applyRules, hitRunner, rulesFor, stomp, condition } from '../lib/game/combat';
const metadata=(id:string)=>JSON.parse(fs.readFileSync('tests/fixtures/'+id+'.json','utf8'));
const fixture=(id:string,extras:string[]=[],runnerClass='Beast')=>{const level:Dungeon={...DUNGEONS[0],platforms:[],runnerClass,traps:[id,...extras].map((part,i)=>({part,x:6+i*4,y:1.55,phase:0,patrol:0}))};const s=createState(level);s.phase='playing';s.x=6;return {s,level,t:s.hazards.traps[0]};};
void test('catalog covers 132 cards, six classes, four card slots and all 192 standard parts',()=>{
 assert.equal(PART_LIST.length,132);assert.equal(Object.keys(RECIPES).length,132);assert.equal(new Set(PART_LIST.map(p=>p.partId)).size,132);
 assert.equal(BODY_PARTS.filter(p=>p.standard).length,192);assert.equal(BODY_PARTS.filter(p=>p.standard&&!p.cardId).length,60);
 for(const cl of ['Beast','Bug','Bird','Aquatic','Plant','Reptile'])assert.equal(PART_LIST.filter(p=>p.class===cl).length,22);
 for(const p of PART_LIST){assert.ok(p.recipe.summary.length>15);for(const path of [p.image,p.partImage])assert.ok(fs.existsSync('public'+path),path);}
});
void test('each of 132 defenses completes deterministic finite attack cycles',()=>{
 for(const part of PART_LIST){const a=fixture(part.id,['carrot','pumpkin','nimo']),b=fixture(part.id,['carrot','pumpkin','nimo']);
  const simulate=({s,level}:ReturnType<typeof fixture>)=>{let observed=false;for(let n=0;n<720;n++){s.invulnerable=0;s.hp=100;s.combat.lastStand=0;s.combat.energy=3;s.phase='playing';s.time+=PHYSICS.step;stepHazards(s,level,PHYSICS.step,s.y,false);observed||=s.hazards.traps[0].stage==='active';assert.ok(Number.isFinite(s.hp)&&Number.isFinite(s.hazards.traps[0].x),part.id);assert.ok(s.hazards.projectiles.length<=64);assert.ok(s.hazards.pools.length<=32);}assert.ok(observed,part.id+' never activated');return s;};
  assert.deepEqual(simulate(a),simulate(b),part.id+' must replay exactly');
 }
});
void test('genes resolve adult cards including evolved Nightmare skins without name guessing',()=>{
 const normal=parseMetadata(metadata('4200042'),'4200042');assert.deepEqual(allowedParts(normal),['risky-fish','oranda','goldfish','nimo']);assert.ok(validLoadout(normal));
 const rare=parseMetadata(metadata('27'),'27');assert.deepEqual(allowedParts(rare),['catfish','unko','ronin','shiba']);assert.equal(rare.parts.find(p=>p.slot==='mouth')?.artIsBase,true);
 assert.equal(decodeGenes(rare.genes).find(p=>p.slot==='mouth')?.stage,1);assert.equal(rare.parts.filter(p=>p.card===null).length,2);
 assert.deepEqual(decodeGenes('0x'+rare.genes.slice(2).padStart(128,'0')),decodeGenes(rare.genes));
 assert.throws(()=>decodeGenes('not genes'));assert.throws(()=>parseMetadata({...metadata('4200042'),properties:{stage:1}},'4200042'));
});
void test('Axie IDs reject arbitrary URLs and path injection',()=>{
 assert.equal(parseAxieId(' #27 '),'27');assert.equal(parseAxieId('https://app.axieinfinity.com/marketplace/axies/4200042'),'4200042');
 for(const x of ['0','-1','1e5','../../27','https://evil.test/axies/27','27/','9999999999999'])assert.throws(()=>parseAxieId(x));
});
void test('loaded Axie unlocks only its dominant cards and forged mappings are rejected',()=>{
 const axie=parseMetadata(metadata('4200042'),'4200042'),before=newSave(),save=equipAxie(before,axie);assert.equal(save.traps.length,4);assert.ok(validSave(save));assert.deepEqual(save.balances,before.balances);
 assert.ok(save.traps.every(t=>allowedParts(axie).includes(t.part)));assert.equal(customDungeon(save).traps.length,4);
 const bad={...save,traps:save.traps.map((t,i)=>i===0?{...t,part:'carrot'}:t)};assert.ok(!validSave(bad));assert.equal(customDungeon(bad).traps.length,3);
 assert.ok(!validLoadout({...axie,parts:axie.parts.map(p=>p.slot==='mouth'?{...p,card:'carrot'}:p)}));
});
void test('migration preserves three old traps and all currency, adds fourth slot and resets proofs',()=>{
 const current=newSave(),old={...current,rulesVersion:2 as const,traps:current.traps.slice(0,3),proofs:2,validated:true};const next=migrateSave(old);
 assert.deepEqual(next.traps.slice(0,3),old.traps);assert.equal(next.traps.length,4);assert.deepEqual(next.balances,old.balances);assert.deepEqual(next.chest,old.chest);assert.equal(next.proofs,0);assert.ok(validSave(next));
});
void test('support heals and cleansing preserves the unremovable heal block',()=>{
 const {s,level,t}=fixture('shiitake');t.hp=30;applyRules(s,level,0,rulesFor(s,level,0,'fire'));assert.equal(t.hp,54);
 t.statuses['heal-block']=2;applyRules(s,level,0,rulesFor(s,level,0,'fire'));assert.equal(t.hp,54);
 const b=fixture('bidens');b.t.statuses={poison:3,stun:1,fear:2,'heal-block':2};applyRules(b.s,b.level,0,rulesFor(b.s,b.level,0,'fire'));assert.deepEqual(b.t.statuses,{'heal-block':2});
});
void test('energy support powers an allied attacker and theft conserves available energy',()=>{
 const a=fixture('cottontail',['carrot']);applyRules(a.s,a.level,0,rulesFor(a.s,a.level,0,'fire'));assert.equal(a.s.hazards.traps[1].energy,1);
 const b=fixture('rice',['pumpkin']);b.s.combat.energy=1;hitRunner(b.s,b.level,0);assert.equal(b.s.combat.energy,0);assert.equal(b.t.energy,1);
});
void test('combos and class gates preserve exact Classic conditional multipliers',()=>{
 const solo=fixture('square-teeth'),combo=fixture('square-teeth',['pumpkin']);hitRunner(solo.s,solo.level,0);hitRunner(combo.s,combo.level,0);assert.equal(100-combo.s.hp,2*(100-solo.s.hp));
 const bug=fixture('sandal',[],'Bug'),beast=fixture('sandal');hitRunner(bug.s,bug.level,0);hitRunner(beast.s,beast.level,0);assert.equal(100-bug.s.hp,1.5*(100-beast.s.hp));
 const g=fixture('garish-worm');hitRunner(g.s,g.level,0);assert.equal(g.s.poison,0);const chain=fixture('garish-worm',['lagging']);hitRunner(chain.s,chain.level,0);assert.equal(chain.s.poison,2);
});
void test('shield-break stun, reflected damage and shields without overflow are interactive',()=>{
 const a=fixture('snail-shell');a.t.shieldHp=1;stomp(a.s,a.level,0);assert.equal(a.s.combat.statuses.stun,1);assert.equal(a.t.breakUsed,true);
 const r=fixture('indian-star');stomp(r.s,r.level,0);assert.equal(r.s.hp,88);
 const jar=fixture('snake-jar');jar.t.shieldHp=1;stomp(jar.s,jar.level,0);assert.equal(jar.t.hp,100);
});
void test('all recipe conditions and operations are supported, including rare conditional paths',()=>{
 for(const part of PART_LIST){const f=fixture(part.id,['trump','scaly-spear','bug-signal' in PARTS?'bug-signal':'antenna']);f.t.hp=10;f.t.lastStand=1;f.s.poison=2;f.s.combat.shield=20;f.s.combat.statuses={lethal:1,'attack-up':1};
 for(const r of part.recipe.rules){assert.doesNotThrow(()=>condition(r.when,f.s,f.level,0),part.id);assert.doesNotThrow(()=>applyRules(f.s,f.level,0,[r],5,true),part.id+' '+r.op);}
 }
});

void test('metadata-file imports remain marked unverified and enforce the same card restrictions',()=>{
 const axie=parseMetadataFile(metadata('27'));assert.equal(axie.source,'metadata-file');assert.ok(validLoadout(axie));
 const save=equipAxie(newSave(),axie);assert.ok(validSave(save));assert.deepEqual(allowedParts(axie),['catfish','unko','ronin','shiba']);
 assert.throws(()=>parseMetadataFile(null));assert.throws(()=>parseMetadataFile({...metadata('27'),genes:'invalid'}));
});
