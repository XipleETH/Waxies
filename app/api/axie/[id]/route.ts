import { parseAxieId, parseMetadata } from '@/lib/game/axie';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=parseAxieId((await params).id);
  const response=await fetch('https://metadata.axieinfinity.com/axie/'+id,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'manual'});
  if(!response.ok)return Response.json({error:response.status===403?'El proveedor ha bloqueado la consulta automática. Puedes importar su archivo de metadatos.':'App.Axie no está disponible ahora. Intenta de nuevo.'},{status:502});
  const text=await response.text();if(text.length>100000)throw new Error('Metadatos demasiado grandes.');
  const axie=parseMetadata(JSON.parse(text),id);
  return Response.json({axie},{headers:{'Cache-Control':'public, max-age=60'}});
 }catch(error){const message=error instanceof Error?error.message:'No pudimos consultar ese Axie.';return Response.json({error:message.includes('timeout')?'La consulta tardó demasiado. Vuelve a intentarlo.':message},{status:400});}
}

