import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Renderer,isFriendly} from '../dist/js/three-renderer.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Weapon} from '../dist/js/weapons.js';
import {makeCube,makeCylinder,makeSphere,part} from '../dist/js/geometry.js';
import {roundedBox,tube,leafCard,rockMesh} from '../dist/js/meshes.js';
import {direction} from '../dist/js/math.js';

// Real Three geometry/materials/matrices are exercised here. GPU construction is
// deliberately replaced; these tests do not claim a device or shader compile.
function fixture(){
 const r=Object.create(Renderer.prototype);
 Object.assign(r,{partData:new WeakMap(),materials:new Map(),depthMaterials:new Map(),surfaceMaps:Array.from({length:16},()=>({map:new THREE.Texture(),normal:new THREE.Texture(),roughness:new THREE.Texture()})),leafMaps:Array.from({length:4},()=>new THREE.Texture()),color:new THREE.Color(),matrix:new THREE.Matrix4(),localMatrix:new THREE.Matrix4(),parentMatrix:new THREE.Matrix4(),rawMatrix:new Float32Array(16),world:new THREE.Group(),worldBatches:[],actorBatches:new Map(),weaponBatches:new Map(),windTime:{value:0},quality:'medium',geometry:{},scene:new THREE.Scene(),sun:new THREE.DirectionalLight(),settings:{motion:false,fov:80},camera:new THREE.PerspectiveCamera(55,1,.055,190),weaponCamera:new THREE.PerspectiveCamera(65,1,.018,10),weaponScene:new THREE.Scene(),weaponRoot:new THREE.Group(),muzzle:new THREE.Sprite(new THREE.SpriteMaterial()),muzzleLight:new THREE.PointLight(),worldVP:new THREE.Matrix4(),projected:new THREE.Vector4(),target:new THREE.Vector3(),eye:{x:0,y:0,z:0},cameraY:null,frames:0,lastFPS:0,frameAverage:16.7,slowTime:0,fastTime:0,renderScale:1,loaded:true,weaponKey:''});
 r.weaponRoot.add(r.muzzle);r.weaponScene.add(r.weaponRoot,r.muzzleLight);
 r.rendered=[];r.renderer={shadowMap:{},info:{reset(){},render:{calls:0}},clearDepth(){},render(scene){r.rendered.push(scene);},setRenderTarget(){},clear(){}};
 for(const [key,make]of Object.entries({cube:makeCube,cylinder:makeCylinder,sphere:makeSphere,bevel:roundedBox,tube,leaf:leafCard,rock:rockMesh})){
  const g=new THREE.BufferGeometry(),b=new THREE.InterleavedBuffer(make(),8);
  g.setAttribute('position',new THREE.InterleavedBufferAttribute(b,3,0));g.setAttribute('normal',new THREE.InterleavedBufferAttribute(b,3,3));g.setAttribute('uv',new THREE.InterleavedBufferAttribute(b,2,6));r.geometry[key]=g;
 }
 return r;
}

test('all six maps build complete finite Three instances and release replaced batches',()=>{
 const r=fixture();let disposed=0;
 for(const info of MAPS){
  const oldCount=r.worldBatches.length;r.arena=new Arena(info.id);r.buildWorld();
  assert.equal(disposed,oldCount);
  const authored=[...r.arena.blocks,...r.arena.decor,...(r.arena.foliage??[])].filter(p=>!p.invisible&&!p.destroyed);
  assert.equal(r.worldBatches.reduce((n,b)=>n+b.userData.fullCount,0),authored.length);
  assert(r.worldBatches.length<220,'world draw batches must stay bounded');
  for(const batch of r.worldBatches){assert(batch.isInstancedMesh);assert(batch.boundingSphere.radius>0);assert([...batch.instanceMatrix.array].every(Number.isFinite));}
  disposed=0;for(const b of r.worldBatches)b.addEventListener('dispose',()=>disposed++);
 }
});

test('animated view models fit their Three batches and retain every weapon component',()=>{
 const r=fixture(),matrix=new THREE.Matrix4();
 for(let id=0;id<13;id++)for(const optic of [0,1,3]){
  const weapon=new Weapon(id,{optic,barrel:1,grip:4});weapon.reload();weapon.reloadLeft=weapon.reloadTime*.5;
  const game={time:2,player:{weapon,ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
  r.renderWeapon(game,844/390,false);
  assert.equal([...r.weaponBatches.values()].reduce((n,e)=>n+e.used,0),r.weaponParts.filter(p=>!p.hidden).length,`all parts for weapon ${id}`);
  for(const entry of r.weaponBatches.values()){assert(entry.used<=entry.capacity);for(let i=0;i<entry.used;i++){entry.mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));}}
  assert(Number.isFinite(r.muzzleLight.position.z));
 }
});

test('world projection remains centred and magnified ADS omits the obstructing weapon pass',()=>{
 const r=fixture();r.applyQuality=()=>{};r.resize=()=>844/390;r.updateActors=()=>{};r.updateEffects=()=>{};r.uploadDynamic=()=>{};r.updateLighting=()=>{};
 const p={id:0,weapon:new Weapon(7),ads:1,x:0,y:0,z:0,yaw:.67,pitch:.18,vx:0,vz:0,visualKick:.05,landKick:0,dead:false,grounded:true,respawnLeft:0,switchLeft:0,sprinting:false};
 const game={time:3,player:p,eye:()=>({x:0,y:1.65,z:0}),rules:{phase:'playing'},paused:false};
 r.render(game,1/60,false,1/60);assert.deepEqual(r.rendered,[r.scene]);
 const d=direction(p.yaw,p.pitch),screen=r.project({x:d.x*30,y:1.65+d.y*30,z:d.z*30});
 assert(Math.abs(screen.x-.5)<1e-6);assert(Math.abs(screen.y-.5)<1e-6);
 assert.equal(r.project({x:-d.x*30,y:1.65-d.y*30,z:-d.z*30}),null);
 p.weapon=new Weapon(0,{optic:1});r.rendered.length=0;r.render(game,1/60,false,1/60);
 assert.deepEqual(r.rendered,[r.scene,r.weaponScene]);
 const afterWeapon=r.project({x:d.x*30,y:1.65+d.y*30,z:d.z*30});assert(Math.abs(afterWeapon.x-.5)<1e-6);
});

test('instance identity is player-relative in team modes and free for all',()=>{
 const player={id:0,team:1},ally={id:1,team:1},enemy={id:2,team:0};
 const game={player,rules:{enemies:(a,b)=>a.team!==b.team}};
 assert(isFriendly(game,ally));assert(!isFriendly(game,enemy));
 game.rules.enemies=(a,b)=>a.id!==b.id;assert(!isFriendly(game,ally));assert(isFriendly(game,player));
 const r=fixture(),p=part(0,0,-2,1,1,1,'white',{tile:-1}),matrix=new THREE.Matrix4();
 r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.1,.72,.91]);r.uploadDynamic(r.actorBatches);
 const first=[...r.actorBatches.values()][0],color=new THREE.Color();first.mesh.getColorAt(0,color);assert(color.b>color.r);
 r.resetDynamic(r.actorBatches);r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.94,.16,.11]);r.uploadDynamic(r.actorBatches);first.mesh.getColorAt(0,color);assert(color.r>color.b);
});

test('dynamic Three batches grow without dropping transforms or colours',()=>{
 const r=fixture(),p=part(0,0,-2,1,1,1,'white',{tile:-1}),matrix=new THREE.Matrix4();
 r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.1,.72,.91]);
 assert.equal([...r.actorBatches.values()][0].capacity,64);
 for(let i=1;i<1000;i++){p.x=i;r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.94,.16,.11]);}
 r.uploadDynamic(r.actorBatches);const entry=[...r.actorBatches.values()][0];assert.equal(entry.mesh.count,1000);assert.equal(entry.capacity,1024);
 for(const i of [0,63,64,383,999]){entry.mesh.getMatrixAt(i,matrix);assert.equal(matrix.elements[12],i);}
 const c=new THREE.Color();entry.mesh.getColorAt(0,c);assert(c.b>c.r);entry.mesh.getColorAt(999,c);assert(c.r>c.b);
});

test('destroyed props disappear without rebuilding intact world batches',()=>{
 const r=fixture();r.arena=new Arena(0);r.buildWorld();const count=r.worldBatches.reduce((n,b)=>n+b.count,0),refs=r.worldBatches.slice();
 const victim=r.worldBatches.find(b=>!b.userData.leaf&&b.userData.parts.some(p=>!p.ground)).userData.parts[0];victim.destroyed=true;r.refreshDestroyed();
 assert.equal(r.worldBatches.reduce((n,b)=>n+b.count,0),count-1);assert.deepEqual(r.worldBatches,refs);r.refreshDestroyed();assert.equal(r.worldBatches.reduce((n,b)=>n+b.count,0),count-1);
});
