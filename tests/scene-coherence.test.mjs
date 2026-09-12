import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {fixture} from './renderer-fixture.mjs';

test('every map uses receiving floor finishes and keeps collision architecture intact',()=>{
 for(const map of MAPS){const a=new Arena(map.id),r=fixture();r.arena=a;r.buildWorld();
  const surfaces=r.worldBatches.filter(b=>b.userData.parts[0].mesh==='surface');assert(surfaces.length>0);
  for(const b of surfaces){assert.equal(b.geometry.getAttribute('position').count,6);assert.equal(b.castShadow,false);assert.equal(b.receiveShadow,true);assert(b.material.polygonOffset);}
  assert(a.blocks.every(b=>b.mesh!=='surface'));assert(a.blocks.some(b=>b.ground));
  for(const roof of a.blocks.filter(b=>b.roof&&b.room)){
   assert(!a.decor.some(p=>p.mesh==='surface'&&p.x===roof.x&&p.z===roof.z&&Math.abs(p.w-(roof.w-.6))<1e-6));
  }
 }
});
test('narrow Citadel gallery roofs no longer receive generic mechanical roof units',()=>{
 const a=new Arena(5);for(const roof of a.blocks.filter(b=>b.roof&&!b.room))assert(!a.decor.some(p=>p.x===roof.x&&p.z===roof.z&&Math.abs(p.y-roof.y-.39)<1e-6&&p.w===1.1));
});
