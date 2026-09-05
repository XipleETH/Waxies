import { amount, type TokenId } from './economy';
interface Tool { name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown }
interface Context {registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}
export function registerGameTools(api:{read:()=>unknown;transfer:(token:TokenId,units:number,kind:'deposit'|'withdraw')=>void;start:(id:string)=>unknown}) {
  const context=(document as unknown as {modelContext?:Context}).modelContext;
  if(!context?.registerTool)return ()=>{};
  const lifecycle=new AbortController();
  const tools:Tool[]=[
    {name:'get_vault_practice_state',title:'Ver estado de práctica',description:'Lee los saldos simulados y el estado actual de la incursión. Ningún saldo representa tokens reales.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>api.read()},
    {name:'transfer_practice_tokens',title:'Mover botín de práctica',description:'Deposita saldo simulado al cofre o lo retira a la cartera de práctica. Nunca conecta una wallet ni envía transacciones.',inputSchema:{type:'object',properties:{token:{enum:['SLP','AXS','RON']},amount:{type:'string',pattern:'^[0-9]+([.,][0-9]{1,6})?$'},direction:{enum:['deposit','withdraw']}},required:['token','amount','direction'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object')throw new Error('Se requiere un objeto.');const v=input as Record<string,unknown>;if(Object.keys(v).some(k=>!['token','amount','direction'].includes(k))||!['SLP','AXS','RON'].includes(String(v.token))||typeof v.amount!=='string'||!['deposit','withdraw'].includes(String(v.direction)))throw new Error('Token, importe o dirección inválidos.');api.transfer(v.token as TokenId,amount(v.amount),v.direction as 'deposit'|'withdraw');return api.read();}},
    {name:'start_dungeon_practice',title:'Iniciar una incursión de práctica',description:'Abre una mazmorra y comienza el intento. Para alcanzar el cofre, el jugador debe completar el recorrido.',inputSchema:{type:'object',properties:{dungeon:{enum:['ruins','grove','sanctum','my-vault']}},required:['dungeon'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object')throw new Error('Se requiere un objeto.');const v=input as Record<string,unknown>;if(Object.keys(v).some(k=>k!=='dungeon')||!['ruins','grove','sanctum','my-vault'].includes(String(v.dungeon)))throw new Error('Mazmorra desconocida.');return api.start(String(v.dungeon));}}
  ];
  for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  return ()=>lifecycle.abort();
}
