import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Navigation} from '../dist/js/navigation.js';
import {rng} from '../dist/js/math.js';
test('collision buckets match full collision and floor scans on every map',()=>{
 for(const map of MAPS){const a=new Arena(map.id),random=rng(128);for(let i=0;i<600;i++){
  const p={x:(random()-.5)*map.size*2,y:random()*4,z:(random()-.5)*map.size*2},r=.3+random()*.7;
  const hit=a.collides(p,r),floor=a.floorAt(p),cells=a.collisionCells;a.collisionCells=null;
  assert.equal(a.collides(p,r),hit);assert.equal(a.floorAt(p),floor);a.collisionCells=cells;
 }}
});
test('navigation sweep rejects walls between free endpoints',()=>{
 const a=new Arena(0);a.blocks=[];a.box(0,1,0,.08,2,4);a.bakeCollision();
 const nav=new Navigation(a);assert(!a.collides({x:-.6,y:0,z:0}));assert(!a.collides({x:.6,y:0,z:0}));
 assert(!nav.walkable({x:-.6,y:0,z:0},{x:.6,y:0,z:0}));
});
test('a buffered jump fires on landing and releasing movement stops promptly',()=>{
 const g=new Game({}, {seed:119});g.actors=[g.player];g.arena.blocks=[];const p=g.player;p.reset({x:0,y:.02,z:0},0);p.grounded=false;p.vy=-2;
 g.update(1/60,{...emptyInput(),jump:true});assert(p.grounded);g.update(1/60);assert(p.vy>0&&!p.grounded);
 p.reset({x:0,y:0,z:0},0);for(let i=0;i<30;i++)g.update(1/60,{...emptyInput(),mz:1});const z=p.z;
 for(let i=0;i<15;i++)g.update(1/60);assert(Math.abs(p.vz)<.01);assert(Math.abs(p.z-z)<.15);
});
