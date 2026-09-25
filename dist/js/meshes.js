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
 }
 // Continuous circumference UVs, including the inner barrel. Caps are planar.
 for(let i=0;i<out.length;i+=24){
  const us=[];for(let j=0;j<3;j++){const k=i+j*8;
   if(Math.abs(out[k+4])>.9){out[k+6]=out[k]+.5;out[k+7]=out[k+2]+.5;}
   else{out[k+6]=Math.atan2(out[k+2],out[k])/(2*Math.PI)+.5;out[k+7]=out[k+1]+.5;us.push(out[k+6]);}
  }
  if(us.length&&Math.max(...us)-Math.min(...us)>.5)for(let j=0;j<3;j++){const k=i+j*8+6;if(out[k]<.5)out[k]+=1;}
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

// A horizontal receiving surface with consistent world-scale UVs.
export function groundSurface(){return new Float32Array([-.5,0,.5,0,1,0,0,0,.5,0,.5,0,1,0,1,0,.5,0,-.5,0,1,0,1,1,-.5,0,.5,0,1,0,0,0,.5,0,-.5,0,1,0,1,1,-.5,0,-.5,0,1,0,0,1]);}

// One continuous textured ridge surrounds the arena. Periodic waves join at
// the seam, and broad shoulders keep the distant silhouette from looking like
// a row of separate boulders. The mesh is built once when a map loads.
export function ridgeMesh(size,id,segments=64){
 const out=[],rings=[[],[],[],[]],turn=Math.PI*2;
 for(let i=0;i<=segments;i++){
  const a=i/segments*turn;
  const crest=(id===8?18:id===3||id===5?14:id===9?12:id===2?10:11)
    +2.8*Math.sin(a*3+id*.7)+1.7*Math.sin(a*7-id*.37)+.9*Math.sin(a*13+id);
  const crestR=size+27+3.5*Math.sin(a*5+id*.4)+2*Math.sin(a*11-id*.6);
  const points=[[size+10,-2.2],[size+18,crest*.27-1.5],[crestR,crest],[crestR+28,-4]];
  for(let j=0;j<rings.length;j++){const [r,y]=points[j];rings[j].push([Math.sin(a)*r,y,Math.cos(a)*r]);}
 }
 const vertex=(a,b,c,uvs)=>{
  const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),n=normalize([ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]);
  tri(out,a,b,c,n,n,n,uvs);
 };
 const heights=[0,.85,2.3,3.4];
 for(let j=0;j<3;j++)for(let i=0;i<segments;i++){
  const u=i/segments*16,v=(i+1)/segments*16,a=rings[j][i],b=rings[j+1][i],c=rings[j+1][i+1],d=rings[j][i+1];
  vertex(a,b,c,[[u,heights[j]],[u,heights[j+1]],[v,heights[j+1]]]);
  vertex(a,c,d,[[u,heights[j]],[v,heights[j+1]],[v,heights[j]]]);
 }
 return new Float32Array(out);
}

// Height bands are evaluated on the static ridge vertices. Colours are sRGB
// values so the WebGL attribute and software fallback can share one palette.
export function ridgeTint(height,id){
 const smooth=(a,b)=>{const t=Math.max(0,Math.min(1,(height-a)/(b-a)));return t*t*(3-2*t);};
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 if(id===8){
  const stone=mix([.40,.48,.53],[.62,.70,.73],smooth(-2,8));
  return mix(stone,[.92,.96,.98],smooth(8,16));
 }
 if(id===2)return mix([.51,.40,.28],[.86,.71,.50],smooth(-2,13));
 if(id===9)return mix([.45,.34,.29],[.78,.59,.44],smooth(-2,14));
 return mix([.39,.46,.43],[.76,.79,.72],smooth(-2,17));
}

// Three overlapping five-sided boughs keep a readable alpine tree silhouette
// without transparent leaf cards or extra alpha overdraw.
export function coniferMesh(){
 const out=[],sides=5,turn=Math.PI*2;
 const face=(a,b,c,uvs)=>{
  const u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]);
  const n=normalize([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);
  tri(out,a,b,c,n,n,n,uvs);
 };
 for(const [lower,upper,radius]of [[-.43,.16,.5],[-.16,.35,.37],[.08,.5,.24]]){
  for(let i=0;i<sides;i++){
   const point=(j,y,r)=>{const angle=j/sides*turn;return [Math.cos(angle)*r,y,Math.sin(angle)*r];};
   const a=point(i,lower,radius),b=point(i+1,lower,radius),c=point(i+1,upper,.018),d=point(i,upper,.018);
   face(a,c,b,[[0,0],[1,1],[1,0]]);face(a,d,c,[[0,0],[0,1],[1,1]]);
   face([0,lower,0],a,b,[[.5,.5],[1,0],[0,0]]);
  }
 }
 return new Float32Array(out);
}
