import names from './data/gene-part-names.json';
import palettes from './data/mixer-colors.json';
const classes:Record<string,number>={beast:0,bug:1,bird:2,plant:3,aquatic:4,reptile:5,mech:16,dawn:17,dusk:18};
const slots=['eyes','mouth','ears','horn','back','tail'];
/** Synthetic test genes built only from the 192 shipped standard parts. Never an NFT or wallet loadout. */
export function randomAxie(random:()=>number=Math.random){
 const pick=<T,>(items:T[])=>items[Math.floor(random()*items.length)];
 const palette=pick(palettes.filter(p=>p.skin===0&&Object.hasOwn(classes,p.class)));
 let value=BigInt(0);
 const bits=(start:number,width:number,n:number)=>{value|=BigInt(n)<<BigInt(512-start-width);};
 bits(0,5,classes[palette.class]);bits(92,6,palette.value);
 const detail=pick([0,1,2,3,256,257,384,-1]);
 if(detail===-1)bits(56,9,1);else bits(65,9,detail);
 const testParts=slots.map((slot,i)=>{const part=pick(names.filter(p=>p.key.split('-')[1]===slot));const [cl,,variant]=part.key.split('-');bits(128+64*i+25,5,classes[cl]);bits(128+64*i+30,8,Number(variant));return part.name;});
 const cl=palette.class[0].toUpperCase()+palette.class.slice(1);
 return {genes:'0x'+value.toString(16).padStart(128,'0'),class:cl,name:'Axie de prueba · '+cl,testParts};
}
