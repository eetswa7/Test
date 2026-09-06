// Original low-cost production meshes, shared by WebGL and the CPU fallback.
const emit=(out,p,n,uv)=>out.push(...p,...n,...uv);
function tri(out,a,b,c,na,nb=na,nc=na,uvs=[[0,0],[1,0],[1,1]]){emit(out,a,na,uvs[0]);emit(out,b,nb,uvs[1]);emit(out,c,nc,uvs[2]);}
const normalize=p=>{const n=Math.hypot(...p)||1;return p.map(v=>v/n);};
export function roundedBox(radius=.14,segments=4){
 const out=[],faces=[{n:[1,0,0],u:[0,0,-1],v:[0,1,0]},{n:[-1,0,0],u:[0,0,1],v:[0,1,0]},{n:[0,1,0],u:[1,0,0],v:[0,0,-1]},{n:[0,-1,0],u:[1,0,0],v:[0,0,1]},{n:[0,0,1],u:[1,0,0],v:[0,1,0]},{n:[0,0,-1],u:[-1,0,0],v:[0,1,0]}];
 for(const f of faces){
  const vertex=(u,v)=>{const p=f.n.map((n,i)=>n*.5+f.u[i]*(u-.5)+f.v[i]*(v-.5)),inner=p.map(v=>Math.max(-.5+radius,Math.min(.5-radius,v))),normal=normalize(p.map((v,i)=>v-inner[i]));return{p:inner.map((v,i)=>v+normal[i]*radius),n:normal,uv:[u,v]};};
  for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){
   const q=[vertex(x/segments,y/segments),vertex((x+1)/segments,y/segments),vertex((x+1)/segments,(y+1)/segments),vertex(x/segments,(y+1)/segments)];
   for(const i of [0,1,2,0,2,3])emit(out,q[i].p,q[i].n,q[i].uv);
  }
 }return new Float32Array(out);
}
export function tube(sides=24,inner=.36){
 const out=[];
 for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;
  const at=(angle,r,y)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
  for(const [r,sign]of [[.5,1],[inner,-1]]){
   const p=at(a,r,-.5),q=at(b,r,-.5),s=at(a,r,.5),t=at(b,r,.5),na=[Math.cos(a)*sign,0,Math.sin(a)*sign],nb=[Math.cos(b)*sign,0,Math.sin(b)*sign];
   if(sign>0){tri(out,p,s,t,na,na,nb);tri(out,p,t,q,na,nb,nb);}else{tri(out,p,q,t,na,nb,nb);tri(out,p,t,s,na,nb,na);}
  }
  for(const y of [-.5,.5]){const p=at(a,.5,y),q=at(b,.5,y),s=at(a,inner,y),t=at(b,inner,y),n=[0,y*2,0];if(y>0){tri(out,p,s,t,n);tri(out,p,t,q,n);}else{tri(out,p,q,t,n);tri(out,p,t,s,n);}}
 }return new Float32Array(out);
}
export function leafCard(){return new Float32Array([-.5,-.5,0,0,0,1,0,1,.5,-.5,0,0,0,1,1,1,.5,.5,0,0,0,1,1,0,-.5,-.5,0,0,0,1,0,1,.5,.5,0,0,0,1,1,0,-.5,.5,0,0,0,1,0,0]);}
export function rockMesh(){
 const out=[],lat=7,lon=12;
 const v=(y,x)=>{const a=y/lat*Math.PI,b=x/lon*Math.PI*2,n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)],r=.45+.06*Math.sin(n[0]*17+n[2]*13)*Math.sin(n[1]*11);return n.map(t=>t*r);};
 for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
  const p=[v(y,x),v(y+1,x),v(y+1,x+1),v(y,x+1)];
  for(const ids of [[0,2,1],[0,3,2]]){const [a,b,c]=ids.map(i=>p[i]),u=b.map((n,i)=>n-a[i]),w=c.map((n,i)=>n-a[i]),n=normalize([u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]);tri(out,a,b,c,n);}
 }return new Float32Array(out);
}
