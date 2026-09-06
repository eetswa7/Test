import {clamp,lerp} from './math.js?v=6';

// Rendering, HUD and input share the same optic definition. Never put an opaque
// first-person scope model in front of the magnified world camera.
export const isScoped=w=>w.def.id===7||w.optic===3;
export const opticMagnification=w=>isScoped(w)?4:1.35;
export function aimFov(horizontalDegrees,weapon,ads=0){
 const hip=horizontalDegrees*Math.PI/180;
 return lerp(hip,2*Math.atan(Math.tan(hip/2)/opticMagnification(weapon)),clamp(ads,0,1));
}
export const verticalFov=(horizontal,aspect)=>2*Math.atan(Math.tan(horizontal/2)/aspect);
export const scopeVisible=p=>!p.dead&&isScoped(p.weapon)&&p.ads>.62;
export const sightHeight=w=>isScoped(w)?.188:w.optic===1||w.optic===2?.169:.119;

export function weaponPose(p,time,motion=true,menu=false){
 if(menu)return {x:.42,y:-.12,z:-1.05,yaw:.92,pitch:-.08,roll:-.1,scale:1.65};
 const w=p.weapon,ads=p.ads,speed=Math.hypot(p.vx,p.vz);
 const reload=w.reloadLeft>0?Math.sin(clamp(1-w.reloadLeft/w.reloadTime,0,1)*Math.PI):0;
 const bob=motion?Math.sin(time*speed*2.8)*Math.min(.014,speed*.005)*(1-ads):0;
 return {x:lerp(.22,0,ads),y:lerp(-.245,-sightHeight(w),ads)+bob-reload*.14-p.switchLeft*.42,
  z:lerp(-.49,-.32,ads)+p.visualKick*.65,yaw:reload*.2,pitch:reload*.52+p.sprinting*.35,
  roll:lerp(-.035,0,ads)-reload*.17,scale:1};
}
