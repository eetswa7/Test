import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon,sanitizeLoadout} from '../dist/js/weapons.js';
import {SaveStore} from '../dist/js/save.js';
import {AudioSystem} from '../dist/js/audio.js';
import {Batch} from '../dist/js/renderer.js';
import {identity} from '../dist/js/math.js';

test('recoil recovery cannot accumulate displacement beyond the vertical aim limit',()=>{
 const g=new Game(),p=g.player;for(const a of g.actors.slice(1)){a.health=0;a.respawnLeft=999;}p.pitch=1.479;p.spawnProtection=0;
 assert(g.shoot(p));assert(p.recoilPitch<=.001001);for(let i=0;i<90;i++)g.update(1/60,emptyInput());assert(p.pitch>1.478&&p.pitch<=1.48);
});
test('respawn restores first-shot accuracy and malformed loadouts are safe',()=>{
 const w=new Weapon(0);w.sinceShot=0;w.shotIndex=8;w.reset();assert.equal(w.spread(1,false,false),new Weapon(0).spread(1,false,false));assert.equal(sanitizeLoadout(null).primary,0);
});
test('blocked browser storage does not prevent launch and reports unavailable saving',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage blocked');}});
 try{const store=new SaveStore();assert.equal(store.data.loadout.primary,0);assert.equal(store.persist(),false);assert.equal(store.error,true);}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});
test('corrupt saved button positions are discarded without losing valid settings',()=>{
 const store=new SaveStore({getItem:()=>JSON.stringify({version:1,controlRevision:2,xp:900,settings:{layout:{fire:{x:'broken',y:.6},ads:{x:.8,y:.3},jump:null}}}),setItem(){}});
 assert.equal(store.data.xp,900);assert.deepEqual(store.data.settings.layout,{ads:{x:.8,y:.3}});
});
test('completed spatial sounds release their panner and echo graph',()=>{
 const nodes=[],node=()=>{const n={gain:{value:1},pan:{value:0},playbackRate:{value:1},delayTime:{value:0},connect(){},disconnect(){this.disconnected=true;},start(){}};nodes.push(n);return n;};
 const audio=new AudioSystem({volume:1});audio.context={state:'running',createBufferSource:node,createGain:node,createStereoPanner:node,createDelay:node};audio.master={};audio.buffers.set('shot',{});audio.play('shot',{indoor:true});assert.equal(audio.voices,1);nodes[0].onended();assert.equal(audio.voices,0);assert(nodes.every(n=>n.disconnected));
});
test('instance batches grow without dropping objects or reserving maximum memory upfront',()=>{
 let drawn=0;const gl={createVertexArray:()=>({}),createBuffer:()=>({}),bindVertexArray(){},bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},vertexAttribDivisor(){},bufferSubData(){},drawArraysInstanced(mode,first,count,instances){drawn=instances;}};
 const b=new Batch(gl,new Float32Array(24));assert(b.data.byteLength<=8192);const m=identity(),material={color:[1,1,1],rough:1,metal:0,pattern:0,emissive:0};for(let i=0;i<5000;i++){m[12]=i;b.add(m,material);}b.upload();b.draw();assert.equal(drawn,5000);assert.equal(b.data[12],0);assert.equal(b.data[4999*24+12],4999);
});
