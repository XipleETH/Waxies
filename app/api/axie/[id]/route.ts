import { readAxieOnChain } from '@/lib/game/ronin';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const signal=AbortSignal.timeout(12000);
  const axie=await readAxieOnChain(id,async args=>{
   const response=await fetch('https://api.roninchain.com/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,...args}),signal,redirect:'manual'});
   if(!response.ok)throw new Error('Ronin no está disponible ahora. Puedes cargar tu Axie desde la billetera.');
   const data=await response.json() as {result?:unknown;error?:{message?:string}};if(data.error)throw new Error('Ronin no pudo consultar ese Axie. Revisa el ID o intenta más tarde.');return data.result;
  });
  return Response.json({axie},{headers:{'Cache-Control':'public, max-age=30'}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'No pudimos consultar ese Axie.'},{status:400});}
}
