import { DUNGEONS, type Dungeon, type Trap } from './physics';
export const TOKENS = ['SLP','AXS','RON'] as const;
export type TokenId = typeof TOKENS[number];
export const UNIT = 1_000_000;
export const STORAGE_KEY = 'waxis.practice.v1';
export const REWARDS: Record<string,{token:TokenId;units:number}> = { ruins:{token:'SLP',units:250*UNIT},grove:{token:'AXS',units:1.25*UNIT},sanctum:{token:'RON',units:2.5*UNIT} };
export interface Entry { id:string; kind:'deposit'|'withdraw'|'reward'; token:TokenId; units:number; date:string }
export interface Save {
  version:1; balances:Record<TokenId,number>; chest:Record<TokenId,number>; claimed:string[];
  traps:Trap[]; proofs:number; validated:boolean; history:Entry[];
}
export function newSave():Save { return {version:1,balances:{SLP:1250*UNIT,AXS:8*UNIT,RON:12*UNIT},chest:{SLP:0,AXS:0,RON:0},claimed:[],traps:DUNGEONS[0].traps.map(t=>({...t})),proofs:0,validated:false,history:[]}; }
export function amount(value:string):number {
  if(!/^\d+(?:[.,]\d{1,6})?$/.test(value.trim()))throw new Error('Escribe un importe positivo con hasta 6 decimales.');
  const [whole,frac='']=value.trim().replace(',','.').split('.');
  const units=Number(whole)*UNIT+Number(frac.padEnd(6,'0'));
  if(!Number.isSafeInteger(units)||units<=0||units>1e12)throw new Error('El importe debe ser mayor que cero y no superar 1.000.000.');
  return units;
}
export function formatted(units:number):string { return new Intl.NumberFormat('es-CO',{maximumFractionDigits:6}).format(units/UNIT); }
function entry(kind:Entry['kind'],token:TokenId,units:number):Entry { return {id:crypto.randomUUID(),kind,token,units,date:new Date().toISOString()}; }
export function transfer(save:Save,token:TokenId,units:number,kind:'deposit'|'withdraw'):Save {
  if(!TOKENS.includes(token)||!Number.isSafeInteger(units)||units<=0)throw new Error('Importe o token no válido.');
  const from=kind==='deposit'?'balances':'chest',to=kind==='deposit'?'chest':'balances';
  if(save[from][token]<units)throw new Error(kind==='deposit'?'Saldo de práctica insuficiente.':'El cofre no contiene ese importe.');
  if(!Number.isSafeInteger(save[to][token]+units))throw new Error('Importe demasiado grande.');
  return {...save,[from]:{...save[from],[token]:save[from][token]-units},[to]:{...save[to],[token]:save[to][token]+units},history:[entry(kind,token,units),...save.history].slice(0,20)};
}
export function claimReward(save:Save,id:string):Save {
  const reward=REWARDS[id];if(!reward)throw new Error('Cofre desconocido.');
  if(save.claimed.includes(id))throw new Error('Ya reclamaste este cofre. Puedes seguir practicando.');
  return {...save,claimed:[...save.claimed,id],balances:{...save.balances,[reward.token]:save.balances[reward.token]+reward.units},history:[entry('reward',reward.token,reward.units),...save.history].slice(0,20)};
}
export function customDungeon(save:Save):Dungeon { return {...DUNGEONS[0],id:'my-vault',name:'Tu refugio en Lunacia',subtitle:'Pon a prueba tu defensa',difficulty:'Tu mazmorra',traps:save.traps}; }
export function validSave(value:unknown):value is Save {
  if(!value||typeof value!=='object')return false;const s=value as Save;
  const validBalances=(b:Record<TokenId,number>)=>b&&TOKENS.every(t=>Number.isSafeInteger(b[t])&&b[t]>=0&&b[t]<=1e13);
  return s.version===1&&validBalances(s.balances)&&validBalances(s.chest)&&Array.isArray(s.claimed)&&s.claimed.length<=3&&new Set(s.claimed).size===s.claimed.length&&s.claimed.every(id=>Object.hasOwn(REWARDS,id))
    &&Array.isArray(s.traps)&&s.traps.length===3&&s.traps.every((t,i)=>t&&['lagging','grass-snake','thorny-caterpillar'].includes(t.part)&&Number.isFinite(t.x)&&Math.abs(t.x-DUNGEONS[0].traps[i].x)<=2&&t.y===DUNGEONS[0].traps[i].y&&t.patrol===DUNGEONS[0].traps[i].patrol&&t.phase===DUNGEONS[0].traps[i].phase)
    &&Number.isInteger(s.proofs)&&s.proofs>=0&&s.proofs<=2&&typeof s.validated==='boolean'&&s.validated===(s.proofs===2)
    &&Array.isArray(s.history)&&s.history.length<=20&&s.history.every(e=>e&&typeof e.id==='string'&&['deposit','withdraw','reward'].includes(e.kind)&&TOKENS.includes(e.token)&&Number.isSafeInteger(e.units)&&e.units>0&&typeof e.date==='string'&&Number.isFinite(Date.parse(e.date)));
}
export function readSave():Save { const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return newSave();try{const s:unknown=JSON.parse(raw);if(validSave(s))return s;}catch{}throw new Error('El guardado local no es válido. Se abrió una sesión nueva de práctica.'); }
