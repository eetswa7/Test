import * as THREE from '../vendor/three.module.min.js';

// Stable UV metric per face, independent of interpolated bevel normals. Two
// static vertex attributes replace axis decisions in the vertex shader.
export function installMetricUV(geometry,kind){
 const n=geometry.getAttribute('normal'),count=n.count,u=new Float32Array(count*3),v=new Float32Array(count*3);
 const rounded=kind.startsWith('bevel'),box=rounded||kind==='cube';
 for(let i=0;i<count;i++){
  let a,b;
  if(box){const face=Math.floor(i/(count/6));[a,b]=face<2?[[0,0,1],[0,1,0]]:face<4?[[1,0,0],[0,0,1]]:[[1,0,0],[0,1,0]];}
  else if(kind==='sphere'){a=[Math.PI,0,0];b=[0,Math.PI/2,0];}
  else if(kind==='cylinder'||kind==='tube'){[a,b]=Math.abs(n.getY(i))>.9?[[1,0,0],[0,0,1]]:[[Math.PI,0,0],[0,1,0]];}
  else{a=[1,0,0];b=[0,1,0];}
  u.set(a,i*3);v.set(b,i*3);
 }
 geometry.setAttribute('breachUvU',new THREE.BufferAttribute(u,3));geometry.setAttribute('breachUvV',new THREE.BufferAttribute(v,3));return geometry;
}
export function patchMetricUV(shader,density){
 shader.vertexShader='attribute vec3 breachUvU; attribute vec3 breachUvV;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
 #ifdef USE_INSTANCING
 vec3 dims=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
 vec2 repeats=max(vec2(.025),vec2(length(dims*breachUvU),length(dims*breachUvV))*${density.toFixed(1)});
 #ifdef USE_MAP
 vMapUv*=repeats;
 #endif
 #ifdef USE_NORMALMAP
 vNormalMapUv*=repeats;
 #endif
 #ifdef USE_ROUGHNESSMAP
 vRoughnessMapUv*=repeats;
 #endif
 #endif`);
}
