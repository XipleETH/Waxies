import data from './data/classic-cards.json';
import { RECIPES, PATTERN_LABELS, type Recipe } from './recipes';
export type PartId = string;
export type BattleSlot = 'mouth'|'horn'|'back'|'tail';
export interface Part { id:string; name:string; card:string; slot:string; slotId:BattleSlot; class:string; color:string; image:string; partImage:string; partId:string; bodyPartId:string; attack:number; shield:number; energy:number; type:string; original:string; effect:string; short:string; arcade:string; recipe:Recipe }
export const PARTS:Record<string,Part> = Object.fromEntries(data.map(raw=>{
 const recipe=RECIPES[raw.partId];if(!recipe)throw new Error('Missing Classic mapping: '+raw.partId);
 return [raw.id,{...raw,slotId:raw.slotId as BattleSlot,recipe,effect:raw.original,short:PATTERN_LABELS[recipe.pattern],arcade:recipe.summary}];
}));
export const CLASSIC_SOURCE = 'https://classic.axieinfinity.com/explorer/cards';
export const BATTLE_SLOTS:BattleSlot[]=['mouth','horn','back','tail'];
export const PART_LIST=Object.values(PARTS);
export const partByCard=(id:string)=>PART_LIST.find(p=>p.partId===id);
