import {emptyInput} from './engine.js?v=6';
import {clamp} from './math.js?v=6';

export const CONTROL_LAYOUT={fire:[.87,.68,88],ads:[.91,.40,56],reload:[.36,.90,50],jump:[.70,.81,54],crouch:[.70,.9,48],swap:[.49,.9,50],grenade:[.72,.48,48],interact:[.60,.53,56],melee:[.94,.26,44],sprint:[.13,.43,44]};
const ADVANCED_LAYOUT={...CONTROL_LAYOUT,fire:[.9,.57,82],ads:[.81,.31,52],reload:[.81,.8,51],jump:[.94,.88,51],crouch:[.7,.9,48],grenade:[.65,.72,48],swap:[.51,.91,48],interact:[.7,.51,48]};
const simpleHidden=new Set(['crouch','melee','sprint']);
const TAP_SLOP=9;

export class TouchInput {
 constructor(canvas,layer,settings){
  this.canvas=canvas;this.layer=layer;this.settings=settings;this.active=false;this.editing=false;
  this.pointers=new Map();this.keys=new Set();this.actions=emptyInput();this.holds={};this.look={x:0,y:0};this.move={x:0,z:0};
  this.stickID=null;this.adsToggle=false;this.sprintToggle=false;this.previousFire=false;this.gyro={x:0,y:0};this.lastGamepadButtons=[];this.contextAvailable=false;
  this.stick=layer.querySelector('#stick');this.knob=layer.querySelector('#stick-knob');
  for(const [name,fn]of [['pointerdown',e=>this.pointerDown(e)],['pointermove',e=>this.pointerMove(e)],['pointerup',e=>this.pointerUp(e)],['pointercancel',e=>this.pointerUp(e,true)],['lostpointercapture',e=>this.pointerUp(e,true)]])layer.addEventListener(name,fn,{passive:false});
  layer.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener?.('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{if(!this.active||e.target.matches('input,select,textarea'))return;this.keys.add(e.code);const action={KeyR:'reload',Space:'jump',KeyC:'crouch',ControlLeft:'crouch',KeyQ:'swap',Digit1:'swap',KeyG:'grenade',KeyV:'melee'}[e.code];if(action&&!e.repeat)this.actions[action]=true;if(['Space','Tab','ControlLeft'].includes(e.code))e.preventDefault();});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  window.addEventListener('mousemove',e=>{if(this.active&&document.pointerLockElement)this.addLook(e.movementX,e.movementY);});
  window.addEventListener('mousedown',e=>{if(this.active&&document.pointerLockElement){if(e.button===0){this.holds.mouseFire=true;this.actions.firePressed=true;}if(e.button===2)this.holds.mouseADS=true;}});
  window.addEventListener('mouseup',e=>{if(e.button===0)this.holds.mouseFire=false;if(e.button===2)this.holds.mouseADS=false;});
  window.addEventListener('blur',()=>this.reset());window.addEventListener('resize',()=>{this.reset();this.layout();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});this.layout();
 }
 get simple(){return this.settings.controlProfile!=='advanced';}
 layout(){
  const s=this.settings,box=this.layer.getBoundingClientRect();this.layer.classList.toggle('left-handed',!!s.leftHanded);this.layer.classList.toggle('simple-controls',this.simple);this.layer.style.setProperty('--control-opacity',s.opacity);
  for(const [id,defaults]of Object.entries(this.simple?CONTROL_LAYOUT:ADVANCED_LAYOUT)){
   const b=this.layer.querySelector(`[data-action="${id}"]`),custom=s.layout?.[id];
   const size=defaults[2]*(s.buttonScale??1),xm=Math.max(.055,(size/2+8)/(box.width||844)),ym=Math.max(.08,(size/2+8)/(box.height||390));const x=clamp(custom?.x??defaults[0],xm,1-xm),y=clamp(custom?.y??defaults[1],Math.max(.13,ym),Math.min(.91,1-ym));
   b.style.left=`${(s.leftHanded?1-x:x)*100}%`;b.style.top=`${y*100}%`;b.style.width=b.style.height=`${size}px`;
   b.hidden=(this.mode==='gun'&&['swap','grenade','melee'].includes(id))||this.simple&&simpleHidden.has(id)||id==='interact'&&!this.contextAvailable&&!this.editing;
  }
  this.stick.style.left=s.leftHanded?'85%':'15%';
  const fireLabel=this.layer.querySelector('[data-action="fire"] span');if(fireLabel)fireLabel.textContent=this.simple&&s.aimFire!==false?'AIM + FIRE':'FIRE';
 }
 setContext(available){if(available===this.contextAvailable)return;this.contextAvailable=available;this.layer.querySelector('[data-action="interact"]').hidden=!available&&!this.editing;}
 reset(){
  this.pointers.clear();this.keys.clear();this.holds={};this.actions=emptyInput();this.look.x=this.look.y=0;this.move.x=this.move.z=0;this.stickID=null;this.adsToggle=false;this.sprintToggle=false;this.previousFire=false;this.lastGamepadButtons=[];this.gyro.x=this.gyro.y=0;
  if(this.knob)this.knob.style.transform='translate(-50%,-50%)';for(const b of this.layer.querySelectorAll('.pressed'))b.classList.remove('pressed');
 }
 isAiming(){return this.adsToggle||this.holds.mouseADS||(this.settings.adsMode==='hold'&&this.holds.ads)||(this.simple&&this.settings.aimFire!==false&&this.holds.fire);}
 addLook(dx,dy){
  let mult=this.settings.sensitivity*.0027;if(this.isAiming())mult*=this.settings.adsSensitivity*(this.scopeScale??1);
  if(this.settings.aimAcceleration)mult*=1+Math.min(1,Math.hypot(dx,dy)/28)*.5;
  this.look.x+=clamp(dx,-180,180)*mult;this.look.y-=clamp(dy,-180,180)*mult;
 }
 pointerDown(e){
  if(!this.active&&!this.editing)return;if(e.pointerType==='mouse'&&document.pointerLockElement)return;e.preventDefault();
  const button=e.target.closest('[data-action]'),action=button?.dataset.action,rect=this.layer.getBoundingClientRect();let role='look';
  if(this.editing){if(!button||button.hidden)return;role='edit';}
  else if(action){
   if(button.hidden)return;role=action;button.classList.add('pressed');
   if(action==='ads'&&this.settings.adsMode==='toggle')this.adsToggle=!this.adsToggle;
   else if(action==='sprint')this.sprintToggle=!this.sprintToggle;
   else if(action==='fire')this.actions.firePressed=true;
   else if(!(action==='jump'&&this.simple)&&!['ads','interact'].includes(action))this.actions[action]=true;
   this.holds[action]=true;
  }else if(this.stickID===null&&(this.settings.leftHanded?e.clientX>rect.left+rect.width*.55:e.clientX<rect.left+rect.width*.45)){role='stick';this.stickID=e.pointerId;}
  // Capture each contact separately: leaving a button must not drop a held shot.
  this.layer.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{role,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,button,action,age:0,held:false});
 }
 pointerMove(e){
  const p=this.pointers.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(['look','fire','ads'].includes(p.role))this.addLook(dx,dy);
  if(p.role==='stick'){
   let x=(e.clientX-p.ox)/45,z=-(e.clientY-p.oy)/45,n=Math.max(1,Math.hypot(x,z));
   this.move.x=x/n;this.move.z=z/n;this.knob.style.transform=`translate(calc(-50% + ${x/n*28}px),calc(-50% + ${-z/n*28}px))`;
  }
  if(p.role==='edit'){
   const b=this.layer.getBoundingClientRect(),x=clamp((e.clientX-b.left)/b.width,.055,.945),y=clamp((e.clientY-b.top)/b.height,.13,.91);
   this.settings.layout[p.action]={x:this.settings.leftHanded?1-x:x,y};this.layout();
  }
  p.x=e.clientX;p.y=e.clientY;
 }
 pointerUp(e,cancelled=false){
  const p=this.pointers.get(e.pointerId);if(!p)return;
  if(!cancelled&&p.role==='jump'&&this.simple&&!p.held&&Math.hypot(p.x-p.ox,p.y-p.oy)<TAP_SLOP*3)this.actions[this.crouched?'crouch':'jump']=true;
  this.pointers.delete(e.pointerId);
  if(p.role==='stick'){this.stickID=null;this.move.x=this.move.z=0;this.knob.style.transform='translate(-50%,-50%)';}
  if(p.action){this.holds[p.action]=false;for(const q of this.pointers.values())if(q.action===p.action)this.holds[p.action]=true;p.button?.classList.remove('pressed');}
  if(cancelled&&p.action==='ads')this.adsToggle=false;
  if(cancelled&&p.action==='fire'&&!this.holds.fire)this.actions.firePressed=false;
 }
 async enableGyro(){
  const C=globalThis.DeviceMotionEvent;if(!C)return false;
  try{if(typeof C.requestPermission==='function'&&(await C.requestPermission())!=='granted')return false;
   if(!this.gyroListening){window.addEventListener('devicemotion',e=>{if(!this.active||!this.settings.gyro)return;const r=e.rotationRate;if(!r)return;const sign=(screen.orientation?.angle??window.orientation??90)<0?-1:1,dt=Math.min(.04,(e.interval||16.7)/1000),gain=this.settings.gyroSensitivity*.01745*dt;this.gyro.x+=-(r.beta||0)*gain*sign;this.gyro.y+=(r.alpha||0)*gain*sign;});this.gyroListening=true;}return true;
  }catch{return false;}
 }
 sample(dt){
  for(const p of this.pointers.values())if(p.role==='jump'&&this.simple&&!p.held){p.age+=dt;if(p.age>.34){p.held=true;this.actions.crouch=true;}}
  const f={...this.actions};this.actions=emptyInput();
  f.mx=this.move.x+(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0);f.mz=this.move.z+(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0);
  f.fire=!!(this.holds.fire||this.holds.mouseFire||f.firePressed);f.ads=!!this.isAiming();
  const aimGain=f.ads?this.settings.adsSensitivity*(this.scopeScale??1):1;
  f.lx=this.look.x+this.gyro.x*aimGain;f.ly=this.look.y+this.gyro.y*aimGain;this.look.x=this.look.y=this.gyro.x=this.gyro.y=0;
  f.sprint=this.sprintToggle||this.keys.has('ShiftLeft')||this.settings.autoSprint&&f.mz>.87;f.interact=!!(this.holds.interact||this.keys.has('KeyE'));
  f.repeatFire=this.simple&&!!this.holds.fire;f.autoReload=this.settings.autoReload!==false;
  const pad=navigator.getGamepads?.()?.find(p=>p?.connected);
  if(pad){
   const dead=v=>Number.isFinite(v)&&Math.abs(v)>.14?v:0;
   f.mx+=dead(pad.axes[0]);f.mz-=dead(pad.axes[1]);f.ads||=!!pad.buttons[6]?.pressed;
   const gain=f.ads?this.settings.adsSensitivity*(this.scopeScale??1):1;
   f.lx+=dead(pad.axes[2])*dt*2.8*this.settings.sensitivity*gain;f.ly-=dead(pad.axes[3])*dt*2.4*this.settings.sensitivity*gain;
   f.fire||=!!pad.buttons[7]?.pressed;f.sprint||=!!pad.buttons[10]?.pressed;f.interact||=!!pad.buttons[2]?.pressed;
   for(const [i,action]of [[0,'jump'],[1,'crouch'],[2,'reload'],[3,'swap'],[4,'grenade'],[11,'melee']])if(pad.buttons[i]?.pressed&&!this.lastGamepadButtons[i])f[action]=true;
   this.lastGamepadButtons=pad.buttons.map(b=>b.pressed);
  }
  f.firePressed||=f.fire&&!this.previousFire;this.previousFire=f.fire;return f;
 }
}
