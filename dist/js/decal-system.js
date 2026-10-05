import * as THREE from '../vendor/three.module.min.js';

// One opaque, alpha-tested batch replaces six-faced impact cubes. No texture
// allocation, transparency sorting, shadow casting or idle matrix uploads.
export class DecalSystem {
  constructor(scene,capacity=64){
    this.scene=scene;this.cursor=0;this.dirty=false;
    this.entries=Array.from({length:capacity},()=>({life:0,matrix:new THREE.Matrix4(),color:new THREE.Color()}));
    this.position=new THREE.Vector3();this.normal=new THREE.Vector3();this.forward=new THREE.Vector3(0,0,1);this.scale=new THREE.Vector3();this.rotation=new THREE.Quaternion();
    this.twist=new THREE.Quaternion();
    const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96,metalness:0,alphaTest:.35,alphaToCoverage:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vBulletUv;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBulletUv=uv;');
      shader.fragmentShader='varying vec2 vBulletUv;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
        vec2 crater=vBulletUv*2.0-1.0;float radius=length(crater);
        float angle=atan(crater.y,crater.x+.00001);float rim=.7+.08*sin(angle*7.0)+.05*cos(angle*13.0);
        diffuseColor.a*=1.0-smoothstep(rim-.08,rim,radius);
        diffuseColor.rgb*=.22+.78*smoothstep(.12,.6,radius);
        #include <alphatest_fragment>`);
    };
    material.customProgramCacheKey=()=> 'bullet-crater-v1';
    this.mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,capacity);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.renderOrder=2;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
    // Reserve the colour interface before shader warmup. Creating it on the
    // first hit would trigger a new instancing shader during combat.
    this.mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  add(position,normal,surface=false,groundY=position.y){
    const e=this.entries[this.cursor++%this.entries.length];e.life=18;
    const metal=surface===true||['steel','rust','dark','blue','brass'].includes(surface);
    e.color.setHex(metal?0x747a7b:surface==='wood'?0x8d795e:surface==='glass'?0x8da1a3:surface==='sand'||surface==='dirt'?0x8b7962:0xaaa69e);
    this.normal.set(normal.x,normal.y,normal.z).normalize();if(this.normal.lengthSq()<.5)this.normal.set(0,1,0);
    this.position.set(position.x,this.normal.y>.9?Math.max(position.y,groundY):position.y,position.z).addScaledVector(this.normal,.003);
    this.rotation.setFromUnitVectors(this.forward,this.normal);
    this.twist.setFromAxisAngle(this.forward,(this.cursor*.61803398875%1)*Math.PI*2);this.rotation.multiply(this.twist);
    this.scale.setScalar(metal?.06:.095);
    e.matrix.compose(this.position,this.rotation,this.scale);this.dirty=true;
  }
  update(dt){
    for(const e of this.entries)if(e.life>0){e.life-=dt;if(e.life<=0)this.dirty=true;}
    if(!this.dirty)return;let count=0;for(const e of this.entries)if(e.life>0){this.mesh.setMatrixAt(count,e.matrix);this.mesh.setColorAt(count++,e.color);}
    this.mesh.count=count;if(count){this.mesh.instanceMatrix.clearUpdateRanges();this.mesh.instanceMatrix.addUpdateRange(0,count*16);this.mesh.instanceMatrix.needsUpdate=true;
      this.mesh.instanceColor.clearUpdateRanges();this.mesh.instanceColor.addUpdateRange(0,count*3);this.mesh.instanceColor.needsUpdate=true;}this.dirty=false;
  }
  clear(){for(const e of this.entries)e.life=0;this.mesh.count=0;this.dirty=false;}
  dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.dispose();}
}
