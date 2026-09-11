import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {bakeLightField,LightingField} from '../dist/js/lighting-field.js';
import {deriveSurfaceData,patchSurfaceDetail} from '../dist/js/material-detail.js';
import {environmentRadiance} from '../dist/js/environment-probes.js';

test('every map bakes a bounded finite light field with room and exterior contrast',()=>{
 for(const info of MAPS){const a=new Arena(info.id),f=bakeLightField(a);assert.equal(f.data.byteLength,16384);assert(f.data.every(Number.isFinite));
  const sky=Array.from(f.data).filter((v,i)=>i%4===0);assert(Math.min(...sky)<120);assert(Math.max(...sky)>240);
 }
});
test('removing a roof rebakes sky visibility instead of retaining stale indoor shade',()=>{
 const roof={x:0,y:4,z:0,w:10,h:.3,d:10,roof:true},a={info:{size:8},blocks:[roof],decor:[]};
 const first=bakeLightField(a,8);roof.destroyed=true;const next=bakeLightField(a,8);
 assert(first.data[4*(4*8+4)]<120);assert.equal(next.data[4*(4*8+4)],255);
});
test('light field shader affects indirect light and preserves direct sunlight and albedo',()=>{
 const field=new LightingField(),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
 field.patch(shader);assert(shader.vertexShader.includes('modelMatrix*instanceMatrix'));assert(shader.fragmentShader.includes('reflectedLight.indirectDiffuse'));
 assert(!shader.fragmentShader.includes('reflectedLight.directDiffuse*='));assert(shader.fragmentShader.includes('aboveRoof'));assert.equal(shader.uniforms.uBreachField,field.texture);
});
test('packed cavity/roughness/metalness data has neutral normals on a flat surface',()=>{
 const rgba=new Uint8ClampedArray(16*16*4).fill(128),d=deriveSurfaceData(rgba,16,true);
 for(let i=0;i<d.normal.length;i+=4){assert(Math.abs(d.normal[i]-127.5)<1);assert.equal(d.normal[i+2],255);assert.equal(d.orm[i],255);assert(d.orm[i+1]>180);}
 rgba[8*16*4+8*4]=0;const damaged=deriveSurfaceData(rgba,16,true);assert(damaged.orm[8*16*4+8*4]<255);
 const shader={fragmentShader:THREE.ShaderLib.standard.fragmentShader};patchSurfaceDetail(shader);assert(shader.fragmentShader.includes('metalnessFactor*=texelRoughness.b'));assert(!shader.fragmentShader.includes('texture2D( aoMap'));
});
test('original HDR reflection probes remain finite and put the sun above the horizon',()=>{
 for(const info of MAPS){const r=environmentRadiance(info,64,32);assert.equal(r.pixels.length,64*32*4);assert(r.pixels.every(v=>Number.isFinite(THREE.DataUtils.fromHalfFloat(v))));}
 const r=environmentRadiance({...MAPS[0],sun:[1,1,0]},256,128);let peak=0,at=0;
 for(let i=0;i<r.pixels.length;i+=4){const v=THREE.DataUtils.fromHalfFloat(r.pixels[i]);if(v>peak){peak=v;at=i/4;}}assert(peak>5);assert(Math.floor(at/256)>64);
});
