import * as THREE from '../vendor/three.module.min.js';

// Original squad insignia on dyed textile. A shared small mipmapped map replaces
// the blank floating board without changing objective markers or capture rules.
export function objectiveBannerTexture(){
 const width=128,height=64,data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const hem=x<3||x>width-4||y<3||y>height-4;
  const diamond=Math.abs(x-66)/19+Math.abs(y-32)/23;
  const emblem=diamond<1&&diamond>.63||Math.abs(x-66)<3&&Math.abs(y-32)<12;
  const stripe=x>98&&y>12&&y<51&&((y>>3)&1)===0;
  const weave=((x+y)&1)*3,shade=hem?154:emblem||stripe?56:226+weave,i=(y*width+x)*4;
  data[i]=data[i+1]=data[i+2]=shade;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
 return texture;
}

export function patchObjectiveBanner(shader,time){
 shader.uniforms.uBannerTime=time;
 shader.vertexShader='uniform float uBannerTime;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float bannerFree=clamp(position.x+.5,0.0,1.0);
  transformed.z+=sin(uBannerTime*2.2-position.x*5.0)*.65*bannerFree*bannerFree;
  transformed.y-=bannerFree*.045;
 `);
}
