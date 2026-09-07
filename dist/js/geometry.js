import {SURFACES} from './maps.js?v=7';
export function makeCube(){const data=[];const faces=[[[1,0,0],[1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1]],[[-1,0,0],[-1,-1,1],[-1,-1,-1],[-1,1,-1],[-1,1,1]],[[0,1,0],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]],[[0,-1,0],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1]],[[0,0,1],[1,-1,1],[-1,-1,1],[-1,1,1],[1,1,1]],[[0,0,-1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]]];for(const f of faces)for(const i of [0,1,2,0,2,3]){const p=f[i+1],uv=[[0,0],[1,0],[1,1],[0,1]][i];data.push(...p.map(v=>v*.5),...f[0],...uv);}return outward(new Float32Array(data));}
export function makeCylinder(sides=12){const d=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const p=[Math.cos(a)*.5,Math.sin(a)*.5],q=[Math.cos(b)*.5,Math.sin(b)*.5];for(const [x,y,z,nx,ny,nz,u,v]of [[...p.slice(0,1),-.5,p[1],p[0]*2,0,p[1]*2,0,0],[q[0],-.5,q[1],q[0]*2,0,q[1]*2,1,0],[q[0],.5,q[1],q[0]*2,0,q[1]*2,1,1],[p[0],-.5,p[1],p[0]*2,0,p[1]*2,0,0],[q[0],.5,q[1],q[0]*2,0,q[1]*2,1,1],[p[0],.5,p[1],p[0]*2,0,p[1]*2,0,1]])d.push(x,y,z,nx,ny,nz,u,v);for(const y of [-.5,.5]){let pts=y>0?[p,q]:[q,p];for(const v of [[0,0],...pts])d.push(v[0],y,v[1],0,y*2,0,v[0]+.5,v[1]+.5);}}return outward(new Float32Array(d));}
export function makeSphere(){const d=[],lat=8,lon=12;const p=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){let pts=[p(y/lat*Math.PI,x/lon*Math.PI*2),p((y+1)/lat*Math.PI,x/lon*Math.PI*2),p((y+1)/lat*Math.PI,(x+1)/lon*Math.PI*2),p(y/lat*Math.PI,(x+1)/lon*Math.PI*2)];for(const i of [0,1,2,0,2,3])d.push(...pts[i].map(v=>v*.5),...pts[i],0,0);}return outward(new Float32Array(d));}

export const part=(x,y,z,w,h,d,surface='dark',extra={})=>({x,y,z,w,h,d,surface,...extra});
export function weaponModel(w){
 const id=w.def.id,kind=w.def.kind,p=[];
 const add=(x,y,z,a,b,c,surface='dark',extra={})=>p.push(part(x,y,z,a,b,c,surface,{mesh:'bevel',...extra}));
 const short=kind==='PISTOL',sniper=kind==='SNIPER',smg=kind==='SMG',shotgun=kind==='SHOTGUN',lmg=kind==='LMG';
 const metal=[.64,.7,.72],black=[.42,.47,.49],tan=[.86,.72,.53],olive=[.69,.76,.58];
 const finish=id===1||id===8?tan:id===2||lmg?olive:black;
 if(id===12){add(0,.035,-.19,.026,.07,.4,'steel',{metal:.95,color:[.75,.8,.82]});add(0,.02,.07,.065,.082,.19,'rubber');add(0,.02,-.035,.145,.018,.028,'steel');add(.035,-.03,.13,.10,.12,.12,'fabric',{mesh:'sphere'});return p;}
 const length=short?(id===11?.28:.23):sniper?.63:smg?.32:id===1?.5:id===2?.39:.44;
 const width=lmg?.14:short?.077:.105;
 add(0,.028,0,width,.115,length,'dark',{rough:.35,metal:.8,color:finish});
 add(0,.074,-length*.09,width*.90,.07,length*.91,'steel',{color:finish,rough:.37,metal:.86});
 // Lower receiver, magazine well, trigger guard and ergonomic pistol grip.
 add(0,-.025,length*.1,width*.87,.09,length*.58,'dark',{color:finish});
 add(0,-.125,short?.08:length*.32,.068,.20,.086,'rubber',{pitch:-.22});
 for(let i=0;i<4;i++)add(.035,-.083-i*.029,length*.32,.004,.014,.057,'dark',{color:[.28,.3,.3]});
 add(0,-.102,short?-.015:.032,.067,.016,.095,'steel');add(0,-.062,short?-.063:-.014,.065,.066,.014,'steel');add(0,-.069,short?-.012:.025,.012,.051,.012,'dark',{pitch:.35});
 // Visible ejection port, forward assist, pins and fire selector.
 add(width*.51,.052,.035,.004,.029,.081,'rubber',{mesh:'cube'});add(width*.55,.045,.054,.013,.015,.046,'steel',{color:metal});
 for(const z of [-.065,.103])add(width*.51,.019,z,.016,.006,.016,'steel',{mesh:'cylinder',roll:Math.PI/2,color:metal});
 add(-width*.53,-.007,.10,.012,.028,.039,'dark',{roll:.42});
 const barrelLength=sniper?.45:shotgun?.34:short?.13:.26;
 add(0,.082,-length*.5-barrelLength*.43,.037,barrelLength,.037,'steel',{mesh:'cylinder',pitch:Math.PI/2,color:metal,rough:.28});
 const muzzle=-length*.5-barrelLength*.9;
 if(!short){
  const handLength=sniper?.24:shotgun?.25:smg?.18:.28;
  add(0,.024,-length*.43-.075,width*.94,.13,handLength,shotgun?'wood':'dark',{color:shotgun?[.9,.76,.62]:finish});
  for(let i=0;i<6;i++){let z=-length*.3-i*.033;add(width*.49,.04,z,.007,.031,.022,'rubber');add(-width*.49,.04,z,.007,.031,.022,'rubber');}
  for(let i=0;i<13;i++)add(0,.116,.15-i*.036,.105,.012,.012,'steel',{color:black});
  add(0,-.024,length*.5+.086,.066,.067,.22,'dark');
  add(0,-.035,length*.5+.20,.105,.15,.14,'dark',{color:finish});add(0,-.045,length*.5+.28,.12,.17,.024,'rubber');
  if(lmg){add(.01,-.155,.015,.20,.23,.175,'fabric',{color:olive});for(let i=0;i<6;i++)add(-.112,.039,.005-i*.027,.014,.035,.015,'brass',{mesh:'cylinder'});}
  else if(!shotgun){add(0,-.16,.04,.071,.235,.115,'dark',{pitch:-.12,color:black});add(0,-.283,.024,.082,.019,.13,'rubber');for(let i=0;i<3;i++)add(.036,-.099-i*.049,.035,.003,.023,.075,'rubber');}
  if(shotgun){add(0,-.045,-.27,.045,.36,.045,'steel',{mesh:'cylinder',pitch:Math.PI/2});for(let i=0;i<7;i++)add(0,.005,-.19-i*.018,.103,.10,.008,'rubber');}
 }else{
  for(let i=0;i<6;i++){add(width*.52,.074,.07+i*.011,.004,.043,.004,'rubber');add(-width*.52,.074,.07+i*.011,.004,.043,.004,'rubber');}
  add(0,.13,-.094,.013,.017,.015,'dark');add(0,.14,-.094,.005,.005,.007,'white');
 }
 if(w.barrel===1){add(0,.082,muzzle-.058,.075,.22,.075,'dark',{mesh:'tube',pitch:Math.PI/2,color:black});for(const z of [muzzle-.15,muzzle+.02])add(0,.082,z,.08,.012,.08,'steel',{mesh:'tube',pitch:Math.PI/2,color:black});}
 else{add(0,.082,muzzle,.061,w.barrel===2?.076:.041,.061,'steel',{mesh:'tube',pitch:Math.PI/2,color:metal});}
 if(w.optic===3||sniper){
  add(0,.13,.04,.065,.055,.095,'steel');add(0,.188,.03,.095,.28,.095,'dark',{mesh:'tube',pitch:Math.PI/2,color:black});
  for(const z of [-.11,.13])add(0,.188,z,.117,.038,.117,'dark',{mesh:'tube',pitch:Math.PI/2,color:black});
  add(0,.188,-.127,.083,.003,.083,'glass',{mesh:'cylinder',pitch:Math.PI/2});
  add(0,.247,.025,.046,.035,.046,'rubber',{mesh:'cylinder'});add(.059,.19,.025,.036,.036,.043,'rubber',{mesh:'cylinder',roll:Math.PI/2});
 }else if(w.optic===1||w.optic===2){
  const width=w.optic===2?.12:.10;add(0,.126,.045,width,.027,.072,'steel',{color:black});
  add(-width/2,.169,.045,.011,.075,.031,'dark');add(width/2,.169,.045,.011,.075,.031,'dark');add(0,.207,.045,width,.012,.031,'dark');
  add(width*.68,.146,.036,.022,.022,.051,'rubber');
 }else{
  add(0,.10,-length*.44,.015,.044,.02,'dark');add(0,.122,-length*.44,.003,.009,.01,'white');
  add(-.023,.119,length*.29,.015,.029,.025,'dark');add(.023,.119,length*.29,.015,.029,.025,'dark');
 }
 if(w.grip===1)add(0,-.13,-.24,.045,.19,.06,'rubber',{pitch:-.08});if(w.grip===2)add(width*.7,.014,-.20,.032,.031,.10,'dark');
 // Rounded hands, individual fingers, textured gloves and forearm cuffs.
 add(.035,-.147,.12,.097,.118,.115,'fabric',{mesh:'sphere',color:[.71,.73,.61],roll:-.18});
 for(let i=0;i<4;i++)add(.005+i*.018,-.174,.092,.019,.056,.042,'rubber',{mesh:'sphere',pitch:.25});
 add(.046,-.223,.247,.116,.124,.28,'fabric',{mesh:'bevel',pitch:-.28,roll:-.22,color:[.59,.68,.54]});add(.042,-.206,.168,.121,.034,.105,'rubber',{pitch:-.3});
 if(!short){add(-.042,-.097,-.218,.096,.087,.136,'fabric',{mesh:'sphere',color:[.76,.74,.6],roll:.24});for(let i=0;i<4;i++)add(-.039+i*.018,-.065,-.25,.018,.064,.035,'rubber',{mesh:'sphere',pitch:.55});add(-.103,-.217,-.132,.12,.29,.12,'fabric',{mesh:'bevel',roll:-.4,color:[.59,.68,.54]});add(-.07,-.127,-.18,.112,.05,.117,'rubber',{roll:-.4});}
 return p;
}
export function actorModel(a,time){
 const team=a.team===0?[.58,.68,.60]:[.88,.71,.53];
 if(!a.renderParts){
  const p=[],add=(x,y,z,w,h,d,surface='fabric',extra={})=>p.push(part(x,y,z,w,h,d,surface,{mesh:'bevel',...extra}));
  add(-.13,.57,0,.18,.41,.20,'fabric',{color:team});add(.13,.57,0,.18,.41,.20,'fabric',{color:team});
  add(-.13,.26,0,.15,.34,.17,'fabric',{color:team});add(.13,.26,0,.15,.34,.17,'fabric',{color:team});
  add(-.13,.08,-.06,.20,.16,.29,'rubber');add(.13,.08,-.06,.20,.16,.29,'rubber');
  add(0,.81,0,.39,.21,.27,'fabric',{color:team});add(0,1.13,0,.44,.57,.29,'fabric',{color:team});
  add(0,1.17,-.164,.37,.44,.075,'rubber');add(0,1.16,.17,.34,.38,.16,'fabric',{color:[.62,.64,.48]});
  add(0,1.51,0,.25,.30,.24,'skin',{mesh:'sphere'});add(0,1.67,.008,.32,.22,.31,'fabric',{mesh:'sphere',color:team});
  add(0,1.555,-.113,.255,.073,.04,'rubber');add(0,1.45,-.087,.25,.14,.09,'fabric',{mesh:'sphere',color:[.53,.55,.44]});
  add(-.269,1.235,-.09,.17,.30,.18,'fabric',{pitch:-.62,color:team});add(.265,1.23,-.07,.17,.30,.18,'fabric',{pitch:-.55,color:team});
  add(-.233,1.095,-.235,.14,.31,.15,'fabric',{pitch:-1.25,roll:-.36,color:team});add(.22,1.10,-.215,.14,.29,.15,'fabric',{pitch:-1.4,roll:.35,color:team});
  add(-.09,1.135,-.344,.1,.1,.1,'rubber',{mesh:'sphere'});add(.09,1.15,-.27,.09,.1,.09,'rubber',{mesh:'sphere'});
  add(.075,1.14,-.43,.084,.10,.49,'dark');add(.075,1.17,-.72,.027,.17,.027,'steel',{mesh:'cylinder',pitch:Math.PI/2});add(.075,1.06,-.33,.056,.12,.08,'dark');
  for(const x of [-.12,0,.12])add(x,1.11,-.22,.093,.14,.07,'fabric',{color:[.57,.58,.41]});
  for(const x of [-.13,.13])add(x,.40,-.10,.14,.14,.05,'rubber');
  // Contrasting arm identifiers preserve combat readability without luminous bodies.
  add(-.29,1.30,-.082,.05,.095,.19,'white',{color:a.team===0?[.22,.72,.78]:[.92,.43,.22]});
  a.renderParts=p;a.renderBase=p.map(p=>({...p}));
 }
 const speed=Math.hypot(a.vx,a.vz),walk=Math.sin(time*speed*2.5+a.id)*Math.min(.6,speed*.17),duck=a.crouched?.5:0;
 for(let i=0;i<a.renderParts.length;i++){const q=a.renderParts[i],b=a.renderBase[i];q.y=b.y-(i>=6?duck:duck*.3);q.pitch=b.pitch??0;if(i<4){q.pitch=(i%2===0?walk:-walk)*(i<2?1:.7);q.z=b.z+Math.sin(q.pitch)*.13;}if(i>=14&&i<=19&&a.weapon.reloadLeft>0)q.pitch+=.55;}
 return a.renderParts;
}
export function material(p){const s=SURFACES[p.surface]??SURFACES.dark;return{color:p.color??s.color,rough:p.rough??s.rough,metal:p.metal??s.metal,pattern:p.leaf!==undefined?-1-p.leaf:p.tile!==undefined?p.tile+1:(s.tile??-1)+1,emissive:p.emissive??0};}

function outward(data){for(let i=0;i<data.length;i+=24){for(let j=0;j<8;j++){const t=data[i+8+j];data[i+8+j]=data[i+16+j];data[i+16+j]=t;}}return data;}
