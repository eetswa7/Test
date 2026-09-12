// Cached two-bone sagittal leg pose. Presentation only: collision, aim and
// movement stay in the simulation. Stance/swing foot motion replaces the
// previous rotation about each limb's centre with stationary boots.
export function poseLegs(actor,duck){
 const parts=actor.renderParts,base=actor.renderBase;
 const weight=Math.min(1,(actor.animSpeed??0)/3),ground=actor.grounded===false?0:1;
 for(let leg=0;leg<2;leg++){
  const phase=(actor.stride??0)+leg*Math.PI,swing=Math.max(0,Math.sin(phase));
  const foot=parts[4+leg],hipY=.775-duck*.8;
  foot.z=base[4+leg].z+Math.cos(phase)*.23*weight*ground;
  foot.y=base[4+leg].y+swing*.105*weight*ground;
  foot.pitch=-swing*.15*weight*ground;
  const ankleY=foot.y+.04,ankleZ=foot.z+.035;
  const dy=ankleY-hipY,dz=ankleZ,rawLength=Math.hypot(dy,dz)||1,len=Math.min(.749,Math.max(.06,rawLength));
  const along=(.41*.41-.34*.34+len*len)/(2*len),bend=Math.sqrt(Math.max(0,.41*.41-along*along));
  const uy=dy/rawLength,uz=dz/rawLength;
  const kneeY=hipY+uy*along-uz*bend,kneeZ=uz*along+uy*bend;
  const thigh=parts[leg],shin=parts[2+leg];
  thigh.y=(hipY+kneeY)/2;thigh.z=kneeZ/2;thigh.pitch=Math.atan2(-kneeZ,hipY-kneeY);
  shin.y=(kneeY+ankleY)/2;shin.z=(kneeZ+ankleZ)/2;shin.pitch=Math.atan2(kneeZ-ankleZ,kneeY-ankleY);
  const pad=parts[26+leg];if(pad){pad.y=kneeY;pad.z=kneeZ-.10;pad.pitch=thigh.pitch*.5;}
 }
}
