import * as THREE from '../vendor/three.module.min.js';
import {clamp} from './math.js?v=17';

// Small ground-plan light field, baked once per map. This is an approximation
// of indirect light, not a GI solver. R sky access, G warm bounce, B roof height,
// A ground contact. Height-aware decoding keeps roofs and raised routes lit.
export function bakeLightField(arena,resolution=64,options={}){
  const size=arena.info.size,data=options.data??new Uint8Array(resolution*resolution*4);
  const blocks=arena.blocks.filter(b=>!b.ground&&!b.destroyed&&!b.invisible);
  const roofs=blocks.filter(b=>b.roof),lamps=arena.decor.filter(p=>p.emissive>.5&&p.y>1&&p.surface==='white');
  const start=options.startRow??0,end=Math.min(resolution,start+(options.rowCount??resolution));
  for(let z=start;z<end;z++)for(let x=0;x<resolution;x++){
    const px=((x+.5)/resolution*2-1)*size,pz=((z+.5)/resolution*2-1)*size;
    const roof=roofs.find(b=>Math.abs(px-b.x)<b.w/2&&Math.abs(pz-b.z)<b.d/2);
    let contact=1,edge=0,bounce=0;
    for(const b of blocks){
      if(b.roof||b.y-b.h/2>.3||b.h<.5)continue;
      const dx=Math.max(0,Math.abs(px-b.x)-b.w/2),dz=Math.max(0,Math.abs(pz-b.z)-b.d/2),d=Math.hypot(dx,dz);
      if(d<1.7)contact=Math.min(contact,.72+.28*clamp(d/1.7,0,1));
      if(d<3)edge=Math.max(edge,(1-d/3)*Math.min(.22,b.h*.04));
    }
    if(roof){
      for(const p of lamps){const d2=(p.x-px)**2+(p.z-pz)**2+(p.y-1.2)**2;
        if(d2>90)continue;
        if(arena.visible?.({x:px,y:1.2,z:pz},{x:p.x,y:p.y-.15,z:p.z})===false)continue;
        bounce+=.32/(1+d2*.11);
      }
    }
    const i=(z*resolution+x)*4;
    data[i]=Math.round(255*(roof?.38:1-edge));data[i+1]=Math.round(255*Math.min(.55,bounce));
    data[i+2]=Math.round(255*(roof?Math.min(16,roof.y-roof.h/2)/16:0));data[i+3]=Math.round(255*contact);
  }
  return {data,resolution,size};
}

export class LightingField {
  constructor(){this.texture={value:null};this.size={value:32};this.enabled={value:0};}
  setArena(arena){
    this.pending=null;const field=bakeLightField(arena);this.texture.value?.dispose();
    const t=new THREE.DataTexture(field.data,field.resolution,field.resolution,THREE.RGBAFormat);
    t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;
    this.texture.value=t;this.size.value=field.size;this.enabled.value=1;this.field=field;
  }
  patch(shader){
    shader.uniforms.uBreachField=this.texture;shader.uniforms.uBreachFieldSize=this.size;shader.uniforms.uBreachFieldEnabled=this.enabled;
    shader.vertexShader='varying vec3 vBreachLightPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      vBreachLightPosition=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;
      #else
      vBreachLightPosition=(modelMatrix*vec4(position,1.0)).xyz;
      #endif`);
    shader.fragmentShader='varying vec3 vBreachLightPosition; uniform sampler2D uBreachField; uniform float uBreachFieldSize; uniform float uBreachFieldEnabled;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
      vec4 field=texture2D(uBreachField,clamp(vBreachLightPosition.xz/(2.0*uBreachFieldSize)+.5,0.0,1.0));
      float roofHeight=field.b*16.0;
      float aboveRoof=smoothstep(roofHeight-.2,roofHeight+.45,vBreachLightPosition.y);
      float sky=mix(field.r,1.0,aboveRoof);
      float contact=mix(field.a,1.0,smoothstep(0.0,1.4,vBreachLightPosition.y));
      reflectedLight.indirectDiffuse*=mix(1.0,sky*contact,uBreachFieldEnabled);
      reflectedLight.indirectSpecular*=mix(1.0,mix(.55,1.0,sky),uBreachFieldEnabled);
      reflectedLight.indirectDiffuse+=diffuseColor.rgb*(1.0-metalnessFactor)*vec3(1.0,.72,.42)*field.g*(1.0-aboveRoof)*uBreachFieldEnabled;
    `);
  }
  // Keep the last complete field live until the replacement is ready. Explosions
  // otherwise cause a full 64-row bake inside a single gameplay frame.
  invalidate(arena){this.pending={arena,row:0,data:new Uint8Array(64*64*4)};}
  update(){
    const p=this.pending;if(!p)return;
    bakeLightField(p.arena,64,{data:p.data,startRow:p.row,rowCount:2});p.row+=2;
    if(p.row>=64){this.texture.value.image.data=p.data;this.texture.value.needsUpdate=true;this.field.data=p.data;this.pending=null;}
  }
  dispose(){this.pending=null;this.texture.value?.dispose();}
}
