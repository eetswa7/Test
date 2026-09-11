import {distance,direction,angleDelta,clamp} from './math.js?v=17';
export const ROLES=[{name:'Rifleman',weapon:0,range:19},{name:'Rusher',weapon:3,range:9},{name:'Shotgunner',weapon:5,range:7},{name:'Marksman',weapon:8,range:37},{name:'Heavy',weapon:9,range:28},{name:'Elite',weapon:1,range:22}];
export const DIFFICULTY={recruit:{reaction:.85,accuracy:.115,speed:.9},regular:{reaction:.48,accuracy:.065,speed:1},veteran:{reaction:.25,accuracy:.033,speed:1.06}};
function nearestTag(bot,rules){
 let best=null,cost=Infinity;
 for(const tag of rules.tags){
  const d=distance(bot,tag)+Math.abs(bot.y-tag.y)*3;
  const score=d*(tag.team===bot.team?1.12:1);
  if(score<cost&&d<65){best=tag;cost=score;}
 }
 return best;
}
function hardpointGoal(bot,rules){
 const p=rules.points[rules.activePoint];
 // Spread defenders inside the ring; the centre may contain a fountain or cover.
 const angle=bot.id*2.399963;
 return {x:p.x+Math.cos(angle)*2.9,y:p.y,z:p.z+Math.sin(angle)*2.9};
}
export function updateBot(bot,dt,e){
 let thought=false;bot.aiClock-=dt;bot.pathClock-=dt;bot.memory=Math.max(0,bot.memory-dt);bot.reaction=Math.max(0,bot.reaction-dt);bot.burstPause=Math.max(0,bot.burstPause-dt);bot.interacting=false;
 if(bot.aiClock<=0){thought=true;
  const interval=distance(bot,e.player)>45?.24:.12;bot.aiClock=interval+(bot.id%3)*.011;
  let target=null,best=75;
  for(const a of e.actors){if(a.dead||!e.rules.enemies(bot,a))continue;const d=distance(bot,a);if(d>best)continue;const bearing=Math.atan2(a.x-bot.x,-(a.z-bot.z));if(d>7&&Math.abs(angleDelta(bot.yaw,bearing))>1.25&&e.time-a.lastShot>1.4)continue;
   if(e.canSee(bot,a)){target=a;best=d;}
  }
  if(target){if(bot.target!==target.id){bot.reaction=e.difficulty.reaction+(bot.role===5?-.07:.08)*e.random();bot.burst=0;}
   bot.target=target.id;bot.lastKnown={x:target.x,y:target.y,z:target.z};bot.memory=6;bot.state='engage';
  }else{bot.target=null;if(bot.memory>0&&bot.lastKnown){bot.state='investigate';bot.goal=bot.lastKnown;}else bot.state='patrol';}
  const pickup=e.rules.mode.id==='confirmed'?nearestTag(bot,e.rules):null;
  let danger=null;for(const g of e.grenades)if(g.kind==='frag'&&g.fuse<1.8&&distance(bot,g)<7){danger=g;break;}
  if(danger){const n=Math.max(.1,distance(bot,danger));bot.goal={x:bot.x+(bot.x-danger.x)/n*9,y:bot.y,z:bot.z+(bot.z-danger.z)/n*9};bot.state='evade';}
  else if(bot.weapon.reloadLeft>0||bot.health<28&&target){
   bot.state=bot.weapon.reloadLeft>0?'reload':'retreat';let cover=null,cost=Infinity;
   for(const p of e.arena.cover){const d=distance(bot,p);if(d<cost&&d<13&&!e.arena.collides(p,.35,1.7)&&(!target||!e.arena.visible({...p,y:p.y+1.3},e.eye(target)))){cover=p;cost=d;}}
   bot.goal=cover??{x:bot.x-Math.sin(bot.yaw)*7,y:bot.y,z:bot.z+Math.cos(bot.yaw)*7};
  }else if(e.rules.mode.id==='hardpoint'){
   bot.goal=hardpointGoal(bot,e.rules);bot.state='objective';
  }else if(pickup&&(!target||distance(bot,pickup)<Math.max(5,Math.min(12,distance(bot,target)*.7)))){
   bot.goal=pickup;bot.state='collect';
  }else if(target){
   const preferred=bot.weapon.def.id===12?1.3:Math.min(ROLES[bot.role].range,bot.weapon.range*.9),d=distance(bot,target),side=bot.id%2?1:-1;
   if(d<preferred*.45){bot.goal={x:bot.x-(target.x-bot.x)*.45,y:bot.y,z:bot.z-(target.z-bot.z)*.45};bot.state='retreat';}
   else if(d>preferred*1.25){const flank=bot.weapon.def.id===12?0:Math.min(5,preferred*.25);bot.goal={x:target.x+Math.cos(bot.yaw)*side*flank,y:target.y,z:target.z+Math.sin(bot.yaw)*side*flank};bot.state='flank';}
   else{bot.goal={x:bot.x+Math.cos(bot.yaw)*side*1.8,y:bot.y,z:bot.z+Math.sin(bot.yaw)*side*1.8};bot.state='engage';}
  }else if(bot.state==='patrol'||bot.state==='investigate'&&distance(bot,bot.lastKnown)<2){
   if(e.rules.mode.id==='domination'){const pts=e.rules.points.filter(p=>p.owner!==bot.team);const point=(pts.length?pts:e.rules.points)[bot.id%(pts.length||3)],angle=bot.id*2.399963;bot.goal={x:point.x+Math.cos(angle)*1.7,y:point.y,z:point.z+Math.sin(angle)*1.7};bot.state='objective';}
   else if(e.rules.mode.id==='sabotage'){const index=e.rules.planted?e.rules.bombSite:(bot.id%2?0:2);bot.goal=e.rules.points[index];bot.state='objective';}
   else if(!bot.goal||distance(bot,bot.goal)<3||e.random()<.055){const other=e.actors[(bot.id+1+Math.floor(e.random()*(e.actors.length-1)))%e.actors.length];bot.goal={x:other.x+(e.random()-.5)*10,y:0,z:other.z+(e.random()-.5)*10};}
  }
  if(bot.goal&&bot.pathClock<=0&&e.pathBudget>0){e.pathBudget--;bot.path=e.nav.path(bot,bot.goal);bot.pathIndex=0;bot.pathClock=.85+e.random()*.55;}
 }
 const target=bot.target===null?null:e.actors.find(a=>a.id===bot.target&&!a.dead);
 let moving=false;
 if(bot.pathIndex<bot.path.length){
  // Look ahead only along swept-clear ground, never through a diagonal wall.
  if(thought)for(let skip=Math.min(bot.path.length-1,bot.pathIndex+3);skip>bot.pathIndex;skip--){
   const q=bot.path[skip];if(Math.abs(q.y-bot.y)<.12&&e.nav.walkable(bot,q)){bot.pathIndex=skip;break;}
  }
  const p=bot.path[bot.pathIndex],dx=p.x-bot.x,dz=p.z-bot.z,n=Math.hypot(dx,dz);
  if(n<.35&&Math.abs(p.y-bot.y)<.4)bot.pathIndex++;
  else{
   const speed=(bot.state==='evade'?5.8:bot.state==='engage'?1.8:bot.role===1?4.5:3.4)*e.difficulty.speed;
   let sx=dx/Math.max(.01,n),sz=dz/Math.max(.01,n);
   // Soft avoidance keeps allies from occupying the same doorway or firing line.
   for(const other of e.actors){if(other===bot||other.dead||Math.abs(other.y-bot.y)>1.6)continue;
    let ox=bot.x-other.x,oz=bot.z-other.z,d=Math.hypot(ox,oz);if(d>=1.25)continue;
    if(d<.02){ox=bot.id<other.id?-.1:.1;oz=.06;d=Math.hypot(ox,oz);}
    const force=(1-d/1.25)*1.3;sx+=ox/d*force;sz+=oz/d*force;
   }
   const scale=Math.max(1,Math.hypot(sx,sz)),x=bot.x,z=bot.z;
   e.moveActor(bot,sx/scale*speed,sz/scale*speed,dt);moving=true;
   bot.stuckTime=Math.hypot(bot.x-x,bot.z-z)<speed*dt*.15?bot.stuckTime+dt:Math.max(0,bot.stuckTime-dt*2);
   if(bot.stuckTime>.65){bot.pathClock=0;bot.aiClock=0;bot.path=[];bot.pathIndex=0;bot.stuckTime=0;}
   if(!target)bot.yaw+=angleDelta(bot.yaw,Math.atan2(dx,-dz))*clamp(dt*8,0,1);
  }
 }
 if(!moving)e.moveActor(bot,0,0,dt);
 bot.crouched=(bot.state==='reload'||bot.state==='retreat')&&!moving;
 if(e.rules.mode.id==='sabotage'&&bot.state==='objective'&&distance(bot,bot.goal)<2.9)bot.interacting=true;
 if(target&&bot.flashed<=.3){
  const eye=e.eye(bot),t=e.eye(target),d=Math.max(.1,distance(bot,target));bot.yaw+=angleDelta(bot.yaw,Math.atan2(t.x-eye.x,-(t.z-eye.z)))*clamp(dt*12,0,1);bot.pitch+=(Math.atan2(t.y-eye.y-.28,d)-bot.pitch)*clamp(dt*10,0,1);bot.ads=Math.min(1,bot.ads+dt*5);
  if(bot.reaction<=0&&bot.burstPause<=0&&bot.state!=='evade'&&bot.weapon.cooldown<=0&&bot.weapon.reloadLeft<=0&&e.canSee(bot,target)){
   if(bot.weapon.ammo===0)bot.weapon.reload();
   else if(e.shoot(bot,true)){bot.burst++;if(bot.burst>=(bot.role===4?9:bot.role===3?1:3)){bot.burst=0;bot.burstPause=.25+e.random()*.5;}}
  }
 }else bot.ads=Math.max(0,bot.ads-dt*4);
 if(bot.weapon.ammo<bot.weapon.capacity*.28&&bot.target===null)bot.weapon.reload();
 // Teammates share a last known position, never an omniscient live target.
 if(target&&e.rules.mode.teams&&bot.aiClock<.14&&e.random()<dt*.8)for(const a of e.actors)if(a.id!==bot.id&&a.team===bot.team&&!a.dead&&distance(a,bot)<14&&a.target===null){a.lastKnown={...bot.lastKnown};a.memory=4;}
}
