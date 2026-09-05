import { decodeGenes } from './genes';
import bodies from './data/body-parts.json';
import { BATTLE_SLOTS, PARTS, type PartId } from './catalog';
export const BODY_PARTS=bodies;
export interface AxiePart {slot:string;id:string;name:string;skin:string;stage:number;card:string|null;image:string|null;known:boolean;artIsBase?:boolean}
export interface AxieLoadout {id:string;name:string;class:string;genes:string;parts:AxiePart[];source:'official-metadata'|'metadata-file';fetchedAt:string;level:1}
export function parseAxieId(input:string):string {
 const text=input.trim();const match=/^(?:#)?([1-9]\d{0,8})$/.exec(text)??/^https:\/\/app\.axieinfinity\.com\/marketplace\/axies\/([1-9]\d{0,8})\/?(?:[?#].*)?$/.exec(text);
 if(!match)throw new Error('Escribe un ID numérico o un enlace de App.Axie.');return match[1];
}
export function parseMetadata(raw:unknown,id:string):AxieLoadout {
 if(!raw||typeof raw!=='object')throw new Error('Metadatos no válidos.');
 const data=raw as {id?:unknown;name?:unknown;genes?:unknown;properties?:Record<string,unknown>};const p=data.properties;
 if(String(data.id)!==id||!p||p.stage!==4)throw new Error('Ese Axie no tiene partes adultas disponibles.');
 const genes=typeof data.genes==='string'?data.genes:'';const decoded=decodeGenes(genes);
 const string=(v:unknown,fallback='')=>typeof v==='string'?v:fallback;
 const parts=['eyes','ears',...BATTLE_SLOTS].map(slot=>{
  const partId=typeof p[slot+'_id']==='string'?String(p[slot+'_id']):'';
  const normalized=partId.replace(/-2$/,'');
  const entry=bodies.find(b=>b.id===partId)??bodies.find(b=>b.id===normalized);
  const card=decoded.find(g=>g.slot===slot)?.card??null;const art=entry?.image??(card?PARTS[card].partImage:null);
  return {slot,id:partId,name:string(p[slot+'_name'],'Desconocida').slice(0,80),skin:string(p[slot+'_skin']).slice(0,40),stage:Number(p[slot+'_stage'])||0,card,image:art,known:!!entry,artIsBase:!entry&&!!card};
 });
 if(parts.some(p=>!p.id))throw new Error('El proveedor devolvió un Axie incompleto. Vuelve a intentarlo.');
 return {id,genes,name:string(data.name,'Axie #'+id).slice(0,100),class:string(p.class,'Unknown'),parts,source:'official-metadata',fetchedAt:new Date().toISOString(),level:1};
}
export function allowedParts(loadout:AxieLoadout|null|undefined):PartId[]{return loadout?[...new Set(loadout.parts.flatMap(p=>p.card&&Object.hasOwn(PARTS,p.card)?[p.card]:[]))]:Object.keys(PARTS);}
export function validLoadout(value:unknown):value is AxieLoadout{
 if(!value||typeof value!=='object')return false;const a=value as AxieLoadout;let decoded:ReturnType<typeof decodeGenes>;try{decoded=decodeGenes(a.genes);}catch{return false;}
 return /^[1-9]\d{0,8}$/.test(a.id)&&['official-metadata','metadata-file'].includes(a.source)&&a.level===1&&typeof a.name==='string'&&typeof a.class==='string'&&Array.isArray(a.parts)&&a.parts.length===6&&new Set(a.parts.map(p=>p.slot)).size===6&&a.parts.every(p=>['eyes','ears',...BATTLE_SLOTS].includes(p.slot)&&typeof p.id==='string'&&typeof p.name==='string'&&p.card===decoded.find(g=>g.slot===p.slot)?.card)&&Number.isFinite(Date.parse(a.fetchedAt));
}

/** User-supplied files have validated structure and genes, but unverified provenance. */
export function parseMetadataFile(raw:unknown):AxieLoadout {
 if(!raw||typeof raw!=='object')throw new Error('Archivo de metadatos no válido.');
 const id=parseAxieId(String((raw as {id?:unknown}).id));
 return {...parseMetadata(raw,id),source:'metadata-file'};
}
