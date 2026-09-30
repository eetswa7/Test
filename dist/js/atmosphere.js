// Height haze and forward sun scattering in the existing fog stage. No extra
// framebuffer, texture sample or full-screen draw; hero weapons remain clear.
export function patchAtmosphere(shader,sun,haze){
 shader.uniforms.uBreachHazeSun=sun;shader.uniforms.uBreachHaze=haze;
 shader.vertexShader='varying vec3 vBreachHazeWorld;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 breachHazeWorld=vec4(transformed,1.0);
  #ifdef USE_INSTANCING
  breachHazeWorld=instanceMatrix*breachHazeWorld;
  #endif
  vBreachHazeWorld=(modelMatrix*breachHazeWorld).xyz;`);
 shader.fragmentShader='varying vec3 vBreachHazeWorld; uniform vec3 uBreachHazeSun; uniform float uBreachHaze;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`
  #ifdef USE_FOG
   #ifdef FOG_EXP2
   float fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
   #else
   float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
   #endif
   float breachHorizon=exp(-max(vBreachHazeWorld.y,0.0)*.075);
   float breachDistance=smoothstep(18.0,120.0,vFogDepth);
   float breachVeil=uBreachHaze*breachHorizon*breachDistance;
   vec3 breachRay=normalize(vBreachHazeWorld-cameraPosition);
   float breachScatter=pow(max(0.0,dot(breachRay,uBreachHazeSun)),8.0)*breachDistance;
   vec3 breachHazeColor=mix(fogColor,vec3(1.0,.87,.68),breachScatter*.15);
   gl_FragColor.rgb=mix(gl_FragColor.rgb,breachHazeColor,clamp(fogFactor+breachVeil*(1.0-fogFactor),0.0,1.0));
  #endif`);
}
