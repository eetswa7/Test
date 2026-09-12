import test from 'node:test';
import assert from 'node:assert/strict';
import {shadowDue,shadowBias} from '../dist/js/shadow-system.js';
import {QUALITY} from '../dist/js/graphics-quality.js';
import {fixture} from './renderer-fixture.mjs';
import * as THREE from '../dist/vendor/three.module.min.js';

test('shadow scheduling retains fractional time and delivers its selected cadence',()=>{
 for(const hz of [15,24,30]){const state={shadowClock:0};let updates=0;for(let i=0;i<600;i++)if(shadowDue(state,1/60,hz))updates++;
 assert(Math.abs(updates-hz*10)<=1,`${hz}: ${updates}`);}
 for(const q of Object.values(QUALITY))if(q.shadow){const b=shadowBias(q.shadow,q.shadowHalf);assert(b.normalBias<2*q.shadowHalf/q.shadow);assert(b.normalBias>=.006);}
});
test('weathering and thin-leaf lighting retain shared PBR passes and bounded shading',()=>{
 const r=fixture();const make=m=>{const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(s);return s;};
 const wall=make(r.makeMaterial({surface:'concrete'},'world'));assert(wall.fragmentShader.includes('float breachDirt='));
 const leaf=make(r.makeMaterial({surface:'grass',leaf:0},'world'));assert(leaf.fragmentShader.includes('float leafBack='));assert(leaf.uniforms.uBreachLeafSun);
});
