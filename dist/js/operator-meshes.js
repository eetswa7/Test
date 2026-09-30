// Shared, closed anatomical sections. Smooth normals follow the changing
// elliptical profile; all operators reuse these two geometries and materials.
function sections(rings,sides){
 const data=[],tau=Math.PI*2;
 const vertex=(row,index)=>{
  const [y,rx,rz]=rings[row],angle=index/sides*tau,c=Math.cos(angle),s=Math.sin(angle);
  const before=rings[Math.max(0,row-1)],after=rings[Math.min(rings.length-1,row+1)],dy=after[0]-before[0];
  const dx=(after[1]-before[1])/dy,dz=(after[2]-before[2])/dy;
  const nx=c/rx,ny=-(c*c*dx/rx+s*s*dz/rz),nz=s/rz,n=Math.hypot(nx,ny,nz);
  return[c*rx,y,s*rz,nx/n,ny/n,nz/n,index/sides,y+.5];
 };
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<sides;i++){
  const a=vertex(row,i),b=vertex(row+1,i),c=vertex(row+1,i+1),d=vertex(row,i+1);
  data.push(...a,...b,...c,...a,...c,...d);
 }
 for(const row of [0,rings.length-1]){
  const [y,rx,rz]=rings[row],normal=row===0?-1:1,centre=[0,y,0,0,normal,0,.5,.5];
  for(let i=0;i<sides;i++){
   const point=index=>{const angle=index/sides*tau,c=Math.cos(angle),s=Math.sin(angle);return[c*rx,y,s*rz,0,normal,0,c*.5+.5,s*.5+.5];};
   const a=point(i),b=point(i+1);data.push(...centre,...(normal>0?b:a),...(normal>0?a:b));
  }
 }
 return new Float32Array(data);
}
export const operatorTorso=(sides=12)=>sections([[-.5,.32,.34],[-.3,.35,.43],[.13,.48,.5],[.39,.49,.39],[.5,.34,.27]],sides);
export const operatorLimb=(sides=8)=>sections([[-.5,.31,.35],[0,.5,.5],[.5,.44,.42]],sides);
