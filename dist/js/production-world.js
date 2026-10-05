// Art-only dressing. Every playable collider and destructible stays owned by Arena.
export function productionWorld(arena,parts){
 const id=arena.info.id,size=arena.info.size,industrial=/INDUSTRIAL|REFINERY|DOCKYARD|RAIL|TROPICAL/.test(arena.info.tag);
 const visual=(p,extra)=>Object.assign(Object.create(p),{blenderPrepared:null,...extra});
 const result=parts.map(p=>{const ground=!!(p.ground||!p.roof&&p.h<.10&&p.y<.30&&p.w>1.5&&p.d>1.5&&p.surface!=='water');return visual(p,{productionGround:ground,...(ground&&(industrial||id===14)&&(p.tile===14||p.surface==='tiles')?{surface:'concrete',tile:0,color:[.94,.96,.94],productionEpoxy:true,rough:.72}:{})});});
 const add=(x,y,z,w,h,d,kind,extra={})=>result.push({x,y,z,w,h,d,surface:'steel',tile:-1,blenderKind:kind,blenderColour:true,...extra});
 // Trusses follow existing roof spans and stay above operator head clearance.
 // The Blacksite hall is deliberately dressed more densely than small cabins.
 for(const roof of arena.blocks.filter(p=>p.roof&&!p.destroyed&&p.h<1&&p.w>5&&p.d>5)){
  if(!industrial&&id!==14&&id!==3&&id!==2)continue;
  const underside=roof.y-roof.h*.5,span=Math.max(4,roof.w-.8),depth=Math.max(4,roof.d-.8);
  if(underside<3.4)continue;
  for(const fraction of [-.30,0,.30])add(roof.x,underside-.48,roof.z+depth*fraction,span,.83,.22,'roof_truss');
  const frame=arena.blocks.filter(p=>!p.roof&&p.h>2&&p.w>3&&p.d<.75&&Math.abs(p.z-roof.z)<depth*.56&&Math.abs(p.x-roof.x)<span*.65);
  for(const wall of frame.slice(0,id===14?8:3)){
   const outward=wall.z>roof.z?1:-1;
   add(wall.x,1.72,wall.z-outward*(wall.d*.5+.07),Math.min(1.9,wall.w*.55),1.12,.16,'switchgear',{yaw:outward>0?0:Math.PI});
  }
 }
 for(const lamp of arena.decor.filter(p=>p.surface==='white'&&p.emissive>.5&&p.y>2.5))
  add(lamp.x,lamp.y+.035,lamp.z,Math.max(.38,lamp.w+.14),.14,Math.max(.48,lamp.d+.14),'light_fixture');
 // Landmarks outside the arena give each skyline believable scale, without
 // placing decorative cover or an invisible obstruction in combat lanes.
 if(industrial){
  for(const [x,z,h]of [[-size-9,-size*.45,24+id%4*3],[size+12,size*.4,18+id%3*4]]){
   add(x,h*.5,z,3.4,h,3.4,'cooling_stack',{landscape:true});
  }
 }
 if(id===14){
  // Existing control hall retains its four entrances and open-window ballistics.
  for(const sign of [-1,1])for(const x of [-10,10])add(x,4.35,sign*10.55,2.35,.72,.23,'vent',{yaw:sign<0?Math.PI:0});
  for(const sign of [-1,1])add(0,4.48,sign*11.245,3.25,.78,.10,'site_sign_14',{yaw:sign<0?Math.PI:0});
 }else{
  const wall=arena.blocks.find(p=>!p.roof&&p.h>3&&p.w>5&&p.d<.65);
  if(wall)add(wall.x,Math.min(wall.y+wall.h*.3,3.7),wall.z+wall.d*.5+.04,Math.min(2.4,wall.w*.7),.57,.07,'site_sign_'+id);
 }
 return result;
}
