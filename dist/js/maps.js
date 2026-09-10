import {rng,rayBox,distance,clamp} from './math.js?v=12';
import {dressWorld} from './world-detail.js?v=12';
export const MAPS=[
 {id:0,name:'OLD QUARTER',location:'Coastal city',size:32,weather:'sun',tag:'URBAN',description:'Market alleys, a central plaza and elevated terraces.',sky:[.47,.65,.76],fog:[.59,.66,.65],sun:[-.5,.8,.35]},
 {id:1,name:'FOUNDRY',location:'Industrial district',size:35,weather:'overcast',tag:'INDUSTRIAL',description:'Four loading entrances connect the machinery hall to covered freight lanes.',sky:[.27,.38,.48],fog:[.35,.43,.46],sun:[-.6,.7,-.3]},
 {id:2,name:'DUSTLINE',location:'Arid forward base',size:36,weather:'sun',tag:'DESERT',description:'A fortified compound, firing lanes and a radar outpost.',sky:[.54,.66,.72],fog:[.74,.69,.56],sun:[.4,.85,.3]},
 {id:3,name:'RELAY',location:'Mountain listening station',size:44,weather:'sun',tag:'MIXED',description:'An operations centre, service tunnels and open approaches.',sky:[.36,.54,.68],fog:[.5,.61,.61],sun:[-.5,.8,-.4]},
 {id:4,name:'BREAKWATER',location:'Maritime repair terminal',size:39,weather:'sun',tag:'DOCKYARD',description:'A dry-dock crossing, raised service walks and a cargo warehouse.',sky:[.49,.64,.72],fog:[.58,.67,.69],sun:[-.7,.72,.22]},
 {id:5,name:'CITADEL',location:'Upland communications fortress',size:40,weather:'overcast',tag:'HIGHLANDS',description:'A four-way courtyard, covered approaches and a radar overlook.',sky:[.36,.49,.59],fog:[.47,.56,.58],sun:[.35,.81,-.46]}
];
export const SURFACES={concrete:{color:[.45,.47,.45],rough:.92,metal:0,pattern:1},sand:{color:[.61,.51,.35],rough:1,metal:0,pattern:1},stone:{color:[.68,.61,.48],rough:.94,metal:0,pattern:2},steel:{color:[.22,.3,.31],rough:.55,metal:.7,pattern:3},rust:{color:[.39,.2,.13],rough:.76,metal:.45,pattern:3},wood:{color:[.39,.28,.16],rough:.9,metal:0,pattern:4},dark:{color:[.075,.095,.105],rough:.6,metal:.5,pattern:0},white:{color:[.78,.79,.7],rough:.8,metal:.1,pattern:1},blue:{color:[.12,.29,.37],rough:.52,metal:.6,pattern:3},orange:{color:[.79,.32,.08],rough:.7,metal:.2,pattern:0},glass:{color:[.11,.24,.29],rough:.18,metal:.65,pattern:0},green:{color:[.2,.29,.18],rough:.88,metal:0,pattern:1}};
const surfaceTexture={concrete:0,sand:6,stone:1,steel:8,rust:11,wood:10,dark:8,white:0,blue:8,orange:-1,glass:-1,green:9};
for(const [name,tile]of Object.entries(surfaceTexture))SURFACES[name].tile=tile;
Object.assign(SURFACES,{
 plaster:{color:[.94,.92,.84],rough:.94,metal:0,tile:1},limestone:{color:[.95,.9,.8],rough:.95,metal:0,tile:2},
 asphalt:{color:[.82,.87,.89],rough:.92,metal:0,tile:4},dirt:{color:[.95,.89,.77],rough:1,metal:0,tile:5},gravel:{color:[.9,.9,.85],rough:1,metal:0,tile:7},
 fabric:{color:[.8,.82,.71],rough:.98,metal:0,tile:9},rubber:{color:[.035,.044,.039],rough:.85,metal:0,tile:-1},skin:{color:[.41,.28,.19],rough:.82,metal:0,tile:-1},
 bark:{color:[.47,.38,.28],rough:1,metal:0,tile:15},rock:{color:[.86,.88,.82],rough:1,metal:0,tile:15},grass:{color:[.8,.89,.65],rough:1,metal:0,tile:13},moss:{color:[.8,.9,.67],rough:1,metal:0,tile:12},tiles:{color:[.9,.81,.70],rough:.85,metal:0,tile:14},brass:{color:[.55,.37,.12],rough:.33,metal:.9,tile:-1}
});
export class Arena {
 constructor(id=0){this.info=MAPS[Number.isFinite(id)?clamp(Math.floor(id),0,MAPS.length-1):0];this.blocks=[];this.decor=[];this.cover=[];this.doors=[];this.breakables=[];this.spawns=[];this.objectives=[];this.random=rng(771+this.info.id*511);this.build();dressWorld(this);this.bakeCollision();}
 box(x,y,z,w,h,d,surface='concrete',extra={}){const b={x,y,z,w,h,d,surface,...extra};this.blocks.push(b);this.collisionCells=null;if(h>.7&&h<2.3)this.cover.push({x:x+w/2+1,z,y:0},{x:x-w/2-1,z,y:0},{x,y:0,z:z+d/2+1},{x,y:0,z:z-d/2-1});return b;}
 detail(x,y,z,w,h,d,surface='dark',extra={}){const b={x,y,z,w,h,d,surface,...extra};this.decor.push(b);return b;}
 crate(x,z,stack=1){for(let i=0;i<stack;i++){this.box(x,i*1.18+.59,z,1.25,1.18,1.25,'wood');for(const dx of [-.43,.43])this.detail(x+dx,i*1.18+.6,z,.075,1.2,1.28,'steel');}}
 barrier(x,z,turn=false){this.box(x,.65,z,turn?.8:3.1,1.3,turn?3.1:.8,'concrete');this.detail(x,1.31,z,turn?.8:3.1,.04,turn?3.1:.8,'orange');}
 container(x,z,turn=false,surface='blue'){this.box(x,1.45,z,turn?2.6:6,2.9,turn?6:2.6,surface);for(let i=-2;i<=2;i++)this.detail(x+(turn?0:i),1.48,z+(turn?i:0),turn?2.65:.065,2.78,turn?.065:2.65,'steel');this.detail(x,2.94,z,turn?2.65:6.05,.1,turn?6.05:2.65,'dark');}
 room(x,z,w,d,height=4,surface='stone',roof=true,sideDoors=false){
  for(const xx of [x-w/2,x+w/2]){
   if(sideDoors){for(const sign of [-1,1])this.box(xx,height/2,z+sign*(d/4+.8),.4,height,d/2-1.6,surface);this.box(xx,height-.5,z,.4,1,3.2,surface);}
   else this.box(xx,height/2,z,.4,height,d,surface);
  }
  for(const zz of [z-d/2,z+d/2]){this.box(x-w/4-.65,height/2,zz,w/2-1.3,height,.4,surface);this.box(x+w/4+.65,height/2,zz,w/2-1.3,height,.4,surface);this.box(x,height-.5,zz,2.6,1,.4,surface);}
  if(roof)this.box(x,height+.15,z,w+.6,.3,d+.6,surface,{roof:true});
  this.detail(x,.015,z,w-.4,.03,d-.4,'concrete');
  for(const xx of [x-w/2+.22,x+w/2-.22]){if(sideDoors)continue;this.detail(xx,2.25,z,.06,1.4,2,'glass');this.detail(xx,2.25,z,.07,.06,2.1,'dark');}
  this.detail(x,height-.25,z,.7,.08,1.5,'white',{emissive:.9});
 }
 stairs(x,z,width=2.6,height=2.4,dir=1){for(let i=0;i<8;i++){const h=height*(i+1)/8;this.box(x,h/2,z+dir*i*.48,width,h,.49,'concrete',{stair:true});}}
 building(x,z,w,d,h=7,surface='stone'){this.box(x,h/2,z,w,h,d,surface);this.detail(x,h+.15,z,w+.45,.3,d+.45,'white');for(let y=2;y<h-.5;y+=2.2)for(let xx=x-w/2+1.2;xx<x+w/2-.6;xx+=2){for(const zz of [z-d/2-.015,z+d/2+.015]){this.detail(xx,y,zz,.8,1.1,.06,'glass');this.detail(xx,y-.62,zz,1,.1,.14,'white');}}this.detail(x+.5,h+.55,z,1.5,.8,1.2,'steel');}
 build(){
  const id=this.info.id,s=this.info.size;
  this.box(0,-.2,0,s*2,.4,s*2,id===2?'sand':id===0?'dirt':id===3||id===5?'grass':id===4?'asphalt':'concrete',{ground:true});
  for(const sign of [-1,1]){this.box(sign*s,id===4&&sign===1?.65:1.4,0,.8,id===4&&sign===1?1.3:2.8,s*2,id===4?'concrete':'plaster');this.box(0,1.4,sign*s,s*2,2.8,.8,'plaster');}
  this.spawns=[{x:-s+5,y:0,z:-s+5,team:0},{x:-s+9,y:0,z:-s+5,team:0},{x:-s+5,y:0,z:-s+9,team:0},{x:-s+10,y:0,z:-s+10,team:0},{x:s-5,y:0,z:s-5,team:1},{x:s-9,y:0,z:s-5,team:1},{x:s-5,y:0,z:s-9,team:1},{x:s-10,y:0,z:s-10,team:1},{x:-s+5,y:0,z:s-5,team:0},{x:s-5,y:0,z:-s+5,team:1}];
  this.objectives=[{name:'A',x:-s*.5,y:0,z:s*.28},{name:'B',x:0,y:0,z:0},{name:'C',x:s*.5,y:0,z:-s*.28}];
  if(id===0){
   for(const [x,z,w,d,h] of [[-16,-12,9,9,9],[15,13,10,9,8],[-14,15,8,8,7],[16,-15,9,7,9],[-29,5,5,13,11],[28,-2,5,13,10]])this.building(x,z,w,d,h);
   this.room(-4,-19,8,7,3.2,'stone');this.room(5,20,8,7,3.2,'stone');
   this.box(-4,2.25,6,6,.35,6,'stone');this.stairs(-4,0,2.8,2.4,1);
   this.detail(-4,2.95,8.95,6,.9,.12,'steel');
   this.box(0,.4,0,4,.8,4,'stone');this.detail(0,1.3,0,.8,1.8,.8,'white',{mesh:'cylinder'});
   for(const [x,z] of [[-9,-2],[8,4],[5,-11],[-8,23],[22,5]])this.barrier(x,z);
   for(const [x,z] of [[-20,6],[11,-4],[-7,-7],[8,13]])this.crate(x,z,2);
   for(const z of [-7,8]){this.detail(-23,2.7,z,4,.08,2.8,'green');for(const x of [-24.8,-21.2])this.detail(x,1.35,z,.09,2.7,.09,'wood');}
  }else if(id===1){
   this.room(0,0,26,23,6,'steel',true,true);
   for(const x of [-8,7])for(const z of [-6,5]){this.box(x,1.3,z,3,2.6,4,'dark');this.detail(x,2.75,z,2.7,.3,3.6,'rust');this.detail(x-1.53,1.6,z,.08,.8,1,'orange');}
   for(const x of [-12,12])for(const z of [-10,0,10])this.detail(x,3,z,.28,6,.28,'orange');
   this.container(-24,-6,true);this.container(24,6,true,'rust');this.container(-20,16);this.container(20,-17,false,'rust');
   this.stairs(-20,0,2.5,2.9,1);this.box(-20,2.75,7,7,.3,5,'steel');
   for(const [x,z] of [[-5,-20],[7,20],[21,-5],[-23,8]])this.barrier(x,z);
   for(const [x,z] of [[-5,-6],[5,5],[-22,-17],[22,18]])this.crate(x,z,2);
   this.objectives=[{name:'A',x:-23,y:0,z:4},{name:'B',x:0,y:0,z:0},{name:'C',x:23,y:0,z:-4}];
  }else if(id===2){
   this.room(-17,-11,12,11,3.5,'stone');this.room(16,12,12,11,3.5,'stone');this.room(17,-14,9,10,3.2,'stone');this.room(-17,15,9,10,3.2,'stone');
   for(const [x,z,t] of [[-5,-9,false],[5,9,false],[-6,15,true],[6,-16,true],[-24,4,false],[25,-3,false]])this.barrier(x,z,t);
   this.container(0,-24,false,'green');this.container(0,25,false,'rust');
   this.box(0,.65,0,2.8,1.3,2.8,'sand');this.detail(0,3.2,0,.18,5,.18,'steel');this.detail(0,5.6,0,3,.12,1.8,'white',{pitch:.45});
   for(const [x,z] of [[-9,-3],[11,3],[-28,19],[28,-18]])this.crate(x,z,2);
   this.stairs(17,-22,2.8,3.6,1);
  }else if(id===3){
   this.room(0,0,17,23,4.4,'concrete',true,true);this.room(-23,-16,12,9,3.4,'steel');this.room(23,16,12,9,3.4,'steel');
   this.room(-24,15,10,14,3.8,'stone');this.room(24,-16,10,14,3.8,'stone');
   for(const [x,z] of [[-14,-2],[15,3],[-6,-23],[6,23],[-32,-2],[32,0]])this.barrier(x,z);
   this.container(-5,31,false,'green');this.container(4,-31);
   this.stairs(0,-16,2.8,2.4,1);this.box(0,2.25,-6,7,.3,6,'steel');
   for(const x of [-5,5])for(const z of [-5,5]){this.box(x,1.1,z,1.2,2.2,2.7,'dark');this.detail(x,1.5,z-1.37,.7,.8,.05,'glass');}
   for(const [x,z] of [[-16,25],[15,-25],[-32,27],[33,-28]])this.crate(x,z,2);
   this.objectives=[{name:'A',x:-24,y:0,z:0},{name:'B',x:0,y:0,z:3},{name:'C',x:24,y:0,z:0}];
  }
  // Shallow access stairs keep each navigation-grid transition below the step limit.
  if(id===4)this.buildBreakwater();
  if(id===5)this.buildCitadel();
  this.improveFlow();
  // Set dressing stays separate from collision; small breakables have their own hit state.
  for(let i=0;i<26;i++){let x=(this.random()-.5)*(s*2-5),z=(this.random()-.5)*(s*2-5);if(this.collides({x,y:0,z},.6,1.9))continue;this.detail(x,.012,z,.06+this.random()*.22,.025,.1+this.random()*.15,'dark',{yaw:this.random()*6.28});}
  
  for(const [x,z] of [[-10,10],[10,-10],[-21,-22],[21,22]])if(!this.collides({x,y:0,z},.6,1.9)){const b=this.box(x,.65,z,.8,1.3,.8,'rust',{mesh:'cylinder',breakable:true,hp:45});this.breakables.push(b);}
 }
 improveFlow(){
  // Staggered perimeter screens break the boundary-to-boundary camping lanes.
  // Each screen is freestanding, with room to leave around either end.
  const s=this.info.size,e=s-9,offset=s*.28,material=this.info.id===2?'stone':this.info.id===5?'limestone':'concrete';
  const screens=[];
  for(const sign of [-1,1])for(const side of [-1,1]){
   screens.push({x:sign*e,z:side*offset,w:.7,d:4.2});
   screens.push({x:side*offset,z:sign*e,w:4.2,d:.7});
  }
  for(const p of screens){
   if(this.blocks.some(b=>!b.ground&&Math.abs(p.x-b.x)<(p.w+b.w)/2+2&&Math.abs(p.z-b.z)<(p.d+b.d)/2+2))continue;
   if(this.objectives.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<6)||this.spawns.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<3))continue;
   this.box(p.x,.99,p.z,p.w,1.98,p.d,material,{spawnScreen:true});
   this.detail(p.x,2,p.z,p.w+.08,.055,p.d+.08,'dark');
   const dx=p.w>p.d?1.25:0,dz=p.d>p.w?1.25:0;
   for(const sign of [-1,1])this.detail(p.x+dx*sign,.12,p.z+dz*sign,p.w>p.d?.3:1.1,.24,p.d>p.w?.3:1.1,'dark');
  }
 }
 accessSteps(x,edge,width,height,dir=1){
  // Landings align with the baked 1.25 m navigation cells; short dense treads can
  // otherwise leave the bot's collision radius straddling two different heights.
  const run=1.25,origin=-this.info.size+run/2,count=Math.ceil(height/.3),rise=height/count;
  const last=origin+(dir>0?Math.floor((edge-.36-origin)/run):Math.ceil((edge+.36-origin)/run))*run;
  for(let i=0;i<count;i++){
   const h=(i+1)*rise,centre=last-dir*(count-1-i)*run;
   const start=centre-dir*.635,end=i===count-1?edge+dir*.05:centre+dir*.635;
   this.box(x,h/2,(start+end)/2,width,h,Math.abs(end-start),'concrete',{stair:true});
  }
 }
 buildBreakwater(){
  // Three routes: the west cargo hall, the central slip and the east container lanes.
  this.room(-21,-7,14,18,5.3,'steel');
  this.room(23,20,10,10,3.5,'concrete');
  for(const [x,z,turn,material] of [[-23,21,false,'blue'],[-20,-25,false,'rust'],[23,-7,true,'blue'],[29,5,true,'rust'],[16,-24,false,'green'],[12,25,true,'blue']])this.container(x,z,turn,material);
  for(const x of [-7,7]){
   this.box(x,.54,0,3.4,1.08,20,'concrete',{dock:true});
   this.accessSteps(x,-10,3.2,1.08,1);this.accessSteps(x,10,3.2,1.08,-1);
   this.detail(x,1.09,0,3.24,.035,19.8,'steel',{color:[.61,.66,.65]});
   for(const z of [-7.5,-2.5,2.5,7.5])this.detail(x,1.13,z,3.18,.055,.12,'orange');
  }
  // A travelling gantry frames the central combat space without closing the floor.
  for(const x of [-10.3,10.3])for(const z of [-11.5,11.5]){
   this.box(x,3.8,z,.55,7.6,.55,'rust');
   this.detail(x,7.6,z,1,.4,1,'dark');
  }
  for(const z of [-11.5,11.5])this.detail(0,7.8,z,22,.65,.65,'orange');
  for(const x of [-10.3,10.3])this.detail(x,7.55,0,.42,.4,24,'steel');
  this.detail(1.5,7.05,-11.5,2,1,.95,'steel');
  this.detail(1.5,5.5,-11.5,.05,2.1,.05,'dark',{mesh:'cylinder'});
  this.detail(1.5,4.4,-11.5,.35,.3,.35,'dark',{mesh:'tube'});
  // Low keel supports alternate sides so the slip offers usable cover and crossfire.
  for(const [x,z]of [[-1.7,-6],[1.7,6]])this.box(x,.58,z,2.3,1.16,2.1,'wood');
  for(const [x,z,t]of [[-30,-21,false],[-29,11,true],[30,-21,false],[20,8,false],[-12,27,false],[-13,-17,true],[27,30,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-25,-11],[-17,-3],[-31,2],[18,16],[28,-16],[-12,19]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-21,y:0,z:7},{name:'B',x:0,y:0,z:0},{name:'C',x:22,y:0,z:-16}];
 }
 buildCitadel(){
  // Four open arches connect the courtyard to independent covered approach routes.
  for(const sign of [-1,1])for(const offset of [-6.5,6.5]){
   this.box(offset,1.9,sign*10,7,3.8,.55,'limestone');
   this.box(sign*10,1.9,offset,.55,3.8,7,'limestone');
  }
  for(const sign of [-1,1]){
   this.box(0,3.45,sign*10,6,.7,.65,'limestone');
   this.box(sign*10,3.45,0,.65,.7,6,'limestone');
   this.box(sign*8.6,4.0,0,3.4,.3,20.6,'concrete',{roof:true});
   this.box(0,4.0,sign*8.6,14,.3,3.4,'concrete',{roof:true});
  }
  this.room(0,-21,12,10,3.2,'concrete');
  this.room(-22,19,11,12,3.7,'stone');this.room(23,19,12,12,3.9,'concrete');
  this.building(-23,-21,10,11,7.4,'limestone');
  this.box(24,.54,-16,8,1.08,10,'concrete',{overlook:true});
  this.accessSteps(24,-11,3.1,1.08,-1);
  // Equipment is offset on the overlook; its southern edge remains a firing position.
  this.box(26,1.77,-18,2.2,1.38,2.6,'dark');
  this.detail(26,4.1,-18,.28,3.3,.28,'steel',{mesh:'cylinder'});
  this.detail(26,5.6,-18,4.2,.34,3.6,'white',{mesh:'sphere',pitch:.65});
  this.detail(26,5.9,-17.2,.055,1.6,.055,'steel',{pitch:.65});
  for(const [x,z,w,d]of [[-4,-4,2.5,2.4],[4,4,2.5,2.4],[-23,1,3.1,1.3],[23,2,1.3,3.1]])this.box(x,.63,z,w,1.26,d,'limestone');
  for(const [x,z,t]of [[-31,-8,true],[-16,-30,false],[14,-31,false],[32,3,true],[-13,28,false],[12,29,false],[-30,29,false],[30,-27,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-25,17],[20,22],[-16,3],[16,-3],[-2,-23]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-20,y:0,z:0},{name:'B',x:0,y:0,z:0},{name:'C',x:20,y:0,z:0}];
 }
 bakeCollision(){
  // Expand by the largest gameplay capsule. Point queries then touch one bucket.
  this.collisionBlocks=this.blocks;this.collisionCount=this.blocks.length;
  const n=Math.ceil(this.info.size*2/4)+2;this.collisionSize=n;
  this.collisionCells=Array.from({length:n*n},()=>[]);
  for(const b of this.blocks){if(b.ground)continue;
   const x0=Math.max(0,Math.floor((b.x-b.w/2-1+this.info.size)/4)),x1=Math.min(n-1,Math.floor((b.x+b.w/2+1+this.info.size)/4));
   const z0=Math.max(0,Math.floor((b.z-b.d/2-1+this.info.size)/4)),z1=Math.min(n-1,Math.floor((b.z+b.d/2+1+this.info.size)/4));
   for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)this.collisionCells[z*n+x].push(b);
  }
 }
 nearby(p,r=.32){
  if(!this.collisionCells||this.collisionBlocks!==this.blocks||this.collisionCount!==this.blocks.length||r>1)return this.blocks;
  const x=Math.floor((p.x+this.info.size)/4),z=Math.floor((p.z+this.info.size)/4),n=this.collisionSize;
  return x>=0&&z>=0&&x<n&&z<n?this.collisionCells[z*n+x]:this.blocks;
 }
 collides(p,r=.32,h=1.75){for(const b of this.nearby(p,r)){if(b.ground||b.destroyed)continue;if(Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.z-b.z)<b.d/2+r&&p.y+h>b.y-b.h/2+.03&&p.y<b.y+b.h/2-.03)return true;}return false;}
 floorAt(p,maxY=p.y+.34){let floor=0;for(const b of this.nearby(p)){if(b.destroyed)continue;const top=b.y+b.h/2;if(top<=maxY+.001&&top>floor&&Math.abs(p.x-b.x)<b.w/2+.32&&Math.abs(p.z-b.z)<b.d/2+.32)floor=top;}return floor;}
 trace(o,d,limit=160){let t=limit,block=null;for(const b of this.blocks){if(b.destroyed)continue;let n=rayBox(o,d,b,t);if(n!==null&&n<t){t=n;block=b;}}return{t,block};}
 visible(a,b){const len=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(len<.01)return true;return this.trace(a,{x:(b.x-a.x)/len,y:(b.y-a.y)/len,z:(b.z-a.z)/len},len).t>=len-.12;}
 indoors(p){return this.blocks.some(b=>b.roof&&Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2&&p.y<b.y);}
}
