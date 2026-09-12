// Turn only thin, ground-level decorative finishes into receiving planes.
// Physics keeps the original blocks. Important raised paths and steps stay 3D.
export function prepareGroundSurfaces(arena){
 for(const p of arena.decor){
  if(p.mesh||p.pitch||p.roll||p.y<0||p.y>.08||p.h>.06||p.w<.04||p.d<.04)continue;
  if(!['asphalt','concrete','dirt','white','limestone','steel','wood'].includes(p.surface))continue;
  p.y+=p.h*.5;p.mesh='surface';p.surfaceLayer=p.y<.023?1:p.y<.04?2:3;
 }
}
