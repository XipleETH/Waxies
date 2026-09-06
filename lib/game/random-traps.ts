import {PART_LIST} from './catalog';
import type {Dungeon} from './physics';
/** Use existing Classic recipes and safe authored positions; leave the saved dungeon untouched. */
export function randomTrapDungeon(source:Dungeon,random:()=>number=Math.random):Dungeon {
 const selected=new Set<string>();
 const traps=source.traps.map((trap,index)=>{
  const pool=PART_LIST.filter(part=>!selected.has(part.id)&&(index!==0||part.attack>0));
  const part=pool[Math.floor(random()*pool.length)];selected.add(part.id);
  return {...trap,part:part.id};
 });
 return {...source,traps,subtitle:'Prueba de habilidades · Trampas aleatorias',difficulty:'Experimental'};
}
