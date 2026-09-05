import { parseAxieId, type AxieLoadout } from './axie';
import { decodeGenes } from './genes';
import names from './data/gene-part-names.json';
export const AXIE_CONTRACT='0x32950db2a7164ae833121501c797d79e7b79d74c';
export const RONIN_CHAIN='0x7e4';
export type RpcRequest=(args:{method:string;params?:unknown[]})=>Promise<unknown>;
const word=(value:string|number|bigint)=>BigInt(value).toString(16).padStart(64,'0');
export const addressWord=(address:string)=>{if(!/^0x[0-9a-f]{40}$/i.test(address))throw new Error('Dirección Ronin no válida.');return address.slice(2).toLowerCase().padStart(64,'0');};
export function uintResult(raw:unknown):bigint{if(typeof raw!=='string'||!/^0x[0-9a-f]{64}$/i.test(raw))throw new Error('Respuesta de Ronin no válida.');return BigInt(raw);}
export function decodeChainAxie(id:string,raw:unknown,ownerRaw:unknown,blockNumber:string):AxieLoadout{
 if(typeof raw!=='string'||!/^0x(?:[0-9a-f]{64}){7}$/i.test(raw))throw new Error('El contrato devolvió un formato de Axie no compatible.');
 const fields=raw.slice(2).match(/.{64}/g)!;const genes='0x'+fields[3]+fields[4];
 if(BigInt(genes)===BigInt(0))throw new Error('Ese Axie todavía no tiene genes adultos disponibles.');
 if(typeof ownerRaw!=='string'||!/^0x0{24}[0-9a-f]{40}$/i.test(ownerRaw))throw new Error('No se pudo consultar al propietario del Axie.');
 const owner='0x'+ownerRaw.slice(-40).toLowerCase();if(owner==='0x'+'0'.repeat(40))throw new Error('El Axie no tiene propietario.');
 const decoded=decodeGenes(genes),main=Number(BigInt(genes)>>BigInt(507));const classes:Record<number,string>={0:'Beast',1:'Bug',2:'Bird',3:'Plant',4:'Aquatic',5:'Reptile',16:'Mech',17:'Dawn',18:'Dusk'};
 const parts=decoded.map(p=>{const entry=names.find(n=>n.key===`${p.class}-${p.slot}-${p.partValue}`);if(!entry)throw new Error('Parte genética no reconocida en el catálogo.');return {slot:p.slot,id:entry.id,name:entry.name,skin:p.skin?String(p.skin):'',stage:p.stage,card:p.card,image:entry.image,known:true,artIsBase:p.skin>0||p.stage>0};});
 return {id,name:'Axie #'+id,class:classes[main]??'Unknown',genes,parts,source:'ronin-contract',owner,blockNumber,fetchedAt:new Date().toISOString(),level:1};
}
export async function readAxieOnChain(input:string,request:RpcRequest):Promise<AxieLoadout>{
 const id=parseAxieId(input),block=await request({method:'eth_blockNumber'});if(typeof block!=='string'||!/^0x[0-9a-f]+$/i.test(block))throw new Error('No se pudo consultar el bloque de Ronin.');
 const call=(selector:string)=>request({method:'eth_call',params:[{to:AXIE_CONTRACT,data:selector+word(id)},block]});
 const [data,owner]=await Promise.all([call('0xa6472906'),call('0x6352211e')]);return decodeChainAxie(id,data,owner,block);
}
export async function listWalletAxies(owner:string,request:RpcRequest,offset=0){
 const address=addressWord(owner);if(!Number.isSafeInteger(offset)||offset<0)throw new Error('Página no válida.');
 const block=await request({method:'eth_blockNumber'});if(typeof block!=='string'||!/^0x[0-9a-f]+$/i.test(block))throw new Error('Bloque de Ronin no válido.');
 const call=(data:string)=>request({method:'eth_call',params:[{to:AXIE_CONTRACT,data},block]});
 const total=Number(uintResult(await call('0x70a08231'+address)));if(!Number.isSafeInteger(total))throw new Error('Cantidad de Axies no válida.');
 const ids:string[]=[];for(let i=offset;i<Math.min(total,offset+8);i++){const id=uintResult(await call('0x2f745c59'+address+word(i)));ids.push(parseAxieId(id.toString()));}
 return {ids,total,next:offset+ids.length};
}
