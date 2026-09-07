import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponModel,animateWeaponParts,muzzlePosition} from '../dist/js/weapon-models.js';
const kinds=['RIFLE','RIFLE','RIFLE','SMG','SMG','SHOTGUN','SHOTGUN','SNIPER','MARKSMAN','LMG','PISTOL','PISTOL','MELEE'];
const weapon=(id,optic=1,barrel=0,grip=0)=>({def:{id,kind:kinds[id]},optic,barrel,grip,reloadTime:id===5?.52:2.4,reloadLeft:0,sinceShot:10});
test('every arsenal entry builds a distinct mobile-sized view model with finite transforms',()=>{
 const signatures=new Set();
 for(let id=0;id<13;id++)for(const optic of [0,1,2,3]){
  const w=weapon(id,optic),parts=weaponModel(w);assert(parts.length>20&&parts.length<200,`${id}: ${parts.length} parts`);
  for(const q of parts){for(const k of ['x','y','z','w','h','d','yaw','pitch','roll'])assert(Number.isFinite(q[k]),`${id}.${k}`);assert(q.w>0&&q.h>0&&q.d>0);}
  if(optic===1)signatures.add(JSON.stringify(parts.map(q=>[q.x,q.y,q.z,q.w,q.h,q.d])));
 }
 assert.equal(signatures.size,13);
});
test('all attachment combinations animate cached arrays without drifting or replacing parts',()=>{
 for(let id=0;id<13;id++)for(const grip of [0,1,2,4]){
  const w=weapon(id,1,1,grip),parts=weaponModel(w),refs=parts.slice(),base=parts.map(q=>[q.x,q.y,q.z,q.pitch,q.roll]);
  for(let i=0;i<120;i++){w.reloadLeft=w.reloadTime*(1-i/120);w.sinceShot=i/120;assert.equal(animateWeaponParts(parts,w,{},i/60),parts);for(let j=0;j<parts.length;j++){assert.equal(parts[j],refs[j]);assert(Number.isFinite(parts[j].y));}}
  w.reloadLeft=0;w.sinceShot=10;animateWeaponParts(parts,w,{},5);assert.deepEqual(parts.map(q=>[q.x,q.y,q.z,q.pitch,q.roll]),base);
 }
});
test('muzzles follow real barrel tips and suppressors extend the origin',()=>{
 for(let id=0;id<12;id++){const a=muzzlePosition(weapon(id)),s=muzzlePosition(weapon(id,1,1));assert(s.z<a.z-.1);assert.equal(a.x,0);assert(a.z<-.15);assert(a.y>0);}
});
test('reflex and prism optics leave a clear central sight ray',()=>{
 for(let id=0;id<12;id++)for(const optic of [1,2]){
  if(id===7)continue;const p=weaponModel(weapon(id,optic));
  // Conservative test for axis-aligned opaque boxes crossing the optical centre.
  for(const q of p){if(q.mesh!=='bevel'&&q.mesh!=='cube'||q.pitch||q.yaw||q.roll)continue;
   const crossed=Math.abs(q.x)<q.w/2&&Math.abs(q.y-.169)<q.h/2&&q.z<.32;
   assert(!crossed,`weapon ${id} optic ${optic} obstructed by ${JSON.stringify(q)}`);
  }
 }
});
