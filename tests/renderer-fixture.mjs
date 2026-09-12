import {installMetricUV} from '../dist/js/surface-uv.js';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Renderer,isFriendly,neutraliseFinish} from '../dist/js/three-renderer.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Weapon} from '../dist/js/weapons.js';
import {makeCube,makeCylinder,makeSphere,part} from '../dist/js/geometry.js';
import {roundedBox,tube,leafCard,rockMesh,groundSurface} from '../dist/js/meshes.js';
import {direction} from '../dist/js/math.js';

// Real Three scene construction without a GPU context.
export function fixture(){
 const r=Object.create(Renderer.prototype);
 Object.assign(r,{partData:new WeakMap(),materials:new Map(),depthMaterials:new Map(),surfaceMaps:Array.from({length:16},()=>({map:new THREE.Texture(),normal:new THREE.Texture(),roughness:new THREE.Texture()})),leafMaps:Array.from({length:4},()=>new THREE.Texture()),weaponMaps:Array.from({length:4},()=>({map:new THREE.Texture(),normal:new THREE.Texture(),roughness:new THREE.Texture()})),color:new THREE.Color(),matrix:new THREE.Matrix4(),localMatrix:new THREE.Matrix4(),parentMatrix:new THREE.Matrix4(),rawMatrix:new Float32Array(16),world:new THREE.Group(),worldBatches:[],actorBatches:new Map(),weaponBatches:new Map(),windTime:{value:0},quality:'medium',geometry:{},scene:new THREE.Scene(),sun:new THREE.DirectionalLight(),settings:{motion:false,fov:80},camera:new THREE.PerspectiveCamera(55,1,.055,190),weaponCamera:new THREE.PerspectiveCamera(65,1,.018,10),weaponScene:new THREE.Scene(),weaponRoot:new THREE.Group(),muzzle:new THREE.Sprite(new THREE.SpriteMaterial()),muzzleLight:new THREE.PointLight(),worldVP:new THREE.Matrix4(),projected:new THREE.Vector4(),target:new THREE.Vector3(),eye:{x:0,y:0,z:0},cameraY:null,frames:0,lastFPS:0,frameAverage:16.7,slowTime:0,fastTime:0,renderScale:1,loaded:true,weaponKey:''});
 r.weaponRoot.add(r.muzzle);r.weaponScene.add(r.weaponRoot,r.muzzleLight);
 r.rendered=[];r.renderer={shadowMap:{},info:{reset(){},render:{calls:0}},clearDepth(){},render(scene){r.rendered.push(scene);},setRenderTarget(){},clear(){}};
 for(const [key,make]of Object.entries({cube:makeCube,surface:groundSurface,cylinder:()=>makeCylinder(16),sphere:makeSphere,bevel:()=>roundedBox(.1,4),bevelWorld:()=>roundedBox(.08,3),bevelActor:()=>roundedBox(.1,2),tube,leaf:leafCard,rock:rockMesh})){
  const g=new THREE.BufferGeometry(),b=new THREE.InterleavedBuffer(make(),8);
  g.setAttribute('position',new THREE.InterleavedBufferAttribute(b,3,0));g.setAttribute('normal',new THREE.InterleavedBufferAttribute(b,3,3));g.setAttribute('uv',new THREE.InterleavedBufferAttribute(b,2,6));r.geometry[key]=installMetricUV(g,key);
 }
 return r;
}

