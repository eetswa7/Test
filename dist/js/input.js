import {emptyInput} from './engine.js';
import {clamp} from './math.js';
export const CONTROL_LAYOUT={fire:[.9,.52,82],ads:[.81,.32,51],reload:[.81,.77,51],jump:[.94,.87,51],crouch:[.72,.9,48],swap:[.51,.91,48],grenade:[.64,.8,48],interact:[.72,.58,48],melee:[.94,.29,44],sprint:[.12,.47,44]};
export class TouchInput {
 constructor(canvas,layer,settings){this.canvas=canvas;this.layer=layer;this.settings=settings;this.active=false;this.editing=false;this.pointers=new Map();this.keys=new Set();this.actions=emptyInput();this.holds={};this.look={x:0,y:0};this.move={x:0,z:0};this.stickID=null;this.adsToggle=false;this.sprintToggle=false;this.previousFire=false;this.gyro={x:0,y:0};this.lastGamepadButtons=[];
  this.stick=layer.querySelector('#stick');this.knob=layer.querySelector('#stick-knob');
  this.down=e=>this.pointerDown(e);this.motion=e=>this.pointerMove(e);this.up=e=>this.pointerUp(e);
  layer.addEventListener('pointerdown',this.down);layer.addEventListener('pointermove',this.motion);layer.addEventListener('pointerup',this.up);layer.addEventListener('pointercancel',this.up);layer.addEventListener('lostpointercapture',this.up);layer.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{if(!this.active||e.target.matches('input,select,textarea'))return;this.keys.add(e.code);const action={KeyR:'reload',Space:'jump',KeyC:'crouch',ControlLeft:'crouch',KeyQ:'swap',Digit1:'swap',KeyG:'grenade',KeyV:'melee'}[e.code];if(action&&!e.repeat)this.actions[action]=true;if(['Space','Tab','ControlLeft'].includes(e.code))e.preventDefault();});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  window.addEventListener('mousemove',e=>{if(this.active&&document.pointerLockElement)this.addLook(e.movementX,e.movementY);});
  window.addEventListener('mousedown',e=>{if(this.active&&document.pointerLockElement){if(e.button===0){this.holds.mouseFire=true;this.actions.firePressed=true;}if(e.button===2)this.holds.mouseADS=true;}});
  window.addEventListener('mouseup',e=>{if(e.button===0)this.holds.mouseFire=false;if(e.button===2)this.holds.mouseADS=false;});
  window.addEventListener('blur',()=>this.reset());window.addEventListener('resize',()=>{this.reset();this.layout();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  this.layout();
 }
 layout(){const box=this.layer.getBoundingClientRect(),s=this.settings;this.layer.classList.toggle('left-handed',s.leftHanded);this.layer.style.setProperty('--control-opacity',s.opacity);for(const [id,defaults]of Object.entries(CONTROL_LAYOUT)){const b=this.layer.querySelector(`[data-action="${id}"]`),custom=s.layout[id],x=clamp(custom?.x??defaults[0],.055,.945),y=clamp(custom?.y??defaults[1],.13,.91),size=defaults[2]*s.buttonScale;b.style.left=`${(s.leftHanded?1-x:x)*100}%`;b.style.top=`${y*100}%`;b.style.width=b.style.height=`${size}px`;}
  this.stick.style.left=s.leftHanded?'86%':'14%';
 }
 reset(){this.pointers.clear();this.keys.clear();this.holds={};this.actions=emptyInput();this.look.x=this.look.y=0;this.move.x=this.move.z=0;this.stickID=null;this.adsToggle=false;this.sprintToggle=false;this.previousFire=false;this.gyro.x=this.gyro.y=0;if(this.knob)this.knob.style.transform='translate(-50%,-50%)';for(const b of this.layer.querySelectorAll('.pressed'))b.classList.remove('pressed');}
 addLook(dx,dy){let mult=this.settings.sensitivity*.0027;if(this.adsToggle||this.holds.ads||this.holds.mouseADS)mult*=this.settings.adsSensitivity;if(this.settings.aimAcceleration)mult*=1+Math.min(1,Math.hypot(dx,dy)/28)*.5;this.look.x+=dx*mult;this.look.y-=dy*mult;}
 pointerDown(e){
  if(!this.active&&!this.editing)return;if(e.pointerType==='mouse'&&document.pointerLockElement)return;e.preventDefault();const button=e.target.closest('[data-action]'),action=button?.dataset.action,rect=this.layer.getBoundingClientRect();let role='look';
  if(this.editing){if(!button)return;role='edit';}
  else if(action){role=action;button.classList.add('pressed');if(action==='ads'&&this.settings.adsMode==='toggle')this.adsToggle=!this.adsToggle;else if(action==='sprint')this.sprintToggle=!this.sprintToggle;else if(action==='fire')this.actions.firePressed=true;else if(!['ads','interact'].includes(action))this.actions[action]=true;this.holds[action]=true;}
  else if(this.stickID===null&&(this.settings.leftHanded?e.clientX>rect.left+rect.width*.63:e.clientX<rect.left+rect.width*.37)){role='stick';this.stickID=e.pointerId;}
  this.layer.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{role,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,button,action});
  if(role==='stick')this.knob.style.transform='translate(-50%,-50%)';
 }
 pointerMove(e){const p=this.pointers.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(p.role==='look'||p.role==='fire')this.addLook(dx,dy);
  if(p.role==='stick'){let x=(e.clientX-p.ox)/47,z=-(e.clientY-p.oy)/47,n=Math.max(1,Math.hypot(x,z));this.move.x=x/n;this.move.z=z/n;this.knob.style.transform=`translate(calc(-50% + ${x/n*28}px),calc(-50% + ${-z/n*28}px))`;}
  if(p.role==='edit'){const b=this.layer.getBoundingClientRect();let x=clamp((e.clientX-b.left)/b.width,.055,.945),y=clamp((e.clientY-b.top)/b.height,.13,.91);this.settings.layout[p.action]={x:this.settings.leftHanded?1-x:x,y};this.layout();}
  p.x=e.clientX;p.y=e.clientY;
 }
 pointerUp(e){const p=this.pointers.get(e.pointerId);if(!p)return;this.pointers.delete(e.pointerId);if(p.role==='stick'){this.stickID=null;this.move.x=this.move.z=0;this.knob.style.transform='translate(-50%,-50%)';}if(p.action){this.holds[p.action]=[...this.pointers.values()].some(q=>q.action===p.action);p.button?.classList.remove('pressed');}}
 async enableGyro(){
  const C=globalThis.DeviceMotionEvent;if(!C)return false;
  try{if(typeof C.requestPermission==='function'&&(await C.requestPermission())!=='granted')return false;
   if(!this.gyroListening){window.addEventListener('devicemotion',e=>{if(!this.active||!this.settings.gyro)return;const r=e.rotationRate;if(!r)return;const sign=(screen.orientation?.angle??window.orientation??90)<0?-1:1,dt=Math.min(.04,(e.interval||16.7)/1000),gain=this.settings.gyroSensitivity*.01745*dt;this.gyro.x+=-(r.beta||0)*gain*sign;this.gyro.y+=(r.alpha||0)*gain*sign;});this.gyroListening=true;}return true;
  }catch{return false;}
 }
 sample(dt){const f={...this.actions};this.actions=emptyInput();f.mx=this.move.x+(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0);f.mz=this.move.z+(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0);f.lx=this.look.x+this.gyro.x;f.ly=this.look.y+this.gyro.y;this.look.x=this.look.y=this.gyro.x=this.gyro.y=0;
  f.fire=!!(this.holds.fire||this.holds.mouseFire||f.firePressed);f.ads=!!(this.adsToggle||this.holds.mouseADS||(this.settings.adsMode==='hold'&&this.holds.ads));f.sprint=this.sprintToggle||this.keys.has('ShiftLeft')||this.settings.autoSprint&&f.mz>.85;f.interact=!!(this.holds.interact||this.keys.has('KeyE'));
  const pad=navigator.getGamepads?.()?.find(p=>p?.connected);if(pad){const dead=v=>Math.abs(v)<.14?0:v;f.mx+=dead(pad.axes[0]);f.mz-=dead(pad.axes[1]);f.lx+=dead(pad.axes[2])*dt*2.8*this.settings.sensitivity;f.ly-=dead(pad.axes[3])*dt*2.4*this.settings.sensitivity;f.fire||=pad.buttons[7]?.pressed;f.ads||=pad.buttons[6]?.pressed;f.sprint||=pad.buttons[10]?.pressed;f.interact||=pad.buttons[2]?.pressed;
   for(const [i,action]of [[0,'jump'],[1,'crouch'],[2,'reload'],[3,'swap'],[4,'grenade'],[11,'melee']])if(pad.buttons[i]?.pressed&&!this.lastGamepadButtons[i])f[action]=true;this.lastGamepadButtons=pad.buttons.map(b=>b.pressed);
  }
  f.firePressed||=f.fire&&!this.previousFire;this.previousFire=f.fire;return f;
 }
}
