import {WEAPONS} from './weapons.js?v=25';
// Original synthesized recordings: cached pressure transients, action sounds and
// surface impacts. No external audio downloads or continuously running ambience.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SHOTS=[
 [91,19,.32,1430],[69,12,.49,1020],[118,27,.24,1770],
 [137,37,.19,2180],[122,30,.25,1890],[52,9,.61,670],
 [61,12,.52,810],[46,7,.7,980],[64,12,.48,1280],
 [75,15,.54,880],[148,30,.26,2380],[81,16,.44,1720],[230,50,.1,3300],[106,23,.34,1620],[82,20,.39,1270]
];
function randomStream(seed){let n=seed>>>0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/2147483648-1;};}
export class AudioSystem {
 constructor(settings){this.settings=settings;this.context=null;this.buffers=new Map();this.voices=0;this.active=new Set();this.hapticAt=0;this.muted=false;}
 async start(){try{
  if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C();this.master=this.context.createGain();this.master.gain.value=this.settings.volume;if(this.context.createDynamicsCompressor){this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-7;this.limiter.knee.value=5;this.limiter.ratio.value=5;this.limiter.attack.value=.003;this.limiter.release.value=.12;this.master.connect(this.limiter);this.limiter.connect(this.context.destination);}else this.master.connect(this.context.destination);this.build();this.makeRoom();}
  if(this.context.state==='suspended')await this.context.resume();this.muted=false;
 }catch{}}
 build(){
  const c=this.context,rate=c.sampleRate;
  const synth=(key,seconds,fn,seed=7919)=>{const b=c.createBuffer(1,Math.ceil(rate*seconds),rate),data=b.getChannelData(0),noise=randomStream(seed);let low=0;
   for(let i=0;i<data.length;i++){const t=i/rate,n=noise();low+=.095*(n-low);const sample=fn(t,n,low);data[i]=Math.tanh(sample)*Math.min(1,(data.length-i)/64);}
   this.buffers.set(key,b);return b;
  };
  SHOTS.forEach(([bass,decay,weight,mechanical],id)=>{
   const duration=Math.max(.31,Math.min(.92,5.5/decay));
   for(const suppressed of [false,true])synth(`${suppressed?'suppressed':'shot'}${id}`,duration,(t,n,low)=>{
    const crack=(n-low)*Math.exp(-t*(suppressed?390:210))*(suppressed?.21:.82);
    const phase=6.283185*bass*(t+.0028*(1-Math.exp(-t*95)));
    const pressure=(Math.sin(phase)*.72+Math.sin(phase*1.63)*.17+Math.sin(phase*2.39)*.08)*Math.exp(-t*decay)*weight*(suppressed?.40:.81);
    const blast=(low*2.8+(n-low)*.11)*Math.exp(-t*decay*.83)*weight*(suppressed?.24:.89);
    const mech=t>.027?Math.sin((t-.027)*mechanical*6.283185)*Math.exp(-(t-.027)*155)*.075:0;
    const shell=t>.135&&id!==7?(n-low)*Math.exp(-(t-.135)*195)*.022:0;
    // Pump and bolt closures follow the same animation timing, below the initial blast.
    const open=(id===5||id===7)&&t>.14?(n-low)*Math.exp(-(t-.14)*100)*.058:0;
    const close=(id===5||id===7)&&t>.47?(low*1.6+Math.sin((t-.47)*7300)*.13)*Math.exp(-(t-.47)*72)*.17:0;
    return crack+pressure+blast+mech+shell+open+close;
   },7133+id*811);
   const reload=WEAPONS[id].reload||.3;
   synth(`reload${id}`,Math.max(.3,reload*.84),(t,n,low)=>{
    const phase=t/reload,extract=phase>.13?(n-low)*Math.exp(-(phase-.13)*reload*65)*.21:0;
    const handling=(n*.024+low*.15)*Math.sin(Math.min(1,phase/.85)*Math.PI);
    const seat=phase>.69?(low*1.35+Math.sin((phase-.69)*reload*(1280+id*31))*.08)*Math.exp(-(phase-.69)*reload*61):0;
    return id===5?(n*.1+low*.3)*Math.exp(-t*24):extract+handling+seat;
   },1013+id*13);
   synth(`seat${id}`,.11,(t,n,low)=>low*Math.exp(-t*49)*.31+(n-low)*Math.exp(-t*95)*.065,931+id*37);
   synth(`rack${id}`,.15,(t,n,low)=>(n-low)*Math.exp(-t*61)*.16+Math.sin(t*mechanical*3.14159)*Math.exp(-t*100)*.09,712+id*91);
  });
  synth('stepHard',.17,(t,n,low)=>low*Math.exp(-t*32)*.9+Math.sin(t*730)*Math.exp(-t*55)*.16);
  synth('stepGravel',.20,(t,n,low)=>(n*.12+low*.58)*Math.exp(-t*24)+Math.sin(t*520)*Math.exp(-t*48)*.065);
  synth('stepSoft',.17,(t,n,low)=>low*Math.exp(-t*23)*.47+Math.sin(t*450)*Math.exp(-t*43)*.053);
  synth('impactMetal',.28,(t,n,low)=>(n-low)*Math.exp(-t*160)*.24+(Math.sin(t*9420)+Math.sin(t*15437)*.42)*Math.exp(-t*36)*.10);
  synth('impactStone',.20,(t,n,low)=>n*Math.exp(-t*95)*.21+low*Math.exp(-t*24)*.23);
  synth('impactWood',.18,(t,n,low)=>low*Math.exp(-t*47)*.34+Math.sin(t*3370)*Math.exp(-t*84)*.10);
  synth('click',.07,(t,n,low)=>(n-low)*Math.exp(-t*95)*.22);
  synth('hit',.085,t=>(Math.sin(t*6.283185*1710)+Math.sin(t*6.283185*2330)*.3)*Math.exp(-t*59)*.13);
  synth('kill',.19,t=>(Math.sin(t*6.283185*1210)+Math.sin(t*6.283185*1815)*.55)*Math.exp(-t*22)*.12);
  synth('explosion',1.5,(t,n,low)=>low*Math.exp(-t*3.7)*2.6+Math.sin(t*6.283185*43)*Math.exp(-t*6)*.43+(n-low)*Math.exp(-t*69)*.31);
  synth('hurt',.18,(t,n,low)=>low*Math.exp(-t*22)*.79);
  synth('whoosh',.24,(t,n,low)=>(low*.65+n*.09)*Math.sin(t/.24*Math.PI)*.30);
 }
 makeRoom(){
  const c=this.context;if(!c.createConvolver)return;
  // One shared short room response replaces per-shot delay graphs.
  const response=c.createBuffer(2,Math.ceil(c.sampleRate*.28),c.sampleRate),noise=randomStream(52378);
  for(let ch=0;ch<2;ch++){const a=response.getChannelData(ch);for(let i=0;i<a.length;i++){const t=i/c.sampleRate;a[i]=t<.019?0:noise()*Math.exp(-t*24)*.25;}}
  this.room=c.createConvolver();this.room.buffer=response;this.roomGain=c.createGain();this.roomGain.gain.value=.19;this.room.connect(this.roomGain);this.roomGain.connect(this.master);
 }
 play(key,{volume=1,pan=0,rate=1,indoor=false,distance=0,important=false}={}){
  const c=this.context;if(!c||this.muted||c.state!=='running'||this.voices>=(important?24:16)||volume<.006)return;
  const buffer=this.buffers.get(key);if(!buffer)return;
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=clamp(rate,.65,1.6);gain.gain.value=clamp(volume,0,1.4);
  let filter=null,panner=null;
  if(distance>14&&c.createBiquadFilter){filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=Math.max(1200,9000/(1+distance*.045));filter.Q.value=.45;source.connect(filter);filter.connect(gain);}else source.connect(gain);
  if(c.createStereoPanner){panner=c.createStereoPanner();panner.pan.value=clamp(pan,-1,1);gain.connect(panner);panner.connect(this.master);}else gain.connect(this.master);
  if(indoor&&this.room)gain.connect(this.room);
  this.voices++;this.active.add(source);let ended=false;
  source.onended=()=>{if(ended)return;ended=true;this.voices=Math.max(0,this.voices-1);this.active.delete(source);source.disconnect();gain.disconnect();filter?.disconnect();panner?.disconnect();};
  source.start();
 }
 haptic(ms){if(!this.settings.haptics||!navigator.vibrate)return;const now=performance.now();if(now-this.hapticAt<70)return;this.hapticAt=now;navigator.vibrate(ms);}
 events(events,game){
  if(this.master)this.master.gain.value=this.settings.volume;let impacts=0;
  for(const e of events){
   const dx=e.position?e.position.x-game.player.x:0,dy=e.position?e.position.y-game.player.y:0,dz=e.position?e.position.z-game.player.z:0;
   const d=Math.hypot(dx,dy,dz),own=e.source===0,volume=own||!e.position?1:clamp(1/(1+d*d*.004)-.015,0,.85);
   const pan=e.position?Math.sin(Math.atan2(dx,-dz)-game.player.yaw):0;
   switch(e.type){
    case 'shot':this.play(`${e.suppressed?'suppressed':'shot'}${e.weapon}`,{volume:volume*(own?.85:.72),pan,rate:.978+Math.random()*.044,indoor:e.indoor,distance:d,important:own});if(own)this.haptic(8);break;
    case 'step':if(d<24){const hard=game.arena.indoors(e.position),soft=game.arena.info?.tag==='MIXED'||game.arena.info?.tag==='FOREST';this.play(hard?'stepHard':soft?'stepSoft':'stepGravel',{volume:volume*(own?.28:.48)*(e.value??1),pan,rate:.91+Math.random()*.16,distance:d});}break;
    case 'impact':if(d<40&&impacts++<3){const s=e.surface,key=['steel','dark','blue','rust','brass'].includes(s)?'impactMetal':s==='wood'?'impactWood':'impactStone';this.play(key,{volume:volume*.34,pan,distance:d});}break;
    case 'explosion':this.play('explosion',{volume:Math.max(.06,volume),pan,distance:d,important:true});if(d<14)this.haptic(30);break;
    case 'reload':{const w=game.player.weapon,id=e.weapon??w.def.id;this.play(`reload${id}`,{volume:.7,rate:(WEAPONS[id].reload||.3)/Math.max(.1,w.reloadTime)});break;}
    case 'reloadDone':{const w=game.player.weapon,id=e.weapon??w.def.id;this.play(`${w.reloadStartedEmpty&&id!==5?'rack':'seat'}${id}`,{volume:.55});this.haptic(9);break;}
    case 'empty':case 'switch':this.play('click',{volume:.7});break;
    case 'hit':this.play('hit',{volume:e.headshot?1.1:.8,important:true});break;
    case 'kill':if(own)this.play('kill',{volume:.8,important:true});break;
    case 'hurt':this.play('hurt',{volume:.7,important:true});this.haptic(15);break;
    case 'throw':case 'melee':this.play('whoosh',{volume:.8});break;
   }
  }
 }
 pause(){this.muted=true;for(const source of this.active){try{source.stop();}catch{}}this.context?.suspend().catch(()=>{});}
 ui(){this.play('click',{volume:.4});}
}
