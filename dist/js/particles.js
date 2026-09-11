export const billboardVertex = `
attribute vec3 instancePosition;
attribute vec3 instanceTint;
attribute vec2 instanceSize;
attribute float instanceAlpha;
attribute float instanceKind;
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
void main() {
  vUv=uv; vTint=instanceTint; vAlpha=instanceAlpha; vKind=instanceKind;
  vec4 centre=modelViewMatrix*vec4(instancePosition,1.0);
  centre.xy+=position.xy*instanceSize;
  gl_Position=projectionMatrix*centre;
}`;
export const billboardFragment = `
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
void main(){
  vec2 p=vUv*2.0-1.0; float radius=length(p);
  float edge=1.0-smoothstep(.22,1.0,radius);
  float wisps=.78+.22*sin(p.x*13.0+sin(p.y*11.0))*sin(p.y*16.0+p.x*7.0);
  float a=edge*vAlpha; if(vKind<.5)a*=wisps;
  if(a<.012)discard;
  vec3 c=vTint;
  if(vKind>1.5)c=mix(vTint,vec3(2.8,2.2,1.3),pow(max(0.0,1.0-radius),4.0));
  gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Sparse motes reuse the existing effect draw and only appear by an interior lamp.
export function ambientDust(renderer,count,time){
  const lamp=renderer.nearestLights?.[0];
  if(!lamp||!renderer.weaponLampVisible||!['high','ultra'].includes(renderer.quality)||!renderer.arena?.indoors(renderer.eye))return count;
  const total=renderer.quality==='ultra'?10:6;
  for(let i=0;i<total;i++){
    const phase=i*2.399+time*.11,y=lamp.y-.3-((i*.618+time*.035)%1)*1.8;
    count=renderer.writeBillboard(count,lamp.x+Math.sin(phase)*.8,y,lamp.z+Math.cos(phase*.9)*.8,.012,.012,.7,.59,.4,.28,1);
  }
  return count;
}
