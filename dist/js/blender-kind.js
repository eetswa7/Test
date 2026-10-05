// Shared authored-kit selection for the runtime and native level builder.
const bodyKinds=['thigh','thigh','shin','shin','boot','boot','soft','torso','vest','pack','head','helmet','hard','soft','upperarm','upperarm','forearm','forearm','glove','glove'];
export function blenderKind(p,category){
 if(p.blenderMesh)return p.blenderMesh;
 if(p.blenderKind)return p.blenderKind;
 if(category==='weapon'&&/Hand/.test(p.tag??'')){
  if(p.tile===9&&p.d>.15)return 'sleeve_z';
  if(p.mesh==='sphere'&&p.w>.055&&p.h>.06&&p.d>.055)return 'palm';
  if(p.mesh==='sphere'&&p.w<.035)return 'finger';
 }
 if(category==='actor'&&Number.isInteger(p.blenderBodyIndex)&&bodyKinds[p.blenderBodyIndex])return bodyKinds[p.blenderBodyIndex];
 if(p.mesh==='ridge')return p.blenderRidgeName??null;
 if(p.mesh==='surface')return 'surface';
 if(p.mesh==='leaf')return 'leaf';
 if(p.mesh==='conifer')return 'conifer';
 if(p.mesh==='strata')return 'strata';
 if(p.mesh==='rock')return 'rock';
 if(p.mesh==='operatorTorso')return 'torso';
 if(p.mesh==='operatorLimb')return 'limb';
 if(p.mesh==='tube')return 'tube';
 if(p.mesh==='sphere')return 'sphere';
 if(p.mesh==='cylinder')return category==='world'&&p.breakable?'drum':'cylinder';
 if(category==='world'){
  if(p.shellThickness>.02&&p.surface==='wood')return 'crate';
  if(p.shellThickness>0&&p.shellThickness<.01)return p.w>p.d?'cargo_x':'cargo_z';
  if(!p.ground&&!p.roof&&p.h>5&&p.w>4&&p.d>4)return ['steel','dark','rust'].includes(p.surface)?'building_industrial':p.surface==='limestone'?'building_desert':'building_urban';
  if(p.surface==='concrete'&&p.h>.9&&p.h<1.6&&Math.max(p.w,p.d)>2.5&&Math.min(p.w,p.d)<1.1)return p.w>p.d?'barrier_x':'barrier_z';
  if(p.h>2&&Math.min(p.w,p.d)<.6&&Math.max(p.w,p.d)>2)return 'wall';
  return 'architecture';
 }
 return p.tile===9||p.finishTile===2||p.surface==='fabric'?'soft':'hard';
}
