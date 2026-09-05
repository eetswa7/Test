import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,MISSIONS,WEAPONS,distance} from '../dist/engine.js';
const step=(s,seconds,dt=1/60)=>{for(let i=0;i<Math.ceil(seconds/dt);i++)s.tick(dt);};
const empty=()=>{const s=new Simulation();s.enemies=[];s.nextWave=10000;s.drainEvents();return s;};

test('shells strike the designated ground point, including at the sensor centre',()=>{
 const s=empty();const target=s.spawn('technical',600,450);s.selectWeapon(2);const shot=s.fire({x:600,y:450});assert.equal(shot.fired,true);assert.equal(target.dead,false);step(s,.8);assert.equal(target.dead,true);const impact=s.drainEvents().find(e=>e.type==='impact');assert.equal(impact.x,600);assert.equal(impact.y,450);assert.equal(s.hits,1);
});
test('guided missiles require a completed lock and follow moving targets',()=>{
 const s=empty(),t=s.spawn('armor',500,500);s.selectWeapon(3);assert.equal(s.fire(t).reason,'lock');for(let i=0;i<40;i++)s.aim(t,1/60);const shot=s.fire(t);assert.equal(shot.fired,true);t.x+=80;step(s,1.3);assert.equal(t.dead,true);assert.equal(s.ammo[3],5);
});
test('weapon cycling cannot bypass each weapon cooldown or ammo limits',()=>{
 const s=empty();s.selectWeapon(2);assert.equal(s.fire({x:100,y:100}).fired,true);s.selectWeapon(0);s.selectWeapon(2);assert.equal(s.fire({x:100,y:100}).reason,'cooldown');step(s,2);s.ammo[2]=0;assert.equal(s.fire({x:100,y:100}).reason,'empty');assert.equal(s.shots,1);
});
test('heat prevents infinite bursts and recovers; cooling kit helps',()=>{
 const s=empty();for(let i=0;i<600&&!s.overheated[0];i++){s.tick(1/60);s.fire({x:50,y:50});}assert.equal(s.overheated[0],true);assert.equal(s.fire({x:50,y:50}).fired,false);step(s,5);assert.equal(s.overheated[0],false);assert.equal(s.fire({x:50,y:50}).fired,true);
 const c=empty();c.kit='cooling';s.heat[0]=c.heat[0]=1;step(s,1);step(c,1);assert.ok(c.heat[0]<s.heat[0]);
});
test('splash damage can hurt friendlies and civilians and reduces score',()=>{
 const s=empty();s.score=1000;const f=s.friendlies[0],before=f.hp;s.selectWeapon(2);s.fire(f);step(s,1);assert.ok(f.hp<before);assert.ok(s.friendlyHits>0);assert.ok(s.score<1000);assert.ok(s.drainEvents().some(e=>e.type==='radio'&&e.text.includes('fire')));
});
test('kill events preserve the event discriminator and score combos',()=>{
 const s=empty();s.destroy(s.spawn('infantry',100,100));s.destroy(s.spawn('armor',150,100));const events=s.drainEvents().filter(e=>e.type==='kill');assert.equal(events.length,2);assert.equal(events[0].unitType,'infantry');assert.equal(s.combo,2);assert.equal(s.kills,2);
});
test('pause freezes simulation and forbids firing',()=>{const s=empty();s.paused=true;step(s,3);assert.equal(s.time,0);assert.equal(s.fire({x:0,y:0}).fired,false);s.paused=false;step(s,1);assert.ok(s.time>.9);});
test('failure takes precedence when the last friendly falls at the deadline',()=>{const s=empty();s.time=s.mission.duration;s.friendlies.forEach(f=>{f.hp=0;f.dead=true;});s.checkResult();assert.equal(s.state,'lost');});
test('defence and extraction complete while surviving; results emit once',()=>{for(const i of[0,3]){const s=new Simulation(i);s.enemies=[];s.nextWave=10000;step(s,MISSIONS[i].duration+1);assert.equal(s.state,'won');assert.equal(s.result.stars,3);const score=s.score;s.checkResult();s.finish(true,'again');assert.equal(s.score,score);assert.equal(s.drainEvents().filter(e=>e.type==='result').length,1);}});
test('convoy follows the road and can reach the exit within mission time',()=>{const s=new Simulation(1);s.enemies=[];s.nextWave=10000;step(s,154);assert.equal(s.state,'won');assert.ok(s.friendlies.some(f=>f.escaped));assert.ok(s.result.time<155);});
test('precision mission requires all three relays',()=>{const s=new Simulation(2),relays=s.enemies.filter(e=>e.priority);s.destroy(relays[0]);s.destroy(relays[1]);s.checkResult();assert.equal(s.state,'active');s.destroy(relays[2]);s.checkResult();assert.equal(s.state,'won');});
test('enemy attacks give the player a real loss condition',()=>{const s=new Simulation(0);step(s,92);assert.equal(s.state,'lost');assert.ok(s.result.health===0);});
test('survival resupplies and keeps entity/effect queues bounded',()=>{const s=new Simulation(4);s.ammo[1]=0;s.ammo[2]=0;s.ammo[3]=0;s.spawnWave();s.spawnWave();assert.equal(s.wave,3);assert.ok(s.ammo[1]>0&&s.ammo[3]>0);for(let i=0;i<200;i++)s.spawnWave();assert.ok(s.activeEnemies.length<=48);for(let i=0;i<1000;i++)s.emit('dummy');assert.ok(s.events.length<=500);});
test('mission generation is reproducible and loadouts apply afresh',()=>{const a=new Simulation(0),b=new Simulation(0);assert.deepEqual(a.enemies,b.enemies);const c=new Simulation(1,{kit:'ordnance'});assert.equal(c.ammo[2],WEAPONS[2].ammo+10);const d=new Simulation(0,{kit:'support'});assert.ok(d.friendlies[0].maxHp>a.friendlies[0].maxHp);});

// A deterministic virtual gunner exercises complete missions through normal fire,
// travel, heat and damage, rather than changing health or deleting hostiles.
test('all four campaign operations are winnable through the weapon system',()=>{
 for(let index=0;index<4;index++){
  const s=new Simulation(index,{kit:'balanced'});let aim={...s.focus};
  for(let i=0;i<12000&&s.state==='active';i++){
   const friends=s.activeFriendlies;const target=s.activeEnemies.sort((a,b)=>{
    const da=Math.min(...friends.map(f=>distance(a,f))),db=Math.min(...friends.map(f=>distance(b,f)));
    if(index===2)return (a.priority?-10000:da)-(b.priority?-10000:db);return da-db;
   })[0];
   if(target){aim={x:target.x,y:target.y};const nearFriend=friends.some(f=>distance(f,target)<100);
    const preferred=target.type==='infantry'?0:target.type==='technical'?1:2;
    let wi=preferred;if(nearFriend&&preferred>0)wi=0;if(s.ammo[wi]<=0||s.overheated[wi])wi=wi===0?1:0;
    if(s.weapon!==wi)s.selectWeapon(wi);s.aim(aim,1/60);s.fire(aim);
   }
   s.tick(1/60);s.drainEvents();
  }
  assert.equal(s.state,'won',`${MISSIONS[index].name}: ${JSON.stringify(s.result)}`);
 }
});
