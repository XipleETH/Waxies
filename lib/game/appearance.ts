import { decodeGenes } from './genes';
import palettes from './data/mixer-colors.json';
export const MIXER_REVISION='63ec82afc7deeec242734e70fea4bb9fffa904cc';
export type BodyType='Normal'|'Spiky'|'Fuzzy'|'Curly'|'Sumo'|'Wetdog'|'Bigyak'|'Frosty';
export interface AppearancePart {slot:string;type:string;class:string;variant:number;skin:number;level:number;key:string}
export interface Appearance {body:BodyType;colorVariant:number;primary:string;secondary:string;parts:AppearancePart[]}
const names:Record<string,string>={eyes:'Eye',mouth:'Mouth',ears:'Ear',horn:'Horn',back:'Back',tail:'Tail'};
export function appearanceKey(cl:string,type:string,variant:number,skin:number,level:number){return `${cl}-${type}-${String(variant).padStart(2,'0')}-S${String(skin).padStart(2,'0')}-LV${level}`;}
/** Exact dominant descriptor and palette rules from Sky Mavis AxieDescriptor.FromGenes. */
export function decodeAppearance(genes:string):Appearance {
 const decoded=decodeGenes(genes),value=BigInt(/^0x/i.test(genes)?genes:'0x'+genes);
 const bits=(start:number,width:number)=>Number(value>>BigInt(512-start-width)&((BigInt(1)<<BigInt(width))-BigInt(1)));
 const classes:Record<number,string>={0:'beast',1:'bug',2:'bird',3:'plant',4:'aquatic',5:'reptile',16:'mech',17:'dawn',18:'dusk'};
 const bodySkin=bits(56,9),detail=bits(65,9),primary=bits(92,6),cl=classes[bits(0,5)];
 const body:BodyType=bodySkin===1?'Frosty':({1:'Spiky',2:'Fuzzy',3:'Curly',256:'Sumo',257:'Wetdog',384:'Bigyak'} as Record<number,BodyType>)[detail]??'Normal';
 const palette=(bodySkin===1?palettes.find(p=>p.index===48):palettes.find(p=>p.class===cl&&p.value===primary&&p.skin===0))??palettes[0];
 return {body,colorVariant:palette.index,primary:palette.primary,secondary:palette.secondary,parts:decoded.map(p=>{if(!p.class)throw new Error('Clase genética sin recurso 3D conocido.');const cl=p.class[0].toUpperCase()+p.class.slice(1),type=names[p.slot];return {slot:p.slot,type,class:cl,variant:p.partValue,skin:p.skin,level:p.stage+1,key:appearanceKey(cl,type,p.partValue,p.skin,p.stage+1)};})};
}
export interface ResolvedPart {part:AppearancePart;key:string;exact:boolean}
/** Same fallback order as AxieFactory.TryResolvePart; never substitute a different part. */
export function resolveAppearanceParts(appearance:Appearance,available:ReadonlySet<string>):ResolvedPart[]{
 return appearance.parts.map(part=>{const keys=[part.key,appearanceKey(part.class,part.type,part.variant,part.skin,1),appearanceKey(part.class,part.type,part.variant,0,part.level),appearanceKey(part.class,part.type,part.variant,0,1)];const key=keys.find(k=>available.has(k));if(!key)throw new Error('Falta el recurso 3D de '+part.class+' '+part.type+' '+part.variant+'.');return {part,key,exact:key===part.key};});
}
