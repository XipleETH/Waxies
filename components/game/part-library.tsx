'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, LockKeyhole, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PART_LIST, type PartId } from '@/lib/game/catalog';
import { BODY_PARTS } from '@/lib/game/axie';
export function PartLibrary({open,onOpenChange,onInspect,available}:{open:boolean;onOpenChange:(value:boolean)=>void;onInspect:(id:PartId)=>void;available:PartId[]}){
 const [query,setQuery]=useState(''),[cl,setCl]=useState('all'),[slot,setSlot]=useState('all'),[tab,setTab]=useState('cards'),[limit,setLimit]=useState(24),[filters,setFilters]=useState(false);
 const cards=useMemo(()=>PART_LIST.filter(p=>(cl==='all'||p.class.toLowerCase()===cl)&&(slot==='all'||p.slotId===slot)&&[p.name,p.card,p.original,p.arcade].join(' ').toLowerCase().includes(query.toLowerCase())),[query,cl,slot]);
 const bodies=useMemo(()=>BODY_PARTS.filter(p=>(cl==='all'||p.class===cl)&&(slot==='all'||p.slot===slot)&&p.name.toLowerCase().includes(query.toLowerCase())),[query,cl,slot]);
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="catalog-dialog"><DialogTitle>Arsenal</DialogTitle><DialogDescription>Elige una pieza para conocer su poder.</DialogDescription>
 <Tabs value={tab} onValueChange={v=>{setTab(String(v));setSlot('all');setLimit(24);}}><TabsList><TabsTrigger value="cards">132 poderes</TabsTrigger><TabsTrigger value="body">Todas las piezas</TabsTrigger></TabsList></Tabs>
 <button className="arsenal-search-toggle" onClick={()=>setFilters(v=>!v)} aria-expanded={filters}><Search size={16}/> Buscar</button>
 {filters?<div className="catalog-filters"><div className="catalog-search"><Search size={16}/><Input aria-label="Buscar parte o habilidad" placeholder="Parte, carta o efecto…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}}/></div>
 <Select value={cl} onValueChange={v=>{setCl(v??'all');setLimit(24);}}><SelectTrigger aria-label="Filtrar por clase"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas las clases</SelectItem>{['beast','aquatic','plant','bird','bug','reptile'].map(c=><SelectItem key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</SelectItem>)}</SelectContent></Select>
 <Select value={slot} onValueChange={v=>{setSlot(v??'all');setLimit(24);}}><SelectTrigger aria-label="Filtrar por pieza"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas las piezas</SelectItem>{Object.entries({mouth:'Boca',horn:'Cuerno',back:'Espalda',tail:'Cola',...(tab==='body'?{eyes:'Ojos',ears:'Orejas'}:{})}).map(([id,label])=><SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div>:null}
 <div className="catalog-count">{tab==='cards'?cards.length:bodies.length} resultados <span>{tab==='cards'?'Los candados indican partes ajenas al Axie cargado.':'Ojos y orejas no generan trampas en Classic.'}</span></div>
 <div className="catalog-scroll"><div className="catalog-grid">{tab==='cards'?cards.slice(0,limit).map(p=><button className="catalog-part" key={p.id} onClick={()=>onInspect(p.id)}><div className="catalog-part-image" style={{background:p.color+'15'}}><Image unoptimized src={p.partImage} width={100} height={80} alt=""/>{!available.includes(p.id)?<LockKeyhole size={15}/>:null}</div><strong>{p.name}</strong><span>{p.slot} · {p.class}</span><b>{p.card}</b><small>{p.short}</small></button>):bodies.slice(0,limit).map(p=><article className="catalog-part body-catalog-part" key={p.id}><div className="catalog-part-image">{p.image?<Image unoptimized src={p.image} width={100} height={80} alt=""/>:<span>Arte no disponible</span>}</div><strong>{p.name}</strong><span>{p.slot} · {p.class}</span><small>{p.standard?'Estándar':'Variante cosmética'}{p.cardId?' · Carta base':' · Sin carta'}</small></article>)}</div>
 {(tab==='cards'?cards.length:bodies.length)===0?<p className="catalog-empty">No hay piezas que coincidan con esos filtros.</p>:null}
 {(tab==='cards'?cards.length:bodies.length)>limit?<button className="secondary-button catalog-more" onClick={()=>setLimit(n=>n+24)}>Mostrar 24 más</button>:null}</div>
 <a className="source-link" href="/investigacion" target="_blank" rel="noreferrer">Investigación completa y reglas de adaptación <ArrowUpRight size={14}/></a></DialogContent></Dialog>;
}
