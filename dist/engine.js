// Deterministic simulation. Rendering, audio and browser input are kept in game.js.
export const WORLD = { w: 2400, h: 1800 };
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function random(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const WEAPONS = [
  { name: '25 MM', short: '25', role: 'INFANTRY', ammo: Infinity, damage: 30, radius: 19, interval: .105, travel: .19, heat: .085, cooling: .23 },
  { name: '40 MM', short: '40', role: 'MULTIROLE', ammo: 120, damage: 88, radius: 45, interval: .40, travel: .38, heat: .16, cooling: .24 },
  { name: '105 MM', short: '105', role: 'HEAVY', ammo: 28, damage: 265, radius: 85, interval: 1.8, travel: .67, heat: 0, cooling: .25 },
  { name: 'AGM', short: 'AGM', role: 'GUIDED', ammo: 6, damage: 480, radius: 68, interval: 2.7, travel: 1.15, heat: 0, cooling: .25 }
];
export const MISSIONS = [
  { id: 'broken-arrow', name: 'Broken Arrow', role: 'DEFEND', duration: 90, seed: 17031, asset: 'VIPER TEAM', text: 'A ground team is pinned down in the village. Hold off the assault until reinforcements arrive.', objective: 'Keep Viper alive for 90 seconds.', kind: 'defend', focus: { x: 1150, y: 860 } },
  { id: 'long-road', name: 'Long Road', role: 'ESCORT', duration: 155, seed: 28719, asset: 'CONVOY', text: 'Three friendly vehicles are crossing hostile territory. Clear the road and get at least one to the exit.', objective: 'Escort the convoy to the eastern exit.', kind: 'escort', focus: { x: 390, y: 930 } },
  { id: 'blackout', name: 'Blackout', role: 'PRECISION', duration: 170, seed: 44281, asset: 'SCOUT TEAM', text: 'Take out three command relays. Civilians are nearby, so choose your weapon and watch your blast radius.', objective: 'Destroy all three command relays.', kind: 'strike', focus: { x: 950, y: 710 } },
  { id: 'last-light', name: 'Last Light', role: 'EXTRACTION', duration: 110, seed: 72791, asset: 'RESCUE TEAM', text: 'Cover the rescue team while a helicopter approaches. Keep the landing zone alive until extraction.', objective: 'Protect the landing zone until extraction.', kind: 'extract', focus: { x: 1510, y: 980 } },
  { id: 'endless', name: 'Endless Night', role: 'SURVIVAL', duration: Infinity, seed: 98123, asset: 'OUTPOST', text: 'An unending assault. Survive as long as you can. Ammunition and repairs arrive every third wave.', objective: 'Keep the outpost alive. Survive the waves.', kind: 'endless', focus: { x: 1150, y: 860 } }
];
const TYPES = {
  infantry: { hp: 40, size: 6, speed: 20, value: 100, damage: 5, range: 115, interval: 2.7 },
  technical: { hp: 140, size: 13, speed: 29, value: 220, damage: 10, range: 160, interval: 2.8 },
  armor: { hp: 310, size: 17, speed: 16, value: 420, damage: 18, range: 200, interval: 4.2 },
  sam: { hp: 220, size: 15, speed: 0, value: 350, damage: 9, range: 900, interval: 6 },
  relay: { hp: 380, size: 22, speed: 0, value: 650, damage: 0, range: 0, interval: 999 }
};
export class Simulation {
  constructor(missionIndex = 0, options = {}) {
    this.index = clamp(missionIndex, 0, MISSIONS.length - 1); this.mission = MISSIONS[this.index];
    this.rng = random(options.seed ?? this.mission.seed); this.kit = options.kit || 'balanced';
    this.time = 0; this.score = 0; this.kills = 0; this.shots = 0; this.hits = 0; this.collateral = 0; this.friendlyHits = 0;
    this.combo = 0; this.comboUntil = 0; this.bestCombo = 0; this.wave = 0; this.nextWave = 13;
    this.weapon = 0; this.ammo = WEAPONS.map(w => w.ammo); this.heat = [0,0,0,0]; this.cooldown = [0,0,0,0]; this.overheated = [false,false,false,false];
    this.enemies = []; this.friendlies = []; this.civilians = []; this.shells = []; this.enemyShots = []; this.wrecks = []; this.events = [];
    this.state = 'active'; this.result = null; this.nextId = 1; this.lock = null; this.lockTime = 0; this.paused = false;
    this.focus = { ...this.mission.focus }; this.escortProgress = 0; this.helicopter = null; this.lastWarning = -20;
    if (this.kit === 'ordnance') { this.ammo[2] += 10; this.ammo[3] += 2; }
    this.setup();
  }
  emit(type, data = {}) { if (this.events.length < 500) this.events.push({ type, time: this.time, ...data }); }
  drainEvents() { const out = this.events; this.events = []; return out; }
  spawn(type, x, y, extra = {}) {
    const p = TYPES[type]; const e = { id: this.nextId++, type, ...p, maxHp: p.hp, x, y, angle: this.rng()*Math.PI*2, cooldown: 3 + this.rng()*4, dead: false, ...extra };
    this.enemies.push(e); return e;
  }
  setup() {
    const f = this.focus, count = this.mission.kind === 'escort' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const hp = this.kit === 'support' ? 180 : 140;
      this.friendlies.push({ id: this.nextId++, type: this.mission.kind === 'escort' ? 'truck' : 'friendly', x: f.x - (count-1-i)*30, y: f.y + (this.mission.kind === 'escort' ? 0 : (i%2)*24-12), hp, maxHp:hp, size:11, angle:0, dead:false, escaped:false });
    }
    const neutralSites = this.mission.kind === 'strike' ? [[885,660],[1610,1160],[740,1220]] : [[790,555],[1730,650],[1620,1320]];
    for (const [x,y] of neutralSites) for(let i=0;i<2;i++) this.civilians.push({ id:this.nextId++,type:'civilian',x:x+i*18,y:y+i*12,originX:x+i*18,originY:y+i*12,hp:45,maxHp:45,size:6,angle:0,dead:false });
    if (this.mission.kind === 'strike') {
      [[990,620],[1720,1050],[650,1330]].forEach(([x,y], i) => {
        this.spawn('relay',x,y,{ priority:true, label:`RELAY 0${i+1}` });
        this.spawn('armor',x+90,y+90); this.spawn('technical',x-80,y+60);
        for(let n=0;n<3;n++) this.spawn('infantry',x-70+n*35,y-70);
      });
      this.spawn('sam',1610,425,{label:'LAUNCHER'});
    } else { this.spawnWave(true); }
    this.emit('radio',{text:this.mission.kind === 'strike' ? 'Three relays marked. Amber contacts are civilians.' : 'Viper is marked cyan. Keep hostiles off our position.'});
  }
  get activeEnemies() { return this.enemies.filter(e=>!e.dead); }
  get activeFriendlies() { return this.friendlies.filter(e=>!e.dead); }
  get assetHealth() { return this.friendlies.reduce((n,f)=>n+Math.max(0,f.hp),0)/this.friendlies.reduce((n,f)=>n+f.maxHp,0); }
  get progress() {
    if(this.mission.kind==='strike') return this.enemies.filter(e=>e.type==='relay'&&e.dead).length/3;
    if(this.mission.kind==='escort') return this.escortProgress;
    return Number.isFinite(this.mission.duration)?clamp(this.time/this.mission.duration,0,1):0;
  }
  spawnWave(initial=false) {
    this.wave++; const endless=this.mission.kind==='endless';
    const living=this.activeFriendlies; const anchor=living.length?living[Math.floor(living.length/2)]:this.focus;
    const count = Math.min(12, (initial?5:4)+Math.floor(this.wave/2)+(endless?Math.floor(this.wave/3):0));
    for(let i=0;i<count;i++) {
      if(this.activeEnemies.length>=48) break;
      const angle = this.rng()*Math.PI*2, r = initial ? 225+this.rng()*200 : 430+this.rng()*180;
      const x=clamp(anchor.x+Math.cos(angle)*r,80,WORLD.w-80), y=clamp(anchor.y+Math.sin(angle)*r,80,WORLD.h-80);
      const type=i===0&&this.wave>=3?'armor':i<2&&this.wave>=2?'technical':'infantry';
      this.spawn(type,x,y);
    }
    if(!initial) this.emit('radio',{text:`Wave ${this.wave}. ${this.wave>=3?'Armour inbound. Switch to a heavier weapon.':'New contacts approaching the ground team.'}`});
    if(endless&&this.wave%3===0) {
      this.ammo[1]=Math.min(160,this.ammo[1]+50);this.ammo[2]=Math.min(40,this.ammo[2]+10);this.ammo[3]=Math.min(10,this.ammo[3]+2);
      for(const f of living) f.hp=Math.min(f.maxHp,f.hp+35);
      this.emit('radio',{text:'Resupply confirmed. Ammunition replenished and ground team patched up.'});
    }
  }
  nearest(point, maxDistance=Infinity, priority=false) {
    let best=null,d=maxDistance;
    for(const e of this.enemies) { if(e.dead || (priority&&!e.priority)) continue;const n=distance(e,point);if(n<d){d=n;best=e;} }
    return best;
  }
  selectWeapon(i) { if(i>=0&&i<WEAPONS.length) {this.weapon=i;this.lock=null;this.lockTime=0;} }
  aim(point,dt) {
    const t=this.nearest(point,65);
    if(t&&this.lock===t.id) this.lockTime=Math.min(1,this.lockTime+dt/0.55);
    else {this.lock=t?.id??null;this.lockTime=0;}
  }
  fire(point) {
    if(this.state!=='active'||this.paused) return {fired:false,reason:'inactive'};
    const i=this.weapon,w=WEAPONS[i];
    if(this.cooldown[i]>0) return {fired:false,reason:'cooldown'};
    if(this.ammo[i]<=0) return {fired:false,reason:'empty'};
    if(this.overheated[i]) return {fired:false,reason:'heat'};
    let target=null;
    if(i===3) { target=this.enemies.find(e=>e.id===this.lock&&!e.dead);if(!target||this.lockTime<1) return {fired:false,reason:'lock'}; }
    let x=point.x,y=point.y;
    // Small assist helps a thumb find a tiny contact. The shell still lands at the indicated point.
    if(i===0) { const snap=this.nearest(point,18);if(snap){x=snap.x;y=snap.y;} }
    const shell={x,y,tx:target?target.x:x,ty:target?target.y:y,startX:x-210,startY:y-330,weapon:i,age:0,life:w.travel,targetId:target?.id??null};
    this.shells.push(shell);this.shots++;this.ammo[i]--;this.cooldown[i]=w.interval;
    this.heat[i]=clamp(this.heat[i]+w.heat,0,1);
    if(this.heat[i]>=.98){this.overheated[i]=true;this.emit('radio',{text:'Gun temperature high. Switch weapons while it cools.'});}
    this.emit('shot',{weapon:i,x,y}); return {fired:true,shell};
  }
  explode(shell) {
    const w=WEAPONS[shell.weapon],x=shell.tx,y=shell.ty;let hits=0;
    this.emit('impact',{x,y,radius:w.radius,weapon:shell.weapon});
    for(const e of this.enemies) {
      if(e.dead) continue; const d=Math.hypot(e.x-x,e.y-y);if(d>w.radius+e.size) continue;
      const falloff=clamp(1-d/(w.radius+e.size),.25,1), armour=e.type==='armor'&&shell.weapon===0?.22:1;
      const damage=w.damage*(.4+.6*falloff)*armour; e.hp-=damage;hits++;
      this.emit('hit',{x:e.x,y:e.y,damage,armour:armour<1});
      if(e.hp<=0) this.destroy(e);
    }
    if(hits>0) this.hits++;
    for(const f of [...this.friendlies,...this.civilians]) {
      if(f.dead||f.escaped)continue;const d=Math.hypot(f.x-x,f.y-y);if(d>w.radius+f.size)continue;
      f.hp-=w.damage*(.35+.65*clamp(1-d/(w.radius+f.size),0,1))*.7;
      this.friendlyHits++;this.combo=0;this.score=Math.max(0,this.score-75);
      if(this.time-this.lastWarning>2){this.emit('radio',{text:f.type==='civilian'?'Cease fire near amber contacts. Civilians in the area.':'Check your fire! Cyan contacts are friendly.'});this.lastWarning=this.time;}
      if(f.hp<=0) { f.dead=true;this.collateral++;this.score=Math.max(0,this.score-350);this.addWreck(f); }
    }
  }
  addWreck(e) { this.wrecks.push({x:e.x,y:e.y,type:e.type,angle:e.angle,age:0});if(this.wrecks.length>110)this.wrecks.shift(); }
  destroy(e) {
    if(e.dead)return;e.dead=true;this.kills++;this.addWreck(e);
    this.combo=this.time<=this.comboUntil?this.combo+1:1;this.comboUntil=this.time+4.5;this.bestCombo=Math.max(this.bestCombo,this.combo);
    const multiplier=Math.min(4,1+Math.floor((this.combo-1)/3)*.5),value=Math.round(e.value*multiplier);this.score+=value;
    this.emit('kill',{x:e.x,y:e.y,unitType:e.type,value,combo:this.combo,multiplier});
    if(e.priority)this.emit('radio',{text:`${e.label} destroyed. ${this.enemies.filter(t=>t.priority&&!t.dead).length} relays remaining.`});
  }
  tick(dt) {
    if(this.state!=='active'||this.paused)return;
    dt=clamp(dt,0,.05);this.time+=dt;
    for(let i=0;i<4;i++) {
      this.cooldown[i]=Math.max(0,this.cooldown[i]-dt);this.heat[i]=Math.max(0,this.heat[i]-dt*WEAPONS[i].cooling*(this.kit==='cooling'?1.5:1));
      if(this.heat[i]<.25)this.overheated[i]=false;
    }
    if(this.time>this.comboUntil)this.combo=0;
    const living=this.activeFriendlies;
    if(this.mission.kind==='escort') {
      for(const f of living) {f.x=Math.min(WORLD.w-100,f.x+14*dt);f.y=930+Math.sin((f.x-390)/290)*65;f.angle=Math.atan2(Math.cos((f.x-390)/290)*65/290,1);if(f.x>=WORLD.w-115)f.escaped=true;}
      if(living.length)this.escortProgress=clamp((Math.max(...living.map(f=>f.x))-390)/(WORLD.w-115-390),0,1);
    }
    for(const c of this.civilians)if(!c.dead){c.x=c.originX+Math.sin(this.time*.10+c.id)*10;c.y=c.originY+Math.cos(this.time*.12+c.id)*8;}
    for(const e of this.enemies) {
      if(e.dead)continue;const targets=living.filter(f=>!f.escaped);if(!targets.length)continue;
      const target=targets.reduce((a,b)=>distance(e,a)<distance(e,b)?a:b);const d=distance(e,target);
      e.angle=Math.atan2(target.y-e.y,target.x-e.x);
      // Guards remain near the relay until a gunship shell draws their attention.
      const guard=this.mission.kind==='strike'&&e.type!=='sam';
      if(e.speed&&d>e.range*.83&&!guard){e.x+=Math.cos(e.angle)*e.speed*dt;e.y+=Math.sin(e.angle)*e.speed*dt;}
      e.cooldown-=dt;
      if(e.damage&&d<e.range&&e.cooldown<=0){e.cooldown=e.interval*(.85+this.rng()*.3);this.enemyShots.push({x:e.x,y:e.y,tx:target.x,ty:target.y,targetId:target.id,damage:e.damage,age:0,life:.6});this.emit('incoming',{x:e.x,y:e.y,tx:target.x,ty:target.y});}
    }
    for(const s of this.shells) {
      s.age+=dt;if(s.targetId){const t=this.enemies.find(e=>e.id===s.targetId&&!e.dead);if(t){s.tx=t.x;s.ty=t.y;}}
      if(s.age>=s.life)this.explode(s);
    }
    this.shells=this.shells.filter(s=>s.age<s.life);
    for(const s of this.enemyShots){s.age+=dt;if(s.age>=s.life){const f=this.friendlies.find(f=>f.id===s.targetId&&!f.dead&&!f.escaped);if(f){f.hp-=s.damage;if(f.hp<=0){f.dead=true;this.addWreck(f);this.emit('radio',{text:'Friendly element lost. Protect the remaining team.'});}}}}
    this.enemyShots=this.enemyShots.filter(s=>s.age<s.life);
    for(const w of this.wrecks)w.age+=dt;
    if(this.mission.kind!=='strike'&&this.time>=this.nextWave){this.spawnWave();this.nextWave=this.time+(this.mission.kind==='endless'?Math.max(10,19-this.wave*.35):19);}
    if(this.mission.kind==='extract'&&this.time>=70&&!this.helicopter){this.helicopter={x:2250,y:380};this.emit('radio',{text:'Angel inbound. Keep the landing zone clear for extraction.'});}
    if(this.helicopter){const t=clamp((this.time-70)/25,0,1);this.helicopter.x=2250+(this.focus.x-2250)*t;this.helicopter.y=380+(this.focus.y-380)*t;}
    if(this.assetHealth<.35&&this.time-this.lastWarning>15){this.emit('radio',{text:'Ground team is critical. Find the closest hostile and engage.'});this.lastWarning=this.time;}
    this.checkResult();
    // Bound long survival sessions without changing the mission's objective records.
    if(this.enemies.length>160)this.enemies=this.enemies.filter(e=>!e.dead||e.priority);
  }
  checkResult() {
    if(this.state!=='active')return;
    if(!this.activeFriendlies.length)return this.finish(false,'The ground team was lost.');
    if(this.mission.kind==='strike'&&this.progress>=1)return this.finish(true,'All command relays are down. Good work, Reaper.');
    if(this.mission.kind==='escort'&&this.friendlies.some(f=>f.escaped&&!f.dead))return this.finish(true,'The convoy reached the extraction route.');
    if(this.time>=this.mission.duration){
      if(this.mission.kind==='defend')return this.finish(true,'Reinforcements arrived. Viper is coming home.');
      if(this.mission.kind==='extract')return this.finish(true,'Angel has the team. Everyone aboard is heading home.');
      return this.finish(false,'Your time over the target area expired.');
    }
  }
  finish(win,reason) {
    if(this.state!=='active')return;this.state=win?'won':'lost';
    if(win)this.score+=Math.round(this.assetHealth*1200)+(this.collateral===0?500:0);
    const accuracy=this.shots?Math.round(this.hits/this.shots*100):0;
    const stars=win?1+Number(this.assetHealth>=.55)+Number(this.collateral===0&&this.friendlyHits===0&&this.assetHealth>=.8):0;
    this.result={win,reason,score:this.score,kills:this.kills,accuracy,stars,time:this.time,health:Math.round(this.assetHealth*100),collateral:this.collateral,bestCombo:this.bestCombo,wave:this.wave};
    this.emit('result',this.result);
  }
}
