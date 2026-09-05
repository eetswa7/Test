import { Simulation, WORLD, MISSIONS, WEAPONS, random, clamp, distance } from './engine.js';

const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false}),radar=$('radar'),rc=radar.getContext('2d');
const SAVE_KEY='nightwatch-v2', defaults={sound:true,quality:'auto',motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,leftHanded:false};
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');return{settings:{...defaults,...s.settings},best:s.best||{},stars:s.stars||{},career:Number(s.career)||0,kit:s.kit||'balanced'};}catch{return{settings:{...defaults},best:{},stars:{},career:0,kit:'balanced'};}}
let save=loadSave(),settings=save.settings;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{toast('Progress cannot be saved in this browser session.');}}
let sim=new Simulation(0),selectedMission=0,phase='menu',mode=0,zoom=1,w=0,h=0,dpr=1,scale=1,last=0,hudTick=0,radarTick=0,frameTime=16,qualityScale=1;
let camera={x:1110,y:825},pan={x:0,y:0},particles=[],rings=[],floating=[],shake=0,flash=0,radioUntil=0,toastTimer=0,resultSaved=false,menuTime=0,tutorialTime=0;
let modalBack=null,returnFocus=null,manualCameraUntil=0,keys=new Set(),firePointers=new Set(),stickPointer=null,viewPointers=new Map(),dragOrigin=null,pinchDistance=0;
const palettes=[{ground:'#263035',noise:'#a8b0aa',field:'#303c3c',field2:'#202b2e',road:'#505956',edge:'#788078',roof:'#747e75',roof2:'#5a675f',shadow:'#101a1e',tree:'#374843',water:'#131f27',line:'#86938b',hot:'#edf4dd'},
{ground:'#bbc4bb',noise:'#1c3635',field:'#abb8ac',field2:'#c6cfc1',road:'#87938a',edge:'#5d6e66',roof:'#52655f',roof2:'#6c7e72',shadow:'#d5ddca',tree:'#99a797',water:'#d2dbd0',line:'#5c7166',hot:'#0b151c'},
{ground:'#152b22',noise:'#759879',field:'#213d29',field2:'#10291f',road:'#355c3c',edge:'#709264',roof:'#5b814f',roof2:'#405f3d',shadow:'#081a16',tree:'#20442d',water:'#091d19',line:'#89a477',hot:'#d6ffb6'}];
let terrain=document.createElement('canvas');terrain.width=WORLD.w;terrain.height=WORLD.h;
const tc=terrain.getContext('2d',{alpha:false}),buildings=[];
function path(c,pts){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));}
function terrainBuild(){
 const r=random(130703),p=palettes[mode];buildings.length=0;tc.fillStyle=p.ground;tc.fillRect(0,0,WORLD.w,WORLD.h);
 // Cached terrain: fields, ridge contours, a river and village blocks.
 for(let i=0;i<100;i++){const x=r()*WORLD.w,y=r()*WORLD.h,rad=80+r()*230;const g=tc.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,i%2?p.field:p.field2);g.addColorStop(1,p.ground);tc.fillStyle=g;tc.globalAlpha=.45;tc.fillRect(x-rad,y-rad,rad*2,rad*2);}tc.globalAlpha=1;
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){
  let x=120+col*445+r()*80,y=100+row*350+r()*50;if(col===2&&row>0&&row<4)continue;
  const fw=180+r()*110,fh=90+r()*100;tc.save();tc.translate(x,y);tc.rotate((r()-.5)*.25);tc.fillStyle=r()>.5?p.field:p.field2;tc.fillRect(0,0,fw,fh);tc.strokeStyle=p.line;tc.globalAlpha=.14;tc.lineWidth=1;for(let a=5;a<fh;a+=7){tc.beginPath();tc.moveTo(2,a);tc.lineTo(fw-2,a);tc.stroke();}tc.globalAlpha=.3;tc.strokeRect(0,0,fw,fh);tc.restore();
 }
 tc.strokeStyle=p.line;tc.globalAlpha=.10;tc.lineWidth=1;for(let j=0;j<11;j++){tc.beginPath();for(let i=0;i<=120;i++){const x=i*22,y=1450+j*22+Math.sin(x*.005+j*.08)*75+Math.cos(x*.011)*25;i?tc.lineTo(x,y):tc.moveTo(x,y);}tc.stroke();}tc.globalAlpha=1;
 tc.strokeStyle=p.water;tc.lineWidth=98;tc.beginPath();tc.moveTo(1650,-60);tc.bezierCurveTo(1670,210,2020,160,2000,510);tc.bezierCurveTo(1980,690,2260,620,2480,740);tc.stroke();tc.strokeStyle=p.edge;tc.globalAlpha=.3;tc.lineWidth=1;for(let j=0;j<5;j++){tc.beginPath();tc.moveTo(1650+j*8,-60);tc.bezierCurveTo(1670+j*8,210,2020+j*8,160,2000+j*8,510);tc.bezierCurveTo(1980+j*8,690,2260+j*8,620,2480,740+j*8);tc.stroke();}tc.globalAlpha=1;
 const roads=[];let highway=[];for(let x=-50;x<=WORLD.w+50;x+=12)highway.push([x,930+Math.sin((x-390)/290)*65]);roads.push([highway,42]);
 roads.push([[[290,-20],[370,430],[780,610],[1170,870],[1360,1220],[1450,1820]],27]);roads.push([[[620,1820],[650,1330],[800,1120],[990,620],[1150,270],[1220,-40]],22]);roads.push([[[990,620],[1380,600],[1720,1050],[1950,1300],[2440,1380]],23]);
 for(const [points,width]of roads){path(tc,points);tc.strokeStyle=p.shadow;tc.lineWidth=width+10;tc.lineJoin='round';tc.stroke();tc.strokeStyle=p.road;tc.lineWidth=width;tc.stroke();tc.strokeStyle=p.edge;tc.lineWidth=1;tc.setLineDash(width>35?[12,16]:[]);tc.globalAlpha=.6;tc.stroke();tc.globalAlpha=1;tc.setLineDash([]);}
 const clusters=[[1060,690,5,4],[610,1150,3,3],[1470,1000,4,3],[560,420,3,3],[1750,1270,3,2],[1390,460,3,2]];
 for(const [cx,cy,cols,rows]of clusters){
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   if(r()<.13)continue;const x=cx+(col-cols/2)*94,y=cy+(row-rows/2)*89,bw=30+r()*32,bh=28+r()*30,rot=(r()-.5)*.12;
   buildings.push({x,y,w:bw,h:bh,rot});tc.save();tc.translate(x,y);tc.rotate(rot);
   tc.fillStyle=p.shadow;tc.fillRect(-bw/2+11,-bh/2+17,bw+2,bh+3);
   tc.strokeStyle=p.edge;tc.globalAlpha=.28;tc.lineWidth=2;tc.strokeRect(-bw/2-10,-bh/2-10,bw+20,bh+20);tc.globalAlpha=1;
   tc.fillStyle=p.roof2;tc.fillRect(-bw/2,-bh/2,bw,bh);tc.fillStyle=p.roof;tc.fillRect(-bw/2,-bh/2,bw*.5,bh);
   tc.strokeStyle=p.edge;tc.lineWidth=1;tc.strokeRect(-bw/2,-bh/2,bw,bh);tc.beginPath();tc.moveTo(0,-bh/2);tc.lineTo(0,bh/2);tc.stroke();
   tc.fillStyle=p.shadow;tc.globalAlpha=.4;for(let n=0;n<3;n++)tc.fillRect(-bw/2+5+n*11,bh/2-4,5,3);tc.globalAlpha=1;
   if(r()>.6){tc.fillStyle=p.roof2;tc.fillRect(bw/2-13,-bh/2+5,8,9);tc.strokeStyle=p.edge;tc.strokeRect(bw/2-13,-bh/2+5,8,9);}tc.restore();
  }
 }
 // Storage tanks, solar rows and a landing pad provide recognisable landmarks.
 for(let i=0;i<4;i++){let x=1525+(i%2)*57,y=520+Math.floor(i/2)*57;tc.fillStyle=p.shadow;tc.beginPath();tc.ellipse(x+10,y+12,22,21,0,0,Math.PI*2);tc.fill();tc.fillStyle=p.roof2;tc.beginPath();tc.arc(x,y,22,0,Math.PI*2);tc.fill();tc.strokeStyle=p.edge;tc.lineWidth=2;tc.stroke();tc.beginPath();tc.arc(x,y,17,0,Math.PI*2);tc.stroke();}
 for(let row=0;row<4;row++)for(let col=0;col<7;col++){tc.fillStyle=p.shadow;tc.fillRect(320+col*26,1190+row*18,21,12);tc.strokeStyle=p.edge;tc.globalAlpha=.25;tc.strokeRect(320+col*26,1190+row*18,21,12);tc.globalAlpha=1;}
 tc.strokeStyle=p.edge;tc.globalAlpha=.5;tc.lineWidth=2;tc.beginPath();tc.arc(1510,980,48,0,Math.PI*2);tc.stroke();tc.font='38px monospace';tc.textAlign='center';tc.fillStyle=p.edge;tc.fillText('H',1510,994);tc.globalAlpha=1;
 for(let i=0;i<950;i++){const x=r()*WORLD.w,y=r()*WORLD.h,rr=3+r()*12;if(Math.abs(y-(930+Math.sin((x-390)/290)*65))<38||buildings.some(b=>Math.abs(b.x-x)<45&&Math.abs(b.y-y)<45))continue;tc.fillStyle=p.shadow;tc.globalAlpha=.6;tc.beginPath();tc.ellipse(x+4,y+6,rr,rr*.8,0,0,Math.PI*2);tc.fill();tc.fillStyle=p.tree;tc.globalAlpha=1;tc.beginPath();tc.arc(x,y,rr,0,Math.PI*2);tc.fill();tc.fillStyle=p.edge;tc.globalAlpha=.16;tc.beginPath();tc.arc(x-rr*.25,y-rr*.25,rr*.65,0,Math.PI*2);tc.fill();tc.globalAlpha=1;}
 tc.fillStyle=p.noise;tc.globalAlpha=.085;for(let i=0;i<28000;i++)tc.fillRect(r()*WORLD.w,r()*WORLD.h,r()>.9?3:1,1);tc.globalAlpha=1;
}

class Sound {
 constructor(){this.ctx=null;this.master=null;this.noise=null;this.bed=null;}
 unlock(){if(!settings.sound)return;try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.6;this.master.connect(this.ctx.destination);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=47;g.gain.value=0;o.connect(g).connect(this.master);o.start();this.bed=g;}this.ctx.resume().catch(()=>{});}catch{settings.sound=false;}}
 active(on){if(this.bed&&this.ctx)this.bed.gain.setTargetAtTime(on&&settings.sound?.025:0,this.ctx.currentTime,.35);}
 setMuted(){if(this.master&&this.ctx)this.master.gain.setTargetAtTime(settings.sound?.6:0,this.ctx.currentTime,.1);}
 tone(freq,dur=.08,vol=.04,end=freq){if(!this.ctx||!settings.sound)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(10,end),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(this.master);o.start(t);o.stop(t+dur+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 blast(i,impact=false){if(!this.ctx||!settings.sound)return;const t=this.ctx.currentTime,n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();const dur=impact?[.09,.25,.65,.8][i]:[.065,.16,.35,.5][i];n.buffer=this.noise;f.type='lowpass';f.frequency.setValueAtTime(impact?700:1800,t);f.frequency.exponentialRampToValueAtTime(90,t+dur);g.gain.setValueAtTime((impact?.055:.07)*(i+1),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);n.connect(f).connect(g).connect(this.master);n.start(t);n.stop(t+dur+.02);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};this.tone(impact?70:150-i*25,dur,.04+i*.025,25);}
}
const audio=new Sound();

function resize(){w=canvas.clientWidth;h=canvas.clientHeight;dpr=Math.min(window.devicePixelRatio||1,settings.quality==='eco'?1.25:2)*qualityScale;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);scale=Math.min(w,h)/560*zoom;cameraClamp();}
function anchor(){return{x:w*.5,y:h*(w>h?.51:.46)};}
function cameraClamp(){camera.x=clamp(camera.x,40,WORLD.w-40);camera.y=clamp(camera.y,40,WORLD.h-40);}
function worldAt(x,y){const a=anchor();return{x:camera.x+(x-a.x)/scale,y:camera.y+(y-a.y)/scale};}
function screenAt(x,y){const a=anchor();return{x:(x-camera.x)*scale+a.x,y:(y-camera.y)*scale+a.y};}
function setZoom(value){zoom=clamp(value,.65,2.5);scale=Math.min(w,h)/560*zoom;$('zoom').textContent=`${zoom.toFixed(1)}×`;}
function text(c,s,x,y,size=12,color='#d5dfd0',align='left'){c.fillStyle=color;c.font=`${size}px ui-monospace,monospace`;c.textAlign=align;c.fillText(s,x,y);}
function unit(e,color,dead=false){
 const c=ctx,hot=palettes[mode].hot;c.save();c.translate(e.x,e.y);c.rotate(e.angle||0);c.globalAlpha=dead?.45:1;
 if(e.type==='infantry'||e.type==='friendly'||e.type==='civilian'){
  const gait=dead?0:Math.sin(sim.time*8+e.id)*2;c.strokeStyle=dead?'#121b20':hot;c.lineWidth=2.5;c.lineCap='round';c.beginPath();c.moveTo(-3,-2);c.lineTo(2,0);c.lineTo(-3,3);c.moveTo(0,-1);c.lineTo(-5,-4-gait);c.moveTo(0,1);c.lineTo(-5,4+gait);c.stroke();c.fillStyle=dead?'#121b20':hot;c.beginPath();c.arc(3,0,2.3,0,Math.PI*2);c.fill();if(e.type==='infantry'){c.strokeStyle=hot;c.lineWidth=1;c.beginPath();c.moveTo(1,3);c.lineTo(9,3);c.stroke();}
 }else if(e.type==='relay'){
  c.fillStyle=dead?'#151e21':palettes[mode].roof;c.fillRect(-22,-16,44,32);c.strokeStyle=hot;c.lineWidth=1;c.strokeRect(-22,-16,44,32);c.fillStyle=palettes[mode].shadow;for(let i=0;i<4;i++)c.fillRect(-17+i*9,-9,5,18);c.strokeStyle=hot;c.lineWidth=2;c.beginPath();c.moveTo(2,-15);c.lineTo(2,-48);c.moveTo(-5,-42);c.lineTo(9,-42);c.moveTo(-9,-36);c.lineTo(13,-36);c.stroke();c.beginPath();c.arc(2,-47,6,Math.PI,Math.PI*2);c.stroke();
 }else{
  const armor=e.type==='armor',len=armor?34:29,breadth=armor?21:15;c.fillStyle=dead?'#121b20':hot;
  c.fillRect(-len/2,-breadth/2,len,breadth);c.fillStyle=dead?'#253036':palettes[mode].roof2;c.fillRect(-len/2+3,-breadth/2+3,len*.48,breadth-6);c.fillStyle=dead?'#0a1317':palettes[mode].shadow;
  if(armor){c.fillRect(-17,-13,34,4);c.fillRect(-17,9,34,4);c.fillStyle=hot;c.beginPath();c.arc(2,0,7,0,Math.PI*2);c.fill();c.fillRect(3,-2,26,4);}else{for(const x of[-9,9]){c.fillRect(x-3,-10,6,3);c.fillRect(x-3,7,6,3);}c.fillStyle=palettes[mode].shadow;c.fillRect(6,-5,3,10);if(e.type==='sam'){c.fillStyle=hot;for(let j=0;j<3;j++)c.fillRect(-13,-5+j*5,20,3);}}
 }
 c.restore();
 if(!dead&&color){const s=screenAt(e.x,e.y);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.strokeStyle=color;ctx.lineWidth=1;let rr=e.type==='relay'?21:12;
  if(e.type==='friendly'||e.type==='truck'){ctx.beginPath();ctx.moveTo(s.x,s.y-rr-3);ctx.lineTo(s.x+4,s.y-rr+1);ctx.lineTo(s.x,s.y-rr+5);ctx.lineTo(s.x-4,s.y-rr+1);ctx.closePath();ctx.stroke();}
  else if(e.type==='civilian'){ctx.beginPath();ctx.arc(s.x,s.y-rr,3,0,Math.PI*2);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(s.x-5,s.y-rr);ctx.lineTo(s.x,s.y-rr-4);ctx.lineTo(s.x+5,s.y-rr);ctx.stroke();}
  if(e.priority){text(ctx,e.label,s.x,s.y-30,10,color,'center');ctx.setLineDash([3,3]);ctx.strokeRect(s.x-26,s.y-23,52,46);ctx.setLineDash([]);}
  if(e.hp<e.maxHp&&e.hp>0){ctx.fillStyle='#070d11';ctx.fillRect(s.x-12,s.y+rr+3,24,2);ctx.fillStyle=color;ctx.fillRect(s.x-12,s.y+rr+3,24*e.hp/e.maxHp,2);}ctx.restore();
 }
}
function renderWorld(){
 const p=palettes[mode],a=anchor(),j=settings.motion?shake:0,sx=j?Math.sin(sim.time*117)*j:0,sy=j?Math.cos(sim.time*94)*j:0;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=p.shadow;ctx.fillRect(0,0,w,h);
 ctx.translate(a.x+sx,a.y+sy);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
 const left=camera.x-a.x/scale,top=camera.y-a.y/scale,viewW=w/scale,viewH=h/scale;
 // drawImage uses the cached map, with no terrain work in the animation loop.
 ctx.drawImage(terrain,0,0);const visible=e=>e.x>left-90&&e.x<left+viewW+90&&e.y>top-90&&e.y<top+viewH+90;
 for(const b of sim.wrecks){if(!visible(b))continue;ctx.fillStyle=mode===1?'#e0e4d660':'#070b0d70';ctx.beginPath();ctx.ellipse(b.x,b.y,24,19,b.angle,0,Math.PI*2);ctx.fill();unit(b,null,true);if(b.type!=='infantry'&&b.type!=='friendly'&&b.age<35){ctx.globalAlpha=Math.max(0,.45-b.age/80);ctx.fillStyle=mode===1?'#16231c':'#dce8c9';ctx.beginPath();ctx.arc(b.x,b.y,4+Math.sin(sim.time*7+b.x)*1.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
 for(const f of sim.civilians)if(!f.dead&&visible(f))unit(f,'#edc47d');
 for(const e of sim.enemies)if(!e.dead&&visible(e))unit(e,'#f3917b');
 for(const f of sim.friendlies)if(!f.dead&&visible(f))unit(f,'#76e4dd');
 if(sim.helicopter){const hel=sim.helicopter,t=sim.time;ctx.save();ctx.translate(hel.x,hel.y);ctx.rotate(-.6);ctx.fillStyle=p.hot;ctx.fillRect(-13,-20,26,40);ctx.fillRect(-3,19,6,40);ctx.fillRect(-16,53,32,4);ctx.beginPath();ctx.ellipse(0,-18,12,17,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.hot;ctx.globalAlpha=.6;ctx.lineWidth=3;ctx.rotate(t*19);ctx.beginPath();ctx.moveTo(-64,0);ctx.lineTo(64,0);ctx.moveTo(0,-64);ctx.lineTo(0,64);ctx.stroke();ctx.restore();}
 ctx.lineCap='round';
 for(const s of sim.enemyShots){let t=clamp(s.age/s.life,0,1);ctx.strokeStyle='#f3947470';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+(s.tx-s.x)*Math.max(0,t-.15),s.y+(s.ty-s.y)*Math.max(0,t-.15));ctx.lineTo(s.x+(s.tx-s.x)*t,s.y+(s.ty-s.y)*t);ctx.stroke();}
 for(const s of sim.shells){let t=clamp(s.age/s.life,0,1);const trail=s.weapon===3?.18:.12;const x=s.startX+(s.tx-s.startX)*t,y=s.startY+(s.ty-s.startY)*t;ctx.strokeStyle=p.hot;ctx.lineWidth=s.weapon===0?1.5:2.5;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(s.startX+(s.tx-s.startX)*Math.max(0,t-trail),s.startY+(s.ty-s.startY)*Math.max(0,t-trail));ctx.lineTo(x,y);ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,s.weapon===0?2:4,0,Math.PI*2);ctx.fillStyle=p.hot;ctx.fill();if(s.weapon>0){ctx.strokeStyle='#d2ed8850';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(s.tx,s.ty,WEAPONS[s.weapon].radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}}
 for(const r of rings){const t=r.age/r.life;ctx.strokeStyle=mode===1?`rgba(20,35,26,${(1-t)*.9})`:`rgba(224,244,210,${(1-t)*.8})`;ctx.lineWidth=2*(1-t)+.5;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(1,r.radius*t),0,Math.PI*2);ctx.stroke();if(t<.4){ctx.globalAlpha=(.4-t)*1.2;ctx.fillStyle=p.hot;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(1,r.radius*t*.6),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
 for(const q of particles){ctx.globalAlpha=Math.max(0,(1-q.age/q.life)*q.alpha);ctx.fillStyle=q.smoke?(mode===1?'#243125':'#b5c5ab'):p.hot;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.5,q.size+(q.smoke?q.age*5:0)),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 for(const f of floating){const pos=screenAt(f.x,f.y);ctx.globalAlpha=Math.max(0,1-f.age/f.life);text(ctx,f.label,pos.x,pos.y-f.age*23,12,f.color,'center');}ctx.globalAlpha=1;
 if(phase==='playing'||phase==='paused')drawReticle();
 if(flash>0&&settings.motion){ctx.fillStyle=`rgba(218,244,195,${flash*.07})`;ctx.fillRect(0,0,w,h);}
 if(phase==='menu'){text(ctx,'REAPER 01 / STANDBY',w-26,h-60,11,'#9bad98','right');}
}
function drawReticle(){
 const a=anchor(),weapon=WEAPONS[sim.weapon],t=sim.nearest(camera,65),friendly=[...sim.friendlies,...sim.civilians].some(e=>!e.dead&&!e.escaped&&distance(e,camera)<weapon.radius+e.size);
 const color=friendly?'#edc47d':t?'#f3917b':'#d2ed88';const c=ctx;c.strokeStyle=color;c.lineWidth=1.2;
 const r=sim.weapon===3?28:19;c.beginPath();for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(a.x+dx*(r+8),a.y+dy*(r+8));c.lineTo(a.x+dx*(r+26),a.y+dy*(r+26));}c.stroke();
 if(sim.weapon===3){c.setLineDash([5,4]);c.strokeRect(a.x-r,a.y-r,r*2,r*2);c.setLineDash([]);if(sim.lockTime>0){c.beginPath();c.arc(a.x,a.y,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*sim.lockTime);c.stroke();}}
 else {c.beginPath();c.arc(a.x,a.y,r,0,Math.PI*2);c.stroke();c.globalAlpha=.2;c.beginPath();c.arc(a.x,a.y,Math.max(r,weapon.radius*scale),0,Math.PI*2);c.stroke();c.globalAlpha=1;}
 c.fillStyle=color;c.fillRect(a.x-1.5,a.y-1.5,3,3);
 if(t){text(c,t.type==='relay'?t.label:t.type.toUpperCase(),a.x,a.y-56,11,color,'center');text(c,sim.weapon===3?(sim.lockTime>=1?'LOCKED':'ACQUIRING'):sim.weapon===0&&t.type==='armor'?'HEAVY ARMOUR':'TARGET IN SIGHT',a.x,a.y+65,10,color,'center');}
 if(friendly)text(c,'FRIENDLY IN BLAST AREA',a.x,a.y+83,10,'#edc47d','center');
 const width=w>h?100:60;text(c,`${Math.round(width/scale)} M`,a.x+width/2,h> w?h*.66:h*.67,9,'#acbda9','center');c.strokeStyle='#acbda970';c.lineWidth=1;let y=h>w?h*.66+8:h*.67+8;c.beginPath();c.moveTo(a.x,y-3);c.lineTo(a.x,y);c.lineTo(a.x+width,y);c.lineTo(a.x+width,y-3);c.stroke();
 if(w>650){text(c,'N',a.x,67,11,'#b8c9b1','center');c.strokeStyle='#b8c9b144';c.beginPath();for(let i=-5;i<=5;i++){c.moveTo(a.x+i*22,48);c.lineTo(a.x+i*22,48+(i%2?4:8));}c.stroke();}
}
function drawRadar(){
 const rw=radar.width,rh=radar.height;rc.clearRect(0,0,rw,rh);rc.globalAlpha=.48;rc.drawImage(terrain,0,0,rw,rh);rc.globalAlpha=1;
 const dot=(e,color,r)=>{rc.fillStyle=color;rc.beginPath();rc.arc(e.x/WORLD.w*rw,e.y/WORLD.h*rh,r,0,Math.PI*2);rc.fill();};
 for(const e of sim.enemies)if(!e.dead)dot(e,e.priority?'#ffd39a':'#fc907a',e.priority?3:1.9);for(const e of sim.friendlies)if(!e.dead)dot(e,'#73fff0',2.4);for(const e of sim.civilians)if(!e.dead)dot(e,'#d8bb75',1.1);
 const a=anchor();rc.strokeStyle='#d2ed88b0';rc.lineWidth=1;rc.strokeRect((camera.x-a.x/scale)/WORLD.w*rw,(camera.y-a.y/scale)/WORLD.h*rh,w/scale/WORLD.w*rw,h/scale/WORLD.h*rh);rc.strokeStyle='#e8f5d5';const x=camera.x/WORLD.w*rw,y=camera.y/WORLD.h*rh;rc.beginPath();rc.moveTo(x-4,y);rc.lineTo(x+4,y);rc.moveTo(x,y-4);rc.lineTo(x,y+4);rc.stroke();
}

function effect(event){
 if(event.type==='shot'){audio.blast(event.weapon);shake=Math.max(shake,[.35,.9,3,2][event.weapon]);flash=[.08,.2,.5,.3][event.weapon];}
 if(event.type==='impact'){
  audio.blast(event.weapon,true);rings.push({...event,age:0,life:[.28,.46,.7,.9][event.weapon]});const max=settings.quality==='eco'?120:250,n=[6,17,36,42][event.weapon];
  for(let i=0;i<n&&particles.length<max;i++){const angle=Math.random()*Math.PI*2,speed=20+Math.random()*event.radius*2.1,smoke=i%3===0;particles.push({x:event.x,y:event.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,life:smoke?2.4+Math.random()*1.8:.35+Math.random()*.65,size:smoke?4+Math.random()*7:1+Math.random()*2,smoke,alpha:smoke?.22:.8});}
 }
 if(event.type==='kill'){if(floating.length<30)floating.push({x:event.x,y:event.y-15,label:`+${event.value}${event.multiplier>1?' ×'+event.multiplier:''}`,color:'#d2ed88',age:0,life:1.1});if(event.unitType!=='infantry')shake=Math.max(shake,.6);}
 if(event.type==='radio')radio(event.text);
 if(event.type==='result')finish();
}
function effectsTick(dt){shake=Math.max(0,shake-dt*8);flash=Math.max(0,flash-dt*4);for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*3);p.vy*=Math.exp(-dt*3);if(p.smoke){p.x+=dt*7;p.y-=dt*9;}}particles=particles.filter(p=>p.age<p.life);for(const r of rings)r.age+=dt;rings=rings.filter(r=>r.age<r.life);for(const f of floating)f.age+=dt;floating=floating.filter(f=>f.age<f.life);}
function radio(message){$('radio-text').textContent=message;radioUntil=sim.time+6;$('feed').classList.remove('quiet');audio.tone(730,.07,.015);}
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500);}
function clock(seconds){if(!Number.isFinite(seconds))return'∞';const s=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function hud(){
 $('timer').textContent=sim.mission.kind==='endless'?clock(sim.time):clock(sim.mission.duration-sim.time);$('score').textContent=`${sim.score.toLocaleString()} PTS`;
 $('asset-health').style.width=`${sim.assetHealth*100}%`;$('asset-value').textContent=`${Math.ceil(sim.assetHealth*100)}%`;$('asset-health').style.background=sim.assetHealth<.35?'var(--danger)':'var(--friendly)';$('progress-fill').style.width=`${sim.progress*100}%`;
 const status=sim.overheated[sim.weapon]?'COOLING':sim.ammo[sim.weapon]<=0?'EMPTY':sim.weapon===3?(sim.lockTime>=1?'LOCKED':'HOLD AIM TO LOCK'):sim.cooldown[sim.weapon]>.08?'CYCLING':'READY';
 $('weapon-status').textContent=`${WEAPONS[sim.weapon].name} · ${status}`;$('heat-fill').style.width=`${Math.max(sim.heat[sim.weapon],sim.weapon>1?sim.cooldown[sim.weapon]/WEAPONS[sim.weapon].interval:0)*100}%`;$('heat-fill').style.background=sim.overheated[sim.weapon]?'var(--danger)':'var(--accent)';
 for(let i=0;i<4;i++){$(`weapon-${i}`).classList.toggle('selected',sim.weapon===i);$(`weapon-${i}`).setAttribute('aria-pressed',String(sim.weapon===i));$(`ammo-${i}`).textContent=Number.isFinite(sim.ammo[i])?`${sim.ammo[i]} RDS`:'∞ / HEAT';}
 if(sim.time>radioUntil)$('feed').classList.add('quiet');if(sim.time>tutorialTime)$('tutorial').style.opacity='0';
 if(sim.mission.kind==='strike')$('objective').textContent=`Relays destroyed: ${Math.round(sim.progress*3)} / 3 · Avoid amber contacts`;
 if(sim.mission.kind==='endless')$('objective').textContent=`Wave ${sim.wave} · Resupply every third wave`;
 if(sim.mission.kind==='extract'&&sim.time>=70)$('objective').textContent=sim.time>=95?'Angel on the ground. Hold until lift-off.':'Helicopter inbound. Protect the landing zone.';
}
function weaponsBuild(){for(let i=0;i<4;i++){const b=document.createElement('button');b.id=`weapon-${i}`;b.className='weapon-button';b.setAttribute('aria-label',`${WEAPONS[i].name}, ${WEAPONS[i].role.toLowerCase()}`);b.innerHTML=`<strong>${WEAPONS[i].short}<span style="font-size:9px">${i===3?'':' MM'}</span></strong><small id="ammo-${i}"></small>`;b.onclick=()=>{sim.selectWeapon(i);audio.tone(570+i*100,.055,.025);hud();};$('weapon-rack').appendChild(b);}}
function menuBuild(){
 $('missions').replaceChildren();MISSIONS.forEach((m,i)=>{const b=document.createElement('button');b.className=`mission-option${selectedMission===i?' selected':''}`;b.setAttribute('aria-pressed',String(selectedMission===i));const stars=save.stars[m.id]||0;b.innerHTML=`<span class="mission-num">${i===4?'∞':String(i+1).padStart(2,'0')}</span><span class="mission-copy"><strong>${m.name}</strong><small>${m.role}${save.best[m.id]?` · BEST ${save.best[m.id].toLocaleString()}`:''}</small></span><span class="mission-grade">${stars?'★'.repeat(stars):i===selectedMission?'↗':'·'}</span>`;b.onclick=()=>{selectedMission=i;menuBuild();audio.unlock();audio.tone(470,.04,.02);};$('missions').appendChild(b);});
 $('briefing').textContent=MISSIONS[selectedMission].text;$('campaign-count').textContent=selectedMission===4?'SURVIVAL':`${String(selectedMission+1).padStart(2,'0')} / 04`;
 $('record-score').textContent=`${save.career.toLocaleString()} CAREER PTS`;$('record-rank').textContent=save.career>80000?'SPECTRE':save.career>35000?'FLIGHT LEAD':save.career>12000?'SENIOR GUNNER':'GUNNER';
}
function releaseInputs(){pan.x=pan.y=0;stickPointer=null;firePointers.clear();viewPointers.clear();keys.clear();dragOrigin=null;pinchDistance=0;$('fire').classList.remove('firing');$('stick-knob').style.transform='translate(-50%,-50%)';}
function startMission(i=selectedMission){
 releaseInputs();selectedMission=i;sim=new Simulation(i,{kit:save.kit});resultSaved=false;camera={...sim.focus};particles=[];rings=[];floating=[];zoom=1;scale=Math.min(w,h)/560;phase='playing';manualCameraUntil=0;radioUntil=0;setZoom(1);
 $('menu').classList.add('hidden');$('modal').classList.add('hidden');$('hud').classList.remove('hidden');$('operation-label').textContent=i===4?'SURVIVAL / OPEN ENDED':`OPERATION ${String(i+1).padStart(2,'0')} / ${sim.mission.role}`;$('mission-title').textContent=sim.mission.name;$('objective').textContent=sim.mission.objective;$('asset-name').textContent=sim.mission.asset;
 $('tutorial').textContent=matchMedia('(pointer:coarse)').matches?'Drag the view or use the left stick to aim. Hold FIRE with your other thumb.':'Drag to pan. Click a contact to centre it. Hold SPACE to fire. 1–4 select weapons.';$('tutorial').style.opacity='1';tutorialTime=9;audio.unlock();audio.active(true);for(const e of sim.drainEvents())effect(e);hud();last=0;
}
function openModal(kicker,title,detail){returnFocus=document.activeElement;$('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-detail').textContent=detail;$('modal-content').replaceChildren();$('modal-actions').replaceChildren();$('modal').classList.remove('hidden');$('modal').focus();}
function action(label,fn,primary=false){const b=document.createElement('button');b.className=primary?'primary-button':'text-button';b.textContent=label;b.onclick=fn;$('modal-actions').appendChild(b);return b;}
function resume(){if(phase!=='paused')return;phase='playing';sim.paused=false;$('modal').classList.add('hidden');releaseInputs();audio.unlock();audio.active(true);last=0;returnFocus?.focus();}
function pause(){if(phase!=='playing')return;phase='paused';sim.paused=true;releaseInputs();audio.active(false);openModal('SENSOR PAUSED','Holding orbit.','Take your time. The ground team is waiting.');action('RESUME SORTIE',resume,true);action('SETTINGS',()=>showSettings(pauseMenu));action('RESTART SORTIE',()=>startMission(sim.index));action('MISSION SELECT',backToMenu);}
function pauseMenu(){openModal('SENSOR PAUSED','Holding orbit.','Take your time. The ground team is waiting.');action('RESUME SORTIE',resume,true);action('SETTINGS',()=>showSettings(pauseMenu));action('RESTART SORTIE',()=>startMission(sim.index));action('MISSION SELECT',backToMenu);}
function backToMenu(){releaseInputs();phase='menu';sim.paused=false;audio.active(false);$('modal').classList.add('hidden');$('hud').classList.add('hidden');$('menu').classList.remove('hidden');sim=new Simulation(selectedMission);camera={...sim.focus};menuBuild();}
function applySettings(){document.body.classList.toggle('left-handed',settings.leftHanded);document.body.classList.toggle('reduced-motion',!settings.motion);audio.setMuted();resize();}
function showSettings(back){
 modalBack=back;openModal('FLIGHT CONFIGURATION','Your station.','Set up the controls for your screen and hands.');
 const rows=[['Sound','sound',()=>settings.sound?'ON':'OFF',()=>{settings.sound=!settings.sound;if(settings.sound)audio.unlock();}],['Graphics','quality',()=>settings.quality.toUpperCase(),()=>{settings.quality=settings.quality==='auto'?'eco':settings.quality==='eco'?'high':'auto';qualityScale=1;}],['Camera motion','motion',()=>settings.motion?'ON':'OFF',()=>settings.motion=!settings.motion],['Fire button','leftHanded',()=>settings.leftHanded?'LEFT':'RIGHT',()=>settings.leftHanded=!settings.leftHanded]];
 for(const[label,key,value,toggle]of rows){const row=document.createElement('div');row.className='setting-row';const labelEl=document.createElement('span');labelEl.textContent=label;const b=document.createElement('button');b.textContent=value();b.setAttribute('aria-label',label);b.onclick=()=>{toggle();b.textContent=value();applySettings();persist();};row.append(labelEl,b);$('modal-content').appendChild(row);}
 const p=document.createElement('p');p.className='controls-help';p.textContent='Touch: drag the view, pinch to zoom, hold FIRE. Tap the map to move quickly. Keyboard: WASD / arrows pan, SPACE fires, 1–4 select weapons, E changes sensor, Q zooms, F finds a target, Esc pauses. Cyan = friendly. Amber = civilian. Red = hostile.';$('modal-content').appendChild(p);
 action('DONE',()=>{const cb=modalBack;modalBack=null;cb?.();},true);
}
function finish(){
 if(resultSaved)return;resultSaved=true;releaseInputs();audio.active(false);phase='result';const r=sim.result,m=sim.mission;const previous=save.best[m.id]||0;save.best[m.id]=Math.max(previous,r.score);save.stars[m.id]=Math.max(save.stars[m.id]||0,r.stars);save.career+=r.score;persist();
 openModal(r.win?'MISSION COMPLETE':sim.index===4?'SURVIVAL ENDED':'MISSION FAILED',r.win?'Bring them home.':sim.index===4?'End of the watch.':'We lost contact.',r.reason);
 $('modal-content').innerHTML=`${r.win?`<div class="medal" aria-label="${r.stars} out of 3 stars">${'★'.repeat(r.stars)}<span style="opacity:.18">${'★'.repeat(3-r.stars)}</span></div>`:''}<div class="result-grid"><div><span>${r.score>previous?'NEW PERSONAL BEST':'SCORE'}</span><b>${r.score.toLocaleString()}</b></div><div><span>TARGETS DESTROYED</span><b>${r.kills}</b></div><div><span>GROUND TEAM</span><b>${r.health}%</b></div><div><span>ACCURACY</span><b>${r.accuracy}%</b></div></div>`;
 if(r.win){const note=document.createElement('p');note.className='controls-help';note.textContent='Three stars: complete the mission, keep at least 80% ground team health, and cause no friendly or civilian damage.';$('modal-content').appendChild(note);action(sim.index<3?'CHOOSE KIT & NEXT OPERATION':'CHOOSE KIT & PLAY SURVIVAL',()=>chooseKit(sim.index<3?sim.index+1:4),true);audio.tone(540,.3,.05,800);}
 else action('RETRY SORTIE',()=>startMission(sim.index),true);
 action('MISSION SELECT',backToMenu);
}
function chooseKit(next){openModal('NEXT SORTIE / LOADOUT','Pick your advantage.','Choose one kit for your next sortie. It stays selected until you change it.');const list=document.createElement('div');list.className='upgrade-list';for(const[key,title,detail]of[['cooling','Cool-running guns','50% faster cooling on the 25 mm and 40 mm.'],['ordnance','Heavy ordnance','10 extra 105 mm rounds and 2 extra guided missiles.'],['support','Reinforced ground team','More health for each friendly element.']]){const b=document.createElement('button');b.className=`upgrade${save.kit===key?' selected':''}`;b.innerHTML=`<strong>${title}</strong><small>${detail}</small>`;b.setAttribute('aria-pressed',String(save.kit===key));b.onclick=()=>{save.kit=key;persist();for(const other of list.children){other.classList.toggle('selected',other===b);other.setAttribute('aria-pressed',String(other===b));}};list.appendChild(b);}$('modal-content').appendChild(list);action('BEGIN NEXT SORTIE',()=>startMission(next),true);action('MISSION SELECT',backToMenu);}

// Each touch owns its own pointer ID, so sensor movement never cancels firing.
function capture(el,e){try{el.setPointerCapture(e.pointerId);}catch{}}
$('stick').addEventListener('pointerdown',e=>{if(phase!=='playing'||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;capture(e.currentTarget,e);moveStick(e);});
function moveStick(e){if(e.pointerId!==stickPointer)return;const b=$('stick').getBoundingClientRect(),radius=b.width*.34;let dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2,m=Math.hypot(dx,dy);if(m>radius){dx=dx/m*radius;dy=dy/m*radius;}pan.x=dx/radius;pan.y=dy/radius;$('stick-knob').style.transform=`translate(-50%,-50%) translate(${dx}px,${dy}px)`;manualCameraUntil=sim.time+5;}
$('stick').addEventListener('pointermove',moveStick);
function endStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;pan.x=pan.y=0;$('stick-knob').style.transform='translate(-50%,-50%)';}
for(const event of['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(event,endStick);
$('fire').addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();audio.unlock();capture(e.currentTarget,e);firePointers.add(e.pointerId);$('fire').classList.add('firing');});
function endFire(e){firePointers.delete(e.pointerId);$('fire').classList.toggle('firing',firePointers.size>0);}
for(const event of['pointerup','pointercancel','lostpointercapture'])$('fire').addEventListener(event,endFire);
canvas.addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();capture(canvas,e);viewPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragOrigin={x:e.clientX,y:e.clientY,camX:camera.x,camY:camera.y,moved:false};if(viewPointers.size===2){const a=[...viewPointers.values()];pinchDistance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}manualCameraUntil=sim.time+5;});
canvas.addEventListener('pointermove',e=>{if(!viewPointers.has(e.pointerId))return;const prev=viewPointers.get(e.pointerId);viewPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(viewPointers.size>=2){const a=[...viewPointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinchDistance>0)setZoom(zoom*d/pinchDistance);pinchDistance=d;if(dragOrigin)dragOrigin.moved=true;}else if(dragOrigin){const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.hypot(e.clientX-dragOrigin.x,e.clientY-dragOrigin.y)>5)dragOrigin.moved=true;camera.x-=dx/scale;camera.y-=dy/scale;cameraClamp();}manualCameraUntil=sim.time+5;});
function endView(e){if(!viewPointers.has(e.pointerId))return;const tap=dragOrigin&&!dragOrigin.moved&&viewPointers.size===1&&e.type==='pointerup';if(tap){const at=worldAt(e.clientX,e.clientY),target=sim.nearest(at,35/scale);camera.x=target?.x??at.x;camera.y=target?.y??at.y;cameraClamp();}viewPointers.delete(e.pointerId);pinchDistance=0;if(viewPointers.size){const a=[...viewPointers.values()][0];dragOrigin={...a,camX:camera.x,camY:camera.y,moved:true};}else dragOrigin=null;}
for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endView);
canvas.addEventListener('wheel',e=>{if(phase!=='playing')return;e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.001));},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
radar.addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();const b=radar.getBoundingClientRect();camera.x=(e.clientX-b.left)/b.width*WORLD.w;camera.y=(e.clientY-b.top)/b.height*WORLD.h;cameraClamp();manualCameraUntil=sim.time+5;});
radar.addEventListener('keydown',e=>{if(e.code==='Enter'){const f=sim.activeFriendlies[0];if(f){camera={x:f.x,y:f.y};cameraClamp();}}});
function locate(){const target=sim.nearest(camera,Infinity,true)||sim.activeEnemies.sort((a,b)=>{const f=sim.activeFriendlies[0]||camera;return distance(a,f)-distance(b,f);})[0];if(target){camera={x:target.x,y:target.y};cameraClamp();manualCameraUntil=sim.time+5;audio.tone(700,.06,.025);}else toast('No hostile contacts. Keep covering the ground team.');}
function thermal(){mode=(mode+1)%3;document.body.dataset.mode=['white','black','green'][mode];$('thermal').textContent=['WHOT','BHOT','NVG'][mode];terrainBuild();audio.tone(420,.06,.02);}
$('thermal').onclick=thermal;$('zoom').onclick=()=>setZoom(zoom<1.3?1.6:zoom<1.9?2.3:1);$('locate').onclick=locate;$('pause').onclick=pause;$('launch').onclick=()=>startMission();$('menu-settings').onclick=()=>{audio.unlock();showSettings(()=>$('modal').classList.add('hidden'));};
window.addEventListener('keydown',e=>{
 if(!$('modal').classList.contains('hidden')&&e.code==='Tab'){const els=[...$('modal').querySelectorAll('button:not(:disabled),[tabindex="0"]')];if(!els.length)return;const first=els[0],lastEl=els.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('modal'))){e.preventDefault();lastEl.focus();}else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus();}return;}
 if(e.code==='Escape'){e.preventDefault();if(phase==='playing')pause();else if(phase==='paused')resume();else if(phase==='menu')$('modal').classList.add('hidden');return;}
 if(phase!=='playing')return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(/^Digit[1-4]$/.test(e.code))sim.selectWeapon(Number(e.code.at(-1))-1);if(e.code==='KeyE')thermal();if(e.code==='KeyQ')$('zoom').click();if(e.code==='KeyF')locate();
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(phase==='playing')pause();releaseInputs();});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(phase==='playing')pause();releaseInputs();audio.active(false);}last=0;});window.addEventListener('pagehide',()=>{releaseInputs();persist();});window.addEventListener('resize',()=>{releaseInputs();resize();});window.visualViewport?.addEventListener('resize',resize);

let fireWarningUntil=0;
function loop(ts){
 const raw=last?(ts-last)/1000:0;last=ts;const dt=Math.min(raw,.05);frameTime=frameTime*.98+Math.min(80,raw*1000)*.02;
 if(settings.quality==='auto'&&sim.time>5&&frameTime>27&&qualityScale>.65){qualityScale=Math.max(.65,qualityScale-.1);resize();frameTime=16;}
 if(!document.hidden){
  if(phase==='playing'){
   const kx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),ky=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
   camera.x+=(pan.x+kx)*390*dt/zoom;camera.y+=(pan.y+ky)*390*dt/zoom;if(kx||ky)manualCameraUntil=sim.time+5;cameraClamp();
   // Escort tracking is deliberately gentle and only resumes after the player stops moving the sensor.
   if(sim.mission.kind==='escort'&&sim.time>manualCameraUntil&&!firePointers.size&&!keys.has('Space')){const f=sim.activeFriendlies.at(-1);if(f){camera.x+=(f.x-camera.x)*dt*.18;camera.y+=(f.y-camera.y)*dt*.18;}}
   sim.aim(camera,dt);sim.tick(dt);
   if(firePointers.size||keys.has('Space')){const shot=sim.fire(camera);if(!shot.fired&&['empty','lock'].includes(shot.reason)&&sim.time>fireWarningUntil){radio(shot.reason==='empty'?'Weapon empty. Select another weapon.':'Hold the reticle over a red contact until the lock ring fills.');fireWarningUntil=sim.time+4;}}
   for(const e of sim.drainEvents())effect(e);effectsTick(dt);hudTick+=dt;radarTick+=dt;if(hudTick>=.1){hud();hudTick=0;}if(radarTick>=.14){drawRadar();radarTick=0;}
  }else if(phase==='menu'){menuTime+=dt;camera.x=sim.focus.x+Math.sin(menuTime*.07)*95;camera.y=sim.focus.y+Math.cos(menuTime*.06)*70;}
  renderWorld();
 }
 requestAnimationFrame(loop);
}
terrainBuild();weaponsBuild();menuBuild();applySettings();hud();drawRadar();requestAnimationFrame(loop);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').then(()=>{$('offline-state').textContent='HOME SCREEN READY';}).catch(()=>{});
