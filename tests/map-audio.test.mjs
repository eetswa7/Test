import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../dist/js/audio.js';

test('Frostline and Iron Quarry footsteps use authored outdoor foley and hard interiors',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,options});
 const step={type:'step',source:2,position:{x:3,y:0,z:0},value:1};
 const game=(id,tag,inside)=>({player:{x:0,y:0,z:0,yaw:0},arena:{info:{id,tag},indoors:()=>inside}});
 audio.events([step],game(8,'ALPINE',false));audio.events([step],game(9,'QUARRY',false));
 audio.events([step],game(8,'ALPINE',true));audio.events([step],game(7,'FOREST BASE',false));
 assert.deepEqual(played.map(x=>x.key),['stepSnow','stepQuarry','stepHard','stepSoft']);
 assert(played.every(x=>x.options.distance===3&&Number.isFinite(x.options.pan)));
});
