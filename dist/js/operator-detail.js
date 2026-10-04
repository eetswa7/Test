import {weaponModel,muzzlePosition} from './weapon-models.js?v=57';
import {clamp} from './math.js?v=57';
import {poseSegment} from './actor-pose.js?v=57';

const templates=new Map(),MAX_TEMPLATES=32;
function template(w){
 const key=`${w.def.id}/${w.optic}/${w.barrel}/${w.grip}`;
 if(templates.has(key))return templates.get(key);
 const model=weaponModel(w),volume=p=>p.w*p.h*p.d,minVolume=w.def.kind==='MELEE'?.000005:.00008;
 const pieces=model.filter(p=>!p.hidden&&!/hand/i.test(p.tag??'')&&p.surface!=='glass'&&volume(p)>minVolume)
  .sort((a,b)=>volume(b)-volume(a)).slice(0,24);
 const grip=model.find(p=>p.tag==='rightHand'),support=model.find(p=>p.tag==='supportHand'||p.tag==='pumpHand');
 const result={key,pieces,grip:grip??{x:.027,y:-.112,z:.1},support:support??grip,muzzle:model.muzzle};
 if(templates.size>=MAX_TEMPLATES)templates.delete(templates.keys().next().value);
 templates.set(key,result);return result;
}

export function addOperatorGear(parts,actor){
 const add=(x,y,z,w,h,d,surface='rubber',extra={})=>parts.push({x,y,z,w,h,d,surface,mesh:'bevel',...extra});
 // Preserve the established body rig indices; the placeholder rifle is hidden.
 for(const i of [20,21,22])parts[i].hidden=true;
 add(0,1.73,-.02,.27,.105,.28,'rubber',{actorFar:true});
 add(0,1.70,-.178,.235,.033,.085,'rubber',{actorFar:true});
 add(0,1.765,.04,.055,.015,.17,'steel');
 for(const sign of [-1,1]){
  add(sign*.168,1.585,.01,.06,.13,.095,'rubber');
  add(sign*.19,1.605,.005,.018,.055,.10,'steel');
  add(sign*.24,1.34,-.035,.135,.145,.17,'rubber',{roll:sign*.18,actorFar:actor.role===4});
  add(sign*.25,1.34,-.129,.07,.027,.016,'white',{actorFar:true});
  add(sign*.135,1.37,-.177,.053,.065,.045,'fabric');
 }
 add(0,1.31,-.213,.265,.03,.022,'rubber');
 add(0,1.19,-.223,.095,.062,.033,'steel');
 add(-.185,1.35,-.21,.065,.09,.055,'rubber');
 add(-.18,1.443,-.203,.012,.095,.012,'steel',{mesh:'cylinder'});
 add(.21,.86,.025,.084,.21,.14,'rubber',{roll:-.12});
 if(actor.role===4){
  add(0,1.14,.245,.34,.39,.22,'fabric',{actorFar:true});
  add(.21,1.11,-.17,.11,.17,.085,'rubber');
 }else if(actor.role===3){
  add(0,1.10,.21,.24,.31,.14,'fabric');
  add(-.15,.89,-.19,.065,.17,.04,'rubber');
 }else add(0,.84,-.17,.22,.07,.045,'rubber');
}

function arm(parts,upperIndex,foreIndex,handIndex,side,target,duck){
 const sx=side*.25,sy=1.36-duck,sz=-.02,dx=target.x-sx,dy=target.y-sy,dz=target.z-sz,raw=Math.hypot(dx,dy,dz)||1,length=clamp(raw,.035,.649);
 const ux=dx/raw,uy=dy/raw,uz=dz/raw,along=(.32*.32-.34*.34+length*length)/(2*length),bend=Math.sqrt(Math.max(0,.32*.32-along*along));
 let bx=side,by=-.65,bz=.12;const dot=bx*ux+by*uy+bz*uz;bx-=ux*dot;by-=uy*dot;bz-=uz*dot;const n=Math.hypot(bx,by,bz)||1;
 const ex=sx+ux*along+bx/n*bend,ey=sy+uy*along+by/n*bend,ez=sz+uz*along+bz/n*bend,wx=sx+ux*length,wy=sy+uy*length,wz=sz+uz*length;
 poseSegment(parts[upperIndex],sx,sy,sz,ex,ey,ez);poseSegment(parts[foreIndex],ex,ey,ez,wx,wy,wz);
 const hand=parts[handIndex];hand.x=wx;hand.y=wy;hand.z=wz;hand.pitch=.1;hand.roll=side*.2;
}
function mount(out,p,c,s,y,recoil,dy=0,dz=0){
 const py=p.y+dy,pz=p.z+dz;out.x=.075+p.x;out.y=y+py*c-pz*s;out.z=-.23+py*s+pz*c+recoil;return out;
}
export function poseOperator(actor,duck){
 const w=actor.weapon;
 if(actor.carriedWeapon!==w||actor.carriedOptic!==w.optic||actor.carriedBarrel!==w.barrel||actor.carriedGrip!==w.grip){
  const t=template(w);actor.carriedTemplate=t;actor.carriedWeapon=w;actor.carriedOptic=w.optic;actor.carriedBarrel=w.barrel;actor.carriedGrip=w.grip;
  if(actor.carriedKey!==t.key){
   actor.carriedKey=t.key;actor.renderParts.length=actor.operatorBodyCount;actor.renderBase.length=actor.operatorBodyCount;
   for(const [i,p]of t.pieces.entries()){
    const q={...p,carried:true,actorFar:i<5,finishTile:undefined,tile:-1,rough:p.metal>.4?.4:.8,metal:p.metal>.4?.7:0};
    actor.renderParts.push(q);actor.renderBase.push({...q});
   }
  }
 }
 const t=actor.carriedTemplate,pose=actor.operatorPose??(actor.operatorPose={right:{},left:{}});
 const pitch=clamp(actor.pitch??0,-.65,.65)+Math.exp(-w.sinceShot*20)*.025,c=Math.cos(pitch),s=Math.sin(pitch);
 const recoil=Math.exp(-w.sinceShot*22)*.027,mountY=1.30-duck,react=clamp(actor.hitReact??0,0,.16);
 for(let i=actor.operatorBodyCount;i<actor.renderParts.length;i++){
  const q=actor.renderParts[i],base=actor.renderBase[i];let dy=0,dz=0;
  if(base.tag==='magazine'&&w.reloadLeft>0){const r=1-w.reloadLeft/w.reloadTime;dy=-Math.sin(clamp(r/.75,0,1)*Math.PI)*.20;}
  if(base.tag==='pump')dz=Math.exp(-Math.abs(w.sinceShot-.23)*18)*.07;
  mount(q,base,c,s,mountY,recoil,dy,dz);q.pitch=(base.pitch??0)+pitch;q.hidden=false;
 }
 mount(pose.right,t.grip,c,s,mountY,recoil);mount(pose.left,t.support??t.grip,c,s,mountY,recoil);
 if(w.reloadLeft>0){const reach=Math.sin((1-w.reloadLeft/w.reloadTime)*Math.PI);pose.left.y-=reach*.12;pose.left.z+=reach*.12;}
 arm(actor.renderParts,15,17,19,1,pose.right,duck);arm(actor.renderParts,14,16,18,-1,pose.left,duck);
 // Local impact recoil is presentation only; it never moves collision or aim.
 if(react>0)for(let i=6;i<actor.renderParts.length;i++){
  if(i===26||i===27)continue;const q=actor.renderParts[i];q.z+=(q.y-(.82-duck))*react;q.pitch=(q.pitch??0)+react;
 }
}

export function operatorMuzzle(actor,weapon=actor.weapon){
 const m=muzzlePosition(weapon),pitch=clamp(actor.pitch??0,-.65,.65),cp=Math.cos(pitch),sp=Math.sin(pitch),c=Math.cos(actor.yaw),s=Math.sin(actor.yaw);
 const x=.075+m.x,z=-.23+m.y*sp+m.z*cp;
 return{x:actor.x+c*x-s*z,y:actor.y+1.30-(actor.crouched?.5:0)+m.y*cp-m.z*sp,z:actor.z+s*x+c*z};
}
