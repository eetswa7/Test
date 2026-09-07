import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';

const freshMaps=MAPS.filter(m=>m.id>=4);
test('Breakwater and Citadel have unique themes and stable selectable map IDs',()=>{
 assert.equal(MAPS.length,6);assert.equal(new Set(MAPS.map(m=>m.id)).size,6);
 assert.equal(new Arena(4).info.name,'BREAKWATER');assert.equal(new Arena(5).info.name,'CITADEL');
 assert.equal(new Arena(99).info.id,MAPS.length-1);assert.equal(new Arena(NaN).info.id,0);
});
test('every new spawn is collision safe and reaches every ground objective',()=>{
 for(const m of freshMaps){
  const arena=new Arena(m.id),nav=new Navigation(arena);
  assert.equal(arena.objectives.length,3);
  for(const q of arena.objectives)assert(!arena.collides(q,.34,1.75),`${m.name} objective ${q.name} is obstructed`);
  for(const spawn of arena.spawns){
   assert(!arena.collides(spawn,.34,1.75),`${m.name} spawn ${spawn.x},${spawn.z} obstructed`);
   for(const q of arena.objectives){
    const path=nav.path(spawn,q),end=path.at(-1);
    assert(end,`${m.name} no route from ${spawn.x},${spawn.z} to ${q.name}`);
    assert(Math.hypot(end.x-q.x,end.z-q.z)<1.9&&Math.abs(end.y-q.y)<.1,`${m.name} ${q.name} unreachable from ${spawn.x},${spawn.z}`);
   }
  }
 }
});
test('new raised routes are reachable by navigation without teleporting or jumping',()=>{
 for(const [id,targets]of [[4,[{x:-7,y:1.08,z:0},{x:7,y:1.08,z:0}]],[5,[{x:24,y:1.08,z:-13}]]]){
  const arena=new Arena(id),nav=new Navigation(arena);
  for(const q of targets){
   const path=nav.path(arena.spawns[0],q),end=path.at(-1);
   assert(end&&Math.hypot(end.x-q.x,end.z-q.z)<1.9&&Math.abs(end.y-q.y)<.05,`${arena.info.name} raised route unavailable`);
   for(let i=1;i<path.length;i++)assert(Math.abs(path[i].y-path[i-1].y)<=.36,`${arena.info.name} excessive step`);
  }
 }
});
test('new scenery remains finite and bounded for mobile rendering',()=>{
 for(const m of freshMaps){const arena=new Arena(m.id);
  assert(arena.blocks.length<180);assert(arena.decor.length<900);assert(arena.foliage.length<800);
  for(const b of [...arena.blocks,...arena.decor,...arena.foliage])for(const key of ['x','y','z','w','h','d'])assert(Number.isFinite(b[key])&&(key.length!==1||!['w','h','d'].includes(key)||b[key]>0),`${m.name} invalid ${key}`);
 }
});
