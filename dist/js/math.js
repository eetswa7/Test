export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const v3=(x=0,y=0,z=0)=>({x,y,z});
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const direction=(yaw,pitch=0)=>({x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)});
export function rng(seed=91821){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function rayBox(o,d,b,limit=160){
 let near=0,far=limit;
 for(const k of ['x','y','z']){
  const h=b[k==='x'?'w':k==='y'?'h':'d']/2;
  if(Math.abs(d[k])<1e-8){if(o[k]<b[k]-h||o[k]>b[k]+h)return null;}
  else{let a=(b[k]-h-o[k])/d[k],c=(b[k]+h-o[k])/d[k];near=Math.max(near,Math.min(a,c));far=Math.min(far,Math.max(a,c));if(near>far)return null;}
 }
 return near<=limit?near:null;
}
export function pointSegment(p,a,b){const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,t=clamp(((p.x-a.x)*x+(p.y-a.y)*y+(p.z-a.z)*z)/(x*x+y*y+z*z||1),0,1);return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t,p.z-a.z-z*t);}
export function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
export function perspective(out,fov,aspect,near=.055,far=180){out.fill(0);let f=1/Math.tan(fov/2);out[0]=f/aspect;out[5]=f;out[10]=(far+near)/(near-far);out[11]=-1;out[14]=2*far*near/(near-far);return out;}
export function ortho(out,s,near,far){out.fill(0);out[0]=out[5]=1/s;out[10]=-2/(far-near);out[14]=-(far+near)/(far-near);out[15]=1;return out;}
export function lookAt(out,eye,target){let zx=eye.x-target.x,zy=eye.y-target.y,zz=eye.z-target.z,n=Math.hypot(zx,zy,zz)||1;zx/=n;zy/=n;zz/=n;let xx=zz,xz=-zx;n=Math.hypot(xx,xz)||1;xx/=n;xz/=n;let yx=zy*xz,yy=zz*xx-zx*xz,yz=-zy*xx;out.set([xx,yx,zx,0,0,yy,zy,0,xz,yz,zz,0,-xx*eye.x-xz*eye.z,-yx*eye.x-yy*eye.y-yz*eye.z,-zx*eye.x-zy*eye.y-zz*eye.z,1]);return out;}
export function multiply(out,a,b){for(let c=0;c<4;c++){let b0=b[c*4],b1=b[c*4+1],b2=b[c*4+2],b3=b[c*4+3];out[c*4]=a[0]*b0+a[4]*b1+a[8]*b2+a[12]*b3;out[c*4+1]=a[1]*b0+a[5]*b1+a[9]*b2+a[13]*b3;out[c*4+2]=a[2]*b0+a[6]*b1+a[10]*b2+a[14]*b3;out[c*4+3]=a[3]*b0+a[7]*b1+a[11]*b2+a[15]*b3;}return out;}
export function compose(out,x,y,z,sx,sy,sz,yaw=0,pitch=0,roll=0){
 const cy=Math.cos(yaw),syaw=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
 out[0]=(cy*cr+syaw*sp*sr)*sx;out[1]=cp*sr*sx;out[2]=(-syaw*cr+cy*sp*sr)*sx;out[3]=0;
 out[4]=(-cy*sr+syaw*sp*cr)*sy;out[5]=cp*cr*sy;out[6]=(syaw*sr+cy*sp*cr)*sy;out[7]=0;
 out[8]=syaw*cp*sz;out[9]=-sp*sz;out[10]=cy*cp*sz;out[11]=0;out[12]=x;out[13]=y;out[14]=z;out[15]=1;return out;
}
