import {GUN_ORDER} from './weapons.js?v=18';
import {distance} from './math.js?v=18';

export const MODES = [
 {id:'tdm',name:'TEAM DEATHMATCH',short:'TDM',description:'4 vs 4. First team to 40 eliminations.',limit:40,time:360,teams:true},
 {id:'ffa',name:'FREE FOR ALL',short:'FFA',description:'Every operator for themselves. First to 20.',limit:20,time:360,teams:false},
 {id:'sabotage',name:'SABOTAGE',short:'SAB',description:'Plant or defuse. One life per round. First to 4 rounds.',limit:4,time:110,teams:true},
 {id:'domination',name:'DOMINATION',short:'DOM',description:'Capture A, B and C. Hold them to reach 150 points.',limit:150,time:480,teams:true},
 {id:'gun',name:'GUN GAME',short:'GUN',description:`${GUN_ORDER.length} weapons. One elimination per tier. Finish with the blade.`,limit:GUN_ORDER.length,time:480,teams:false},
 {id:'hardpoint',name:'HARDPOINT',short:'HARD',description:'Hold the rotating zone. Contested zones score nothing. First to 150.',limit:150,time:480,teams:true},
 {id:'confirmed',name:'KILL CONFIRMED',short:'KC',description:'Collect enemy tags to score. Recover allied tags to deny. First to 30.',limit:30,time:420,teams:true}
];

export const HARDPOINT_SECONDS = 45;
export const TAG_LIFETIME = 30;
export const MAX_TAGS = 32;

export class MatchRules {
 constructor(mode,arena) {
  this.mode=MODES.find(m=>m.id===mode)||MODES[0];
  this.time=this.mode.time;this.scores=[0,0];this.phase='playing';this.round=1;this.roundWait=0;
  this.winner=null;this.roundWinner=null;this.message='';this.planted=false;this.bombTime=35;
  this.bombSite=-1;this.tick=0;
  this.points=arena.objectives.map(p=>({...p,owner:-1,progress:0,capturing:-1,contested:false}));
  this.siteProgress=0;this.interactor=null;
  this.activePoint=this.points.length>1?1:0;this.rotationRemaining=HARDPOINT_SECONDS;
  // A tag belongs to the fallen actor's team; collecting your own team's tag denies it.
  this.tags=[];this.nextTagId=1;
 }
 get attackingTeam(){return Math.floor((this.round-1)/3)%2;}
 get respawns(){return this.mode.id!=='sabotage';}
 enemies(a,b){return a.id!==b.id&&(!this.mode.teams||a.team!==b.team);}
 onKill(killer,victim,engine) {
  if(this.mode.id==='tdm') {
   this.scores[killer.team]++;
   if(this.scores[killer.team]>=this.mode.limit)this.finish(killer.team);
  }
  if(this.mode.id==='ffa'&&killer.kills>=this.mode.limit)this.finish(killer.id);
  if(this.mode.id==='gun'&&killer.gunStage>=GUN_ORDER.length)this.finish(killer.id);
  if(this.mode.id==='confirmed'&&victim&&this.enemies(killer,victim)) {
   if(this.tags.length>=MAX_TAGS)this.tags.shift();
   const y=engine?engine.arena.floorAt(victim,victim.y+.08):victim.y;
   this.tags.push({id:this.nextTagId++,x:victim.x,y,z:victim.z,team:victim.team,owner:victim.id,age:0});
  }
 }
 finish(winner){this.phase='finished';this.winner=winner;}
 roundEnd(team,text) {
  if(this.phase!=='playing')return;
  this.scores[team]++;this.roundWinner=team;this.message=text;
  if(this.scores[team]>=4){this.finish(team);return;}
  this.phase='roundBreak';this.roundWait=4;
 }
 nextRound() {
  this.round++;this.phase='playing';this.time=this.mode.time;this.planted=false;
  this.bombTime=35;this.bombSite=-1;this.siteProgress=0;this.interactor=null;this.message='';
 }
 updateHardpoint(dt,engine) {
  if(!this.points.length)return;
  let remaining=dt;
  while(remaining>0&&this.phase==='playing') {
   const step=Math.min(remaining,this.rotationRemaining),p=this.points[this.activePoint];
   let blue=0,orange=0;
   for(const a of engine.actors)if(!a.dead&&distance(a,p)<4.2&&Math.abs(a.y-p.y)<2.6) {
    if(a.team===0)blue++;else orange++;
   }
   p.contested=blue>0&&orange>0;
   const owner=p.contested||(!blue&&!orange)?-1:blue?0:1;
   if(owner!==p.owner||owner<0)this.tick=0;
   p.owner=owner;p.capturing=owner;p.progress=owner>=0?1:0;
   if(owner>=0) {
    this.tick+=step;
    const points=Math.floor(this.tick+1e-9);
    if(points>0) {
     this.tick=Math.max(0,this.tick-points);
     this.scores[owner]=Math.min(this.mode.limit,this.scores[owner]+points);
     if(this.scores[owner]>=this.mode.limit){this.finish(owner);return;}
    }
   }
   remaining-=step;this.rotationRemaining-=step;
   if(this.rotationRemaining<=1e-8) {
    p.owner=-1;p.capturing=-1;p.progress=0;p.contested=false;this.tick=0;
    this.activePoint=(this.activePoint+1)%this.points.length;
    this.rotationRemaining=HARDPOINT_SECONDS;
    engine.emit('capture',{text:`HARDPOINT MOVED · ${this.points[this.activePoint].name}`});
   }
  }
 }
 updateTags(dt,engine) {
  for(let i=this.tags.length-1;i>=0;i--) {
   const tag=this.tags[i];tag.age+=dt;
   if(tag.age>=TAG_LIFETIME){this.tags.splice(i,1);continue;}
   let collector=null,nearest=1.65;
   for(const a of engine.actors) {
    if(a.dead||Math.abs(a.y-tag.y)>1.9)continue;
    const d=distance(a,tag);
    if(d>=nearest)continue;
    // Reachable tags must not be collected through a wall or a floor.
    if(!engine.arena.visible(engine.eye(a),{x:tag.x,y:tag.y+.32,z:tag.z}))continue;
    collector=a;nearest=d;
   }
   if(!collector)continue;
   this.tags.splice(i,1);
   const denied=collector.team===tag.team;
   if(denied)collector.denies=(collector.denies??0)+1;
   else {
    collector.confirms=(collector.confirms??0)+1;
    this.scores[collector.team]++;
   }
   engine.emit('capture',{text:denied?'TAG DENIED':'KILL CONFIRMED',source:collector.team,actor:collector.id,denied,position:{x:tag.x,y:tag.y,z:tag.z}});
   if(this.scores[collector.team]>=this.mode.limit){this.finish(collector.team);return;}
  }
 }
 update(dt,engine) {
  if(this.phase==='finished')return;
  if(this.phase==='roundBreak') {
   this.roundWait-=dt;
   if(this.roundWait<=0){this.nextRound();engine.resetRound();}
   return;
  }
  const elapsed=Math.min(dt,this.time);
  this.time=Math.max(0,this.time-dt);
  if(this.mode.id==='hardpoint')this.updateHardpoint(elapsed,engine);
  if(this.mode.id==='confirmed')this.updateTags(elapsed,engine);
  if(this.phase==='finished')return;
  if(this.mode.id==='domination') {
   for(const p of this.points) {
    const count=[0,0];
    for(const a of engine.actors)if(!a.dead&&distance(a,p)<4.2&&Math.abs(a.y-p.y)<2.6)count[a.team]++;
    p.contested=count[0]>0&&count[1]>0;
    if(!p.contested&&(count[0]||count[1])) {
     const team=count[0]?0:1;
     if(p.owner!==team) {
      if(p.capturing!==team){p.capturing=team;p.progress=0;}
      p.progress+=dt*Math.min(2,count[team])/5;
      if(p.progress>=1){p.owner=team;p.progress=0;engine.emit('capture',{text:`${p.name} captured`,source:team});}
     }else p.progress=0;
    }else if(!p.contested)p.progress=Math.max(0,p.progress-dt*.1);
   }
   this.tick+=dt;
   if(this.tick>=1) {
    this.tick-=1;
    for(const p of this.points)if(p.owner>=0)this.scores[p.owner]++;
    if(Math.max(...this.scores)>=150)this.finish(this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1);
   }
  }
  if(this.mode.id==='sabotage') {
   if(this.planted) {
    this.bombTime-=dt;
    if(this.bombTime<=0){engine.emit('explosion',{position:this.points[this.bombSite],value:12});this.roundEnd(this.attackingTeam,'CHARGE DETONATED');return;}
   }
   const alive=[0,0];
   for(const a of engine.actors)if(!a.dead)alive[a.team]++;
   if(alive[1-this.attackingTeam]===0){this.roundEnd(this.attackingTeam,'DEFENDERS ELIMINATED');return;}
   if(!this.planted&&alive[this.attackingTeam]===0){this.roundEnd(1-this.attackingTeam,'ATTACKERS ELIMINATED');return;}
   if(this.time<=0&&!this.planted){this.roundEnd(1-this.attackingTeam,'SITE SECURED');return;}
   let chosen=null,site=-1;
   for(const a of engine.actors) {
    if(a.dead||!a.interacting||a.sprinting)continue;
    for(let i=0;i<2;i++) {
     const index=i===0?0:2,p=this.points[index];
     if(distance(a,p)>3||Math.abs(a.y-p.y)>2)continue;
     if((!this.planted&&a.team===this.attackingTeam)||(this.planted&&a.team!==this.attackingTeam&&index===this.bombSite)){chosen=a;site=index;break;}
    }
    if(chosen)break;
   }
   if(chosen) {
    if(this.interactor!==chosen.id){this.siteProgress=0;for(const a of engine.actors)a.interactProgress=0;}
    this.interactor=chosen.id;this.siteProgress+=dt/(this.planted?5:3);chosen.interactProgress=this.siteProgress;
    if(this.siteProgress>=1) {
     if(this.planted)this.roundEnd(chosen.team,'CHARGE DEFUSED');
     else{this.planted=true;this.bombSite=site;this.bombTime=35;engine.emit('capture',{text:'CHARGE ARMED · DEFEND IT'});}
     chosen.interactProgress=0;this.siteProgress=0;this.interactor=null;
    }
   }else{this.siteProgress=0;this.interactor=null;for(const a of engine.actors)a.interactProgress=0;}
  }
  if(this.time<=0&&this.mode.id!=='sabotage') {
   if(this.mode.teams)this.finish(this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1);
   else {
    const ranking=engine.actors.slice().sort((a,b)=>this.mode.id==='gun'?b.gunStage-a.gunStage:b.kills-a.kills);
    this.finish((this.mode.id==='gun'?ranking[0].gunStage===ranking[1].gunStage:ranking[0].kills===ranking[1].kills)?-1:ranking[0].id);
   }
  }
 }
}
