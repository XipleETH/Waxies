import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomAxie} from '../lib/game/random-axie';
import {decodeAppearance,resolveAppearanceParts} from '../lib/game/appearance';
import {validLoadout} from '../lib/game/axie';
import type {MixerCatalog} from '../lib/game/mixer-avatar';
void test('random previews cover shipped parts and bodies without becoming wallet loadouts',()=>{
 const catalog: MixerCatalog=JSON.parse(fs.readFileSync('public/assets/mixer/catalog.json','utf8'));
 const available=new Set(Object.entries(catalog.parts).filter(([,p])=>p.models.length&&!p.unavailable?.length).map(([k])=>k));
 let seed=41;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const bodies=new Set<string>(),parts=new Set<string>(),combinations=new Set<string>();
 for(let i=0;i<500;i++){
  const preview=randomAxie(random),appearance=decodeAppearance(preview.genes);
  assert.equal(preview.testParts.length,6);assert.equal(validLoadout(preview),false);
  assert.ok(catalog.bodies[appearance.body]);bodies.add(appearance.body);combinations.add(preview.genes);
  for(const part of resolveAppearanceParts(appearance,available)){assert.equal(part.exact,true);parts.add(part.key);}
 }
 assert.equal(bodies.size,8);assert.equal(parts.size,192);assert.equal(combinations.size,500);
});
