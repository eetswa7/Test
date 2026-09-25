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

// Frostline carries wind-driven snow; Iron Quarry carries dry, low grit.
// Samples stay close to the view so both render paths can share one small,
// deterministic weather field without adding textures or draw passes.
export function weatherParticles(renderer,time=0){
  const id=renderer.arena?.info?.id;
  if(id!==8&&id!==9)return [];
  const quality=renderer.quality??'medium',total=quality==='ultra'?18:quality==='high'?14:quality==='low'?5:quality==='compatibility'?9:9;
  const eye=renderer.eye??{x:0,y:2,z:0},yaw=Number.isFinite(renderer.weatherYaw)?renderer.weatherYaw:0;
  const pitch=Math.max(-.8,Math.min(.8,Number.isFinite(renderer.weatherPitch)?renderer.weatherPitch:0));
  const forward={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
  const right={x:Math.cos(yaw),y:0,z:Math.sin(yaw)};
  const up={x:-Math.sin(yaw)*Math.sin(pitch),y:Math.cos(pitch),z:Math.cos(yaw)*Math.sin(pitch)};
  const snow=id===8,particles=[];
  for(let i=0;i<total;i++){
    const depth=5+(i*.61803398875%1)*13;
    const falling=i*.75487766625-time*(snow?.24:.055),vertical=(falling-Math.floor(falling)-.5)*depth*(snow?.72:.42);
    const wind=(i*.569840291%1-.5)*depth*(snow?.035:.15)+Math.sin(time*(snow?.23:.4)+i*1.7)*depth*(snow?.018:.035);
    const horizontal=(i*.41421356237%1-.5)*depth*1.18+wind;
    const p={x:eye.x+forward.x*depth+right.x*horizontal+up.x*vertical,
      y:eye.y+forward.y*depth+right.y*horizontal+up.y*vertical,
      z:eye.z+forward.z*depth+right.z*horizontal+up.z*vertical,
      sizeX:snow?.021:.014,sizeY:snow?.085:.031,sizeZ:snow?.018:.018,
      color:snow?[.78,.87,.94]:[.50,.34,.23],alpha:snow?.34:.18,
      kind:snow?1:0,yaw:snow?Math.atan2(wind,-.55):0};
    if(renderer.arena?.indoors?.(p))continue;
    particles.push(p);
  }
  return particles;
}
