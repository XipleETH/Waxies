import test from 'node:test';
import assert from 'node:assert/strict';
import {randomTrapDungeon} from '../lib/game/random-traps';
import {DUNGEONS,createState,step} from '../lib/game/physics';
import {PARTS} from '../lib/game/catalog';
void test('random traps cover every Classic ability without changing authored layouts',()=>{
 const original=JSON.stringify(DUNGEONS),seen=new Set<string>();
 let seed=94;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<1000;i++){
  const source=DUNGEONS[i%DUNGEONS.length],level=randomTrapDungeon(source,random);
  assert.equal(new Set(level.traps.map(t=>t.part)).size,source.traps.length);
  assert.ok(level.traps.some(t=>PARTS[t.part].attack>0));
  assert.deepEqual(level.platforms,source.platforms);assert.deepEqual(level.spawn,source.spawn);assert.deepEqual(level.chest,source.chest);
  level.traps.forEach((t,j)=>{assert.ok(PARTS[t.part]);seen.add(t.part);assert.deepEqual({...t,part:source.traps[j].part},source.traps[j]);});
  const state=createState(level);state.phase='playing';for(let j=0;j<120;j++)step(state,level);
  assert.ok(Number.isFinite(state.hp));assert.equal(state.hazards.traps.length,level.traps.length);
 }
 assert.equal(seen.size,132);assert.equal(JSON.stringify(DUNGEONS),original);
});
