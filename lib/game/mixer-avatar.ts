import * as THREE from 'three';
import { decodeAppearance, resolveAppearanceParts, type Appearance } from './appearance';
export interface ModelNode {id:string;name:string;parent:string|null;position:number[];quaternion:number[];scale:number[]}
export interface MixerMaterial {name:string;shader?:{guid:string};floats:Record<string,number>;colors:Record<string,number[]>;textures:Record<string,{url:string;scale:number[];offset:number[]}>}
export interface MixerModel {nodes:ModelNode[];renderers:Array<{node:string;geometry:{attributes:Record<string,{itemSize:number;array:number[]}>;index:number[];groups:Array<{start:number;count:number;materialIndex:number}>;bindPoses:number[][]};bones:string[];rootBone:string;materials:MixerMaterial[]}>}
export interface ModelEntry {url:string;rigType:string|null}
export interface MixerCatalog {bodies:Record<string,{models:ModelEntry[];animations:Record<string,string>}>;parts:Record<string,{models:ModelEntry[];unavailable?:unknown[]}>}
export interface MixerAnimation {name:string;duration:number;tracks:Array<{path:string;property:'position'|'quaternion'|'scale';times:number[];values:number[]}>}
export interface MixedAvatar {root:THREE.Group;mixer:THREE.AnimationMixer;actions:Partial<Record<'run'|'idle'|'air'|'dead',THREE.AnimationAction>>;appearance:Appearance;fallbacks:string[];dispose:()=>void}
/** Unity bind poses are boneWorld^-1 * rendererWorld. Keep the identity bind matrix so attachment transforms cancel correctly. */
export function instantiateMixerModel(data:MixerModel,materialFactory:(data:MixerMaterial)=>THREE.Material){
 const group=new THREE.Group(),nodes=new Map<string,THREE.Bone>(),meshes:THREE.SkinnedMesh[]=[];
 for(const n of data.nodes){const bone=new THREE.Bone();bone.name=n.name;bone.position.fromArray(n.position);bone.quaternion.fromArray(n.quaternion).normalize();bone.scale.fromArray(n.scale);nodes.set(n.id,bone);}
 for(const n of data.nodes){const node=nodes.get(n.id)!;if(n.parent){const parent=nodes.get(n.parent);if(!parent)throw new Error('Jerarquía 3D incompleta.');parent.add(node);}else group.add(node);}
 for(const r of data.renderers){const geo=new THREE.BufferGeometry();for(const [key,a] of Object.entries(r.geometry.attributes))geo.setAttribute(key,key==='skinIndex'?new THREE.Uint16BufferAttribute(a.array,a.itemSize):new THREE.Float32BufferAttribute(a.array,a.itemSize));geo.setIndex(r.geometry.index);for(const g of r.geometry.groups)geo.addGroup(g.start,g.count,g.materialIndex);geo.computeBoundingBox();geo.computeBoundingSphere();
  const mesh=new THREE.SkinnedMesh(geo,r.materials.map(materialFactory));mesh.name='mesh_'+r.node;mesh.frustumCulled=false;mesh.castShadow=true;
  const parent=nodes.get(r.node);if(!parent)throw new Error('Nodo de malla ausente.');parent.add(mesh);
  const bones=r.bones.map(id=>{const b=nodes.get(id);if(!b)throw new Error('Hueso ausente.');return b;});
  const inverses=r.geometry.bindPoses.map(a=>new THREE.Matrix4().set(...a as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]));
  if(bones.length!==inverses.length)throw new Error('Esqueleto incompatible con la malla.');
  mesh.bind(new THREE.Skeleton(bones,inverses),new THREE.Matrix4());meshes.push(mesh);
 }
 group.updateMatrixWorld(true);return {group,nodes,meshes};
}
export function animationClip(data:MixerAnimation,body:THREE.Object3D){
 const tracks:THREE.KeyframeTrack[]=[];
 for(const track of data.tracks){let node:THREE.Object3D|undefined=body;const pieces=track.path.split('/').filter(Boolean);
  // Prefab wrapper Model is not part of Unity AnimationClip paths.
  if(pieces.length){node=body.getObjectByName(pieces[0]);for(const piece of pieces.slice(1))node=node?.children.find(n=>n.name===piece);}
  if(!node){if(/(?:Root_Weapon|Axe)_[LR]_JNT$/.test(track.path))continue;throw new Error('La animación no encuentra '+track.path+'.');}
  const key=node.uuid+'.'+track.property;tracks.push(track.property==='quaternion'?new THREE.QuaternionKeyframeTrack(key,track.times,track.values):new THREE.VectorKeyframeTrack(key,track.times,track.values));
 }
 return new THREE.AnimationClip(data.name,data.duration,tracks);
}
export function createAxieMaterial(data:MixerMaterial,appearance:Appearance,map?:THREE.Texture){
 const material=new THREE.MeshBasicMaterial({map,alphaTest:.5,side:THREE.FrontSide,toneMapped:false});
 material.name=data.name;const primary=new THREE.Color(appearance.primary),secondary=new THREE.Color(appearance.secondary);
 material.onBeforeCompile=shader=>{
  shader.uniforms.axiePrimary={value:primary};shader.uniforms.axieSecondary={value:secondary};
  shader.vertexShader='varying vec3 axieNormal;\n'+shader.vertexShader.replace('#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )','#if 1').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\n axieNormal = inverseTransformDirection(transformedNormal, viewMatrix);');
  shader.fragmentShader='uniform vec3 axiePrimary;\nuniform vec3 axieSecondary;\nvarying vec3 axieNormal;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    // Official V5 graph: alpha selects the tint mask; opaque white stays untinted.
    float tintMask = step(diffuseColor.a, 0.975);
    vec3 geneticColor = mix(axieSecondary, axiePrimary, step(0.7, diffuseColor.a));
    diffuseColor.rgb *= mix(vec3(1.0), geneticColor, tintMask);
    float shade = step(dot(normalize(axieNormal), normalize(vec3(-7.0, 10.0, 12.0))), -0.25);
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.75), shade);`);
 };material.customProgramCacheKey=()=> 'axie-mixer-v5';return material;
}
async function json<T>(url:string,signal:AbortSignal):Promise<T>{const r=await fetch(url,{signal});if(!r.ok)throw new Error('No se pudo cargar un recurso 3D. Intenta de nuevo.');return r.json() as Promise<T>;}
export async function loadMixedAvatar(genes:string,signal:AbortSignal):Promise<MixedAvatar>{
 const appearance=decodeAppearance(genes),catalog=await json<MixerCatalog>('/assets/mixer/catalog.json',signal),body=catalog.bodies[appearance.body];if(!body)throw new Error('El cuerpo '+appearance.body+' no está disponible en 3D.');
 const resolved=resolveAppearanceParts(appearance,new Set(Object.entries(catalog.parts).filter(([,part])=>part.models.length>0&&!part.unavailable?.length).map(([key])=>key)));
 const entries=[...body.models.map(entry=>({entry,body:true})),...resolved.flatMap(p=>catalog.parts[p.key].models.map(entry=>({entry,body:false})))];
 const modelData=await Promise.all(entries.map(e=>json<MixerModel>(e.entry.url,signal)));
 const clips=await Promise.all(['Idle','Run','Dead'].map(async name=>({name,data:await json<MixerAnimation>(body.animations[name],signal)})));
 const textures=new Map<string,THREE.Texture>(),materials:THREE.Material[]=[],models:ReturnType<typeof instantiateMixerModel>[]=[];let disposed=false;const root=new THREE.Group();let mixer:THREE.AnimationMixer|undefined;
 const dispose=()=>{if(disposed)return;disposed=true;mixer?.stopAllAction();mixer?.uncacheRoot(root);for(const m of models)for(const mesh of m.meshes){mesh.geometry.dispose();mesh.skeleton.dispose();}materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();root.clear();};
 try{
  const textureEntries=new Map<string,{url:string;scale:number[];offset:number[]}>();for(const model of modelData)for(const r of model.renderers)for(const m of r.materials){const t=m.textures._MainTex;if(t)textureEntries.set(JSON.stringify(t),t);}
  const textureResults=await Promise.allSettled([...textureEntries].map(async([key,t])=>{const response=await fetch(t.url,{signal});if(!response.ok)throw new Error('No se pudo cargar la textura del Axie.');const blob=await response.blob();const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'});if(signal.aborted){bitmap.close();throw new DOMException('Aborted','AbortError');}const texture=new THREE.Texture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.repeat.fromArray(t.scale);texture.offset.fromArray(t.offset);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;texture.addEventListener('dispose',()=>bitmap.close());textures.set(key,texture);}));
  const failedTexture=textureResults.find(r=>r.status==='rejected');if(failedTexture?.status==='rejected')throw failedTexture.reason;
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const assembly=new THREE.Group();assembly.scale.x=-1;root.add(assembly);
  for(let i=0;i<entries.length;i++){const data=modelData[i],entry=entries[i];const model=instantiateMixerModel(data,mat=>{const m=createAxieMaterial(mat,appearance,textures.get(JSON.stringify(mat.textures._MainTex)));materials.push(m);return m;});models.push(model);
   if(entry.body)assembly.add(model.group);else{const attach=models[0].group.getObjectByName('Root_'+entry.entry.rigType+'_JNT');if(!attach)throw new Error('Falta un punto de unión del Axie.');attach.add(model.group);}
  }
  root.updateMatrixWorld(true);mixer=new THREE.AnimationMixer(root);const actions:MixedAvatar['actions']={};
  for(const {name,data} of clips){const clip=animationClip(data,models[0].group);const action=mixer.clipAction(clip);if(name==='Dead'){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;actions.dead=action;}else actions[name==='Run'?'run':'idle']=action;}
  const air=animationClip(clips[0].data,models[0].group);air.name='Air pose';actions.air=mixer.clipAction(air);actions.air.paused=true;actions.air.time=Math.min(.2,air.duration/2);
  // Scale from the body alone: long horns must not make the whole Axie tiny.
  const bounds=new THREE.Box3().setFromObject(models[0].meshes[0]),size=bounds.getSize(new THREE.Vector3());if(!Number.isFinite(size.y)||size.y<=0)throw new Error('El modelo 3D tiene dimensiones inválidas.');
  const scale=1.35/size.y;root.scale.setScalar(scale);root.position.y=-bounds.min.y*scale-.38;
  return {root,mixer,actions,appearance,fallbacks:resolved.filter(p=>!p.exact).map(p=>p.part.slot),dispose};
 }catch(error){dispose();throw error;}
}
