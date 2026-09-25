import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {ridgeMesh} from '../dist/js/meshes.js';
import {CompatibilityRenderer} from '../dist/js/compatibility-renderer.js';
import {identity} from '../dist/js/math.js';
import {fixture} from './renderer-fixture.mjs';

test('terrain ridges join seamlessly with outward winding and bounded geometry',()=>{
 for(const map of MAPS.filter(m=>m.id!==4)){
  const data=ridgeMesh(map.size,map.id),triangles=data.length/24;
  assert.equal(triangles,64*3*2);
  assert(data.every(Number.isFinite));
  assert(data[4]>.2&&data[5]<0,`${map.name} inward-facing ridge slope`);
  const first=data.slice(0,3),last=data.slice((63*2+1)*24+16,(63*2+1)*24+19);
  assert(Math.hypot(...first.map((v,i)=>v-last[i]))<.0001,`${map.name} terrain seam`);
  for(let i=0;i<data.length;i+=24){
   const a=data.slice(i,i+3),b=data.slice(i+8,i+11),c=data.slice(i+16,i+19);
   const u=b.map((v,j)=>v-a[j]),v=c.map((value,j)=>value-a[j]);
   const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   assert(cross.reduce((n,value,j)=>n+value*data[i+3+j],0)>0,`${map.name} flipped ridge face`);
  }
 }
});

test('both renderers use a single non-shadowing landscape outside collision',()=>{
 const renderer=fixture();
 for(const info of MAPS){
  const arena=new Arena(info.id);renderer.arena=arena;renderer.buildWorld();
  const ridges=arena.decor.filter(p=>p.mesh==='ridge'),batches=renderer.worldBatches.filter(b=>b.userData.parts.some(p=>p.mesh==='ridge'));
  assert.equal(ridges.length,info.id===4?0:1);assert.equal(batches.length,ridges.length);
  if(batches.length){assert.equal(batches[0].geometry.getAttribute('position').count,64*3*2*3);assert.equal(batches[0].castShadow,false);}
  assert(!arena.blocks.some(p=>p.mesh==='ridge'));
 }
 const arena=new Arena(8),fallback=Object.create(CompatibilityRenderer.prototype);
 fallback.arena=arena;fallback.matrix=identity();fallback.meshes={ridge:ridgeMesh(arena.info.size,arena.info.id)};
 const faces=fallback.box(arena.decor.find(p=>p.mesh==='ridge'));
 assert.equal(faces.length,64*3*2);assert(faces.every(p=>p.landscape));
});
