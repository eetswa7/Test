import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AUDIO_BANK,AUDIO_PARTS} from '../dist/js/audio-files.js';
import {WEAPONS} from '../dist/js/weapons.js';
import {AudioSystem} from '../dist/js/audio.js';
import {footstepSurface} from '../dist/js/audio-library.js';

test('original audio bank covers every weapon, suppression, reload action and surface',async()=>{
 const bytes=Buffer.concat(await Promise.all(AUDIO_PARTS.map(p=>readFile('dist/assets/'+p))));assert.equal(bytes.length,AUDIO_BANK.bytes);
 for(const w of WEAPONS)for(const key of ['shot','suppressed','reload','seat','rack'])assert(AUDIO_BANK.sounds[key+w.id]?.length,`${key} ${w.name}`);
 for(const key of ['stepHard','stepGravel','stepSoft','stepSnow','stepQuarry','stepMetal','stepWater','impactMetal','impactStone','impactWood','impactGlass','impactWater','explosion'])assert(AUDIO_BANK.sounds[key]?.length>=3);
 let end=0;for(const records of Object.values(AUDIO_BANK.sounds))for(const s of records){assert.equal(s.offset,end);assert(s.bytes>100);assert.equal(bytes.toString('ascii',s.offset+4,s.offset+8),'ftyp');assert(s.duration>0&&s.pcmPeak<=.92&&s.pcmRms>0);end+=s.bytes;}
 assert.equal(end,bytes.length);
});

test('boot foley follows actual metal decks and puddles without changing collision',()=>{
 const steel={x:0,y:.5,z:0,w:5,h:.1,d:5,surface:'steel'},water={x:0,y:.51,z:0,w:2,h:.08,d:2,surface:'water'};
 const arena={nearby:()=>[steel,water]};assert.equal(footstepSurface(arena,{x:0,y:.55,z:0}),'Water');assert.equal(footstepSurface(arena,{x:2,y:.55,z:0}),'Metal');
 water.destroyed=true;assert.equal(footstepSurface(arena,{x:0,y:.55,z:0}),'Metal');
});

test('occluded gunfire remains directional while losing high frequency and level',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{visible:()=>false}};
 audio.events([{type:'shot',weapon:0,source:2,position:{x:9,y:1.5,z:0}},{type:'shot',weapon:0,source:0,position:{x:0,y:1.5,z:0}}],game);
 assert.equal(played[0].key,'shot0');assert(played[0].occluded);assert(played[0].pan>.99);assert(played[0].volume<played[1].volume*.5);assert(!played[1].occluded);assert(played[1].important);
});
