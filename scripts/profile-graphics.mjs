// Repeatable CPU/geometry measurements. This does not render or measure a GPU.
import * as THREE from '../dist/vendor/three.module.min.js';
import {fixture} from '../tests/renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {MAPS} from '../dist/js/maps.js';
import {aimFov,verticalFov} from '../dist/js/aim.js';
import {QUALITY} from '../dist/js/graphics-quality.js';
import {framebufferSize} from '../dist/js/render-budget.js';
import {SceneLOD} from '../dist/js/scene-lod.js';
import {bakeLightField,LightingField} from '../dist/js/lighting-field.js';
import {direction} from '../dist/js/math.js';
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
const rounded=n=>Math.round(n*1000)/1000;
const report=[];
for(const map of MAPS){
 const game=new Game({map:map.id},{seed:718}),r=fixture();r.quality='high';r.arena=game.arena;r.buildWorld();const q=QUALITY.high;r.height=framebufferSize(844,390,q.dpr,q.scale,q.pixels).height;
 r.eye=game.eye(game.player);const d=direction(game.player.yaw,game.player.pitch);
 r.camera.position.set(r.eye.x,r.eye.y,r.eye.z);r.camera.aspect=844/390;r.camera.fov=verticalFov(aimFov(80,game.player.weapon,0),844/390)*180/Math.PI;r.camera.lookAt(r.eye.x+d.x,r.eye.y+d.y,r.eye.z+d.z);r.camera.updateProjectionMatrix();r.camera.updateMatrixWorld();
 r.worldVP.multiplyMatrices(r.camera.projectionMatrix,r.camera.matrixWorldInverse);r.frustum=new THREE.Frustum().setFromProjectionMatrix(r.worldVP);r.actorBounds=new THREE.Sphere(new THREE.Vector3(),1.5);
 const before=r.worldBatches.reduce((n,b)=>n+b.count,0);new SceneLOD().update(r,1);r.world.updateMatrixWorld(true);
 const visible=r.worldBatches.filter(b=>r.frustum.intersectsObject(b));
 const tris=b=>(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3*b.count;
 r.renderWeapon(game,844/390,false);
 const times=[];for(let i=0;i<180;i++){game.time+=1/60;const start=performance.now();r.updateActors(game);r.uploadDynamic(r.actorBatches);if(i>=30)times.push(performance.now()-start);}
 const data=new Uint8Array(64*64*4),bakeTimes=[];const bakeStart=performance.now();bakeLightField(game.arena);const bakeMs=performance.now()-bakeStart;
 for(let row=0;row<64;row+=2){const start=performance.now();bakeLightField(game.arena,64,{data,startRow:row,rowCount:2});bakeTimes.push(performance.now()-start);}
 const field=new LightingField();field.setArena(game.arena);field.invalidate(game.arena);const budgetTimes=[];
 while(field.pending){const start=performance.now();field.update();budgetTimes.push(performance.now()-start);}field.dispose();
 report.push({incrementalMedianMs:rounded(percentile(budgetTimes,.5)),incrementalP95Ms:rounded(percentile(budgetTimes,.95)),map:map.name,worldBatches:r.worldBatches.length,visibleWorldBatches:visible.length,visibleWorldTriangles:visible.reduce((n,b)=>n+tris(b),0),weaponBatches:r.weaponBatches.size,weaponTriangles:[...r.weaponBatches.values()].reduce((n,e)=>n+tris(e.mesh),0),culledMicroParts:before-r.worldBatches.reduce((n,b)=>n+b.count,0),actorCpuMedianMs:rounded(percentile(times,.5)),actorCpuP95Ms:rounded(percentile(times,.95)),fullLightBakeMs:rounded(bakeMs),twoRowBakeMedianMs:rounded(percentile(bakeTimes,.5)),twoRowBakeP95Ms:rounded(percentile(bakeTimes,.95))});
}
console.log(JSON.stringify({scope:'Container CPU and scene counts only; no GPU, rasterised occlusion or iPhone FPS measurement.',viewport:'844x390 CSS reference',quality:'high',report},null,2));
