// Export the existing visual rig, never gameplay or collision, for Blender.
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {WEAPONS,Weapon} from '../dist/js/weapons.js';
import {weaponModel} from '../dist/js/weapon-models.js';
import {compose} from '../dist/js/math.js';
import {MAPS,Arena} from '../dist/js/maps.js';
import {material} from '../dist/js/geometry.js';
import {blenderWorld} from '../dist/js/blender-world.js';
import {blenderKind} from '../dist/js/blender-kind.js';
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
const maps=MAPS.map(info=>{const arena=new Arena(info.id);return {...info,parts:blenderWorld(arena).filter(p=>!p.invisible&&!p.destroyed).map(p=>{const matrix=new Float32Array(16);compose(matrix,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0);const kind=p.mesh==='ridge'?`ridge_${info.ridgeTemplate??info.id}`:blenderKind(p,'world');return {kind,matrix:Array.from(matrix),material:material(p),authoredColour:!!p.blenderColour,surface:p.surface,leaf:p.leaf,breakable:!!p.breakable};})};});
await writeFile(out,JSON.stringify({schema:1,units:'metres',forward:'-Z',up:'Y',maps,weapons})+'\n');
console.log(`Exported ${weapons.length} unchanged weapon rigs for Blender.`);
