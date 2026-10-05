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
uniform sampler2D uBreachEffects;
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
void main(){
  vec2 p=vUv*2.0-1.0; float radius=length(p);
  float edge=1.0-smoothstep(.22,1.0,radius);
  bool spark=vKind>1.5&&vKind<2.5;
  bool casing=vKind>2.5&&vKind<3.5;
  bool chip=vKind>.5&&vKind<1.5;
  bool shard=vKind>3.5;
  vec4 stamp=texture2D(uBreachEffects,vUv*.5+vec2(spark?.5:0.0,.5));
  float shape=stamp.a;
  if(chip||shard)shape=smoothstep(.0,.12,min(.68-abs(p.x),.67-abs(p.y+.22*p.x)));
  if(casing)shape=smoothstep(.0,.09,min(.83-abs(p.x),.72-abs(p.y)));
  float a=shape*vAlpha;
  if(a<.012)discard;
  vec3 c=vTint*stamp.rgb;
  if(chip||shard)c=vTint*(.58+.42*vUv.y);
  if(casing)c=vTint*(.62+.58*pow(max(0.0,1.0-abs(p.y+.14)),8.0));
  if(spark)c=mix(vTint,vec3(2.8,2.2,1.3),pow(max(0.0,1.0-radius),4.0));
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
  const rain=renderer.arena?.info?.weather==='rain';
  if(id!==8&&id!==9&&id!==12&&!rain)return [];
  const quality=renderer.quality??'medium',total=rain?(quality==='ultra'?36:quality==='high'?28:quality==='low'?10:18):quality==='ultra'?18:quality==='high'?14:quality==='low'?5:9;
  const eye=renderer.eye??{x:0,y:2,z:0},yaw=Number.isFinite(renderer.weatherYaw)?renderer.weatherYaw:0;
  const pitch=Math.max(-.8,Math.min(.8,Number.isFinite(renderer.weatherPitch)?renderer.weatherPitch:0));
  const forward={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
  const right={x:Math.cos(yaw),y:0,z:Math.sin(yaw)};
  const up={x:-Math.sin(yaw)*Math.sin(pitch),y:Math.cos(pitch),z:Math.cos(yaw)*Math.sin(pitch)};
  const snow=id===8,particles=[];
  for(let i=0;i<total;i++){
    const depth=5+(i*.61803398875%1)*13;
    const falling=i*.75487766625-time*(rain?1.1:snow?.24:.055),vertical=(falling-Math.floor(falling)-.5)*depth*(rain?.82:snow?.72:.42);
    const wind=(i*.569840291%1-.5)*depth*(snow?.035:.15)+Math.sin(time*(snow?.23:.4)+i*1.7)*depth*(snow?.018:.035);
    const horizontal=(i*.41421356237%1-.5)*depth*1.18+wind;
    const p={x:eye.x+forward.x*depth+right.x*horizontal+up.x*vertical,
      y:eye.y+forward.y*depth+right.y*horizontal+up.y*vertical,
      z:eye.z+forward.z*depth+right.z*horizontal+up.z*vertical,
      sizeX:rain?.009:snow?.021:.014,sizeY:rain?.31:snow?.085:.031,sizeZ:.018,
      color:rain?[.58,.74,.8]:snow?[.78,.87,.94]:[.50,.34,.23],alpha:rain?.25:snow?.34:.18,
      kind:rain||snow?1:0,yaw:rain?-.12:snow?Math.atan2(wind,-.55):0};
    if(renderer.arena?.indoors?.(p))continue;
    particles.push(p);
  }
  return particles;
}
