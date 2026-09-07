import { EMOTES, EMOTE_COOLDOWN, emoteTime, visibleEmote, type EmoteEvent } from './emotes';
import { RaidPlayback } from './raid-playback';
import { canonicalRunnerGenes, type RaidAttempt, type RaidReplay } from './raid-replay';
import * as THREE from 'three';
import { loadMixedAvatar, type MixedAvatar } from './mixer-avatar';
import type { AxieLoadout } from './axie';
import { randomAxie } from './random-axie';
import { createDecorationVisuals } from './decoration-visuals';
import { dungeonRoofY } from './dungeon-framing';
import {createGuardianVisuals} from './guardian-visuals';
import { randomTrapDungeon } from './random-traps';
type AvatarInput=Pick<AxieLoadout,'genes'|'class'|'name'> & {testParts?:string[]};
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import type {RouteProof} from './route-proof';
import {MOBILE_RULES} from './portrait';
import { DUNGEONS, roomFor, PHYSICS, createState, requestJump, step, type Dungeon, type GameState } from './physics';
import { createHazardVisuals } from './hazard-visuals';
export interface AvatarStatus {kind:'buba'|'mixed'|'error'|'loading';name:string;fallbacks:string[];message?:string;testParts?:string[]}
export interface Engine { setAppearance(appearance: Pick<Dungeon,'theme'|'decoration'|'decorationPositions'>):void; setEditing(enabled:boolean):void; project(x:number,y:number):{x:number;y:number}; unproject(x:number,y:number):{x:number;y:number}; sendEmote(id:string):boolean; getEmote():EmoteEvent|null; getEmoteWait():number; playRaidReplay(data:RaidReplay):void; getPlayback():{attempt:number;complete:boolean;paused:boolean}|null; getRaidReplay():RaidReplay; getProof():RouteProof; playProof(proof:RouteProof):void; setRandomTraps(enabled:boolean):void; setRandomAxies(enabled:boolean):void; setAxie(axie:AvatarInput|null):Promise<AvatarStatus|null>; jump(): void; start(): void; restart(): void; pause(): void; setLevel(level: Dungeon): void; getState(): GameState; dispose(): void }
export function createEngine(host: HTMLElement, onState: (s: GameState) => void, onLoad: (error?: string) => void, onAvatar: (status:AvatarStatus)=>void=()=>{}, onLevel:(level:Dungeon)=>void=()=>{}): Engine {
  let disposed = false, level = DUNGEONS[0], state = createState(level), raf = 0, elapsed = 0;
  let activeAxieClass:string|null=null,sourceLevel=level;
  let attempts:RaidAttempt[]=[];
  let emotes:EmoteEvent[]=[],playback:RaidPlayback|null=null,runnerGenes:string|undefined;
  let proofActions:number[]=[],replay:RouteProof|null=null,replayIndex=0;let fitRoom:()=>void=()=>{};
  let randomTraps=false,editing=false;
  const canRandomizeTraps=(dungeon:Dungeon)=>DUNGEONS.some(d=>d.id===dungeon.id);
  let randomMode=false,refreshRandom:()=>void=()=>{},startAfterLoad=false;
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0x0c191d);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.5;
  renderer.domElement.setAttribute('aria-label', 'Mazmorra 3D. Espacio o clic para saltar; P para pausar; R para reintentar.');
  renderer.domElement.tabIndex=0; host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0c191d, 0.018);
  const camera = new THREE.OrthographicCamera(-13, 13, 7.5, -7.5, 0.1, 100);
  camera.position.set(12, 11, 38); camera.lookAt(12, 7, 0);
  scene.add(new THREE.HemisphereLight(0x91d9ce, 0x202b27, 2));
  const sun = new THREE.DirectionalLight(0xd6ffdb, 3.5); sun.position.set(5, 17, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18});
  sun.shadow.bias = -0.002; scene.add(sun);
  const warm = new THREE.PointLight(0xffb64e, 45, 16); warm.position.set(20, 12, 3); scene.add(warm);
  const teal = new THREE.PointLight(0x52e0bb, 26, 14); teal.position.set(2, 6, 3); scene.add(teal);
  const roomGroup = new THREE.Group(); scene.add(roomGroup);
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [], textures: THREE.Texture[] = [];
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => { const m = new THREE.MeshStandardMaterial({color, roughness: 0.86, ...extra}); materials.push(m); return m; };
  const stone = mat(0x31504c), top = mat(0x52817a), dark = mat(0x182e31), gold = mat(0xd69b35, {metalness: 0.65, roughness: 0.3}), wood = mat(0x5c3828);
  const edgeMat = new THREE.LineBasicMaterial({color: 0x0a191b, transparent: true, opacity: 0.65}); materials.push(edgeMat);
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, outline = false) => {
    const geo = new THREE.BoxGeometry(w, h, d); geometries.push(geo);
    const mesh = new THREE.Mesh(geo, material); mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    if (outline) { const edges = new THREE.EdgesGeometry(geo); geometries.push(edges); mesh.add(new THREE.LineSegments(edges, edgeMat)); } return mesh;
  };
  box(scene,12,14,-3,45,40,0.5,dark);
  // World geometry is intentionally three-dimensional; collision remains in XY.
  for(let row=0;row<18;row++) for(let col=0;col<11;col++) {
    const shade = new THREE.Color(0x203b3b).multiplyScalar(0.72 + ((col*13+row*7)%9)*0.038);
    box(scene, col*2.5+(row%2)*1.25, row*1.7, -2.6, 2.42,1.61,0.24,mat(shade.getHex()));
  }
  // Portal marks the entry; the vault sits at the opposite end of the route.
  const portal = new THREE.Group(); scene.add(portal);
  const portalMat = mat(0x72ffd2,{emissive:0x2cdca4,emissiveIntensity:1.6});
  box(portal,0,.85,-1.3,1.55,2.1,0.3,mat(0x062d2b));
  for(const x of [-.85,.85]) box(portal,x,.85,-1.05,0.18,2.35,0.35,portalMat);
  box(portal,0,2,-1.05,1.85,0.18,0.35,portalMat);
  const chest = new THREE.Group(); scene.add(chest);
  box(chest,0,-0.22,0,1.45,0.7,1.1,wood,true);
  const lid = new THREE.Group(); lid.position.set(0,0.12,-0.5); chest.add(lid);
  box(lid,0,0.17,0.5,1.5,0.42,1.15,wood,true);
  for(const x of [-0.51,0.51]) { box(chest,x,-0.2,0,0.14,0.79,1.17,gold); box(lid,x,0.2,0.5,0.15,0.49,1.2,gold); }
  box(chest,0,-0.08,0.59,0.27,0.35,0.13,gold);
  const gemGeo=new THREE.OctahedronGeometry(0.17); geometries.push(gemGeo);
  const gem=new THREE.Mesh(gemGeo,mat(0xf7e29c,{emissive:0xffc95b,emissiveIntensity:0.8})); gem.position.set(0,0,0.7); chest.add(gem);
  const ringGeo = new THREE.TorusGeometry(1.15,0.018,4,64); geometries.push(ringGeo);
  const halo = new THREE.Mesh(ringGeo,mat(0xf1c86c,{emissive:0xc78d35,emissiveIntensity:1.3})); halo.position.set(0,0.5,-0.9); chest.add(halo);
  const decorationVisuals = createDecorationVisuals(scene);
  let guardianVisuals:ReturnType<typeof createGuardianVisuals>|undefined;
  let hazardVisuals: ReturnType<typeof createHazardVisuals> | undefined;
  let roomGeometries:THREE.BufferGeometry[]=[],roomMaterials:THREE.Material[]=[],roomTextures:THREE.Texture[]=[];
  const loader = new THREE.TextureLoader();
  function buildLevel(next: Dungeon, deaths=0) {
    startAfterLoad=false;proofActions=[];attempts=[];emotes=[];playback=null;replay=null;sourceLevel=next;level = {...(randomTraps&&canRandomizeTraps(next)?randomTrapDungeon(next):next),runnerClass:next.rules==='raid'?next.runnerClass:(activeAxieClass??next.runnerClass)}; state = createState(level,deaths); roomGroup.clear(); hazardVisuals?.dispose();guardianVisuals?.dispose();guardianVisuals=undefined;
    for(const geo of roomGeometries){geo.dispose();geometries.splice(geometries.indexOf(geo),1);}
    for(const material of roomMaterials){material.dispose();materials.splice(materials.indexOf(material),1);}
    for(const texture of roomTextures){texture.dispose();textures.splice(textures.indexOf(texture),1);}
    const geometryStart=geometries.length,materialStart=materials.length,textureStart=textures.length;
    const room=roomFor(level),roofY=dungeonRoofY(level);const colors=level.theme==='amethyst'?[0x403c65,0x82749e]:level.theme==='ember'?[0x54372d,0xab7447]:[0x335d54,0x74a488];stone.color.setHex(colors[0]);top.color.setHex(colors[1]);
    const blocks = [{x:room.w/2,y:room.floor-.65,w:room.w,h:1.3}, ...level.platforms, ...(level.rules==='raid'?[{x:room.w/2,y:roofY-.25,w:room.w,h:.5}]:[]), {x:room.left-.55,y:roofY/2,w:1.1,h:roofY}, {x:room.right+.55,y:roofY/2,w:1.1,h:roofY}];
    blocks.forEach(p=>{
      box(roomGroup,p.x,p.y,0,p.w,p.h,2.6,stone,true);
      box(roomGroup,p.x,p.y+p.h/2,0.02,p.w+0.12,0.13,2.74,top,true);
      const n=Math.floor(p.w/1.5);
      for(let i=1;i<n;i++) box(roomGroup,p.x-p.w/2+i*p.w/n,p.y,1.32,0.025,p.h,0.02,dark);
      for(let i=0;i<n;i++) if(i%3!==1) box(roomGroup,p.x-p.w/2+i*p.w/n+0.4,p.y+p.h/2-0.13,1.39,0.35,0.2,0.06,mat(0x487963));
    });
    decorationVisuals.update(level);
    portal.position.set(level.spawn.x,level.spawn.y-PHYSICS.radius,0);
    chest.position.set(level.chest.x,level.chest.y,0.45); lid.rotation.x=0;
    hazardVisuals = createHazardVisuals(scene, level);
    hazardVisuals.update(state);
    if(level.rules==='raid'){guardianVisuals=createGuardianVisuals(scene,level);guardianVisuals.setVisible(!editing);}
    roomGeometries=geometries.slice(geometryStart);roomMaterials=materials.slice(materialStart);roomTextures=textures.slice(textureStart);
    fitRoom();onLevel(level);onState({...state});refreshRandom();
  }
  buildLevel(level);
  // Small motes give depth without obscuring the jump path.
  const particleGeo = new THREE.BufferGeometry(); geometries.push(particleGeo);
  const points=new Float32Array(90*3);
  for(let i=0;i<90;i++){points[i*3]=((i*713)%239)/10;points[i*3+1]=((i*311)%130)/10;points[i*3+2]=((i*97)%40)/10-1;}
  particleGeo.setAttribute('position',new THREE.BufferAttribute(points,3));
  const particleMat=new THREE.PointsMaterial({color:0x91d9ac,size:0.045,transparent:true,opacity:0.5});materials.push(particleMat);
  const particles=new THREE.Points(particleGeo,particleMat);scene.add(particles);
  const avatar=new THREE.Group();scene.add(avatar);let mixer:THREE.AnimationMixer|undefined,bubaMixer:THREE.AnimationMixer|undefined,bubaModel:THREE.Object3D|undefined,currentMixed:MixedAvatar|undefined;
  const bubaActions:Partial<Record<'run'|'idle'|'jump'|'air'|'dead',THREE.AnimationAction>>={};let actions=bubaActions,avatarRequest=0,avatarController:AbortController|undefined,avatarReady=false;let activeAction='';let lastJump=0;
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>/\.(png|jpe?g)$/i.test(url)||url.startsWith('blob:')?'/assets/buba-texture.png':url);
  const fbx=new FBXLoader(manager);
  Promise.all([fbx.loadAsync('/assets/buba-rig.fbx'),fbx.loadAsync('/assets/buba-run.fbx'),fbx.loadAsync('/assets/buba-idle.fbx'),fbx.loadAsync('/assets/buba-jump.fbx'),loader.loadAsync('/assets/buba-texture.png')]).then(([model,run,idle,jump,tex])=>{
    if(disposed)return;
    tex.flipY=true;tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);
    const avatarMaterial=new THREE.MeshStandardMaterial({map:tex,color:0xffffff,roughness:1,metalness:0});materials.push(avatarMaterial);
    model.traverse(o=>{if(o instanceof THREE.Mesh){const old=Array.isArray(o.material)?o.material:[o.material];old.forEach(m=>m.dispose());o.material=avatarMaterial;geometries.push(o.geometry);o.castShadow=true;}});
    const bounds=new THREE.Box3().setFromObject(model);const size=bounds.getSize(new THREE.Vector3());
    model.scale.setScalar(1.65/size.y);
    const scaled=new THREE.Box3().setFromObject(model);const center=scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-scaled.min.y-PHYSICS.radius,-center.z);avatar.add(model);bubaModel=model;
    mixer=new THREE.AnimationMixer(model);bubaMixer=mixer;
    for(const [name,asset] of [['run',run],['idle',idle],['jump',jump]] as const){
      if(asset.animations[0]){const action=mixer.clipAction(asset.animations[0]);actions[name]=action;if(name==='jump'){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}}
      asset.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
    }
    avatarReady=true;onLoad();
  }).catch(()=>{if(!disposed)onLoad('No se pudo cargar el Axie. Recarga para volver a intentarlo.');});

  const setAxie=async(axie:AvatarInput|null):Promise<AvatarStatus|null>=>{
    onAvatar({kind:'loading',name:axie?.name??'Buba',fallbacks:[],testParts:axie?.testParts});
    const report=(result:AvatarStatus)=>{const status={...result,testParts:axie?.testParts};onAvatar(status);if(startAfterLoad&&state.phase==='ready'){state.phase='playing';onState({...state});}startAfterLoad=false;return status;};
    runnerGenes=canonicalRunnerGenes(axie?.genes);activeAxieClass=axie?.class??null;level={...level,runnerClass:level.rules==='raid'?sourceLevel.runnerClass:(activeAxieClass??sourceLevel.runnerClass)};state.combat.class=level.runnerClass??'Beast';
    const request=++avatarRequest;avatarController?.abort();avatarController=new AbortController();
    if(state.phase==='playing'){state.phase='paused';onState({...state});}avatarReady=false;
    currentMixed?.dispose();currentMixed=undefined;mixer=bubaMixer;actions=bubaActions;activeAction='';
    if(bubaModel)bubaModel.visible=!axie;
    if(!axie){avatarReady=true;return report({kind:'buba',name:'Buba',fallbacks:[]});}
    try{const model=await loadMixedAvatar(axie.genes,avatarController.signal);
      if(disposed||request!==avatarRequest){model.dispose();return null;}
      currentMixed=model;avatar.add(model.root);mixer=model.mixer;actions=model.actions;avatarReady=true;
      return report({kind:'mixed',name:axie.name,fallbacks:model.fallbacks});
    }catch(error){if(disposed||request!==avatarRequest)return null;if(bubaModel)bubaModel.visible=true;avatarReady=true;return report({kind:'error',name:'Buba',fallbacks:[],message:error instanceof Error?error.message:'No se pudo ensamblar el Axie.'});}
  };
  refreshRandom=()=>{if(randomMode)void setAxie(randomAxie());};
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight,room=roomFor(level);renderer.setSize(w,h,false);const aspect=w/Math.max(h,1);const viewH=dungeonRoofY(level)+(level.rules==='raid'?3.6:0);const vh=Math.max(viewH+1,(room.w+.8)/aspect);camera.left=-vh*aspect/2;camera.right=vh*aspect/2;camera.top=vh/2;camera.bottom=-vh/2;camera.position.set(room.w/2,viewH/2+2,38);camera.lookAt(room.w/2,viewH/2,0);camera.updateProjectionMatrix();};fitRoom=resize;
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  let previous=performance.now(),accumulator=0,lastReport=0,lastPhase=state.phase;
  const loop=(now:number)=>{
    if(disposed)return;raf=requestAnimationFrame(loop);const delta=Math.min((now-previous)/1000,0.05);previous=now;
    elapsed+=delta;accumulator+=delta;
    if(state.phase!=='paused')guardianVisuals?.update(delta,elapsed);
    while(accumulator>=PHYSICS.step){if(playback){state=playback.tick(state);accumulator-=PHYSICS.step;continue;}if(replay&&state.phase==='playing'&&replay.actions[replayIndex]===state.frame){requestJump(state);replayIndex++;}const hits=state.hits;if(!editing)step(state,level);if(state.hits>hits){attempts.push({rules:MOBILE_RULES,frames:state.frame,actions:[...proofActions],end:'hit'});proofActions=[];replay=null;}accumulator-=PHYSICS.step;}
    avatar.position.set(state.x,state.y,0.8);avatar.rotation.y=state.direction===1?Math.PI/2:-Math.PI/2;
    avatar.visible=state.raid||state.invulnerable<=0||Math.floor(elapsed*15)%2===0;
    avatar.scale.set(1,state.grounded?1:1.04,1);
    const animation=currentMixed?((state.phase==='dead'||state.phase==='resetting')?'dead':state.phase==='playing'?(state.grounded?'run':'air'):'idle'):state.phase==='playing'?(state.grounded?'run':'jump'):'idle';
    if(animation!==activeAction||(animation==='jump'&&state.jumps!==lastJump)){
      if(activeAction&&actions[activeAction as keyof typeof actions])actions[activeAction as keyof typeof actions]?.fadeOut(0.1);
      actions[animation]?.reset().fadeIn(0.1).play();if(animation==='air'&&actions.air){actions.air.paused=true;actions.air.time=.2;}activeAction=animation;
    }
    lastJump=state.jumps;if(state.phase!=='paused')mixer?.update(delta);
    hazardVisuals?.update(state);
    halo.rotation.z=elapsed*0.3;halo.scale.setScalar(1+Math.sin(elapsed*2)*0.04);
    lid.rotation.x=THREE.MathUtils.lerp(lid.rotation.x,state.phase==='won'?-1.2:0,0.08);
    particles.rotation.z=Math.sin(elapsed*0.1)*0.005;
    if(now-lastReport>100||state.phase!==lastPhase){onState({...state});lastReport=now;lastPhase=state.phase;}
    renderer.render(scene,camera);
  };raf=requestAnimationFrame(loop);
  const jump=()=>{if(!editing&&!playback&&avatarReady&&!replay&&(state.phase==='playing'||state.phase==='ready')){if(proofActions.at(-1)!==state.frame)proofActions.push(state.frame);requestJump(state);}};
  const pause=()=>{if(playback){playback.paused=!playback.paused;onState({...state});return;}if(!avatarReady)return;if(state.phase==='playing')state.phase='paused';else if(state.phase==='paused')state.phase='playing';onState({...state});};
  const restart=()=>{if(playback)return;if(state.raid&&state.frame>0&&['playing','paused'].includes(state.phase))attempts.push({rules:MOBILE_RULES,frames:state.frame,actions:[...proofActions],end:'restart'});proofActions=[];replay=null;startAfterLoad=false;if(state.raid){const hp=state.hp,hits=state.hits;state={...createState(level,state.deaths),hp,hits,phase:hp>0?'ready':'dead'};onState({...state});return;}if(randomTraps&&canRandomizeTraps(sourceLevel))buildLevel(sourceLevel,state.deaths);else{state=createState(level,state.deaths);refreshRandom();onState({...state});}renderer.domElement.focus({preventScroll:true});};
  const key=(e:KeyboardEvent)=>{
    if(editing)return;
    if((e.target as HTMLElement)?.closest('input,select,textarea,[role="dialog"]'))return;
    if(e.repeat)return;
    if(e.code==='Space'||e.code==='ArrowUp'){if((e.target as HTMLElement)?.closest('button,[role="tab"]'))return;e.preventDefault();jump();}
    if(e.code==='KeyR')restart();if(e.code==='KeyP'||e.code==='Escape')pause();
  };
  const visibility=()=>{if(document.hidden&&state.phase==='playing'){if(playback){playback.paused=true;onState({...state});return;}state.phase='paused';onState({...state});}};
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  const cursor=()=>({attempt:playback?.attempt??(['resetting','dead','won'].includes(state.phase)?Math.max(0,attempts.length-(state.phase==='won'?0:1)):attempts.length),frame:state.frame});
  const currentEvents=()=>playback?.replay.emotes??emotes;
  const currentAttempts=()=>playback?.replay.attempts??attempts;
  const emoteWait=()=>{const last=emotes.at(-1);if(!last)return 0;const c=cursor();return Math.max(0,EMOTE_COOLDOWN-(emoteTime(attempts,c.attempt,c.frame)-emoteTime(attempts,last.attempt,last.frame)));};
  return {sendEmote:(id)=>{if(playback || !avatarReady || !['playing','won','dead'].includes(state.phase) || emotes.length>=30 || emoteWait()>0 || !EMOTES.some(e=>e.id===id))return false;emotes.push({id,...cursor()});return true;},getEmote:()=>{const c=cursor();return visibleEmote(currentEvents(),currentAttempts(),c.attempt,c.frame);},getEmoteWait:emoteWait,playRaidReplay:(data)=>{replay=null;proofActions=[];playback=new RaidPlayback(level,data);state=playback.initial();onState({...state});},getPlayback:()=>playback?{attempt:playback.attempt,complete:playback.complete,paused:playback.paused}:null,setAppearance:(appearance)=>{level={...level,...appearance};sourceLevel={...sourceLevel,...appearance};const colors=level.theme==='amethyst'?[0x403c65,0x82749e]:level.theme==='ember'?[0x54372d,0xab7447]:[0x335d54,0x74a488];stone.color.setHex(colors[0]);top.color.setHex(colors[1]);decorationVisuals.update(level);},setEditing:(enabled)=>{editing=enabled;guardianVisuals?.setVisible(!enabled);},project:(x,y)=>{camera.updateMatrixWorld();const v=new THREE.Vector3(x,y,.8).project(camera);return {x:(v.x+1)/2,y:(1-v.y)/2};},unproject:(x,y)=>{camera.updateMatrixWorld();const a=new THREE.Vector3(x*2-1,1-y*2,-1).unproject(camera),b=new THREE.Vector3(x*2-1,1-y*2,1).unproject(camera);const t=(.8-a.z)/(b.z-a.z);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};},getRaidReplay:()=>({emotes:[...emotes],...(runnerGenes?{runnerGenes}:{}),attempts:[...attempts,...(state.phase==='won'?[{rules:MOBILE_RULES,frames:state.frame,actions:[...proofActions],end:'won' as const}]:[])]}),getProof:()=>({rules:MOBILE_RULES,frames:state.frame,actions:[...proofActions]}),playProof:(proof)=>{playback=null;emotes=[];proofActions=[];state=createState(level);replay=proof;replayIndex=0;if(avatarReady)state.phase='playing';else startAfterLoad=true;onState({...state});},setRandomTraps:(enabled)=>{if(randomTraps===enabled)return;randomTraps=enabled;if(canRandomizeTraps(sourceLevel))buildLevel(sourceLevel);},setRandomAxies:(enabled)=>{randomMode=enabled;startAfterLoad=false;refreshRandom();},setAxie,jump,start:()=>{if(state.phase==='ready'){if(avatarReady)state.phase='playing';else startAfterLoad=true;}renderer.domElement.focus({preventScroll:true});},restart,pause,setLevel:buildLevel,getState:()=>structuredClone(state),dispose:()=>{
    disposed=true;decorationVisuals.dispose();guardianVisuals?.dispose();avatarRequest++;avatarController?.abort();currentMixed?.dispose();cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);
    hazardVisuals?.dispose();mixer?.stopAllAction();bubaMixer?.stopAllAction();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();
  }};
}
