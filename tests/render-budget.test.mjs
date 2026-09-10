import test from 'node:test';
import assert from 'node:assert/strict';
import {framebufferSize,sceneryOcclusion} from '../dist/js/render-budget.js';
import {actorModel} from '../dist/js/geometry.js';
import {Game} from '../dist/js/engine.js';
test('framebuffers obey pixel budgets and preserve landscape aspect',()=>{for(const [w,h]of [[844,390],[932,430],[1920,1080],[3840,2160]])for(const budget of [850000,1400000,2200000]){const s=framebufferSize(w,h,3,1,budget);assert(s.width*s.height<=budget);assert(Math.abs(s.width/s.height-w/h)<.01);}});
test('baked ambient attenuation keeps roofed props darker while emissive and foliage stay legible',()=>{const arena={indoors:()=>true},p={x:0,y:1,z:0,w:1,h:2,d:1};assert(sceneryOcclusion(p,arena)<1);assert.equal(sceneryOcclusion({...p,emissive:1},arena),1);assert.equal(sceneryOcclusion({...p,leaf:0},arena),1);});
test('bot stride stays continuous through speed changes and crouch blends',()=>{const g=new Game({}, {seed:71}),a=g.actors[1];a.vx=3;actorModel(a,100,[.2,.3,.4]);actorModel(a,100.016,[.2,.3,.4]);const phase=a.stride;a.vx=4;actorModel(a,100.032,[.2,.3,.4]);assert(Math.abs(a.stride-phase)<.2);a.crouched=true;actorModel(a,100.048,[.2,.3,.4]);assert(a.animDuck>0&&a.animDuck<.5);});
