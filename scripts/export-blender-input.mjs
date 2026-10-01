// Export the existing visual rig, never gameplay or collision, for Blender.
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {WEAPONS,Weapon} from '../dist/js/weapons.js';
import {weaponModel} from '../dist/js/weapon-models.js';
import {compose} from '../dist/js/math.js';
import {MAPS} from '../dist/js/maps.js';
const out=resolve(process.argv[2]??'authoring/blender/rig-input.json');
const weapons=WEAPONS.map(def=>{
 const w=new Weapon(def.id,{optic:0,barrel:0,grip:0}),p=weaponModel(w);
 const extract=(q,index)=>{const matrix=new Float32Array(16);compose(matrix,q.x,q.y,q.z,q.w,q.h,q.d,q.yaw??0,q.pitch??0,q.roll??0);return {...q,index,matrix:Array.from(matrix)};};
 const hands=p.slice(p.coreCount).filter(q=>/^(rightHand|supportHand|pumpHand)$/.test(q.tag??''));
 return {id:def.id,name:def.name,kind:def.kind,coreCount:p.coreCount,parts:p.slice(0,p.coreCount).map((q,index)=>{
  const matrix=new Float32Array(16);compose(matrix,q.x,q.y,q.z,q.w,q.h,q.d,q.yaw??0,q.pitch??0,q.roll??0);
  return {...q,index,matrix:Array.from(matrix)};
 }),hands:hands.map(extract)};
});
await mkdir(resolve(out,'..'),{recursive:true});
await writeFile(out,JSON.stringify({schema:1,units:'metres',forward:'-Z',up:'Y',maps:MAPS.map(({id,size,name})=>({id,size,name})),weapons})+'\n');
console.log(`Exported ${weapons.length} unchanged weapon rigs for Blender.`);
