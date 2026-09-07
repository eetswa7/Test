import {distance} from './math.js?v=7';
export const MODES=[
 {id:'tdm',name:'TEAM DEATHMATCH',short:'TDM',description:'4 vs 4. First team to 40 eliminations.',limit:40,time:360,teams:true},
 {id:'ffa',name:'FREE FOR ALL',short:'FFA',description:'Every operator for themselves. First to 20.',limit:20,time:360,teams:false},
 {id:'sabotage',name:'SABOTAGE',short:'SAB',description:'Plant or defuse. One life per round. First to 4 rounds.',limit:4,time:110,teams:true},
 {id:'domination',name:'DOMINATION',short:'DOM',description:'Capture A, B and C. Hold them to reach 150 points.',limit:150,time:480,teams:true},
 {id:'gun',name:'GUN GAME',short:'GUN',description:'13 weapons. One elimination per tier. Finish with the blade.',limit:13,time:480,teams:false}
];
export class MatchRules {
 constructor(mode,arena){this.mode=MODES.find(m=>m.id===mode)||MODES[0];this.time=this.mode.time;this.scores=[0,0];this.phase='playing';this.round=1;this.roundWait=0;this.winner=null;this.roundWinner=null;this.message='';this.planted=false;this.bombTime=35;this.bombSite=-1;this.tick=0;this.points=arena.objectives.map(p=>({...p,owner:-1,progress:0,capturing:-1,contested:false}));this.siteProgress=0;this.interactor=null;}
 get attackingTeam(){return Math.floor((this.round-1)/3)%2;}
 get respawns(){return this.mode.id!=='sabotage';}
 enemies(a,b){return a.id!==b.id&&(!this.mode.teams||a.team!==b.team);}
 onKill(killer){
  if(this.mode.id==='tdm'){this.scores[killer.team]++;if(this.scores[killer.team]>=this.mode.limit)this.finish(killer.team);}
  if(this.mode.id==='ffa'&&killer.kills>=this.mode.limit)this.finish(killer.id);
  if(this.mode.id==='gun'&&killer.gunStage>=13)this.finish(killer.id);
 }
 finish(winner){this.phase='finished';this.winner=winner;}
 roundEnd(team,text){if(this.phase!=='playing')return;this.scores[team]++;this.roundWinner=team;this.message=text;if(this.scores[team]>=4){this.finish(team);return;}this.phase='roundBreak';this.roundWait=4;}
 nextRound(){this.round++;this.phase='playing';this.time=this.mode.time;this.planted=false;this.bombTime=35;this.bombSite=-1;this.siteProgress=0;this.interactor=null;this.message='';}
 update(dt,engine){
  if(this.phase==='finished')return;
  if(this.phase==='roundBreak'){this.roundWait-=dt;if(this.roundWait<=0){this.nextRound();engine.resetRound();}return;}
  this.time=Math.max(0,this.time-dt);
  if(this.mode.id==='domination'){
   for(const p of this.points){const count=[0,0];for(const a of engine.actors)if(!a.dead&&distance(a,p)<4.2&&Math.abs(a.y-p.y)<2.6)count[a.team]++;
    p.contested=count[0]>0&&count[1]>0;
    if(!p.contested&&(count[0]||count[1])){let team=count[0]?0:1;if(p.owner!==team){if(p.capturing!==team){p.capturing=team;p.progress=0;}p.progress+=dt*Math.min(2,count[team])/5;
     if(p.progress>=1){p.owner=team;p.progress=0;engine.emit('capture',{text:`${p.name} captured`,source:team});}
    }else p.progress=0;
    }else if(!p.contested)p.progress=Math.max(0,p.progress-dt*.1);
   }
   this.tick+=dt;if(this.tick>=1){this.tick-=1;for(const p of this.points)if(p.owner>=0)this.scores[p.owner]++;if(Math.max(...this.scores)>=150)this.finish(this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1);}
  }
  if(this.mode.id==='sabotage'){
   if(this.planted){this.bombTime-=dt;if(this.bombTime<=0){engine.emit('explosion',{position:this.points[this.bombSite],value:12});this.roundEnd(this.attackingTeam,'CHARGE DETONATED');return;}}
   const alive=[0,0];for(const a of engine.actors)if(!a.dead)alive[a.team]++;
   if(alive[1-this.attackingTeam]===0){this.roundEnd(this.attackingTeam,'DEFENDERS ELIMINATED');return;}
   if(!this.planted&&alive[this.attackingTeam]===0){this.roundEnd(1-this.attackingTeam,'ATTACKERS ELIMINATED');return;}
   if(this.time<=0&&!this.planted){this.roundEnd(1-this.attackingTeam,'SITE SECURED');return;}
   let chosen=null,site=-1;
   for(const a of engine.actors){if(a.dead||!a.interacting||a.sprinting)continue;
    for(let i=0;i<2;i++){const p=this.points[i===0?0:2],index=i===0?0:2;if(distance(a,p)>3||Math.abs(a.y-p.y)>2)continue;
     if((!this.planted&&a.team===this.attackingTeam)||(this.planted&&a.team!==this.attackingTeam&&index===this.bombSite)){chosen=a;site=index;break;}}
    if(chosen)break;
   }
   if(chosen){if(this.interactor!==chosen.id){this.siteProgress=0;for(const a of engine.actors)a.interactProgress=0;}this.interactor=chosen.id;this.siteProgress+=dt/(this.planted?5:3);chosen.interactProgress=this.siteProgress;
    if(this.siteProgress>=1){if(this.planted){this.roundEnd(chosen.team,'CHARGE DEFUSED');}else{this.planted=true;this.bombSite=site;this.bombTime=35;engine.emit('capture',{text:'CHARGE ARMED · DEFEND IT'});}chosen.interactProgress=0;this.siteProgress=0;this.interactor=null;}
   }else{this.siteProgress=0;this.interactor=null;for(const a of engine.actors)a.interactProgress=0;}
  }
  if(this.time<=0&&this.mode.id!=='sabotage'){
   if(this.mode.teams)this.finish(this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1);
   else {const ranking=engine.actors.slice().sort((a,b)=>this.mode.id==='gun'?b.gunStage-a.gunStage:b.kills-a.kills);this.finish((this.mode.id==='gun'?ranking[0].gunStage===ranking[1].gunStage:ranking[0].kills===ranking[1].kills)?-1:ranking[0].id);}
  }
 }
}
