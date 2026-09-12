// Physical bevel width survives non-uniform part scaling. A long receiver no
// longer gets a centimetre-rounded end just because its Z dimension is large.
export function hardWeaponBevel(p){return p.mesh==='bevel'&&p.surface!=='skin'&&p.tile!==9&&p.finishTile!==2;}
export function patchWeaponBevel(shader){
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 #ifdef USE_INSTANCING
 vec3 breachBevelDims=max(vec3(.0001),vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz)));
 objectNormal*=breachBevelDims;
 #endif`);
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 #ifdef USE_INSTANCING
 float breachRadius=min(.0025,min(breachBevelDims.x,min(breachBevelDims.y,breachBevelDims.z))*.1);
 vec3 breachInset=vec3(breachRadius)/breachBevelDims;
 transformed=(position-normal*.1)*(vec3(.5)-breachInset)/.4+normal*breachInset;
 #endif`);
}
