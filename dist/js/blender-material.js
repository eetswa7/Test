// Rigid weapon sections share a single physical material. Roughness and metal
// are baked per vertex, so wood, rubber, brass and metal retain distinct light
// response without separate draw calls or extra texture samplers.
export function patchBlenderMaterial(shader){
 shader.vertexShader='attribute vec2 breachMaterial; varying vec2 vBreachMaterial;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBreachMaterial=breachMaterial;');
 shader.fragmentShader='varying vec2 vBreachMaterial;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('float roughnessFactor=roughness;','float roughnessFactor=vBreachMaterial.x;')
  .replace('roughnessFactor=clamp(roughness+','roughnessFactor=clamp(vBreachMaterial.x+');
 shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','float metalnessFactor=vBreachMaterial.y;');
}
