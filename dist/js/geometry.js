import {SURFACES} from './maps.js';
export function makeCube(){const data=[];const faces=[[[1,0,0],[1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1]],[[-1,0,0],[-1,-1,1],[-1,-1,-1],[-1,1,-1],[-1,1,1]],[[0,1,0],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]],[[0,-1,0],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1]],[[0,0,1],[1,-1,1],[-1,-1,1],[-1,1,1],[1,1,1]],[[0,0,-1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]]];for(const f of faces)for(const i of [0,1,2,0,2,3]){const p=f[i+1],uv=[[0,0],[1,0],[1,1],[0,1]][i];data.push(...p.map(v=>v*.5),...f[0],...uv);}return outward(new Float32Array(data));}
export function makeCylinder(sides=12){const d=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const p=[Math.cos(a)*.5,Math.sin(a)*.5],q=[Math.cos(b)*.5,Math.sin(b)*.5];for(const [x,y,z,nx,ny,nz,u,v]of [[...p.slice(0,1),-.5,p[1],p[0]*2,0,p[1]*2,0,0],[q[0],-.5,q[1],q[0]*2,0,q[1]*2,1,0],[q[0],.5,q[1],q[0]*2,0,q[1]*2,1,1],[p[0],-.5,p[1],p[0]*2,0,p[1]*2,0,0],[q[0],.5,q[1],q[0]*2,0,q[1]*2,1,1],[p[0],.5,p[1],p[0]*2,0,p[1]*2,0,1]])d.push(x,y,z,nx,ny,nz,u,v);for(const y of [-.5,.5]){let pts=y>0?[p,q]:[q,p];for(const v of [[0,0],...pts])d.push(v[0],y,v[1],0,y*2,0,v[0]+.5,v[1]+.5);}}return outward(new Float32Array(d));}
export function makeSphere(){const d=[],lat=8,lon=12;const p=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){let pts=[p(y/lat*Math.PI,x/lon*Math.PI*2),p((y+1)/lat*Math.PI,x/lon*Math.PI*2),p((y+1)/lat*Math.PI,(x+1)/lon*Math.PI*2),p(y/lat*Math.PI,(x+1)/lon*Math.PI*2)];for(const i of [0,1,2,0,2,3])d.push(...pts[i].map(v=>v*.5),...pts[i],0,0);}return outward(new Float32Array(d));}

export const part=(x,y,z,w,h,d,surface='dark',extra={})=>({x,y,z,w,h,d,surface,...extra});
export function weaponModel(w){
 const id=w.def.id,kind=w.def.kind,p=[],add=(...a)=>p.push(part(...a)),short=kind==='PISTOL',sniper=kind==='SNIPER',smg=kind==='SMG',shotgun=kind==='SHOTGUN',lmg=kind==='LMG';
 if(id===12){add(0,.02,-.25,.025,.07,.42,'steel',{metal:.96});add(0,-.015,.04,.08,.09,.19,'dark');add(0,0,-.06,.15,.025,.025,'steel');return p;}
 const length=short?(id===11?.28:.22):sniper?.61:smg?.31:id===1?.49:id===2?.39:.43,width=lmg?.15:short?.083:.11;
 add(0,0,0,width,.13,length,'dark',{rough:.33,metal:.8});
 add(0,.046,-length*.12,width*.92,.077,length*.91,'steel',{color:id===1?[.34,.29,.21]:id===2?[.24,.3,.29]:[.18,.21,.22],rough:.39,metal:.85});
 add(0,.067,-length*.5-.12,.047,.29,.047,'steel',{mesh:'cylinder',pitch:Math.PI/2,rough:.3,metal:.88});
 if(!short){
  add(0,.015,-length*.45-.08,width*.92,.14,.24,shotgun?'wood':'dark');
  for(let i=0;i<5;i++){add(-width*.49,.033,-length*.32-i*.038,.009,.025,.018,'steel');add(width*.49,.033,-length*.32-i*.038,.009,.025,.018,'steel');}
  add(0,-.04,length*.5+.10,.09,.095,.22,'dark');add(0,-.075,length*.5+.21,.13,.2,.055,'dark');
  if(lmg)add(.013,-.16,.035,.21,.24,.18,'green');else if(!shotgun){add(0,-.16,.035,.075,.25,.12,'dark',{pitch:-.13});for(let i=0;i<3;i++)add(.039,-.1-i*.055,.037,.003,.009,.1,'steel');}
  if(shotgun)add(0,-.042,-.28,.053,.32,.053,'steel',{mesh:'cylinder',pitch:Math.PI/2});
  for(let i=0;i<11;i++)add(0,.103,.14-i*.034,.108,.016,.011,'dark');
 }
 add(0,-.12,short?.055:length*.31,.071,.2,.085,'dark',{pitch:-.24});
 add(0,-.09,short?-.03:.04,.07,.025,.1,'steel');add(0,-.061,short?-.071:0,.07,.06,.018,'dark');
 add(width*.53,.025,.045,.012,.045,.065,'steel');add(width*.66,.017,.062,.028,.014,.025,'dark');
 const muzzle=-length*.5-.27;
 if(w.barrel===1)add(0,.067,muzzle-.07,.085,.24,.085,'dark',{mesh:'cylinder',pitch:Math.PI/2});
 else add(0,.067,muzzle,.063,w.barrel===2?.083:.042,.063,'steel',{mesh:'cylinder',pitch:Math.PI/2});
 if(w.optic===3||sniper){add(0,.173,.035,.095,.24,.095,'dark',{mesh:'cylinder',pitch:Math.PI/2});add(0,.173,-.09,.075,.006,.075,'glass',{mesh:'cylinder',pitch:Math.PI/2,emissive:.25});add(.057,.175,.025,.035,.037,.045,'dark');add(0,.115,.035,.06,.075,.085,'dark');}
 else if(w.optic===1||w.optic===2){let wide=w.optic===2?.13:.095;add(0,.114,.045,wide,.025,.07,'dark');add(-wide/2,.155,.043,.013,.085,.045,'dark');add(wide/2,.155,.043,.013,.085,.045,'dark');add(0,.193,.043,wide,.013,.045,'dark');add(0,.153,.052,.007,.007,.004,'orange',{emissive:3});}
 else {add(0,.095,-length*.45,.018,.063,.018,'dark');add(-.027,.11,length*.3,.016,.04,.025,'dark');add(.027,.11,length*.3,.016,.04,.025,'dark');}
 if(w.grip===1)add(0,-.13,-.25,.047,.2,.065,'dark',{pitch:-.1});
 if(w.grip===2)add(width*.75,0,-.18,.035,.035,.11,'dark');
 // Gloved hands and sleeves are actual geometry, animated with the weapon root.
 add(.035,-.17,.08,.10,.13,.14,'green',{roll:-.16});add(.06,-.24,.25,.12,.12,.3,'green',{pitch:-.3,roll:-.3});
 if(!short){add(-.045,-.115,-.19,.10,.10,.14,'green');add(-.10,-.24,-.1,.13,.3,.13,'green',{roll:-.42});}
 return p;
}
export function actorModel(a,time){
 const team=a.team===0?[.19,.32,.31]:[.41,.26,.17],speed=Math.hypot(a.vx,a.vz),walk=Math.sin(time*speed*2.5+a.id)*Math.min(.7,speed*.18),duck=a.crouched?.53:0;
 if(!a.renderParts)a.renderParts=[
 part(-.14,.38,0,.19,.65,.21,'dark',{pitch:walk}),part(.14,.38,0,.19,.65,.21,'dark',{pitch:-walk}),part(-.14,.08,-.065,.23,.16,.34,'dark'),part(.14,.08,-.065,.23,.16,.34,'dark'),
 part(0,1.03-duck,0,.54,.65,.33,'green',{color:team}),part(0,1.04-duck,-.19,.43,.48,.10,'dark'),part(0,1.05-duck,.22,.4,.43,.2,'green'),
 part(0,1.51-duck,0,.3,.33,.29,'stone',{color:[.47,.36,.27]}),part(0,1.68-duck,.015,.38,.2,.35,'green',{color:team}),part(0,1.55-duck,-.158,.28,.075,.045,'dark'),
 part(-.3,1.12-duck,-.18,.17,.46,.17,'green',{pitch:-.95,roll:-.15,color:team}),part(.3,1.09-duck,-.15,.17,.48,.17,'green',{pitch:-1.1,roll:.15,color:team}),
 part(.08,1.12-duck,-.34,.085,.09,.5,'dark'),part(.08,1.13-duck,-.65,.04,.19,.04,'steel',{mesh:'cylinder',pitch:Math.PI/2}),
 part(-.14,1.05-duck,-.255,.13,.15,.065,'green'),part(.02,1.05-duck,-.255,.13,.15,.065,'green'),part(.18,1.05-duck,-.255,.13,.15,.065,'green')
 ];
 const p=a.renderParts;p[0].pitch=walk;p[1].pitch=-walk;const original=[.38,.38,.08,.08,1.03,1.04,1.05,1.51,1.68,1.55,1.12,1.09,1.12,1.13,1.05,1.05,1.05];for(let i=4;i<p.length;i++)p[i].y=original[i]-duck;const reloading=a.weapon.reloadLeft>0;p[10].pitch=reloading?-.3:-.95;p[11].pitch=reloading?-.4:-1.1;p[12].pitch=reloading?.4:0;return p;
}
export function material(p){const s=SURFACES[p.surface]??SURFACES.dark;return{color:p.color??s.color,rough:p.rough??s.rough,metal:p.metal??s.metal,pattern:s.pattern,emissive:p.emissive??0};}

function outward(data){for(let i=0;i<data.length;i+=24){for(let j=0;j<8;j++){const t=data[i+8+j];data[i+8+j]=data[i+16+j];data[i+16+j]=t;}}return data;}
