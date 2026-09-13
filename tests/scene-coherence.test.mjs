import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {fixture} from './renderer-fixture.mjs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {prepareGroundSurfaces,visualGroundHeight} from '../dist/js/surface-placement.js';
import {DecalSystem} from '../dist/js/decal-system.js';

test('every map uses receiving floor finishes and keeps collision architecture intact',()=>{
 for(const map of MAPS){const a=new Arena(map.id),r=fixture();r.arena=a;r.buildWorld();
  const surfaces=r.worldBatches.filter(b=>b.userData.parts[0].surfaceLayer);assert(surfaces.length>0);
  for(const b of surfaces){assert.equal(b.geometry.getAttribute('position').count,6);assert.equal(b.castShadow,false);assert.equal(b.receiveShadow,true);assert(b.material.polygonOffset);}
  assert(a.blocks.every(b=>b.mesh!=='surface'));assert(a.blocks.some(b=>b.ground));
  for(const roof of a.blocks.filter(b=>b.roof&&b.room)){
   assert(!a.decor.some(p=>p.mesh==='surface'&&p.x===roof.x&&p.z===roof.z&&Math.abs(p.w-(roof.w-.6))<1e-6));
  }
 }
});
test('Breakwater water is a single opaque dielectric plane without rigid foam strips',()=>{
 const arena=new Arena(4),r=fixture();r.arena=arena;r.buildWorld();
 const water=r.worldBatches.filter(b=>b.userData.parts[0].surface==='water');assert.equal(water.length,1);
 const b=water[0];assert.equal(b.count,1);assert.equal(b.geometry.getAttribute('position').count,6);
 assert.equal(b.castShadow,false);assert.equal(b.material.transparent,false);assert.equal(b.material.transmission,0);
 assert.equal(b.material.ior,1.333);assert.equal(b.material.metalness,0);assert(b.material.roughness>=.25);
 assert(!arena.decor.some(p=>p.surface==='white'&&p.y===-1.18));
});
test('visual ground queries follow overlapping and rotated finishes without changing collision floors',()=>{
 const arena={decor:[{x:0,y:.02,z:0,w:8,h:.02,d:8,surface:'concrete'},
  {x:0,y:.035,z:0,w:.2,h:.01,d:6,surface:'white',yaw:Math.PI/2},
  {x:0,y:2,z:0,w:8,h:.02,d:8,surface:'steel'}]};
 prepareGroundSurfaces(arena);
 assert(Math.abs(visualGroundHeight(arena,2,0)-.04)<1e-8);
 assert(Math.abs(visualGroundHeight(arena,0,2)-.03)<1e-8);
 assert.equal(visualGroundHeight(arena,20,20),0);
 assert(Math.abs(visualGroundHeight(arena,0,0,2)-2.01)<1e-8);
 arena.decor[1].destroyed=true;assert(Math.abs(visualGroundHeight(arena,2,0)-.03)<1e-8);
 for(const map of MAPS){const a=new Arena(map.id);for(const floor of a.decor.filter(p=>p.surfaceLayer)){
  const y=visualGroundHeight(a,floor.x,floor.z);assert(y>=floor.y-1e-7&&y<=.12);
 }}
 const a=new Arena(0),roof=a.blocks.find(b=>b.room),point={x:roof.x,y:0,z:roof.z};
 assert.equal(a.floorAt(point),0);assert(visualGroundHeight(a,point.x,point.z)>a.floorAt(point));
});
test('contact shadows and upward bullet marks sit over visible floor layers',()=>{
 const r=fixture();r.arena=new Arena(1);r.contactShadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial(),64);r.buildWorld();
 const matrix=new THREE.Matrix4();for(let i=0;i<r.staticContacts.count;i++){
  r.staticContacts.getMatrixAt(i,matrix);const e=matrix.elements;assert(e[13]>visualGroundHeight(r.arena,e[12],e[14]));
 }
 const decals=new DecalSystem(new THREE.Scene()),position={x:0,y:0,z:0};
 decals.add(position,{x:0,y:1,z:0},false,.06);assert(decals.entries[0].matrix.elements[13]>.06);assert.equal(position.y,0);
 decals.add(position,{x:1,y:0,z:0},false,.06);assert.equal(decals.entries[1].matrix.elements[13],0);decals.dispose();
});
test('narrow Citadel gallery roofs no longer receive generic mechanical roof units',()=>{
 const a=new Arena(5);for(const roof of a.blocks.filter(b=>b.roof&&!b.room))assert(!a.decor.some(p=>p.x===roof.x&&p.z===roof.z&&Math.abs(p.y-roof.y-.39)<1e-6&&p.w===1.1));
});
test('Switchyard keeps shallow steel rail heads and wooden sleepers three dimensional',()=>{
 const a=new Arena(6),rails=a.decor.filter(p=>p.surface==='steel'&&p.w===.07&&p.d===61);
 assert.equal(rails.length,6);assert(rails.every(p=>p.mesh!=='surface'&&p.h===.06));
 const sleepers=a.decor.filter(p=>p.surface==='wood'&&p.y<.08);assert(sleepers.length>10);assert(sleepers.every(p=>p.mesh!=='surface'));
});
