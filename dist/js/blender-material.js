// Rigid weapon sections share a single physical material. Roughness and metal
// are baked per vertex, so wood, rubber, brass and metal retain distinct light
// response without separate draw calls or extra texture samplers.
export function patchBlenderMaterial(shader,retainPaint=false,nativeHero=false){
 shader.vertexShader='attribute vec2 breachMaterial; varying vec2 vBreachMaterial;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBreachMaterial=breachMaterial;');
 shader.fragmentShader='varying vec2 vBreachMaterial;\n'+shader.fragmentShader;
 // Mixed facade meshes share one draw. Smooth glazing must not inherit the
 // masonry colour and normal maps from the surrounding building material.
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 sampledDiffuseColor=texture2D(map,vMapUv);
   ${nativeHero?`// Native hero vertices own calibrated finish reflectance. The
   // near-white bake carries restrained wear rather than a second base albedo.
   float heroWear=clamp(1.0+(dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722))/.80-1.0)*4.0,.58,1.12);
   sampledDiffuseColor.rgb=vec3(heroWear);`:retainPaint?`// Authored paint is already a calibrated vertex reflectance. Use
   // the steel photograph for restrained wear, not a second dark base colour.
   float paintWear=clamp(dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722))/.043,.55,1.25);
   sampledDiffuseColor.rgb=vec3(mix(1.0,paintWear,.24));`:''}
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
