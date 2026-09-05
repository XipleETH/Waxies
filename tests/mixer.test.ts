import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {decodeAppearance,resolveAppearanceParts} from '../lib/game/appearance';
import {instantiateMixerModel,animationClip,type MixerCatalog,type MixerModel,type MixerAnimation} from '../lib/game/mixer-avatar';
import {decodeChainAxie,listWalletAxies,readAxieOnChain,AXIE_CONTRACT,type RpcRequest} from '../lib/game/ronin';
import {customDungeon,equipAxie,newSave} from '../lib/game/economy';
import {validLoadout} from '../lib/game/axie';
const read=<T,>(path:string):T=>JSON.parse(fs.readFileSync(path,'utf8'));const catalog=read<MixerCatalog>('public/assets/mixer/catalog.json');
const available=new Set(Object.entries(catalog.parts).filter(([,p])=>p.models.length&&!p.unavailable?.length).map(([k])=>k));
const genes=(id:string)=>read<{genes:string}>('tests/fixtures/'+id+'.json').genes;
const mat=new THREE.MeshBasicMaterial();
const model=(url:string)=>instantiateMixerModel(read<MixerModel>('public'+url),()=>mat);
const dispose=(m:ReturnType<typeof model>)=>m.meshes.forEach(x=>{x.geometry.dispose();x.skeleton.dispose();});
void test('real genes select official body, palette, evolution and honest cosmetic fallbacks',()=>{
 const a=decodeAppearance(genes('4200042'));assert.equal(a.body,'Normal');assert.equal(a.colorVariant,12);assert.equal(a.primary,'#4d545e');assert.ok(resolveAppearanceParts(a,available).every(p=>p.exact));
 const b=decodeAppearance(genes('27'));assert.equal(b.colorVariant,3);const resolved=resolveAppearanceParts(b,available);assert.equal(resolved.find(p=>p.part.slot==='mouth')?.key,'Aquatic-Mouth-04-S00-LV2');assert.equal(resolved.find(p=>p.part.slot==='mouth')?.exact,false);assert.equal(resolved.find(p=>p.part.slot==='back')?.key,'Beast-Back-02-S01-LV2');
 assert.equal([...available].filter(k=>k.includes('-S00-LV1')).length,192);assert.equal(available.size,575);
});
void test('all 8 body rigs resolve core animations and animate real bones',()=>{
 for(const [name,body] of Object.entries(catalog.bodies)){const b=model(body.models[0].url);for(const key of ['Idle','Run','Dead']){const clip=animationClip(read<MixerAnimation>('public'+body.animations[key]),b.group);assert.ok(clip.tracks.length>20,name+' '+key);const mixer=new THREE.AnimationMixer(b.group);mixer.clipAction(clip).play();mixer.update(.2);b.group.updateMatrixWorld(true);for(const n of b.nodes.values())assert.ok(n.matrixWorld.elements.every(Number.isFinite));mixer.stopAllAction();mixer.uncacheRoot(b.group);}dispose(b);}
});
void test('Axie 4200042 assembles on official attachment bones with exact skinned bounds',()=>{
 const appearance=decodeAppearance(genes('4200042')),body=model(catalog.bodies[appearance.body].models[0].url),models=[body];
 for(const part of resolveAppearanceParts(appearance,available))for(const entry of catalog.parts[part.key].models){const m=model(entry.url),attach=body.group.getObjectByName('Root_'+entry.rigType+'_JNT');assert.ok(attach);attach.add(m.group);models.push(m);}
 body.group.updateMatrixWorld(true);const bounds=new THREE.Box3(),v=new THREE.Vector3();let count=0;
 for(const m of models)for(const mesh of m.meshes){mesh.updateMatrixWorld(true);for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,v);v.applyMatrix4(mesh.matrixWorld);assert.ok(v.toArray().every(Number.isFinite));bounds.expandByPoint(v);count++;}}
 assert.equal(count,3017);const expected=[-.642451,.001370,-.796353,.642451,1.432486,.528435];[...bounds.min.toArray(),...bounds.max.toArray()].forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<.00002,`${n} != ${expected[i]}`));
 const clip=animationClip(read<MixerAnimation>('public'+catalog.bodies.Normal.animations.Run),body.group);const mixer=new THREE.AnimationMixer(body.group);mixer.clipAction(clip).play();mixer.update(.35);body.group.updateMatrixWorld(true);const mesh=body.meshes[0];mesh.getVertexPosition(0,v);assert.ok(v.toArray().every(Number.isFinite));mixer.stopAllAction();models.forEach(dispose);
});
void test('contract genes match official metadata and reject missing adults and corrupt output',()=>{
 for(const id of ['4200042','27']){const raw=read<{result:string}>('tests/fixtures/onchain-'+id+'.json').result;const axie=decodeChainAxie(id,raw,'0x'+'0'.repeat(24)+'1'.repeat(40),'0x123');assert.equal(BigInt(axie.genes),BigInt(genes(id)));assert.equal(axie.source,'ronin-contract');assert.ok(validLoadout(axie));assert.equal(customDungeon(equipAxie(newSave(),axie)).runnerClass,axie.class);}
 assert.throws(()=>decodeChainAxie('1','0x'+'0'.repeat(448),'0x'+'0'.repeat(24)+'1'.repeat(40),'0x1'));
 assert.throws(()=>decodeChainAxie('27','0x123','0x','0x1'));
});
void test('wallet enumeration is paged and all contract calls stay read-only at one block',async()=>{
 const calls:Array<{method:string;params?:unknown[]}>=[];const request:RpcRequest=async a=>{calls.push(a);if(a.method==='eth_blockNumber')return '0xabc';assert.equal(a.method,'eth_call');const call=a.params![0] as {to:string;data:string};assert.equal(call.to,AXIE_CONTRACT);assert.equal(a.params![1],'0xabc');return '0x'+(call.data.startsWith('0x70a08231')?BigInt(10):BigInt('0x'+call.data.slice(-64))+BigInt(27)).toString(16).padStart(64,'0');};
 const page=await listWalletAxies('0x'+'1'.repeat(40),request);assert.equal(page.ids.length,8);assert.equal(page.total,10);const next=await listWalletAxies('0x'+'1'.repeat(40),request,page.next);assert.deepEqual(next.ids,['35','36']);assert.ok(calls.every(c=>['eth_call','eth_blockNumber'].includes(c.method)));
 let called=false;await assert.rejects(readAxieOnChain('../../27',async()=>{called=true;return null;}));assert.equal(called,false);
});
