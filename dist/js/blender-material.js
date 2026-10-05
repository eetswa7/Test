// Rigid weapon sections share a single physical material. Roughness and metal
// are baked per vertex, so wood, rubber, brass and metal retain distinct light
// response without separate draw calls or extra texture samplers.
export function patchBlenderMaterial(shader){
 shader.vertexShader='attribute vec2 breachMaterial; varying vec2 vBreachMaterial;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBreachMaterial=breachMaterial;');
 shader.fragmentShader='varying vec2 vBreachMaterial;\n'+shader.fragmentShader;
 // Mixed facade meshes share one draw. Smooth glazing must not inherit the
 // masonry colour and normal maps from the surrounding building material.
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 sampledDiffuseColor=texture2D(map,vMapUv);
   float breachGlazing=(1.0-smoothstep(.26,.34,vBreachMaterial.x))*(1.0-step(.18,vBreachMaterial.y));
   diffuseColor*=mix(sampledDiffuseColor,vec4(1.0),breachGlazing);
   #endif`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float breachSmooth=(1.0-smoothstep(.26,.34,vBreachMaterial.x))*(1.0-step(.18,vBreachMaterial.y));
   normal=normalize(mix(normal,nonPerturbedNormal,breachSmooth));`);
 shader.fragmentShader=shader.fragmentShader.replace('float roughnessFactor=roughness;','float roughnessFactor=vBreachMaterial.x;')
  .replace('roughnessFactor=clamp(roughness+','roughnessFactor=clamp(vBreachMaterial.x+');
 shader.fragmentShader=shader.fragmentShader.replace('roughnessFactor=clamp((roughness+','roughnessFactor=clamp((vBreachMaterial.x+');
 shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','float metalnessFactor=vBreachMaterial.y;');
}
