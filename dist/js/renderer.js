import {identity,perspective,lookAt,multiply,compose,ortho,clamp,lerp,direction,distance} from './math.js';
import {makeCube,makeCylinder,makeSphere,weaponModel,actorModel,material,part} from './geometry.js';
import * as shaders from './shaders.js';

function program(gl,vs,fs){const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);return p;}
const levels={low:{scale:.65,shadow:false,fx:64},medium:{scale:.85,shadow:true,fx:110},high:{scale:1,shadow:true,fx:180}};

class Batch {
 constructor(gl,vertices){this.gl=gl;this.count=vertices.length/8;this.capacity=4096;this.data=new Float32Array(this.capacity*24);this.used=0;this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  for(const [loc,size,offset]of [[0,3,0],[1,3,12],[2,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}
  this.instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);
  for(let c=0;c<4;c++){gl.enableVertexAttribArray(3+c);gl.vertexAttribPointer(3+c,4,gl.FLOAT,false,96,c*16);gl.vertexAttribDivisor(3+c,1);}
  for(const [loc,offset]of [[7,64],[8,80]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,4,gl.FLOAT,false,96,offset);gl.vertexAttribDivisor(loc,1);}gl.bindVertexArray(null);
 }
 add(matrix,m,alpha=1){if(this.used>=this.capacity)return;let o=this.used++*24;this.data.set(matrix,o);this.data[o+16]=m.color[0];this.data[o+17]=m.color[1];this.data[o+18]=m.color[2];this.data[o+19]=alpha;this.data[o+20]=m.rough;this.data[o+21]=m.metal;this.data[o+22]=m.pattern;this.data[o+23]=m.emissive;}
 upload(){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,this.used*24));}
 draw(){if(!this.used)return;const gl=this.gl;gl.bindVertexArray(this.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,this.count,this.used);}
 dispose(){this.gl.deleteBuffer(this.vertices);this.gl.deleteBuffer(this.instances);this.gl.deleteVertexArray(this.vao);}
}

export class Renderer {
 constructor(canvas,settings){
  this.canvas=canvas;this.settings=settings;const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!gl)throw new Error('This browser could not start 3D graphics. Close other tabs, then reload in Safari.');this.gl=gl;this.lost=false;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;window.dispatchEvent(new CustomEvent('graphicslost'));});
  canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
  this.main=program(gl,shaders.vertex,shaders.fragment);this.shadow=program(gl,shaders.shadowVertex,shaders.shadowFragment);this.sky=program(gl,shaders.skyVertex,shaders.skyFragment);
  this.uniforms=new Map();this.groups={};for(const group of ['world','actors','weapon','fx'])this.groups[group]={cube:new Batch(gl,makeCube()),cylinder:new Batch(gl,makeCylinder()),sphere:new Batch(gl,makeSphere())};
  this.shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1024,1024,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  this.shadowFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  this.hasShadow=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  this.projection=identity();this.view=identity();this.vp=identity();this.shadowVP=identity();this.shadowView=identity();this.shadowProj=identity();this.temp=identity();this.parent=identity();this.combined=identity();this.eye={x:0,y:2,z:0};this.target={x:0,y:2,z:-1};this.angle={yaw:0,pitch:0};
  this.effects=Array.from({length:220},()=>({life:0,max:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:.05,color:[1,1,1],type:'spark',yaw:0}));this.effectCursor=0;this.decals=Array.from({length:80},()=>({life:0,part:null}));this.decalCursor=0;this.cameraY=null;this.weaponKey='';this.weaponParts=[];this.renderScale=1;this.frameAverage=16.7;this.slowTime=0;this.fastTime=0;this.frames=0;this.fps=60;this.lastFPS=0;this.quality=this.chooseQuality();this.drawCalls=0;this.shadowClock=0;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
 }
 chooseQuality(){return this.settings.quality==='auto'?((navigator.hardwareConcurrency??4)>=6?'high':'medium'):this.settings.quality;}
 uniform(p,name){let key=`${p===this.main?'m':p===this.sky?'k':'s'}:${name}`;if(!this.uniforms.has(key))this.uniforms.set(key,this.gl.getUniformLocation(p,name));return this.uniforms.get(key);}
 setArena(arena){this.arena=arena;this.buildWorld();this.cameraY=null;this.effects.forEach(e=>e.life=0);this.decals.forEach(e=>e.life=0);}
 clear(group){for(const b of Object.values(this.groups[group]))b.used=0;}
 add(group,p,parent=null,alpha=1){compose(this.temp,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0);let m=this.temp;if(parent){multiply(this.combined,parent,this.temp);m=this.combined;}this.groups[group][p.mesh??'cube'].add(m,material(p),alpha);}
 upload(group){for(const b of Object.values(this.groups[group]))b.upload();}
 draw(group){for(const b of Object.values(this.groups[group])){if(b.used)this.drawCalls++;b.draw();}}
 buildWorld(){this.clear('world');for(const p of [...this.arena.blocks,...this.arena.decor])if(!p.destroyed)this.add('world',p);this.upload('world');}
 resize(){const q=levels[this.quality]??levels.medium,ratio=Math.min(window.devicePixelRatio||1,1.75)*q.scale*this.renderScale;const w=Math.max(2,Math.floor(this.canvas.clientWidth*ratio)),h=Math.max(2,Math.floor(this.canvas.clientHeight*ratio));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}return w/h;}
 particle(p,type,color,size,life,vx=0,vy=0,vz=0){const limit=levels[this.quality].fx,e=this.effects[this.effectCursor++%limit];Object.assign(e,{x:p.x,y:p.y,z:p.z,type,size,life,max:life,vx,vy,vz,yaw:Math.random()*6.28});e.color[0]=color[0];e.color[1]=color[1];e.color[2]=color[2];}
 events(events,game){for(const e of events){const p=e.position??game.eye(game.player);
  if(e.type==='shot'){
   if(e.source!==0){let n=Math.hypot(e.end.x-p.x,e.end.y-p.y,e.end.z-p.z);for(let i=1;i<=3;i++){let t=i*.17;this.particle({x:lerp(p.x,e.end.x,t),y:lerp(p.y,e.end.y,t),z:lerp(p.z,e.end.z,t)},'spark',[1,.79,.39],.045,.065);}}
   if(e.source===0){const a=game.player,d=direction(a.yaw),right={x:Math.cos(a.yaw),z:Math.sin(a.yaw)};this.particle({x:p.x+d.x*.5+right.x*.22,y:p.y-.13,z:p.z+d.z*.5+right.z*.22},'shell',[.68,.48,.18],.055,1.4,right.x*2,1.4,right.z*2);}
  }
  if(e.type==='impact'){for(let i=0;i<e.value;i++)this.particle(p,'spark',e.surface==='steel'||e.surface==='rust'?[1,.65,.22]:[.63,.57,.45],.026+Math.random()*.025,.2+Math.random()*.2,(Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2);
   const n=e.normal,d=this.decals[this.decalCursor++%this.decals.length];d.life=25;d.part=part(p.x+n.x*.012,p.y+n.y*.012,p.z+n.z*.012,n.x?.008:.06,n.y?.008:.06,n.z?.008:.06,'dark',{color:[.12,.105,.087]});
  }
  if(e.type==='blood')for(let i=0;i<e.value;i++)this.particle(p,'blood',[.36,.045,.028],.034,.3,(Math.random()-.5)*1.5,Math.random(),(Math.random()-.5)*1.5);
  if(e.type==='explosion'){this.buildWorld();for(let i=0;i<32;i++){const t=Math.random()*Math.PI*2,s=Math.random()*6;this.particle(p,i<16?'fire':'dust',i<16?[1,.32,.04]:[.24,.23,.21],i<16?.25:.4,.4+Math.random()*1.1,Math.cos(t)*s,Math.random()*5,Math.sin(t)*s);}}
  if(e.type==='flash')this.particle(p,'fire',[1,1,.9],.7,.12);
 }}
 updateEffects(dt,game){this.clear('fx');for(const e of this.effects){if(e.life<=0)continue;e.life-=dt;if(e.life<=0)continue;e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;if(e.type!=='dust')e.vy-=dt*8;if(e.y<.03){e.y=.03;e.vy=0;e.vx*=.8;e.vz*=.8;}const t=1-e.life/e.max,size=e.size*(e.type==='fire'||e.type==='dust'?1+t*3:1);this.add('fx',part(e.x,e.y,e.z,size,e.type==='shell'?size*.4:size,e.type==='shell'?size*.4:size,'dark',{color:e.color,mesh:e.type==='fire'||e.type==='dust'?'sphere':'cube',emissive:e.type==='fire'||e.type==='spark'?3:0,yaw:e.yaw,pitch:e.type==='shell'?game.time*8:0}),null,Math.min(1,e.life*6));}
  for(const d of this.decals){if(d.life>0){d.life-=dt;this.add('fx',d.part,null,Math.min(1,d.life));}}
  for(const g of game.grenades)this.add('fx',part(g.x,g.y,g.z,.14,.17,.14,'green',{mesh:'sphere'}));
  for(const s of game.smokes){let r=Math.min(5.2,s.age*4),alpha=Math.min(.65,s.age)*clamp((16-s.age)/3,0,1);for(let i=0;i<8;i++){let angle=i*2.399;this.add('fx',part(s.x+Math.sin(angle)*r*.35,s.y+1.2+(i%3)*.55,s.z+Math.cos(angle)*r*.35,r*1.1,3.1,r*1.1,'concrete',{mesh:'sphere',color:[.43,.46,.45]}),null,alpha);}}
  this.upload('fx');
 }
 lighting(viewModel=false){const gl=this.gl,p=this.main,i=this.arena.info;gl.useProgram(p);gl.uniformMatrix4fv(this.uniform(p,'uVP'),false,this.vp);gl.uniformMatrix4fv(this.uniform(p,'uShadow'),false,this.shadowVP);gl.uniform3f(this.uniform(p,'uEye'),this.eye.x,this.eye.y,this.eye.z);gl.uniform3fv(this.uniform(p,'uSun'),i.sun);gl.uniform3fv(this.uniform(p,'uSky'),i.sky);gl.uniform3fv(this.uniform(p,'uFog'),i.fog);gl.uniform1f(this.uniform(p,'uShadowOn'),this.hasShadow&&levels[this.quality].shadow?1:0);gl.uniform1f(this.uniform(p,'uViewModel'),viewModel?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.uniform(p,'uDepth'),0);}
 render(game,dt,menu=false){
  if(this.lost)return;this.frames++;this.lastFPS+=dt;if(this.lastFPS>=.6){this.fps=Math.round(this.frames/this.lastFPS);this.frames=0;this.lastFPS=0;}
  this.frameAverage=lerp(this.frameAverage,Math.min(dt*1000,100),.02);
  if(!menu){this.slowTime=this.frameAverage>21?this.slowTime+dt:Math.max(0,this.slowTime-dt);this.fastTime=this.frameAverage<17.4?this.fastTime+dt:0;
   if(this.slowTime>4){this.renderScale=Math.max(.58,this.renderScale-.1);if(this.renderScale<.65&&this.quality==='high')this.quality='medium';this.slowTime=0;}
   if(this.fastTime>15&&this.renderScale<1){this.renderScale=Math.min(1,this.renderScale+.05);this.fastTime=0;}
  }
  const gl=this.gl,aspect=this.resize(),p=game.player;this.drawCalls=0;
  let fov=(this.settings.fov??80)*Math.PI/180,yaw=p.yaw,pitch=p.pitch;
  if(menu){const t=game.time*.04;this.eye.x=15+Math.sin(t)*2;this.eye.y=6.5;this.eye.z=25;this.target={x:-4,y:2,z:-8};yaw=Math.atan2(this.target.x-this.eye.x,-(this.target.z-this.eye.z));pitch=Math.atan2(this.target.y-this.eye.y,distance(this.eye,this.target));fov=65*Math.PI/180;}
  else{
   const eye=game.eye(p),speed=Math.hypot(p.vx,p.vz),bob=this.settings.motion!==false&&p.grounded?Math.sin(game.time*speed*2.8)*Math.min(.023,speed*.006)*lerp(1,.25,p.ads):0;
   if(this.cameraY===null)this.cameraY=eye.y;this.cameraY=lerp(this.cameraY,eye.y,clamp(dt*18,0,1));this.eye.x=eye.x;this.eye.y=this.cameraY+bob-p.landKick-(p.dead?Math.min(1.2,(3-p.respawnLeft)*.9):0);this.eye.z=eye.z;
   pitch+=this.settings.motion!==false?p.visualKick*.12:0;const d=direction(yaw,pitch);this.target.x=this.eye.x+d.x;this.target.y=this.eye.y+d.y;this.target.z=this.eye.z+d.z;
   fov=lerp(fov,(p.weapon.optic===3||p.weapon.def.id===7?30:58)*Math.PI/180,p.ads);
  }
  if(!menu)fov=2*Math.atan(Math.tan(fov/2)/aspect);
  perspective(this.projection,fov,aspect);lookAt(this.view,this.eye,this.target);multiply(this.vp,this.projection,this.view);
  this.clear('actors');for(const a of game.actors){if(a.id===0||distance(a,p)>85)continue;const death=a.dead?Math.min(1,(3-a.respawnLeft)*2):0;compose(this.parent,a.x,a.y+death*.2,a.z,1,1,1,-a.yaw,0,death*1.5);for(const q of actorModel(a,game.time))this.add('actors',q,this.parent);}
  if(game.rules.mode.id==='domination'||game.rules.mode.id==='sabotage')for(let index=0;index<game.rules.points.length;index++){if(game.rules.mode.id==='sabotage'&&index===1)continue;const point=game.rules.points[index],color=point.owner===0?[.1,.65,.69]:point.owner===1?[.9,.28,.08]:[.75,.69,.42];this.add('actors',part(point.x,.02,point.z,5,.025,5,'dark',{color,emissive:.3}));this.add('actors',part(point.x,1,point.z,.045,2,.045,'steel'));this.add('actors',part(point.x+.35,1.65,point.z,.7,.45,.03,'dark',{color,emissive:.4}));}
  this.upload('actors');this.updateEffects(dt,game);
  // One directional shadow map, updated at 30 Hz. Static geometry is already batched.
  const sun=this.arena.info.sun,cx=Math.round(this.eye.x/4)*4,cz=Math.round(this.eye.z/4)*4;
  this.shadowClock+=dt;if(this.hasShadow&&levels[this.quality].shadow&&this.shadowClock>=1/30){this.shadowClock=0;lookAt(this.shadowView,{x:cx+sun[0]*65,y:55,z:cz+sun[2]*65},{x:cx,y:0,z:cz});ortho(this.shadowProj,42,1,140);multiply(this.shadowVP,this.shadowProj,this.shadowView);gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.viewport(0,0,1024,1024);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.shadow);gl.uniformMatrix4fv(this.uniform(this.shadow,'uVP'),false,this.shadowVP);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,2);this.draw('world');this.draw('actors');gl.disable(gl.POLYGON_OFFSET_FILL);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(...this.arena.info.fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.useProgram(this.sky);gl.bindVertexArray(null);gl.uniform3fv(this.uniform(this.sky,'uSky'),this.arena.info.sky);gl.uniform3fv(this.uniform(this.sky,'uFog'),this.arena.info.fog);gl.uniform3fv(this.uniform(this.sky,'uSun'),this.arena.info.sun);gl.uniform2f(this.uniform(this.sky,'uAngle'),yaw,pitch);gl.uniform2f(this.uniform(this.sky,'uLens'),aspect,Math.tan(fov/2));gl.uniform1f(this.uniform(this.sky,'uTime'),game.time);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);
  this.lighting();this.draw('world');this.draw('actors');
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);this.draw('fx');gl.depthMask(true);gl.disable(gl.BLEND);
  if(!this.worldVP)this.worldVP=identity();this.worldVP.set(this.vp);
  if(!p.dead)this.renderWeapon(game,aspect,menu);
 }
 renderWeapon(game,aspect,menu){
  const gl=this.gl,p=game.player,w=p.weapon,key=[w.def.id,w.optic,w.barrel,w.grip].join('/');if(key!==this.weaponKey){this.weaponKey=key;this.weaponParts=weaponModel(w);}
  this.clear('weapon');let ads=p.ads,speed=Math.hypot(p.vx,p.vz),bob=this.settings.motion!==false?Math.sin(game.time*speed*2.8)*Math.min(.014,speed*.005)*(1-ads):0,reload=w.reloadLeft>0?Math.sin(clamp(1-w.reloadLeft/w.reloadTime,0,1)*Math.PI):0;
  if(menu)compose(this.parent,.52,-.04,-1.15,1.38,1.38,1.38,1.04,-.10,-.12);
  else compose(this.parent,lerp(.22,0,ads),lerp(-.24,-.154,ads)+bob-reload*.16-p.switchLeft*.5,lerp(-.5,-.34,ads)+p.visualKick*.8,1,1,1,0,reload*.58+p.sprinting*.44,lerp(-.035,0,ads)-reload*.24);
  for(const q of this.weaponParts)this.add('weapon',q,this.parent);
  if(w.sinceShot<.05&&w.def.id!==12&&w.barrel!==1){const muzzle=w.def.kind==='PISTOL'?-.39:w.def.kind==='SNIPER'?-.59:w.def.kind==='SMG'?-.45:-.52;this.add('weapon',part(0,.067,muzzle,.12,.12,.21,'orange',{mesh:'sphere',emissive:5,color:[1,.62,.15]}),this.parent);}
  this.upload('weapon');gl.clear(gl.DEPTH_BUFFER_BIT);perspective(this.projection,65*Math.PI/180,aspect,.025,12);this.vp.set(this.projection);this.eye.x=this.eye.y=this.eye.z=0;this.lighting(true);this.draw('weapon');
 }
 project(point){const m=this.worldVP??this.vp,x=point.x,y=point.y,z=point.z,w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;return{x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w*.5+.5,y:.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*.5};}
}
