import {rng} from './math.js?v=8';

/** Visual dressing is separate from navigation and damage collision. Large
 * trunks get simple collision boxes; leaves, pebbles and trim stay inexpensive. */
export function dressWorld(arena){
 const random=rng(46190+arena.info.id*113),id=arena.info.id,s=arena.info.size;
 arena.foliage=[];const add=(...args)=>arena.detail(...args);
 const card=(x,y,z,w,h,leaf,yaw=0,pitch=0,roll=0)=>arena.foliage.push({x,y,z,w,h,d:1,surface:'green',mesh:'leaf',leaf,yaw,pitch,roll,color:[.9,.95,.8]});
 const plant=(x,z,size=1,kind=0,y=0)=>{for(let i=0;i<3;i++)card(x,y+size*.48,z,size*(kind===2?1:1.2),size,kind,i*Math.PI/3+random()*.3);};
 const palm=(x,z,h=7)=>{
  const bend=(random()-.5)*.8;
  for(let j=0;j<5;j++)add(x+bend*j*.2,h*(j+.5)/5,z,.29-j*.025,h/5+.12,.29-j*.025,'bark',{mesh:'cylinder',roll:-bend*.07});
  add(x+bend,h-.10,z,.75,.58,.72,'bark',{mesh:'sphere'});
  for(let j=0;j<9;j++){
   const angle=j/9*Math.PI*2;card(x+bend+Math.sin(angle)*1.22,h-.43,z+Math.cos(angle)*1.22,1.6,3.5,1,angle,-1.05,(random()-.5)*.17);
  }
 };
 const tree=(x,z,h=5)=>{
  add(x,h*.3,z,.3,h*.6,.3,'bark',{mesh:'cylinder'});
  for(let j=0;j<5;j++){const a=j*2.4;plant(x+Math.cos(a)*.7,z+Math.sin(a)*.7,h*.72,0,h*.3+(j%2)*.6);}
 };
 const free=(x,z,margin=1)=>!arena.collides({x,y:.02,z},margin,2)&&arena.spawns.every(p=>Math.hypot(p.x-x,p.z-z)>3.2)&&arena.objectives.every(p=>Math.hypot(p.x-x,p.z-z)>4.2);
 // Break up the ground with roads, shoulders and shallow drainage strips.
 if(id===0||id===3||id===5){
  for(const x of [-s*.66,s*.66])add(x,.011,0,4.3,.012,s*2-2,'asphalt');
  for(const z of [-s*.63,s*.63])add(0,.013,z,s*2-2,.012,3.7,'asphalt');
  for(const x of [-s*.66-2.3,s*.66+2.3])add(x,.07,0,.24,.14,s*2-2,'concrete',{mesh:'bevel'});
 }else if(id===1){
  add(0,.011,0,s*2-1,.014,s*2-1,'asphalt');add(0,.028,0,25,.015,22,'concrete');
  for(const x of [-24,24])for(let z=-25;z<27;z+=4)add(x,.023,z,.12,.01,2,'white',{color:[.84,.72,.3]});
 }else if(id===4){
  add(0,.012,0,s*2-1,.014,s*2-1,'asphalt');
  add(0,.027,0,11,.016,33,'concrete');
  for(const x of [-32,32])for(let z=-30;z<=30;z+=5)add(x,.026,z,.15,.012,2.6,'white',{color:[.87,.74,.33]});
  for(const x of [-8.82,8.82])add(x,.035,0,.19,.06,22,'dark');
 }else{
  add(0,.012,0,5,.014,s*2-1,'dirt');add(0,.014,0,s*2-1,.012,4.5,'dirt');
 }
 // Facade trim, exposed foundations, shutters, air conditioning and roof equipment.
 const buildings=arena.blocks.filter(b=>!b.ground&&b.h>5&&b.w>4&&b.d>4);
 for(const b of buildings){
  add(b.x,.20,b.z,b.w+.09,.4,b.d+.09,'concrete');
  add(b.x,b.h-.10,b.z,b.w+.2,.15,b.d+.2,'plaster');
  for(const side of [-1,1]){
   const z=b.z+side*(b.d/2+.04);
   for(let y=2;y<b.h-.5;y+=2.2)for(let x=b.x-b.w/2+1.2;x<b.x+b.w/2-.6;x+=2){
    for(const dx of [-.46,.46])add(x+dx,y,z,.09,1.2,.17,'wood');
    add(x,y+.59,z,1,.10,.17,'plaster');add(x,y,z,.038,1.05,.09,'dark');
    add(x-.7,y,z,.28,1.16,.07,'blue',{color:[.45,.57,.53]});add(x+.7,y,z,.28,1.16,.07,'blue',{color:[.45,.57,.53]});
   }
   add(b.x+b.w*.39,b.h*.47,z,.10,b.h*.94,.12,'rust',{mesh:'cylinder'});
  }
  add(b.x-b.w*.24,b.h+.5,b.z,1.5,1,1.5,'steel',{mesh:'cylinder',color:[.74,.78,.75]});
  for(let i=0;i<5;i++)add(b.x+.5,b.h+.78,b.z-.5+i*.18,1.35,.06,.05,'rubber');
  add(b.x+b.w*.3,b.h+1.5,b.z-.5,.032,2.3,.032,'steel');
  for(let i=0;i<3;i++)add(b.x+b.w*.3,b.h+1.8-i*.23,b.z-.5,1.3-i*.2,.026,.026,'steel');
 }
 for(const roof of arena.blocks.filter(b=>b.roof)){
  add(roof.x,.026,roof.z,roof.w-.6,.018,roof.d-.6,'concrete');
  for(const z of [roof.z-roof.d/2,roof.z+roof.d/2])add(roof.x,roof.y+.2,z,roof.w,.16,.13,'rust');
  add(roof.x,roof.y+.39,roof.z,1.1,.48,.8,'steel',{mesh:'bevel'});
 }
 // Small street infrastructure gives human scale without blocking the lanes.
 for(const [x,z]of [[-s+2,-7],[s-2,9],[-7,s-2],[8,-s+2]]){
  add(x,2.7,z,.11,5.4,.11,'steel',{mesh:'cylinder'});add(x+.55,5.36,z,1.1,.10,.12,'steel');add(x+1,5.29,z,.40,.12,.26,'dark',{mesh:'bevel'});add(x+1,5.22,z,.3,.025,.2,'white',{emissive:.5});
 }
 // Low growth stays below the sightline and is kept away from objectives.
 for(let i=0;i<(id===1||id===4?70:220);i++){
  const x=(random()-.5)*(s*2-3),z=(random()-.5)*(s*2-3);if(!free(x,z,.4))continue;
  const nearWall=arena.blocks.some(b=>!b.ground&&Math.abs(x-b.x)<b.w/2+2.4&&Math.abs(z-b.z)<b.d/2+2.4);
  if(!nearWall&&random()>.14)continue;
  const size=.18+random()*.38;plant(x,z,size,2);
  if(random()>.6)add(x+.3,.09,z-.1,.25+random()*.35,.18,.28,'rock',{mesh:'rock',yaw:random()*6.28});
 }
 const treeSpots=[[-s+3,-s*.45],[-s*.4,-s+3],[s*.42,s-3],[s-3,s*.4],[-s+3,s*.55],[s-3,-s*.6]];
 if(id!==1&&id!==4)for(const [x,z]of treeSpots)if(free(x,z,.65)){
  arena.box(x,.8,z,.42,1.6,.42,'bark',{invisible:true});
  if(id===3||id===5)tree(x,z,5+random()*2);else palm(x,z,5.5+random()*2.5);
  plant(x+.8,z,.65,3);
 }
 // Continuous surrounding hills and foliage replace the old rectangular skyline.
 for(let i=0;i<(id===4?0:30);i++){
  const angle=i/30*Math.PI*2,radius=s+17+random()*16,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
  const h=5+random()*13;add(x,h*.22-2,z,12+random()*12,h,13+random()*10,id===2?'limestone':'rock',{mesh:'rock',yaw:random()*6.28,color:id===2?[.92,.83,.65]:[.7,.76,.69]});
  if(id!==1&&i%2===0){if(id===3||id===5)tree(x,z,7+random()*4);else palm(x,z,7+random()*3);}
  if(i%2)plant(x,z,3+random()*2,0);
 }
 if(id===4){
  // Water, a moored repair vessel and shore cranes establish a recognisable harbour.
  // These distant shapes remain outside the playable collision boundary.
  add(s+53,-1.25,0,106,.08,230,'glass',{color:[.075,.22,.28],rough:.24,metal:.1});
  for(let i=0;i<16;i++)add(s+12+i*4,-1.18,(i%3-1)*23,7+i*.5,.016,.10,'white',{color:[.25,.43,.47]});
  add(s+14,.65,3,12,4.4,39,'blue',{mesh:'bevel',color:[.22,.31,.34]});
  add(s+14,2.9,3,11.5,.18,37,'steel');
  add(s+14,4.8,-10,9,3.6,9,'white',{mesh:'bevel'});
  add(s+14,7,-11,7,.75,6,'glass');add(s+14,9.3,-11,.16,4,.16,'steel');
  for(const z of [1,7,13])add(s+14,3.65,z,8,1.4,4,'rust',{mesh:'bevel'});
  for(const z of [-30,30]){
   const x=s+8;add(x,7,z,1.1,14,1.1,'orange');add(x-4,14,z,11,.55,.7,'orange');
   add(x-8,10.5,z,.045,6,.045,'dark',{mesh:'cylinder'});
   add(x+2,11.6,z,3,3,2.6,'steel',{mesh:'bevel'});
  }
  for(let z=-30;z<=30;z+=8){
   add(s-2,.28,z,.48,.56,.48,'dark',{mesh:'cylinder'});
   add(s-2,.54,z,.74,.14,.74,'steel',{mesh:'cylinder'});
   add(s-2,.038,z,1.1,.06,1.1,'concrete');
  }
  for(const x of [-7,7])for(let z=-9;z<=9;z+=3){
   add(x-1.45,1.55,z,.055,.9,.055,'steel');
   add(x-1.45,2,z,.055,.06,2.7,'orange');
   add(x+.9,1.13,z,.65,.045,1,'dark');
   for(let k=0;k<4;k++)add(x+.9,1.16,z-.36+k*.24,.61,.022,.07,'steel');
  }
  for(const x of [-27.8,-14.2])for(const z of [-13,-7,-1]){
   add(x,3,z,.15,4.6,.20,'white');
   add(x,4.9,z,.18,.12,1.8,'white',{emissive:.45});
  }
  add(-21,5.74,-7,8,.18,5,'glass');
  for(const z of [-9.5,-7,-4.5])add(-21,5.86,z,8.1,.08,.085,'steel');
 }
 if(id===5){
  add(0,.026,0,19,.025,19,'limestone',{color:[.64,.67,.65]});
  add(0,.047,0,5,.018,18,'concrete');add(0,.049,0,18,.018,5,'concrete');
  for(const x of [-6.3,6.3])for(const z of [-6.3,6.3]){
   add(x,.12,z,2.3,.22,2.3,'moss');plant(x,z,.52,3);
  }
  for(const sign of [-1,1]){
   for(const offset of [-9,-3.1,3.1,9]){
    add(offset,1.85,sign*10.37,.18,3.7,.22,'concrete');
    add(sign*10.37,1.85,offset,.22,3.7,.18,'concrete');
   }
   add(0,3.3,sign*10.38,2.3,.16,.2,'dark');
   add(0,3.15,sign*10.4,1.8,.055,.10,'white',{emissive:.65});
   add(sign*10.38,3.3,0,.2,.16,2.3,'dark');
   add(sign*10.4,3.15,0,.10,.055,1.8,'white',{emissive:.65});
  }
  for(const x of [-4.8,4.8])for(const z of [-24,-21,-18]){
   add(x,1.4,z,1.2,2.8,1.4,'steel',{mesh:'bevel'});
   add(x,1.9,z-.73,.75,.6,.045,'glass');
   for(let j=0;j<3;j++)add(x-.24+j*.21,2.27,z-.76,.07,.04,.018,'white',{color:[.36,.7,.57],emissive:.55});
  }
  add(-23,9.8,-21,.22,4.8,.22,'steel');
  for(let i=0;i<4;i++)add(-23,10.8-i*.55,-21,2.5-i*.35,.08,.08,'steel');
  add(-23,12.3,-21,.16,.2,.16,'orange',{emissive:1});
  for(const x of [20.3,27.7])for(const z of [-19,-16,-13]){
   add(x,1.65,z,.065,1.14,.065,'steel');
   add(x,2.22,z,.065,.065,2.9,'steel');
  }
 }
 // Light rubble, low planters and sandbags are chamfered to catch the sunlight.
 for(const b of arena.blocks){if(b.h>.7&&b.h<1.5&&!b.ground&&!b.stair&&!b.dock&&!b.overlook&&b.w>2){b.mesh='bevel';for(let i=0;i<Math.floor(b.w);i++)add(b.x-b.w/2+.6+i,b.y+b.h/2+.10,b.z,.82,.23,.54,'fabric',{mesh:'bevel',color:[.88,.8,.60]});}}
}
