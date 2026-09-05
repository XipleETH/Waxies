'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, Link2, FlaskConical, LockKeyhole, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { allowedParts, parseAxieId, parseMetadataFile, validLoadout, type AxieLoadout as Loadout } from '@/lib/game/axie';
import { PARTS } from '@/lib/game/catalog';
export function AxieLoadout({axie,onLoad,onLab,onBrowse}:{axie:Loadout|null|undefined;onLoad:(axie:Loadout)=>void;onLab:()=>void;onBrowse:()=>void}){
 const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>pending.current?.abort(),[]);
 const unlocked=allowedParts(axie);
 let metadataUrl:string|undefined;try{metadataUrl='https://metadata.axieinfinity.com/axie/'+parseAxieId(input);}catch{}
 async function importFile(file:File|undefined){if(!file)return;pending.current?.abort();setBusy(false);setError('');try{if(file.size>100000)throw new Error('El archivo debe pesar menos de 100 KB.');onLoad(parseMetadataFile(JSON.parse(await file.text())));}catch(e){setError(e instanceof Error?e.message:'Archivo no válido.');}}

 async function submit(){setError('');let id:string;try{id=parseAxieId(input);}catch(e){setError((e as Error).message);return;}setBusy(true);pending.current?.abort();const controller=new AbortController();pending.current=controller;
 try{const response=await fetch('/api/axie/'+id,{signal:controller.signal});const data=await response.json() as {axie?:unknown;error?:string};if(!response.ok||!validLoadout(data.axie))throw new Error(data.error??'No se pudo cargar el Axie.');if(!controller.signal.aborted)onLoad(data.axie);}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No se pudo consultar.');}finally{if(pending.current===controller)setBusy(false);}}
 return <section className="loadout-card"><div className="card-overline"><span><Link2 size={15}/> PARTES DE TU AXIE</span><span>NIV. 1</span></div>
 <form className="axie-id-form" onSubmit={e=>{e.preventDefault();void submit();}}><label htmlFor="axie-id">ID o enlace de App.Axie</label><div><Input id="axie-id" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ej. 4200042" maxLength={160}/><button className="primary-button" disabled={busy} aria-label="Consultar partes del Axie"><Search size={16}/>{busy?'…':'Cargar'}</button></div></form>
 {error?<p className="form-error" role="alert">{error}</p>:null}
 <details className="metadata-import"><summary>Importar archivo de partes</summary><p>Si falla la consulta, abre los metadatos del Axie, guárdalos como archivo JSON y selecciónalo aquí. El archivo permite probar sus partes; su procedencia no queda verificada.</p>{metadataUrl?<a href={metadataUrl} target="_blank" rel="noreferrer">Abrir metadatos de Axie #{parseAxieId(input)} ↗</a>:<p>Introduce arriba el ID para abrir sus metadatos oficiales.</p>}<Input type="file" accept=".json,application/json" aria-label="Archivo de metadatos del Axie" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></details>
 {axie?<><div className="axie-loaded"><strong>Axie #{axie.id}</strong><span>{axie.class} · {unlocked.length}/4 cartas</span><a href={'https://app.axieinfinity.com/marketplace/axies/'+axie.id} target="_blank" rel="noreferrer" aria-label="Ver Axie en App.Axie"><ArrowUpRight size={16}/></a></div><div className="loadout-parts">{axie.parts.map(p=><div key={p.slot} className={p.card?'':'passive-part'} title={p.card?PARTS[p.card].card:'Sin carta en Classic'}>{p.image?<Image unoptimized src={p.image} width={64} height={48} alt=""/>:<LockKeyhole size={23}/>}<strong>{p.name}</strong><span>{p.card?(PARTS[p.card].slot+(p.artIsBase?' · arte base':'')):p.slot==='eyes'?'Ojos · sin carta':'Orejas · sin carta'}</span></div>)}</div>{axie.source==='metadata-file'?<p className="loadout-note">Importado de archivo · procedencia sin verificar.</p>:null}<p className="loadout-note">Solo puedes colocar las cartas de estas partes. Las evoluciones usan su carta de nivel 1 en este modo.</p><button className="text-button" onClick={()=>{pending.current?.abort();onLab();}}><FlaskConical size={14}/> Volver al laboratorio libre</button></>:<div className="lab-notice"><FlaskConical size={20}/><div><strong>Laboratorio libre</strong><p>Prueba las 132 cartas. Carga un Axie para limitar tu defensa a sus partes.</p></div></div>}
 <button className="catalog-open-button" onClick={onBrowse}>Explorar todas las partes <ArrowUpRight size={15}/></button><p className="loadout-footnote">Consulta oficial de partes públicas. El ID no verifica que seas su propietario.</p></section>;
}
