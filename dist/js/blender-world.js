// Render-only assembly of the Blender kit. The simulation's arena objects,
// collision, objectives and navigation stay authoritative.
export function blenderWorld(arena){
 const visual=(p,options)=>Object.assign(Object.create(p),{blenderPrepared:null,...options});
 const buildings=arena.blocks.filter(p=>!p.ground&&!p.roof&&p.h>5&&p.w>4&&p.d>4);
 const nearBuilding=p=>buildings.some(b=>Math.abs(p.x-b.x)<b.w*.55&&Math.abs(p.z-b.z)<b.d*.55&&p.y<b.y+b.h*.5+.08);
 const palmTops=arena.decor.filter(p=>p.surface==='bark'&&p.mesh==='sphere'&&p.w>.7&&p.y>4);
 const broadTrunks=arena.decor.filter(p=>p.surface==='bark'&&p.mesh==='cylinder'&&p.h>2&&p.h<6&&p.w===.3);
 const parts=[];
 for(const p of arena.blocks){
  if(p.invisible||p.destroyed)continue;
  if(p.surface==='dark'&&p.w>1&&p.d>1&&p.h>.8&&p.h<3.1){parts.push(visual(p,{blenderKind:'generator',blenderColour:true,tile:-1}));continue;}
  parts.push(p);
 }
 for(const p of arena.decor){
  // The native facade includes glazing, reveals, bands and foundations. Avoid
  // submitting the old window/trim components over the same baked geometry.
  if(nearBuilding(p)&&(['glass','blue','wood'].includes(p.surface)||p.w<.12||p.h<.21))continue;
  if(p.surface==='steel'&&p.w>1&&p.d>.7&&p.h>.4&&p.h<1.1&&p.y>3){parts.push(visual(p,{blenderKind:'hvac',blenderColour:true,tile:-1}));continue;}
  if(p.mesh==='conifer'){parts.push(visual(p,{blenderWind:true,tile:-1}));continue;}
  parts.push(p);
 }
 for(const p of arena.foliage??[]){
  if(palmTops.some(t=>p.leaf===1&&p.h>2&&Math.hypot(p.x-t.x,p.z-t.z)<2))continue;
  if(broadTrunks.some(t=>p.leaf===0&&p.h>2&&Math.hypot(p.x-t.x,p.z-t.z)<1.8))continue;
  parts.push(p);
 }
 for(const p of palmTops)parts.push({x:p.x,y:p.y-.46,z:p.z,w:6,h:2,d:6,surface:'green',tile:-1,blenderKind:'palm_crown',blenderWind:true,color:[1,1,1],landscape:p.y>8});
 for(const p of broadTrunks)parts.push({x:p.x,y:p.y+p.h*.72,z:p.z,w:p.h*1.7,h:p.h*1.1,d:p.h*1.7,surface:'green',tile:-1,blenderKind:'tree_crown',blenderWind:true,color:[1,1,1],landscape:p.y>4});
 // These objects dress the inaccessible perimeter, so their visual silhouettes
 // never introduce invisible combat cover or obstruct a playable lane.
 const s=arena.info.size,id=arena.info.id;
 if(id!==6&&id!==8){
  for(const sign of [-1,1]){
   parts.push({x:sign*(s+3.9),y:.9,z:sign*s*.35,w:2.1,h:1.8,d:4.7,yaw:sign*.28,surface:'dark',tile:-1,blenderKind:'utility_van',blenderColour:true});
   parts.push({x:sign*(s+2),y:.1,z:sign*s*.35-3.4,w:1.2,h:.2,d:1.2,surface:'wood',tile:-1,blenderKind:'pallet',blenderColour:true});
  }
 }
 return parts;
}
