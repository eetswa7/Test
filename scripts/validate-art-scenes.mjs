// Real shipped geometry and renderer scene construction, without a GPU.
// These are scene budgets, not rendered images, device FPS or thermal tests.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fixture} from '../tests/renderer-fixture.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
import {Game} from '../dist/js/engine.js';
import {MAPS} from '../dist/js/maps.js';
const encoded=await readRuntimeLibrary();
const manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json','utf8'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength))),manifest);
const stats=r=>({activeBatches:r.worldBatches.filter(b=>b.count>0).length,worldTriangles:r.worldBatches.reduce((n,b)=>n+b.geometry.index.count*b.count/3,0)});
const results=[];
for(const map of MAPS){
 const game=new Game({map:map.id,mode:'tdm'},{seed:817}),r=fixture();
 r.blenderAssets=assets;r.arena=game.arena;r.height=600;r.quality='high';r.buildWorld();
 const full=stats(r);
 const positions=[['spawn',game.player.x,1.6,game.player.z],['centre',0,1.6,0],['approach',0,1.6,27]];
 if(map.id===14)positions.push(['interior',0,1.6,9]);
 for(const [view,x,y,z]of positions){
  r.camera.position.set(x,y,z);assets.lodClock=0;assets.updateLOD(r,0);
  for(const pair of r.blenderWorldLODs){
   const count=pair.near.count+pair.far.count;
   if(count!==pair.parts.filter(p=>!p.destroyed).length)throw Error('Missing or duplicate LOD instance: '+map.name);
  }
  const after=stats(r);
  if(after.activeBatches>220)throw Error('Exceeded active world-batch budget: '+map.name+' '+view+' '+after.activeBatches);
  results.push({map:map.name,view,quality:r.quality,camera:{x,y,z},fullDetail:full,selectedLOD:after,triangleReductionPercent:+((1-after.worldTriangles/full.worldTriangles)*100).toFixed(1)});
 }
}
const report={scope:'Shipped Blender scene construction and conservative full-scene world counts. No frustum/occlusion subtraction, browser frames, iPhone FPS or thermal validation.',maps:MAPS.length,views:results.length,maximumActiveWorldBatches:Math.max(...results.map(r=>r.selectedLOD.activeBatches)),results};
const path=process.argv[2]??'test-results/art-scene-budgets.json';await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({maps:report.maps,views:report.views,maximumActiveWorldBatches:report.maximumActiveWorldBatches,blacksite:results.filter(r=>r.map==='BLACKSITE')},null,2));
