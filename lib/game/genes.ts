import { partByCard } from './catalog';
export const GENE_SOURCE='https://github.com/axieinfinity/unity-axie-mixer3d/blob/63ec82afc7deeec242734e70fea4bb9fffa904cc/Packages/com.skymavis.axiemixer3d/Runtime/AxieDescriptor.cs';
/** Public metadata genes are 512-bit; cosmetic skins and evolution never change the base-card lookup. */
export function decodeGenes(genes:string){
 if(!/^(?:0x)?[0-9a-f]{1,128}$/i.test(genes))throw new Error('Genes oficiales no válidos.');
 const value=BigInt(/^0x/i.test(genes)?genes:'0x'+genes),classes:Record<number,string>={0:'beast',1:'bug',2:'bird',3:'plant',4:'aquatic',5:'reptile',16:'mech',17:'dawn',18:'dusk'};
 const bits=(start:number,width:number)=>Number((value>>BigInt(512-start-width))&((BigInt(1)<<BigInt(width))-BigInt(1)));
 return ['eyes','mouth','ears','horn','back','tail'].map((slot,i)=>{const start=128+64*i,cl=classes[bits(start+25,5)],partValue=bits(start+30,8),candidate=cl+'-'+slot+'-'+String(partValue).padStart(2,'0');
 return {slot,stage:bits(start+12,3),skin:bits(start+16,9),class:cl??null,partValue,card:partByCard(candidate)?.id??null};});
}

