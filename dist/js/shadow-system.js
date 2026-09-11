// Snap the player's shadow window in light space to avoid swimming edges.
export function positionSun(light,eye,sun){
  const sx=sun[0]*65,sy=sun[1]*65,sz=sun[2]*65,len=Math.hypot(sx,sy,sz),horizontal=Math.hypot(sx,sz)||1;
  const dx=sx/len,dy=sy/len,dz=sz/len,rx=sz/horizontal,rz=-sx/horizontal;
  const ux=dy*rz,uy=dz*rx-dx*rz,uz=-dy*rx;
  const texel=(light.shadow.camera.right-light.shadow.camera.left)/light.shadow.mapSize.x;
  const u=Math.round((eye.x*rx+eye.z*rz)/texel)*texel,v=Math.round((eye.x*ux+eye.z*uz)/texel)*texel,depth=eye.x*dx+eye.z*dz;
  const cx=rx*u+ux*v+dx*depth,cy=uy*v+dy*depth,cz=rz*u+uz*v+dz*depth;
  light.position.set(cx+sx,cy+sy,cz+sz);light.target.position.set(cx,cy,cz);
}
export function shadowDue(state,dt,hz){state.shadowClock+=dt;if(!hz||state.shadowClock<1/hz)return false;state.shadowClock=0;return true;}
