import {WEAPONS} from './weapons.js?v=6';
import {distance,clamp} from './math.js?v=6';
export class AudioSystem {
 constructor(settings){this.settings=settings;this.context=null;this.buffers=new Map();this.voices=0;this.hapticAt=0;this.muted=false;}
 async start(){try{if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C();this.master=this.context.createGain();this.master.gain.value=this.settings.volume;this.master.connect(this.context.destination);this.build();}if(this.context.state==='suspended')await this.context.resume();this.muted=false;}catch{}}
 build(){const c=this.context,rate=c.sampleRate;const synth=(key,seconds,fn)=>{const b=c.createBuffer(1,Math.ceil(rate*seconds),rate),data=b.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){const t=i/rate;previous=fn(t,Math.random()*2-1,previous);data[i]=clamp(previous,-.9,.9);}this.buffers.set(key,b);};
  for(const w of WEAPONS){let bass=70+w.id*9,decay=w.kind==='SNIPER'?9:w.kind==='SHOTGUN'?12:w.kind==='PISTOL'?27:22;synth(`shot${w.id}`,.55,(t,n)=>{const envelope=Math.exp(-t*decay),crack=n*Math.exp(-t*155)*.65,body=Math.sin(2*Math.PI*(bass*t-55*t*t))*envelope*.35,tail=n*envelope*.25;return crack+body+tail;});}
  synth('step',.14,(t,n,p)=>(n*.45+p*.55)*Math.exp(-t*34)*.22);synth('reload',.25,(t,n)=>n*Math.exp(-t*22)*.26+Math.sin(t*3700)*Math.exp(-t*40)*.1);synth('click',.07,(t,n)=>n*Math.exp(-t*95)*.25);synth('hit',.08,t=>Math.sin(t*2*Math.PI*1800)*Math.exp(-t*60)*.17);synth('kill',.22,t=>Math.sin(t*2*Math.PI*(950+600*t))*Math.exp(-t*18)*.2);synth('explosion',1.8,(t,n,p)=>(n*.3+p*.7)*Math.exp(-t*3)*.95+Math.sin(2*Math.PI*(48*t-8*t*t))*Math.exp(-t*5)*.2);synth('hurt',.19,(t,n,p)=>(n*.25+p*.6)*Math.exp(-t*24)*.6);synth('whoosh',.3,(t,n,p)=>(n*.2+p*.65)*Math.sin(t/.3*Math.PI)*.26);synth('ambience',4,(t,n,p)=>(n*.015+p*.975));
 }
 play(key,{volume=1,pan=0,rate=1,indoor=false}={}){const c=this.context;if(!c||this.muted||c.state!=='running'||this.voices>=24)return;const buffer=this.buffers.get(key);if(!buffer)return;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;gain.connect(p);p.connect(this.master);}else gain.connect(this.master);
  let delay=null,echo=null;if(indoor&&this.voices<18){delay=c.createDelay(.15);delay.delayTime.value=.065;echo=c.createGain();echo.gain.value=.12;gain.connect(delay);delay.connect(echo);echo.connect(this.master);}
  this.voices++;source.onended=()=>{this.voices--;source.disconnect();gain.disconnect();delay?.disconnect();echo?.disconnect();};source.start();
 }
 haptic(ms){if(!this.settings.haptics||!navigator.vibrate)return;const now=performance.now();if(now-this.hapticAt<70)return;this.hapticAt=now;navigator.vibrate(ms);}
 events(events,game){if(this.master)this.master.gain.value=this.settings.volume;for(const e of events){let d=e.position?distance(e.position,game.player):0,volume=e.source===0||!e.position?1:clamp(1-d/60,0,.8),pan=e.position?clamp(Math.sin(Math.atan2(e.position.x-game.player.x,-(e.position.z-game.player.z))-game.player.yaw),-1,1):0;
   if(e.type==='shot'){this.play(`shot${e.weapon}`,{volume:volume*(e.suppressed?.28:.75),pan,rate:.97+Math.random()*.06,indoor:e.indoor});if(e.source===0)this.haptic(8);}
   if(e.type==='step'&&d<24)this.play('step',{volume:volume*(e.source===0?.4:.55),pan,rate:game.arena.indoors(e.position)?1.3:.85});
   if(e.type==='explosion'){this.play('explosion',{volume:Math.max(.12,volume),pan});if(d<14)this.haptic(30);}
   if(e.type==='reload')this.play('reload',{volume:.65});if(e.type==='reloadDone'){this.play('click');this.haptic(9);}
   if(e.type==='empty'||e.type==='switch')this.play('click');if(e.type==='hit')this.play('hit');if(e.type==='kill'&&e.source===0)this.play('kill');if(e.type==='hurt'){this.play('hurt',{volume:.7});this.haptic(15);}if(e.type==='throw'||e.type==='melee')this.play('whoosh');
  }}
 pause(){this.muted=true;this.context?.suspend().catch(()=>{});}
 ui(){this.play('click',{volume:.4});}
}
