import {rng,rayBox,distance,clamp} from './math.js';
export const MAPS=[
 {id:0,name:'OLD QUARTER',location:'Coastal city',size:32,weather:'sun',tag:'URBAN',description:'Market alleys, a central plaza and elevated terraces.',sky:[.47,.65,.76],fog:[.59,.66,.65],sun:[-.5,.8,.35]},
 {id:1,name:'FOUNDRY',location:'Industrial district',size:35,weather:'overcast',tag:'INDUSTRIAL',description:'Loading bays, machinery and a warehouse with two entrances.',sky:[.27,.38,.48],fog:[.35,.43,.46],sun:[-.6,.7,-.3]},
 {id:2,name:'DUSTLINE',location:'Arid forward base',size:36,weather:'sun',tag:'DESERT',description:'A fortified compound, firing lanes and a radar outpost.',sky:[.54,.66,.72],fog:[.74,.69,.56],sun:[.4,.85,.3]},
 {id:3,name:'RELAY',location:'Mountain listening station',size:44,weather:'sun',tag:'MIXED',description:'An operations centre, service tunnels and open approaches.',sky:[.36,.54,.68],fog:[.5,.61,.61],sun:[-.5,.8,-.4]}
];
export const SURFACES={concrete:{color:[.45,.47,.45],rough:.92,metal:0,pattern:1},sand:{color:[.61,.51,.35],rough:1,metal:0,pattern:1},stone:{color:[.68,.61,.48],rough:.94,metal:0,pattern:2},steel:{color:[.22,.3,.31],rough:.55,metal:.7,pattern:3},rust:{color:[.39,.2,.13],rough:.76,metal:.45,pattern:3},wood:{color:[.39,.28,.16],rough:.9,metal:0,pattern:4},dark:{color:[.075,.095,.105],rough:.6,metal:.5,pattern:0},white:{color:[.78,.79,.7],rough:.8,metal:.1,pattern:1},blue:{color:[.12,.29,.37],rough:.52,metal:.6,pattern:3},orange:{color:[.79,.32,.08],rough:.7,metal:.2,pattern:0},glass:{color:[.11,.24,.29],rough:.18,metal:.65,pattern:0},green:{color:[.2,.29,.18],rough:.88,metal:0,pattern:1}};
export class Arena {
 constructor(id=0){this.info=MAPS[clamp(id,0,3)];this.blocks=[];this.decor=[];this.cover=[];this.doors=[];this.breakables=[];this.spawns=[];this.objectives=[];this.random=rng(771+id*511);this.build();}
 box(x,y,z,w,h,d,surface='concrete',extra={}){const b={x,y,z,w,h,d,surface,...extra};this.blocks.push(b);if(h>.7&&h<2.3)this.cover.push({x:x+w/2+1,z,y:0},{x:x-w/2-1,z,y:0},{x,y:0,z:z+d/2+1},{x,y:0,z:z-d/2-1});return b;}
 detail(x,y,z,w,h,d,surface='dark',extra={}){const b={x,y,z,w,h,d,surface,...extra};this.decor.push(b);return b;}
 crate(x,z,stack=1){for(let i=0;i<stack;i++){this.box(x,i*1.18+.59,z,1.25,1.18,1.25,'wood');for(const dx of [-.43,.43])this.detail(x+dx,i*1.18+.6,z,.075,1.2,1.28,'steel');}}
 barrier(x,z,turn=false){this.box(x,.65,z,turn?.8:3.1,1.3,turn?3.1:.8,'concrete');this.detail(x,1.31,z,turn?.8:3.1,.04,turn?3.1:.8,'orange');}
 container(x,z,turn=false,surface='blue'){this.box(x,1.45,z,turn?2.6:6,2.9,turn?6:2.6,surface);for(let i=-2;i<=2;i++)this.detail(x+(turn?0:i),1.48,z+(turn?i:0),turn?2.65:.065,2.78,turn?.065:2.65,'steel');this.detail(x,2.94,z,turn?2.65:6.05,.1,turn?6.05:2.65,'dark');}
 room(x,z,w,d,height=4,surface='stone',roof=true){
  this.box(x-w/2,height/2,z,.4,height,d,surface);this.box(x+w/2,height/2,z,.4,height,d,surface);
  for(const zz of [z-d/2,z+d/2]){this.box(x-w/4-.65,height/2,zz,w/2-1.3,height,.4,surface);this.box(x+w/4+.65,height/2,zz,w/2-1.3,height,.4,surface);this.box(x,height-.5,zz,2.6,1,.4,surface);}
  if(roof)this.box(x,height+.15,z,w+.6,.3,d+.6,surface,{roof:true});
  this.detail(x,.015,z,w-.4,.03,d-.4,'concrete');
  for(const xx of [x-w/2+.22,x+w/2-.22]){this.detail(xx,2.25,z,.06,1.4,2,'glass');this.detail(xx,2.25,z,.07,.06,2.1,'dark');}
  this.detail(x,height-.25,z,.7,.08,1.5,'white',{emissive:.9});
 }
 stairs(x,z,width=2.6,height=2.4,dir=1){for(let i=0;i<8;i++){const h=height*(i+1)/8;this.box(x,h/2,z+dir*i*.48,width,h,.49,'concrete',{stair:true});}}
 building(x,z,w,d,h=7,surface='stone'){this.box(x,h/2,z,w,h,d,surface);this.detail(x,h+.15,z,w+.45,.3,d+.45,'white');for(let y=2;y<h-.5;y+=2.2)for(let xx=x-w/2+1.2;xx<x+w/2-.6;xx+=2){for(const zz of [z-d/2-.015,z+d/2+.015]){this.detail(xx,y,zz,.8,1.1,.06,'glass');this.detail(xx,y-.62,zz,1,.1,.14,'white');}}this.detail(x+.5,h+.55,z,1.5,.8,1.2,'steel');}
 build(){
  const id=this.info.id,s=this.info.size;
  this.box(0,-.2,0,s*2,.4,s*2,id===2?'sand':id===0?'stone':'concrete',{ground:true});
  for(const sign of [-1,1]){this.box(sign*s,2.5,0,.8,5,s*2,'concrete');this.box(0,2.5,sign*s,s*2,5,.8,'concrete');}
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
   this.room(0,0,26,23,6,'steel');
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
  }else{
   this.room(0,0,17,23,4.4,'concrete');this.room(-23,-16,12,9,3.4,'steel');this.room(23,16,12,9,3.4,'steel');
   this.room(-24,15,10,14,3.8,'stone');this.room(24,-16,10,14,3.8,'stone');
   for(const [x,z] of [[-14,-2],[15,3],[-6,-23],[6,23],[-32,-2],[32,0]])this.barrier(x,z);
   this.container(-5,31,false,'green');this.container(4,-31);
   this.stairs(0,-16,2.8,2.4,1);this.box(0,2.25,-6,7,.3,6,'steel');
   for(const x of [-5,5])for(const z of [-5,5]){this.box(x,1.1,z,1.2,2.2,2.7,'dark');this.detail(x,1.5,z-1.37,.7,.8,.05,'glass');}
   for(const [x,z] of [[-16,25],[15,-25],[-32,27],[33,-28]])this.crate(x,z,2);
   this.objectives=[{name:'A',x:-24,y:0,z:0},{name:'B',x:0,y:0,z:3},{name:'C',x:24,y:0,z:0}];
  }
  // Set dressing stays separate from collision; small breakables have their own hit state.
  for(let i=0;i<26;i++){let x=(this.random()-.5)*(s*2-5),z=(this.random()-.5)*(s*2-5);if(this.collides({x,y:0,z},.6,1.9))continue;this.detail(x,.012,z,.06+this.random()*.22,.025,.1+this.random()*.15,'dark',{yaw:this.random()*6.28});}
  for(const sign of [-1,1])for(let i=0;i<6;i++){const x=sign*(s+8),z=-s+i*s*.4;this.detail(x,4+this.random()*4,z,5+this.random()*7,8+this.random()*8,7,id===2?'sand':'concrete');}
  for(const [x,z] of [[-10,10],[10,-10],[-21,-22],[21,22]])if(!this.collides({x,y:0,z},.6,1.9)){const b=this.box(x,.65,z,.8,1.3,.8,'rust',{mesh:'cylinder',breakable:true,hp:45});this.breakables.push(b);}
 }
 collides(p,r=.32,h=1.75){for(const b of this.blocks){if(b.ground||b.destroyed)continue;if(Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.z-b.z)<b.d/2+r&&p.y+h>b.y-b.h/2+.03&&p.y<b.y+b.h/2-.03)return true;}return false;}
 floorAt(p,maxY=p.y+.34){let floor=0;for(const b of this.blocks){if(b.destroyed)continue;const top=b.y+b.h/2;if(top<=maxY+.001&&top>floor&&Math.abs(p.x-b.x)<b.w/2+.32&&Math.abs(p.z-b.z)<b.d/2+.32)floor=top;}return floor;}
 trace(o,d,limit=160){let t=limit,block=null;for(const b of this.blocks){if(b.destroyed)continue;let n=rayBox(o,d,b,t);if(n!==null&&n<t){t=n;block=b;}}return{t,block};}
 visible(a,b){const len=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(len<.01)return true;return this.trace(a,{x:(b.x-a.x)/len,y:(b.y-a.y)/len,z:(b.z-a.z)/len},len).t>=len-.12;}
 indoors(p){return this.blocks.some(b=>b.roof&&Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2&&p.y<b.y);}
}
