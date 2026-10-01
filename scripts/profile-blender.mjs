import {readFile} from 'node:fs/promises';
import {fixture} from '../tests/renderer-fixture.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {Game} from '../dist/js/engine.js';
import {WEAPONS,Weapon} from '../dist/js/weapons.js';
import {MAPS} from '../dist/js/maps.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
const b=await readRuntimeLibrary();
const m=JSON.parse(await readFile('dist/assets/blender/manifest.json','utf8'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))),m);
const tris=b=>(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3*b.count;
const weapons=[];for(const def of WEAPONS){
 const game={time:1,player:{weapon:new Weapon(def.id,{optic:1}),ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
 const before=fixture(),after=fixture();after.blenderAssets=assets;
 for(const r of [before,after])r.renderWeapon(game,932/430,false);
 const stats=r=>({draws:[...r.weaponBatches.values()].filter(e=>e.mesh.count).length,triangles:[...r.weaponBatches.values()].reduce((n,e)=>n+tris(e.mesh),0)});
 weapons.push({weapon:def.name,before:stats(before),after:stats(after)});
}
const maps=[];for(const map of MAPS){const game=new Game({map:map.id},{seed:817}),r=fixture();r.blenderAssets=assets;r.arena=game.arena;r.buildWorld();r.updateActors(game);r.uploadDynamic(r.actorBatches);
 const samples=[];for(let i=0;i<60;i++){game.time+=1/60;const start=performance.now();r.updateActors(game);r.uploadDynamic(r.actorBatches);if(i>10)samples.push(performance.now()-start);}
 samples.sort((a,b)=>a-b);
 maps.push({map:map.name,worldBatches:r.worldBatches.length,worldTriangles:r.worldBatches.reduce((n,b)=>n+tris(b),0),actorMedianMs:+samples[Math.floor(samples.length*.5)].toFixed(3),actorP95Ms:+samples[Math.floor(samples.length*.95)].toFixed(3)});
}
console.log(JSON.stringify({scope:'Real authored asset scene counts and container CPU only. No physical iPhone FPS claim.',downloadBytes:m.downloadBytes,meshes:assets.geometries.size,weapons,maps},null,2));
