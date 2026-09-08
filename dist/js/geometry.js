import {SURFACES} from './maps.js?v=10';
export function makeCube(){const data=[];const faces=[[[1,0,0],[1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1]],[[-1,0,0],[-1,-1,1],[-1,-1,-1],[-1,1,-1],[-1,1,1]],[[0,1,0],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]],[[0,-1,0],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1]],[[0,0,1],[1,-1,1],[-1,-1,1],[-1,1,1],[1,1,1]],[[0,0,-1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]]];for(const f of faces)for(const i of [0,1,2,0,2,3]){const p=f[i+1],uv=[[0,0],[1,0],[1,1],[0,1]][i];data.push(...p.map(v=>v*.5),...f[0],...uv);}return outward(new Float32Array(data));}
export function makeCylinder(sides=12){const d=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const p=[Math.cos(a)*.5,Math.sin(a)*.5],q=[Math.cos(b)*.5,Math.sin(b)*.5];for(const [x,y,z,nx,ny,nz,u,v]of [[...p.slice(0,1),-.5,p[1],p[0]*2,0,p[1]*2,0,0],[q[0],-.5,q[1],q[0]*2,0,q[1]*2,1,0],[q[0],.5,q[1],q[0]*2,0,q[1]*2,1,1],[p[0],-.5,p[1],p[0]*2,0,p[1]*2,0,0],[q[0],.5,q[1],q[0]*2,0,q[1]*2,1,1],[p[0],.5,p[1],p[0]*2,0,p[1]*2,0,1]])d.push(x,y,z,nx,ny,nz,u,v);for(const y of [-.5,.5]){let pts=y>0?[p,q]:[q,p];for(const v of [[0,0],...pts])d.push(v[0],y,v[1],0,y*2,0,v[0]+.5,v[1]+.5);}}return outward(new Float32Array(d));}
export function makeSphere(){const d=[],lat=8,lon=12;const p=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){let pts=[p(y/lat*Math.PI,x/lon*Math.PI*2),p((y+1)/lat*Math.PI,x/lon*Math.PI*2),p((y+1)/lat*Math.PI,(x+1)/lon*Math.PI*2),p(y/lat*Math.PI,(x+1)/lon*Math.PI*2)];for(const i of [0,1,2,0,2,3])d.push(...pts[i].map(v=>v*.5),...pts[i],0,0);}return outward(new Float32Array(d));}

export const part=(x,y,z,w,h,d,surface='dark',extra={})=>({x,y,z,w,h,d,surface,...extra});
export {weaponModel} from './weapon-models.js?v=10';
export function actorModel(a,time,relation){
 const team=relation?.cloth??(a.team===0?[.24,.40,.46]:[.52,.32,.25]);
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
  add(.29,1.30,-.082,.05,.095,.19,'white',{color:relation?.band??(a.team===0?[.10,.72,.91]:[.94,.16,.11])});
  a.renderParts=p;a.renderBase=p.map(p=>({...p}));
 }
 if(relation&&a.renderIdentity!==relation.key){a.renderIdentity=relation.key;for(const i of [0,1,2,3,6,7,11,14,15,16,17])a.renderParts[i].color=relation.cloth;for(const q of a.renderParts)if(q.surface==='white')q.color=relation.band;}
 const speed=Math.hypot(a.vx,a.vz),walk=Math.sin(time*speed*2.5+a.id)*Math.min(.6,speed*.17),duck=a.crouched?.5:0;
 for(let i=0;i<a.renderParts.length;i++){const q=a.renderParts[i],b=a.renderBase[i];q.y=b.y-(i>=6?duck:duck*.3);q.pitch=b.pitch??0;if(i<4){q.pitch=(i%2===0?walk:-walk)*(i<2?1:.7);q.z=b.z+Math.sin(q.pitch)*.13;}if(i>=14&&i<=19&&a.weapon.reloadLeft>0)q.pitch+=.55;}
 return a.renderParts;
}
export function material(p){const s=SURFACES[p.surface]??SURFACES.dark;return{color:p.color??s.color,rough:p.rough??s.rough,metal:p.metal??s.metal,pattern:p.leaf!==undefined?-1-p.leaf:p.tile!==undefined?p.tile+1:(s.tile??-1)+1,emissive:p.emissive??0};}

function outward(data){for(let i=0;i<data.length;i+=24){for(let j=0;j<8;j++){const t=data[i+8+j];data[i+8+j]=data[i+16+j];data[i+16+j]=t;}}return data;}
