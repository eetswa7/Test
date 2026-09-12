// Offline GLSL ES syntax/link input. This is not a WebGL runtime or image test.
import * as T from '../dist/vendor/three.module.min.js';
import {fixture} from '../tests/renderer-fixture.mjs';
import {Arena,MAPS} from '../dist/js/maps.js';
import {LightingField} from '../dist/js/lighting-field.js';
import {weaponModel} from '../dist/js/weapon-models.js';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
const counts={NUM_DIR_LIGHTS:1,NUM_POINT_LIGHTS:3,NUM_SPOT_LIGHTS:0,NUM_HEMI_LIGHTS:1,NUM_RECT_AREA_LIGHTS:0,NUM_DIR_LIGHT_SHADOWS:1,NUM_POINT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_MAPS:0,NUM_SPOT_LIGHT_COORDS:0,NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS:0,NUM_CLIPPING_PLANES:0,UNION_CLIPPING_PLANES:0};
function expand(s){return s.replace(/#include <([\w_]+)>/g,(_,key)=>{if(!T.ShaderChunk[key])throw Error(key);return expand(T.ShaderChunk[key]);});}
function finalise(s,lights){s=expand(s);for(const [k,v]of Object.entries(lights))s=s.replace(new RegExp('\\b'+k+'\\b','g'),String(v));return s.replace(/#pragma unroll_loop_start\s+for \( int i = (\d+); i < (\d+); i \+\+ \) \{([\s\S]+?)\}\s+#pragma unroll_loop_end/g,(_,a,b,body)=>Array.from({length:b-a},(_,i)=>body.replace(/\[\s*i\s*\]/g,'[ '+(Number(a)+i)+' ]').replace(/UNROLLED_LOOP_INDEX/g,String(Number(a)+i))).join(''));}
function shaderVariant(m,name){
 const weapon=name.startsWith('weapon/'),lights={...counts,NUM_POINT_LIGHTS:weapon?2:3,NUM_DIR_LIGHT_SHADOWS:weapon?0:1};
 const lib=m.isMeshPhysicalMaterial?T.ShaderLib.physical:T.ShaderLib.standard,s={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};m.onBeforeCompile(s);
 const defs=['USE_INSTANCING','USE_INSTANCING_COLOR','USE_COLOR','DITHERING','USE_ENVMAP','ENVMAP_TYPE_CUBE_UV','TONE_MAPPING'];
 if(!weapon)defs.push('USE_SHADOWMAP','SHADOWMAP_TYPE_PCF_SOFT','USE_FOG');if(m.alphaToCoverage)defs.push('ALPHA_TO_COVERAGE');
 if(m.map)defs.push('USE_MAP');if(m.normalMap)defs.push('USE_NORMALMAP','USE_NORMALMAP_TANGENTSPACE');if(m.roughnessMap)defs.push('USE_ROUGHNESSMAP');if(m.alphaTest)defs.push('USE_ALPHATEST');if(m.side===T.DoubleSide)defs.push('DOUBLE_SIDED');if(m.clearcoat)defs.push('USE_CLEARCOAT','IOR','PHYSICAL');
 const common='#version 300 es\nprecision highp float;precision highp int;precision highp sampler2D;precision highp samplerCube;\n'+defs.map(d=>'#define '+d).join('\n')+'\n#define HIGH_PRECISION\n#define MAP_UV uv\n#define NORMALMAP_UV uv\n#define ROUGHNESSMAP_UV uv\n#define CUBEUV_TEXEL_WIDTH 0.001488095\n#define CUBEUV_TEXEL_HEIGHT 0.001953125\n#define CUBEUV_MAX_MIP 7.0\n';
 const uniforms='uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;uniform mat3 normalMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;\n';
 const vertex=common+'#define attribute in\n#define varying out\n'+uniforms+'in vec3 position,normal,color;in vec2 uv;in mat4 instanceMatrix;in vec3 instanceColor;\n'+s.vertexShader;
 const fragment=common+'#define varying in\n#define texture2D texture\n#define textureCube texture\n#define texture2DGradEXT textureGrad\n#define texture2DLodEXT textureLod\n#define gl_FragColor breachOutput\nlayout(location=0) out vec4 breachOutput;\n'+uniforms+T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 value){return sRGBTransferOETF(value);}\n'+T.ShaderChunk.tonemapping_pars_fragment+'\nvec3 toneMapping(vec3 color){return ACESFilmicToneMapping(color);}\n'+s.fragmentShader;
 return {vertex:finalise(vertex,lights),fragment:finalise(fragment,lights)};
}
const r=fixture();r.lightingField=new LightingField();for(const m of MAPS){const g=new Game({map:m.id},{seed:718});r.arena=g.arena;r.buildWorld();r.updateActors(g);}
for(const def of WEAPONS)for(const p of weaponModel(new Weapon(def.id)))r.makeMaterial(p,'weapon');
const unique=new Map();for(const [name,m]of r.materials){const s=shaderVariant(m,name),key=s.vertex+s.fragment;if(!unique.has(key))unique.set(key,{name,...s});}
console.log(JSON.stringify([...unique.values()]));
