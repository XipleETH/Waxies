'use client';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { PARTS } from '@/lib/game/catalog';
export function PartPicker({value,available,onChange,label}:{value:string;available:string[];onChange:(value:string)=>void;label:string}){
 return <Combobox items={available} value={value} onValueChange={v=>{if(v)onChange(v);}} itemToStringLabel={v=>PARTS[v]?.name??v}><ComboboxInput aria-label={label} placeholder="Buscar parte…"/><ComboboxContent><ComboboxEmpty>No hay partes disponibles.</ComboboxEmpty><ComboboxList>{(id:string)=><ComboboxItem key={id} value={id}>{PARTS[id].name} · {PARTS[id].slot}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>;
}
