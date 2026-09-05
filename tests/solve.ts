import fs from 'node:fs';
import { DUNGEONS,PHYSICS,createState,requestJump,step,trapPosition } from '../lib/game/physics';
for(const level of DUNGEONS){
 let won=false,bestTime=Infinity,bestRoute:unknown;
 for(let seed=0;seed<400;seed++){
  let rng=seed+1;const random=()=>{rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;};
  const s=createState(level);s.phase='playing';const actions:number[]=[];
  const threshold=[2.6+random()*0.8,8.8+random()*1.25,14.5+random()*2.2,11.6+random()*1.1];
  for(let f=0;f<120*65&&s.phase==='playing';f++){
   let jump=false;
   if(s.grounded){
    if(s.y<2)jump=s.x<threshold[0]||s.x>20;
    else if(s.y<5)jump=s.direction===1&&s.x>threshold[1];
    else if(s.y<7)jump=s.direction===-1&&s.x<threshold[2];
    else if(s.y<10)jump=s.direction===1&&s.x>threshold[3];
   }
   if(s.grounded)for(const trap of level.traps){const p=trapPosition(trap,s.time);const ahead=(p.x-s.x)*s.direction;if(ahead>0&&ahead<1.65&&Math.abs(s.y-p.y)<0.9)jump=true;}
   if(s.wall!==0&&!s.grounded&&s.vy<1)jump=true;
   if(jump){requestJump(s);actions.push(f);}
   step(s,level);
  }
  if((s.phase as string)==='won'&&s.time<bestTime){won=true;bestTime=s.time;bestRoute={level:level.id,seed,time:s.time,hp:s.hp,jumps:s.jumps,actions,step:PHYSICS.step};}
 }
 if(won){console.log(JSON.stringify(bestRoute));fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/route-'+level.id+'.json',JSON.stringify(bestRoute));}
 if(!won){console.error('NO WINNING ROUTE: '+level.id);process.exitCode=1;}
}
