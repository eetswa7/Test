import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.min.js';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets,BLENDER_FILES} from '../dist/js/blender-assets.js';
import {fixture} from './renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {MAPS} from '../dist/js/maps.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';

const root=new URL('../dist/assets/blender/',import.meta.url);
const packed=await readRuntimeLibrary();
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
const geometries=parseBlenderGLB(buffer);
const assets=new BlenderAssets(geometries,manifest);

test('real Blender buffers have finite physical data, valid indices and neutral baked kit colour',()=>{
 assert(geometries.size>100);
 for(const [name,g] of geometries){
  assert(g.index.count>0&&g.index.count%3===0,name);assert(g.boundingSphere.radius>0,name);
  const colors=g.getAttribute('color');
  for(let i=0;i<colors.count;i++){
   assert(colors.getX(i)>=0&&colors.getX(i)<=1,name);assert(colors.getY(i)>=0&&colors.getY(i)<=1,name);
   assert(colors.getZ(i)>=0&&colors.getZ(i)<=1,name);assert.equal(colors.getW(i),1,'opaque authored alpha');
  }
  if(name.startsWith('weapon_')){
   const rm=g.getAttribute('breachMaterial');assert(rm,name);
   for(let i=0;i<rm.count;i++){assert(rm.getX(i)>=.1&&rm.getX(i)<=1,name);assert(rm.getY(i)>=0&&rm.getY(i)<=1,name);}
  }
 }
 for(const key of ['architecture__near','hard__near','sphere__near']){
  const c=geometries.get(key).getAttribute('color');
  for(let i=0;i<c.count;i++)assert(Math.abs(c.getX(i)-c.getY(i))<1e-6&&Math.abs(c.getY(i)-c.getZ(i))<1e-6,'UV data must not overwrite baked vertex colour');
 }
});

test('all 30 authored weapon cores cover every original component once and keep attachments and moving joints',()=>{
 const r=fixture();r.blenderAssets=assets;const matrix=new THREE.Matrix4();
 for(const def of WEAPONS)for(const optic of [0,1,2,3])for(const barrel of [0,1,2])for(const handling of [0,1,2,3,4]){
  const w=new Weapon(def.id,{optic,barrel,handling}),game={time:2,player:{weapon:w,ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
  r.renderWeapon(game,932/430,false);
  const members=r.blenderWeaponGroups.flatMap(g=>g.members).sort((a,b)=>a-b);
  assert.deepEqual(members,Array.from({length:r.weaponParts.coreCount},(_,i)=>i),def.name);
  const expected=r.blenderWeaponGroups.filter(p=>!p.hidden).length+r.weaponParts.slice(r.weaponParts.coreCount).filter(p=>!p.hidden).length;
  assert.equal([...r.weaponBatches.values()].reduce((n,e)=>n+e.used,0),expected);
  const muzzle={...r.weaponParts.muzzle};w.reload();w.reloadLeft=w.reloadTime*.55;r.renderWeapon(game,932/430,false);
  assert.deepEqual(r.weaponParts.muzzle,muzzle,'sight and muzzle contract stays fixed during reload');
  for(const group of r.blenderWeaponGroups){const p=r.weaponParts[group.anchor];assert.equal(group.y,p.y);assert.equal(group.pitch,p.pitch);}
  for(const entry of r.weaponBatches.values())for(let i=0;i<entry.used;i++){entry.mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));}
 }
});

test('every map uses shared authored world geometry without changing collision or spawn data',()=>{
 const r=fixture();r.blenderAssets=assets;
 for(const map of MAPS){
  const game=new Game({map:map.id},{seed:817}),before=JSON.stringify({blocks:game.arena.blocks.map(p=>[p.x,p.y,p.z,p.w,p.h,p.d,p.surface]),spawns:game.arena.spawns,objectives:game.arena.objectives});
  r.arena=game.arena;r.buildWorld();r.updateActors(game);r.uploadDynamic(r.actorBatches);
  assert(r.worldBatches.length<220,'mobile world draw budget');
  for(const b of r.worldBatches){assert(b.geometry.userData.blender);assert(b.boundingSphere.radius>0);assert([...b.instanceMatrix.array].every(Number.isFinite));}
  const after=JSON.stringify({blocks:game.arena.blocks.map(p=>[p.x,p.y,p.z,p.w,p.h,p.d,p.surface]),spawns:game.arena.spawns,objectives:game.arena.objectives});
  assert.equal(after,before,'graphics preparation must never edit physics or objectives');
  const living=game.actors.find(a=>a.id!==game.player.id);assert(living.renderParts.some(p=>p.blenderBodyIndex===4),'authored boot is attached to the existing leg rig');
 }
});

test('both native and fallback gzip decode exactly, and offline shell includes all Blender data',async()=>{
 const native=globalThis.DecompressionStream;
 try{globalThis.DecompressionStream=undefined;const fallback=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));assert.deepEqual(new Uint8Array(fallback),new Uint8Array(buffer));}
 finally{globalThis.DecompressionStream=native;}
 assert(manifest.downloadBytes<8*1048576,'complete new asset download below 8 MiB');
 assert.equal(packed.length,manifest.library.bytes);
 assert.equal(createHash('sha256').update(packed).digest('hex'),manifest.library.sha256,'segments must reconstruct the exact compressed GLB');
 for(const f of manifest.files){const data=await readFile(new URL(f.path,root));assert.equal(data.length,f.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),f.sha256);}
 const sourceRoot=new URL('../authoring/blender/source/',import.meta.url),source=JSON.parse(await readFile(new URL('manifest.json',sourceRoot),'utf8'));
 const editable=Buffer.concat(await Promise.all(source.files.map(f=>readFile(new URL(f.path,sourceRoot)))));
 assert.equal(editable.length,source.bytes);assert.equal(createHash('sha256').update(editable).digest('hex'),source.sha256,'editable source reconstructs byte-for-byte');
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
 for(const f of BLENDER_FILES)assert(sw.includes(`'./assets/${f}'`));assert(sw.includes("'./vendor/gzip.js'"));
});

test('merged first-person cores reduce the representative draw and triangle budgets',()=>{
 const game=new Game({map:0},{seed:817}),classic=fixture(),authored=fixture();authored.blenderAssets=assets;
 for(const r of [classic,authored])r.renderWeapon(game,932/430,false);
 const triangles=r=>[...r.weaponBatches.values()].reduce((n,e)=>n+(e.mesh.geometry.index?.count??e.mesh.geometry.getAttribute('position').count)/3*e.mesh.count,0);
 assert(authored.weaponBatches.size<classic.weaponBatches.size,'merged core must save real draw batches');
 assert(triangles(authored)<triangles(classic),'detail must remain within the previous first-person triangle budget');
});
