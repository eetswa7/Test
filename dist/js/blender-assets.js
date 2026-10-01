import * as THREE from '../vendor/three.module.min.js';
import {installMetricUV} from './surface-uv.js?v=49';
import {LIBRARY_FILES} from './blender-files.js?v=49';

export const BLENDER_FILES=[...LIBRARY_FILES,'blender/manifest.json'];
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const types={5121:[Uint8Array,1,'getUint8'],5123:[Uint16Array,2,'getUint16'],5125:[Uint32Array,4,'getUint32'],5126:[Float32Array,4,'getFloat32']};

// This bounded loader reads our static, uncompressed Blender mesh library.
// Animation, images, external buffers, skinning and extension decoders are not
// needed: the existing game owns the rig and every asset is shipped offline.
export function parseBlenderGLB(buffer){
 const view=new DataView(buffer);
 if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid Blender GLB header');
 let json,bin;
 for(let offset=12;offset<buffer.byteLength;){
  if(offset+8>buffer.byteLength)throw Error('Truncated Blender GLB chunk');
  const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true),start=offset+8;
  if(start+length>buffer.byteLength)throw Error('Truncated Blender GLB data');
  if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,start,length)));
  if(type===0x004e4942)bin=new DataView(buffer,start,length);
  offset=start+length;
 }
 if(json?.asset?.version!=='2.0'||!bin||json.buffers?.length!==1||json.buffers[0].uri||json.extensionsRequired?.length)throw Error('Unsupported Blender library layout');
 const attribute=index=>{
  const a=json.accessors?.[index],b=json.bufferViews?.[a?.bufferView],t=types[a?.componentType],size=components[a?.type];
  if(!a||!b||!t||!size||a.sparse||b.buffer!==0)throw Error('Unsupported Blender accessor');
  const [Type,bytes,get]=t,stride=b.byteStride??size*bytes,start=(b.byteOffset??0)+(a.byteOffset??0);
  if(!Number.isSafeInteger(a.count)||a.count<1||stride<size*bytes||start<0||start+(a.count-1)*stride+size*bytes>bin.byteLength)throw Error('Blender accessor outside buffer');
  const array=new Type(a.count*size);
  for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)array[i*size+j]=bin[get](start+i*stride+j*bytes,true);
  return new THREE.BufferAttribute(array,size,a.normalized===true);
 };
 const geometries=new Map();
 for(const mesh of json.meshes??[]){
  if(!mesh.name||mesh.primitives?.length!==1)throw Error('Blender assets must have one mesh primitive');
  const p=mesh.primitives[0];if(p.mode!==undefined&&p.mode!==4)throw Error('Blender asset must be triangles');
  const g=new THREE.BufferGeometry();g.name=mesh.name;
  for(const [key,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color'})){
   if(p.attributes[key]===undefined)throw Error(`Missing Blender ${key}: ${mesh.name}`);
   g.setAttribute(name,attribute(p.attributes[key]));
  }
  if(p.attributes.TEXCOORD_1!==undefined)g.setAttribute('breachMaterial',attribute(p.attributes.TEXCOORD_1));
  if(p.indices!==undefined)g.setIndex(attribute(p.indices));
  const positions=g.getAttribute('position'),normals=g.getAttribute('normal');
  if(positions.count!==normals.count||positions.count!==g.getAttribute('color').count)throw Error('Mismatched Blender vertex streams');
  if(!positions.array.every(Number.isFinite)||!normals.array.every(Number.isFinite))throw Error('Non-finite Blender mesh');
  if(g.index&&g.index.array.some(i=>i>=positions.count))throw Error('Invalid Blender index');
  installMetricUV(g,'authored');g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.blender=true;geometries.set(mesh.name,g);
 }
 return geometries;
}

const bodyKinds=['limb','limb','limb','limb','boot','boot','soft','torso','vest','pack','head','helmet','hard','soft','limb','limb','limb','limb','glove','glove'];
export function blenderKind(p,category){
 if(p.blenderMesh)return p.blenderMesh;
 if(category==='actor'&&Number.isInteger(p.blenderBodyIndex)&&bodyKinds[p.blenderBodyIndex])return bodyKinds[p.blenderBodyIndex];
 if(p.mesh==='ridge')return p.blenderRidgeName??null;
 if(p.mesh==='surface')return 'surface';
 if(p.mesh==='leaf')return 'leaf';
 if(p.mesh==='conifer')return 'conifer';
 if(p.mesh==='strata')return 'strata';
 if(p.mesh==='rock')return 'rock';
 if(p.mesh==='operatorTorso')return 'torso';
 if(p.mesh==='operatorLimb')return 'limb';
 if(p.mesh==='tube')return 'tube';
 if(p.mesh==='sphere')return 'sphere';
 if(p.mesh==='cylinder')return category==='world'&&p.breakable?'drum':'cylinder';
 if(category==='world'){
  if(p.shellThickness>.02&&p.surface==='wood')return 'crate';
  if(p.shellThickness>0&&p.shellThickness<.01)return p.w>p.d?'cargo_x':'cargo_z';
  return 'architecture';
 }
 return p.tile===9||p.finishTile===2||p.surface==='fabric'?'soft':'hard';
}

export class BlenderAssets {
 constructor(geometries,manifest){
  if(manifest?.schema!==1||manifest.units!=='metres'||Object.keys(manifest.weapons??{}).length!==30)throw Error('Invalid Blender manifest');
  this.geometries=geometries;this.manifest=manifest;this.lodClock=0;
  for(const key of Object.keys(manifest.meshes))if(!geometries.has(key))throw Error(`Missing Blender mesh ${key}`);
 }
 geometry(p,category,far=false){
  const name=blenderKind(p,category);if(!name)return null;
  return this.geometries.get(p.blenderMesh?name:`${name}__${far?'far':'near'}`)??null;
 }
 key(p,category){const name=blenderKind(p,category);return name?(p.blenderMesh?name:`${name}/${p.blenderFar?'far':'near'}`):null;}
 weaponGroups(parts,id){
  const record=this.manifest.weapons[id];if(!record||record.coreCount!==parts.coreCount)throw Error('Blender weapon rig no longer matches source');
  return record.groups.map(g=>({ ...parts[g.anchor],blenderMesh:g.mesh,blenderColour:true,mesh:g.mesh,
   color:[1,1,1],rough:g.rough,metal:g.metal,finishTile:g.finishTile<0?undefined:g.finishTile,tile:g.tile,
   blenderVertexMaterial:g.vertexMaterial,anchor:g.anchor,members:g.members }));
 }
 updateLOD(renderer,dt){
  this.lodClock-=dt;if(this.lodClock>0)return;this.lodClock=.25;
  const near=renderer.quality==='low'?13:renderer.quality==='medium'?21:30;
  for(const batch of renderer.worldBatches){
   const p=batch.userData.parts?.[0];if(!p||p.blenderMesh)continue;
   const sphere=batch.boundingSphere;if(!sphere)continue;
   const distance=Math.max(0,sphere.center.distanceTo(renderer.camera.position)-sphere.radius*.7);
   const far=batch.userData.blenderFar?distance>near*.8:distance>near*1.2;
   if(far===batch.userData.blenderFar)continue;
   const geometry=this.geometry(p,'world',far);if(!geometry)continue;
   batch.geometry=geometry;batch.userData.blenderFar=far;
   // Both LODs retain the same conservative world-space bounds and silhouettes.
  }
 }
 dispose(){for(const g of this.geometries.values())g.dispose();this.geometries.clear();}
}

export async function loadBlenderAssets(){
 const responses=await Promise.all(BLENDER_FILES.map(file=>fetch(new URL(`../assets/${file}`,import.meta.url))));
 for(const r of responses)if(!r.ok)throw Error(`Could not load Blender asset (${r.status})`);
 const manifest=await responses.pop().json();
 const segments=await Promise.all(responses.map(r=>r.arrayBuffer()));
 const buffer=await new Blob(segments).arrayBuffer();
 return new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(buffer)),manifest);
}

export async function decodeBlenderLibrary(buffer){
 const header=new Uint8Array(buffer);
 if(header[0]!==0x1f||header[1]!==0x8b)return buffer; // A host may already decode Content-Encoding.
 const bytes=new DataView(buffer).getUint32(buffer.byteLength-4,true);
 if(bytes>64*1048576)throw Error('Blender library exceeds memory budget');
 if(typeof DecompressionStream!=='undefined'){
  const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
 }
 const {gunzipSync}=await import('../vendor/gzip.js');
 const decoded=gunzipSync(header);return decoded.buffer.slice(decoded.byteOffset,decoded.byteOffset+decoded.byteLength);
}

export function syncBlenderWeapon(groups,parts){
 // Reuse proxies and the original moving-part animation. Never touch ammo,
 // attachment modifiers, recoil, damage, sight alignment or fire cadence.
 for(const group of groups){const anchor=parts[group.anchor];
  group.x=anchor.x;group.y=anchor.y;group.z=anchor.z;group.w=anchor.w;group.h=anchor.h;group.d=anchor.d;
  group.yaw=anchor.yaw;group.pitch=anchor.pitch;group.roll=anchor.roll;group.hidden=anchor.hidden;
 }
}
