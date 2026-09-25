import * as THREE from '../vendor/three.module.min.js';

// Distant harbour water: one opaque receiving plane and the existing PMREM.
// No scene copy, transmission target, reflection capture or wave geometry.
export const waterMaterial=options=>new THREE.MeshPhysicalMaterial({...options,
  ior:1.333,metalness:0,roughness:.28,clearcoat:0});
export function patchWater(shader,time,shore=0){
  shader.uniforms.uBreachWaterTime=time;
  shader.uniforms.uBreachWaterShore={value:shore};
  shader.vertexShader='varying vec2 vBreachWater;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
    vBreachWater=(modelMatrix*instanceMatrix*vec4(position,1.0)).xz;
    #else
    vBreachWater=(modelMatrix*vec4(position,1.0)).xz;
    #endif`);
  shader.fragmentShader='varying vec2 vBreachWater; uniform float uBreachWaterTime; uniform float uBreachWaterShore;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    // Thin, intermittent shore wash. No extra foam mesh or texture sample.
    float coast=1.0-smoothstep(uBreachWaterShore+.3,uBreachWaterShore+3.2,vBreachWater.x);
    float wash=cos(dot(vBreachWater,vec2(2.2,.8))-uBreachWaterTime*1.1);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.69,.77,.78),coast*smoothstep(.72,.98,wash)*.16);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    // Crossed low-amplitude ripples. Pixel-footprint filtering fades unresolved
    // slopes near the horizon instead of allowing crawling specular lines.
    vec2 footprint=fwidth(vBreachWater);
    float filtered=1.0/(1.0+dot(footprint,footprint)*8.0);
    float swell=cos(dot(vBreachWater,vec2(2.2,.8))-uBreachWaterTime*1.1);
    float ripple=cos(dot(vBreachWater,vec2(-1.7,3.1))+uBreachWaterTime*.8);
    float chop=cos(dot(vBreachWater,vec2(3.7,-2.4))-uBreachWaterTime*1.6);
    vec2 slope=(vec2(.075,.03)*swell+vec2(-.02,.04)*ripple+vec2(.014,-.025)*chop)*filtered;
    normal=normalize(mat3(viewMatrix)*vec3(-slope.x,1.0,-slope.y));
  `);
}
