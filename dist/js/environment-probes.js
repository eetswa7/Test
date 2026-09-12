import * as THREE from '../vendor/three.module.min.js';

// Original HDR radiance, independent of the photographic background. One PMREM
// per map load, never a cubemap capture during combat. 128 px cube faces.
export function environmentRadiance(info,width=512,height=256){
  const pixels=new Uint16Array(width*height*4),sun=new THREE.Vector3(...info.sun).normalize();
  const sky=new THREE.Color().setRGB(...info.sky,THREE.SRGBColorSpace),fog=new THREE.Color().setRGB(...info.fog,THREE.SRGBColorSpace);
  const overcast=info.weather==='overcast';
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const latitude=((y+.5)/height-.5)*Math.PI,longitude=((x+.5)/width-.5)*Math.PI*2;
    const dy=Math.sin(latitude),dx=Math.cos(latitude)*Math.cos(longitude),dz=Math.cos(latitude)*Math.sin(longitude);
    const dot=dx*sun.x+dy*sun.y+dz*sun.z,solar=overcast?Math.exp((dot-1)*12)*.28:Math.exp((dot-1)*1200)*22;
    const horizon=Math.pow(1-Math.abs(dy),3),ground=dy<0;
    const i=(y*width+x)*4;
    for(let c=0;c<3;c++){
      const k=['r','g','b'][c],base=ground?fog[k]*.24:sky[k]*(1-horizon*.55)+fog[k]*horizon*.75;
      pixels[i+c]=THREE.DataUtils.toHalfFloat(base+solar*[1,.86,.66][c]);
    }pixels[i+3]=THREE.DataUtils.toHalfFloat(1);
  }return {pixels,width,height};
}
export class EnvironmentProbes {
  constructor(renderer){this.generator=new THREE.PMREMGenerator(renderer);this.target=null;this.interior=null;}
  setArena(info){
    const {pixels,width,height}=environmentRadiance(info);
    const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.HalfFloatType);
    texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
    const target=this.generator.fromEquirectangular(texture);texture.dispose();this.target?.dispose();this.target=target;
    const room=interiorRadiance();
    const source=new THREE.DataTexture(room.pixels,room.width,room.height,THREE.RGBAFormat,THREE.HalfFloatType);
    source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
    this.interior?.dispose();this.interior=this.generator.fromEquirectangular(source);source.dispose();
    return target;
  }
  dispose(){this.interior?.dispose();this.target?.dispose();this.generator.dispose();}
}

export function orientWeaponEnvironment(scene,camera){
  // r180 negates environment Euler components when building its sampling matrix.
  // Encode the camera's world rotation so sampling stays fixed in the world.
  scene.environmentRotation.setFromRotationMatrix(camera.matrixWorld,'XYZ');
  scene.environmentRotation.x*=-1;scene.environmentRotation.y*=-1;scene.environmentRotation.z*=-1;
}

// Shared soft ceiling / wall / floor probe. No combat-time scene capture and
// no second fragment sampler. One 64 px-face PMREM for interior hero lighting.
export function interiorRadiance(width=256,height=128){
 const pixels=new Uint16Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const dy=Math.sin(((y+.5)/height-.5)*Math.PI),a=((x+.5)/width-.5)*Math.PI*2;
  const panel=Math.pow(Math.max(0,dy),12)*Math.pow(Math.max(0,Math.cos(a*2)),10)*3.2;
  const base=dy<0?.065:.18+dy*.15;
  const i=(y*width+x)*4;
  for(let c=0;c<3;c++)pixels[i+c]=THREE.DataUtils.toHalfFloat(base*[1,.94,.84][c]+panel*[1,.82,.62][c]);
  pixels[i+3]=THREE.DataUtils.toHalfFloat(1);
 }return {pixels,width,height};
}
export function roomProbeSelected(wasInside,sky){return wasInside?sky<.62:sky<.46;}
