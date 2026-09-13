// Turn only thin, ground-level decorative finishes into receiving planes.
// Physics keeps the original blocks. Important raised paths and steps stay 3D.
export function prepareGroundSurfaces(arena){
 for(const p of arena.decor){
  if(p.mesh||p.pitch||p.roll||p.y<0||p.y>.08||p.h>.06||p.w<.04||p.d<.04)continue;
  // Rail heads, sleepers and metal fittings need their shallow 3D silhouette.
  if(!['asphalt','concrete','dirt','white','limestone'].includes(p.surface))continue;
  p.y+=p.h*.5;p.mesh='surface';p.surfaceLayer=p.y<.023?1:p.y<.04?2:3;
 }
 // Cache the handful of thin horizontal finishes in spatial buckets. Contact
 // shadows and ground impacts follow the visible finish without changing physics.
 arena.visualFloorCells=new Map();
 for(const p of arena.decor){
  if(p.surface==='water'||p.pitch||p.roll||p.h>.08||p.w<.04||p.d<.04||(p.mesh&&p.mesh!=='surface'))continue;
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),w=(Math.abs(c)*p.w+Math.abs(s)*p.d)/2,d=(Math.abs(s)*p.w+Math.abs(c)*p.d)/2;
  const floor={part:p,c,s,top:p.mesh==='surface'?p.y:p.y+p.h/2};
  for(let x=Math.floor((p.x-w)/8);x<=Math.floor((p.x+w)/8);x++)for(let z=Math.floor((p.z-d)/8);z<=Math.floor((p.z+d)/8);z++){
   const key=`${x}/${z}`;if(!arena.visualFloorCells.has(key))arena.visualFloorCells.set(key,[]);arena.visualFloorCells.get(key).push(floor);
  }
 }
}

export function visualGroundHeight(arena,x,z,base=0){
 let height=base;
 for(const f of arena?.visualFloorCells?.get(`${Math.floor(x/8)}/${Math.floor(z/8)}`)??[]){
  if(f.part.destroyed||f.top<=height||f.top>base+.12)continue;
  const dx=x-f.part.x,dz=z-f.part.z;
  if(Math.abs(f.c*dx-f.s*dz)<=f.part.w/2&&Math.abs(f.s*dx+f.c*dz)<=f.part.d/2)height=f.top;
 }
 return height;
}
