import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.min.js';
import {fixture} from '../tests/renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json'));
const decoded=await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength));
const assets=new BlenderAssets(parseBlenderGLB(decoded),manifest),results=[];
const source=JSON.parse(await readFile('authoring/blender/source/manifest.json'));
for(let id=0;id<30;id++){
 const r=fixture(),g=new Game({map:14,mode:'tdm'},{seed:817});r.blenderAssets=assets;g.time=2;g.player.weapons[0]=new Weapon(id,{optic:1});g.player.slot=0;
 r.prepareWeapon(g,1280/600,true);r.weaponScene.updateMatrixWorld(true);
 const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity},local=new THREE.Matrix4(),combined=new THREE.Matrix4(),p=new THREE.Vector3();
 for(const b of r.weaponBatches.values())if(b.used){const mesh=b.mesh,position=mesh.geometry.getAttribute('position');
  for(let i=0;i<b.used;i++){mesh.getMatrixAt(i,local);combined.multiplyMatrices(mesh.matrixWorld,local);
   for(let v=0;v<position.count;v++){p.fromBufferAttribute(position,v).applyMatrix4(combined).project(r.weaponCamera);const x=(p.x+1)*640,y=(1-p.y)*300;
    bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);
   }
  }
 }
 results.push({id,name:g.player.weapon.def.name,bounds:Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,+v.toFixed(2)])),clipped:bounds.left<0||bounds.right>1280||bounds.top<0||bounds.bottom>600});
}
await writeFile(process.argv[2]??'docs/validation-release60-menu-framing.json',JSON.stringify({actual_iphone_data:false,scope:'Actual shipped native mesh vertex projection in menu-only pose; 1280x600 landscape, reflex default optic. No GPU frames.',library:{meshes:assets.geometries.size,decodedSha256:createHash('sha256').update(new Uint8Array(decoded)).digest('hex'),sourceSha256:source.sha256},results},null,2)+'\n');if(results.some(r=>r.clipped))throw Error('Menu weapon clipped');console.log(JSON.stringify({weapons:results.length,clipped:results.filter(r=>r.clipped).length}));
