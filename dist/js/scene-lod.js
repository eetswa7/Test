// Cull only sub-pixel decoration. Cover, silhouettes and combatants stay visible.
export function detailThickness(p){return p.w+p.h+p.d-Math.max(p.w,p.h,p.d)-Math.min(p.w,p.h,p.d);}
export function detailVisible(previous,pixels){return previous===false?pixels>.95:pixels>.6;}
export function actorDetailLevel(previous,distance,threshold){return previous===1?(distance<threshold*.88?0:1):(distance>threshold*1.12?1:0);}
export class SceneLOD {
  constructor(){this.clock=0;this.visibility=new WeakMap();}
  update(renderer,dt){
    this.clock-=dt;if(this.clock>0)return;this.clock=.15;
    const focal=renderer.height/(2*Math.tan(renderer.camera.fov*Math.PI/360)),eye=renderer.eye;
    for(const batch of renderer.worldBatches){
      if(!batch.userData.hasMicroDetail||batch.userData.leaf)continue;
      const selected=[];
      for(const p of batch.userData.parts){
        if(p.destroyed)continue;let visible=true;
        if(p.renderMicroDetail){const d=Math.max(1,Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z));visible=detailVisible(this.visibility.get(p),detailThickness(p)*focal/d);this.visibility.set(p,visible);}
        if(visible)selected.push(p);
      }
      const old=batch.userData.lodParts;
      if(old&&old.length===selected.length&&selected.every((p,i)=>p===old[i]))continue;
      for(let i=0;i<selected.length;i++){batch.setMatrixAt(i,renderer.partMatrix(selected[i]));batch.setColorAt(i,renderer.instanceColor(selected[i],'world'));}
      batch.count=selected.length;batch.userData.lodParts=selected;
      if(selected.length){
        batch.instanceMatrix.clearUpdateRanges();batch.instanceMatrix.addUpdateRange(0,selected.length*16);batch.instanceMatrix.needsUpdate=true;
        batch.instanceColor.clearUpdateRanges();batch.instanceColor.addUpdateRange(0,selected.length*3);batch.instanceColor.needsUpdate=true;
      }
      // Keep conservative bounds so returning details cannot be frustum-culled.
    }
  }
}
