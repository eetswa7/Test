// Cycles diffuse irradiance replaces the old analytical approximation on the
// static ground. Actors, destructibles and raised surfaces retain live lighting.
export class ProductionLighting {
 constructor(){this.map={value:null};this.size={value:1};this.enabled={value:0};}
 setArena(arena,maps){this.map.value=maps?.[arena.info.id]??null;this.size.value=arena.info.size;this.enabled.value=this.map.value?1:0;}
 patch(shader){
  shader.uniforms.uProductionGI=this.map;shader.uniforms.uProductionGISize=this.size;shader.uniforms.uProductionGIEnabled=this.enabled;
  shader.fragmentShader='uniform sampler2D uProductionGI; uniform float uProductionGISize; uniform float uProductionGIEnabled;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   vec4 bakedGI=texture2D(uProductionGI,clamp(vBreachSurface.xz/(2.0*uProductionGISize)+.5,0.0,1.0));
   vec3 productionIrradiance=bakedGI.rgb*bakedGI.a*6.0;
   // This is outgoing unit-Lambertian radiance, already integrated by Cycles.
   reflectedLight.directDiffuse=mix(reflectedLight.directDiffuse,vec3(0.0),uProductionGIEnabled);
   reflectedLight.indirectDiffuse=mix(reflectedLight.indirectDiffuse,diffuseColor.rgb*(1.0-metalnessFactor)*productionIrradiance,uProductionGIEnabled);
  `);
 }
 patchBounce(shader){
  shader.uniforms.uProductionGI=this.map;shader.uniforms.uProductionGISize=this.size;shader.uniforms.uProductionGIEnabled=this.enabled;
  shader.fragmentShader='uniform sampler2D uProductionGI; uniform float uProductionGISize; uniform float uProductionGIEnabled;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
   vec3 bounceFaceNormal=inverseTransformDirection(nonPerturbedNormal,viewMatrix);
   vec3 bouncePosition=vBreachLightPosition+bounceFaceNormal*(1.2*(1.0-abs(bounceFaceNormal.y)));
   vec4 groundBounce=texture2D(uProductionGI,clamp(bouncePosition.xz/(2.0*uProductionGISize)+.5,0.0,1.0));
   // Ground-plan bounce is an approximation for vertical surfaces. Their
   // directional sunlight, contact shadows and specular response remain live.
   reflectedLight.indirectDiffuse+=diffuseColor.rgb*(1.0-metalnessFactor)*groundBounce.rgb*groundBounce.a*6.0*.24*uProductionGIEnabled;
  `);
 }
}
