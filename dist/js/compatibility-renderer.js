import {identity,perspective,lookAt,multiply,compose,direction,clamp,lerp,distance} from './math.js';
import {weaponModel,actorModel,part,material} from './geometry.js';

const corners=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
const faces=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
const normals=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]];
/** CPU compatibility path for browsers that cannot create any WebGL2 context.
 * The game simulation and controls are unchanged. Supported phones use Renderer.
 */
export class CompatibilityRenderer {
 constructor(canvas,settings){this.canvas=canvas;this.settings=settings;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('The browser could not create a drawing surface.');this.compatibility=true;this.quality='compatibility';this.fps=30;this.renderScale=1;this.lost=false;this.drawCalls=0;this.frameAverage=16.7;this.lastRender=0;this.frames=0;this.fpsAge=0;this.matrix=identity();this.parent=identity();this.combined=identity();this.view=identity();this.proj=identity();this.vp=identity();this.eye={x:0,y:2,z:0};this.target={x:0,y:2,z:-1};this.weaponKey='';this.weaponParts=[];this.world=[];this.flash=0;}
 chooseQuality(){return 'compatibility';}
 setArena(arena){this.arena=arena;this.buildWorld();}
 box(p,parent=null){compose(this.matrix,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0);let m=this.matrix;if(parent){multiply(this.combined,parent,this.matrix);m=this.combined;}
  const points=corners.map(c=>({x:m[0]*c[0]+m[4]*c[1]+m[8]*c[2]+m[12],y:m[1]*c[0]+m[5]*c[1]+m[9]*c[2]+m[13],z:m[2]*c[0]+m[6]*c[1]+m[10]*c[2]+m[14]})),sun=this.arena.info.sun,mat=material(p);
  return faces.map((f,i)=>{const n=normals[i],nx=m[0]*n[0]/p.w+m[4]*n[1]/p.h+m[8]*n[2]/p.d,ny=m[1]*n[0]/p.w+m[5]*n[1]/p.h+m[9]*n[2]/p.d,nz=m[2]*n[0]/p.w+m[6]*n[1]/p.h+m[10]*n[2]/p.d,light=.53+Math.max(0,nx*sun[0]+ny*sun[1]+nz*sun[2])*.52+mat.emissive*.35;
   return{points:f.map(i=>points[i]),normal:{x:nx,y:ny,z:nz},color:mat.color.map(v=>clamp(Math.pow(v*light,.72)*255,0,255)),ground:p.ground};});
 }
 buildWorld(){this.world=[];for(const p of [...this.arena.blocks,...this.arena.decor])if(!p.destroyed)this.world.push(...this.box(p));}
 events(events){if(events.some(e=>e.type==='explosion'))this.buildWorld();}
 paint(polygons,view=this.view,weapon=false){const c=this.ctx,w=this.canvas.width,h=this.canvas.height,scale=h/(2*Math.tan(this.fov/2)),draw=[];
  for(const poly of polygons){const first=poly.points[0],dot=poly.normal.x*(this.eye.x-first.x)+poly.normal.y*(this.eye.y-first.y)+poly.normal.z*(this.eye.z-first.z);if(!weapon&&dot<-.001)continue;
   let points=poly.points.map(p=>({x:view[0]*p.x+view[4]*p.y+view[8]*p.z+view[12],y:view[1]*p.x+view[5]*p.y+view[9]*p.z+view[13],z:-(view[2]*p.x+view[6]*p.y+view[10]*p.z+view[14])}));
   // Near-plane clipping keeps large walls and floors continuous around the camera.
   const clipped=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ai=a.z>.06,bi=b.z>.06;if(ai)clipped.push(a);if(ai!==bi){const t=(.06-a.z)/(b.z-a.z);clipped.push({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:.06});}}
   if(clipped.length<3)continue;let sx=[],sy=[],depth=0;for(const p of clipped){sx.push(w/2+p.x/p.z*scale);sy.push(h/2-p.y/p.z*scale);depth+=p.z;}if(Math.max(...sx)<0||Math.min(...sx)>w||Math.max(...sy)<0||Math.min(...sy)>h)continue;
   depth/=clipped.length;const fog=weapon?0:1-Math.exp(-depth*.008),rgb=poly.color.map((v,i)=>Math.round(lerp(v,this.arena.info.fog[i]*255,fog)));draw.push({sx,sy,depth:poly.ground?999:depth,color:`rgb(${rgb.join(',')})`});
  }
  draw.sort((a,b)=>b.depth-a.depth);for(const p of draw){c.beginPath();c.moveTo(p.sx[0],p.sy[0]);for(let i=1;i<p.sx.length;i++)c.lineTo(p.sx[i],p.sy[i]);c.closePath();c.fillStyle=p.color;c.fill();}this.drawCalls+=draw.length;
 }
 render(game,dt,menu){
  this.fpsAge+=dt;this.lastRender+=dt;if(this.lastRender<1/30)return;this.lastRender=0;this.frames++;if(this.fpsAge>.7){this.fps=Math.round(this.frames/this.fpsAge);this.frames=0;this.fpsAge=0;}
  const w=Math.max(2,Math.round(this.canvas.clientWidth*.85)),h=Math.max(2,Math.round(this.canvas.clientHeight*.85));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  const c=this.ctx,p=game.player;this.fov=(this.settings.fov??80)*Math.PI/180;
  if(menu){this.eye={x:15,y:6.5,z:25};this.target={x:-4,y:2,z:-8};this.fov=65*Math.PI/180;}else{this.eye=game.eye(p);this.eye.y-=p.dead?1.2:0;const d=direction(p.yaw,p.pitch);this.target={x:this.eye.x+d.x,y:this.eye.y+d.y,z:this.eye.z+d.z};this.fov=lerp(this.fov,(p.weapon.optic===3?30:58)*Math.PI/180,p.ads);}
  lookAt(this.view,this.eye,this.target);const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,`rgb(${this.arena.info.sky.map(v=>Math.round(v*255)).join(',')})`);gradient.addColorStop(1,`rgb(${this.arena.info.fog.map(v=>Math.round(v*255)).join(',')})`);c.fillStyle=gradient;c.fillRect(0,0,w,h);this.drawCalls=0;
  const polygons=this.world.slice();for(const a of game.actors)if(a.id!==0&&distance(a,p)<65){const dead=a.dead?1.5:0;compose(this.parent,a.x,a.y,a.z,1,1,1,-a.yaw,0,dead);for(const q of actorModel(a,game.time))polygons.push(...this.box(q,this.parent));}
  if(['domination','sabotage'].includes(game.rules.mode.id))for(const point of game.rules.points){polygons.push(...this.box(part(point.x,1,point.z,.05,2,.05,'steel')),...this.box(part(point.x+.4,1.7,point.z,.8,.5,.06,'green',{color:point.owner===0?[.2,.8,.85]:point.owner===1?[.9,.4,.1]:[.8,.85,.4]})));}
  for(const g of game.grenades)polygons.push(...this.box(part(g.x,g.y,g.z,.16,.16,.16,'green')));this.paint(polygons);
  if(!p.dead){let weapon=p.weapon,key=[weapon.def.id,weapon.optic,weapon.barrel,weapon.grip].join('/');if(key!==this.weaponKey){this.weaponKey=key;this.weaponParts=weaponModel(weapon);}
   const ads=p.ads,reload=weapon.reloadLeft>0?Math.sin((1-weapon.reloadLeft/weapon.reloadTime)*Math.PI):0;if(menu)compose(this.parent,.52,-.04,-1.15,1.38,1.38,1.38,1.04,-.10,-.12);else compose(this.parent,lerp(.22,0,ads),lerp(-.24,-.154,ads)-reload*.16,lerp(-.5,-.34,ads)+p.visualKick*.8,1,1,1,0,reload*.58+p.sprinting*.44,-.035-reload*.24);
   const parts=[];for(const q of this.weaponParts)parts.push(...this.box(q,this.parent));if(weapon.sinceShot<.05&&weapon.barrel!==1)parts.push(...this.box(part(0,.067,-.58,.13,.13,.2,'orange',{emissive:4}),this.parent));this.fov=65*Math.PI/180;this.paint(parts,identity(),true);
  }
 }
}
